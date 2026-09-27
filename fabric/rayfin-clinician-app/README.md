# Knee Outcome Review — Marrowfield Orthopaedic Centre

A governed clinician app over NHS PROMs knee-replacement risk scores in Fabric.

A calibrated Explainable Boosting Machine scores patients awaiting knee replacement for the
probability of a **poor outcome** — an Oxford Knee Score gain of 7 points or fewer at six
months, at or below the minimal clinically important difference. A clinician sees their
list against the whole service, reviews a patient's score and the model's own reasoning,
reads the full pre-operative record, asks the estate questions in English, and records a
decision. That recorded decision is the human-oversight artefact.

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
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"   # Rayfin CLI needs Node 20/22/24
npm install
npm run dev:offline        # http://localhost:5173
```

Offline mode serves the synthetic cohort in `src/services/fixtures.ts` and signs you in as
a local demo identity. Every screen carries a banner saying the patients are synthetic.
This is also the **break-glass fallback** for a live session.

The fixtures are generated, not typed out, from a small additive model with the same
structure as an EBM, so a patient's risk really is `sigmoid(intercept + Σ f_j(x_j))`, the
explanation bars really are those terms, and the calibration curve, threshold sweep and
provider aggregates are computed from sampled outcomes over the generated cohort. The
invariant is asserted in `src/services/__tests__/fixtures.test.ts`.

## The five screens

| Route | Screen | What it answers |
|---|---|---|
| `/` | **Overview** | What is on my list, who is coming to theatre, what is the model flagging and why, how does my provider compare, what does moving the cut-off cost, can the number be trusted, what has been decided |
| `/worklist` | **Worklist** | The list: risk with a position on the scale, the leading risk-raising factor, OKS, conditions, surgery date, review status. Search, four sort orders, band filter, "not yet reviewed" |
| `/patient/:episodeId` | **Patient** | How likely, why (the EBM's own terms, with shape functions), where they sit against the cohort, the full pre-operative record, prior decisions, the model card — and the decision form beside the score |
| `/ask` | **Ask** | A question in English, answered from the governed tables with the query shown, the patients cited as links, and a visible status: grounded, declined, or error |
| `/model` | **How this works** | The model in plain language: what it predicts, why a percentage can be read at face value, how an EBM is a sum of curves, which models were tried and why the interpretable one ships, why accuracy is the wrong measure, who chooses the cut-off, how it differs from the NHS PROMs predicted score, and what it cannot do |

### On provider comparison

There is deliberately **no provider league table** in the clinician surface. An unadjusted
flag rate says who a provider treats, not how well it treats them — a unit seeing worse
pre-operative scores will flag more patients, which is the model working correctly. That
confusion is exactly what NHS PROMs case-mix adjustment exists to prevent, and its
predicted score is the instrument built for that job. `ProviderStat` is still published and
the Ask surface still answers the question, because an analyst asking once with the caveat
attached is a different thing from a ranking sitting permanently on a clinician's screen.

Everything about *your* patients is read through the row-level security policy and
labelled "your list". Everything about the *cohort* — histograms, provider aggregates,
the sweep, the calibration curve — is model-scoped, has no patient in it, and is labelled
as such.

## Scripts

| Script | What it does | Needs Fabric? |
|---|---|---|
| `npm run dev:offline` | Vite dev server against fixtures | no |
| `npm run dev:agent` | Offline fixtures, but Ask goes to the local Data Agent proxy on :8765 | no (needs `az login`) |
| `npm run agent:setup` | Create `tools/.venv` and install `mcp` + `azure-identity` (once) | no |
| `npm run agent:proxy` | Start `tools/agent_proxy.py` from that venv | no (needs `az login`) |
| `npm run dev` | `rayfin up` (minus static hosting), then Vite against the live backend | yes |
| `npm run build` | `rayfin env` + `tsc -b` + `vite build` | reads `rayfin/.env` |
| `npm run build:offline` | Same build, pinned to the fixtures backend | no |
| `npm run lint` | ESLint over `src` and `rayfin` | no |
| `npm run test` | Vitest — chart accessibility, fixture invariants, an end-to-end pass over every screen including Ask | no |

## The Ask surface and the Data Agent

Three backends implement one interface (`src/services/agent/`). `bootstrapApp()` picks
one at boot and the page names it on screen, so a clinician always knows whether they are
talking to a language model or to a query engine.

| Backend | Selected by | What it is | Permissions |
|---|---|---|---|
| **Built-in query engine** | default | Deterministic. Recognises the rehearsed question shapes (notebook 50 §8), runs the equivalent query through the same data service, shows the SQL it stands for, declines everything it cannot ground — including clinical-judgement questions | the signed-in clinician's (RLS) |
| **Fabric Data Agent via local proxy** | `VITE_AGENT_PROXY_URL=http://localhost:8765` | `tools/agent_proxy.py` speaks MCP to the published data agent's endpoint under the presenter's `az login` | the presenter's own |
| **Fabric Data Agent via Rayfin function** | `VITE_AGENT_MODE=function` | `rayfin/functions/src/function_app.ts` makes the same MCP call inside the workspace under a service principal (`rayfin secret set AZURE_CLIENT_SECRET`) | the service principal's |

The proxy path is the rehearsed one for the stage. Why a proxy at all: the browser holds a
Rayfin session, not a Fabric API token, and the data agent's MCP endpoint neither accepts
that token nor answers cross-origin requests.

```bash
# once: publish the data agent in the portal and note its item id
npm run agent:setup          # venv in tools/.venv with mcp + azure-identity
az login --scope "https://api.fabric.microsoft.com/.default"
# tools/.env.agent holds the two item ids (already written, not secret)
npm run agent:proxy          # terminal 1
npm run dev:agent            # terminal 2 — Ask now goes to the real agent
```

For the deployed app, add `VITE_AGENT_PROXY_URL` to `.env.local` before `npm run build`
and keep the proxy running on the presenting laptop; the built-in engine remains the
fallback the moment the proxy is unreachable (the error card says so, it never fakes an
answer).

Rayfin functions are **experimental in 1.34** and `services.functions` stays `enabled:
false` in `rayfin.yml` until the tenant is confirmed to support them. To try the function
path: set `enabled: true`, `cd rayfin/functions && npm install`, `npx rayfin up`, set the
five settings listed at the top of `function_app.ts`, then build the frontend with
`VITE_AGENT_MODE=function`.

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

> **The schema changed twice**: `ProviderStat` is a new entity (overview provider
> comparison and the agent's provider question), and `PatientRisk` / `RiskExplanation`
> each gained an `assignedClinicianEmail` column so assignments can be configured by
> address instead of by GUID. Run `npx rayfin up db apply` before notebook 60, or the
> sync stops at the table check and names what is missing. Notebook 60 §2d writes the
> provider table; §1 takes the assignments.

Useful flags:

```bash
npx rayfin up --dry-run              # preview without calling the API
npx rayfin up --skip-build           # redeploy without rebuilding the frontend
npx rayfin up db apply --force       # allow destructive schema changes (data loss)
npx rayfin up status                 # what is deployed where
```

## Data model

Eight entities in `rayfin/data/`, in two tiers — and the split *is* the security story.

### Patient-scoped — every row filtered against a claim

| Entity | Source | Policy |
|---|---|---|
| `PatientRisk` | `gold.patient_risk` ⋈ `gold.knee_preop_cohort` | `claims.sub == assignedClinicianId` |
| `RiskExplanation` | `gold.risk_explanation` | same, denormalised onto the row |
| `ReviewDecision` | written by the app | `claims.sub == clinicianId` |

### Model-scoped — aggregates and model documentation, no row policy

| Entity | Contents | Why no policy |
|---|---|---|
| `CohortStat` | binned cohort distributions | no patient in it; bins under 5 suppressed |
| `ProviderStat` | one row per provider: headcount, mean risk, flagged, band counts | the value is the comparison across providers; providers under the floor are not written |
| `ModelCurve` | calibration curve, EBM shape functions | describes the model, not a patient |
| `ThresholdOption` | operating-point sweep, per 1,000 | test-set counts over historical episodes |
| `ModelCard` | model provenance, headline metrics, synthetic-data flag | model-card material a reviewing clinician must be able to read |

"No policy" means `read` for any authenticated caller. Data API Builder still requires a
valid session; nothing is granted anonymously.

### How row-level security actually works here

Rayfin policies compare **token claims** against **fields on the row**, and the claim set
is fixed: `sub`, `email`, `role`. There is no `provider_code` claim, so the assignment is
materialised onto the row when notebook 60 syncs gold across — as **two** columns, and the
policy accepts either:

```ts
@role('authenticated', 'read', {
  policy: (claims, item) =>
    claims.sub
      .eq(item.assignedClinicianId)
      .or(claims.email.eq(item.assignedClinicianEmail))
      .or(claims.role.eq('governance')),
})
```

**Use the email.** `assignedClinicianId` is the Rayfin app user id — a bare GUID that does
not exist until that person has signed in once, which makes setting up a demo a
chicken-and-egg problem and makes `CLINICIAN_ASSIGNMENTS` unreadable. An address can be
typed in advance:

```python
CLINICIAN_ASSIGNMENTS = {
    "RJ1": "first.clinician@yourtenant.example",
    "RGT": "second.clinician@yourtenant.example",
    "*":   "first.clinician@yourtenant.example",
}
```

A GUID is still accepted, as is a `(guid, email)` pair. Notebook 60 writes both columns
either way, filling the one you did not give with a sentinel that matches nothing — never
an empty string, which could collide with an absent claim.

The id branch stays because it is the path verified to work on 2026-08-31, and because
whether Data API Builder receives an `email` claim for a Fabric-brokered session is a
property of the platform rather than of this app. The Fabric broker does carry the address
in the token — top-level `email`, or `xms_attr.<appId>.rfn_email` for a managed-hosting
token (see `extractEmailFromToken` in `rayfin-auth/dist/Auth.js`) — so it should arrive;
writing both columns costs nothing and means the demo works whichever claim lands.

To read your own id and email, sign in and run this in the browser console:

```js
const k = Object.keys(localStorage).find(k => k.includes('authSession'));
const s = JSON.parse(localStorage.getItem(k));
console.log(s.user);                       // { id, email }
console.log(JSON.parse(atob(s.accessToken.split('.')[1]
  .replace(/-/g,'+').replace(/_/g,'/'))));  // every claim in the token
```

That works on the deployed app; the dev panel does not, because it is tree-shaken out of
the production bundle.

Enforcement is in Data API Builder, **not** in the frontend. `RayfinDataService` contains
no `WHERE` clause on clinician or provider, deliberately — and neither do the two list
reads (`listExplanations`, `listDecisions`) the overview and worklist use. A clinician who
rewrites the GraphQL query in devtools still gets only their own rows. The same applies to
a deep link: `/patient/:episodeId` re-queries the patient. Neither assignment column is
ever selected by the app; a column that is only a security key does not belong in a
response body.

**Seeing an empty list?** The assignment did not match. Check what was written against who
you are:

```sql
SELECT assignedClinicianId, assignedClinicianEmail, COUNT(*)
FROM dbo.PatientRisks GROUP BY assignedClinicianId, assignedClinicianEmail;
```

### The oversight record

`ReviewDecision` is the only entity the app writes. Every decision carries the clinical
decision, a **required** rationale with a 20-character floor, an explicit
`agreed` / `overridden` flag, the risk score **as shown at decision time**, and the model
version the clinician actually saw. Nothing is pre-selected; agree and override are the
same shape and size. The overview's override rate is the cheapest drift detector you will
ever build.

## Layout

```
rayfin/data/          entity classes — rayfin up reads these
rayfin/functions/     askDataAgent — the experimental in-estate agent path
tools/agent_proxy.py  local MCP proxy to a published Fabric Data Agent
src/
  brand.ts            the fictional organisation, in one place
  clinical.ts         OKS, EQ-5D-3L, comorbidities, risk bands, log-odds → English,
                      and every feature code → what the patient actually answered
  main.css            the whole token layer: light, dark, the four-band risk ramp, type
  services/
    types.ts              row shapes + the ClinicalDataService interface
    patients.ts           the public data API the UI calls
    RayfinDataService     governed reads through Data API Builder
    OfflineDataService    the fixtures backend
    fixtures.ts           the generated synthetic cohort
    bootstrap.ts          picks the data backend and the agent backend, once, at boot
    agent/                AgentService + Local / Proxy / Function implementations
  pages/
    OverviewPage      service analytics
    CohortPage        the worklist
    PatientPage       one patient: record, score, explanation, model, decision
    AskPage           the grounded question surface
  components/
    charts/           every visualisation, inline SVG — no charting dependency
    DecisionForm      the human-oversight capture
    DecisionHistory   prior decisions on this patient
```

### Saying what a value means

`describeFeatureValue` in `src/clinical.ts` turns a model feature and its raw
value into the questionnaire's own words: `oks_t0_washing = 0` becomes
*"Impossible to do"*, `t0_mobility = 3` becomes *"Confined to bed"*,
`t0_previous_surgery = 1` becomes *"Yes"*.

Every scale is transcribed from the **NHS PROMs Data Dictionary v3.4** in
`references/nhs/`, not inferred, and each Oxford Knee Score item carries its own
five answers — "Rarely/Never" for limping is not the same answer as "No trouble
at all" for washing. The direction is the point: **0 is the worst answer on an
OKS item**, and a clinician scanning a screen has every reason to read a bare
zero as "nothing to see here". The raw code and the question behind it stay on
screen underneath, because the value of a glassbox model is that its inputs can
be checked against the patient.

### Charts

All inline SVG — no charting library, no CDN script, no runtime fetch. Every chart goes
through `ChartFrame`: a plain-English caption, a stated denominator, a real `aria-label`,
and a table of the underlying numbers behind a `<details>`.

| Component | The question it answers |
|---|---|
| `SurgeryTimeline` | Who is coming to theatre each week, and in which band? |
| `DriverFrequency` | Which factors are doing the work across my list? |
| `OperatingPointExplorer` | What does moving the cut-off cost, per 1,000 and on my list? |
| `SegmentedBar` | Reviewed vs not; agreed vs overrode |
| `IconArray` · `RiskLadder` · `CohortDistribution` | How likely, which band, where against everyone |
| `ContributionChart` · `ShapeFunction` | Why this score, and what would change it |
| `CalibrationCurve` · `ThresholdTradeoff` | Can I trust the number, and where is the cut-off |
| `BandDistribution` · `SubscaleMeter` | What is on my list; the OKS broken out |

## Theme, type and accessibility

Light by default, regardless of the operating system — the app is projected and printed.
Dark applies only if a user has stored an explicit `mf-theme = dark` preference; the inline
script in `index.html` resolves that before first paint. Type is self-hosted from npm packages
and bundled — **Inter** for everything a clinician reads, **IBM Plex Mono** for identifiers
and code — so a page served from Fabric static hosting makes no third-party request to
render its own text. Surfaces are flat (a border carries the edge, no shadows), corners are
tight, and the header carries underlined tabs rather than filled pills.

The four-band risk ramp is unchanged from the audited build and never relies on hue: every
band carries a four-block glyph, its name in words, and a position on a shared scale. The
ramp is monotone in greyscale in both themes; every text/background pair is ≥ 4.5:1 and
every chart mark ≥ 3:1 against its surface.

## Environment variables

`rayfin env --framework vite` writes `.env.local` after deployment. Manual overrides:

| Variable | Purpose |
|---|---|
| `VITE_OFFLINE_DEMO` | `true` → fixtures, no backend. Normally set by `--mode offline`, not by hand |
| `VITE_AGENT_PROXY_URL` | Base URL of `tools/agent_proxy.py`; selects the Data Agent path for Ask |
| `VITE_AGENT_MODE` | `function` → the Rayfin-function Data Agent path (experimental) |
| `VITE_RAYFIN_API_URL` | Rayfin backend |
| `VITE_RAYFIN_PUBLISHABLE_KEY` | required against a deployed backend |
| `VITE_FABRIC_WORKSPACE_ID` | required for Entra sign-in |
| `VITE_FABRIC_ITEM_ID` | the Fabric App item id |
| `VITE_FABRIC_PORTAL_URL` | `https://app.fabric.microsoft.com` |
| `VITE_ROUTER` | `hash` → hash routing, if a hard refresh on a deep link 404s |

The Fabric path never falls back to fixtures. If the backend is unreachable, `bootstrapApp`
throws at boot.

## Rehearsal checklist

- [ ] `npm run dev:offline` works on the presenting laptop, offline, on battery
- [ ] `npm run test` and `npm run lint` pass
- [ ] `npx rayfin up db apply` has run since `ProviderStat` was added
- [ ] Notebook 60 ran after 50, and its table check found all eight tables
- [ ] Two demo clinician accounts assigned to different providers in notebook 60
- [ ] Sign in as each and confirm the two lists differ — then show it in devtools
- [ ] Paste one clinician's episode id into the other's URL bar and get the empty state
- [ ] `az login --scope "https://api.fabric.microsoft.com/.default"` is fresh (the token expires and MFA policy forces a re-login)
- [ ] Data agent published; `npm run agent:proxy` answers `GET /health`; the four scripted questions on `/ask` come back grounded and the fifth is declined
- [ ] Hard-refresh a `/patient/:episodeId` URL on the **deployed** host; if it 404s, set `VITE_ROUTER=hash` and rebuild
- [ ] A recorded `ReviewDecision` survives a page reload and appears on the overview
- [ ] `DATASET_IS_SYNTHETIC` in notebook 60 matches reality, and the banner agrees
- [ ] Sensitivity label applied to the SQL database and the Fabric App items
- [ ] Static hosting URL loads on the venue network *and* on a phone hotspot
