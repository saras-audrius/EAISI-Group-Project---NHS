"""
Metrics router — serves pre-computed model performance data.
All metrics are sourced from notebook outputs (test set evaluation).

Target variable interpretation:
  Class 0 = Good outcome (OKS delta > 7, meaningful improvement)  — majority (82%)
  Class 1 = At risk / poor outcome (OKS delta ≤ 7)                — minority (18%)

Reported metrics below are for Class 1 (the clinically important minority class)
unless otherwise stated.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["metrics"])

# ---------------------------------------------------------------------------
# Pre-computed test set metrics from modelling_experiment.ipynb
# Precision/Recall/F1 = for Class 1 (at-risk patients)
# ---------------------------------------------------------------------------
_MODELS_META = [
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

# Confusion matrix for RF tuned on test set (26,477 samples)
# Class 0: 21,702 actual good outcomes; Class 1: 4,775 actual at-risk
_CONFUSION_MATRICES = {
    "random_forest_tuned": [[21365, 337], [4417, 358]],
    "lr_no_weights": [[21420, 282], [4392, 383]],
    "lr_lasso_l1": [[21418, 284], [4393, 382]],
    "lr_smote": [[21380, 322], [4384, 391]],
}

# RF feature importances (from notebook output — top features)
_FEATURE_IMPORTANCES = [
    {"feature": "OKS Total Score (Pre-op)", "importance": 0.1530},
    {"feature": "OKS Function Subscale", "importance": 0.1349},
    {"feature": "OKS ADL Subscale", "importance": 0.0691},
    {"feature": "OKS Pain (Pre-op)", "importance": 0.0463},
    {"feature": "OKS Pain Subscale", "importance": 0.0333},
    {"feature": "OKS Standing (Pre-op)", "importance": 0.0258},
    {"feature": "OKS Walking (Pre-op)", "importance": 0.0222},
    {"feature": "Comorbidity Count", "importance": 0.0205},
    {"feature": "OKS Confidence (Pre-op)", "importance": 0.0198},
    {"feature": "OKS Stairs (Pre-op)", "importance": 0.0181},
    {"feature": "EQ-5D Discomfort", "importance": 0.0172},
    {"feature": "OKS Shopping (Pre-op)", "importance": 0.0165},
    {"feature": "Age Band", "importance": 0.0148},
    {"feature": "EQ-5D Mobility", "importance": 0.0142},
    {"feature": "EQ-5D Anxiety", "importance": 0.0131},
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
    "years": "2016/17 – 2018/19",
    "procedure": "Knee Replacement",
}

# Precision-Recall curve data points (approximate, for visualisation)
_PR_CURVES = {
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


@router.get("/metrics")
def get_metrics():
    return {"models": _MODELS_META}


@router.get("/confusion-matrix/{model_name}")
def get_confusion_matrix(model_name: str):
    if model_name not in _CONFUSION_MATRICES:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    return {
        "model": model_name,
        "matrix": _CONFUSION_MATRICES[model_name],
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
