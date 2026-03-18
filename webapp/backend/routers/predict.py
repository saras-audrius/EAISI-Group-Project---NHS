"""
Prediction router.

POST /api/predict   — run a model on patient features
GET  /api/synthetic-patient — generate a synthetic patient profile
"""
import random
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.model_loader import get_model, get_available_models
from services.preprocessor import build_feature_vector, REGIONS

router = APIRouter(prefix="/api", tags=["predict"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class PatientFeatures(BaseModel):
    # Demographics
    age_band: int = Field(..., ge=2, le=5, description="2=40-59, 3=60-69, 4=70-79, 5=80+")
    gender: int = Field(..., ge=0, le=1, description="0=Female, 1=Male")

    # OKS pre-operative items (0-4 each)
    oks_t0_pain: int = Field(..., ge=0, le=4)
    oks_t0_night_pain: int = Field(..., ge=0, le=4)
    oks_t0_washing: int = Field(..., ge=0, le=4)
    oks_t0_transport: int = Field(..., ge=0, le=4)
    oks_t0_walking: int = Field(..., ge=0, le=4)
    oks_t0_standing: int = Field(..., ge=0, le=4)
    oks_t0_limping: int = Field(..., ge=0, le=4)
    oks_t0_kneeling: int = Field(..., ge=0, le=4)
    oks_t0_work: int = Field(..., ge=0, le=4)
    oks_t0_confidence: int = Field(..., ge=0, le=4)
    oks_t0_shopping: int = Field(..., ge=0, le=4)
    oks_t0_stairs: int = Field(..., ge=0, le=4)

    # EQ-5D quality of life dimensions (1-3)
    t0_mobility: int = Field(..., ge=1, le=3)
    t0_self_care: int = Field(..., ge=1, le=3)
    t0_activity: int = Field(..., ge=1, le=3)
    t0_discomfort: int = Field(..., ge=1, le=3)
    t0_anxiety: int = Field(..., ge=1, le=3)

    # Other pre-operative details
    t0_symptom_period: int = Field(..., ge=1, le=4, description="1=<1yr, 2=1-5yr, 3=5-10yr, 4=>10yr")
    t0_living_arrangements: int = Field(..., description="1=Alone, 2=With others, 4=Care home")
    t0_assisted: int = Field(0, ge=0, le=1)
    t0_previous_surgery: int = Field(0, ge=0, le=1)
    t0_disability: int = Field(0, ge=0, le=1)

    # Comorbidities (0=No, 1=Yes)
    heart_disease: int = Field(0, ge=0, le=1)
    high_bp: int = Field(0, ge=0, le=1)
    stroke: int = Field(0, ge=0, le=1)
    circulation: int = Field(0, ge=0, le=1)
    lung_disease: int = Field(0, ge=0, le=1)
    diabetes: int = Field(0, ge=0, le=1)
    kidney_disease: int = Field(0, ge=0, le=1)
    nervous_system: int = Field(0, ge=0, le=1)
    liver_disease: int = Field(0, ge=0, le=1)
    cancer: int = Field(0, ge=0, le=1)
    depression: int = Field(0, ge=0, le=1)
    arthritis: int = Field(0, ge=0, le=1)

    # Hospital & region context
    university_hospital: int = Field(1, ge=0, le=1)
    independent_hospital: int = Field(0, ge=0, le=1)
    region: str = Field("West Midlands")

    # Which model to use
    model_name: str = Field("random_forest_tuned")


class PredictionResponse(BaseModel):
    prediction: int
    probability_good_outcome: float
    probability_at_risk: float
    outcome_label: str
    confidence: str
    clinical_note: str
    model_used: str


# ---------------------------------------------------------------------------
# Synthetic patient generation
# ---------------------------------------------------------------------------
def _weighted_choice(options: list, weights: list) -> int:
    return random.choices(options, weights=weights, k=1)[0]


def generate_synthetic_patient() -> dict:
    """Generate a realistic synthetic patient profile."""
    oks_items = {
        "oks_t0_pain":        _weighted_choice([0,1,2,3,4], [5,25,35,25,10]),
        "oks_t0_night_pain":  _weighted_choice([0,1,2,3,4], [5,20,35,30,10]),
        "oks_t0_washing":     _weighted_choice([0,1,2,3,4], [3,10,25,40,22]),
        "oks_t0_transport":   _weighted_choice([0,1,2,3,4], [5,15,30,35,15]),
        "oks_t0_walking":     _weighted_choice([0,1,2,3,4], [5,20,35,30,10]),
        "oks_t0_standing":    _weighted_choice([0,1,2,3,4], [5,20,35,30,10]),
        "oks_t0_limping":     _weighted_choice([0,1,2,3,4], [5,25,35,25,10]),
        "oks_t0_kneeling":    _weighted_choice([0,1,2,3,4], [25,30,25,15,5]),
        "oks_t0_work":        _weighted_choice([0,1,2,3,4], [10,20,30,25,15]),
        "oks_t0_confidence":  _weighted_choice([0,1,2,3,4], [5,15,30,35,15]),
        "oks_t0_shopping":    _weighted_choice([0,1,2,3,4], [5,15,30,35,15]),
        "oks_t0_stairs":      _weighted_choice([0,1,2,3,4], [10,25,35,25,5]),
    }
    oks_score = sum(oks_items.values())

    comorbidities = {
        "arthritis":      int(random.random() < 0.60),
        "high_bp":        int(random.random() < 0.40),
        "heart_disease":  int(random.random() < 0.15),
        "diabetes":       int(random.random() < 0.15),
        "depression":     int(random.random() < 0.12),
        "lung_disease":   int(random.random() < 0.08),
        "stroke":         int(random.random() < 0.05),
        "circulation":    int(random.random() < 0.08),
        "kidney_disease": int(random.random() < 0.05),
        "nervous_system": int(random.random() < 0.04),
        "liver_disease":  int(random.random() < 0.02),
        "cancer":         int(random.random() < 0.05),
    }

    return {
        "age_band": _weighted_choice([2, 3, 4, 5], [10, 35, 40, 15]),
        "gender": _weighted_choice([0, 1], [55, 45]),
        **oks_items,
        "oks_t0_score": oks_score,
        "t0_mobility": _weighted_choice([1, 2, 3], [15, 60, 25]),
        "t0_self_care": _weighted_choice([1, 2, 3], [50, 40, 10]),
        "t0_activity": _weighted_choice([1, 2, 3], [15, 55, 30]),
        "t0_discomfort": _weighted_choice([1, 2, 3], [5, 45, 50]),
        "t0_anxiety": _weighted_choice([1, 2, 3], [50, 35, 15]),
        "t0_symptom_period": _weighted_choice([1, 2, 3, 4], [15, 45, 25, 15]),
        "t0_living_arrangements": _weighted_choice([1, 2, 4], [25, 73, 2]),
        "t0_assisted": int(random.random() < 0.15),
        "t0_previous_surgery": int(random.random() < 0.10),
        "t0_disability": int(random.random() < 0.20),
        **comorbidities,
        "university_hospital": int(random.random() < 0.40),
        "independent_hospital": int(random.random() < 0.10),
        "region": random.choice(REGIONS + ["East Midlands"]),
        "model_name": "random_forest_tuned",
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/synthetic-patient")
def get_synthetic_patient():
    return generate_synthetic_patient()


@router.post("/predict", response_model=PredictionResponse)
def predict(patient: PatientFeatures):
    available = get_available_models()
    if not available:
        raise HTTPException(status_code=503, detail="No models loaded. Check server logs.")

    model_name = patient.model_name if patient.model_name in available else available[0]

    try:
        model = get_model(model_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    patient_dict = patient.model_dump()

    # Compute oks_t0_score if not provided (sum of 12 items)
    if "oks_t0_score" not in patient_dict:
        oks_keys = [
            "oks_t0_pain", "oks_t0_night_pain", "oks_t0_washing", "oks_t0_transport",
            "oks_t0_walking", "oks_t0_standing", "oks_t0_limping", "oks_t0_kneeling",
            "oks_t0_work", "oks_t0_confidence", "oks_t0_shopping", "oks_t0_stairs",
        ]
        patient_dict["oks_t0_score"] = sum(patient_dict[k] for k in oks_keys)

    X = build_feature_vector(patient_dict)

    prediction = int(model.predict(X)[0])
    probabilities = model.predict_proba(X)[0]

    # Class 0 = Good Outcome, Class 1 = At Risk
    prob_good = float(probabilities[0])
    prob_risk = float(probabilities[1])

    if prob_risk >= 0.60:
        confidence = "High"
    elif prob_risk >= 0.35:
        confidence = "Moderate"
    else:
        confidence = "Low"

    if prediction == 1:
        outcome_label = "At Risk of Poor Outcome"
        clinical_note = (
            "The model predicts this patient is unlikely to achieve a meaningful improvement "
            "(OKS delta > 7) following knee replacement. Consider additional pre-operative "
            "assessment, patient education, and shared decision-making before proceeding."
        )
    else:
        outcome_label = "Good Outcome Expected"
        clinical_note = (
            "The model predicts this patient is likely to achieve meaningful improvement "
            "(OKS delta > 7) following knee replacement. Standard care pathways apply. "
            "Continue to monitor and support recovery."
        )

    return PredictionResponse(
        prediction=prediction,
        probability_good_outcome=round(prob_good, 4),
        probability_at_risk=round(prob_risk, 4),
        outcome_label=outcome_label,
        confidence=confidence,
        clinical_note=clinical_note,
        model_used=model_name,
    )


@router.get("/available-models")
def list_models():
    return {"models": get_available_models()}
