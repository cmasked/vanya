"""Deterministic, explainable opportunity ranking."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from .eligibility import evaluate_eligibility
from .profiles import normalize_profile


def _tokens(values: Any) -> set[str]:
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, (list, tuple, set)):
        return set()
    return {str(item).casefold().strip() for item in values if str(item).strip()}


def recommend_opportunities(profile: Mapping[str, Any], opportunities: Sequence[Mapping[str, Any]],
                             limit: int = 20) -> list[dict[str, Any]]:
    """Rank eligible and potentially relevant curated records, excluding unsafe records."""
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1 or limit > 100:
        raise ValueError("limit must be between 1 and 100")
    learner = normalize_profile(profile)
    ranked = []
    interests = _tokens(learner.get("interests")) | _tokens(learner.get("skills")) | _tokens(learner.get("main_goal"))
    education = learner.get("current_education_level")
    state = str(learner.get("state", "")).casefold()
    preferred_types = _tokens(learner.get("preferred_opportunity_types"))
    for opportunity in opportunities:
        if not isinstance(opportunity, Mapping):
            continue
        if opportunity.get("verification_status") != "verified" or opportunity.get("synthetic", False):
            continue
        score = 0.0
        reasons: list[str] = []
        levels = _tokens(opportunity.get("education_levels"))
        if "all" in levels or (education and education in levels):
            score += 35
            reasons.append("Education level matches the recorded opportunity range.")
        geo = opportunity.get("geographic_scope", {})
        if isinstance(geo, Mapping):
            geo_type = geo.get("type")
            states = _tokens(geo.get("states"))
            if geo_type == "national" or (state and state in states):
                score += 20
                reasons.append("Location is within the recorded geographic scope.")
        category = str(opportunity.get("category", "other"))
        if category in preferred_types or category.replace("_", " ") in preferred_types:
            score += 15
            reasons.append("Opportunity type matches a stated preference.")
        searchable = " ".join(str(opportunity.get(key, "")) for key in ("name", "description", "category")).casefold()
        overlap = sorted(token for token in interests if len(token) > 2 and token in searchable)
        if overlap:
            score += min(20, 7 * len(overlap))
            reasons.append("Related to stated interests or skills: " + ", ".join(overlap[:3]) + ".")
        result = evaluate_eligibility(learner, opportunity)
        if result["status"] == "INELIGIBLE":
            score = max(0, score - 60)
        elif result["status"] == "ELIGIBLE":
            score += 10
            reasons.append("Available profile details meet the recorded mandatory checks.")
        elif result["status"] == "POTENTIAL_MATCH_NEEDS_INFO":
            reasons.append("More profile information is needed to confirm eligibility.")
        else:
            reasons.append("A document or facilitator check is needed to confirm eligibility.")
        if not reasons:
            reasons.append("This is a verified opportunity; review its recorded requirements.")
        ranked.append({"opportunity": dict(opportunity), "score": round(min(100, score), 1),
                       "reasons": reasons, "eligibility": result})
    ranked.sort(key=lambda item: (-item["score"], str(item["opportunity"].get("opportunity_id", ""))))
    return ranked[:limit]
