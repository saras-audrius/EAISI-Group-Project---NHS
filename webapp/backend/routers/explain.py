"""
AI Explanation router.

POST /api/explain — generate a clinical and patient-friendly explanation
                    of a prediction using the Claude API.

Requires ANTHROPIC_API_KEY environment variable to be set.
"""
import os
import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["explain"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class FeatureItem(BaseModel):
    feature: str
    value: str
    contribution: float
    direction: str


class ExplainRequest(BaseModel):
    probability_at_risk: float
    outcome_label: str
    top_features: list[FeatureItem]


class ExplainResponse(BaseModel):
    clinical: str
    patient: str


# ---------------------------------------------------------------------------
# Feature name humanisation
# ---------------------------------------------------------------------------

_FEATURE_LABELS: dict[str, str] = {
    "oks_t0_pain":        "knee pain",
    "oks_t0_night_pain":  "pain at night",
    "oks_t0_washing":     "washing and drying",
    "oks_t0_transport":   "getting in/out of a car",
    "oks_t0_walking":     "walking ability",
    "oks_t0_standing":    "ability to stand for 30 minutes",
    "oks_t0_limping":     "limping when walking",
    "oks_t0_kneeling":    "kneeling down",
    "oks_t0_work":        "ability to work",
    "oks_t0_confidence":  "confidence in knee",
    "oks_t0_shopping":    "shopping ability",
    "oks_t0_stairs":      "going up and down stairs",
    "t0_mobility":        "mobility",
    "t0_self_care":       "self-care limitations",
    "t0_activity":        "usual activities",
    "t0_discomfort":      "pain/discomfort level",
    "t0_anxiety":         "anxiety or depression level",
    "t0_symptom_period":  "symptom duration",
    "t0_previous_surgery":"previous knee surgery",
    "t0_assisted":        "need for daily assistance",
    "t0_disability":      "disability status",
    "t0_living_arrangements": "living arrangements",
    "age_band_2":         "age group (40–59 years)",
    "age_band_3":         "age group (60–69 years)",
    "age_band_4":         "age group (70–79 years)",
    "age_band_5":         "age group (80+ years)",
    "heart_disease":      "heart disease",
    "high_bp":            "high blood pressure",
    "stroke":             "history of stroke",
    "circulation":        "circulation problems",
    "lung_disease":       "lung disease",
    "diabetes":           "diabetes",
    "kidney_disease":     "kidney disease",
    "nervous_system":     "nervous system condition",
    "liver_disease":      "liver disease",
    "cancer":             "cancer",
    "depression":         "depression or anxiety",
    "arthritis":          "arthritis",
}


def _humanize(feature: str, value: str) -> str:
    label = _FEATURE_LABELS.get(feature, feature.replace("_", " ").replace("oks t0 ", "").replace("t0 ", ""))
    return f"{label} (score: {value})"


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/explain", response_model=ExplainResponse)
async def explain_prediction(request: ExplainRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "ANTHROPIC_API_KEY is not set. "
                "Add it to your environment to enable AI explanations."
            ),
        )

    # Top 4 risk-increasing and top 3 protective factors
    sorted_features = sorted(request.top_features, key=lambda f: abs(f.contribution), reverse=True)
    risk_factors  = [f for f in sorted_features if f.contribution < 0][:4]
    protective    = [f for f in sorted_features if f.contribution >= 0][:3]

    risk_lines = "\n".join(
        f"  - {_humanize(f.feature, f.value)}"
        for f in risk_factors
    ) or "  - None identified"

    protective_lines = "\n".join(
        f"  - {_humanize(f.feature, f.value)}"
        for f in protective
    ) or "  - None identified"

    pct = round(request.probability_at_risk * 100)

    prompt = f"""A pre-operative knee replacement outcome assessment has been completed.

Result: {request.outcome_label}
Estimated probability of poor outcome: {pct}%

Factors increasing risk of poor outcome:
{risk_lines}

Factors reducing risk (protective):
{protective_lines}

Write exactly two short explanations. Separate them with the exact marker [PATIENT] on its own line.

CLINICAL: 2–3 sentences for the operating surgeon. Use appropriate clinical language. Mention the specific risk factors. Suggest what this means for pre-operative counselling. Do not say "the model" — say "the assessment".

[PATIENT]

PATIENT: 2–3 sentences for the patient, in plain English. Be honest but not alarming. Explain what the key factors mean in everyday terms. Do not use words like "algorithm" or "model" — say "our assessment". Do not say "poor outcome" — say "getting the most benefit from surgery".

Output only the two explanation texts with no extra headings, labels, or commentary."""

    client = anthropic.AsyncAnthropic(api_key=api_key)

    try:
        response = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )

        text = next((b.text for b in response.content if b.type == "text"), "")

        if "[PATIENT]" in text:
            parts = text.split("[PATIENT]", 1)
            clinical = parts[0].replace("CLINICAL:", "").strip()
            patient  = parts[1].strip()
        else:
            # Fallback: return same text for both
            clinical = text.strip()
            patient  = text.strip()

        return ExplainResponse(clinical=clinical, patient=patient)

    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid Anthropic API key.")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="Claude API rate limit reached. Please try again shortly.")
    except anthropic.APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {e.message}")
