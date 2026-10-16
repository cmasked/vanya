import hashlib
import os
from contextlib import asynccontextmanager
from typing import Annotated, Literal
from uuid import NAMESPACE_URL, uuid4, uuid5
import httpx
import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool, PoolTimeout
from schemas import (ChecklistUpdate, EligibilityRequest, Profile, ProfileUpdate,
                     SaveRequest, Transcript)
import services as service
from dotenv import load_dotenv
load_dotenv()

def create_app(database_url=None):
    dsn = database_url or os.getenv("DATABASE_URL", "")
    pool = ConnectionPool(dsn, min_size=0, max_size=8, timeout=4, open=False,
                          kwargs={"row_factory": dict_row, "connect_timeout": 4})
    @asynccontextmanager
    async def lifespan(app):
        pool.open()
        yield
        pool.close()
    app = FastAPI(title="Yogya API", version="1.0.0", lifespan=lifespan)
    app.state.eligibility = service.eligibility
    origins = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "").split(",") if x.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins,
                       allow_methods=["GET", "POST", "PATCH"], allow_headers=["Authorization",
                       "Content-Type", "Idempotency-Key"])
    def db_session():
        with pool.connection() as connection:
            yield connection
    DB = Annotated[psycopg.Connection, Depends(db_session, scope="function")]

    def authenticate(db: DB, authorization: str = Header(default="")):
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token or len(token) > 256:
            raise HTTPException(401, "Valid authentication is required")
        actor = db.execute(
            "SELECT id,role FROM yogya_accounts WHERE token_hash=%s AND expires_at>now()",
            (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
        if not actor:
            raise HTTPException(401, "Authentication has expired or is invalid")
        return actor
    Actor = Annotated[dict, Depends(authenticate)]
    Key = Annotated[str | None, Header(alias="Idempotency-Key")]

    def error_response(status, detail):
        detail = detail if isinstance(detail, dict) else {"message": str(detail)}
        return JSONResponse(status_code=status, content={
            "detail": detail.get("message", "Request failed"),
            "error": {"code": str(status), **detail}})
    @app.exception_handler(HTTPException)
    async def http_error(request, error):
        return error_response(error.status_code, error.detail)
    @app.exception_handler(RequestValidationError)
    @app.exception_handler(ValidationError)
    async def invalid(request, error):
        return error_response(422, "Invalid request or unsupported field")
    @app.exception_handler(psycopg.Error)
    @app.exception_handler(PoolTimeout)
    async def database_error(request, error):
        return error_response(503, "Database is temporarily unavailable")
    @app.exception_handler(Exception)
    async def unexpected(request, error):
        # Do not return or log payloads, tokens, recordings, or internal exceptions.
        return error_response(500, "The request could not be completed")

    @app.get("/api/v1/health")
    def health(db: DB):
        db.execute("SELECT 1 FROM yogya_students LIMIT 1")
        return {"status": "ok"}

    @app.get("/api/v1/session")
    def session(db: DB, actor: Actor):
        row = db.execute("SELECT id FROM yogya_students WHERE account_id=%s",
                         (actor["id"],)).fetchone()
        return {**actor, "student_id": row["id"] if row else None}

    @app.post("/api/v1/students")
    def create_student(body: Profile, request: Request, db: DB, actor: Actor, key: Key = None):
        if actor["role"] != "student":
            raise HTTPException(403, "A student account is required")
        def action():
            row = db.execute(
                "INSERT INTO yogya_students(id,account_id,profile) VALUES (%s,%s,%s) "
                "ON CONFLICT(account_id) DO NOTHING RETURNING *",
                (str(uuid4()), actor["id"], Jsonb(body.model_dump()))).fetchone()
            if not row:
                raise HTTPException(409, "This account already has a student profile")
            return service.profile_response(row)
        return service.mutate(db, actor, request, key, body.model_dump(), action)

    @app.get("/api/v1/students/{student_id}")
    def get_student(student_id: str, db: DB, actor: Actor):
        row = service.student(db, actor, student_id)
        if row["account_id"] != actor["id"]:
            # Facilitators get guidance fields, never sensitive eligibility attributes.
            profile = {k: v for k, v in row["profile"].items() if k != "eligibility_attributes"}
            row = {**row, "profile": profile}
        return service.profile_response(row)

    @app.patch("/api/v1/students/{student_id}")
    def update_student(student_id: str, body: ProfileUpdate, request: Request,
                       db: DB, actor: Actor, key: Key = None):
        def action():
            current = service.student(db, actor, student_id, write=True)
            data = Profile.model_validate({**current["profile"], **body.changes}).model_dump()
            row = db.execute(
                "UPDATE yogya_students SET profile=%s,version=version+1,updated_at=now() "
                "WHERE id=%s AND version=%s RETURNING *",
                (Jsonb(data), student_id, body.expected_version)).fetchone()
            if not row:
                raise HTTPException(409, {"message": "Profile changed; review the server version",
                                          "current_version": current["version"]})
            return service.profile_response(row)
        return service.mutate(db, actor, request, key, body.model_dump(), action)

    @app.get("/api/v1/opportunities")
    def list_opportunities(db: DB, type: Literal["scholarship", "scheme", "training", "job"] | None = None,
                           category: str | None = None, education_level: str | None = None,
                           state: str | None = None, search: str = Query(default="", max_length=200),
                           limit: int = Query(default=100, ge=1, le=100),
                           offset: int = Query(default=0, ge=0)):
        where = ["verification_status='verified'", "synthetic=FALSE"]
        args = []
        mapping = {"scholarship": ["scholarship"], "scheme": ["educational_assistance", "other"],
                   "training": ["vocational_training", "course"], "job": ["apprenticeship"]}
        if type:
            where.append("category=ANY(%s)"); args.append(mapping[type])
        if category:
            if category not in sum(mapping.values(), []):
                raise HTTPException(422, "Unsupported category")
            where.append("category=%s"); args.append(category)
        if education_level:
            where.append("(education_levels ? %s OR education_levels ? 'all')")
            args.append(education_level)
        if state:
            where.append("(geographic_scope->>'type'='national' OR geographic_scope->'states' ? %s)")
            args.append(state)
        if search.strip():
            term = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            where.append("(name ILIKE %s OR description ILIKE %s OR provider ILIKE %s)")
            args.extend(["%" + term + "%"] * 3)
        clause = " AND ".join(where)
        total = db.execute("SELECT count(*) AS n FROM opportunities WHERE " + clause,
                           args).fetchone()["n"]
        rows = db.execute("SELECT opportunity_id FROM opportunities WHERE " + clause +
                          " ORDER BY opportunity_id LIMIT %s OFFSET %s", [*args, limit, offset]).fetchall()
        return {"items": [service.mobile_opportunity(service.opportunity(db, r["opportunity_id"]))
                          for r in rows], "total": total, "limit": limit, "offset": offset}

    @app.get("/api/v1/opportunities/{opportunity_id}")
    def get_opportunity(opportunity_id: str, db: DB):
        return service.mobile_opportunity(service.opportunity(db, opportunity_id))

    @app.post("/api/v1/eligibility/check")
    def check(body: EligibilityRequest, db: DB, actor: Actor):
        profile = service.student(db, actor, body.student_id, write=True)
        official = service.opportunity(db, body.opportunity_id)
        try:
            result = service.validate_eligibility(app.state.eligibility(service.engine_profile(profile["profile"]), official), official)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(503, "Eligibility service is unavailable or returned an invalid result")
        return {**result, "student_id": body.student_id, "opportunity_id": body.opportunity_id,
                "profile_version": profile["version"]}

    @app.post("/api/v1/students/{student_id}/saved-opportunities")
    def save(student_id: str, body: SaveRequest, request: Request, db: DB,
             actor: Actor, key: Key = None):
        def action():
            service.student(db, actor, student_id, write=True)
            official = service.opportunity(db, body.opportunity_id)
            saved_id = str(uuid5(NAMESPACE_URL, student_id + ":" + body.opportunity_id))
            existing = db.execute("SELECT * FROM yogya_saved WHERE id=%s FOR UPDATE", (saved_id,)).fetchone()
            if existing and body.expected_version is None and existing["saved"] != body.saved:
                raise HTTPException(409, "A version is required to change an existing saved opportunity")
            if body.expected_version is not None and body.expected_version != (existing["version"] if existing else 0):
                raise HTTPException(409, "Saved opportunity changed; review the server version")
            row = db.execute(
                "INSERT INTO yogya_saved(id,student_id,opportunity_id,saved) VALUES (%s,%s,%s,%s) "
                "ON CONFLICT(student_id,opportunity_id) DO UPDATE SET saved=EXCLUDED.saved, "
                "version=yogya_saved.version + CASE WHEN yogya_saved.saved<>EXCLUDED.saved "
                "OR %s THEN 1 ELSE 0 END RETURNING *",
                (saved_id, student_id, body.opportunity_id, body.saved, body.expected_version is not None)).fetchone()
            if body.saved:
                for document in official["required_documents"]:
                    document_id = str(uuid5(NAMESPACE_URL, saved_id + ":" +
                                           document["document_type"] + ":" + document["document_name"]))
                    db.execute(
                        "INSERT INTO yogya_checklist(id,saved_id,title,description,source_reference) "
                        "VALUES (%s,%s,%s,%s,%s) ON CONFLICT(id) DO NOTHING",
                        (document_id, saved_id, document["document_name"], document["description"],
                         document["evidence_reference"]))
            return row
        return service.mutate(db, actor, request, key, body.model_dump(), action)

    @app.get("/api/v1/students/{student_id}/saved-opportunities")
    def saved(student_id: str, db: DB, actor: Actor):
        service.student(db, actor, student_id)
        return db.execute("SELECT * FROM yogya_saved WHERE student_id=%s AND saved=TRUE ORDER BY id",
                          (student_id,)).fetchall()

    @app.get("/api/v1/students/{student_id}/saved-opportunities/{opportunity_id}")
    def saved_record(student_id: str, opportunity_id: str, db: DB, actor: Actor):
        service.student(db, actor, student_id)
        row = db.execute("SELECT * FROM yogya_saved WHERE student_id=%s AND opportunity_id=%s",
                         (student_id, opportunity_id)).fetchone()
        return row or {"opportunity_id": opportunity_id, "saved": False, "version": 0}

    def authorized_item(db, actor, item_id, write=False):
        row = db.execute("SELECT c.*,s.student_id FROM yogya_checklist c "
                         "JOIN yogya_saved s ON s.id=c.saved_id WHERE c.id=%s", (item_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Checklist item not found")
        service.student(db, actor, row["student_id"], write=write)
        return row

    @app.get("/api/v1/saved-opportunities/{saved_id}/checklist")
    def checklist(saved_id: str, db: DB, actor: Actor):
        saved = db.execute("SELECT student_id FROM yogya_saved WHERE id=%s", (saved_id,)).fetchone()
        if not saved:
            raise HTTPException(404, "Saved opportunity not found")
        service.student(db, actor, saved["student_id"])
        return db.execute("SELECT * FROM yogya_checklist WHERE saved_id=%s ORDER BY id",
                          (saved_id,)).fetchall()

    @app.get("/api/v1/checklist-items/{item_id}")
    def get_item(item_id: str, db: DB, actor: Actor):
        return authorized_item(db, actor, item_id)

    @app.patch("/api/v1/checklist-items/{item_id}")
    def patch_item(item_id: str, body: ChecklistUpdate, request: Request,
                   db: DB, actor: Actor, key: Key = None):
        def action():
            current = authorized_item(db, actor, item_id, write=True)
            row = db.execute(
                "UPDATE yogya_checklist SET completed=%s,version=version+1,updated_at=now() "
                "WHERE id=%s AND version=%s RETURNING *",
                (body.completed, item_id, body.expected_version)).fetchone()
            if not row:
                raise HTTPException(409, {"message": "Checklist changed; review the server version",
                                          "current_version": current["version"]})
            return row
        return service.mutate(db, actor, request, key, body.model_dump(), action)

    @app.get("/api/v1/facilitators/{facilitator_id}/students")
    def facilitated(facilitator_id: str, db: DB, actor: Actor):
        if actor["id"] != facilitator_id or actor["role"] != "facilitator":
            raise HTTPException(403, "Facilitator access is restricted")
        return db.execute(
            "SELECT s.id,s.profile->>'display_name' AS display_name,"
            "s.profile->>'education_level' AS education_level,s.version "
            "FROM yogya_students s JOIN yogya_assignments a ON a.student_id=s.id "
            "WHERE a.facilitator_id=%s ORDER BY s.id", (facilitator_id,)).fetchall()

    @app.get("/api/v1/voice/capabilities")
    def voice_capabilities(actor: Actor):
        configured = bool(os.getenv("SPEECH_ADAPTER_URL"))
        return {"configured": configured, "provider": "external-adapter" if configured else None,
                "languages": os.getenv("SPEECH_LANGUAGES", "en-IN,ta-IN").split(",") if configured else []}

    @app.post("/api/v1/voice/transcribe")
    async def transcribe(request: Request, actor: Actor, language: str = "en-IN"):
        endpoint = os.getenv("SPEECH_ADAPTER_URL")
        if not endpoint:
            raise HTTPException(503, "Speech service is not configured; please type your answer")
        if language not in os.getenv("SPEECH_LANGUAGES", "en-IN,ta-IN").split(","):
            raise HTTPException(422, "Speech language is not supported")
        mime = request.headers.get("content-type", "").split(";")[0]
        if mime not in {"audio/mp4", "audio/m4a", "audio/wav", "audio/webm"}:
            raise HTTPException(415, "Audio format is not supported")
        audio = bytearray()
        async for chunk in request.stream():
            if len(audio) + len(chunk) > 8 * 1024 * 1024:
                raise HTTPException(413, "Recording is too large")
            audio.extend(chunk)
        if not audio:
            raise HTTPException(422, "Recording is empty")
        headers = {"Content-Type": mime, "X-Speech-Language": language}
        if os.getenv("SPEECH_ADAPTER_KEY"):
            headers["Authorization"] = "Bearer " + os.environ["SPEECH_ADAPTER_KEY"]
        try:
            async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
                response = await client.post(endpoint, content=bytes(audio), headers=headers)
                response.raise_for_status()
                result = Transcript.model_validate(response.json())
                if result.language != language:
                    raise ValueError("Language mismatch")
                return result
        except (httpx.HTTPError, ValueError, TypeError):
            raise HTTPException(503, "Speech service is unavailable; please type your answer")
    return app

app = create_app()
