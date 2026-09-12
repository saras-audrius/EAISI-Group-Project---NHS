# From Notebook to Bedside — FabCon 2026 Session Design & Build Plan

**Session:** From Notebook to Bedside: Building a Clinical Risk Prediction Pipeline
**Presenters:** Audrius + Manu
**Event:** FabCon US (Atlanta), **Sept 28, 2026**
**Plan written:** 2026-07-25
**Target "done / frozen":** **Sept 21, 2026** (a full week early)
**Format:** 60-minute breakout, **Level 300** (technical / practitioner)
**Companion Fabric workspace:** `healthcare-fabcon2026-demo`
**Code base (reuse):** this repo (`EAISI-Group-Project---NHS`)

---

## 1. Thesis & narrative spine

**Thesis (the line the room should leave repeating):**
> In a regulated domain, accuracy is only the entry ticket — Fabric is where a model earns *trust* and reaches the *bedside* without ever leaving the governed estate.

**Why-Fabric punchline (state at close, seed throughout):** the data lives in **OneLake**, the **analytics/modeling happens on it in place**, and the **decision is delivered from it** — no copies, no ungoverned exports, one lineage from raw row to bedside. *Data + analytics + decision in one governed place.*

**Human stakes (open with this, Level 300 still needs to care):** ML is *already* triaging and risk-scoring patients today. ~25% of joint-replacement patients still report poor outcomes a year after well-performed surgery. Better pre-op prediction changes who gets counseled, who gets optimized first, and who avoids a surgery that won't help. The stakes are **Margaret's year of pain**, not an AUC point.

**Narrative style:** blend of linear pipeline ("Notebook → Bedside" in order) + a running clinical case.

**Through-line:** one pre-op patient — **"Margaret, 68, awaiting knee replacement"** — a real, de-identified record pulled from the test set. Every stage answers: *what does this mean for Margaret's risk, and could we defend this decision to a regulator?*

**Governance as the spine:** after each stage, a one-line recurring callback — *"still the same OneLake data, still labeled, still lineage-traced"* — so "why Fabric = one governed estate" is **earned**, then stated outright in the close.

---

## 2. Regulatory frame (stated up front, reinforced per stage)

- **EU AI Act** — clinical decision support is **high-risk**; obligations around transparency, human oversight, risk management, and record-keeping.
- **GDPR Art. 22 / right to explanation** — patients subject to (semi-)automated decisions are owed a meaningful explanation.
- **Consequence for the design:** interpretable models (EBM) + local explanations (SHAP) + **calibrated** probabilities + **governed, permission-aware delivery** are *requirements*, not nice-to-haves. This is the through-argument that justifies every technical choice on stage.

---

## 3. Run-of-show (~53 min content + ~5 Q&A + buffer)

| # | Segment | ~min | Live? | Hero |
|---|---------|------|-------|------|
| 1 | **Framing & stakes** — human impact of ML in care, meet Margaret, EU regulatory frame, thesis | 4 | slides | |
| 2 | **Lakehouse ingestion** — NHS PROMs → OneLake, medallion (bronze/silver/gold), sensitivity labels + lineage | 6 | live glance | |
| 3 | **Missing data & class imbalance** — missingness patterns, imputation choices, imbalanced poor-outcome class, PR-curve as the metric, SMOTE vs class weights | 7 | notebook | |
| 4 | **Interpretable model: EBM + SHAP** — glassbox shape functions, local SHAP on Margaret, contrast vs black-box RF, calibration so risk = real probability | 11 | notebook | ★ 1 |
| 5 | **Real-time model endpoint** — register calibrated EBM, deploy managed Fabric endpoint, live inference → Margaret's calibrated risk + top drivers | 7 | live | ★ 2 |
| 6 | **Governed delivery with Rayfin** — `npx rayfin up`, clinician app on Fabric (SQL in Fabric, GraphQL, Entra ID auth, OneLake), role-based access to Margaret's score | 8 | live | ★ 3a |
| 7 | **Data Agent + Fabric IQ** — clinician asks in natural language, permission-aware, grounded, cited answers | 8 | live | ★ 3b |
| 8 | **Why Fabric for regulated use-cases + close** — recap trust thread, one-estate argument, QR to repo | 3 | slides | |

**Co-presenter split (suggested, theme-based — reassign later):** one owns **"the science"** (segments 2–4), the other owns **"trust & governed delivery"** (segments 5–7); both share bookends (1 & 8). Clean thematic handoff at the midpoint.

---

## 4. Segment-by-segment detail

Each segment lists: **show** (what's on screen), **say** (the governance/regulation callback), **live vs. fallback**.

### Segment 1 — Framing & stakes (slides, 4 min)
- **Show:** human-impact opener; Margaret's card; EU AI Act + GDPR Art. 22 slide; the thesis line.
- **Say:** "Accuracy gets you in the room. Trust, interpretability, and governed delivery get you to the bedside."
- **Fallback:** n/a (slides).

### Segment 2 — Lakehouse ingestion (live glance, 6 min)
- **Show:** NHS PROMs landing into the Lakehouse; bronze → silver → gold; the gold model-ready feature table; **sensitivity label** on the item; **Purview lineage** raw→gold.
- **Say:** "Every downstream decision is traceable to this row. Same estate, labeled, lineage-traced."
- **Fallback:** screenshots of medallion + lineage graph.

### Segment 3 — Missing data & class imbalance (notebook, 7 min)
- **Show:** missingness heatmap/pattern; imputation choices + rationale; class balance (poor-outcome minority %); **PR-curve** as primary metric; SMOTE vs class weights comparison.
- **Say:** "Ignoring the minority poor-outcome class *is* patient harm — that's why we don't optimize accuracy."
- **Fallback:** pre-run notebook (outputs cached).

### Segment 4 — Interpretable model: EBM + SHAP ★1 (notebook, 11 min)
- **Show:** EBM global shape functions (glassbox); local **SHAP** explanation for Margaret; side-by-side contrast with black-box RF (you have both models); **calibration** curve so the risk score is a real probability.
- **Say:** "A regulator can read this. A clinician can challenge it. A black box can't be defended under the AI Act."
- **Fallback:** pre-run notebook + exported plots.

### Segment 5 — Real-time model endpoint ★2 (live, 7 min)
- **Show:** register calibrated EBM as a Fabric ML model; deploy managed real-time endpoint; **live call** returns Margaret's calibrated probability + top SHAP drivers; endpoint auth + model version.
- **Say:** "Versioned, authenticated, and still inside the estate — no model.pkl emailed around."
- **Fallback:** recorded clip of the call + response.

### Segment 6 — Governed delivery with Rayfin ★3a (live, 8 min)
- **Show:** `npx rayfin up`; the deployed clinician app (SQL DB in Fabric, GraphQL API, **Entra ID auth**, static UI, data in OneLake); **role-based / row-level access**; Margaret's score + explanation at the "bedside."
- **Say:** "Secured, compliant, OneLake-integrated from day one — this replaces the ungoverned FastAPI box we used to run."
- **Fallback:** recorded clip + old FastAPI/React webapp as break-glass backup.

### Segment 7 — Data Agent + Fabric IQ ★3b (live, 8 min)
- **Show:** clinician asks natural-language questions ("Which of my pre-op patients are highest risk, and why?"); **Fabric Data Agent grounded in Fabric IQ** returns permission-aware, grounded, **cited** answers drawing on gold risk scores + EBM explanations.
- **Say:** "The agent can only answer within governed data, respects the same permissions, and every answer is traceable."
- **Fallback:** recorded clip of the 3–4 scripted Q&A.

### Segment 8 — Why Fabric + close (slides, 3 min)
- **Show:** the end-to-end trust thread on one diagram; the one-estate argument; QR to repo.
- **Say:** the why-Fabric punchline from §1, stated outright.
- **Fallback:** n/a.

---

## 5. Architecture — what we reuse vs. build

**Reuse as-is (already migrated to Fabric):**
- The 7 finalized notebooks (`code/Finalized notebooks/01…07`).
- Calibrated `best_ebm_model.joblib` (hero model) + RF model (`best_rf_model_yvonne.joblib`) for the black-box contrast.
- Preprocessing / one-hot encoders + cleaned parquet datasets in `data/cleaned/`.
- `OKS_T1_Prediction_Model_Card.md` (governance artifact seed).

**Build new (greenfield), in dependency order:**
1. Lakehouse medallion ingestion (bronze→silver→gold) + sensitivity labels + verified lineage.
2. Calibrated EBM registered as a Fabric ML model → managed real-time endpoint (returns calibrated prob + SHAP drivers).
3. Rayfin app (`npx rayfin up`) — TypeScript backend on Fabric (SQL DB, GraphQL, Entra ID auth, static clinician UI) with RBAC/row-level security. **Replaces** the FastAPI+React webapp (kept only as break-glass fallback).
4. Fabric Data Agent grounded in Fabric IQ semantic layer over the gold risk table + explanations.
5. Governance artifacts: model card, sensitivity labels end-to-end, an "audit trail" view for the stage.

**Known build risks (planned around):**
- **R1 — Rayfin is brand-new (Build 2026):** first `rayfin up` on the tenant may need iteration → **de-risked in Week 1 with a throwaway spike.**
- **R2 — Data Agent + IQ grounding quality:** on-stage questions must return clean, cited answers → **de-risked in Week 1 spike, tuned across a full week (Week 4).**

---

## 6. Week-by-week plan with granular tasks

> Check items off as you go. Owner column: **A** = Audrius, **M** = Manu, **A/M** = joint/TBD.

### Week 0 — Align & unblock (Jul 25–27)
- [ ] Lock thesis, run-of-show, and the blend-A+C narrative with Manu — **A/M**
- [ ] Pick "Margaret": choose a real de-identified test-set record; note her feature values, true outcome, and model score — **A**
- [ ] Confirm Fabric **capacity headroom** (SKU, current utilization) for endpoints + app hosting — **A**
- [ ] Verify tenant **permissions**: can create ML endpoints, install/run Rayfin CLI, create **Entra app registrations**, assign RBAC — **A**
- [ ] Confirm workspace `healthcare-fabcon2026-demo` exists with correct roles for both presenters — **A/M**
- [ ] Confirm the FabCon session length, room A/V, and whether Q&A is inside the 60 min — **A**
- [ ] Note any PTO / travel / conflicting deadlines across the 8 weeks and adjust this plan — **A/M**

### Week 1 — Ingestion + two risk spikes (Jul 28–Aug 3)
Ingestion:
- [ ] Land NHS PROMs (knee) into the Lakehouse as **bronze** (raw) — **A**
- [ ] Build **silver** (typed/cleaned) transform — **A**
- [ ] Build **gold** model-ready feature table matching the notebook feature set — **A**
- [ ] Apply **sensitivity labels** to the Lakehouse items / gold table — **A**
- [ ] Verify **Purview lineage** shows raw→bronze→silver→gold — **A**
- [ ] Capture ingestion **screenshots** for the fallback deck — **A**

**Spike A — Rayfin (throwaway, de-risk R1):**
- [ ] Install Rayfin CLI; run `npx rayfin up` on a hello-world backend — **M**
- [ ] Confirm it provisions SQL DB + GraphQL + **Entra ID auth** + static host on the tenant — **M**
- [ ] Confirm app data lands in **OneLake**; document any tenant-specific setup gotchas — **M**

**Spike B — Data Agent + IQ (throwaway, de-risk R2):**
- [ ] Stand up a Data Agent over a trivial gold table; ask **one** question and get a grounded answer — **M**
- [ ] Note IQ/semantic-model setup steps + answer quality/latency — **M**

**Week 1 exit:** gold table exists **and** both new techs are proven to work on your tenant.

### Week 2 — Model → endpoint (Aug 4–Aug 10)
- [ ] Register the calibrated EBM as a Fabric **ML model** (versioned) — **A**
- [ ] Deploy a **managed real-time endpoint** — **A**
- [ ] Decide **SHAP-at-serve** strategy: precompute per-patient vs. compute on-the-fly at inference — **A**
- [ ] Implement endpoint response = calibrated probability + top-N SHAP drivers — **A**
- [ ] Make a **live test call** returning Margaret's score + drivers; measure latency — **A**
- [ ] Confirm endpoint **auth** and how you'll authenticate live on stage — **A**
- [ ] Freeze the **gold table** as the single source for app + agent — **A**

**Week 2 exit:** live endpoint returns Margaret's score + drivers reliably.

### Week 3 — Rayfin clinician app, real (Aug 11–Aug 17)
- [ ] Define the app data model in TypeScript (patients, scores, explanations) — **M**
- [ ] App reads the **gold table** and **calls the endpoint** for scoring — **M**
- [ ] Implement **RBAC / row-level security** so a clinician sees only permitted patients — **M**
- [ ] Build the clinician **UI**: Margaret's risk score + SHAP explanation + calibration context — **M**
- [ ] Deploy via `rayfin up`; confirm Entra sign-in flow works end-to-end — **M**
- [ ] Keep the old FastAPI/React webapp runnable as **break-glass fallback** — **A**

**Week 3 exit:** governed Rayfin app shows Margaret at the "bedside."

### Week 4 — Data Agent + Fabric IQ (Aug 18–Aug 24)
- [ ] Build the **Fabric IQ semantic layer / ontology** over gold risk table + explanations — **M**
- [ ] Configure the **Data Agent** to ground on that IQ layer — **M**
- [ ] Curate the **3–4 on-stage questions** (highest-risk cohort, why-for-Margaret, provider comparison, threshold what-if) — **A/M**
- [ ] Tune until answers are **grounded, cited, and permission-aware**; verify a restricted user sees restricted answers — **M**
- [ ] Measure answer **latency**; script exact question wording for the stage — **A/M**
- [ ] Record a **fallback clip** of the scripted Q&A — **M**

**Week 4 exit:** agent nails the scripted questions reliably.

### Week 5 — Governance thread + notebook polish (Aug 25–Aug 31)
- [ ] Update the **model card** (intended use, metrics, limitations, EU AI Act notes) — **A**
- [ ] Build the **audit-trail view** you can point to on stage (data → model → score → decision) — **A**
- [ ] Verify **sensitivity labels** propagate end-to-end (Lakehouse → app → agent) — **A/M**
- [ ] Trim **segment 3 notebook** (missingness/imbalance/PR-curve) to run in ~7 min — **A**
- [ ] Trim **segment 4 notebook** (EBM shapes, SHAP-on-Margaret, RF contrast, calibration) to run in ~11 min — **A**
- [ ] Pre-cache all heavy cell outputs; strip anything not shown — **A**
- [ ] **First full raw→bedside integration test:** run the whole chain once, unbroken — **A/M**

**Week 5 exit:** whole chain runs once, unbroken.

### Week 6 — Dry run #1 + slides (Sep 1–Sep 7)
- [ ] Build **framing slides** (segment 1) and **close slides** (segment 8) only — **A/M**
- [ ] Make the one-estate **architecture diagram** for the close — **A**
- [ ] **Timed solo run-through (#1)**; log real runtime per segment and overruns — **A**
- [ ] Identify the **fragile steps**; list what needs a recorded fallback — **A/M**
- [ ] Start **recording fallback clips** for ★1–★3 + endpoint — **A/M**

**Week 6 exit:** you know your real runtime and where it breaks.

### Week 7 — Rehearse, time-box, fallbacks (Sep 8–Sep 14)
- [ ] **Dry run #2 and #3 with Manu**; lock the split and practice handoffs — **A/M**
- [ ] Finish **recorded fallbacks** for all three hero moments + endpoint — **A/M**
- [ ] Write **"reset state" scripts** so any demo can be re-run cleanly mid-session — **A/M**
- [ ] Test on **venue-like conditions**: phone hotspot / backup network, latency to endpoint + agent — **A**
- [ ] Trim to hit the time budget with a **2–3 min buffer** — **A/M**
- [ ] Prepare **Q&A crib sheet** (likely regulatory + Fabric-cost + model-limitations questions) — **A/M**

**Week 7 exit:** runs clean at time; every demo has a fallback.

### Week 8 — FREEZE (Sep 15–Sep 21)
- [ ] **Environment + content freeze** by ~Sep 19 — no new features after this — **A/M**
- [ ] **Final timed dry run (#4)**, full, with fallbacks rehearsed — **A/M**
- [ ] **Snapshot** the workspace + gold data; **pin** model + endpoint versions — **A**
- [ ] Download **offline copies** of everything (clips, notebook PDFs, slides) — **A/M**
- [ ] Assemble the **demo kit**: backup laptop, local clips, notebook PDFs, printed run-of-show cue cards, QR code — **A/M**
- [ ] Final permissions/auth check on both presenter accounts — **A/M**

**Week 8 exit:** done a week early; nothing left to build.

### Buffer — Sep 22–27
- [ ] Light rehearsal + travel only. **No new build.** — **A/M**

---

## 7. Demo risk & fallback strategy

- **Every live hero moment (★1–★3) has:** a pre-recorded clip **and** a reset script.
- **Delivery break-glass:** the old FastAPI/React webapp stays runnable if Rayfin misbehaves live.
- **Network:** endpoint + agent calls tested on a backup network (hotspot) before the session.
- **State:** all notebooks pre-run with cached outputs; live cells are re-runnable and idempotent.
- **Auth:** both presenter accounts verified for endpoint, Rayfin app, and agent access during freeze week.
- **Time:** target a 2–3 min buffer; know which segment to compress if running long (segment 3 first, then trim RF contrast in segment 4).

---

## 8. Open decisions / assumptions (revisit at Week 0)

- [ ] Co-presenter split not yet fixed — theme-based split proposed; confirm with Manu.
- [ ] Assumes tenant permissions allow endpoint creation, Rayfin install, and Entra app registrations — **verify Week 0**.
- [ ] Assumes Q&A sits inside the 60 min — confirm with FabCon organizers.
- [ ] "Margaret" record to be selected from the existing test set (de-identified).
- [ ] Knee (not hip) chosen as the demo cohort, matching the finalized notebooks.
