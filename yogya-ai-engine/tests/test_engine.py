from __future__ import annotations

import pytest

from yogya_ai_engine import (
    build_application_checklist,
    evaluate_eligibility,
    explain_eligibility,
    extract_profile_from_text,
    normalize_profile,
    recommend_opportunities,
)
from yogya_ai_engine.profiles import ProfileError


def criterion(identifier, field, operator, value, **extra):
    return {"criterion_id": identifier, "field": field, "operator": operator,
            "value": value, "condition_type": "mandatory", "required": True,
            "review_status": "confirmed", "evidence_reference": "ev_source", **extra}


def opportunity(**overrides):
    record = {
        "opportunity_id": "opp_example_2026", "name": "Example Skills Scholarship",
        "category": "scholarship", "description": "Scholarship for learners interested in science.",
        "verification_status": "verified", "synthetic": False,
        "education_levels": ["class_10"],
        "geographic_scope": {"type": "national", "states": [], "districts": []},
        "eligibility_criteria": [criterion("crit_income", "annual_family_income", "less_than_or_equal", 200000)],
        "required_documents": [{"document_name": "Income Certificate", "document_type": "income_proof",
                                "mandatory": True, "description": "Proof of annual family income.",
                                "evidence_reference": "ev_source"}],
        "evidence": [{"evidence_id": "ev_source", "source_url": "https://example.gov.in/rules"}],
    }
    record.update(overrides)
    return record


def test_profile_aliases_preserve_original_education_and_attributes():
    normalized = normalize_profile({"education_level": " 10th ",
                                    "eligibility_attributes": {"age": 16, "income": 150000}})
    assert normalized["education_level"] == "class_10"
    assert normalized["original_education_level"] == "10th"
    assert normalized["eligibility_attributes"] == {"age_years": 16, "annual_family_income": 150000}
    with pytest.raises(ProfileError):
        normalize_profile({"eligibility_attributes": {"age_years": True}})


def test_four_valued_eligibility_and_boundary_operator():
    record = opportunity(eligibility_criteria=[
        criterion("income", "annual_family_income", "less_than_or_equal", 200000),
        criterion("gender", "gender", "equals", "female"),
        criterion("document", "documents", "requires_document", "income_proof"),
    ])
    result = evaluate_eligibility({"eligibility_attributes": {"annual_family_income": 200000}}, record)
    assert [item["status"] for item in result["criteria"]] == [
        "SATISFIED", "UNKNOWN", "REQUIRES_VERIFICATION"]
    assert result["status"] == "POTENTIAL_MATCH_NEEDS_INFO"
    assert len(result["missing_information"]) == 1


def test_not_satisfied_and_unreviewed_rules_do_not_claim_eligibility():
    record = opportunity(eligibility_criteria=[
        criterion("income", "annual_family_income", "less_than_or_equal", 200000),
        criterion("unreviewed", "state", "equals", "Tamil Nadu", review_status="pending_review"),
    ])
    result = evaluate_eligibility({"eligibility_attributes": {"annual_family_income": 300000}}, record)
    assert result["status"] == "INELIGIBLE"
    assert result["criteria"][1]["status"] == "REQUIRES_VERIFICATION"


def test_matching_filters_unverified_and_synthetic_and_is_deterministic():
    records = [opportunity(), opportunity(opportunity_id="opp_unverified", verification_status="draft"),
               opportunity(opportunity_id="opp_synthetic", synthetic=True)]
    profile = {"education_level": "Class 10", "state": "Rajasthan",
               "interests": ["science"], "eligibility_attributes": {"annual_family_income": 90000}}
    ranked = recommend_opportunities(profile, records)
    assert [item["opportunity"]["opportunity_id"] for item in ranked] == ["opp_example_2026"]
    assert ranked[0]["score"] > 50
    assert "Available profile details meet the recorded mandatory checks." in ranked[0]["reasons"]
    with pytest.raises(ValueError):
        recommend_opportunities(profile, records, 101)


def test_explanations_and_checklist_are_grounded_in_opportunity_data():
    record = opportunity()
    result = evaluate_eligibility({"eligibility_attributes": {"annual_family_income": 100000}}, record)
    explanation = explain_eligibility(result)
    checklist = build_application_checklist(record, {"eligibility_attributes": {"documents": ["income_proof"]}}, result)
    assert explanation["summary"].startswith("The available profile")
    assert checklist[0]["prepared"] is True
    assert checklist[0]["source_reference"] == "ev_source"


def test_free_text_fallback_extracts_only_explicit_low_risk_fields():
    profile = extract_profile_from_text("I am in Class 9 and interested in farming.")
    assert profile["education_level"] == "class_9"
    assert profile["interests"] == ["farming"]
    assert "gender" not in profile["eligibility_attributes"]
