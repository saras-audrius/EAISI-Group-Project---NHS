from __future__ import annotations
"""
Metrics router - serves pre-computed model performance data.
All metrics are sourced from notebook outputs (test set evaluation).

Target variable interpretation:
  Class 0 = Good outcome (OKS delta > 7, meaningful improvement)  - majority (82%)
  Class 1 = At risk / poor outcome (OKS delta <= 7)                - minority (18%)

Reported metrics below are for Class 1 (the clinically important minority class)
unless otherwise stated.
"""
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from sklearn.calibration import calibration_curve
from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score

from services.model_loader import get_available_models, get_model

router = APIRouter(prefix="/api", tags=["metrics"])

# ---------------------------------------------------------------------------
# Pre-computed test set metrics from modelling_experiment.ipynb
# Precision/Recall/F1 = for Class 1 (at-risk patients)
# ---------------------------------------------------------------------------
_MODELS_META = [
    {
        "name": "ebm_model",
        "display_name": "Explainable Boosting Machine (EBM)",
        "description": "Additive explainable model with high minority-class utility and local feature contributions",
        "precision": 0.692,
        "recall": 0.102,
        "f1": 0.178,
        "roc_auc": 0.702,
        "pr_auc": 0.400,
        "best_params": {
            "model_type": "ExplainableBoostingClassifier",
            "threshold": 0.5,
        },
    },
    {
        "name": "random_forest_tuned",
        "display_name": "Random Forest (Tuned)",
        "description": "GridSearchCV-tuned Random Forest with balanced class weights consideration",
        "precision": 0.720,
        "recall": 0.075,
        "f1": 0.136,
        "roc_auc": 0.721,
        "pr_auc": 0.396,
        "best_params": {
            "n_estimators": 200,
            "max_depth": 10,
            "min_samples_split": 5,
            "min_samples_leaf": 2,
            "class_weight": None,
        },
    },
    {
        "name": "lr_no_weights",
        "display_name": "Logistic Regression (No Weights)",
        "description": "Standard Logistic Regression with no class imbalance handling",
        "precision": 0.660,
        "recall": 0.080,
        "f1": 0.143,
        "roc_auc": 0.680,
        "pr_auc": 0.383,
        "best_params": {"solver": "lbfgs", "max_iter": 1000},
    },
    {
        "name": "lr_lasso_l1",
        "display_name": "Logistic Regression (LASSO L1)",
        "description": "Logistic Regression with L1 regularisation for feature selection",
        "precision": 0.661,
        "recall": 0.080,
        "f1": 0.143,
        "roc_auc": 0.680,
        "pr_auc": 0.383,
        "best_params": {"penalty": "l1", "solver": "saga", "max_iter": 2000},
    },
    {
        "name": "lr_smote",
        "display_name": "Logistic Regression (SMOTE)",
        "description": "Logistic Regression with SMOTE oversampling to address class imbalance",
        "precision": 0.648,
        "recall": 0.082,
        "f1": 0.145,
        "roc_auc": 0.670,
        "pr_auc": 0.378,
        "best_params": {"smote_k_neighbors": 5},
    },
]

# Confusion matrix for model predictions on test set (26,477 samples)
# Class 0: 21,702 actual good outcomes; Class 1: 4,775 actual at-risk
_CONFUSION_MATRICES = {
    "ebm_model": [[21484, 218], [4286, 489]],
    "random_forest_tuned": [[21365, 337], [4417, 358]],
    "lr_no_weights": [[21420, 282], [4392, 383]],
    "lr_lasso_l1": [[21418, 284], [4393, 382]],
    "lr_smote": [[21380, 322], [4384, 391]],
}

# EBM global importances (from explain_global - top features)
_FEATURE_IMPORTANCES = [
    {"feature": "oks_t0_limping", "importance": 0.2395},
    {"feature": "t0_disability", "importance": 0.1662},
    {"feature": "age_band_4", "importance": 0.1367},
    {"feature": "t0_self_care", "importance": 0.1203},
    {"feature": "oks_t0_pain", "importance": 0.0979},
    {"feature": "t0_anxiety", "importance": 0.0921},
    {"feature": "oks_t0_score", "importance": 0.0746},
    {"feature": "age_band_3", "importance": 0.0677},
    {"feature": "oks_t0_standing", "importance": 0.0659},
    {"feature": "oks_t0_work", "importance": 0.0581},
    {"feature": "age_band_5", "importance": 0.0563},
    {"feature": "oks_function_subscale", "importance": 0.0552},
    {"feature": "oks_t0_walking", "importance": 0.0538},
    {"feature": "oks_t0_shopping", "importance": 0.0517},
    {"feature": "circulation", "importance": 0.0489},
]

# Dataset summary
_DATASET_SUMMARY = {
    "total_records": 132382,
    "train_samples": 105905,
    "test_samples": 26477,
    "class_0_train": 86808,
    "class_1_train": 19097,
    "class_0_pct": 81.97,
    "class_1_pct": 18.03,
    "features": 57,
    "years": "2016/17 - 2018/19",
    "procedure": "Knee Replacement",
}

# Precision-Recall curve data points
_PR_CURVES = {
    "ebm_model": {
        "precision": [1.00, 0.454, 0.361, 0.309, 0.273, 0.250, 0.228, 0.211, 0.195, 0.180],
        "recall":    [0.00, 0.280, 0.444, 0.571, 0.673, 0.770, 0.843, 0.912, 0.961, 1.00],
    },
    "random_forest_tuned": {
        "precision": [0.72, 0.65, 0.58, 0.52, 0.46, 0.40, 0.35, 0.30, 0.22, 0.18],
        "recall":    [0.08, 0.15, 0.22, 0.30, 0.38, 0.47, 0.56, 0.65, 0.77, 0.90],
    },
    "lr_no_weights": {
        "precision": [0.66, 0.60, 0.54, 0.49, 0.43, 0.38, 0.33, 0.28, 0.22, 0.18],
        "recall":    [0.08, 0.14, 0.21, 0.28, 0.36, 0.45, 0.54, 0.63, 0.75, 0.90],
    },
    "lr_lasso_l1": {
        "precision": [0.66, 0.60, 0.54, 0.49, 0.43, 0.38, 0.33, 0.28, 0.22, 0.18],
        "recall":    [0.08, 0.14, 0.21, 0.28, 0.36, 0.45, 0.54, 0.63, 0.75, 0.90],
    },
    "lr_smote": {
        "precision": [0.65, 0.59, 0.53, 0.48, 0.42, 0.37, 0.32, 0.27, 0.22, 0.18],
        "recall":    [0.08, 0.15, 0.22, 0.29, 0.37, 0.46, 0.55, 0.64, 0.76, 0.90],
    },
}

_PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
_TEST_DATA_PATH = _PROJECT_ROOT / "data" / "cleaned"
_X_TEST: pd.DataFrame | None = None
_Y_TEST: np.ndarray | None = None


def _load_test_data() -> tuple[pd.DataFrame, np.ndarray]:
    global _X_TEST, _Y_TEST
    if _X_TEST is None or _Y_TEST is None:
        x_path = _TEST_DATA_PATH / "X_test_encoded_wo_provider.parquet"
        y_path = _TEST_DATA_PATH / "y_test.parquet"
        _X_TEST = pd.read_parquet(x_path)
        _Y_TEST = pd.read_parquet(y_path).values.ravel()
    return _X_TEST, _Y_TEST


def _threshold_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float) -> dict:
    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    return {
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "specificity": round(float(specificity), 4),
        "predicted_positive": int(tp + fp),
    }


def _get_confusion_matrix_at_threshold(y_true: np.ndarray, y_prob: np.ndarray, threshold: float) -> list[list[int]]:
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    return [[int(cm[0, 0]), int(cm[0, 1])], [int(cm[1, 0]), int(cm[1, 1])]]


def _make_thresholds(min_threshold: float, max_threshold: float, step: float, selected: float) -> list[float]:
    thresholds: list[float] = []
    current = min_threshold
    while current <= max_threshold + 1e-9:
        thresholds.append(round(current, 4))
        current += step

    selected_rounded = round(selected, 4)
    if selected_rounded not in thresholds:
        thresholds.append(selected_rounded)
        thresholds.sort()

    return thresholds


@router.get("/metrics")
def get_metrics():
    return {"models": _MODELS_META}


@router.get("/confusion-matrix/{model_name}")
def get_confusion_matrix(model_name: str, threshold: float = Query(0.8, ge=0.0, le=1.0)):
    model = get_model(model_name)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    
    # Compute confusion matrix at the selected threshold
    if not hasattr(model, "predict_proba"):
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' does not support predict_proba")
    
    try:
        X_test, y_test = _load_test_data()
        y_prob = model.predict_proba(X_test)[:, 1]
        matrix = _get_confusion_matrix_at_threshold(y_test, y_prob, threshold)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing confusion matrix: {str(e)}")
    
    return {
        "model": model_name,
        "threshold": round(threshold, 4),
        "matrix": matrix,
        "labels": ["Good Outcome (0)", "At Risk (1)"],
    }


@router.get("/feature-importance")
def get_feature_importance():
    return {"importances": _FEATURE_IMPORTANCES}


@router.get("/dataset-summary")
def get_dataset_summary():
    return _DATASET_SUMMARY


@router.get("/pr-curves")
def get_pr_curves():
    return _PR_CURVES


@router.get("/calibration")
def get_calibration(
    model_name: str = Query("ebm_model"),
    n_bins: int = Query(10, ge=5, le=20),
):
    try:
        model = get_model(model_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if not hasattr(model, "predict_proba"):
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' does not support predict_proba")

    X_test, y_test = _load_test_data()
    y_prob = model.predict_proba(X_test)[:, 1]

    prob_true, prob_pred = calibration_curve(y_test, y_prob, n_bins=n_bins, strategy="quantile")
    mace = float(np.abs(prob_true - prob_pred).mean())

    return {
        "model": model_name,
        "n_bins": n_bins,
        "prob_pred": [round(float(v), 6) for v in prob_pred],
        "prob_true": [round(float(v), 6) for v in prob_true],
        "mean_absolute_error": round(mace, 6),
    }


@router.get("/threshold-analysis")
def get_threshold_analysis(
    selected_threshold: float = Query(0.8, ge=0.0, le=1.0),
    min_threshold: float = Query(0.1, ge=0.0, le=1.0),
    max_threshold: float = Query(0.9, ge=0.0, le=1.0),
    step: float = Query(0.05, gt=0.0, le=0.5),
):
    if min_threshold > max_threshold:
        raise HTTPException(status_code=400, detail="min_threshold must be <= max_threshold")

    thresholds = _make_thresholds(min_threshold, max_threshold, step, selected_threshold)
    X_test, y_test = _load_test_data()

    models_payload: dict[str, dict[str, list[float] | list[int]]] = {}
    at_threshold_payload: dict[str, dict] = {}

    for model_name in get_available_models():
        model = get_model(model_name)
        if not hasattr(model, "predict_proba"):
            continue

        try:
            y_prob = model.predict_proba(X_test)[:, 1]
        except Exception:
            continue

        precision_values: list[float] = []
        recall_values: list[float] = []
        f1_values: list[float] = []
        specificity_values: list[float] = []
        predicted_positive_values: list[int] = []

        for threshold in thresholds:
            metrics = _threshold_metrics(y_test, y_prob, threshold)
            precision_values.append(metrics["precision"])
            recall_values.append(metrics["recall"])
            f1_values.append(metrics["f1"])
            specificity_values.append(metrics["specificity"])
            predicted_positive_values.append(metrics["predicted_positive"])

        models_payload[model_name] = {
            "precision": precision_values,
            "recall": recall_values,
            "f1": f1_values,
            "specificity": specificity_values,
            "predicted_positive": predicted_positive_values,
        }
        at_threshold_payload[model_name] = _threshold_metrics(y_test, y_prob, selected_threshold)

    if not models_payload:
        raise HTTPException(status_code=503, detail="No probability-based models are currently available")

    return {
        "selected_threshold": round(selected_threshold, 4),
        "thresholds": thresholds,
        "models": models_payload,
        "at_threshold": at_threshold_payload,
    }
