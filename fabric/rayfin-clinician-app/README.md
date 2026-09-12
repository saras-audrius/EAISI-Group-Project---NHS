# Knee Outcome Review — Marrowfield Orthopaedic Centre

A governed clinician app over NHS PROMs knee-replacement risk scores in Fabric.

A calibrated Explainable Boosting Machine scores patients awaiting knee replacement for the
probability of a **poor outcome** — an Oxford Knee Score gain of 7 points or fewer at six
months, at or below the minimal clinically important difference. A clinician reviews the
score, sees the model's own reasoning, reads the patient's full pre-operative record, and
records a decision. That recorded decision is the human-oversight artefact.

> **Marrowfield Orthopaedic Centre is a fictional organisation** invented for this
> demonstration. It is not a real trust, hospital or health system and is not modelled on
> one. The Oxford Knee Score, the EQ-5D-3L, the 7-point MCID and the NHS PROMs dataset the
> model is trained on are real and are named accurately.

Built on **Rayfin** (`@microsoft/rayfin-cli`): a code-first data model in TypeScript
becomes a SQL database in Fabric, a GraphQL API through Data API Builder, Entra ID
sign-in, and static hosting — all inside the workspace.

## See it running in 30 seconds

No Fabric, no Entra, no provisioning:

```bash
npm install
npm run dev:offline        # http://localhost:5173
```

Offline mode serves the synthetic cohort in `src/services/fixtures.ts` and signs you in as
a local demo identity. Every screen carries a banner saying the patients are synthetic.
This is also the **break-glass fallback** for a live session — if the tenant or the network
misbehaves five minutes before you go on, this still puts a working app on the projector.

The fixtures are generated, not typed out, from a small additive model with the same
structure as an EBM. That is what makes the demo honest: a patient's risk really is
`sigmoid(intercept + Σ f_j(x_j))`, their explanation bars really are those `f_j(x_j)`
terms, the shape-function curves really are those `f_j`, and the calibration curve and
threshold sweep are computed from sampled outcomes over the generated cohort. The
invariant is asserted in `src/services/__tests__/fixtures.test.ts`.

> Node 20, 22 or 24 for the Rayfin CLI. Node 26 works for `npm run build` and the offline
> path. `brew install node@24 && export PATH="/opt/homebrew/opt/node@24/bin:$PATH"`

## Scripts

| Script | What it does | Needs Fabric? |
|---|---|---|
| `npm run dev:offline` | Vite dev server against fixtures | no |
| `npm run dev` | `rayfin up` (minus static hosting), then Vite against the live backend | yes |
| `npm run build` | `rayfin env` + `tsc -b` + `vite build` | reads `rayfin/.env` |
| `npm run build:offline` | Same build, pinned to the fixtures backend | no |
| `npm run lint` | ESLint over `src` and `rayfin` | no |
| `npm run test` | Vitest — chart accessibility, fixture invariants, an end-to-end pass over the app | no |

The offline switch is `--mode offline`, resolved in `vite.config.ts` rather than in an env
file: `.env.local` is written by `rayfin env` and outranks `.env.offline` in Vite's
precedence order, so a developer with a provisioned backend would otherwise never reach the
fixtures.

## Deploy to Fabric

```bash
npx rayfin login
npx rayfin up --workspace "Healthcare-FabCon2026-Demo"
```

`rayfin up` reads the decorated classes in `rayfin/data/`, provisions the SQL database,
generates the DAB configuration including the row-level security policies, wires Entra
sign-in, and deploys `dist/` to static hosting. Note the SQL connection details it prints —
notebook 60 needs them.

Then, from the Fabric notebook side:

```
run fabric/notebooks/60_sync_app_db.ipynb    # gold Delta → the app's SQL database
```

Useful flags:

```bash
npx rayfin up --dry-run              # preview without calling the API
npx rayfin up --skip-build           # redeploy without rebuilding the frontend
npx rayfin up db apply --force       # allow destructive schema changes (data loss)
npx rayfin up status                 # what is deployed where
```

> The entity set grew: `PatientRisk` gained the clinical detail, and `CohortStat`,
> `ModelCurve`, `ThresholdOption` and `ModelCard` are new. Run `npx rayfin up db apply`
> before notebook 60, or the sync will stop at the table check and name what is missing.

## Data model

Seven entities in `rayfin/data/`, in two tiers — and the split *is* the security story.

### Patient-scoped — every row filtered against a claim

| Entity | Source | Policy |
|---|---|---|
| `PatientRisk` | `gold.patient_risk` ⋈ `gold.knee_preop_cohort` | `claims.sub == assignedClinicianId` |
| `RiskExplanation` | `gold.risk_explanation` | same, denormalised onto the row |
| `ReviewDecision` | written by the app | `claims.sub == clinicianId` |

### Model-scoped — aggregates and model documentation, no row policy

| Entity | Contents | Why no policy |
|---|---|---|
| `CohortStat` | binned cohort distributions | no patient in it; bins under 5 suppressed; a per-clinician distribution would be useless *and* more disclosive |
| `ModelCurve` | calibration curve, EBM shape functions | describes the model, not a patient |
| `ThresholdOption` | operating-point sweep, per 1,000 | test-set counts over historical episodes |
| `ModelCard` | model provenance, headline metrics, synthetic-data flag | model-card material a reviewing clinician must be able to read |

"No policy" means `read` for any authenticated caller. Data API Builder still requires a
valid session; nothing is granted anonymously.

### How row-level security actually works here

Rayfin policies compare **token claims** against **fields on the row**, and the claim set
is fixed: `sub`, `email`, `role`. There is no `provider_code` claim to filter on.

So the assignment is materialised onto the row as `assignedClinicianId` (the clinician's
Rayfin app user id) when notebook 60 syncs gold across. The policy reads:

```ts
@role('authenticated', 'read', {
  policy: (claims, item) =>
    claims.sub.eq(item.assignedClinicianId).or(claims.role.eq('governance')),
})
```

A signed-in user sees a patient when they are the assigned clinician, or when their `role`
claim is `governance` — the audit role that legitimately sees the whole cohort.

> The `governance` branch is currently inert. Fabric SSO issues no `roles` claim, and
> `services.auth.customClaims` in `rayfin.yml` is static app-wide, so it cannot express a
> per-user role. Audit access needs a different route — reading the SQL database directly
> under workspace permissions is the honest one.

Enforcement is in Data API Builder, **not** in the frontend. `RayfinDataService` contains
no `WHERE` clause on clinician or provider, deliberately: a clinician who rewrites the
GraphQL query in devtools still gets only their own patients. That is the demo — open
devtools on stage and try it. The same applies to a deep link: `/patient/:episodeId`
re-queries the patient, so pasting somebody else's episode id returns nothing.

Widening `PatientRisk` from eight columns to forty did not widen the disclosure. The policy
filters whole rows.

Configure the mapping in `CLINICIAN_ASSIGNMENTS` at the top of notebook 60.

The value is the **Rayfin app user id** — a bare GUID minted the first time that person
signs into this app. Sign in as them and open the **dev panel** (bottom-right corner, dev
builds only) to copy it. It used to sit in the app header; a clinician reviewing a patient
should not be reading a GUID, so it moved.

Two values it is *not*:

- **The Entra object id.** `az ad user show --query id` returns something that matches
  nothing here. The Fabric token carries no `oid` or `upn` at all.
- **The raw `sub` claim.** Fabric SSO issues an `idtyp: fmi` token whose `sub` is a path,
  `/eid1/c/pub/t/<tenant>/a/<app>/workspaces/<ws>/projects/<item>/users/<uid>`. The backend
  passes only the trailing `<uid>` to Data API Builder. Rows holding the full path match
  nothing — confirmed by splitting the cohort across both forms and signing in.

### The oversight record

`ReviewDecision` is the only entity the app writes, and it is the point of the whole
delivery layer. Every recorded decision carries:

- the clinical decision and a **required** free-text rationale,
- an explicit `agreed` / `overridden` flag against the model,
- the risk score **as shown at decision time**,
- the **model version the clinician actually saw**.

That last field is what lets an audit reconstruct a decision as it was made rather than as
today's model would make it. A score with no recorded decision is a model acting alone; a
score with a decision attached is decision support — which is the distinction the EU AI Act
cares about.

Tracking the override rate is also the cheapest drift detector you will ever build: when
clinicians start disagreeing with the model more often, something has changed in the
population before the offline metrics notice.

The form is deliberately effortful. Nothing is pre-selected, agree and override are the
same shape and size, and the rationale has a minimum length. The fastest path through the
screen must not be "endorse the model without reading it".

## Layout

```
rayfin/data/          entity classes — rayfin up reads these
src/
  brand.ts            the fictional organisation, in one place
  clinical.ts         OKS, EQ-5D-3L, comorbidities, risk bands, log-odds → English
  main.css            the whole token layer: light, dark, and the four-band risk ramp
  services/
    types.ts              row shapes + the ClinicalDataService interface
    patients.ts           the public data API the UI calls
    RayfinDataService     governed reads through Data API Builder
    OfflineDataService    the fixtures backend
    fixtures.ts           the generated synthetic cohort
    bootstrap.ts          picks Offline or Fabric, once, at boot
  pages/
    CohortPage        the pre-op list: search, sort, filter by band, keyboard reachable
    PatientPage       one patient: record, score, explanation, model, decision
  components/
    charts/           every visualisation, as inline SVG — no charting dependency
    DecisionForm      the human-oversight capture
    DecisionHistory   prior decisions on this patient
    DevPanel          deployment affordances, dev builds only
```

### Charts

All inline SVG written here — no charting library, no CDN script, no runtime fetch, which
matters for a page served from Fabric static hosting under a strict origin. Every chart
goes through `ChartFrame`, which makes four things structural rather than optional: a
plain-English caption, a stated denominator, a real `aria-label`, and a table of the
underlying numbers behind a `<details>`.

| Component | The question it answers |
|---|---|
| `IconArray` | How likely is this, in terms I can say out loud? |
| `RiskLadder` | Which band, and how close to the edge? |
| `CohortDistribution` | Where does this patient sit against everyone waiting? |
| `ContributionChart` | Why this score? |
| `ShapeFunction` | What would change it? |
| `CalibrationCurve` | Can I trust the number? |
| `ThresholdTradeoff` | Where is the cut-off and what does moving it cost? |
| `BandDistribution` | What is on my list? |
| `SubscaleMeter` | The OKS, broken out, against the cohort median |

## Theme and accessibility

Light and dark, switched by a three-way control (light / auto / dark) and resolved before
first paint by a small inline script in `index.html`. No web font is fetched — a hosted
clinical app should not make a third-party request to render its own text.

The four-band risk ramp never relies on hue. Every band carries a four-block glyph
(`▮▯▯▯` … `▮▮▮▮`), its name in words, and a position on a shared scale; colour is the
third encoding. The ramp is monotone in greyscale in both themes (light 73/59/44/10, dark
70/76/84/141 out of 255), so it survives a projector and a monochrome printout. Every
text/background pair is ≥ 4.5:1 and every chart mark ≥ 3:1 against its surface.

## Environment variables

`rayfin env --framework vite` writes `.env.local` after deployment. Manual overrides:

| Variable | Purpose |
|---|---|
| `VITE_OFFLINE_DEMO` | `true` → fixtures, no backend. Normally set by `--mode offline`, not by hand |
| `VITE_RAYFIN_API_URL` | Rayfin backend |
| `VITE_RAYFIN_PUBLISHABLE_KEY` | required against a deployed backend |
| `VITE_FABRIC_WORKSPACE_ID` | required for Entra sign-in |
| `VITE_FABRIC_ITEM_ID` | the Fabric App item id |
| `VITE_FABRIC_PORTAL_URL` | `https://app.fabric.microsoft.com` |
| `VITE_ROUTER` | `hash` → hash routing. Only needed if a hard refresh on `/patient/:episodeId` 404s against the deployed host |

The Fabric path never falls back to fixtures. If the backend is unreachable, `bootstrapApp`
throws at boot: an app that can silently substitute invented patients for real ones is an
app that can show invented patients on stage without anyone noticing.

## Rehearsal checklist

- [ ] `npm run dev:offline` works on the presenting laptop, offline, on battery
- [ ] `npm run test` and `npm run lint` pass
- [ ] `npx rayfin up db apply` has run since the entity set grew to seven
- [ ] Notebook 60 ran after 50, and its table check found all seven tables
- [ ] Two demo clinician accounts assigned to different providers in notebook 60
- [ ] Sign in as each and confirm the two lists differ — then show it in devtools
- [ ] Paste one clinician's episode id into the other's URL bar and get the empty state
- [ ] Hard-refresh a `/patient/:episodeId` URL on the **deployed** host. If it 404s, set `VITE_ROUTER=hash` and rebuild — Rayfin's `staticHosting` has no SPA-fallback setting
- [ ] A recorded `ReviewDecision` survives a page reload and appears in "Previous reviews"
- [ ] `DATASET_IS_SYNTHETIC` in notebook 60 matches reality, and the banner agrees
- [ ] Sensitivity label applied to the SQL database and the Fabric App items
- [ ] Static hosting URL loads on the venue network *and* on a phone hotspot
