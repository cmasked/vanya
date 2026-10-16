"""Profile validation and deterministic normalization helpers."""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any


class ProfileError(ValueError):
    """Raised when a learner profile cannot be safely normalized."""


EDUCATION_ALIASES = {
    "class 8 pass": "class_8_pass", "class_8_pass": "class_8_pass",
    "class 9": "class_9", "class_9": "class_9", "9th": "class_9", "standard 9": "class_9",
    "class 10": "class_10", "class_10": "class_10", "10th": "class_10", "standard 10": "class_10",
    "class 11": "class_11", "class_11": "class_11", "11th": "class_11", "standard 11": "class_11",
    "class 12": "class_12", "class_12": "class_12", "12th": "class_12", "standard 12": "class_12",
    "vocational": "vocational", "iti": "vocational", "diploma": "diploma",
    "undergraduate": "undergraduate", "graduation": "undergraduate", "graduate": "undergraduate",
    "postgraduate": "postgraduate", "post-graduate": "postgraduate", "all": "all",
    "other": "other", "unknown": "unknown",
}

ALIASES = {
    "age": "age_years",
    "disability_percentage": "min_disability_percentage",
    "income": "annual_family_income",
    "annual_income": "annual_family_income",
    "caste": "caste_category",
    "religion": "religion_category",
    "marks_percentage": "min_marks_percentage",
    "gender_identity": "gender",
}

def _clean_string(value: Any, field: str) -> str:
    if not isinstance(value, str):
        raise ProfileError(f"{field} must be text")
    cleaned = " ".join(value.split())
    if not cleaned:
        raise ProfileError(f"{field} cannot be empty")
    return cleaned


def normalize_profile(profile: Mapping[str, Any]) -> dict[str, Any]:
    """Return a validated copy with canonical field names and education levels.

    Original labels are preserved in ``original_education_level`` and
    ``raw_eligibility_attributes`` when their meaning is normalized.
    """
    if not isinstance(profile, Mapping):
        raise ProfileError("profile must be an object")
    result = dict(profile)
    attrs = result.get("eligibility_attributes", {})
    if attrs is None:
        attrs = {}
    if not isinstance(attrs, Mapping):
        raise ProfileError("eligibility_attributes must be an object")
    raw_attrs = dict(attrs)
    normalized_attrs: dict[str, Any] = {}
    for key, value in raw_attrs.items():
        canonical = ALIASES.get(key, key)
        if canonical in normalized_attrs and normalized_attrs[canonical] != value:
            raise ProfileError(f"conflicting values for {canonical}")
        normalized_attrs[canonical] = value
    # Backend canonical aliases can arrive at the top level.
    for key in list(result):
        if key in ALIASES:
            value = result.pop(key)
            canonical = ALIASES[key]
            if canonical in normalized_attrs and normalized_attrs[canonical] != value:
                raise ProfileError(f"conflicting values for {canonical}")
            normalized_attrs[canonical] = value
    for key, value in normalized_attrs.items():
        if value is not None and key in {"age_years", "annual_family_income", "min_marks_percentage", "min_disability_percentage"}:
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ProfileError(f"{key} must be numeric")
            if value < 0 or (key.endswith("percentage") and value > 100):
                raise ProfileError(f"{key} is outside its supported range")
        elif value is not None and key == "documents":
            if not isinstance(value, (list, tuple)) or any(not isinstance(item, str) for item in value):
                raise ProfileError("documents must be a list of strings")
        elif value is not None and not isinstance(value, (str, bool, int, float, list)):
            raise ProfileError(f"{key} has an unsupported value")
    result["raw_eligibility_attributes"] = raw_attrs
    result["eligibility_attributes"] = normalized_attrs
    for key in ("interests", "skills", "certifications", "experience", "preferred_opportunity_types"):
        if key in result:
            value = result[key]
            if isinstance(value, str):
                value = [value]
            if not isinstance(value, (list, tuple)) or any(not isinstance(item, str) for item in value):
                raise ProfileError(f"{key} must be a list of strings")
            result[key] = list(dict.fromkeys(" ".join(item.split()) for item in value if item.strip()))
    education = result.get("current_education_level", result.get("education_level"))
    if education is not None:
        original = _clean_string(education, "education_level")
        normalized = EDUCATION_ALIASES.get(original.casefold())
        if normalized is None:
            raise ProfileError(f"unsupported education level: {original}")
        result.setdefault("original_education_level", original)
        result["education_level"] = normalized
        result["current_education_level"] = normalized
    for key in ("state", "district", "preferred_language", "main_goal", "course_or_stream"):
        if result.get(key) is not None:
            result[key] = _clean_string(result[key], key)
    return result


def extract_profile_from_text(text: str, base_profile: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Extract only explicitly stated, recognized values from short learner text.

    This deliberately conservative fallback does not infer sensitive attributes.
    """
    if not isinstance(text, str) or not text.strip() or len(text) > 10_000:
        raise ProfileError("text must contain between 1 and 10000 characters")
    extracted = dict(base_profile or {})
    normalized_text = " ".join(text.split())
    match = re.search(r"\b(?:class|standard|std\.?|grade)\s*(8|9|10|11|12)\b", normalized_text, re.I)
    if match:
        extracted["education_level"] = f"class_{match.group(1)}"
    interests_match = re.search(r"\b(?:interested in|interest in|I like)\s+([^.!?]+)", normalized_text, re.I)
    if interests_match:
        existing = extracted.get("interests", [])
        if isinstance(existing, str):
            existing = [existing]
        extracted["interests"] = [*existing, interests_match.group(1).strip()]
    goal_match = re.search(r"\b(?:I want to|I hope to|my goal is to)\s+([^.!?]+)", normalized_text, re.I)
    if goal_match:
        extracted["career_aspirations"] = [goal_match.group(1).strip()]
    extracted["extraction_method"] = "deterministic_explicit_patterns"
    return normalize_profile(extracted)
