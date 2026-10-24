from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BrandCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Brand name cannot be empty.")
        return value.strip()


class BrandRead(BrandCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class RuleCreate(BaseModel):
    brand_id: int
    category: Literal["BANNED_TERM", "PREFERRED_TERM", "PROMOTIONAL_CLAIM", "APPROVED_FACT", "TONE", "REQUIRED_PHRASE"]
    value: str = Field(min_length=1, max_length=300)
    replacement: str = Field(default="", max_length=300)
    severity: Literal["High", "Medium", "Low"] = "Medium"
    explanation: str = Field(default="", max_length=1000)

    @field_validator("value")
    @classmethod
    def validate_value(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Rule value cannot be empty.")
        return value.strip()


class RuleRead(RuleCreate):
    id: int
    enabled: bool
    model_config = ConfigDict(from_attributes=True)


class AnalyzeRequest(BaseModel):
    brand_id: int
    title: str = Field(min_length=1, max_length=200)
    content_type: Literal["Website", "Email", "Social media", "Ad", "Other"] = "Website"
    text: str = Field(default="", max_length=100_000)


class FindingRead(BaseModel):
    id: int
    category: str
    severity: str
    matched_text: str
    explanation: str
    source_rule: str
    suggested_correction: str
    confidence: float
    start_position: int | None
    end_position: int | None
    review_state: str
    model_config = ConfigDict(from_attributes=True)


class ReviewRequest(BaseModel):
    action: Literal["ACCEPT_SUGGESTION", "REJECT_SUGGESTION", "COMMENT", "NEEDS_CHANGES", "APPROVE"]
    finding_id: int | None = None
    comment: str = Field(default="", max_length=4000)


class ReviewActionRead(BaseModel):
    id: int
    finding_id: int | None
    action: str
    comment: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DocumentRead(BaseModel):
    id: int
    brand_id: int
    title: str
    content_type: str
    original_content: str
    compliance_score: int
    status: str
    submitted_at: datetime
    approved_at: datetime | None
    findings: list[FindingRead]
    actions: list[ReviewActionRead]
    model_config = ConfigDict(from_attributes=True)