import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2];
const exe = '/Users/sarasaudrius/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CSS = `
*{box-sizing:border-box} body{margin:0;background:#fff;font-family:"Segoe UI",Helvetica,Arial,sans-serif;color:#16211E;-webkit-font-smoothing:antialiased}
#card{display:inline-block;padding:2px}
.code{background:#F6F8F7;border:1px solid #D6DEDB;border-radius:8px;padding:26px 30px;font-family:Menlo,Consolas,"SF Mono",monospace;font-size:15.5px;line-height:1.65;color:#16211E;white-space:pre}
.hd{display:flex;justify-content:space-between;gap:24px;font-family:"Segoe UI",Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6B7370;margin-bottom:16px;font-weight:600}
.k{color:#8A3B8F}.s{color:#0B6E4F}.c{color:#7E8A87}.n{color:#1F5AA6}.hl{background:#E4EFEB;border-radius:3px;padding:1px 5px}.fn{color:#003E34;font-weight:600}.t{color:#003E34;font-weight:600}
.row{display:flex;gap:16px;margin-top:16px}.col{flex:1}
.box{border:1px solid #D6DEDB;border-radius:8px;padding:16px 18px;background:#fff;font-size:14px;line-height:1.5}
.box.accent{background:#E4EFEB;border-color:#B7CFC8}.box.warn{border-color:#D48A8A}.box.gold{background:#FBF5E6;border-color:#E0CF9D}
.lbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6B7370;font-weight:600;margin-bottom:6px}.lbl.red{color:#C94E4E}.lbl.green{color:#003E34}
.big{font-size:18px;font-weight:600;color:#16211E}.muted{color:#6B7370}
.arrow{display:flex;align-items:center;justify-content:center;color:#BB9F45;font-size:30px;font-weight:700;padding:0 4px}
.chip{display:inline-block;font-family:Menlo,monospace;font-size:12px;background:#EFF5F3;border:1px solid #CFE0DB;border-radius:4px;padding:2px 7px;color:#003E34}
.chip.gold{background:#FBF5E6;border-color:#E0CF9D;color:#7A5E12}.chip.red{background:#FBEAEA;border-color:#E3B4B4;color:#9C3B3B}
table{border-collapse:collapse;width:100%;font-size:14px}th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6B7370;padding:8px 10px;border-bottom:1px solid #D6DEDB}td{padding:9px 10px;border-bottom:1px solid #E8EEEC;vertical-align:middle}tr.ship td{background:#E4EFEB;font-weight:600}
.term{background:#F6F8F7;border:1px solid #D6DEDB;border-radius:8px;padding:22px 26px;font-family:Menlo,Consolas,monospace;font-size:17px;color:#16211E}
h3{margin:0 0 6px;font-size:18px}p{margin:0}
`;
const cards = {
sentinel: [1100, `
<div class="code"><div class="hd"><span>The sentinel trap</span><span>20_silver_clean · 31_data_exploration §7</span></div><span class="c"># NHS PROMs encodes "not answered" as 9 — EXCEPT on the twelve
# comorbidity flags, where 1 means yes and 9 means NO.
# Same code, opposite meaning, same file.</span>

<span class="hl"><span class="k">assert</span> silver.filter(<span class="s">"t0_mobility = 9"</span>).count() == <span class="n">0</span></span>,   <span class="s">"sentinel survived"</span>
<span class="hl"><span class="k">assert</span> silver.filter(<span class="s">"heart_disease = 9"</span>).count() == <span class="n">0</span></span>, <span class="s">"9 not recoded to 0"</span></div>
<div class="row"><div class="box warn col"><div class="lbl red">Read 9 as missing on a comorbidity</div>You invert twelve features at once, and the model learns that heart disease protects the knee.</div>
<div class="box warn col"><div class="lbl red">Read 9 as a value elsewhere</div>You train a model that believes mobility runs 1–9 on a 1–3 scale. No AutoML finds this for you.</div></div>`],

leakage: [950, `
<div class="code"><div class="hd"><span>40_train_register · §3</span><span>The leakage guard</span></div><span class="c"># GUARD 1 — no post-operative column may reach the feature matrix.</span>
leaks = [c <span class="k">for</span> c <span class="k">in</span> FEATURE_COLUMNS
         <span class="k">if</span> c.startswith(<span class="s">"t1_"</span>) <span class="k">or</span> <span class="s">"_t1_"</span> <span class="k">in</span> c
         <span class="k">or</span> c <span class="k">in</span> (<span class="s">"oks_delta"</span>, <span class="s">"oks_t1_score"</span>)]
<span class="hl"><span class="k">assert not</span> leaks</span>, f<span class="s">"Post-operative leakage in FEATURE_COLUMNS: {leaks}"</span>

<span class="c"># GUARD 2 — every declared feature must actually exist in gold.</span>
absent = [c <span class="k">for</span> c <span class="k">in</span> FEATURE_COLUMNS <span class="k">if</span> c <span class="k">not in</span> gold.columns]
<span class="hl"><span class="k">assert not</span> absent</span>, f<span class="s">"Declared but missing from gold: {absent}"</span></div>`],

base_tags: [900, `
<div class="code"><div class="hd"><span>40_train_register · BASE_TAGS</span><span>Every run, every version</span></div>BASE_TAGS = {
    <span class="c"># --- data --------------------------------------------------</span>
    <span class="s">"gold_table"</span>:          <span class="s">"gold.knee_features"</span>,
    <span class="hl"><span class="s">"gold_table_version"</span>: str(gold_version)</span>,
    <span class="s">"feature_set_version"</span>: <span class="s">"v3"</span>,
    <span class="s">"target_definition"</span>:   <span class="s">"oks_delta<=7 (below MCID)"</span>,
    <span class="s">"cohort"</span>:              <span class="s">"knee_provider_nhs_proms_2016_2019"</span>,
    <span class="c"># --- governance --------------------------------------------</span>
    <span class="s">"intended_use"</span>:        <span class="s">"preop_risk_triage_decision_support"</span>,
    <span class="s">"risk_class"</span>:          <span class="s">"high_risk_eu_ai_act"</span>,
    <span class="hl"><span class="s">"interpretability"</span>:    <span class="s">"glassbox"</span></span>,   <span class="c"># the deployment gate</span>
    <span class="s">"human_oversight"</span>:     <span class="s">"clinician_in_the_loop"</span>,
    <span class="s">"approved_by"</span>:         <span class="s">"pending"</span>,    <span class="c"># a named clinician replaces this</span>
}</div>`],

version_asof: [1100, `
<div class="code"><div class="hd"><span>Two years later</span><span>The auditor's question, answered</span></div><span class="c">-- "Reconstruct the exact input this model was trained on."</span>
<span class="k">SELECT</span> * <span class="k">FROM</span> gold.knee_features <span class="hl"><span class="k">VERSION AS OF</span> <span class="n">7</span></span>;</div>
<div class="row"><div class="box col"><div class="lbl">Without the tag</div>"Trained on gold." Gold has been rewritten eleven times since. The row count no longer matches and nobody can say why.</div>
<div class="box accent col"><div class="lbl green">With the tag</div>"Trained on gold as of version 7." Delta time travel returns that table, byte for byte, on demand.</div></div>`],

endpoint_json: [820, `
<div class="code"><div class="hd"><span>POST /score · 200 OK</span><span>Managed endpoint, in-estate</span></div>{
  <span class="s">"episode_id"</span>:        <span class="s">"MFC-2026-100070"</span>,
  <span class="s">"risk"</span>:              <span class="n">0.626</span>,          <span class="c">// calibrated</span>
  <span class="s">"threshold"</span>:         <span class="n">0.50</span>,
  <span class="s">"flagged"</span>:           <span class="k">true</span>,
  <span class="s">"contributions"</span>: [
    { <span class="s">"feature"</span>: <span class="s">"t0_previous_surgery"</span>, <span class="s">"value"</span>: <span class="n">+0.43</span> },
    { <span class="s">"feature"</span>: <span class="s">"t0_mobility"</span>,         <span class="s">"value"</span>: <span class="n">+0.40</span> },
    { <span class="s">"feature"</span>: <span class="s">"oks_t0_pain"</span>,         <span class="s">"value"</span>: <span class="n">+0.30</span> },
    { <span class="s">"feature"</span>: <span class="s">"comorbidity_count"</span>,   <span class="s">"value"</span>: <span class="n">-0.20</span> },
    { <span class="s">"feature"</span>: <span class="s">"t0_symptom_period"</span>,   <span class="s">"value"</span>: <span class="n">+0.16</span> },
    { <span class="s">"feature"</span>: <span class="s">"oks_t0_score"</span>,        <span class="s">"value"</span>: <span class="n">+0.12</span> }
  ],
  <span class="hl"><span class="s">"model_version"</span>: <span class="s">"knee-poor-outcome-ebm@champion/4"</span></span>,
  <span class="hl"><span class="s">"gold_table_version"</span>: <span class="n">7</span></span>
}</div>`],

entity_policy: [780, `
<div class="code"><div class="hd"><span>rayfin/data/PatientRisk.ts</span><span>Unedited</span></div><span class="t">@entity</span>()
<span class="t">@role</span>(<span class="s">'authenticated'</span>, <span class="s">'read'</span>, {
  <span class="hl">policy: (claims, item) =></span>
    <span class="hl">claims.sub.eq(item.assignedClinicianId)</span>
      .or(claims.email.eq(item.assignedClinicianEmail))
      .or(claims.role.eq(<span class="s">'governance'</span>)),
})
<span class="k">export class</span> <span class="fn">PatientRisk</span> {
  <span class="t">@uuid</span>() id!: <span class="k">string</span>;
  <span class="t">@text</span>({ min: <span class="n">1</span>, max: <span class="n">64</span> }) episodeId!: <span class="k">string</span>;
  <span class="t">@decimal</span>() riskPoorOutcome!: <span class="k">number</span>;
  <span class="t">@text</span>() assignedClinicianId!: <span class="k">string</span>;
}</div>`],

rayfin_cmd: [760, `
<div class="term"><div class="hd"><span>One command</span><span>Terminal</span></div>$ npx rayfin up --workspace <span class="s">"Healthcare-FabCon2026-Demo"</span></div>
<div class="row" style="flex-wrap:wrap">
<div class="box col" style="flex:1 1 40%"><div class="lbl">Database</div><div class="big">SQL database</div><span class="muted" style="font-family:Menlo,monospace;font-size:12px">in Fabric</span></div>
<div class="box col" style="flex:1 1 40%"><div class="lbl">API</div><div class="big">GraphQL</div><span class="muted" style="font-family:Menlo,monospace;font-size:12px">Data API Builder</span></div>
<div class="box col" style="flex:1 1 40%"><div class="lbl">Identity</div><div class="big">Entra ID</div><span class="muted" style="font-family:Menlo,monospace;font-size:12px">sign-in + claims</span></div>
<div class="box col" style="flex:1 1 40%"><div class="lbl">Hosting</div><div class="big">Fabric App</div><span class="muted" style="font-family:Menlo,monospace;font-size:12px">static hosting</span></div>
</div>
<p style="margin-top:16px;font-size:14px;color:#16211E">Seven decorated TypeScript classes. Four provisioned objects. All of it inside the workspace boundary — no separate subscription, no second identity provider, nothing to re-govern.</p>`],

supervised: [1200, `
<div style="display:flex;align-items:stretch;gap:0">
<div class="box col" style="background:#EFF5F3"><div class="lbl">Inputs · features</div><div class="big">Pre-operative record</div><p class="muted" style="font-size:13px;margin-top:4px">Age band, sex, Oxford Knee Score, EQ-5D, comorbidities, symptom duration, previous surgery … ~45 columns, all known before the operation.</p></div>
<div class="arrow">›</div>
<div class="box col" style="background:#003E34;color:#fff;border-color:#003E34"><div class="lbl" style="color:#BFD9D2">Model · learned from history</div><div class="big" style="color:#fff">f(features)</div><p style="font-size:13px;margin-top:4px;color:#DDEBE8">Fitted on 135,051 past patients whose outcome is known. Learns which pre-operative patterns went with a poor result.</p></div>
<div class="arrow">›</div>
<div class="box col"><div class="lbl">Output · prediction</div><div class="big">P(poor outcome) = 0.63</div><p class="muted" style="font-size:13px;margin-top:4px">A calibrated probability for a patient the model has never seen.</p></div>
<div class="arrow">›</div>
<div class="box col gold"><div class="lbl">Decision · cut-off</div><div class="big">0.63 ≥ 0.50 → flag</div><p class="muted" style="font-size:13px;margin-top:4px">A service policy, not a model output. Flagged patients get a clinician's review.</p></div>
</div>
<div class="row" style="margin-top:14px">
<div class="box col"><div class="lbl">Label · what we predict</div><span class="chip">outcome_label = 1</span> if the six-month gain is ≤ 7 points, else <span class="chip">0</span>. Known for past patients, unknown for the one in front of you.</div>
<div class="box col"><div class="lbl">Training set · test set</div>Fit on 80% of the labelled history; measure on the 20% held out. The test set is the only honest estimate of how it will do on new patients.</div>
<div class="box col"><div class="lbl">Supervised learning</div>"Supervised" because every training row comes with its answer. The model is supervised by history, then judged on data it never saw.</div>
</div>`],

reg_vs_clf: [1200, `
<div class="row" style="margin-top:0">
<div class="box col" style="padding:22px">
<div class="lbl">Regression</div><h3>Predict a number</h3>
<p class="muted" style="font-size:14px">"How many points will this patient's Oxford Knee Score improve?"</p>
<svg viewBox="0 0 360 170" width="100%" style="margin:14px 0 8px"><line x1="30" y1="140" x2="340" y2="140" stroke="#B8C4C0"/><line x1="30" y1="140" x2="30" y2="15" stroke="#B8C4C0"/>
<g fill="#7FA89C">${[[55,120],[80,95],[100,105],[125,80],[150,70],[170,85],[200,55],[225,60],[250,40],[280,45],[300,28],[320,35]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g>
<line x1="40" y1="128" x2="335" y2="25" stroke="#003E34" stroke-width="2.5"/>
<text x="185" y="162" font-size="11" fill="#6B7370" text-anchor="middle">pre-operative score</text><text x="14" y="80" font-size="11" fill="#6B7370" transform="rotate(-90 14 80)" text-anchor="middle">predicted gain (points)</text></svg>
<p style="font-size:14px">Output: <b>+9.4 points</b>. Continuous. Judged by how far off it is, on average.</p>
</div>
<div class="box accent col" style="padding:22px">
<div class="lbl green">Classification · what this pipeline does</div><h3>Predict a category</h3>
<p class="muted" style="font-size:14px">"Will this patient have a poor outcome — a gain of 7 points or fewer?"</p>
<svg viewBox="0 0 360 170" width="100%" style="margin:14px 0 8px"><rect x="30" y="60" width="300" height="26" rx="4" fill="#DDE7E3"/><rect x="30" y="60" width="150" height="26" rx="4" fill="#7FA89C"/><rect x="180" y="60" width="150" height="26" fill="#C94E4E" opacity=".75"/>
<line x1="180" y1="48" x2="180" y2="98" stroke="#16211E" stroke-width="2" stroke-dasharray="4 3"/><text x="180" y="40" font-size="11" fill="#16211E" text-anchor="middle">cut-off 0.50</text>
<text x="30" y="112" font-size="11" fill="#6B7370">0%</text><text x="330" y="112" font-size="11" fill="#6B7370" text-anchor="end">100%</text><text x="180" y="130" font-size="11" fill="#6B7370" text-anchor="middle">probability of a poor outcome</text>
<circle cx="219" cy="73" r="7" fill="#16211E"/><text x="219" y="160" font-size="12" fill="#16211E" text-anchor="middle" font-weight="600">this patient: 0.63 → flagged</text></svg>
<p style="font-size:14px">Output: <b>a probability, then a yes/no</b> at a chosen cut-off. Judged by precision and recall on the class that matters.</p>
</div></div>
<div class="row"><div class="box col" style="border-color:#E0CF9D;background:#FBF5E6;font-size:14px"><b>Why classify, when the score is a number?</b> Because the decision is binary — review this patient before surgery, or not — and the 7-point minimal clinically important difference gives the cut between "improved" and "did not" a clinical meaning. Regressing the raw gain would predict a number nobody acts on.</div></div>`],

experiment_tree: [1150, `
<div class="box" style="padding:20px 22px">
<div class="hd" style="margin-bottom:12px"><span>Fabric ML experiment · knee-poor-outcome</span><span>one training session, four child runs</span></div>
<div style="display:flex;gap:18px;align-items:flex-start">
<div style="flex:1.6">
<div class="box" style="background:#EFF5F3;padding:12px 16px;margin-bottom:10px"><div class="lbl green">Parent run</div><b>training-session</b> <span class="muted" style="font-size:13px">· params n_train, n_test, n_features · metric baseline_average_precision = 0.171</span><br><span class="chip">run_type = training_session</span> <span class="chip">gold_table_version = 7</span> <span class="chip">feature_set_version = v3</span></div>
<table><tr><th>child run</th><th>model_family</th><th>interpretability</th><th>average precision</th><th>lift vs baseline</th></tr>
<tr><td>logistic-regression</td><td>logistic_regression</td><td><span class="chip">glassbox</span></td><td>0.143</td><td>0.84×</td></tr>
<tr><td>random-forest</td><td>random_forest</td><td><span class="chip red">post_hoc_shap</span></td><td>0.168</td><td>0.98×</td></tr>
<tr><td>ebm</td><td>ebm</td><td><span class="chip">glassbox</span></td><td>0.171</td><td>1.00×</td></tr>
<tr class="ship"><td>ebm-calibrated · release candidate</td><td>ebm</td><td><span class="chip">glassbox</span> <span class="chip gold">calibrated = true</span></td><td>0.171</td><td>ECE 0.016</td></tr></table>
</div>
<div style="flex:1">
<div class="box" style="padding:14px 16px;font-size:13.5px;line-height:1.5"><div class="lbl">What every run carries</div>
<b>Parameters</b> — the hyperparameters and split sizes, so the run can be re-fitted.<br><b>Metrics</b> — precision–recall, Brier, ECE; never accuracy alone.<br><b>Tags</b> — the facts you filter on: data version, interpretability, risk class, who approved it.<br><b>Artifacts</b> — the model file, its signature and the preprocessing it expects.</div>
<div class="box gold" style="padding:14px 16px;font-size:13.5px;margin-top:10px"><div class="lbl">Autologging: off</div>Fabric autologs accuracy-first metrics on every internal fit. Six runs you care about would be buried under two hundred you do not. Log explicitly.</div>
</div></div></div>`],

registry: [1150, `
<div class="row" style="margin-top:0">
<div class="box col" style="flex:1.25;padding:20px 22px">
<div class="hd" style="margin-bottom:12px"><span>Fabric ML model · knee-poor-outcome-ebm</span><span>versions</span></div>
<table><tr><th>version</th><th>source run</th><th>gate_status</th><th>approved_by</th><th></th></tr>
<tr><td class="muted">v1 – v3</td><td class="muted">earlier training sessions</td><td class="muted">—</td><td class="muted">—</td><td class="muted">superseded</td></tr>
<tr class="ship"><td>v4</td><td>ebm-calibrated</td><td><span class="chip">passed</span></td><td><span class="chip gold">pending</span></td><td><span class="chip gold">champion = true</span></td></tr></table>
<p class="muted" style="font-size:13px;margin-top:12px">Each version carries the run's tags — <span class="chip">gold_table_version = 7</span> <span class="chip">interpretability = glassbox</span> <span class="chip">calibrated = true</span> — plus a signature: the exact input columns the model accepts. The app and the endpoint bind to <span class="chip">models:/knee-poor-outcome-ebm@champion</span>, never to a file.</p>
</div>
<div class="box col" style="padding:20px 22px">
<div class="hd" style="margin-bottom:12px"><span>Deployment gate · 40 §10</span><span>the notebook can say no</span></div>
<table><tr><th>check</th><th>result</th></tr>
<tr><td>beats prevalence baseline by 1.3×</td><td><span class="chip">PASS</span></td></tr>
<tr><td>calibration error under 5%</td><td><span class="chip">PASS</span></td></tr>
<tr><td>recall at 80% precision above 5%</td><td><span class="chip">PASS</span></td></tr>
<tr><td>interpretable model family</td><td><span class="chip">PASS</span></td></tr></table>
<p style="font-size:13.5px;margin-top:12px">Four automated checks write <span class="chip">gate_status</span>. None of them can write <span class="chip">approved_by</span> — that tag is set later, by a named clinician, without re-running anything.</p>
</div></div>`],

serving: [1200, `
<div class="row" style="margin-top:0">
<div class="box col" style="padding:20px 22px">
<div class="lbl">Batch scoring · notebook 50</div><h3>The whole waiting list, on a schedule</h3>
<p class="muted" style="font-size:14px;margin:6px 0 12px">A Data Pipeline runs 10 → 20 → 30 → 50 with success dependencies. Every patient on the list is re-scored and the result is a <b>row</b>, not a function call.</p>
<div style="display:flex;gap:8px;align-items:center;font-size:13px"><span class="chip">bronze</span>›<span class="chip">silver</span>›<span class="chip">gold.knee_features</span>›<span class="chip">gold.patient_risk</span> + <span class="chip">gold.risk_explanation</span></div>
<p style="font-size:14px;margin-top:12px"><b>Feeds:</b> the worklist, the overview, the Data Agent — anything that reads the cohort.</p>
</div>
<div class="box accent col" style="padding:20px 22px">
<div class="lbl green">Real-time endpoint · deployed from the ML model item</div><h3>One patient, right now</h3>
<p class="muted" style="font-size:14px;margin:6px 0 12px">A Spark session start is far too slow for a clinician waiting on one score. The endpoint is a managed web service Fabric stands up from the registered version — authenticated with Entra, versioned, inside the workspace.</p>
<div style="display:flex;gap:8px;align-items:center;font-size:13px"><span class="chip">POST /score</span>›<span class="chip">knee-poor-outcome-ebm@champion</span>›<span class="chip">risk + contributions + versions</span></div>
<p style="font-size:14px;margin-top:12px"><b>Feeds:</b> the what-if on a patient page, an integration from another system, a test call on stage.</p>
</div></div>
<div class="row"><div class="box col gold" style="font-size:14px"><b>Both bind to the same name.</b> Batch and real-time resolve <span class="chip">@champion</span> at run time, so they cannot disagree about which model is live — and both stamp the model version and the gold table version on every score they produce.</div></div>`],

demo_steps: [1150, `
<div class="row" style="margin-top:0">
<div class="box col" style="background:#003E34;color:#fff;border-color:#003E34"><div class="lbl" style="color:#BFD9D2">1 · ML experiment</div><b>Parent run, child runs</b><br><span style="font-family:Menlo,monospace;font-size:12px;color:#DDEBE8">compare the four candidates side by side</span></div>
<div class="box col"><div class="lbl">2 · Filter by tag</div><b>interpretability = blackbox</b><br><span class="muted" style="font-family:Menlo,monospace;font-size:12px">the deployment gate, as a query</span></div>
<div class="box col"><div class="lbl">3 · Registered model</div><b>Versions and their tags</b><br><span class="muted" style="font-family:Menlo,monospace;font-size:12px">v4 carries champion = true</span></div>
</div>
<div class="row">
<div class="box col gold"><div class="lbl">4 · The shipped run</div><b>gold_table_version = 7</b><br><span class="muted" style="font-family:Menlo,monospace;font-size:12px">read off the version, then VERSION AS OF 7</span></div>
<div class="box col accent" style="flex:2"><div class="lbl green">5 · The endpoint</div><b>Send one patient, read the response</b><br><span class="muted" style="font-family:Menlo,monospace;font-size:12px">risk, six contributions, model version, gold table version — in one authenticated call</span></div>
</div>`],
};
const browser = await chromium.launch({ headless: true, executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const only = process.argv[3] ? process.argv[3].split(',') : Object.keys(cards);
for (const name of only) {
  const [w, html] = cards[name];
  await page.setContent(`<style>${CSS}</style><div id="card" style="width:${w}px">${html}</div>`);
  await page.waitForTimeout(150);
  await page.locator('#card').screenshot({ path: `${out}/${name}.png` });
  console.log('card', name);
}
await browser.close();
