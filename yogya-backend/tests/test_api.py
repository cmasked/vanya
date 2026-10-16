import os
from uuid import uuid4
import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
import pytest
from fastapi.testclient import TestClient
from main import create_app
from manage import account, assign, migrate, seed

@pytest.fixture
def setup():
    base = os.getenv("TEST_DATABASE_URL")
    if not base:
        pytest.skip("Set TEST_DATABASE_URL to an isolated PostgreSQL test database")
    schema = "test_" + uuid4().hex
    with psycopg.connect(base, autocommit=True) as db:
        db.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    dsn = make_conninfo(base, options="-csearch_path=" + schema)
    migrate(dsn)
    migrate(dsn)  # Existing migrations are repeatable and checksum-checked.
    seed(dsn)
    owner, token = account(dsn, "student")
    other, other_token = account(dsn, "student")
    facilitator, facilitator_token = account(dsn, "facilitator")
    app = create_app(dsn)
    try:
        with TestClient(app) as client:
            yield client, app, dsn, token, other_token, facilitator, facilitator_token
    finally:
        with psycopg.connect(base, autocommit=True) as db:
            db.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))

def headers(token, key=None):
    return {"Authorization": "Bearer " + token, "Idempotency-Key": key or str(uuid4())}

def student(client, token):
    response = client.post("/api/v1/students", headers=headers(token), json={
        "display_name": "Demo Student", "education_level": "class_11",
        "state": "Tamil Nadu", "preferred_language": "Tamil"})
    assert response.status_code == 200, response.text
    return response.json()["id"]

def test_health_profile_access_and_version_conflict(setup):
    c, app, dsn, token, stranger, facilitator, ft = setup
    assert c.get("/api/v1/health").status_code == 200
    sid = student(c, token)
    path = "/api/v1/students/" + sid
    assert c.get(path).status_code == 401
    assert c.get(path, headers=headers(stranger)).status_code == 404
    assert c.get(path, headers=headers(token)).json()["display_name"] == "Demo Student"
    result = c.patch(path, headers=headers(token), json={
        "expected_version": 1, "changes": {"display_name": "Updated Student"}})
    assert result.status_code == 200 and result.json()["version"] == 2
    assert c.patch(path, headers=headers(token), json={
        "expected_version": 1, "changes": {"state": "Kerala"}}).status_code == 409
    assert c.patch(path, headers=headers(stranger), json={
        "expected_version": 2, "changes": {"state": "Kerala"}}).status_code == 404
    assert c.patch(path, headers=headers(token), json={
        "expected_version": 2, "changes": {"account_id": "injected"}}).status_code == 422

def test_catalog_and_real_seed_filters(setup):
    c, *_ = setup
    all_items = c.get("/api/v1/opportunities").json()
    assert all_items["total"] == 14
    items = c.get("/api/v1/opportunities?type=scholarship").json()["items"]
    assert items and all(o["type"] == "scholarship" and o["isVerified"] for o in items)
    assert c.get("/api/v1/opportunities?type=invalid").status_code == 422
    item = items[0]
    assert c.get("/api/v1/opportunities/" + item["id"]).json()["sourceUrls"]
    assert c.get("/api/v1/opportunities/missing").status_code == 404
    assert c.get("/api/v1/opportunities?search=unfindable-scheme-xyz").json()["total"] == 0

def test_checklists_idempotency_and_authorization(setup):
    c, app, dsn, token, stranger, facilitator, ft = setup
    sid = student(c, token)
    oid = c.get("/api/v1/opportunities?type=scholarship").json()["items"][0]["id"]
    path = f"/api/v1/students/{sid}/saved-opportunities"
    key = str(uuid4())
    saved = c.post(path, headers=headers(token, key), json={"opportunity_id": oid})
    assert saved.status_code == 200
    assert c.post(path, headers=headers(token, key),
                  json={"opportunity_id": oid}).json() == saved.json()
    assert c.post(path, headers=headers(token, key),
                  json={"opportunity_id": oid, "saved": False}).status_code == 409
    checklist_path = "/api/v1/saved-opportunities/" + saved.json()["id"] + "/checklist"
    item = c.get(checklist_path, headers=headers(token)).json()[0]
    path = "/api/v1/checklist-items/" + item["id"]
    key = str(uuid4())
    body = {"completed": True, "expected_version": 1}
    first = c.patch(path, headers=headers(token, key), json=body)
    assert first.status_code == 200 and first.json()["version"] == 2
    assert c.patch(path, headers=headers(token, key), json=body).json() == first.json()
    assert c.patch(path, headers=headers(stranger), json=body).status_code == 404
    assert c.patch(path, headers=headers(token), json=body).status_code == 409
    assert c.get(checklist_path, headers=headers(stranger)).status_code == 404
    assert len(c.get(f"/api/v1/students/{sid}/saved-opportunities",
                     headers=headers(token)).json()) == 1

def test_facilitator_scope_and_eligibility_dependency(setup, monkeypatch):
    c, app, dsn, token, stranger, facilitator, ft = setup
    sid = student(c, token)
    path = f"/api/v1/facilitators/{facilitator}/students"
    assert c.get(path, headers=headers(ft)).json() == []
    assert c.get(path, headers=headers(token)).status_code == 403
    assign(dsn, facilitator, sid)
    assert c.get(path, headers=headers(ft)).json()[0]["id"] == sid
    assert "eligibility_attributes" not in c.get("/api/v1/students/" + sid,
                                                headers=headers(ft)).json()
    oid = c.get("/api/v1/opportunities").json()["items"][0]["id"]
    called = []
    def adapter(profile, opportunity):
        called.append(opportunity["opportunity_id"])
        return {"status": "POTENTIAL_MATCH_NEEDS_INFO",
                "criteria": [{"criterion_id": x["criterion_id"], "status": "UNKNOWN",
                              "explanation": "Additional profile information is required."}
                             for x in opportunity["eligibility_criteria"]],
                "missing_information": ["required scheme attributes"], "next_steps": []}
    app.state.eligibility = adapter
    body = {"student_id": sid, "opportunity_id": oid}
    assert c.post("/api/v1/eligibility/check", headers=headers(token), json=body).status_code == 200
    assert called == [oid]
    assert c.post("/api/v1/eligibility/check", headers=headers(stranger), json=body).status_code == 404
    app.state.eligibility = lambda *_: {"status": "ELIGIBLE"}
    assert c.post("/api/v1/eligibility/check", headers=headers(token), json=body).status_code == 503
    monkeypatch.delenv("SPEECH_ADAPTER_URL", raising=False)
    assert c.get("/api/v1/voice/capabilities", headers=headers(token)).json()["configured"] is False
    assert c.post("/api/v1/voice/transcribe", headers={**headers(token), "Content-Type": "audio/mp4"},
                  content=b"demo").status_code == 503
