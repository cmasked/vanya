"""Deterministic, four-state criterion and opportunity evaluation."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from .profiles import normalize_profile

SUPPORTED_OPERATORS = {
    "equals", "not_equals", "less_than", "less_than_or_equal", "greater_than",
    "greater_than_or_equal", "in", "not_in", "between", "contains",
    "requires_document", "unknown_or_manual_review",
}


def _profile_value(profile: Mapping[str, Any], field: str) -> Any:
    attrs = profile.get("eligibility_attributes", {})
    if isinstance(attrs, Mapping) and field in attrs:
        return attrs[field]
    return profile.get(field)


def _evaluate(criterion: Mapping[str, Any], profile: Mapping[str, Any]) -> tuple[str, str]:
    operator = criterion.get("operator")
    field = criterion.get("field", "requirement")
    value = criterion.get("value")
    if criterion.get("review_status") not in (None, "confirmed"):
        return "REQUIRES_VERIFICATION", "This recorded condition still needs a data-quality review."
    if operator not in SUPPORTED_OPERATORS or operator == "unknown_or_manual_review":
        return "REQUIRES_VERIFICATION", "This requirement needs document or human verification."
    if operator == "requires_document":
        actual_documents = _profile_value(profile, "documents") or []
        actual_documents = {str(item).casefold().strip() for item in actual_documents}
        requirement = str(value or "").casefold().strip()
        if requirement and requirement in actual_documents:
            return "SATISFIED", criterion.get("notes") or "The required document is recorded as available."
        return "REQUIRES_VERIFICATION", "Prepare or show the required document for facilitator verification."
    actual = _profile_value(profile, str(field))
    if actual is None:
        return "UNKNOWN", f"Your {str(field).replace('_', ' ')} is needed to check this requirement."
    try:
        if operator == "equals":
            passed = actual == value
        elif operator == "not_equals":
            passed = actual != value
        elif operator == "less_than":
            passed = actual < value
        elif operator == "less_than_or_equal":
            passed = actual <= value
        elif operator == "greater_than":
            passed = actual > value
        elif operator == "greater_than_or_equal":
            passed = actual >= value
        elif operator == "in":
            passed = actual in value
        elif operator == "not_in":
            passed = actual not in value
        elif operator == "between":
            passed = len(value) == 2 and value[0] <= actual <= value[1]
        elif operator == "contains":
            passed = value in actual
        else:
            return "REQUIRES_VERIFICATION", "This requirement uses an unsupported rule and needs review."
    except (TypeError, ValueError, KeyError):
        return "REQUIRES_VERIFICATION", "The supplied value and rule could not be compared safely."
    if passed:
        return "SATISFIED", criterion.get("notes") or "The available profile information meets this requirement."
    return "NOT_SATISFIED", criterion.get("notes") or f"The available {str(field).replace('_', ' ')} does not meet this requirement."


def evaluate_eligibility(profile: Mapping[str, Any], opportunity: Mapping[str, Any]) -> dict[str, Any]:
    """Evaluate all curated criteria without using an LLM or opportunity dates."""
    learner = normalize_profile(profile)
    criteria = opportunity.get("eligibility_criteria") or []
    if not isinstance(criteria, Sequence) or isinstance(criteria, (str, bytes)):
        raise ValueError("eligibility_criteria must be a list")
    results = []
    for criterion in criteria:
        if not isinstance(criterion, Mapping) or not criterion.get("criterion_id"):
            raise ValueError("each criterion must have a criterion_id")
        status, explanation = _evaluate(criterion, learner)
        results.append({"criterion_id": criterion["criterion_id"], "status": status,
                        "explanation": explanation, "source_reference": criterion.get("evidence_reference")})
    mandatory = {
        item["criterion_id"] for item in criteria
        if item.get("required", True) and item.get("condition_type", "mandatory") == "mandatory"
    }
    states = {item["criterion_id"]: item["status"] for item in results}
    if any(states.get(identifier) == "NOT_SATISFIED" for identifier in mandatory):
        overall = "INELIGIBLE"
    elif any(states.get(identifier) == "UNKNOWN" for identifier in mandatory):
        overall = "POTENTIAL_MATCH_NEEDS_INFO"
    elif not criteria:
        overall = "POTENTIAL_MATCH_NEEDS_INFO"
    elif any(states.get(identifier) == "REQUIRES_VERIFICATION" for identifier in mandatory):
        overall = "ELIGIBLE_NEEDS_DOCUMENTS"
    elif any(item["status"] == "REQUIRES_VERIFICATION" for item in results):
        overall = "ELIGIBLE_NEEDS_DOCUMENTS"
    else:
        overall = "ELIGIBLE"
    missing = [item["explanation"] for item in results
               if item["status"] == "UNKNOWN" and item["criterion_id"] in mandatory]
    if not criteria:
        missing.append("Eligibility requirements are not structured yet; ask a facilitator to confirm them.")
    next_steps = list(missing)
    if overall == "ELIGIBLE_NEEDS_DOCUMENTS":
        next_steps.append("Ask a teacher or facilitator to verify the document-based requirements.")
    if overall == "INELIGIBLE":
        next_steps.append("Check the opportunity conditions and ask a facilitator about other suitable options.")
    if overall == "ELIGIBLE":
        next_steps.append("Review the official application page and prepare the listed documents.")
    return {"status": overall, "criteria": results, "missing_information": missing,
            "next_steps": next_steps}
