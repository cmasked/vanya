"""Preparation checklists based on curated opportunity records."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


def build_application_checklist(opportunity: Mapping[str, Any], profile: Mapping[str, Any] | None = None,
                                eligibility: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
    """Return document and action items, preserving their curated evidence links."""
    learner = profile or {}
    attrs = learner.get("eligibility_attributes", {})
    available = attrs.get("documents", []) if isinstance(attrs, Mapping) else []
    available_norm = {str(item).casefold().strip() for item in available}
    items: list[dict[str, Any]] = []
    for document in opportunity.get("required_documents", []) or []:
        name = document.get("document_name", "Required document")
        document_type = document.get("document_type", "")
        prepared = name.casefold().strip() in available_norm or document_type.casefold().strip() in available_norm
        items.append({
            "title": name,
            "description": document.get("description") or "Prepare a copy for the application.",
            "kind": "document",
            "mandatory": bool(document.get("mandatory", True)),
            "prepared": prepared,
            "source_reference": document.get("evidence_reference"),
        })
    if eligibility:
        for action in eligibility.get("next_steps", []):
            if action:
                items.append({"title": str(action), "description": "", "kind": "action",
                              "mandatory": True, "prepared": False, "source_reference": None})
    return items
