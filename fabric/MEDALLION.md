# Medallion design for NHS PROMs knee replacement

## The short answer on parquet vs. Delta

**Your parquet files work — for reading. They will not carry this demo.**

Fabric can read `data/cleaned/*.parquet` from `Files/` in a Lakehouse today, and nothing
breaks. But four things you need for a governed clinical pipeline are simply not
properties of parquet:

| What you need | Parquet | Delta |
|---|---|---|
| A Lakehouse **table** (visible in the SQL analytics endpoint, queryable from Power BI, addressable by the Data Agent) | ✗ — files only | ✓ |
| **Time travel** — "show me the data as it stood when this model was trained" | ✗ | ✓ `VERSION AS OF` |
| **Audit history** — who wrote what, when, how many rows | ✗ | ✓ `DESCRIBE HISTORY` |
| **ACID** — a failed job leaves no half-written table | ✗ | ✓ |
| **MERGE / upsert** — idempotent re-runs | ✗ (rewrite everything) | ✓ |
| **Direct Lake** in Power BI — no import, no refresh | ✗ | ✓ |

Under the EU AI Act, record-keeping is an obligation. Time travel is the cheapest possible
way to satisfy it: `gold_table_version` is logged as an MLflow tag at training time, and
`SELECT * FROM gold.knee_features VERSION AS OF 7` reconstructs the exact training input
months later. A folder of parquet files cannot answer that question at all.

**So:** keep raw supplier drops as files in `Files/data/external/` (they are files — that is
correct), and make every *table* Delta. In a Fabric Lakehouse anything you write to
`Tables/` is Delta anyway, so this mostly means using `saveAsTable` instead of
`write.parquet`.

One nuance worth knowing: Delta *is* parquet, plus a transaction log. You are not
converting to a different storage format — you are adding the metadata layer that turns a
pile of files into a table. Nothing about your existing files is wasted.

---

## Layer design

```
Files/data/external/**/*.csv        raw supplier drops (files, not tables)
        │
        ▼  10_bronze_ingest
bronze.knee_provider                append-only, all strings, ingest metadata
        │
        ▼  20_silver_clean
silver.knee_episode                 typed, renamed, sentinels decoded, cohort applied
silver.provider                     provider dimension (ODS + academic status)
        │
        ▼  30_gold_features
gold.knee_features                  model-ready, human-readable, one row per episode
gold.knee_preop_cohort              patients awaiting surgery — the app's inbox
        │
        ▼  40_train_register  ──────►  MLflow experiment + registered model
        ▼  50_batch_score
gold.patient_risk                   calibrated score per pre-op patient
gold.risk_explanation               six ranked contributions per patient
        │
        ▼  60_sync_app_db
SQL database in Fabric              what the Rayfin clinician app reads and writes
```

### Bronze — `bronze.knee_provider`

**Rule: never fix anything in bronze.**

Supplier column names (`Knee Replacement Pre-Op Q Score`), supplier junk (`*`, `9`, `999`,
`99999`), everything as `string`. `inferSchema=False` is deliberate — a new file with a
stray value must not be able to change the schema of your audit record.

Five metadata columns make it auditable: `_source_file`, `_ingested_at_utc`, `_batch_id`,
`_ingest_notebook`, `_row_hash`.

Write mode is **append**, with a `MERGE` on `_row_hash` so re-running the notebook on the
same files does not double-count. PROMs provider extracts carry no patient identifier, so
the content hash is both the dedupe key and the join key back from silver.

Partitioned by `Year`.

### Silver — `silver.knee_episode`

Three transformations, all documented in code:

1. **Rename** — the `COLUMN_MAP` dictionary in notebook 20 is the data contract.
2. **Type** — integers as integers, scores as integers, codes as strings.
3. **Decode sentinels** — and this is where the clinical knowledge sits:

   | Code | Meaning | Handling |
   |---|---|---|
   | `9` on a comorbidity flag | **condition absent** — a real answer | → `0` |
   | `9` elsewhere | not answered | → `NULL` |
   | `*` on age band / gender | suppressed for disclosure control | → `NULL` |
   | `999` on EQ-VAS | not answered | → `NULL` |
   | `99999` on EQ-5D index | not answered | → `NULL` |

   Getting the first row backwards silently inverts twelve features. It is the single
   highest-value assertion in the pipeline.

Two cohort exclusions, both defensible to a clinician: no pre-op OKS (the outcome cannot
be computed), and revision surgery (a different clinical population).

`episode_id` is a deterministic 16-character hash — stable across full reprocessing, which
is what lets the app and the agent join to it.

Write mode is **overwrite**: silver is a derived, reproducible view of bronze. Delta keeps
the previous version addressable, so rebuilding loses nothing.

### Gold — `gold.knee_features`

**Gold is the contract layer.** One row per episode, human-readable values, explicit
column list. Everything downstream reads this and nothing else.

The important line is what does *not* go in:

| In gold | In the MLflow run |
|---|---|
| Feature engineering that is pure business logic — comorbidity count, OKS subscales, provider attributes | Train/test split |
| The target label and the rule behind it | MICE imputation |
| Readable categories (`"70 to 79"`, `"London"`) | One-hot encoding |

The reason is leakage. MICE and the one-hot encoder are **fitted on training data**. Bake a
train-fitted transform into a shared table and every consumer inherits information from the
training fold — at which point your test metrics are no longer honest. Those transforms
live in the MLflow run instead, versioned with the model and re-applied at serving from the
logged artifact.

It also keeps gold explainable. A clinician can read a gold row. Nobody can read
`age_band_4 = 1`.

**Column comments are not optional here.** The Fabric Data Agent and Fabric IQ ground
natural-language questions on table and column metadata. An undocumented column is one the
agent will guess about. Notebook 30 documents nineteen of them; that is the cheapest
accuracy improvement available to the agent demo.

### Gold serving tables — `gold.patient_risk`, `gold.risk_explanation`

Written by notebook 50 from the registered model.

`risk_explanation` is long-format — six rows per patient — precisely so the Data Agent can
query it. The agent speaks SQL, so "why is Margaret high risk?" has to be answerable as
rows, not as a function call. Precomputing also removes a live SHAP call from the stage.

Both tables carry `model_version`, so any score on screen is traceable to the registry
entry that produced it.

---

## What to do with your existing files

| Current | Destination |
|---|---|
| `data/external/data-pack-*/**.zip` | `Files/data/external/<pack>/` — already uploaded; notebook 10 unzips in place |
| `data/supporting/*.xlsx` | `Files/data/supporting/` — already uploaded; read by notebook 20 |
| `data/interim/*.parquet` | not needed; bronze + silver replace them |
| `data/cleaned/knee-provider-cleaned.parquet` | not needed; `silver.knee_episode` replaces it |
| `data/cleaned/X_*_encoded*.parquet` | **delete from the pipeline.** These are the train-fitted encodings. Recreated inside the MLflow run by notebook 40. |
| `models/*.joblib` | superseded by the MLflow registry. Keep as break-glass fallback for the old FastAPI app. |

### Migration shortcut

If you want the demo standing up before the full raw ingest works, you can seed silver
directly from the parquet you already have:

```python
# One-off: promote the existing cleaned parquet straight into silver.
(spark.read.parquet("Files/legacy/knee-provider-cleaned.parquet")
      .withColumn("episode_id", F.sha2(F.concat_ws("|", *df.columns), 256).substr(1, 16))
      .withColumn("_batch_id", F.lit("legacy-import"))
      .withColumn("_ingested_at_utc", F.current_timestamp())
      .write.format("delta").mode("overwrite").saveAsTable("silver.knee_episode"))
```

Then run notebooks 30 → 60 as normal. Backfill bronze afterwards — but do backfill it,
because segment 2 of the session is the lineage graph, and a lineage graph that starts at
silver does not make the argument.

---

## Governance checklist

- [ ] Sensitivity label applied to the Lakehouse item — it propagates to downstream items
- [ ] Same label on the SQL database and the Fabric App item
- [ ] Purview lineage shows `landing → bronze → silver → gold` (verify with the join query
      in notebook 30, section 9, before trusting the graph)
- [ ] `gold_table_version` tag on every MLflow training run
- [ ] Column comments present on `gold.knee_features`, `gold.patient_risk`,
      `gold.risk_explanation`
- [ ] `OPTIMIZE` + `ZORDER` run on the gold tables before the session — cold Direct Lake
      reads are noticeably slower on stage
- [ ] `VACUUM` **not** run with a short retention until after the session; it discards the
      history that the time-travel demo depends on
