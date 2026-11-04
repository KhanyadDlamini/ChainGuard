import json
from copy import deepcopy
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.ai_investigation import AIInvestigationAssessment
from app.services.ai_investigation import (
    AIInvestigationError,
    analyze_investigation,
)
from app.services.meta_client import MetaAPIError, extract_output_text

VALID_ASSESSMENT = {
    "executive_summary": (
        "The observed transfer is 50 CGT below the expected payment "
        "of 100 CGT. The cause remains unestablished."
    ),
    "hypotheses": [
        {
            "title": "Partial payment",
            "explanation": (
                "The recorded transaction may represent a partial "
                "settlement of the expected payment."
            ),
            "supporting_evidence": [
                "The observed transfer is 50 CGT against an expected 100 CGT."
            ],
            "contradicting_evidence": [],
            "unresolved_questions": [
                "Was the remaining 50 CGT transferred separately?"
            ],
            "confidence": "MODERATE",
        },
        {
            "title": "Split payment",
            "explanation": (
                "The payment may have been divided across multiple "
                "transactions, with only one currently associated."
            ),
            "supporting_evidence": [],
            "contradicting_evidence": [],
            "unresolved_questions": [
                "Are there other transfers associated with this payment?"
            ],
            "confidence": "LOW",
        },
    ],
    "key_observations": [
        "The transaction receipt status is 1.",
        "The observed amount is 50 CGT.",
    ],
    "additional_evidence_needed": [
        "Check for other transfers involving the expected sender and recipient.",
        "Compare the original payment instruction with the blockchain transfer.",
    ],
    "limitations": [
        "The available report does not establish why the shortfall occurred."
    ],
    "fraud_established": False,
    "responsibility_established": False,
}

@pytest.mark.asyncio
async def test_valid_ai_assessment_is_accepted():
    mock_response = {
        "output": [
            {
                "type": "message",
                "content": [
                    {
                        "type": "output_text",
                        "text": json.dumps(VALID_ASSESSMENT),
                    }
                ],
            }
        ]
    }

    with patch(
        "app.services.ai_investigation.MetaClient.generate",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        result = await analyze_investigation(
            {"findings": ["AMOUNT_DISCREPANCY"]}
        )

    assert isinstance(result, AIInvestigationAssessment)
    assert result.fraud_established is False
    assert result.responsibility_established is False
    assert result.hypotheses[0].title == "Partial payment"

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "field",
    ["hypotheses", "additional_evidence_needed"],
)
async def test_incomplete_ai_assessment_is_rejected(field):
    invalid_assessment = deepcopy(VALID_ASSESSMENT)
    invalid_assessment[field] = []

    mock_response = {
        "output": [
            {
                "type": "message",
                "content": [
                    {
                        "type": "output_text",
                        "text": json.dumps(invalid_assessment),
                    }
                ],
            }
        ]
    }

    with patch(
        "app.services.ai_investigation.MetaClient.generate",
        new_callable=AsyncMock,
        return_value=mock_response,
    ), pytest.raises(
        AIInvestigationError,
        match="invalid investigation assessment",
    ):
        await analyze_investigation({"findings": ["AMOUNT_DISCREPANCY"]})

@pytest.mark.asyncio
async def test_invalid_ai_json_is_rejected():
    mock_response = {
        "output": [
            {
                "type": "message",
                "content": [
                    {
                        "type": "output_text",
                        "text": "{invalid json",
                    }
                ],
            }
        ]
    }

    with patch(
        "app.services.ai_investigation.MetaClient.generate",
        new_callable=AsyncMock,
        return_value=mock_response,
    ), pytest.raises(
        AIInvestigationError,
        match="invalid investigation assessment",
    ):
        await analyze_investigation({"findings": []})


@pytest.mark.asyncio
async def test_meta_api_error_is_translated():
    with patch(
        "app.services.ai_investigation.MetaClient.generate",
        new_callable=AsyncMock,
        side_effect=MetaAPIError("Meta API returned HTTP 500."),
    ), pytest.raises(
        AIInvestigationError,
        match="HTTP 500",
    ):
        await analyze_investigation({"findings": []})


def test_output_text_extraction():
    response = {
        "output": [
            {
                "type": "message",
                "content": [
                    {"type": "output_text", "text": "Assessment"},
                ],
            }
        ]
    }

    assert extract_output_text(response) == "Assessment"


def test_missing_output_text_is_rejected():
    with pytest.raises(
        MetaAPIError,
        match="no assistant text",
    ):
        extract_output_text({"output": []})
