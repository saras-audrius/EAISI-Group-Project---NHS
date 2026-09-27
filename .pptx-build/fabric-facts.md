# Numbers pulled from Fabric (via `fab`, 18 Sept 2026)

Workspace `Healthcare-FabCon2026-Demo` · experiment `knee-poor-outcome` (35 runs) ·
model `knee-poor-outcome-ebm` v4 (champion) · gold.knee_features Delta **version 51**.

Pulled with:
    fab api -X post "workspaces/<ws>/mlflow/api/2.0/mlflow/runs/search" -i search.json
    fab api -X get  "workspaces/<ws>/mlflow/api/2.0/mlflow/registered-models/get?name=knee-poor-outcome-ebm"
Raw response kept in `fabric-runs.json`.

## Training session
| | |
|---|---|
| train / test | 103,986 / 25,997 (129,983 labelled episodes) |
| features | 59 |
| prevalence (no-skill average precision) | 0.1652 |
| poor outcomes in test | 4,295 of 25,997 |
| feature_set_version | v3 |

## Test-set metrics
| run | AP | ROC AUC | Brier | ECE | P@0.5 | R@0.5 | recall@80% precision |
|---|---|---|---|---|---|---|---|
| logistic_regression | 0.3737 | 0.7111 | 0.2124 | 0.2880 | 0.278 | 0.617 | 0.031 |
| random_forest | 0.3777 | 0.7076 | 0.2021 | 0.2775 | 0.310 | 0.517 | 0.052 |
| ebm | 0.3897 | 0.7155 | 0.1223 | 0.0042 | 0.666 | 0.103 | 0.058 |
| **ebm-calibrated (champion)** | 0.3888 | 0.7152 | 0.1224 | 0.0032 | 0.679 | 0.099 | 0.056 |
| xgboost (accuracy-ceiling reference, blackbox) | 0.3853 | 0.7129 | 0.2034 | 0.2729 | | | 0.060 |

## Threshold analysis
chosen threshold **0.6232** holding precision at 0.80 · recall 0.0559 ·
flagged 300 · false alarms 60 · missed 4,055 (on the 25,997 test patients).

## Explainability
EBM vs SHAP rank correlation 0.858 · 69 terms · 10 interactions.

## Batch scoring
2,230 pre-op patients scored · mean risk 0.166 · 4.84% high or above · model v4 champion.

## Still not pulled
Row counts and per-column missingness in gold — `fab` has no query command, so these
need a Spark/SQL-endpoint run or a notebook execution.
