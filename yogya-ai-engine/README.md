# yogya-ai-engine

Person 3's Python component for learner profile normalization, opportunity matching, rule-based eligibility, grounded explanations, and preparation checklists. The engine operates on profile and opportunity records supplied by yogya-backend; it does not own HTTP, PostgreSQL, authentication, speech, or offline synchronization.

## Architecture

The installable package is yogya_ai_engine under src:

- profiles.py validates and normalizes profile aliases, education labels, and lists; it also exposes a conservative deterministic free-text extractor.
- eligibility.py evaluates curated criteria using four states: SATISFIED, NOT_SATISFIED, UNKNOWN, and REQUIRES_VERIFICATION.
- matching.py ranks verified, non-synthetic opportunities using education, geography, stated interests, skills, goal/type preferences, and eligibility.
- explanations.py creates readable summaries from evaluated criteria.
- checklists.py creates document and action items from curated requirements, evidence references, profile documents, and eligibility next steps.

The core is deterministic and has no required LLM, network, database, or runtime third-party dependency. Free-text extraction only captures explicit class, interest, and goal phrases. It never infers sensitive attributes. A future LLM extractor can be added behind this boundary without changing rule evaluation.

## Public interfaces

    from yogya_ai_engine import (
        build_application_checklist,
        evaluate_eligibility,
        explain_eligibility,
        extract_profile_from_text,
        normalize_profile,
        recommend_opportunities,
    )

    profile = normalize_profile({
        "education_level": "Class 10",
        "state": "Rajasthan",
        "eligibility_attributes": {"annual_family_income": 150000},
    })
    result = evaluate_eligibility(profile, opportunity_record)
    ranked = recommend_opportunities(profile, opportunity_records, limit=20)
    explanation = explain_eligibility(result)
    checklist = build_application_checklist(opportunity_record, profile, result)

normalize_profile returns a copy and preserves the original education label and supplied eligibility attributes. Unknown education labels, malformed lists, conflicting aliases, booleans in numeric fields, and out-of-range percentages raise ProfileError (a ValueError). Missing attributes stay missing.

Eligibility input uses the existing backend Profile shape plus validated canonical aliases and an opportunity record from the data pipeline/database. Criterion records retain criterion_id, field, operator, value, condition_type, required, review_status, notes, and evidence reference. The result matches yogya-backend/schemas.py EligibilityResult: status, criteria, missing_information, and next_steps. Source references initially carry the curated evidence ID; the backend resolves these to verified source URLs before returning them to a client. Closed application windows never alter eligibility.

recommend_opportunities(profile, opportunities, limit=20) returns a list of {opportunity, score, reasons, eligibility} records. It considers only records whose verification_status is verified and whose synthetic flag is false. Scores and reason text are generated from supplied fields; this is a prototype relevance ranking, not a probability of success.

build_application_checklist returns document/action items with preparation state and curated evidence references. It does not submit an application.

## Integration contracts

### Backend

Install the project from the repository root, then install backend requirements:

    python -m pip install -e yogya-ai-engine
    python -m pip install -r yogya-backend/requirements.txt

Person 2's existing POST /api/v1/eligibility/check calls evaluate_eligibility, checks the result against the original criteria and evidence, then returns explanation and checklist fields. The authenticated POST /api/v1/opportunities/recommend accepts {"student_id": "...", "limit": 20} and returns {items, profile_version}. Each item follows the current mobile opportunity shape and adds match_score, match_reasons, and eligibility. Both endpoints use the existing FastAPI app, student ownership checks, and opportunity repository.

### Opportunity data

Person 4's yogya-data pipeline is the source of opportunity records. The engine expects the schema documented in yogya-data/schemas/opportunity.schema.json; the backend passes database rows with structured eligibility criteria, documents, verification state, geographic scope, and evidence. The engine does not create or repair scheme facts. Conditions whose review status is not confirmed, unknown operators, manual-review rules, or grouped rules that the current contract cannot represent stay flagged for human verification.

### App

The backend returns results to the existing app through its /api/v1 API. The current client normalizes opportunity objects in yogya-mobile/src/services/opportunities.ts; Person 1 can render recommendation score/reasons and eligibility/checklist output in native screens without coupling the app to Python. The repository currently contains an Expo client, so native Android implementation work remains owned by Person 1.

## Setup and tests

Python 3.10 or newer is required; the backend project currently targets Python 3.12+. Install pytest for development and run the component tests:

    python -m pip install -e yogya-ai-engine
    python -m pip install 'pytest>=8,<10'
    python -m pytest yogya-ai-engine/tests -q

The full backend suite additionally needs backend requirements and an isolated PostgreSQL test database as described in yogya-backend/README.md.

## Configuration, dependencies, and limitations

There are no engine environment variables and no external service requirement. An LLM API key is not needed for eligibility or matching. The backend's SPEECH_ADAPTER_URL remains separate and is not used here.

Current rule logic supports the scalar/list operators declared in the data schema. The data schema has no nested AND/OR group model, so grouped exception rules need a versioned team contract before being evaluated. Reviews, physical documents, and district-level facts are surfaced for verification. Ranking is a transparent baseline and has no learning-to-rank model. Opportunity data still needs independent source verification and curation by Person 4.
