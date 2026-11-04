from typing import Literal

from pydantic import BaseModel, Field


class InvestigationHypothesis(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    explanation: str = Field(min_length=10, max_length=1200)
    supporting_evidence: list[str] = Field(default_factory=list)
    contradicting_evidence: list[str] = Field(default_factory=list)
    unresolved_questions: list[str] = Field(min_length=1, max_length=8)
    confidence: Literal["LOW", "MODERATE", "HIGH"]


class AIInvestigationAssessment(BaseModel):
    executive_summary: str = Field(min_length=10, max_length=2000)
    hypotheses: list[InvestigationHypothesis] = Field(
        min_length=2,
        max_length=4,
    )
    key_observations: list[str] = Field(min_length=1, max_length=10)
    additional_evidence_needed: list[str] = Field(
        min_length=2,
        max_length=8,
    )
    limitations: list[str] = Field(min_length=1, max_length=8)
    fraud_established: Literal[False] = False
    responsibility_established: Literal[False] = False
