"""Rebuild slides 15+ of claudecodepresentation-fabcon.pptx. Slides 1-14 and the closing
'Please rate' slide are kept untouched; the agenda table on slide 3 is updated."""
import copy, sys
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image

S = sys.argv[1]           # scratchpad
SRC = sys.argv[2]; OUT = sys.argv[3]
GREEN = RGBColor(0x00,0x3E,0x34); INK = RGBColor(0x16,0x21,0x1E); GRAY = RGBColor(0x6B,0x73,0x70)
GOLD = RGBColor(0xBB,0x9F,0x45); TINT = RGBColor(0xE4,0xEF,0xEB); LINE = RGBColor(0xD6,0xDE,0xDB); WHITE = RGBColor(0xFF,0xFF,0xFF)

prs = Presentation(SRC)
L_CONTENT = prs.slide_layouts[1]; L_TITLE_ONLY = prs.slide_layouts[3]

# ---------- remove slides 15..41 ----------
sldIdLst = prs.slides._sldIdLst
ids = list(sldIdLst)
for sldId in ids[14:41]:
    prs.part.drop_rel(sldId.rId); sldIdLst.remove(sldId)
rate_sldId = list(sldIdLst)[-1]
from pptx.opc.packuri import PackURI
prs.slides[14].part.partname = PackURI('/ppt/slides/slide15.xml')

# ---------- helpers ----------
def _style(run, size, color=INK, bold=False, font='Arial', italic=False):
    run.font.size = Pt(size); run.font.color.rgb = color; run.font.bold = bold; run.font.name = font; run.font.italic = italic

def tb(slide, x, y, w, h, paras, anchor=MSO_ANCHOR.TOP, align=PP_ALIGN.LEFT):
    """paras: list of dicts {t, size, color, bold, font, space_after, align} or plain strings (14pt body)."""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.02); tf.margin_top = tf.margin_bottom = Inches(0.02)
    first = True
    for p in paras:
        if isinstance(p, str): p = {'t': p}
        para = tf.paragraphs[0] if first else tf.add_paragraph(); first = False
        para.alignment = p.get('align', align)
        if 'space_after' in p: para.space_after = Pt(p['space_after'])
        if 'space_before' in p: para.space_before = Pt(p['space_before'])
        run = para.add_run(); run.text = p['t']
        _style(run, p.get('size', 14), p.get('color', INK), p.get('bold', False), p.get('font', 'Arial'), p.get('italic', False))
    return box

def label(t, **kw): return dict(t=t, size=11, color=GRAY, bold=True, space_after=4, **kw)
def body(t, **kw): d = dict(t=t, size=14, color=INK); d.update(kw); return d
def lead(t, **kw): d = dict(t=t, size=17, color=INK); d.update(kw); return d
def mono(t, **kw): d = dict(t=t, size=13, color=GREEN, font='Consolas'); d.update(kw); return d

def rect(slide, x, y, w, h, fill=TINT, rounded=True, line=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded: shp.adjustments[0] = 0.06
    shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line: shp.line.color.rgb = line; shp.line.width = Pt(0.75)
    else: shp.line.fill.background()
    shp.shadow.inherit = False
    shp.text_frame.text = ''
    return shp

def vline(slide, x, y, h): return rect(slide, x, y, 0.01, h, fill=LINE, rounded=False)
def hline(slide, x, y, w): return rect(slide, x, y, w, 0.01, fill=TINT, rounded=False)

def image(slide, path, x, y, w=None, h=None):
    """Fit inside (w,h) box keeping aspect; anchored top-left."""
    iw, ih = Image.open(path).size
    if w and h:
        r = min(w/iw, h/ih); w2, h2 = iw*r, ih*r
    elif w: w2, h2 = w, ih*w/iw
    else: w2, h2 = iw*h/ih, h
    return slide.shapes.add_picture(path, Inches(x), Inches(y), Inches(w2), Inches(h2))

def notes(slide, text): slide.notes_slide.notes_text_frame.text = text

def content(title, subtitle=None):
    s = prs.slides.add_slide(L_CONTENT)
    for ph in list(s.placeholders):
        if ph.placeholder_format.idx != 0: ph._element.getparent().remove(ph._element)
    t = s.shapes.title; t.left, t.top, t.width, t.height = Inches(0.89), Inches(0.24), Inches(11.55), Inches(1.05)
    t.text_frame.text = title; _style(t.text_frame.paragraphs[0].runs[0], 30, GREEN, True)
    if subtitle: tb(s, 0.89, 1.23, 11.55, 0.34, [dict(t=subtitle, size=13, color=GRAY)])
    return s

def section(title):
    s = prs.slides.add_slide(L_TITLE_ONLY)
    for ph in list(s.placeholders):
        if ph.placeholder_format.idx != 0: ph._element.getparent().remove(ph._element)
    t = s.shapes.title; t.left, t.top, t.width, t.height = Inches(0.89), Inches(1.72), Inches(11.53), Inches(1.55)
    t.text_frame.text = title; t.text_frame.paragraphs[0].runs[0].font.size = Pt(48); t.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    return s

def gold_bar(slide, text, y=6.00):
    rect(slide, 0.89, y, 11.55, 0.62, fill=TINT); rect(slide, 0.89, y, 0.06, 0.62, fill=GOLD, rounded=False)
    tb(slide, 1.17, y+0.14, 11.05, 0.40, [dict(t=text, size=16, color=GREEN)])

def card(slide, x, y, w, h, paras, fill=WHITE):
    rect(slide, x, y, w, h, fill=fill, line=LINE if fill == WHITE else None)
    tb(slide, x+0.24, y+0.22, w-0.48, h-0.44, paras)

IMG = lambda n: f'{S}/imgs/{n}'; CARD = lambda n: f'{S}/cards/{n}.png'; EL = lambda n: f'{S}/el/{n}.png'; CROP = lambda n: f'{S}/crops/{n}.png'

# =====================================================================
# 15  the data
s = content('NHS PROMs: what is in the data', 'National, anonymised at source, already public-sector governed — every interesting problem is downstream of that.')
tb(s, 0.89, 1.96, 5.40, 3.30, [label('THE DATA'),
    body('One row per patient episode: a primary knee replacement, three collection years.', space_after=8),
    body('Pre-operative questionnaire — Oxford Knee Score 0–48 with pain, function and daily-living subscales; EQ-5D-3L; symptom duration; previous surgery; living arrangements; mobility.', space_after=8),
    body('Twelve comorbidity flags, and the provider that operated.', space_after=8),
    body('Six months later, the same questionnaire again.')])
vline(s, 6.28, 1.96, 3.10)
tb(s, 6.60, 1.96, 5.84, 3.30, [label('THE PREDICTION'),
    body('Inputs are pre-operative only — everything knowable before the decision to operate.', space_after=8),
    mono('oks_delta = oks_t1 − oks_t0', space_after=8),
    body('The positive class is the BAD outcome: the patient who does not meaningfully improve. That is the class worth detecting, and it is the minority one.', space_after=8),
    body('~45 features after encoding; every one of them is on the pre-operative form.')])
for i, (n, c) in enumerate([('139,236', 'knee episodes, 2016/17 – 2018/19'), ('46,412', 'procedures a year'), ('~45', 'features after encoding'), ('17.1%', 'do not meaningfully improve')]):
    x = 0.89 + i*2.94
    if i: vline(s, x-0.11, 5.55, 0.89)
    tb(s, x, 5.47, 2.72, 1.05, [dict(t=n, size=30, color=GREEN), dict(t=c, size=11.5, color=GRAY)])
notes(s, 'Anchor the cohort before anything else. 139,236 knee episodes across 2016/17–2018/19, roughly 46,412 a year. Everything on the input side is pre-operative: what you know before the decision to operate. The target is derived, not supplied — oks_delta = oks_t1 − oks_t0 — and the positive class is deliberately the bad outcome, because that is the class worth finding. Say out loud that the data is anonymised and national: every interesting problem in this talk is downstream of governance someone else already did.')

# 16  supervised learning in one picture
s = content('Supervised learning, in one picture', 'The vocabulary the rest of the talk leans on: features, label, training set, test set, prediction, cut-off.')
image(s, CARD('supervised'), 0.89, 1.72, w=11.55)
tb(s, 0.89, 6.20, 11.55, 0.50, [body('The model never sees a patient\'s outcome at prediction time. It learned from patients whose outcome is already known, and is judged on patients it never saw.', color=INK)])
notes(s, 'Level-set the room in one picture. Features on the left: the pre-operative record. A model fitted on 135,051 past patients whose outcome is known — that is the "supervised" part. Output: a probability. Then a cut-off turns the probability into a decision, and the cut-off is a service policy, not a model output. Train on 80%, judge on the 20% you held back. Everything later — leakage, imbalance, calibration, threshold — is a consequence of this one diagram.')

# 17  regression vs classification
s = content('Regression or classification?', 'Predict a number, or predict a category. The same data supports both; the decision a clinician has to make determines which one we build.')
image(s, CARD('reg_vs_clf'), 0.89, 1.68, w=11.55)
notes(s, 'Nowhere else in the deck do we say this, so say it here. Regression predicts a number — how many points will the score improve. Classification predicts a category — will this patient have a poor outcome, yes or no — via a probability and a cut-off. We chose classification because the decision is binary: review this patient before surgery, or not. And the 7-point MCID gives the cut between improved and did-not a clinical meaning. Next slide defends the 7.')

# 18  why 7 points
s = content('Why 7 points?', 'The label is a clinical decision, not a modelling one — so it is defended before any model appears.')
image(s, IMG('s16_2.png'), 1.01, 1.64, w=11.31)
tb(s, 0.89, 5.57, 5.50, 1.00, [body('The Oxford Knee Score runs 0–48. A 2-point rise is real arithmetic and no change the patient can feel. The minimal clinically important difference — the smallest change a patient notices — is around 7 points.')])
tb(s, 6.90, 5.57, 5.54, 1.00, [body('Mean gain falls as the pre-operative score rises. The clinical rule of thumb — the worse they are, the more they need surgery — is roughly the opposite of what predicts a poor outcome.')])
tb(s, 0.89, 6.58, 11.55, 0.30, [dict(t='31_data_exploration §2 · n = 135,051 labelled episodes', size=12, color=GRAY)])
notes(s, 'The one slide to slow down on. The MCID came from patients, not from a validation curve. Left panel: the distribution is wide, straddles zero, and 17% of patients sit at or below 7 points. Right panel is the counter-intuitive bit — mean gain FALLS as the pre-op score rises. That is the reason to build the model at all: it finds the patients the rule of thumb misses.')

# 19  imbalance
s = content('Imbalance: why accuracy is the wrong metric')
image(s, IMG('s18_1.png'), 2.46, 1.67, w=8.42)
for i, (l, t, f) in enumerate([('THE TRAP', 'A model that says “good outcome” to everybody scores 82.9% accuracy — and finds nobody who needs pre-operative optimisation.', WHITE),
                               ('THE BASELINE TO BEAT', 'No-skill average precision is 0.171 — the prevalence. Every precision–recall number in this talk is measured against that, never against 50%.', WHITE),
                               ('THE CONSEQUENCE', 'Precision–recall, never accuracy — and precision over recall, deliberately. Telling a patient surgery may not help is a claim that has to be right.', TINT)]):
    card(s, 0.89 + i*3.94, 3.97, 3.66, 2.25, [label(l), body(t)], fill=f)
notes(s, 'One patient in six has a poor outcome. A model that predicts "good outcome" for everybody scores 82.9% accuracy and finds nobody. The PR baseline is the prevalence, 0.171 — every number later in the talk is measured against that. And name the asymmetry: we buy precision with recall, on purpose.')

# 20  missingness
s = content('Two missingness mechanisms, two treatments')
image(s, IMG('s19_1.png'), 0.89, 2.14, w=7.50)
tb(s, 8.70, 1.82, 3.74, 4.40, [label('NHS DISCLOSURE CONTROL'),
    dict(t='“Where there are between 1 and 5 records for a particular combination of age band, sex, provider and procedure, the age band and sex have been suppressed and replaced with an asterisk.”', size=14, color=GREEN, space_after=6),
    dict(t='CSV Footnotes 1819 Finalised.pdf', size=11, color=GRAY, space_after=12),
    body('Age band and sex are missing on exactly the same 9,402 rows — one rule, not two gaps. Imputing them would reconstruct what NHS hid to protect that patient.', space_after=10),
    body('Impute non-response. Never impute a protected characteristic.', bold=True)])
notes(s, 'Age band and sex are missing on exactly the same 9,402 rows — one NHS disclosure-control rule, not two gaps. Imputing them means training a model to reconstruct what NHS hid to protect that patient: a question for a DPO, not a modelling choice. Questionnaire items are genuine non-response and get MICE. The line to land: impute non-response, never impute a protected characteristic.')

# 21  sentinel
s = content('The sentinel trap')
image(s, CARD('sentinel'), 1.30, 1.60, w=10.75)
tb(s, 0.89, 6.40, 11.55, 0.30, [dict(t='Decoded in 20_silver_clean, proven in 31_data_exploration §7 — the kind of domain detail no AutoML finds for you.', size=12, color=GRAY)])
notes(s, 'Quick and memorable. The same code 9 means "not answered" everywhere except the twelve comorbidity flags, where it means NO. Read it wrong on the comorbidities and you invert twelve features at once. Silver decodes both; the assertions prove it.')

# 22  label never there
s = content('The label that was never there', 'The finding that changed the pipeline.')
image(s, IMG('s21_2.png'), 2.52, 1.60, w=8.29)
tb(s, 0.89, 5.90, 11.55, 0.70, [body('np.nan > 7 evaluates to False, so every non-responder fell into the else branch and was labelled a poor outcome. Silent, and plausible-looking downstream. Gold now marks them has_label = false, and notebook 40 trains only on patients whose outcome is known.')])
notes(s, 'np.nan > 7 is False, so every non-responder silently fell into the positive class. 4,185 episodes — 15.3% of the minority class would have been "we do not know" labelled as "poor outcome". Gold now marks them has_label = false and notebook 40 excludes them. Mention the honest caveat: the training population is patients who responded, and the model card says so.')

# 23  demo: data
s = content("Let's look at the data", 'Demo · notebook 31_data_exploration, pre-run, in the 35_Exploration folder. Nothing in it writes.')
items = ['The 7-point rule and the delta distribution', 'Class balance, and the precision–recall baseline', 'The patients with no outcome at all', 'The sentinel trap']
for i, t in enumerate(items):
    y = 1.97 + i*0.90
    tb(s, 0.89, y, 1.00, 0.60, [dict(t=f'0{i+1}', size=19, color=GREEN)])
    tb(s, 1.89, y+0.06, 6.40, 0.60, [dict(t=t, size=17, color=INK)])
    hline(s, 0.89, y+0.66, 7.40)
rect(s, 8.60, 1.97, 3.84, 3.50, fill=TINT)
tb(s, 8.84, 2.21, 3.36, 3.02, [label('READS'), mono('silver.knee_episode'), mono('gold.knee_features', space_after=12), label('WRITES'), mono('nothing', space_after=12),
    dict(t='A read-only notebook is a demo you can run twice. Everything it prints is recomputed live from the Lakehouse in front of the room.', size=12, color=GRAY)])
notes(s, 'DEMO. Notebook 31_data_exploration in the 35_Exploration folder, pre-run, read-only. Walk the four findings in order, then come back to the deck. If the capacity is slow, the outputs are already there — do not re-run the whole notebook on stage.')

# 24  split
s = content('Setting up train and test without leaking')
image(s, IMG('s23_1.png'), 0.89, 1.60, w=7.60)
image(s, CARD('leakage'), 0.89, 3.62, w=7.60)
tb(s, 8.95, 3.75, 3.49, 2.60, [label('THE LEAKAGE GUARD'),
    body('Two assertions before a single model is fitted. A reviewer would catch both eventually; catching them here means they never reach a metric anyone quotes.', space_after=10),
    body('The split happens before imputation: MICE fits a model per column, so fitting it on everything lets test-set information into the training features.')])
notes(s, 'Order matters. The split happens before imputation and encoding: MICE fits a LightGBM model per column, so fitting on everything lets test-set information into training features. Then the two guards — no post-operative column may reach the feature matrix, and every declared feature must exist in gold.')

# 25  section
section('A model a clinician can argue with')

# 26  what we trained
s = content('What we trained, and what it actually does', 'Held-out test set, decision threshold τ = 0.8.')
image(s, IMG('s25_2.png'), 1.01, 1.77, w=11.31)
card(s, 0.89, 4.92, 5.60, 1.72, [label('THE HONEST READING'), dict(t='All three are conservative to the point of near-silence here: about 4 of the 152 poor outcomes a week are flagged. That is the price of a precision-first operating point — a service decision, not a model output.', size=12, color=INK)])
card(s, 6.83, 4.92, 5.60, 1.72, [label('WHY THE EBM SHIPS'), dict(t='It matches the random forest on every metric and is a glassbox: the explanation is the model, not a post-hoc approximation of it. Interpretability is a deployment requirement here, not a preference.', size=12, color=INK)], fill=TINT)
notes(s, 'Three models, one table, τ = 0.8. Logistic regression is perfect and useless: 18 patients flagged. Random forest and the EBM are effectively tied on every metric. So the tie-breaker is interpretability, and that is a deployment requirement here, not a preference.')

# 27  global / local
s = content('Global, local, and the contrast')
image(s, CROP('why_score'), 5.85, 1.62, w=6.59)
tb(s, 0.89, 1.77, 4.70, 4.70, [label('WHAT A CLINICIAN CAN ARGUE WITH'),
    mono('risk = sigmoid( intercept + Σ f(x) )', space_after=10),
    body('The bars on screen are those terms. No surrogate, no approximation, no “feature importance” standing in for the model’s reasoning.', space_after=10),
    body('Global — the shape function for pre-operative OKS, and one comorbidity.', space_after=6),
    body('Local — six ranked contributions for one patient, in log-odds, with the plain-English multiplier beside each.', space_after=6),
    body('Contrast — the same patient through the random forest via SHAP: one approximation further away.', space_after=10),
    dict(t='A clinician cannot disagree with a random forest. Oversight of something you cannot disagree with is not oversight.', size=14, color=GOLD)])
notes(s, 'For a glassbox model the explanation IS the model: risk = sigmoid(intercept + sum of the shape functions). The bars are those terms, not a surrogate. Global — one shape function. Local — six contributions for one patient. Contrast — the same patient through the random forest via SHAP, one approximation further away.')

# 28  calibration
s = content('A number that means what it says')
image(s, EL('modelcard'), 5.00, 1.62, w=7.44, h=4.85)
tb(s, 0.89, 1.90, 3.85, 4.40, [label('CALIBRATION'),
    body('Of a hundred patients scored 34%, about thirty-four should have a poor outcome.', space_after=10),
    body('Isotonic regression on a held-out fold. Watch the Brier score and the calibration error move, not average precision — calibration is monotone, so the ranking barely changes. That is the point.', space_after=10),
    body('Calibration is a property of the group, not the individual. The app says so, on the page, next to the number.', size=12, color=GRAY)])
notes(s, 'Calibration is what makes the number actionable. Of a hundred patients scored 34%, about thirty-four should have a poor outcome. Isotonic regression on a held-out fold; watch Brier and ECE move, not average precision. State the caveat that is on screen in the app: calibration is a property of the group, not the individual.')

# 29  threshold
s = content('And where we put the line')
image(s, IMG('s28_1.png'), 0.89, 1.72, w=5.90)
image(s, EL('cutoff'), 7.00, 1.72, w=5.44, h=3.90)
tb(s, 0.89, 6.02, 11.55, 0.60, [body('The threshold is a service decision, exposed as one: the clinician sees what each operating point costs in patients per 1,000 before anybody moves it.')])
notes(s, 'Left, the real sweep: precision climbs from 0.667 to 0.957 as τ goes 0.5 to 0.8, and the flagged count falls from 2,696 to 583. Right, the same decision as the clinician sees it — cost per 1,000 patients, live. The threshold is a service decision, and the app treats it as one rather than burying it in a config file.')

# 30  section
section('From experiment to endpoint')

# 31  experiments
s = content('Experiments: every training run, recorded', 'A Fabric ML experiment is the workspace item where MLflow writes each run — parameters, metrics, tags and the model artifact.')
image(s, CARD('experiment_tree'), 0.89, 1.70, w=11.55)
tb(s, 0.89, 5.95, 11.55, 0.70, [dict(t='Why it matters: ', size=14, color=GREEN, bold=True),
    body('six weeks later, nobody remembers which notebook cell produced the model in production. The experiment does. It is the difference between “we tried a random forest too” and being able to show the run, its metrics and its data version to a reviewer.')])
notes(s, 'Show the workspace item, not the concept. One parent run for the training session, four nested child runs — one per candidate. Each carries params, metrics, tags and the model artifact. Autologging is off on purpose: it logs accuracy-first metrics on every internal fit and buries the runs you care about. Why it matters: reproducibility and comparison, and later, evidence.')

# 32  tags
s = content('Tags that survive an audit')
image(s, CARD('base_tags'), 0.89, 1.62, w=7.10, h=4.90)
tb(s, 8.35, 1.97, 4.09, 4.20, [label('THE QUESTION, TWO YEARS LATER'),
    dict(t='“Reconstruct the exact input this model was trained on, and show me who approved it.”', size=14, color=GREEN, space_after=10),
    body('Most teams cannot — not from carelessness, but because the answer was never written anywhere.', space_after=10),
    body('Autologging records what the library knew. These tags record what you decided — and tags are mutable, which is exactly why approval status is one.')])
notes(s, 'The question an auditor asks two years later: reconstruct the exact input this model was trained on, and show me who approved it. Most teams cannot — the answer was never written anywhere. These tags are the answer. gold_table_version is the one they ask for; interpretability is the one that acts as a gate; approved_by is set later by a named clinician, which is why it is a tag and not a metric.')

# 33  registry
s = content('Registered model: versions, tags, and a gate', 'register_model promotes an experiment artifact to a Fabric ML model item — versioned, permissioned, with its own lineage.')
image(s, CARD('registry'), 0.89, 1.70, w=11.55)
tb(s, 0.89, 5.95, 11.55, 0.70, [dict(t='Why it matters: ', size=14, color=GREEN, bold=True),
    body('the app and the endpoint reference one name — models:/knee-poor-outcome-ebm@champion — never a file. No model.pkl is e-mailed around, the version that is live is a queryable fact, and the last cell of the training notebook can refuse to promote.')])
notes(s, 'The registered model is what everything downstream binds to. Versions, each carrying the run\'s tags and a signature — the exact input columns it accepts. The deployment gate: four automated checks write gate_status; none of them can write approved_by. That one waits for a named clinician. Fabric\'s registry does not implement aliases, so champion is a version tag — exactly one version carries it.')

# 34  reconstruct
s = content('Reconstruct it, live')
image(s, CARD('version_asof'), 1.30, 1.67, w=10.75)
tb(s, 0.89, 6.40, 11.55, 0.30, [dict(t='The version came from DESCRIBE HISTORY at training time and rode along as an MLflow tag.', size=12, color=GRAY)])
notes(s, 'One statement. "Trained on gold" becomes "gold as of version 7", and Delta time travel returns that table byte for byte. This is the moment the governance argument stops being a promise.')

# 35  serving
s = content('Two ways to serve one model', 'Batch scoring for the list; a real-time endpoint for the patient in front of you. Same registered version behind both.')
image(s, CARD('serving'), 0.89, 1.70, w=11.55)
tb(s, 0.89, 5.95, 11.55, 0.70, [dict(t='Why it matters: ', size=14, color=GREEN, bold=True),
    body('a model that lives only in a notebook is not in production. The endpoint is what turns a registered version into something another system can call — authenticated, versioned, and still inside the workspace, with no model file leaving the estate.')])
notes(s, 'Two runtimes, one model. Batch: a pipeline re-scores the whole waiting list and writes rows — the worklist, the overview and the agent all read those. Real-time: a managed endpoint deployed from the ML model item, for the single-patient what-if where a Spark session start is far too slow. Both resolve @champion, so they cannot disagree about which model is live.')

# 36  endpoint returns
s = content('What the endpoint returns')
image(s, CARD('endpoint_json'), 5.82, 1.57, w=6.62, h=5.05)
tb(s, 0.89, 1.97, 4.50, 4.20, [label('VERSIONED, AUTHENTICATED, IN-ESTATE'),
    lead('The score never travels alone.', space_after=10),
    body('Every response carries the six contributions that produced it, the model version that produced them, and the Delta version of the table that model was trained on.', space_after=10),
    body('A clinician can act on the score. An auditor can reconstruct it. Neither needs a second system.')])
notes(s, 'The score never travels alone. Six contributions, the model version, and the Delta version of the training table, in one authenticated in-estate response.')

# 37  demo
s = content('Live: the experiment, the registered model, the endpoint', 'Demo · the ML experiment, ML model and endpoint items, in the workspace.')
image(s, CARD('demo_steps'), 0.89, 1.85, w=11.55)
gold_bar(s, 'Filter the run list by tag: interpretability = blackbox — the deployment gate, written as a query.')
notes(s, 'DEMO. Experiment item, parent and child runs, filter by tag interpretability = blackbox, then the registered model and its versions. Read gold_table_version off the shipped run, run the VERSION AS OF query so the training input appears on screen, then send one patient to the endpoint and read the response back.')

# 38  section
section('Delivery: clinician app, agent')

# 39  rayfin
s = content('Seven decorated classes, four provisioned objects')
image(s, CARD('entity_policy'), 0.89, 1.62, w=6.13)
image(s, CARD('rayfin_cmd'), 7.15, 1.62, w=5.29)
tb(s, 0.89, 6.40, 11.55, 0.30, [dict(t='The row-level security policy is declared on the entity, next to the field it protects — not in a middleware layer someone has to remember to call.', size=12, color=GRAY)])
notes(s, 'One command provisions a SQL database in Fabric, a GraphQL API through Data API Builder, Entra sign-in and static hosting — all inside the workspace. The important detail is where the security policy lives: on the entity, next to the field it protects.')

# 40  worklist
s = content("The clinician's end of the pipeline", 'One clinician\'s pre-operative list. Filtered by row-level security on the data, not by this page.')
image(s, CROP('worklist'), 1.35, 1.65, w=10.65, h=4.95)
notes(s, 'DEMO. This is one clinician\'s list, and the filtering happened in the data layer before the rows left Fabric. Sort by risk, point at the leading factor column, then open the top patient.')

# 41  one patient
s = content("One patient, and the model's own arithmetic")
image(s, EL('how_likely'), 0.89, 1.62, w=5.60, h=4.80)
image(s, CROP('why_score'), 6.75, 1.62, w=5.69, h=4.80)
notes(s, 'Left: the calibrated probability with its band and the cohort context. Right: the six terms that produced it, in log-odds, with the plain-English multiplier beside each. Everything on this page came from gold; nothing is derived in the app.')

# 42  decision record
s = content('The decision is the record')
image(s, EL('record_review'), 0.89, 1.62, w=3.75, h=4.50)
image(s, EL('recent_decisions'), 4.85, 1.62, w=4.20, h=4.50)
tb(s, 9.35, 2.12, 3.09, 3.80, [label('OVERSIGHT, RECORDED'),
    body('Nothing is pre-selected. Agreeing and overriding take the same two clicks, and the disagreement rate is the cheapest drift signal a service has.', space_after=10),
    dict(t='Every decision is stored against the model version the clinician actually saw.', size=14, color=GOLD)])
notes(s, 'Nothing is pre-selected — agreeing and overriding cost the same two clicks. The disagreement rate is the cheapest drift signal a service has, and every decision is stored against the model version the clinician actually saw. This is the oversight record the AI Act asks for, as a table.')

# 43  RLS
s = content('Row-level security, demonstrated rather than claimed')
image(s, IMG('s38_1.png'), 0.89, 2.05, w=11.55)
gold_bar(s, 'The demonstration: sign in as a second clinician and reload the same deep link.')
notes(s, 'DEMO. Grep RayfinDataService for a WHERE clause on clinician — there is not one. Then sign in as a second clinician and reload the same deep link: the policy is evaluated before the query runs, so the rows never enter the response.')

# 44  agent
s = content('A grounded answer, or none')
image(s, IMG('s39_1.png'), 0.89, 1.55, w=11.55)
image(s, CROP('ask_answer'), 0.89, 3.85, w=8.10, h=2.55)
tb(s, 9.30, 3.90, 3.14, 2.60, [label('WHAT IT WILL NOT DO'),
    dict(t='“Should I cancel a patient\'s operation?”', size=14, color=GREEN, space_after=8),
    body('Declined. The agent answers from the governed tables under the same permissions as the rest of the app — and what cannot be grounded is refused rather than improvised.')])
notes(s, 'DEMO. The agent reads the same gold tables under the same permissions, and the grounding is the column comments the notebooks wrote. Ask the flagged-patients question, show the cited tables, then ask it whether to cancel an operation and let it decline. Refusal is a feature here.')

# 45  missing layer
s = content('The missing layer, built')
image(s, IMG('s40_1.png'), 7.00, 1.72, w=5.44)
tb(s, 0.89, 1.97, 5.60, 4.20, [label('WHERE WE STARTED'),
    lead('1,872 papers. 56 models in practice.', space_after=10),
    body('The gap is not modelling capability. It is that data, analytics and decision live in three different estates, with the lineage broken at every boundary.', space_after=10),
    body('What closes it is one governed place, with one lineage from a raw registry row to a recorded clinical decision — and a score a clinician is allowed to argue with.', space_after=10),
    dict(t='Clinicians are not the blocker.', size=14, color=GOLD)])
notes(s, 'Close the loop with the opening number: 1,872 papers, 56 models in practice. The gap is not modelling capability, it is that data, analytics and decision live in three estates with the lineage broken at every boundary. One governed place, one lineage, and a score a clinician is allowed to argue with.')

# 46  five things
s = content('Five things that transfer')
image(s, IMG('s41_1.png'), 0.89, 1.62, w=9.10)
image(s, IMG('s41_2.png'), 10.05, 1.77, w=2.00)
tb(s, 9.90, 4.07, 2.54, 1.90, [label('TAKE IT WITH YOU'), dict(t='Ten Fabric notebooks, the medallion and MLflow design notes, the clinician app with its offline mode, and the model card.', size=12, color=GRAY)])
notes(s, 'Land these five and stop. Repo QR is on screen — ten Fabric notebooks, the medallion and MLflow notes, the app with its offline mode, and the model card. Leave the QR up for questions.')

# ---------- move 'Please rate' to the end ----------
sldIdLst.remove(rate_sldId); sldIdLst.append(rate_sldId)

# ---------- agenda (slide 3) ----------
agenda = [('01', 'Fabric Data Science & ML', '5'), ('02', 'Prediction models in EU healthcare', '8'), ('03', 'The case: NHS PROMs knee data', '12'),
          ('04', 'A model a clinician can argue with', '10'), ('05', 'From experiment to endpoint', '10'), ('06', 'Delivery: clinician app and agent', '12'), ('07', 'Main learnings', '3')]
s3 = prs.slides[2]
tbl_shape = [sh for sh in s3.shapes if sh.has_table][0]; tbl = tbl_shape.table
tr_last = tbl._tbl.tr_lst[-1]
while len(tbl._tbl.tr_lst) < len(agenda):
    tbl._tbl.append(copy.deepcopy(tr_last))
for row, (n, t, m) in zip(tbl.rows, agenda):
    row.height = Emu(500000)
    for cell, text in zip(row.cells, (n, t, m)):
        tf = cell.text_frame
        # keep the first run's formatting, put the text in it, drop other paragraphs
        paras = list(tf.paragraphs)
        target = None
        for p in paras:
            if p.runs: target = p; break
        if target is None: target = paras[0]; target.add_run()
        for p in paras:
            if p is not target: p._p.getparent().remove(p._p)
        runs = target.runs
        runs[0].text = text
        for r in runs[1:]: r._r.getparent().remove(r._r)
print('agenda rows', len(tbl.rows))
prs.save(OUT); print('saved', OUT, 'slides', len(prs.slides))
