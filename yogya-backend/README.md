# Person 2 backend
Python 3.12+, PostgreSQL 16+. This branch adds FastAPI around Person 4's existing
opportunities/criteria/documents/evidence tables. No competing eligibility engine.

Local setup, from repository root:
    python -m venv work/venv
    . work/venv/bin/activate
    pip install -e yogya-ai-engine -r yogya-backend/requirements.txt -r yogya-data/requirements.txt
    cd yogya-backend
    cp .env.example .env
Set DATABASE_URL to a development PostgreSQL database, then:
    python manage.py migrate
    python manage.py seed
    python manage.py account student
    uvicorn main:app --host 0.0.0.0 --port 8000
The account command prints a seven-day prototype bearer token ONCE. Provision
individual accounts through this trusted admin CLI; no public self-assignment of
roles. Supply Authorization: Bearer <token>. Only token hashes are stored in DB.
Rotate an expired/compromised credential with python manage.py rotate ACCOUNT_ID;
this invalidates the old token and preserves the account and its offline queue.
A production identity provider, account recovery and rate limiting remain future work.

Docker development alternative, from repository root:
    cp yogya-backend/.env.example yogya-backend/.env
    docker compose -f yogya-backend/compose.yml up -d db
    docker compose -f yogya-backend/compose.yml run --rm api python manage.py migrate
    docker compose -f yogya-backend/compose.yml run --rm api python manage.py seed
    docker compose -f yogya-backend/compose.yml run --rm api python manage.py account student
    docker compose -f yogya-backend/compose.yml up -d api
The compose database password is for local development. Use separately provisioned
credentials, HTTPS termination and restricted database networking when deploying.

Routes are under /api/v1, preserving the mobile client's existing contract.
Public: GET /health, /opportunities, /opportunities/{id}.
Authenticated: GET /session; POST /students; GET/PATCH /students/{id};
POST /eligibility/check; POST /opportunities/recommend; POST/GET /students/{id}/saved-opportunities;
GET /students/{id}/saved-opportunities/{opportunity_id};
GET /saved-opportunities/{saved_id}/checklist; GET/PATCH /checklist-items/{id};
GET /facilitators/{id}/students; GET /voice/capabilities; POST /voice/transcribe.
Interactive API documentation: /docs; JSON contract: /openapi.json.

Mutations require a client-generated UUID Idempotency-Key. Reusing it with different
data returns 409. Receipts and mutations commit together. A principal's mutations
are serialized with a PostgreSQL row lock. Profile PATCH accepts
{expected_version,changes}; checklist PATCH accepts {expected_version,completed}.
Conflict returns 409 without overwriting current data. Saved-opportunity POST
accepts {opportunity_id,saved,expected_version?}; version zero means no server row.
A POST without expected_version may create a record or repeat its current state.
Changing an existing saved/unsaved state requires expected_version; otherwise it returns 409. Checklist completion never submits an application.
Receipts currently have no expiry; introduce coordinated retention before large-scale use.

Person 3 engine: install it from the repository root with
`python -m pip install -e yogya-ai-engine`. The existing POST
`/api/v1/eligibility/check` and new POST `/api/v1/opportunities/recommend`
use the local deterministic `yogya_ai_engine` package. The eligibility request
uses schemas.Profile plus canonical aliases such as `current_education_level`
and validated eligibility attributes. Current education never implies a
completed qualification. Opportunity records preserve canonical fields,
structured criteria, documents, and evidence. Results use original
`criterion_id` values, include every mandatory criterion, and resolve evidence
IDs to curated URLs. Calendar status remains separate from eligibility.
Unsupported grouped-rule formats need a versioned contract with Person 4.
Engine data errors return 503 rather than an eligibility success placeholder.

Speech adapter: SPEECH_ADAPTER_URL accepts raw audio/mp4, audio/m4a, audio/wav or
audio/webm, with X-Speech-Language (en-IN or ta-IN by default) and optional
server-only bearer key. It must convert the format for its provider and return
{text,language}. Uploads are bounded to 8 MiB. This is an explicit adapter boundary,
not a claimed BHASHINI connection. BHASHINI pipeline access/configuration and
provider verification remain external requirements:
https://bhashini.gitbook.io/bhashini-apis

Facilitators: provision with python manage.py account facilitator, then use
python manage.py assign FACILITATOR_ID STUDENT_ID only after authorized enrollment.
Assigned facilitators get guidance fields and checklist reads; sensitive eligibility
attributes are omitted. Profile/checklist mutation remains student-only.

Tests, from yogya-backend:
    TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST/isolated_test_db python -m pytest tests -q
Tests use temporary schemas, migrate twice, import the actual curated dataset,
and exercise ownership, facilitator scope, filters, idempotency, version conflicts,
checklists, and engine invocation/failures. The test database user needs CREATE
SCHEMA. Never point TEST_DATABASE_URL at a production database.

Verification: Python compilation and five PostgreSQL-backed tests passed in
GitHub-hosted CI on source commit e5acc32f732cb878a9d3ec4b4d070eb0e97fb175.
The tests cover profile ownership, facilitator scope, catalog filters, checklists,
idempotency, conflicts, engine invocation/failure and mocked speech transport.
CI evidence: https://github.com/cmasked/vanya/actions/runs/38937767592
The local cloud workspace is unavailable. Docker builds, real provider access,
production deployment and Android device behavior have not been validated.

See [the implementation audit](../docs/IMPLEMENTATION_AUDIT.md) for current gaps and validation scope.
