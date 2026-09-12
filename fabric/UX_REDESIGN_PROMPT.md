# Prompt — UX / usability review and redesign of the Rayfin clinician app

You are a senior product designer *and* frontend engineer with clinical-informatics
experience: you have shipped decision-support UI that real clinicians used on a ward,
and you know that a pretty dashboard that hides the patient is worse than an ugly one
that shows them. Work at the level of someone who would be asked to defend this screen
to a clinical safety officer.

## 1. The target

Repository root: `/Users/sarasaudrius/EAISI/EAISI-Group-Project---NHS`
Application:     `fabric/rayfin-clinician-app`

It is a Fabric-hosted clinician app: a pre-operative risk review tool for knee
replacement. A model (`knee-poor-outcome-ebm@champion`, a calibrated Explainable
Boosting Machine) scores patients awaiting surgery for the probability of a **poor
outcome** — an Oxford Knee Score gain of 7 points or less at six months, i.e. below the
minimal clinically important difference. The clinician reviews the score, sees why the
model produced it, and records a decision. That recorded decision is the human-oversight
artefact.

**Stack (do not change it):** React 19 + TypeScript (strict) + Vite 7 + Tailwind CSS v4
(`@theme` in `src/main.css`, no `tailwind.config.js`), `@microsoft/rayfin-client` for
data access, `react-router-dom` v7 already installed. Deployed as static assets via
`rayfin up` to Fabric static hosting.

**Read before proposing anything:**

- `fabric/rayfin-clinician-app/src/**` — all of it, it is only ~1,250 lines
- `fabric/rayfin-clinician-app/rayfin/data/*.ts` — the three entities and their
  row-level-security policies
- `fabric/rayfin-clinician-app/index.html`, `README.md`, `package.json`
- `fabric/notebooks/30_gold_features.ipynb` — the full gold column set (this is the
  inventory of clinical data that *exists* and is not being shown)
- `fabric/notebooks/50_batch_score.ipynb` — how scores, risk bands and the six
  explanation rows per patient are produced, and the `FEATURE_LABELS` map
- `fabric/notebooks/42_threshold_analysis.ipynb` — the operating-point / threshold
  trade-off, currently invisible in the app
- `fabric/notebooks/43_explainability.ipynb` — global explainability artefacts
  (EBM shape functions, calibration) that no screen currently surfaces
- `fabric/notebooks/60_sync_app_db.ipynb` — the gold → app SQL sync; this is the file
  that must change if you want more clinical fields in the UI

## 2. What the app is today

Four screens' worth of content in three components: an auth page, a cohort table, and a
patient page with a hand-rolled bar chart and a decision form.

I have already verified the following defects. Treat this as a seed list, not the audit —
run your own and expect to find more.

**Branding / visual**
- The whole visual identity is the NHS design system, hardcoded as `--color-nhs-*`
  tokens in `src/main.css`. It reads as a government form, not a clinical tool.
- `src/components/AuthPage.tsx` still says **"Todo App"** — untouched Rayfin template
  boilerplate on the first screen anyone sees.
- Inter is loaded from Google Fonts in `index.html` via an external `<link>`, which is a
  third-party request from a hosted clinical app.
- `@custom-variant dark` is declared in `main.css` and then never used anywhere.
- Everything is grey text on pale grey, one type size, one card style, no hierarchy.
  `--color-risk-moderate: #b8860b` on white is a contrast problem.

**Clinical content — the biggest failure**
- The patient page shows six facts: name, age band, region, provider, episode id,
  pre-op OKS, comorbidity count, surgery date. That is it.
- Gold (`gold.knee_features`) carries far more, none of it synced or shown: the three
  OKS subscales (pain 0–8, function 0–24, ADL 0–16), all twelve individual comorbidities,
  the five EQ-5D dimensions (mobility, self-care, activity, discomfort, anxiety), symptom
  duration, previous surgery, assisted completion, living arrangements, disability, sex,
  provider type (university / independent). A clinician cannot review a patient they
  cannot see.
- `getDecisions()` exists in `src/services/patients.ts` and is **never called**. Prior
  decisions on a patient are invisible, so the oversight log is write-only.
- Nothing tells the clinician what the risk bands mean, where the thresholds came from,
  or how close this patient sits to a band boundary.

**Interaction / structure**
- `react-router-dom` is a dependency but unused. Patient selection is `useState` in
  `App.tsx`, so there is no URL per patient, no browser back, no deep link, no refresh
  survival.
- Cohort rows are `<tr onClick>` with no `role`, `tabIndex`, or key handler — not
  keyboard reachable.
- No search, filter, sort, or pagination on the cohort table.
- `getExplanation()` has `.finally()` but no `.catch()` — a failed fetch shows an empty
  chart with no error.
- `DecisionForm`'s `saved` state never resets, and `PatientPage` does not remount cleanly
  per patient, so a stale success message can carry across patients.
- The header ships a raw app-user GUID with a copy button and a comment about
  `CLINICIAN_ASSIGNMENTS` — a deployment debugging affordance living in clinician UI.
- `README.md` documents `npm run dev:offline` and `src/services/fixtures.ts`. Neither
  exists. There is no way to run this without a live Fabric tenant.

## 3. What I want you to do

### 3.1 Research first

Before designing, look up how this problem has actually been solved. Pull specifics —
layout, what is on the primary screen, how probability is communicated — not vibes:

- **ACS NSQIP Surgical Risk Calculator** — the closest real analogue: pre-operative,
  per-patient, multi-outcome, shows the patient against an average patient.
- **Predict (breast cancer, predict.nhs.uk)** — the reference example of communicating
  a model's output to a clinician *and* a patient, with treatment-benefit visualisation.
- **Duke Sepsis Watch** and **Epic Deterioration Index / sepsis model** UI — the
  literature on why clinicians ignored the scores is the most useful part.
- **DeepMind/Google Health Streams (AKI)** — published clinician-facing design work.
- **MDCalc** — how a clinician expects a score, its inputs, and its evidence to be laid out.
- **Risk-communication research** — Gigerenzer on natural frequencies, Spiegelhalter on
  visualising uncertainty; **icon arrays / pictogram grids** are the evidence-backed way
  to show "34 in 100", not a percentage alone.
- **Automation bias in clinical decision support** and the "five rights" of CDS.
- **Clinical Safety: DCB0129/0160** framing for what a decision-support UI must not imply.

Cite what you took from where in your report. If a pattern does not fit this app, say so.

### 3.2 Invent a brand — drop the NHS design system

Design your own identity for a **fictional** hospital or trust and apply it throughout.
Requirements:

- Invent the name, and make it obviously fictional. Do not use, imitate, or approximate
  the branding of any real NHS trust, hospital, or health system. No NHS logo, no NHS blue,
  no NHS typeface, no lockups that could be mistaken for a real organisation's.
- Build a real token layer in Tailwind v4 `@theme`: surface / elevated / border /
  text-primary / text-secondary / accent, plus a semantic four-band risk ramp. Both light
  and dark, since the dark variant is already wired up. Ship a working theme toggle.
- Type: a proper scale, self-hosted or system stack — no external font CDN request.
- The risk ramp must survive both colour-vision deficiency and greyscale (this gets
  projected and printed). Do not rely on hue alone: pair colour with position, label,
  and shape.
- WCAG 2.2 AA contrast on every text/background pair, including the risk badges.
- Aim for a tool a surgeon uses between clinics: dense, calm, fast to scan, no marketing
  gradients, no decorative blur circles, no hero section.

**Keep what is clinically real.** The Oxford Knee Score, EQ-5D, the MCID threshold of 7
points, and the NHS PROMs dataset as the *data source* are real and must stay accurately
named and cited. You are replacing the *branding*, not fabricating provenance. Wherever the
demo runs on synthetic or pseudonymised data, say so on screen.

### 3.3 Show the patient

Design and build a patient view a clinician could actually review from. At minimum:

- A clinical summary header: who, age band, sex, provider, surgery date and time-to-surgery,
  episode id de-emphasised.
- **OKS broken out**, not a single number: total /48 plus pain /8, function /24, ADL /16,
  each shown against the cohort distribution so "22/48" means something.
- **Comorbidity detail** — which twelve conditions, which are present, not a bare count.
- **EQ-5D profile** across the five dimensions.
- Symptom duration, previous surgery, living arrangements, disability, assisted completion —
  the context that determines whether "optimise before surgery" is even actionable.
- **Prior decisions on this patient** — wire up `getDecisions()`: who reviewed, when, what
  they decided, agreed or overrode, against which model version.

Where a field is not yet in the app database, extend `rayfin/data/PatientRisk.ts` and the
sync in `fabric/notebooks/60_sync_app_db.ipynb` to carry it, and keep the row-level-security
policy intact. Do not fabricate patient data to fill a chart: if a field is unavailable,
design the empty state.

### 3.4 Visualise the explanation

This is the core ask. The clinician has to be able to make a **supervised** decision — to
agree or override with reasons — and right now there is one hand-rolled diverging bar chart
and nothing else.

Design a set of visualisations that each answer a question a clinician would actually ask:

| Question | Candidate visual |
|---|---|
| How likely is a poor outcome, in terms I can say out loud to the patient? | Icon array / pictogram grid of 100, plus the calibrated percentage |
| Where does this patient sit relative to everyone else awaiting surgery? | Cohort distribution with this patient marked, band thresholds drawn |
| How close is this patient to a band boundary? | Position-on-scale / risk ladder with the four policy thresholds |
| Why this score? | The existing diverging contribution chart — rebuilt properly: sorted, axis, zero line, units, hover detail, log-odds explained in words |
| What would change it? | The EBM shape function for the top drivers — how risk moves across the range of OKS, comorbidity count, symptom duration, with this patient's value marked |
| Can I trust the number? | Calibration curve, and cohort-level model performance from notebooks 42/43 |
| Where is the cut-off and what does moving it cost? | Threshold trade-off from notebook 42, expressed in patients, not rates |
| What is my team doing with these scores? | Cohort view: band distribution, override rate, decisions outstanding |

Rules for the charts:

- Render as **inline SVG components you write**, or add at most one lightweight charting
  dependency and justify it. No CDN scripts, no runtime external fetches — this is served
  from Fabric static hosting.
- Every chart needs: an axis with units, a stated denominator, a legend or direct labels,
  and a one-line plain-English caption saying what it means. A chart a clinician has to
  decode is a chart they will ignore.
- Never show log-odds as a bare number to a clinician without translating it.
- Show uncertainty where it exists. A calibrated probability is still a statement about a
  group, and the UI must keep saying so.
- Accessible: `role="img"` with a real `aria-label`, a text or table equivalent for every
  chart, keyboard-reachable interactive elements, and no meaning carried by colour alone.
- Responsive down to a laptop screen in a clinic room.

### 3.5 Keep the governance story intact

The app's whole point is that it is *governed*. Do not weaken it while making it prettier:

- Row-level security stays in the entity policies / Data API Builder. Never add a
  provider or clinician filter in the frontend as the enforcement mechanism.
- Every score stays attached to the model version that produced it; every recorded
  decision stays attached to the score and version the clinician actually saw.
- Keep the decision-support disclaimer prominent — it must never read as an
  authorisation, refusal, or scheduling instruction.
- Rationale stays mandatory. Design *against* automation bias: do not pre-select
  "agree", do not let the model's recommendation be the path of least resistance,
  and make overriding as easy as agreeing.
- Move deployment debugging affordances (the user-GUID copy button) out of clinician UI
  into a dev-only surface.

## 4. Deliverables

1. **A UX audit** of the current app: findings ordered by severity, each one
   `file:line → problem → why it matters clinically → fix`. Separate "this is ugly" from
   "this is a patient-safety or usability risk" and say which is which.
2. **A design direction**: the fictional brand, the token set, the type scale, the risk
   ramp with contrast values, and the layout rationale — grounded in the research from 3.1.
3. **The implemented redesign** in `fabric/rayfin-clinician-app`:
   - real routing (`/`, `/patient/:episodeId`) with working back/deep-link/refresh
   - a redesigned cohort view with search, sort, filter by band, and keyboard access
   - a redesigned patient view with the clinical detail from 3.3
   - the visualisation components from 3.4, as reusable typed components
   - loading skeletons, error states, and empty states everywhere data is fetched
   - `AuthPage` rewritten under the new brand — the word "Todo" gone
   - light + dark, both actually checked
4. **The data changes** to `rayfin/data/PatientRisk.ts` (and a new entity if the cohort
   distribution or model-performance data needs one) plus the matching writes in
   notebook 60, with RLS policies preserved and explained.
5. **An offline demo mode that works**: fixtures and a `dev:offline` script, so the app
   runs with no Fabric tenant — and a `README.md` that is true.
6. **Tests** for the new chart components with `vitest` + Testing Library: at minimum
   that each renders its accessible label and its empty state.

## 5. Constraints and how to work

- `npm run build` (`tsc -b && vite build`) must pass. `npm run lint` must pass. TypeScript
  strict, no `any`, no `@ts-ignore`.
- Do not add heavy dependencies without justifying each one against bundle size.
- Do not touch auth (`src/services/RayfinAuthService.ts`, `src/hooks/AuthContext.tsx`)
  beyond styling — the Fabric SSO path is fragile and was hard-won.
- Do not change the `assignedClinicianId` semantics documented in `PatientRisk.ts` and
  notebook 60. That behaviour was verified empirically and the comments explain why.
- Preserve the existing code's commenting style: the codebase explains *why*, not *what*.
  Match it. Comments that restate the code are noise here.
- Work in reviewable increments: tokens and brand first, then routing and structure, then
  clinical content, then visualisations, then tests and docs. Say what you changed and why
  at each step.

## 6. Acceptance criteria — check yourself against these before reporting done

- A clinician who has never seen the app can, in under 30 seconds on the patient page,
  answer: who is this patient, how likely is a poor outcome, why, how sure is the model,
  and what are my options.
- Every number on screen has a unit, a denominator, or a scale.
- No NHS branding remains, and no real health organisation is imitated.
- Nothing on screen is fabricated clinical data presented as real; synthetic data is
  labelled as such.
- Every chart has a text equivalent and passes contrast in light and dark.
- Row-level security is still enforced server-side and you can say exactly where.
- The app runs offline with fixtures, and the README's instructions are accurate.
- No "Todo App" anywhere. No lorem ipsum. No placeholder that ships.

If you disagree with anything above on clinical or design grounds, say so and argue it —
but deliver the full scope either way.
