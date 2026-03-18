"""Model loading utilities with caching."""
import joblib
from pathlib import Path

# Project root is two levels above this file (webapp/backend/services/ -> project root)
_PROJECT_ROOT = Path(__file__).parent.parent.parent.parent

_MODELS_DIR = _PROJECT_ROOT / "models"

_MODEL_FILES = {
    "random_forest_tuned": "random_forest_tuned.joblib",
    "lr_no_weights": "lr_no_weights.joblib",
    "lr_lasso_l1": "lr_lasso_l1.joblib",
    "lr_smote": "lr_smote.joblib",
}

_models: dict = {}


def load_all_models() -> dict:
    """Load all saved models at startup. Returns dict of {name: model}."""
    global _models
    for name, filename in _MODEL_FILES.items():
        path = _MODELS_DIR / filename
        if path.exists():
            try:
                _models[name] = joblib.load(path)
                print(f"[model_loader] Loaded: {name} from {path}")
            except Exception as e:
                print(f"[model_loader] Failed to load {name}: {e}")
        else:
            print(f"[model_loader] File not found: {path}")
    return _models


def get_model(name: str):
    """Return a loaded model by name."""
    if name not in _models:
        raise ValueError(f"Model '{name}' not loaded. Available: {list(_models.keys())}")
    return _models[name]


def get_available_models() -> list[str]:
    return list(_models.keys())
