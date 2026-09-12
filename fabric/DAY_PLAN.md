# Tomorrow — Tue 25 Aug 2026

**Goal for the day:** raw NHS PROMs → gold → registered model → scored cohort, all in
Fabric, end to end at least once. Rayfin app deployed if the morning goes well.

**Reality check on the schedule.** Your plan doc has Week 4 ending today with the Data
Agent nailed. The Fabric build is actually at Week 1. That is fine — the notebooks,
medallion design, and clinician app now exist, which was most of weeks 1–3 — but the
freeze date is **Sept 21**, four weeks out. Today is the day the pipeline either runs or
you find out what is broken. Treat everything below as blocking; treat Data Agent and
Fabric IQ as next week.

---

## Workspace layout (done)

```
Healthcare-FabCon2026-Demo/
├── 00_Platform              NHS_PROMs_LH, NHS_PROMs_Lakehouse, proms_ml_env
├── 10_Bronze_Ingestion      10_bronze_ingest
├── 20_Silver_Preprocessing  20_silver_clean
├── 30_Gold_Curation         30_gold_features
├── 40_MachineLearning       40_train_register, 50_batch_score
│                            (+ knee-poor-outcome experiment & model, after notebook 40)
├── 50_Delivery              60_sync_app_db
│                            (+ SQL DB & Fabric App, after `rayfin up`)
└── 90_Archive               the original 00–07 pandas notebooks and stray experiments
```

Re-run `python3 fabric/organize_workspace.py` after anything creates new items — it is
idempotent, and it reports anything left at the root rather than filing it silently.

Lakehouse storage stays as it is:

```
Files/data/external/      raw NHS data packs (bronze reads these)
Files/data/supporting/    ODS + academic category spreadsheets (silver reads these)
Files/data/cleaned/       the old pandas outputs — superseded, keep for comparison
Files/models/             the old .joblib models — break-glass fallback only
Tables/bronze|silver|gold Delta, created by the notebooks
```

---

## 08:30 — Start the environment build FIRST

`proms_ml_env` exists but is **empty**. Publishing takes 10–20 minutes and notebook 40
cannot run without it, so kick it off before anything else and let it build while you work.

1. Portal → `00_Platform` → **proms_ml_env** → *Public libraries*
2. Add:
   ```
   interpret>=0.6.0
   miceforest>=6.0.0
   shap>=0.44.0
   ```
3. **Publish**
4. While it publishes: Workspace settings → *Data Engineering/Science* → *Spark settings*
   → default environment = `proms_ml_env`; also turn on **high concurrency** so notebooks
   share one session instead of paying cold start three times

**Test:** when it reports published, open any notebook and run
`import interpret, miceforest, shap; print(interpret.__version__)`. Do not move on until
that works — everything after 30 depends on it.

---

## 09:00 — Notebook 10, bronze

Run cell by cell the first time.

**Expected:** ~250–300k raw rows across three years, 79 columns, all `string`.

**Test before moving on:**
```sql
SELECT Year, COUNT(*) FROM bronze.knee_provider GROUP BY Year ORDER BY Year
DESCRIBE HISTORY bronze.knee_provider
```
- three years present, none with a wildly different count
- the duplicate-hash assertion in §7 passes
- `DESCRIBE HISTORY` shows one `WRITE` with a row count

**Also test idempotency — this is a claim you will make on stage.** Run the whole notebook
a second time. Row count must be **identical**. If it doubles, the MERGE is not matching and
that is a bug to fix now, not in September.

**Most likely failure:** the CSV glob finds nothing, because the data packs are laid out
differently under `Files/data/external` than the pattern expects.

```python
# Diagnose:
import glob
print(glob.glob("/lakehouse/default/Files/data/external/**/*.csv", recursive=True)[:10])
print(glob.glob("/lakehouse/default/Files/data/external/**/*.zip", recursive=True)[:10])
```
Then widen `LANDING_ROOT` or the glob in §3 to match what you actually see. Run the unzip
cell in §2 first if only zips come back.

---

## 10:00 — Notebook 20, silver

**Expected:** ~90%+ retention from bronze; missingness report resembling the original
analysis (`age_band` and `gender` missing together, symptom/mobility items in single digits).

**Test:**
```sql
-- Comorbidity decode: 9 must have become 0, NOT null.
SELECT heart_disease, COUNT(*) FROM silver.knee_episode GROUP BY heart_disease;
-- expect only 0, 1 and a small NULL count. Any 9 means the decode did not fire.

-- Sentinel decode elsewhere: 9 must be gone.
SELECT COUNT(*) FROM silver.knee_episode WHERE t0_mobility = 9;   -- expect 0

-- Disclosure-control markers gone.
SELECT COUNT(*) FROM silver.knee_episode WHERE age_band = '*';    -- expect 0

-- Key uniqueness (also asserted in the notebook).
SELECT COUNT(*), COUNT(DISTINCT episode_id) FROM silver.knee_episode;
```

**Cross-check against the old pipeline.** You have `Files/data/cleaned/knee-provider-cleaned.parquet`
from the pandas run. Compare row counts:

```python
old = spark.read.parquet("Files/data/cleaned/knee-provider-cleaned.parquet")
new = spark.table("silver.knee_episode")
print(old.count(), new.count())
```
They will not match exactly — the old one is knee-provider only and may cover different
years — but they should be the same order of magnitude. A 10× gap means the glob in
notebook 10 picked up hip data or duplicate files.

**Likely failure:** the two `.xlsx` reads in §6. Check the exact filenames — one has spaces
(`ODS Advanced Search 2.xlsx`) and the column names must be `provider_code`, `category`,
`Dataset`, `Primary Role Name`, `Region`.

---

## 10:45 — Notebook 30, gold

**Expected:** poor-outcome rate ≈ 20%. A meaningful population of unlabelled (pre-op) rows
for the cohort table.

**Test:**
```sql
SELECT outcome_label, COUNT(*) FROM gold.knee_features GROUP BY outcome_label;
SELECT COUNT(*) FROM gold.knee_preop_cohort;
```
- poor-outcome rate between 15% and 30%. Outside that, the MCID threshold or the delta sign
  is wrong — check `oks_delta` is `t1 - t0` and not the reverse
- the pre-op cohort has at least a few hundred rows. If it is empty, every episode has
  follow-up and you will need to synthesise the cohort instead — tell me and I will adjust
  the notebook

**Then run §9, the lineage query.** It joins gold → silver → bronze → source file in one
statement. If it returns rows, your segment-2 lineage claim is true. If it errors, the join
keys drifted and that is worth fixing today.

**⚠️ WRITE DOWN `MARGARET_EPISODE_ID`.** Section 8 prints it. Everything on stage points at
this one id — put it in the run-of-show doc, not just in a notebook output that a re-run
will overwrite.

Also note the gold Delta version — `DESCRIBE HISTORY gold.knee_features` — because notebook
40 tags the model with it.

---

## 11:30 — Notebook 40, train and register

Needs the environment from 08:30. **Slowest notebook of the day** — MICE with five
iterations plus an EBM with eight outer bags. Budget 20–40 minutes.

**Test:**
- both leakage guards in §3 pass (they assert, so a pass is silent)
- all three candidates beat the prevalence baseline printed in §6
- EBM average precision ≥ random forest, or close. If the RF wins clearly, say so on stage
  and keep the EBM anyway for interpretability — that is a more honest story than hiding it
- calibration improves `brier_score` **and** `ece`, while `average_precision` stays
  essentially unchanged. That contrast is the segment-4 money shot; screenshot the numbers
- all four deployment gates pass
- `@champion` alias exists

```python
from mlflow import MlflowClient
c = MlflowClient()
mv = c.get_model_version_by_alias("knee-poor-outcome-ebm", "champion")
print(mv.version, mv.tags)
```

**Watch for:** if MICE takes more than ~15 minutes, drop `mice_iterations` to 3 for
iteration and put it back to 5 for the final run. Note the change if you do — the model card
should say which was used.

**Likely failure:** `miceforest` version drift. The 6.x API is
`mf.ImputationKernel(data=..., random_state=...)` then `.mice(iterations=...)`. Older 5.x
wants `datasets=1` and different kwargs. If it errors on construction, print
`miceforest.__version__` and send it to me.

---

## 13:30 — Notebook 50, score the cohort

**Test:**
```sql
SELECT risk_band, COUNT(*) FROM gold.patient_risk GROUP BY risk_band;
SELECT COUNT(*) FROM gold.risk_explanation;   -- expect 6 × patients
```
- risk bands are spread, not all in one bucket. Everything in `low` usually means the
  probability polarity flipped — check `predict_proba(...)[:, 1]` is the poor outcome
- the EBM path was used, not the SHAP fallback. §3 prints which; you want *"Using EBM
  additive term contributions"*
- §7 returns Margaret's score and six named drivers, and the drivers are **clinically
  plausible** — a low pre-op OKS should increase risk, not reduce it. If the signs look
  inverted, stop; that is a demo-killer

**Run §8, the three rehearsal queries.** These are the Data Agent questions in SQL form. If
any of them is awkward to write, the agent will get it wrong next week — better to learn
that now.

---

## 14:30 — Rayfin app

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version                     # must be v24.x — Rayfin refuses 25
cd fabric/rayfin-clinician-app
npm run dev:offline                # sanity: UI works before touching Fabric
```

**Test offline first:** cohort list renders, Margaret Hughes is there, clicking her shows
the risk badge and six diverging bars, the decision form saves and shows a confirmation.
Two minutes, and it separates "my UI is broken" from "my deployment is broken".

Then deploy:

```bash
npx rayfin login
npx rayfin up --dry-run --workspace "Healthcare-FabCon2026-Demo"    # preview first
npx rayfin up --workspace "Healthcare-FabCon2026-Demo"
```

**Test:**
- it provisions without prompting for anything you cannot grant — if it needs an Entra app
  registration you lack rights for, that is a **Week 0 blocker resurfacing**; escalate today
- note the SQL server, database name, and publishable key it prints
- the static hosting URL loads and shows the Entra sign-in

Then wire the data:
1. Get two Entra object ids: `az ad user show --id you@... --query id -o tsv`
2. Put them in `CLINICIAN_ASSIGNMENTS` in notebook 60, with two different provider codes
3. Set `SQL_SERVER` / `SQL_DATABASE` in notebook 60 from what `rayfin up` printed
4. Run notebook 60

**Test the security claim — this is hero moment ★3a:**
- sign in as clinician A → note the patient count
- sign in as clinician B → different patients, different count
- open devtools on A's session, edit the GraphQL query to drop any filter, re-send → still
  only A's patients

That last one is the demo. Rehearse doing it smoothly.

**Then re-run `python3 fabric/organize_workspace.py`** to file the new SQL DB and Fabric App
items into `50_Delivery`.

---

## End of day — commit

```bash
git checkout -b fabric-pipeline
git add fabric/
git commit -m "Add Fabric medallion pipeline, MLflow training, and Rayfin clinician app"
```

Nothing in `fabric/` is committed yet. Do this before you close the laptop.

---

## Test summary — one line each

| # | Test | Pass condition |
|---|---|---|
| 1 | Environment publishes | `import interpret, miceforest, shap` works |
| 2 | Bronze row count | 3 years present, plausible counts |
| 3 | Bronze idempotency | second run → identical row count |
| 4 | Silver comorbidity decode | `heart_disease` ∈ {0, 1, NULL}, no 9 |
| 5 | Silver sentinel decode | `t0_mobility = 9` returns 0 rows |
| 6 | Silver key uniqueness | `COUNT(*) = COUNT(DISTINCT episode_id)` |
| 7 | Gold class balance | poor-outcome rate 15–30% |
| 8 | Gold pre-op cohort | non-empty |
| 9 | Lineage join | gold→silver→bronze→source file returns rows |
| 10 | Margaret pinned | episode id written down outside the notebook |
| 11 | Leakage guards | both assertions pass |
| 12 | Models beat baseline | AP > prevalence for all three |
| 13 | Calibration works | Brier ↓, ECE ↓, AP ~flat |
| 14 | Deployment gates | all four pass |
| 15 | Champion alias | resolves to the new version |
| 16 | Risk band spread | not all one band |
| 17 | EBM explanations | EBM path used, not SHAP fallback |
| 18 | Margaret's drivers | clinically plausible signs |
| 19 | Agent queries | all three §8 queries return sensible rows |
| 20 | App offline | cohort + detail + decision form all work |
| 21 | `rayfin up` | provisions without a permissions blocker |
| 22 | RLS holds | two clinicians see different lists |
| 23 | RLS holds under attack | devtools query rewrite changes nothing |

---

## If the day runs short

Cut in this order:

1. **Rayfin deployment** — the offline app is a legitimate fallback and the session plan
   already treats the old webapp as break-glass. Push to Wednesday.
2. **Notebook 10 raw ingest** — use the migration shortcut in `MEDALLION.md` to seed silver
   straight from `knee-provider-cleaned.parquet`, and backfill bronze later. You lose the
   lineage demo temporarily, not the pipeline.

Do **not** cut notebooks 30, 40, 50. They are the spine, and every later segment depends on
gold existing and the model being registered.

## Not tomorrow

- Real-time endpoint (segment 5) — Wednesday
- Fabric IQ + Data Agent (segment 7) — later this week; §8 of notebook 50 is the prep
- Sensitivity labels end to end
- Recorded fallback clips
- Model card update
