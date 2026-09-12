# Fabric build — FabCon 2026 "From Notebook to Bedside"

Workspace: **`Healthcare-FabCon2026-Demo`** — `1b136d57-daff-4d47-85f6-a2cfcd405736`
Lakehouse: **`NHS_PROMs_LH`** — `039ff306-3acb-437b-8596-fc1d3dc85c96` (schema-enabled; Delta tables)
File store: **`NHS_PROMs_Lakehouse`** — `ed23a042-6382-4d11-8514-236983db832e` (raw Files, shortcut-ed into the above)
Environment: **`proms_ml_env`** — `60ae20f7-1039-4843-9b23-49e772893270`

What lives here:

```
fabric/
├── DAY_PLAN.md               tomorrow's tasks and the 23-point test checklist
├── MEDALLION.md              bronze/silver/gold design + the parquet-vs-Delta answer
├── MLFLOW.md                 what to log and tag, and why
├── deploy_notebooks.sh       import notebooks/*.ipynb into the workspace
├── organize_workspace.py     create workspace folders and file items into them
├── notebooks/                ten Fabric notebooks
│   ├── 10_bronze_ingest      raw NHS PROMs CSV → bronze Delta          [PySpark]
│   ├── 20_silver_clean       renamed, typed, sentinels decoded         [PySpark]
│   ├── 30_gold_features      model-ready gold + pre-op cohort          [PySpark]
│   ├── 31_data_exploration   missingness, imbalance, MCID    seg 3     [read-only]
│   ├── 40_train_register     MLflow tracking → registered model        [Spark read, Python fit]
│   ├── 41_model_search       hyperparameter search, full field         [slow, occasional]
│   ├── 42_threshold_analysis operating point + subgroups     seg 3/4   [on demand]
│   ├── 43_explainability     EBM shapes + SHAP contrast      seg 4 ★1  [on demand]
│   ├── 50_batch_score        score cohort + explanations → gold        [Spark + Python]
│   └── 60_sync_app_db        gold Delta → SQL database in Fabric       [PySpark]
└── rayfin-clinician-app/     the governed clinician app (Rayfin + React)
```

## Workspace layout

```
Healthcare-FabCon2026-Demo/
├── 00_Platform              NHS_PROMs_LH, NHS_PROMs_Lakehouse, proms_ml_env
├── 10_Bronze_Ingestion      10_bronze_ingest
├── 20_Silver_Preprocessing  20_silver_clean
├── 30_Gold_Curation         30_gold_features
├── 35_Exploration           31_data_exploration
├── 40_MachineLearning       40–43, 50_batch_score, experiment, model
├── 50_Delivery              60_sync_app_db, SQL DB, Fabric App
└── 90_Archive               the original 00-07 pandas notebooks and stray experiments
```

Maintained by `organize_workspace.py`. It is idempotent — re-run it whenever something
creates new items (notebook 40 creates the experiment and model, `rayfin up` creates the
SQL database and app), and it reports anything left at the root rather than filing it
silently.

Lakehouse storage:

```
Files/data/external/      raw NHS data packs      (bronze reads these)
Files/data/supporting/    ODS + academic .xlsx    (silver reads these)
Files/data/cleaned/       old pandas outputs      (superseded; keep for comparison)
Files/models/             old .joblib models      (break-glass fallback only)
Tables/bronze|silver|gold Delta, created by the notebooks
Tables/ml                 model-internal split + encoded matrices (not a shared contract)
```

---

## Tooling

### Fabric CLI

```bash
# Needs Python 3.10-3.12. pipx keeps it out of your notebook environment.
brew install pipx && pipx ensurepath
pipx install ms-fabric-cli --python python3.12

fab auth login
fab config set mode command

# Sanity check
fab ls
fab ls Healthcare-FabCon2026-Demo.Workspace
```

> On this machine `python3` is 3.14, which has no wheel for the current
> `ms-fabric-cli`. Pinning 3.12 with pipx avoids silently installing a two-year-old
> version.

Useful once you are in:

```bash
fab ls    Healthcare-FabCon2026-Demo.Workspace
fab get   Healthcare-FabCon2026-Demo.Workspace/NHS_PROMs_LH.Lakehouse
./fabric/deploy_notebooks.sh                      # import all six
./fabric/deploy_notebooks.sh 40_train_register    # or just one
```

### Node — required for Rayfin

**The Rayfin CLI does not support Node 25**, which is what is currently on this machine.
Engines: `>=20 <21 || >=22 <23 || >=24 <25`.

```bash
brew install node@24
# temporary, per shell:
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version    # expect v24.x
```

Do not `brew link --overwrite node@24` unless you want it globally — the `PATH` export
per shell is enough and leaves your other projects on 25.

---

## Run order

### 1. Data — already uploaded

The Lakehouse is **`NHS_PROMs_Lakehouse`** and already holds everything the notebooks need:

```
Files/data/external/data-pack-2016-17 | 2017-18 | 2018-19   raw NHS PROMs zips
Files/data/supporting/*.xlsx                               ODS registry + academic categories
Files/data/cleaned/*.parquet                               the old pandas outputs (superseded)
Files/models/*.joblib                                      the old models (break-glass only)
```

To refresh any of it:

```bash
fab cp ./data/supporting "Healthcare-FabCon2026-Demo.Workspace/NHS_PROMs_LH.Lakehouse/Files/data/supporting" -r
```

### 2. Import and run the notebooks

```bash
./fabric/deploy_notebooks.sh
```

This builds the `<name>.Notebook/` item directories `fab import` requires (a bare `.ipynb`
is rejected with `[InvalidInput]`), binds `NHS_PROMs_Lakehouse` as the default lakehouse so
`Files/...` resolves on first run, and imports all six. Then run them in order.

| Notebook | What to check before moving on |
|---|---|
| 10 | `DESCRIBE HISTORY bronze.knee_provider` returns rows; the duplicate assertion passes |
| 20 | `silver.knee_episode` retention is ~90%+; the missingness report looks like the original analysis |
| 30 | poor-outcome rate ≈ 20%; **write down the `MARGARET_EPISODE_ID` it prints** |
| 31 | exploration runs; note the non-responder count in §5 |
| 40 | all four deployment gates pass; `@champion` alias points at the new version |
| 41 | optional, slow — run when features change, not every time |
| 42 | threshold recorded on the model version; check the subgroup table in §7 |
| 43 | EBM/SHAP rank correlation printed; Margaret's contributions sum to her score |
| 50 | risk-band distribution is not degenerate; the Margaret query returns a score and six drivers |
| 60 | every patient has a clinician assignment |

**Spark pool sizing:** these notebooks are small (10⁵ rows). A starter pool is plenty and
starts in seconds; a large pool just adds cold-start time you will feel on stage. Enable
the **high-concurrency** session so notebooks 40–60 share one Spark session instead of
paying start-up three times.

**Notebook 40 needs packages** the default runtime does not ship. The environment item
`proms_ml_env.Environment` already exists in the workspace but is **empty** — adding
libraries to it requires a multipart upload the CLI cannot do, so finish it in the portal:

1. Open **proms_ml_env** → *Public libraries*
2. Add, or upload a `requirements.txt` containing:
   ```
   interpret==0.7.8
   miceforest==6.0.5
   shap==0.49.1
   ```

   **Pin these exact versions.** The Fabric Spark 3.5 runtime is Python 3.10, and
   `shap` 0.50+ requires Python 3.11+ — an unpinned or newer `shap` fails the
   environment publish with `No matching distribution found`. 0.49.1 is the ceiling
   for Python 3.10.
3. **Publish**, and wait — this takes 10-20 minutes the first time
4. Workspace settings → *Data Engineering/Science* → *Spark settings* → set
   `proms_ml_env` as the default environment, so all six notebooks inherit it

Do this **first**, before running anything. Publishing is the long pole and it is
infuriating to discover at notebook 40.

### 3. Deploy the clinician app

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
cd fabric/rayfin-clinician-app

npm install
npx rayfin login
npx rayfin up --workspace "Healthcare-FabCon2026-Demo"
```

`rayfin up` provisions a SQL database in Fabric from the entity classes in `rayfin/data/`,
generates the Data API Builder config including the row-level security policies, wires up
Entra sign-in, and deploys the built frontend to static hosting.

Then re-run notebook 60 with the SQL connection details it printed, and the app has data.

See `rayfin-clinician-app/README.md` for the offline mode, the RBAC model, and the
break-glass fallback.

---

## On "make everything PySpark"

Notebooks 10, 20, 30 and 60 are PySpark end to end — that is where Spark earns its keep.

Notebooks 40 and 50 read gold with Spark and then do the maths in pandas on the driver, and
that is a deliberate engineering decision rather than unfinished work:

- the labelled cohort is ~10⁵ rows × ~60 features. It fits in driver memory comfortably;
  distributing it would add shuffle cost to a workload that has none.
- **Explainable Boosting Machines have no Spark ML equivalent.** Neither does SHAP, nor
  `miceforest`. The interpretability requirement the EU AI Act imposes on high-risk clinical
  decision support is precisely what rules out the distributed algorithms.
- SynapseML's `LightGBMClassifier` would distribute — and would hand you a black box you
  could not defend to a regulator.

**Spark where the data is big, Python where the maths has to be interpretable.** Saying that
out loud in segment 4 is a stronger technical position than pretending everything is a Spark
job, and a Level 300 audience will respect it more.

---

## Mapping to the session run-of-show

| Segment | Artefact |
|---|---|
| 2 — Lakehouse ingestion | notebooks 10–30; `DESCRIBE HISTORY` and the lineage join in 30 §9 |
| 3 — Missing data & imbalance | notebook 20 §7 (missingness), notebook 40 §6 (PR-curve rationale) |
| 4 — EBM + SHAP ★1 | notebook 40 §7–8 (candidates, calibration); the existing `07_ebm_explainability` |
| 5 — Real-time endpoint ★2 | notebook 40 §9 registration; deploy the endpoint from the ML model item |
| 6 — Governed delivery ★3a | `rayfin-clinician-app/` |
| 7 — Data Agent + IQ ★3b | `gold.patient_risk` + `gold.risk_explanation`; rehearsal SQL in notebook 50 §8 |
| 8 — Close | `MEDALLION.md` diagram + the lineage graph |

## Pipeline vs. presentation notebooks

Two cadences, deliberately separated:

| Runs every pipeline execution | Runs occasionally, by hand |
|---|---|
| 10, 20, 30, 50, 60 | 31, 41, 42, 43 |
| automated, no human | exploratory or presented |

`40_train_register` sits in both camps: it is the production training path, and it writes
`ml.train_matrix` / `ml.test_matrix` so that 41–43 all analyse the *same* split. Never
re-split inside those notebooks — different folds make the comparisons meaningless.

**Triggered inference does not need its own notebook.** Set `INCREMENTAL = True` in
`50_batch_score` and put a Data Pipeline in front of it (`10 → 20 → 30 → 50`, with success
dependencies). Single-patient interactive scoring is the *only* case that needs a different
runtime — a Spark session start is far too slow for a clinician waiting on one score, so
that is the real-time endpoint in segment 5. Both bind to `@champion`, so they cannot
disagree about which model is live.

## Still to build

- Real-time endpoint deployment from the registered model (segment 5)
- Fabric IQ semantic layer + Data Agent configuration (segment 7)
- Sensitivity labels applied and verified end to end
- Recorded fallback clips for ★1–★3
