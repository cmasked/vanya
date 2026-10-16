import hashlib
import json
import os
from uuid import UUID
import httpx
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from schemas import EligibilityResult, Profile

def student(db, actor, student_id, write=False):
    row = db.execute("SELECT * FROM yogya_students WHERE id=%s", (student_id,)).fetchone()
    allowed = row and row["account_id"] == actor["id"]
    if row and not allowed and not write and actor["role"] == "facilitator":
        allowed = db.execute(
            "SELECT 1 FROM yogya_assignments WHERE facilitator_id=%s AND student_id=%s",
            (actor["id"], student_id)).fetchone()
    if not allowed:
        raise HTTPException(404, "Student not found")
    return row

def profile_response(row):
    return {**row["profile"], "id": row["id"], "version": row["version"],
            "updated_at": row["updated_at"].isoformat()}

def mutate(db, actor, request, key, body, action):
    try:
        operation_id = str(UUID(key or ""))
    except ValueError:
        raise HTTPException(422, "A UUID Idempotency-Key header is required")
    # Serialize a principal's writes; receipt and mutation share one transaction.
    db.execute("SELECT id FROM yogya_accounts WHERE id=%s FOR UPDATE", (actor["id"],))
    digest = hashlib.sha256((request.method + request.url.path +
                           json.dumps(body, sort_keys=True, separators=(",", ":"))).encode()).hexdigest()
    old = db.execute(
        "SELECT * FROM yogya_operations WHERE account_id=%s AND operation_id=%s",
        (actor["id"], operation_id)).fetchone()
    if old:
        if old["request_hash"] != digest:
            raise HTTPException(409, "Idempotency key was reused with different data")
        return old["response"]
    result = jsonable_encoder(action())
    db.execute(
        "INSERT INTO yogya_operations(account_id,operation_id,request_hash,response) VALUES (%s,%s,%s,%s)",
        (actor["id"], operation_id, digest, Jsonb(result)))
    return result

def opportunity(db, opportunity_id):
    row = db.execute(
        "SELECT * FROM opportunities WHERE opportunity_id=%s "
        "AND verification_status='verified' AND synthetic=FALSE", (opportunity_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Opportunity not found")
    for key, table in (("eligibility_criteria", "eligibility_criteria"),
                       ("required_documents", "required_documents"), ("evidence", "evidence_records")):
        # Table names are constants, never client input.
        row[key] = db.execute("SELECT * FROM " + table + " WHERE opportunity_id=%s",
                              (opportunity_id,)).fetchall()
    return row

def mobile_opportunity(row):
    category = row["category"]
    kind = {"scholarship": "scholarship", "educational_assistance": "scheme",
            "vocational_training": "training", "course": "training",
            "apprenticeship": "job"}.get(category, "scheme")
    criteria = row.get("eligibility_criteria", [])
    docs = row.get("required_documents", [])
    return jsonable_encoder({
        "id": row["opportunity_id"], "title": row["name"], "type": kind,
        "provider": row["provider"], "description": row["description"],
        "amount": row["benefit_description"], "deadline": row["application_deadline"],
        "applicationStatus": row["application_status"],
        "applicationUrl": row["application_url"],
        "eligibilitySummary": "Review all official eligibility conditions.",
        "eligibilityCriteria": [c["notes"] or
            f'{c["field"]} {c["operator"]} {json.dumps(c["value"])}' for c in criteria],
        "documentsRequired": [d["document_name"] for d in docs],
        "benefits": [x for x in [row["benefit_description"], *(row["non_financial_benefits"] or [])] if x],
        "isVerified": True, "lastUpdated": row["updated_at"],
        "lastVerifiedAt": row["last_checked_at"], "sourceUrls": row["official_source_urls"],
        "educationLevels": row["education_levels"], "geographicScope": row["geographic_scope"],
        "category": category,
    })

def validate_eligibility(value, official):
    result = EligibilityResult.model_validate(value)
    known = {c["criterion_id"]: c for c in official["eligibility_criteria"]}
    evidence = {e["evidence_id"]: e["source_url"] for e in official.get("evidence", [])}
    for criterion in result.criteria:
        source = known.get(criterion.criterion_id)
        if source is None:
            raise ValueError("Unknown criterion in engine result")
        reference = source.get("evidence_reference")
        url = evidence.get(reference)
        if criterion.source_reference and criterion.source_reference not in {reference, url}:
            raise ValueError("Engine source does not match curated evidence")
        criterion.source_reference = url or reference
    if not known and result.status in {"ELIGIBLE", "ELIGIBLE_NEEDS_DOCUMENTS"}:
        raise ValueError("No criteria available to substantiate eligibility")
    mandatory = {c["criterion_id"] for c in official["eligibility_criteria"]
                 if c["required"] and c["condition_type"] == "mandatory"}
    ids = [c.criterion_id for c in result.criteria]
    if len(ids) != len(set(ids)) or not mandatory.issubset(ids):
        raise ValueError("Incomplete engine result")
    states = {c.status for c in result.criteria if c.criterion_id in mandatory}
    if result.status in {"ELIGIBLE", "ELIGIBLE_NEEDS_DOCUMENTS"}:
        if {"UNKNOWN", "NOT_SATISFIED"} & states:
            raise ValueError("Unresolved mandatory conditions")
    if result.status == "ELIGIBLE" and "REQUIRES_VERIFICATION" in states:
        raise ValueError("Documents still require verification")
    return result.model_dump()

def engine_profile(profile):
    """Add canonical data-field names without inferring unprovided qualifications."""
    value = Profile.model_validate(profile).model_dump()
    return {**value, **value["eligibility_attributes"],
            "current_education_level": value["education_level"]}

def eligibility(profile, official):
    endpoint = os.getenv("ELIGIBILITY_SERVICE_URL")
    if not endpoint:
        raise HTTPException(503, "Person 3 eligibility service is not configured")
    headers = {"Authorization": "Bearer " + os.environ["ELIGIBILITY_SERVICE_TOKEN"]} \
        if os.getenv("ELIGIBILITY_SERVICE_TOKEN") else {}
    try:
        with httpx.Client(timeout=15, follow_redirects=False) as client:
            response = client.post(endpoint, headers=headers,
                                   json=jsonable_encoder({"student": profile, "opportunity": official}))
            response.raise_for_status()
            return validate_eligibility(response.json(), official)
    except (httpx.HTTPError, ValueError, TypeError):
        raise HTTPException(503, "Eligibility service is unavailable or returned an invalid result")
