from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints, field_validator

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EligibilityAttributes(StrictModel):
    # Canonical Person 4 fields. Unknown values may be omitted or explicitly null.
    age_years: Annotated[int, Field(strict=True, ge=0, le=120)] | None = None
    annual_family_income: Annotated[float, Field(strict=True, ge=0, allow_inf_nan=False)] | None = None
    min_marks_percentage: Annotated[float, Field(strict=True, ge=0, le=100, allow_inf_nan=False)] | None = None
    min_disability_percentage: Annotated[float, Field(strict=True, ge=0, le=100, allow_inf_nan=False)] | None = None
    gender: Text | None = None
    caste_category: Text | None = None
    religion_category: Text | None = None
    school_management_type: Text | None = None
    parent_occupation: Text | None = None
    minimum_academic_qualification: Text | None = None
    nationality: Text | None = None
    documents: list[Text] | None = Field(default=None, max_length=30)

class Profile(StrictModel):
    display_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]
    education_level: Text
    state: Text
    preferred_language: Text = "English"
    district: Text | None = None
    course_or_stream: Text | None = None
    institution_type: Text | None = None
    preferred_learning_mode: Text | None = None
    main_goal: Text | None = None
    interests: list[Text] = Field(default_factory=list, max_length=20)
    eligibility_attributes: dict[str, str | int | float | bool | list[str] | None] = Field(default_factory=dict)

    @field_validator("eligibility_attributes", mode="before")
    @classmethod
    def attributes(cls, value):
        if not isinstance(value, dict):
            raise ValueError("Eligibility attributes must be an object")
        value = dict(value)
        for old, canonical in (("age", "age_years"), ("disability_percentage", "min_disability_percentage")):
            if old in value:
                if canonical in value and value[old] != value[canonical]:
                    raise ValueError("Conflicting eligibility attributes")
                value[canonical] = value.pop(old)
        return EligibilityAttributes.model_validate(value).model_dump(exclude_unset=True)

class ProfileUpdate(StrictModel):
    expected_version: int = Field(ge=1)
    changes: dict = Field(min_length=1, max_length=12)

class SaveRequest(StrictModel):
    opportunity_id: Annotated[str, StringConstraints(min_length=1, max_length=80)]
    saved: StrictBool = True
    expected_version: int | None = Field(default=None, ge=0)

class ChecklistUpdate(StrictModel):
    expected_version: int = Field(ge=1)
    completed: StrictBool

class EligibilityRequest(StrictModel):
    student_id: Text
    opportunity_id: Text

class RecommendationRequest(StrictModel):
    student_id: Text
    limit: int = Field(default=20, ge=1, le=100)

class Criterion(StrictModel):
    criterion_id: Text
    status: Literal["SATISFIED", "NOT_SATISFIED", "UNKNOWN", "REQUIRES_VERIFICATION"]
    explanation: str = Field(min_length=1, max_length=2000)
    source_reference: str | None = None

class EligibilityResult(StrictModel):
    status: Literal["ELIGIBLE", "INELIGIBLE", "POTENTIAL_MATCH_NEEDS_INFO", "ELIGIBLE_NEEDS_DOCUMENTS"]
    criteria: list[Criterion]
    missing_information: list[str]
    next_steps: list[str]

class Transcript(StrictModel):
    text: str = Field(min_length=1, max_length=10000)
    language: Text
