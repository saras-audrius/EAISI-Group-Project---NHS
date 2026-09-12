# Knee Outcome Review — UX audit and design direction

A review and redesign of the Rayfin clinician app in `fabric/rayfin-clinician-app`.
Line references are to the code **as it was before this work**; the fix column describes
what is now in the tree.

---

## 1. UX audit

Findings are ordered by severity, and split by kind. The distinction that matters is
whether a defect can lead a clinician to a wrong conclusion about a patient (**safety**),
stop them working (**usability**), or merely look bad (**cosmetic**). Three of the
cosmetic-looking findings turned out to be safety findings on inspection, which is the
usual pattern.

### 1.1 Patient-safety risks

**S1 — A clinician was asked to review a patient they could not see.**
`src/pages/PatientPage.tsx:75-95`, `src/services/patients.ts:49-63`

The patient page showed eight facts: name, age band, region, provider, episode id,
pre-op OKS total, comorbidity **count**, surgery date. `gold.knee_features` carries the
three OKS subscales, the twelve individual comorbidities, the five EQ-5D-3L dimensions,
symptom duration, previous surgery, living arrangements, disability, assisted completion
and sex — none of it synced, none of it shown.

*Why it matters clinically.* Oversight of a risk score means being able to disagree with
it, and disagreement requires the evidence the score was computed from. "Three long-term
conditions" and "diabetes, depression, arthritis" are not the same clinical fact, and only
the second tells a clinician whether "optimise before surgery" is an actionable
suggestion. Two patients with an OKS of 22 driven respectively by pain and by loss of
function are different pre-operative problems with different options. A reviewer given
only the total is not overseeing the model; they are ratifying it. This is the single
most serious defect in the app.

*Fix.* `PatientRisk` extended with the full pre-operative record; notebook 60 now joins
`gold.patient_risk` to `gold.knee_preop_cohort` to carry it. The patient page shows the
OKS broken into total/pain/function/ADL against the cohort median, all twelve conditions
individually with present / not-present / **not recorded** distinguished, the EQ-5D-3L
profile in the instrument's own wording, and the context block.

**S2 — The oversight log was write-only.**
`src/services/patients.ts:91-107` (`getDecisions` defined, never called)

Decisions could be recorded and never read back. A second clinician opening a patient had
no way to know a colleague had already reviewed them, what they decided, or whether they
had overridden the model.

*Why it matters clinically.* Duplicated or contradictory review of the same patient, with
no visibility of either. It also defeats the app's own governance claim: an oversight
record nobody can read is an audit trail, not a clinical handover, and the second reviewer
is the person who most needs it.

*Fix.* `DecisionHistory`, wired to `getDecisions()`, showing who, when, what, agreed or
overridden, the score **as shown at the time**, and the model version it was shown under —
with an explicit flag when the current score has since moved.

**S3 — A failed fetch rendered as an absent finding.**
`src/pages/PatientPage.tsx:27-33`

```ts
getExplanation(patient.episodeId)
  .then((r) => { if (!cancelled) setRows(r); })
  .finally(() => { if (!cancelled) setLoading(false); });
```

No `.catch()`. A failed request left `rows` at `[]`, and `ExplanationChart` renders `[]`
as the sentence *"No explanation recorded for this patient."*

*Why it matters clinically.* The failure mode is silent and its message is affirmatively
wrong: a network error becomes a statement that the model had no contributing factors.
A clinician reads absence of a chart as absence of a finding.

*Fix.* `useAsync` makes loading / error / empty three distinct states with a retry, and
every chart's empty state now says the *data* is missing and names what would produce it,
never that the finding is absent.

**S4 — A stale success message could carry across patients.**
`src/components/DecisionForm.tsx:34`, `src/pages/PatientPage.tsx:19`

`saved` was never reset, and `PatientPage` did not remount per patient. Record a decision
for patient A, go back, open patient B, and *"Decision recorded against model version 3"*
is still on screen — under B's name.

*Why it matters clinically.* It asserts, on the record page of a patient who has not been
reviewed, that they have been. Combined with **S2** — no visible decision log to
contradict it — there was nothing on screen to catch the error.

*Fix.* The form resets on `episodeId` change, the success message names the score and
version it was recorded against, and the decision log below refreshes on write.

**S5 — The form's fastest path was to endorse the model unread.**
`src/components/DecisionForm.tsx:30,32`

```ts
const [decision, setDecision] = useState<string>('proceed');
const [agreement, setAgreement] = useState('agreed');
```

Both pre-selected. A clinician could open a patient and submit "proceed / agreed" with a
one-character rationale (`rationale.trim().length === 0` was the only bar) without reading
anything.

*Why it matters clinically.* This is textbook automation bias — the commission error the
CDS literature describes, designed straight into the default state. The recorded artefact
would show apparent oversight where none occurred, which is worse than no record, because
it is affirmative evidence of a review that did not happen.

*Fix.* Nothing is pre-selected; both choices are required; the two agreement options are
the same shape, size and order so overriding is never the harder path; neither is worded as
the model being right ("The score matches my assessment" / "My assessment differs from the
score"); the rationale has a 20-character floor.

**S6 — The risk band was carried by colour alone.**
`src/components/RiskBadge.tsx:1-6`, `src/main.css:16-19`

Four solid background colours, white text, band name in words but at 80% opacity beside
the number. `--color-risk-moderate: #b8860b` against white is 3.0:1 — below AA for body
text. `--color-risk-high` (`#d4351c`) and `--color-risk-very-high` (`#8b0000`) are close
in hue and, for a deuteranope, close to `--color-risk-low` (`#00703c`) as well.

*Why it matters clinically.* Roughly one man in twelve cannot reliably separate the high
band from the low one by hue. The screen is also projected and printed. A triage signal
that survives neither is not a triage signal.

*Fix.* Three encodings, colour third: a four-block glyph (`▮▯▯▯` … `▮▮▮▮`), the band name
in words, and position on a shared scale. The ramp is monotone in greyscale in both themes.
Contrast values in §2.3.

**S7 — Log-odds shown raw to a clinical audience.**
`src/components/ExplanationChart.tsx:66-68,74-78`

Each bar was labelled `+0.42` with a footnote explaining that bars "show each factor's
contribution to the log-odds of a poor outcome".

*Why it matters clinically.* `+0.42` is not a quantity a clinician can act on, and its
presence invites a nod rather than a question — the failure that made deterioration scores
ignorable. It is also unanchored: with no axis, the same picture describes a decisive
factor and a negligible one.

*Fix.* Log-odds kept (they are the model's real units and the axis is labelled as such),
plus a plain-English translation on every row: *"multiplies the odds of a poor outcome by
about 1.5"*.

**S8 — The feature value was unreadable, so the explanation was uncheckable.**
`src/components/ExplanationChart.tsx:35-37` — rendered `value 3`.

*Why it matters clinically.* The whole value of a glassbox model is that a clinician can
check its inputs against the patient in front of them. `value 3` cannot be checked against
anything. *Fix.* Values are labelled with their meaning and unit, and selecting a factor
opens its shape function with the patient's value marked.

**S9 — "The probability is calibrated, so the number means what it says" with no evidence.**
`src/pages/PatientPage.tsx:134-137`

The app's central claim to a clinician, asserted in prose, with no calibration curve, no
test-set size, no performance figure, and no model card anywhere in the UI.

*Why it matters clinically.* Under a DCB0129/0160 framing, a decision-support UI must not
imply more certainty than the evidence supports, and "trust this number because we say it
is calibrated" is exactly that. *Fix.* `ModelCurve` / `ModelCard` / `ThresholdOption`
entities and a "Can I trust this number?" panel: calibration curve with Wilson intervals
and per-decile counts, prevalence, average precision against the no-skill baseline,
calibration error, known limitations, and the operating-point trade-off in patients.

**S10 — The footer misstated the security mechanism, and a field comment contradicted its own class.**
`src/App.tsx:100-108`, `rayfin/data/PatientRisk.ts:67`

The footer said access is "filtered by provider through row-level security". It is
filtered **per clinician** — the policy is `claims.sub == assignedClinicianId`; provider is
only how the assignment is *configured* in notebook 60. Separately, the field comment read
*"Entra object id of the responsible clinician"* while the class docstring twelve lines
above says, with empirical evidence, that it is **not** the Entra object id.

*Why it matters.* This is the documentation an on-call engineer reads at 2am and the claim
a governance reviewer checks. Both were wrong in the same file that gets it right
elsewhere. *Fix.* Both corrected; the two-tier security model is now stated explicitly in
`schema.ts`, the README, and a printed block in notebook 60 §5.

### 1.2 Usability defects

**U1 — No routing at all.** `src/App.tsx:11` — patient selection was `useState`.
`react-router-dom` was installed and unused. No URL per patient: no browser back, no deep
link, no refresh survival, no way to send a colleague the record you are looking at. A
reload mid-rationale dropped the clinician to the list and discarded the text.
*Fix.* `/` and `/patient/:episodeId`, with the patient re-queried on load so the RLS policy
is evaluated on the deep link exactly as on the list.

**U2 — The cohort table was unreachable by keyboard.**
`src/pages/CohortPage.tsx:59-63` — `<tr onClick>` with no `role`, no `tabIndex`, no key
handler. Not focusable, not announced as actionable, not activatable by Enter, not
openable in a new tab.
*Fix.* A real `<Link>` in the first cell carries the semantics; the row click is a
convenience layered on top.

**U3 — No search, sort, filter or pagination.** `src/pages/CohortPage.tsx:46-89` — one
fixed order, highest risk first, with no way to find a named patient or see next
Thursday's list.
*Fix.* Search across name / episode id / provider, four sort orders, multi-select band
filter with live counts.

**U4 — No loading, error or empty states anywhere except one bare "Loading…" line.**
*Fix.* Skeletons, retryable error states and distinct empty states for every fetch.

**U5 — A raw GUID and a copy button in the clinician header.**
`src/App.tsx:64-84`, with a five-line comment about `CLINICIAN_ASSIGNMENTS`. The value is
genuinely needed and obtainable no other way — but it is a deployment affordance sitting in
the clinical surface.
*Fix.* Moved to a collapsed dev-only panel, guarded by `import.meta.env.DEV` so it is
tree-shaken out of the deployed bundle.

**U6 — The README documented a mode that did not exist.** `npm run dev:offline` and
`src/services/fixtures.ts` were both documented, including a rehearsal checklist item for
running offline on battery. Neither existed, and `bootstrap.ts:22-26` explicitly said no
offline path would ever be added. The app could not be run, reviewed or tested without a
live Fabric tenant and an Entra sign-in.
*Fix.* Both now exist, and the README is true. The reasoning in that comment was right and
is preserved — the Fabric path still never falls back — but "no silent fallback" and "no
offline mode at all" are different requirements, and only the first one is load-bearing.

### 1.3 Cosmetic

**C1 — "Todo App" on the sign-in screen.** `src/components/AuthPage.tsx:54`. Untouched
template boilerplate on the first screen anyone sees. Filed as cosmetic, but it is close to
a safety finding: the sign-in page is where a clinical system declares whose it is, what it
does, and what it does not do, and this one declared none of those before the button.

**C2 — NHS design system as the visual identity.** `src/main.css:6-13` hardcoded
`--color-nhs-*`. A teaching prototype wearing the livery of a real health service reads as
an official product. Filed as cosmetic; it is arguably governance.

**C3 — Inter loaded from Google Fonts.** `index.html:7-13` — a third-party request from a
hosted clinical app, and a render-blocking dependency on a network the venue may not have.

**C4 — `@custom-variant dark` declared and never used.** `src/main.css:3`.

**C5 — Decorative gradient and two blur circles on the auth page.**
`src/components/AuthPage.tsx:45-48`.

**C6 — One type size, one card style, no hierarchy.** Grey text on pale grey throughout.

**C7 — `role="status"` on a static risk value.** `src/components/RiskBadge.tsx:32` —
`status` is a live region; the badge is not live. `role="img"` with a label is correct.

---

## 2. Design direction

### 2.1 What the research says, and what I took from it

**ACS NSQIP Surgical Risk Calculator** — the closest real analogue: pre-operative,
per-patient, multi-outcome, and built explicitly as *"a decision aid and informed consent
tool for patients and surgeons"* (Bilimoria et al., *J Am Coll Surg* 2013). The idea I took
is the one it is most copied for: **show the patient against the average patient**. An
unanchored number cannot be reasoned with. Every scale in the redesign has a reference
class — the cohort distribution behind the risk, the median tick on each OKS subscale, the
no-skill baseline beside average precision.

**Predict: Breast Cancer** (predict.nhs.uk; Farmer et al., *Cancer Medicine* 2021 —
redevelopment with the Winton Centre) — the reference example of communicating a model's
output to clinician *and* patient. Four things taken directly:

- **Multiple simultaneous formats.** Their focus groups used seeing results several ways as
  a comprehension check. Here: the percentage, the icon array, the ladder, and a table
  behind every chart.
- **Clinicians wanted the table.** Tables let an MDT inspect small increments that a plot
  flattens. Hence `ChartFrame`'s mandatory `<details>` with the underlying numbers.
- **Simplicity-first defaults.** They default to whole numbers with precision on demand,
  and ship uncertainty ranges *off by default*. I followed the first and deliberately
  broke the second — see §2.6.
- **Abstract icons, not human figures.** They found human-shaped icons upsetting when the
  outcome is bad. The icon array here is dots.

**Duke Sepsis Watch** and the **Epic Deterioration Index / sepsis model** — the useful part
of this literature is the failure analysis, not the successes. Two lessons:

- *A score without a reason is a score that gets ignored.* Sepsis Watch's own design work
  identified feature-importance display as necessary for clinician trust; Epic's sepsis
  model became a byword for alert fatigue partly because it arrived as a number with an
  advisory attached and no visible reasoning.
- *Fatigue is a design parameter.* Sepsis Watch fires only above a threshold. This app has
  no alerting surface, so the equivalent risk is different: a worklist sorted only by model
  risk makes the model the agenda. Hence four sort orders, with the model's order as one of
  them rather than the only one.

**DeepMind / Royal Free Streams (AKI)** — the published design work (ustwo; Connell et al.,
service evaluation 2017) is a study in putting the *patient record* next to the alert:
hundreds of hours of clinician shadowing produced a screen where the deterioration signal
sits alongside the bloods, the trend and the protocol, not alone. That is the direct
ancestor of finding **S1** and of the decision to widen `PatientRisk` rather than to make
the existing eight fields prettier.

**MDCalc** — the layout convention a clinician already has in their hands: score, then the
inputs that produced it, then the evidence, then "next steps" in words. The patient page
follows that order.

**Gigerenzer on natural frequencies; Spiegelhalter on communicating uncertainty.**
Natural frequencies ("34 in 100") are understood by readers whom conditional probabilities
defeat, and low numeracy is common in exactly the pre-operative conversation this screen
supports; a stated reference class is the essential part. Spiegelhalter's position — that
percentages *and* frequencies are both needed, rather than one replacing the other — is why
the icon array sits beside the percentage rather than instead of it, and why the caption
always names the denominator.

**Icon arrays / pictogram grids** are the evidence-backed rendering of a natural frequency,
and are most helpful for low-numeracy readers. Shaded contiguously from the top left, so
the proportion reads by area as well as by count.

**Automation bias in CDS, and the "five rights."** The five rights (right information,
right person, right format, right channel, right time) shaped the *order* of the patient
page — who → how likely → why → what would change it → what do I know about them → can I
trust it → decide — and the decision panel's position beside the score rather than below
six charts. The automation-bias literature shaped the form: no defaults, symmetric
agree/override, mandatory rationale with a floor. See **S5**.

**DCB0129 / DCB0160.** These are clinical risk management standards for the manufacture and
the deployment of health IT; they require a hazard log and a clinical safety case rather
than prescribing UI text. The design consequence taken here is a boundary: the UI must
never read as an authorisation, a refusal, a prioritisation or a scheduling instruction.
The disclaimer is in one constant (`src/brand.ts`), rendered on the sign-in page, the
patient page and every footer, and the decision vocabulary is deliberately clinical
(*proceed / optimise first / discuss alternatives / defer*) rather than administrative.

**Where a pattern did not fit.** NSQIP and Predict both present a *continuous* risk and
avoid banding it. This app bands into four, because the bands exist upstream in
`50_batch_score` as a clinical policy decision and are in the data. Banding a calibrated
probability discards information and encourages threshold-thinking — so rather than adopt
the pattern or drop the bands, the ladder draws the band boundaries at their true positions
and states the distance to the nearer edge in percentage points. 39% and 21% are both
"moderate" and are not the same conversation.

### 2.2 The brand

**Marrowfield Orthopaedic Centre.** Invented, and obviously so — the name is carried
everywhere with the qualifier *"Fictional trust · demonstration system"*, and both the
sign-in page and the footer state in full sentences that the organisation does not exist.
No NHS blue, no NHS typeface, no lockup, no emblem that could be mistaken for a real
organisation's; the mark is two offset bars on a rule, drawn inline as SVG.

What stays real and accurately named: the Oxford Knee Score and its three subscales, the
EQ-5D-3L descriptive system (quoted per dimension — "confined to bed" is not "extreme
problems"), the 7-point MCID, and NHS PROMs as the data source of the underlying model.
The branding is replaced; the provenance is not fabricated.

### 2.3 Tokens

Two families that never share a hue: the chrome has one accent, and the risk ramp is
separate. A colour that means "interactive" must not also be able to mean "at risk".

| Role | Light | Dark |
|---|---|---|
| surface | `#fbfaf8` | `#121513` |
| elevated | `#ffffff` | `#1a1e1c` |
| line | `#e2dfd9` | `#2f3633` |
| text primary | `#191c1a` | `#edf0ee` |
| text secondary | `#585e5a` | `#a6afaa` |
| accent | `#0b5c55` | `#5fd3bc` |

**Text contrast, measured** (WCAG 2.2 AA needs 4.5:1 for body text):

| Pair | Light | Dark |
|---|---|---|
| primary on surface | 16.5:1 | 16.0:1 |
| primary on elevated | 17.2:1 | 14.7:1 |
| secondary on surface | 6.4:1 | 8.2:1 |
| secondary on elevated | 6.6:1 | 7.5:1 |
| accent text on elevated | 10.1:1 | 10.8:1 |
| button label on accent | 7.9:1 | 10.4:1 |

**The risk ramp.** Three values per band. `ink` is readable text, `tint` is the badge
background, `mark` is the chart fill.

| Band | Light ink / tint | Light badge | Dark ink / tint | Dark badge |
|---|---|---|---|---|
| Low | `#1e7a5c` on `#e4f2ec` | 4.6:1 | `#4fbf95` on `#12291f` | 6.8:1 |
| Moderate | `#8a5a08` on `#f6ebd8` | 5.0:1 | `#d9a441` on `#2b2113` | 7.0:1 |
| High | `#b0442a` on `#fae7e1` | 4.7:1 | `#f0785a` on `#31170f` | 6.0:1 |
| Very high | `#7a1230` on `#f7e2e7` | 8.7:1 | `#ff9bb0` on `#33141c` | 8.4:1 |

Chart marks against their surface, all clearing the 3:1 non-text minimum (WCAG 1.4.11):

| Band | Light mark | vs surface | Greyscale | Dark mark | vs surface | Greyscale |
|---|---|---|---|---|---|---|
| Low | `#5e9e85` | 3.0:1 | 73 | `#4c9e82` | 5.7:1 | 70 |
| Moderate | `#ae7a1c` | 3.6:1 | 59 | `#b98e3a` | 6.1:1 | 76 |
| High | `#c0512f` | 4.5:1 | 44 | `#de8464` | 6.6:1 | 84 |
| Very high | `#6b1130` | 11.5:1 | 10 | `#ffaec0` | 10.6:1 | 141 |

The greyscale column is the point: **73 → 59 → 44 → 10** and **70 → 76 → 84 → 141** are
both monotone, so a projector or a monochrome printout preserves the ordering that hue
carried. And colour is never the only channel anyway — every band also carries a four-block
glyph and its name.

### 2.4 Type

System stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, …`), self-hosted
by definition: nothing is fetched at runtime, so the app renders identically on a venue
network, a hotspot, and no network at all.

Five steps, tight at the bottom because this is a worklist: `micro` 11px · `small` 13px ·
`body` 15px · `lead` 18px · `title` 24px, plus `display` 44px used once per patient page for
the headline probability. Anything larger would be a marketing decision. Tabular numerals
on every table and figure so columns align and a score can be compared down a list.

### 2.5 Layout

A single-row sticky header, no hero, no gradients, no decorative blur. The patient page is
a 1.9 : 1 split — reasoning on the left, oversight on the right — collapsing to one column
below `lg` so it works on a clinic-room laptop. The decision panel sits beside the score
rather than at the bottom: a decision recorded after scrolling past six charts is a decision
recorded by somebody who has stopped reading.

Reading order is the question order (§2.1, five rights). The 30-second test — who is this,
how likely, why, how sure, what are my options — is answerable without scrolling past the
first screenful on a 1440×900 display: header, score, icon array, ladder, and the decision
panel are all above the fold; "why" is the next section; "can I trust it" is a full-width
band at the bottom, which is the right place for it because it is a property of the model,
not of this patient.

### 2.6 Charts

Inline SVG, written here. **No charting dependency was added** — not on bundle-size grounds
alone (though the offline bundle is 318 kB / 102 kB gzipped, and Recharts alone would have
roughly doubled it) but because every chart in this app needs custom annotation: band
thresholds drawn on a histogram, a patient marker on a shape function, a stacked
trade-off labelled in patients rather than rates. Configuring a general-purpose library into
those shapes is more code than drawing them, and leaves the accessibility contract in the
library's hands.

`ChartFrame` makes four things structural rather than optional, because each is something a
reviewer would otherwise have to remember every time:

1. a caption in plain English saying what the chart *means*;
2. a stated denominator;
3. an `aria-label` that is a real sentence;
4. a text equivalent — a `<details>` table, keyboard reachable, and useful to sighted users
   too (Predict's clinicians asked for exactly this).

The SVG is `aria-hidden`; the label and the table carry the meaning. Interactive elements
are HTML buttons layered beside the SVG, never `<g onClick>`, so focus order and screen
reader semantics are real.

**On uncertainty, I deliberately diverged from Predict.** They ship uncertainty ranges off
by default, to avoid overwhelming users. Here the calibration curve draws its 95% Wilson
intervals always, and the shape functions always draw their band. The reason is the
audience and the claim: this screen's central assertion to a clinician is *"the number can
be read at face value"*, and the evidence for that assertion has to arrive with its
error bars or it is just a stronger assertion. A decile computed from forty patients and one
computed from four thousand should not look identical.

### 2.7 Where I disagree with the brief

Delivered as specified in every case; recorded here because they are design arguments, not
implementation notes.

1. **The icon array is aimed at the wrong reader.** The evidence for icon arrays is
   strongest for *patient* communication and low numeracy; Farmer et al. found clinicians
   preferred tables for inspecting small differences. In a clinician-only view I would
   demote it. I kept it prominent because the stated purpose is a conversation the clinician
   has *with* the patient, and it is the artefact you turn the screen round for — but it
   sits beside the percentage, not instead of it.

2. **The four bands are a liability.** Banding a calibrated probability throws information
   away and invites exactly the threshold-thinking that the decision-curve analysis in
   notebook 42 argues against. NSQIP and Predict both avoid it. They stay because they are
   a clinical policy decision made upstream and are in the data — but the ladder and the
   distance-to-edge sentence exist to blunt them, and if the service will accept it I would
   argue for dropping the bands from the patient page entirely and keeping them only for
   worklist triage.

3. **Sorting the worklist by model risk by default makes the model the agenda** — the core
   lesson of the deterioration-score literature. I kept risk-first because it is the
   existing behaviour and changing it silently would be worse, but I think the honest
   default is surgery date, with risk as a column you sort by when you choose to.

4. **"Poor outcome" is loaded framing.** Predict leads with survival, not death. The same
   number framed as "about 66 in 100 gain a meaningful improvement" reads very differently
   at a bedside, and neither framing is more true. The icon array's table gives both counts;
   I would go further and let the clinician flip the headline.

---

## 3. What changed, by area

| Area | Change |
|---|---|
| Brand | NHS tokens removed; Marrowfield identity, light + dark, working three-way theme control; no external font request |
| Routing | `/` and `/patient/:episodeId`; deep link re-queries and re-evaluates RLS; `VITE_ROUTER=hash` escape hatch (Rayfin's `staticHosting` exposes no SPA-fallback setting) |
| Data model | `PatientRisk` widened to the full pre-operative record; `CohortStat`, `ModelCurve`, `ThresholdOption`, `ModelCard` added; RLS unchanged on all three patient-scoped entities, and the absence of a policy on the four model-scoped ones documented as a decision |
| Notebook 60 | Joins `gold.knee_preop_cohort`; recodes booleans with a printed verification of the coding; builds cohort histograms with small-cell suppression; publishes calibration, shape functions, the threshold sweep and the model card — preferring gold artefacts from notebooks 42/43 and recomputing only as a fallback |
| Cohort view | Search, four sorts, band filter with counts, keyboard-reachable rows, band distribution chart |
| Patient view | Clinical summary; OKS broken out against the cohort; twelve comorbidities individually; EQ-5D-3L profile; pre-operative context; prior decisions; nine chart components |
| Oversight | Nothing pre-selected, symmetric agree/override, rationale floor, decision log wired up, GUID moved to a dev-only panel |
| Offline | `OfflineDataService` + generated fixtures + `npm run dev:offline`; the Fabric path still never falls back |
| Tests | 47 tests: chart accessible labels and empty states, fixture invariants (the explanation really does sum to the score), and an end-to-end pass over sign-in, list, filter, deep link and decision recording |
