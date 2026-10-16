"""Grounded, learner-readable summaries of engine decisions."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


STATUS_TEXT = {
    "ELIGIBLE": "The available profile information meets the recorded requirements.",
    "INELIGIBLE": "At least one recorded mandatory requirement is not met.",
    "POTENTIAL_MATCH_NEEDS_INFO": "This may be a match, but more information is needed.",
    "ELIGIBLE_NEEDS_DOCUMENTS": "The profile meets the recorded checks; some requirements need document verification.",
}


def explain_eligibility(result: Mapping[str, Any]) -> dict[str, Any]:
    """Build structured explanation text from an evaluated result only."""
    status = result.get("status", "POTENTIAL_MATCH_NEEDS_INFO")
    return {
        "summary": STATUS_TEXT.get(status, STATUS_TEXT["POTENTIAL_MATCH_NEEDS_INFO"]),
        "met": [item for item in result.get("criteria", []) if item.get("status") == "SATISFIED"],
        "not_met": [item for item in result.get("criteria", []) if item.get("status") == "NOT_SATISFIED"],
        "to_verify": [item for item in result.get("criteria", []) if item.get("status") == "REQUIRES_VERIFICATION"],
        "missing_information": list(result.get("missing_information", [])),
        "next_steps": list(result.get("next_steps", [])),
    }
