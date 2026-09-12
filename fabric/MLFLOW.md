# MLflow in Fabric — what to log, what to tag, and why

Implemented in `notebooks/40_train_register.ipynb`. This page is the reasoning behind it.

## The three-way split

Getting this wrong is the most common reason an experiment UI becomes unusable after four
weeks of iteration.

| Use | For | Mutable? |
|---|---|---|
| `log_param` | hyperparameters, dataset sizes — anything numeric you compare across runs | no |
| `log_metric` | anything you would plot | append-only |
| `set_tag` | descriptive facts you filter and search on | **yes** |

Tags being mutable is exactly why **approval status is a tag**. A training run cannot know
whether a clinician will approve it; `approved_by` starts empty and is set later, without
re-running anything.

## Turn autologging off

```python
mlflow.autolog(disable=True)
```

Fabric enables autologging by default and it is the wrong default here. It logs
accuracy-first metrics for a problem where accuracy is actively misleading, and it fires on
every internal `fit` inside `GridSearchCV` — burying the six runs you care about under two
hundred you do not. Log explicitly.

## The tagging scheme

Four groups, each answering a different question.

### Identity — what is this run?

| Tag | Values | Why |
|---|---|---|
| `model_family` | `ebm`, `random_forest`, `logistic_regression` | The first thing you filter on. |
| `model_role` | `baseline`, `candidate`, `challenger`, `champion` | Separates the model you intend to ship from the one you keep for on-stage contrast. Without it, six runs look equally important six weeks later. |
| `interpretability` | `glassbox`, `post_hoc_shap`, `blackbox` | Under the AI Act this is a **deployment gate**, not a property. Make it queryable and you can answer "show me every black-box model anyone trained" in one call. |
| `calibrated` | `true` / `false` | An uncalibrated probability must never reach a clinician. |
| `run_type` | `training_session`, `candidate`, `release_candidate`, `batch_inference` | Lets you filter the parent/child hierarchy. |

### Data — what was it trained on?

| Tag | Why |
|---|---|
| `gold_table`, `gold_table_version` | The Delta version. Turns "trained on gold" into "trained on gold as of version 7", which time travel can reconstruct exactly. **This is the one an auditor will actually ask for.** |
| `feature_set_version` | Bump when the feature list changes. Without it, two runs with different features look comparable and are not. |
| `target_definition` | `oks_delta<=7`. The label rule is a clinical decision — encode it where a clinician can read it, not only in a notebook cell. |
| `cohort` | `knee_provider_nhs_proms_2016_2019`. |

### Governance — may we deploy it?

| Tag | Why |
|---|---|
| `intended_use` | `preop_risk_triage_decision_support`. The AI Act's intended-purpose declaration, attached to the artefact rather than to a Word document. |
| `risk_class` | `high_risk_eu_ai_act`. |
| `human_oversight` | `clinician_in_the_loop`. |
| `phi` | `false` — records are de-identified. States the data-protection posture explicitly rather than leaving it to be assumed. |
| `model_card` | Path or link to the model card for this version. |
| `approved_by`, `approved_on` | Set **after** review, never by the training run. Starts at the sentinel `"pending"` — **not** `""`, because Fabric's registry rejects empty tag values with `BAD_REQUEST: Invalid tag value`. `tags.approved_by = 'pending'` is the deployment-blocker query. |
| `gate_status` | `passed` / `failed`, written by the automated gate. |

### Provenance — can we rebuild it?

`git_sha`, `notebook`, `run_by`, `fabric_workspace`.

`git_sha` is the one people skip and the one auditors ask for. Fabric notebooks are not a
git checkout unless the workspace is git-synced, so the helper in notebook 40 degrades to
`"unknown"` rather than failing — but sync the workspace and it will be real.

## Metrics: what to log for an imbalanced clinical problem

Roughly one patient in five has a poor outcome. A model that predicts "good outcome" for
everybody scores ~80% accuracy and identifies nobody who needs pre-operative optimisation.

| Metric | Role |
|---|---|
| `average_precision` | **Model-selection metric, not a clinical one.** Area under the PR curve — a summary of *ranking quality*, which is what you compare before a threshold exists. Never show it to a clinician: "AP 0.40" answers no question they have. It also averages over parts of the curve nobody would deploy at, which is a real limitation. |
| `baseline_average_precision` | The prevalence. Log it on the parent run so every AP has something to be judged against — an AP of 0.31 is meaningless until you know the baseline is 0.20. |
| `roc_auc` | Secondary. Optimistic under class imbalance; keep it for comparability with the literature, do not lead with it. |
| `brier_score` | Probability accuracy. Falls when calibration improves. |
| `ece` | Expected calibration error — mean gap between predicted probability and observed frequency. This is the number that says whether "34%" means 34%. |
| `recall_at_p80` | Operating-point metric: how many poor outcomes do we catch while holding precision at 80%? The one a clinical service actually cares about. |
| `threshold_for_p80` | The threshold that achieves it. Log it, because the app needs it. |

### Which metric leads, and for whom

Three different audiences, three different numbers. Conflating them causes most of the
arguments about this:

| Question | Metric | Audience |
|---|---|---|
| Which candidate model do we take forward? | `average_precision` (ranking quality) | the modeller |
| Should this be deployed at all, and at what threshold? | **decision curve analysis** — net benefit vs threshold (notebook 42 §7b) | the clinical team |
| What does next Tuesday look like? | `precision_at_k` and **NNE = 1/precision** at the service's real capacity (§7c) | the service manager |

**Precision alone must never be the selection metric.** It is maximised by a model that
flags almost nobody: flag 100 patients, get 90 right, score 0.90 — and leave 4,200 people
unwarned. Report precision always, alongside recall at the chosen threshold. Optimise on it
never. This is the one real defect in the original notebooks: `RandomizedSearchCV(scoring='precision')`.

**The threshold encodes the harm ratio.** Choosing threshold `p` states that a false positive
is `p/(1-p)` times as costly as a false negative — 0.8 declares 4:1. Decision curve analysis
makes that explicit and testable instead of implicit and arguable.

**Why two calibration metrics?** Brier is a proper scoring rule but blends calibration with
discrimination. ECE isolates calibration alone. Log both — after isotonic regression you
want to show `average_precision` unchanged (calibration is monotone, so ranking cannot
change) while `brier_score` and `ece` both improve. That contrast is the demo.

## Run structure

```
training-session                     (parent — one per training pass)
├── logistic_regression              (child — the honest floor)
├── random_forest                    (child — the black-box contrast)
└── ebm                              (child — the glassbox candidate)

ebm-calibrated                       (top-level — the release candidate)
batch-scoring                        (top-level — one per scoring pass)
```

Nesting keeps the experiment UI readable: collapse the parent to compare sessions, expand
it to compare models within one. The calibrated run sits at the top level because it is the
artefact that ships, and it should not need expanding to find.

## Registering: `log_model` vs. `register_model`

- `mlflow.sklearn.log_model(...)` records an **experiment artifact**. Useful, not
  deployable.
- `mlflow.register_model(...)` promotes it to a **Fabric ML model item** — a versioned,
  permissioned object in the workspace with its own lineage. This is what the endpoint and
  the app bind to.

That distinction is the "no `model.pkl` emailed around" line: the app references
`models:/knee-poor-outcome-ebm@champion` and never a file path.

### Always log a signature

```python
signature = mlflow.models.infer_signature(X_train, y_pred)
mlflow.sklearn.log_model(model, name="model", signature=signature)
```

Without a signature the endpoint accepts whatever it is given and fails at inference with a
shape error. With one, it rejects malformed input at the boundary and tells you which column
is wrong. Cheap insurance for a live demo.

### Log the preprocessor as an artifact

The MICE kernel and the one-hot encoder are fitted on training data. At serving time the
endpoint gets a *gold-shaped* row and has to reproduce that transform exactly. Logging the
fitted object alongside the model — rather than re-deriving it in the app — is what
guarantees training and serving agree. Notebook 40 writes it to `preprocessing/`; notebook
50 downloads it by run id.

### Aliases would be right — but Fabric does not implement them

In OSS MLflow the champion pointer is an alias:

```python
client.set_registered_model_alias(name, "champion", version)      # 404 on Fabric
model = mlflow.sklearn.load_model("models:/name@champion")        # 404 on Fabric
```

**Fabric's managed registry does not expose the alias endpoints** —
`/api/2.0/mlflow/registered-models/alias` returns 404. Version *tags* do work, so the
pointer is a tag: exactly one version carries `champion="true"`, and promotion demotes the
previous holder.

`promote_to_champion()` in notebook 40 and `resolve_champion()` in 42/43/50 both attempt the
alias first and fall back to the tag, so the code stays correct if Fabric adds support.

Load by explicit version instead: `mlflow.sklearn.load_model(f"models:/{name}/{version}")`.

### Version-level tags

Run tags describe the *experiment*. Version tags describe the *artefact*, and they are what
a deployment gate reads. Notebook 40 mirrors the governance tags onto the model version and
adds the headline metrics, so a reviewer can see AP and ECE in the model list without
opening a run.

## The deployment gate

The last cell of a training notebook should be able to say no:

```python
GATES = {
    "beats prevalence baseline by 1.3x": m_cal["average_precision"] >= BASELINE_AP * 1.3,
    "calibration error under 5%":        m_cal["ece"] <= 0.05,
    "recall at 80% precision above 5%":  m_cal["recall_at_p80"] >= 0.05,
    "interpretable model family":        True,
}
```

Automated gates are necessary, not sufficient. `approved_by` stays empty until a named
clinician signs off — that is the human-oversight requirement, and it is deliberately not
something the notebook can grant itself.

## Queries worth rehearsing

```python
# Everything deployable, best first
mlflow.search_runs(
    experiment_names=["knee-poor-outcome"],
    filter_string="tags.risk_class = 'high_risk_eu_ai_act' and tags.calibrated = 'true'",
    order_by=["metrics.average_precision DESC"],
)

# Anything black-box that anyone trained
mlflow.search_runs(
    experiment_names=["knee-poor-outcome"],
    filter_string="tags.interpretability = 'blackbox'",
)

# Release candidates still awaiting clinical sign-off
mlflow.search_runs(
    experiment_names=["knee-poor-outcome"],
    filter_string="tags.run_type = 'release_candidate' and tags.approved_by = ''",
)
```

Running the third one on stage is a stronger governance demo than any slide about
governance. It is the registry refusing to let something through.

## Fabric specifics

- `mlflow.set_experiment("name")` creates the experiment as a **workspace item**. It
  inherits workspace permissions and sensitivity labels — no extra tracking server, no
  extra credential.
- Registered models appear as **ML model items**, with their own lineage view.
- `mlflow.get_tracking_uri()` returns the Fabric-managed endpoint. Do not override it.
- Artifacts land in OneLake, inside the workspace. Nothing leaves the estate — which is the
  entire argument of the session.
