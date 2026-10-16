from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints, model_validator

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class Profile(StrictModel):
    display_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]
    education_level: Text
    state: Text
    preferred_language: Text = "English"
    district: Text | None = None
    course_or_stream: Text | None = None
    institution_type: Text | None = None
    main_goal: Text | None = None
    interests: list[Text] = Field(default_factory=list, max_length=20)
    eligibility_attributes: dict[str, str | int | float | bool | list[str] | None] = Field(default_factory=dict)

    @model_validator(mode="after")
    def attributes(self):
        allowed = {"age", "gender", "annual_family_income", "caste_category",
                   "religion_category", "min_marks_percentage", "school_management_type",
                   "disability_percentage", "documents"}
        if set(self.eligibility_attributes) - allowed:
            raise ValueError("Unsupported eligibility attribute")
        return self

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
