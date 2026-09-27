"""Rebuild claudecodepresentation-fabcon.pptx from the pre-review original.
Slides 1-14 kept; a new slide is inserted after slide 5; slides 15+ rebuilt from native,
editable shapes and tables only (the QR code on the closing slide is the one image).
Every number that must come from a Fabric run is left as an editable [placeholder]."""
import copy, sys
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.opc.packuri import PackURI

S = sys.argv[1]; SRC = sys.argv[2]; OUT = sys.argv[3]
FONT = 'Segoe UI'
GREEN = RGBColor(0x00,0x3E,0x34); INK = RGBColor(0x23,0x23,0x23); GRAY = RGBColor(0x44,0x53,0x6A)
GOLD = RGBColor(0xBB,0x9F,0x45); TINT = RGBColor(0xE4,0xEF,0xEB); LINE = RGBColor(0xD6,0xDE,0xDB)
WHITE = RGBColor(0xFF,0xFF,0xFF); RED = RGBColor(0xC5,0x5A,0x11); PALE = RGBColor(0xF6,0xF8,0xF7); GOLDTINT = RGBColor(0xFB,0xF5,0xE6)

prs = Presentation(SRC)
L_CONTENT = prs.slide_layouts[1]; L_TITLE_ONLY = prs.slide_layouts[3]
sldIdLst = prs.slides._sldIdLst
ids = list(sldIdLst)
for sldId in ids[14:41]:
    prs.part.drop_rel(sldId.rId); sldIdLst.remove(sldId)
rate_sldId = list(sldIdLst)[-1]
prs.slides[14].part.partname = PackURI('/ppt/slides/slide15.xml')

# ------------------------------------------------------------------ helpers
def _style(run, size, color=INK, bold=False, italic=False):
    run.font.size = Pt(size); run.font.color.rgb = color; run.font.bold = bold; run.font.italic = italic; run.font.name = FONT

def tb(slide, x, y, w, h, paras, anchor=MSO_ANCHOR.TOP, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.03); tf.margin_top = tf.margin_bottom = Inches(0.02)
    first = True
    for p in paras:
        if isinstance(p, str): p = {'t': p}
        para = tf.paragraphs[0] if first else tf.add_paragraph(); first = False
        para.alignment = p.get('align', align)
        if 'space_after' in p: para.space_after = Pt(p['space_after'])
        if 'space_before' in p: para.space_before = Pt(p['space_before'])
        run = para.add_run(); run.text = p['t']
        _style(run, p.get('size', 14), p.get('color', INK), p.get('bold', False), p.get('italic', False))
    return box

def H(t, **kw):  d = dict(t=t, size=16, color=GREEN, bold=True, space_after=4); d.update(kw); return d   # sub-heading
def L(t, **kw):  d = dict(t=t, size=11, color=GRAY, bold=True, space_after=3); d.update(kw); return d    # small label
def B(t, **kw):  d = dict(t=t, size=13, color=INK, space_after=6); d.update(kw); return d                # body
def N(t, **kw):  d = dict(t=t, size=11, color=GRAY, space_after=4); d.update(kw); return d               # note
def bullet(t, **kw): return B('•  ' + t, **kw)

def rect(slide, x, y, w, h, fill=TINT, rounded=True, line=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded: shp.adjustments[0] = 0.05
    shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line: shp.line.color.rgb = line; shp.line.width = Pt(0.75)
    else: shp.line.fill.background()
    shp.shadow.inherit = False; shp.text_frame.text = ''
    return shp

def box(slide, x, y, w, h, paras, fill=WHITE, line=LINE, pad=0.2):
    rect(slide, x, y, w, h, fill=fill, line=line)
    return tb(slide, x+pad, y+pad-0.04, w-2*pad, h-2*pad+0.04, paras)

def arrow(slide, x, y, w=0.4, h=0.5):
    tb(slide, x, y, w, h, [dict(t='›', size=30, color=GOLD, bold=True, align=PP_ALIGN.CENTER)], anchor=MSO_ANCHOR.MIDDLE)

def vline(slide, x, y, h): return rect(slide, x, y, 0.01, h, fill=LINE, rounded=False)

def table(slide, x, y, w, rows, col_w, font=12, header=True, row_h=0.42, first_bold=True):
    n_rows, n_cols = len(rows), len(rows[0])
    shp = slide.shapes.add_table(n_rows, n_cols, Inches(x), Inches(y), Inches(w), Inches(row_h*n_rows))
    tbl = shp.table
    # switch off the theme's banded style
    tblPr = tbl._tbl.tblPr; tblPr.set('bandRow', '0'); tblPr.set('firstRow', '0')
    total = sum(col_w)
    for i, cw in enumerate(col_w): tbl.columns[i].width = Inches(w*cw/total)
    for r, row in enumerate(rows):
        tbl.rows[r].height = Inches(row_h)
        for c, val in enumerate(row):
            cell = tbl.cell(r, c); cell.margin_left = cell.margin_right = Inches(0.08); cell.margin_top = cell.margin_bottom = Inches(0.04)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            is_head = header and r == 0
            cell.fill.solid(); cell.fill.fore_color.rgb = GREEN if is_head else (PALE if r % 2 == 0 else WHITE)
            tf = cell.text_frame; tf.word_wrap = True
            lines = val if isinstance(val, list) else [val]
            for k, line in enumerate(lines):
                para = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
                run = para.add_run(); run.text = line
                _style(run, font, WHITE if is_head else INK, bold=is_head or (first_bold and c == 0 and k == 0))
    return shp

def notes(slide, text): slide.notes_slide.notes_text_frame.text = text

def content(title, subtitle=None):
    s = prs.slides.add_slide(L_CONTENT)
    for ph in list(s.placeholders):
        if ph.placeholder_format.idx != 0: ph._element.getparent().remove(ph._element)
    t = s.shapes.title
    t.text_frame.text = title; _style(t.text_frame.paragraphs[0].runs[0], 32, GREEN, True)
    if subtitle: tb(s, 0.89, 1.30, 11.55, 0.40, [dict(t=subtitle, size=14, color=GRAY)])
    return s

def section(title):
    s = prs.slides.add_slide(L_TITLE_ONLY)
    for ph in list(s.placeholders):
        if ph.placeholder_format.idx != 0: ph._element.getparent().remove(ph._element)
    t = s.shapes.title; t.left, t.top, t.width, t.height = Inches(0.89), Inches(1.72), Inches(11.53), Inches(1.55)
    t.text_frame.text = title; r = t.text_frame.paragraphs[0].runs[0]; r.font.size = Pt(48); r.font.bold = True; r.font.name = FONT
    t.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    return s

def gold_bar(slide, text, y=6.05, h=0.72):
    rect(slide, 0.89, y, 11.55, h, fill=TINT); rect(slide, 0.89, y, 0.06, h, fill=GOLD, rounded=False)
    tb(slide, 1.17, y+0.06, 11.05, h-0.12, [dict(t=text, size=14, color=GREEN)], anchor=MSO_ANCHOR.MIDDLE)

def three_cols(slide, cols, y=1.85, h=4.0, x0=0.89, w_total=11.55, gap=0.25, fill=WHITE, headfill=None):
    n = len(cols); w = (w_total - gap*(n-1)) / n
    for i, paras in enumerate(cols):
        f = fill if not isinstance(fill, list) else fill[i]
        box(slide, x0 + i*(w+gap), y, w, h, paras, fill=f)

# ================================================================== NEW SLIDE 6
s = content('Three ways a machine learns', 'Machine learning is a family of methods. They differ in what the computer learns from.')
three_cols(s, [
    [H('Supervised learning'), L('LEARNS FROM'), B('Examples with the right answer attached. The computer sees the inputs and the known outcome, and learns the link between them.'),
     L('TYPICAL QUESTIONS'), B('“Will this patient have a poor outcome?”  “What will this score be?”'), L('IN HEALTHCARE'), B('Risk scores, diagnosis support, readmission prediction.'),
     dict(t='This is what we do in this session.', size=13, color=GOLD, bold=True, space_before=6)],
    [H('Unsupervised learning'), L('LEARNS FROM'), B('Examples with no answer attached. The computer looks for structure on its own: groups, patterns, unusual cases.'),
     L('TYPICAL QUESTIONS'), B('“Which patients are similar to each other?”  “Which records look unusual?”'), L('IN HEALTHCARE'), B('Patient segmentation, anomaly detection in claims or devices.')],
    [H('Reinforcement learning'), L('LEARNS FROM'), B('Trial and error. The computer takes actions, gets a reward or a penalty, and learns a strategy over time.'),
     L('TYPICAL QUESTIONS'), B('“Which sequence of actions gives the best result?”'), L('IN HEALTHCARE'), B('Adaptive treatment schedules, resource scheduling. Rare in clinical practice today.')],
], y=1.90, h=4.35)
tb(s, 0.89, 6.40, 11.55, 0.35, [N('Deep learning is not a fourth type: it is a way of building models (neural networks) that can be used inside any of the three.')])
notes(s, 'One minute. Three ways a machine learns, by what it learns from. Ours is supervised: we have past patients with a known outcome, so the computer learns the link between what we knew before surgery and what happened after.')
new6 = list(sldIdLst)[-1]; sldIdLst.remove(new6); sldIdLst.insert(5, new6)

# ================================================================== THE CASE
s = content('Our data: NHS PROMs for knee replacement', 'Patient Reported Outcome Measures: the same questionnaire before the operation and six months after.')
three_cols(s, [
    [H('What it is'), B('NHS England asks every patient having a knee replacement to fill in a questionnaire before surgery, and again six months later.'),
     B('The data is published nationally, anonymised at source, and covers the reporting years 2016/17 to 2018/19 in our build.'), B('One row is one operation (an “episode”).')],
    [H('Where it lives in Fabric'), B('Lakehouse NHS_PROMs_LH, as Delta tables:'), bullet('bronze — the raw CSV files as delivered'), bullet('silver.knee_episode — renamed, typed, cleaned'), bullet('gold.knee_features — one row per episode, model-ready'),
     B('Every table version is kept, so a training run can point at the exact version it used.')],
    [H('How big'), B('129,983 episodes with a known six-month outcome', bold=True), B('103,986 used for training, 25,997 held back for testing', bold=True), B('59 features after encoding, from 79 supplied columns'),
     N('Figures from the training run on gold.knee_features, Delta version 51.'),
    ],
], y=1.90, h=4.35)
notes(s, 'Explain the data plainly. Same questionnaire twice: before surgery and six months after. One row per operation. It sits in the Lakehouse as bronze, silver and gold tables. The counts come from the training run on gold version 51.')

s = content('What the patient tells us before surgery', 'The variables in the questionnaire, grouped. All of these are known before the decision to operate.')
table(s, 0.89, 1.85, 11.55, [
    ['Group', 'What it is', 'What it looks like in the data'],
    ['Oxford Knee Score (OKS)', '12 questions about knee pain and what the patient can do (walking, stairs, washing, kneeling, work…). Each answer scores 0–4. Total 0–48; lower is worse.', 'oks_t0_score 0–48, plus three sub-scores: pain (0–8), function (0–24), daily activities (0–16)'],
    ['EQ-5D-3L', 'A general health questionnaire. Five areas: mobility, self-care, usual activities, pain or discomfort, anxiety or depression. Each has three levels: no problems, some problems, severe problems.', 'Five columns coded 1, 2 or 3'],
    ['Long-term conditions', '12 yes/no questions: heart disease, high blood pressure, stroke, circulation problems, lung disease, diabetes, kidney disease, nervous system disease, liver disease, cancer, depression, arthritis.', '12 flags, and comorbidity_count (0–12)'],
    ['About the patient', 'Age band, sex, how long the knee has hurt, previous surgery on this knee, living arrangements, disability, whether someone helped fill in the form.', 'Age band and sex are “not recorded” where NHS suppressed them'],
    ['The hospital', 'Which provider operated; teaching hospital or not; NHS trust or independent sector; region.', 'From the provider dimension table'],
    ['After surgery (not a feature)', 'OKS and EQ-5D six months later, satisfaction, success. Used only to build the outcome label — never as an input to the model.', 'oks_t1_score, oks_delta'],
], col_w=[2.2, 5.6, 3.75], font=11, row_h=0.62)
notes(s, 'This is the slide people will ask about. Take the groups one at a time. The Oxford Knee Score is the key one: 12 questions, 0 to 48, lower is worse. EQ-5D is general health. Twelve long-term conditions. Then patient context and the hospital. The after-surgery answers only build the label.')

s = content('Supervised learning, in one picture', 'The words the rest of the session uses: features, label, training set, test set, prediction, cut-off.')
w = 2.6; gap = 0.38; y = 1.95; h = 2.1
steps = [('INPUTS · FEATURES', 'Pre-operative record', 'Everything from the questionnaire before surgery. About 20 columns.', TINT),
         ('MODEL · LEARNED FROM HISTORY', 'A function of the features', 'Fitted on past patients whose outcome is known. Learns which patterns went with a poor result.', GREEN),
         ('OUTPUT · PREDICTION', 'A probability', 'For a new patient: the chance of a poor outcome, for example 0.63.', WHITE),
         ('DECISION · CUT-OFF', 'Flag, or not', 'If the probability is above a chosen cut-off, the patient is flagged for review. The cut-off is a service choice.', GOLDTINT)]
for i, (lab, tit, txt, f) in enumerate(steps):
    x = 0.89 + i*(w+gap)
    dark = f == GREEN
    box(s, x, y, w, h, [L(lab, color=(RGBColor(0xBF,0xD9,0xD2) if dark else GRAY)), H(tit, color=(WHITE if dark else GREEN)), B(txt, color=(WHITE if dark else INK))], fill=f, line=(None if dark else LINE))
    if i < 3: arrow(s, x+w-0.02, y+0.8)
three_cols(s, [
    [L('LABEL · WHAT WE PREDICT'), B('outcome_label = 1 if the six-month gain is 7 points or fewer, else 0. Known for past patients, unknown for the one in front of you.')],
    [L('TRAINING SET · TEST SET'), B('Fit on 80% of the labelled history; measure on the 20% held out. The test set is the only honest estimate of how it will do on new patients.')],
    [L('WHY “SUPERVISED”'), B('Every training row comes with its answer. The model is supervised by history, then judged on data it never saw.')],
], y=4.35, h=1.75)
notes(s, 'Level-set the room in one picture. Features on the left, a model fitted on past patients, a probability out, then a cut-off turns it into a decision. The cut-off is a service choice, not a model output.')

s = content('Regression or classification?', 'Both are supervised learning. The difference is what comes out.')
box(s, 0.89, 1.90, 5.65, 3.3, [L('REGRESSION'), H('Predict a number'), B('“How many points will this patient’s Oxford Knee Score improve?”'), B('Output: a number, for example +9 points.'), B('Judged by how far off the number is, on average.')])
box(s, 6.79, 1.90, 5.65, 3.3, [L('CLASSIFICATION · WHAT WE DO', color=GREEN), H('Predict a category'), B('“Will this patient have a poor outcome: a gain of 7 points or fewer?”'), B('Output: a probability, then a yes/no at a chosen cut-off.'), B('Judged by precision and recall on the class that matters — the poor outcomes.')], fill=TINT, line=None)
gold_bar(s, 'We classify because the decision is yes/no — review this patient before surgery, or not — and the 7-point rule gives that cut a clinical meaning.', y=5.45)
notes(s, 'Regression predicts a number, classification predicts a category. We chose classification because the decision is binary and the 7-point threshold has a clinical meaning. Next slide explains the 7.')

s = content('What we predict: a poor outcome', 'The label is a clinical rule, decided before any model was built.')
box(s, 0.89, 1.90, 5.65, 4.25, [L('THE RULE'), H('Poor outcome = the score improves by 7 points or fewer'),
    B('The Oxford Knee Score runs 0–48. A gain of 2 points is real arithmetic but no change the patient can feel.'),
    B('The smallest change a patient reliably notices — the minimal clinically important difference — is about 7 points (Beard et al.).'),
    B('So the label is: outcome_label = 1 when oks_delta ≤ 7. The positive class is the bad outcome on purpose: that is the patient worth finding.')])
box(s, 6.79, 1.90, 5.65, 4.25, [L('WHAT THAT MEANS IN THE DATA'), H('About one patient in six'),
    B('16.5% of patients gain 7 points or fewer. That is the minority class, and it drives every choice about metrics later.'),
    B('Patients who never returned the six-month questionnaire have no label. They are kept apart and not used for training — they are not counted as poor outcomes.'),
    B('Poor outcomes in the test set: 4,295 of 25,997', bold=True), B('That share, 0.165, is the number every model has to beat.', bold=True)], fill=TINT, line=None)
notes(s, 'The label came from patients, not from a curve. Seven points is the smallest change a patient notices. About one in six patients falls at or below it — 16.5% in our data. Patients with no six-month questionnaire get no label and are left out of training; the old analysis counted them as poor outcomes by mistake, and the Fabric pipeline fixed that.')

s = content('Cleaning the data in Fabric: bronze, silver, gold', 'Three layers, each one a Delta table with its own version history.')
three_cols(s, [
    [H('Bronze · as delivered'), bullet('Raw NHS CSV files loaded as they arrived'), bullet('Nothing changed, nothing dropped'), bullet('Each load stamped with its source file and batch')],
    [H('Silver · cleaned'), bullet('79 supplier columns renamed to clear names and typed'), bullet('Codes decoded: “9” means not answered — except on the 12 conditions, where 9 means “no”'), bullet('Age band and sex suppressed by NHS (“*”) become “not recorded”'),
     bullet('Cohort rules: keep primary knee replacements with a pre-operative score')],
    [H('Gold · model-ready'), bullet('One row per episode, readable values'), bullet('Derived features: comorbidity count, OKS sub-scores, merged age bands'), bullet('The outcome label, and a flag for episodes with no follow-up'), bullet('Every column documented, so the Data Agent can read it'),
     bullet('No imputation, no encoding, no split — those belong to the model')],
], y=1.90, h=4.35)
notes(s, 'Keep this short: the data was cleaned in three steps. The one detail worth a sentence is the code 9: it means not answered everywhere except the twelve condition flags, where it means no. Gold is the table everything downstream reads.')

s = content('Missing values: two kinds, two treatments', 'Not every gap in the data means the same thing.')
box(s, 0.89, 1.90, 5.65, 3.6, [L('SUPPRESSED BY NHS'), H('Age band and sex'),
    B('NHS removes age band and sex when a combination of age, sex, hospital and procedure is rare — to protect the patient’s identity.'),
    B('We keep these as “not recorded”. We never guess them: filling them in would undo a protection and put a guessed value into a risk score.')])
box(s, 6.79, 1.90, 5.65, 3.6, [L('NOT ANSWERED BY THE PATIENT'), H('Questionnaire items'),
    B('Some patients skip a question: symptom duration, living arrangements, an EQ-5D item.'),
    B('These are filled in with multiple imputation (MICE): a model estimates the missing answer from the patient’s other answers.'),
    B('Fitted on the training patients only, then applied to the test patients.')], fill=TINT, line=None)
tb(s, 0.89, 5.75, 11.55, 0.8, [B('Share missing per column:  [from the Fabric data]', bold=True)])
notes(s, 'Two kinds of gap. Suppressed by NHS: keep as not recorded, never guess. Skipped by the patient: fill in with MICE, fitted on training data only.')

s = content('Feature engineering: the variables we built', 'The dataset is fixed. What we make of it is not — a few derived variables carry more signal and are easier to explain.')
table(s, 0.89, 1.80, 7.75, [
    ['Derived variable', 'How it is built', 'Why it earns its place'],
    ['Comorbidity count', 'Sum of the twelve long-term condition flags, 0–12.', 'A clinician thinks “how sick is this patient overall”, not twelve separate yes/nos. Several conditions together slow recovery more than any one alone.'],
    ['Three Oxford sub-scores', 'Pain (2 items, 0–8), function (6 items, 0–24), daily activities (4 items, 0–16).', 'What a physiotherapist reasons about, and grouping items smooths the noise one question can carry. The twelve items stay in too, so a non-linear model can still use them.'],
    ['Provider attributes', '294 hospital codes replaced by three facts from public NHS data: teaching hospital or not, NHS or independent, region.', 'One-hot encoding 294 codes adds a sparse column per hospital and invites overfitting. Three attributes keep the signal without it.'],
    ['Merged thin categories', 'Age bands 40–49 with 50–59, 80–89 with 90–120. “Care home” (92 patients) folded into “other”.', 'A category with a handful of patients cannot be learned from, and it broke the imputation step. Merged bands keep their true span.'],
], col_w=[1.85, 2.95, 4.2], font=11, row_h=0.88)
box(s, 8.85, 1.80, 3.59, 4.6, [L('WHAT WE TOOK OUT'),
    bullet('Everything measured after surgery. At prediction time those values do not exist; leaving them in flatters the model and makes it useless in practice.', size=12),
    bullet('Procedure identifiers, and the revision flag — revision surgery is a different clinical situation, so those patients leave the cohort entirely.', size=12),
    bullet('The EQ-5D index and visual-analogue score: a different instrument to the one we predict.', size=12),
    bullet('The raw provider code, once its three attributes were extracted.', size=12)])
gold_bar(s, 'All of this is plain arithmetic on one row at a time — no fitted transform — so it is safe to compute before the train/test split.', y=6.28, h=0.5)
notes(s, 'Feature engineering in plain terms. Comorbidity count: one number for overall burden, because several conditions together slow recovery. The three Oxford sub-scores: what a physiotherapist reasons about, and less noisy than single questions; the individual items stay in too. Provider: 294 codes would be 294 sparse columns, so we mapped them to teaching hospital, sector and region from public NHS reference data. Thin categories merged so they can be learned from. Everything after surgery is removed to avoid leakage. All of this is plain arithmetic per row, so it happens before the split.')

s = content('Class imbalance: why it makes prediction hard', 'Five patients in six do well. The ones we want to find are the minority.')
rect(s, 0.89, 1.95, 9.24, 0.7, fill=RGBColor(0x9F,0xC9,0xBD), rounded=False); rect(s, 10.13, 1.95, 2.31, 0.7, fill=RED, rounded=False)
tb(s, 0.89, 1.95, 9.24, 0.7, [dict(t='Meaningful improvement · 83.5%', size=14, color=INK, bold=True, align=PP_ALIGN.CENTER)], anchor=MSO_ANCHOR.MIDDLE)
tb(s, 10.13, 1.95, 2.31, 0.7, [dict(t='Poor outcome · 16.5%', size=12, color=WHITE, bold=True, align=PP_ALIGN.CENTER)], anchor=MSO_ANCHOR.MIDDLE)
tb(s, 0.89, 2.7, 11.55, 0.3, [N('Held-out test set: 4,295 poor outcomes out of 25,997 patients.')])
three_cols(s, [
    [L('WHAT GOES WRONG'), B('If left unaddressed, a model favours the majority class: it predicts “good outcome” for most patients simply because that is the most common result.'),
     B('That gives 83.5% accuracy on our data — and finds not one patient who needs help before surgery.'), B('The model sees far fewer examples of a poor outcome, so the patterns behind it are harder to learn and easier to mistake for noise.')],
    [L('WHAT IT DOES TO THE SCORE'), B('The probabilities come out low for almost everyone, because a poor outcome is rare. A patient at 30% is already well above the average patient.'),
     B('So the cut-off cannot be the usual 50%. Where to put it becomes a decision in its own right (next slides).'), B('Accuracy hides all of this. We do not use it.')],
    [L('WHAT WE DID'), B('Class weighting: mistakes on poor-outcome patients cost the model more during training, so it cannot ignore them. No synthetic data is added.'),
     B('Stratified splitting: training and test sets keep the same share of poor outcomes.'), B('Metrics built for the minority class: precision, recall and average precision.'),
     N('Oversampling (SMOTE) was also considered; it adds made-up patients and can add noise, so weighting was preferred.')],
], y=3.1, h=3.4, fill=[WHITE, WHITE, TINT])
notes(s, 'Class imbalance in plain words: one in six is a poor outcome, 16.5 percent. A model that ignores them looks accurate and helps nobody. Rare outcomes are harder to learn, and the probabilities come out low for everyone, so the usual 50 percent cut-off does not apply. We used class weighting, stratified splits, and metrics that look at the minority class.')

s = content('Precision and recall: which mistake is worse?', 'Two ways to be wrong. The service has to decide which one it can live with.')
table(s, 0.89, 1.85, 6.0, [
    ['', 'Model says: poor outcome', 'Model says: good outcome'],
    ['Actually poor outcome', 'True positive — found', 'False negative — missed'],
    ['Actually good outcome', 'False positive — wrongly flagged', 'True negative'],
], col_w=[1.9, 2.05, 2.05], font=12, row_h=0.62)
box(s, 0.89, 3.85, 6.0, 2.35, [L('THE TWO NUMBERS'), B('Precision: of the patients we flag, how many really have a poor outcome. High precision = few false alarms.'),
    B('Recall: of all patients with a poor outcome, how many we flag. High recall = few missed.'), B('Pushing one up pushes the other down. You cannot have both from the same model.')])
box(s, 7.15, 1.85, 5.29, 4.35, [L('WHY WE PUT PRECISION FIRST'), H('A false alarm has a high cost'),
    B('If we wrongly flag a patient with a good outlook, the model might lead them to forgo an operation that would have helped. When the model says “likely to score poorly”, that has to be right.'),
    B('Missing some poor outcomes is less critical for the individual: they have the surgery, score less than ideal, but usually still gain some points.'),
    B('So we favour precision, but we still want to reach enough patients to make a difference — recall is not ignored, it is the price we track.'),
    N('Average precision (the area under the precision–recall curve) summarises the whole trade-off in one number and is our headline metric.')], fill=TINT, line=None)
notes(s, 'Two mistakes. A false positive means telling a patient with a good outlook not to operate; that is the expensive one. A false negative means a patient has surgery and gains less than hoped, but usually still gains something. So precision first, recall as the price we track.')

s = content('From a probability to a decision: the threshold', 'A cut-off turns the probability into a yes or no. Moving it moves precision and recall in opposite directions.')
table(s, 0.89, 1.85, 6.9, [
    ['Cut-off', 'Precision', 'Recall', 'On the 25,997 test patients'],
    ['0.50', '0.68', '0.099', 'About 2 flags in 3 are right'],
    ['0.62  (in use)', '0.80', '0.056', '300 flagged · 60 of them unnecessary · 4,055 poor outcomes missed'],
], col_w=[1.35, 1.2, 1.1, 3.25], font=12, row_h=0.62)
tb(s, 0.89, 3.9, 6.9, 0.5, [N('Calibrated EBM on the held-out test set, from the Fabric threshold analysis.')])
box(s, 0.89, 4.35, 6.9, 1.85, [B('Raise the cut-off: fewer patients flagged, almost all of them correct, most poor outcomes missed.'), B('Lower it: more patients flagged, more of them wrongly.'), B('Nothing in the data tells you which of those is better. That is a judgement about the service.')], fill=TINT, line=None)
box(s, 8.05, 1.85, 4.39, 4.35, [L('HOW TO READ THE TABLE'), B('At 0.50 the model is right about two flags in three, and finds about 1 poor outcome in 10.'),
    B('At 0.62 four flags in five are right, and about 1 poor outcome in 18 is found. That was chosen by holding precision at 80%.'),
    B('Precision rises with the cut-off in every model we tried; recall falls just as reliably.'),
    B('The cut-off is a policy choice: it depends on how many patients the service can review and on which mistake it can live with. It is not a property of the model.', bold=True)])
notes(s, 'This is the slide that makes the trade-off concrete. A higher cut-off buys precision with recall. Read the second row: at 0.62 four flags in five are right, but 4,055 poor outcomes still go past us. The service chooses the row, not the data scientist.')

s = content('Train, validate, test', 'The split happens first. Everything the model learns is learned from the training patients only.')
steps = [('STEP 1', 'Split', '80% training, 20% test, keeping the same share of poor outcomes in both.'), ('STEP 2', 'Fill in, encode, tune — on training only', 'Imputation and encoding are fitted on the training patients. Model settings are chosen by cross-validation inside the training set.'), ('STEP 3', 'Evaluate once', 'The test set is used once, at the end, for the numbers we report.')]
w = 3.6; gap = 0.375
for i, (lab, tit, txt) in enumerate(steps):
    x = 0.89 + i*(w+gap); box(s, x, 1.90, w, 2.05, [L(lab), H(tit), B(txt)], fill=(GREEN if i == 0 else WHITE), line=(None if i == 0 else LINE)) if i else box(s, x, 1.90, w, 2.05, [L(lab, color=RGBColor(0xBF,0xD9,0xD2)), H(tit, color=WHITE), B(txt, color=WHITE)], fill=GREEN, line=None)
    if i < 2: arrow(s, x+w-0.02, 2.65)
box(s, 0.89, 4.2, 5.65, 2.2, [L('CROSS-VALIDATION · HOW THE SETTINGS ARE CHOSEN'),
    B('The training set is cut into 5 folds. Each candidate setting is trained on 4 folds and scored on the 5th, five times over, and the scores are averaged.', size=12),
    B('Every model has settings to choose (tree depth, learning rate, number of rounds). Cross-validation picks them without ever touching the test set.', size=12),
    B('Each of these runs is recorded in the Fabric experiment, so the winning settings can be promoted rather than retyped.', size=12)], fill=TINT, line=None)
box(s, 6.79, 4.2, 5.65, 2.2, [L('THREE CHECKS BEFORE ANY MODEL IS FITTED'),
    bullet('No after-surgery column can be a feature (nothing from the six-month questionnaire).', size=12),
    bullet('Every feature the model expects really exists in the data.', size=12),
    bullet('Age band and sex are never filled in by imputation.', size=12)])
notes(s, 'Split first. Then imputation, encoding and the choice of settings happen inside the training set, using five-fold cross-validation. The test set is touched once. Three checks run before any model is fitted.')

# ================================================================== TRAINING & TRACKING
section('Training and tracking in Fabric')

s = content('Three models we compared', 'Same training data, same test data, same metrics. Only the model changes.')
table(s, 0.89, 1.85, 11.55, [
    ['Model', 'How it works', 'Can a person read it?', 'Role', 'Average precision', 'Calibration error'],
    ['Logistic regression', 'One weight per variable, added up. Class-weighted so the minority class counts.', 'Yes — a linear model', 'Baseline: the floor to beat', '0.374', '0.288'],
    ['Random forest', 'Hundreds of decision trees, averaged.', 'No — needs a second method (SHAP) to explain it', 'Challenger: strong but a black box', '0.378', '0.278'],
    ['Explainable boosting machine (EBM)', 'One curve per variable, learned by boosting; prediction = the sum of the curves.', 'Yes — the curves are the model', 'Candidate: the one we calibrate and ship', '0.390', '0.004'],
], col_w=[2.05, 3.0, 2.25, 1.9, 1.15, 1.25], font=12, row_h=0.8)
tb(s, 0.89, 5.2, 11.55, 0.3, [N('Held-out test set, 25,997 patients. A model with no skill would score 0.165 — the share of poor outcomes.')])
box(s, 0.89, 5.55, 11.55, 0.95, [B('The EBM beats the linear floor and edges past the random forest, so its extra complexity earns its place — and its probabilities are already close to honest, where the other two are far off. Both checks come from the experiment, not from assumption.')], fill=TINT, line=None)
notes(s, 'Three models, same split, same metrics. Logistic regression is the floor. Random forest is the strong black box. The EBM wins on both: average precision 0.390 against 0.378, and a calibration error of 0.004 where the other two sit near 0.28.')

s = content('ML experiments: every training run is recorded', 'A Fabric ML experiment is the workspace item where each run writes its parameters, metrics, tags and model file.')
box(s, 0.89, 1.90, 7.0, 4.45, [L('HOW OUR EXPERIMENT IS ORGANISED'), H('One parent run, one child run per model'),
    B('Parent: “training-session” — split sizes, number of features, the baseline to beat.'),
    B('Children: logistic-regression, random-forest, ebm — each with its own parameters, metrics and tags.'),
    B('Hyper-parameter searches sit alongside as their own runs — 35 in this experiment so far — so winning settings are promoted, not copied by hand.'),
    B('One more run: ebm-calibrated — the version that ships.'),
    L('WHAT EVERY RUN CARRIES', space_before=8),
    bullet('Parameters — the settings, so the run can be repeated', size=12), bullet('Metrics — average precision, Brier score, calibration error, recall at 80% precision', size=12),
    bullet('Tags — facts you filter on: data version, interpretability, risk class, approval', size=12), bullet('Artifacts — the model file, its input signature and the fitted preprocessing', size=12)])
box(s, 8.14, 1.90, 4.3, 4.45, [L('WHY IT MATTERS'), B('Six weeks later nobody remembers which run produced the model in use. The experiment does.'),
    B('You can compare the three models side by side in the Fabric UI instead of in someone’s memory.'),
    B('Fabric’s automatic logging is switched off on purpose: it logs accuracy-first metrics on every internal fit and buries the runs you care about. We log explicitly.')], fill=TINT, line=None)
notes(s, 'Show the experiment item. One parent run for the session, one child per model, and the calibrated run that ships. Each run has parameters, metrics, tags and the model file. Autologging is off on purpose.')

s = content('Tags: the facts an auditor asks for', 'Metrics say how good a run is. Tags say what it is, what it was trained on, and whether it may be used.')
table(s, 0.89, 1.85, 11.55, [
    ['Group', 'Tags', 'The question it answers'],
    ['Identity', 'model_family, model_role, interpretability, calibrated', 'What is this run? Is it a glassbox model? Is the probability calibrated?'],
    ['Data', 'gold_table, gold_table_version, feature_set_version, target_definition, cohort', 'What exactly was it trained on? “gold as of version 51” can be reconstructed with Delta time travel.'],
    ['Governance', 'intended_use, risk_class, human_oversight, approved_by, approved_on, gate_status', 'May we deploy it, and who signed it off? approved_by starts as “pending” and is set later by a named clinician.'],
    ['Provenance', 'git_sha, notebook, run_by, fabric_workspace', 'Can we rebuild it?'],
], col_w=[1.6, 4.3, 5.65], font=12, row_h=0.72)
gold_bar(s, 'Two years later: “reconstruct the exact input this model was trained on, and show me who approved it.” The tags are the answer.', y=5.6)
notes(s, 'Four groups of tags. The data group turns trained on gold into trained on gold as of version 7. The governance group is where a named clinician signs off, after training, without re-running anything.')

s = content('Calibration: a probability you can read at face value', 'A model can rank patients well and still be wrong about the numbers it shows.')
box(s, 0.89, 1.90, 5.65, 3.65, [L('WHAT CALIBRATED MEANS'), H('34% should mean 34 in 100'), B('Of a hundred patients scored 34%, about thirty-four should have a poor outcome. If it is really fifty, the number misleads the clinician.'),
    B('We check this with the Brier score and the expected calibration error (ECE), not with average precision.')])
box(s, 6.79, 1.90, 5.65, 3.65, [L('WHAT WE DID'), H('Isotonic calibration on a held-out fold'), B('The EBM is fitted, then its probabilities are corrected on data it did not train on.'),
    B('Ranking barely changes; the numbers become honest. The calibrated run is the one that is registered.'),
    B('Calibration error: EBM 0.0042 → 0.0032 after calibration', bold=True), B('For contrast: the random forest sits at 0.278 and the linear model at 0.288 — those probabilities cannot be read at face value.', bold=True)], fill=TINT, line=None)
gold_bar(s, 'Calibration is a property of the group, not of one person. The app says so next to every number.', y=5.8)
notes(s, 'Calibration makes the number actionable. Of a hundred patients scored 34 percent, about thirty-four should have a poor outcome. Our EBM was already close — 0.0042 down to 0.0032 — while the random forest sits at 0.278. The check is the point: an uncalibrated probability must never reach a clinician.')

s = content('The ML model item: versions and a gate', 'Registering promotes a run’s model file to a Fabric ML model: a versioned, permissioned item in the workspace.')
box(s, 0.89, 1.90, 5.65, 4.25, [L('THE REGISTERED MODEL'), H('knee-poor-outcome-ebm'), bullet('Each training that passes becomes a new version'), bullet('Each version carries the run’s tags plus a signature: the exact input columns it accepts'),
    bullet('Exactly one version is tagged champion = true'), bullet('The app and the endpoint refer to the name and the champion tag — never to a file'),
    N('Champion today: version 4, trained on gold version 51, test average precision 0.389.')])
box(s, 6.79, 1.90, 5.65, 4.25, [L('THE DEPLOYMENT GATE · THE LAST STEP OF TRAINING'), H('Four checks, pass or fail'),
    bullet('Beats the no-skill baseline by at least 1.3×'), bullet('Calibration error under 5%'), bullet('Recall at 80% precision above 5%'), bullet('Interpretable model family'),
    B('The result is written to gate_status. None of the checks can set approved_by: that waits for a named clinician.', space_before=6)], fill=TINT, line=None)
notes(s, 'The model item is what everything downstream binds to. Versions, tags, a signature. Four automated gates write gate status. A named clinician sets approved by, later.')

s = content('Serving the model: batch and real-time', 'Two ways to use one registered model. Both resolve the champion version, so they cannot disagree.')
box(s, 0.89, 1.90, 5.65, 3.6, [L('BATCH SCORING'), H('The whole waiting list, on a schedule'), B('A Data Pipeline runs the steps in order and re-scores every patient awaiting surgery.'),
    B('It writes two gold tables: gold.patient_risk (one probability per patient) and gold.risk_explanation (the reasons). Both stamped with the model version.'), B('Feeds: the worklist, the overview, the Data Agent.')])
box(s, 6.79, 1.90, 5.65, 3.6, [L('REAL-TIME ENDPOINT · FROM THE ML MODEL ITEM'), H('One patient, right now'), B('Fabric can stand up a managed web endpoint from the registered version. A single patient is scored in milliseconds; a Spark session would take minutes.'),
    B('Authenticated with Entra ID, versioned, inside the workspace. No model file leaves the estate.'), B('Feeds: a what-if on a patient page, or another system.')], fill=TINT, line=None)
gold_bar(s, 'Why it matters: a model that only lives in a notebook is not in production. The endpoint makes the registered version callable by other systems, safely.', y=5.75)
notes(s, 'Batch for the list, real-time for the single patient. Both use the champion tag, so promoting a new version changes both at once.')

s = content('What the endpoint returns', 'The score never travels alone.')
table(s, 0.89, 1.85, 7.2, [
    ['Field', 'Example', 'Why it is there'],
    ['episode_id', 'MFC-2026-100070', 'Which patient'],
    ['risk', '0.63 (calibrated)', 'The probability of a poor outcome'],
    ['threshold, flagged', '0.62, true', 'The cut-off in use and the decision at that cut-off'],
    ['contributions', 'six terms, e.g. previous surgery +0.43', 'The reasons, in the model’s own units'],
    ['model_version', 'knee-poor-outcome-ebm v4, champion', 'Which model produced the score'],
    ['gold_table_version', '51', 'Which version of the data the model was trained on'],
], col_w=[2.0, 2.6, 2.6], font=11, row_h=0.55)
box(s, 8.35, 1.85, 4.09, 3.85, [L('VERSIONED, AUTHENTICATED, IN-ESTATE'), B('A clinician can act on the score.'), B('An auditor can trace it back to the model version and the data version that produced it.'), B('Neither needs a second system.'), N('Example values are illustrative; the field list is the contract.')], fill=TINT, line=None)
notes(s, 'Six contributions, the model version and the data version travel with every score. That is what makes the number traceable.')

s = content('Demo: the experiment, the model and the endpoint', 'In the Fabric workspace.')
steps = [('1 · ML EXPERIMENT', 'Parent run and child runs', 'Compare the three models side by side.'), ('2 · FILTER BY TAG', 'interpretability = blackbox', 'The deployment rule, as a query.'), ('3 · ML MODEL ITEM', 'Versions and their tags', 'Which version is champion, and why.'),
         ('4 · THE DATA VERSION', 'gold_table_version', 'Run SELECT … VERSION AS OF to show the exact training table.'), ('5 · THE ENDPOINT', 'Send one patient', 'Read back the risk, the reasons and the versions.')]
w = 2.15; gap = 0.2
for i, (lab, tit, txt) in enumerate(steps):
    x = 0.89 + i*(w+gap); dark = i == 0
    box(s, x, 1.95, w, 2.3, [L(lab, color=(RGBColor(0xBF,0xD9,0xD2) if dark else GRAY)), H(tit, color=(WHITE if dark else GREEN), size=14), B(txt, color=(WHITE if dark else INK), size=12)], fill=(GREEN if dark else (GOLDTINT if i == 4 else WHITE)), line=(None if dark else LINE), pad=0.16)
gold_bar(s, 'If the endpoint is not deployed on the day: show the batch scoring run and the gold.patient_risk table instead.', y=4.6)
notes(s, 'Demo. Experiment, filter by tag, model item, the data version query, then one call to the endpoint. Fallback: the batch scoring run.')

# ================================================================== INTERPRETABILITY
section('A model a clinician can argue with')

s = content('Why we chose the explainable boosting machine', 'Interpretability is a requirement here, not a preference: the EU AI Act asks for meaningful human oversight of high-risk clinical decision support.')
box(s, 0.89, 1.90, 5.65, 4.0, [L('THE EBM'), H('Prediction = the sum of one curve per variable'), B('The model learns one curve per variable: given this value, how much does the risk move? The score is the intercept plus those curves added up.'),
    B('So the explanation is the model. When it says a pre-operative score of 16 added +0.42, that is what the model did, not an estimate of it.'), B('A clinician can read the curves and disagree with them.')])
box(s, 6.79, 1.90, 5.65, 4.0, [L('THE RANDOM FOREST'), H('Needs a second model to explain the first'), B('SHAP is good work — but it is an approximation built on top of the model. In front of a regulator you have to answer: how do you know the explanation is faithful?'),
    B('For a glassbox model that question does not arise.'),
    B('And we do not pay for it: average precision 0.390 for the EBM against 0.378 for the random forest.', bold=True),
    B('The two rank the drivers almost the same way — a rank correlation of 0.86 — so readability is not bought by seeing something different.')], fill=TINT, line=None)
gold_bar(s, 'A clinician cannot disagree with a random forest. Oversight of something you cannot disagree with is not oversight.', y=6.1)
notes(s, 'The EBM is additive: one curve per variable, added up. The explanation is the model itself. SHAP on a random forest is a separate model of the model. That difference is what a regulator will ask about.')

s = content('Explaining one patient’s score', 'The six largest terms for one patient, in the model’s own units. They add up, with the intercept, to the score.')
rows = [('Previous surgery on this knee', 0.43), ('Mobility (EQ-5D)', 0.40), ('Pre-operative pain', 0.30), ('Number of long-term conditions', -0.20), ('How long symptoms have lasted', 0.16), ('Pre-operative Oxford Knee Score', 0.12)]
x0 = 6.2; scale = 3.2; y = 2.0
tb(s, 4.95, 1.65, 1.3, 0.3, [L('← LOWERS')]); tb(s, 6.25, 1.65, 2.2, 0.3, [L('RAISES RISK →')])
rect(s, x0, 1.95, 0.02, 3.9, fill=INK, rounded=False)
for i, (lab, v) in enumerate(rows):
    yy = y + i*0.62
    tb(s, 0.89, yy, 4.0, 0.5, [dict(t=lab, size=12, color=INK, bold=True, align=PP_ALIGN.RIGHT)], anchor=MSO_ANCHOR.MIDDLE)
    if v >= 0:
        rect(s, x0, yy+0.08, v*scale, 0.36, fill=RED, rounded=False); tb(s, x0+v*scale+0.05, yy, 1.0, 0.5, [dict(t=f'+{v:.2f}', size=12, color=RED, bold=True)], anchor=MSO_ANCHOR.MIDDLE)
    else:
        rect(s, x0+v*scale, yy+0.08, -v*scale, 0.36, fill=RGBColor(0x1E,0x7A,0x5C), rounded=False); tb(s, x0+v*scale-0.62, yy, 0.58, 0.5, [dict(t=f'{v:.2f}', size=12, color=RGBColor(0x1E,0x7A,0x5C), bold=True, align=PP_ALIGN.RIGHT)], anchor=MSO_ANCHOR.MIDDLE)
box(s, 8.6, 2.0, 3.84, 3.85, [L('HOW TO READ IT'), B('Each bar is one variable’s contribution in log-odds. Positive raises the risk, negative lowers it.'), B('The six bars plus the smaller terms and the intercept add up to this patient’s probability.'),
    B('This is the arithmetic a clinician can check and challenge — and the same numbers the app and the Data Agent show.'), N('Illustrative values; replace with a real patient from the Fabric run.')], fill=TINT, line=None)
notes(s, 'One patient, six bars. They add up to her score; that is arithmetic, not an analogy. Replace the values with a real patient from the Fabric run before the session.')

s = content('Choosing the cut-off with the service', 'The trade-off is known. Now it has to be made in patients, by the people who run the pathway.')
table(s, 0.89, 1.85, 7.3, [
    ['At the chosen cut-off of 0.62', 'Per 1,000 patients', 'On the 25,997 test patients'],
    ['Flagged for review', '12', '300'],
    ['Of which unnecessary', '2', '60'],
    ['Poor outcomes missed', '156', '4,055'],
], col_w=[3.0, 2.1, 2.2], font=12, row_h=0.52)
box(s, 8.45, 1.85, 3.99, 2.9, [L('HOW WE GOT THERE'), B('We held precision at 80% — four of five flagged patients should really be at risk, or the review pathway loses credibility — and took the highest recall that allows. That put the cut-off at 0.62.'), B('Counts per 1,000 make the cost visible to a clinic manager, not only to a data scientist.')], fill=TINT, line=None)
box(s, 0.89, 4.15, 7.3, 2.0, [L('TWO MORE CHECKS BEFORE THE CUT-OFF IS WRITTEN INTO A PATHWAY'), bullet('Does it hold for each subgroup — for example the over-80s? A rule that works on average and fails for one group goes in the model card as a limitation.'), bullet('Is using the model at this cut-off better than reviewing everyone, or nobody?')])
box(s, 8.45, 4.95, 3.99, 1.2, [B('The chosen cut-off is recorded on the model version, so the number the app uses can always be traced to this analysis.', size=12)], fill=GOLDTINT, line=None)
notes(s, 'Holding precision at 80% puts the cut-off at 0.62. On a thousand patients that is twelve flagged, two of them unnecessary, and 156 poor outcomes still missed. Say the missed number out loud — it is the honest part. Then the subgroup and decision-curve checks, and the choice recorded on the model version.')

# ================================================================== DELIVERY
section('Delivery: the clinician app')

s = content('What it took to build the clinician app', 'Rayfin: a Microsoft toolkit that provisions a full application inside the Fabric workspace from one command.')
box(s, 0.89, 1.90, 5.65, 4.25, [L('WHAT RAYFIN IS'), H('npx rayfin up'), B('You describe the data model as TypeScript classes. One command provisions, inside the workspace:'),
    bullet('a SQL database in Fabric'), bullet('a GraphQL API (Data API Builder)'), bullet('Entra ID sign-in with claims'), bullet('static hosting for the React front end'),
    B('No separate cloud subscription, no second identity provider, nothing to re-govern.', space_before=6)])
box(s, 6.79, 1.90, 5.65, 4.25, [L('WHY IT IS RELEVANT HERE'), H('Row-level security lives next to the data'), B('The rule “a clinician sees only their own patients” is declared on the data entity and enforced by the API before a row leaves Fabric — not by a filter in the web page.'),
    B('The scored tables are copied from the Lakehouse into the app’s SQL database. The app never loads a model; it reads governed tables.'), B('The Data Agent reads the same gold tables in the Lakehouse, under the same permissions.')], fill=TINT, line=None)
notes(s, 'Rayfin: describe the data model, run one command, and you get a database, an API, sign-in and hosting inside the workspace. The important detail is where security lives: on the data entity, enforced before a row leaves Fabric.')

s = content('What the clinician sees, and what is recorded', 'Decision support, not decision making.')
steps = [('1 · WORKLIST', 'Their own patients, highest risk first', 'Filtered by row-level security on the data.'), ('2 · ONE PATIENT', 'The probability and the reasons', 'The calibrated score, its band, and the six largest terms in plain words.'),
         ('3 · THE DECISION', 'Agree or override, with a reason', 'Nothing is pre-selected. Stored with the score and model version the clinician saw.'), ('4 · ASK', 'Questions in plain language', 'The Data Agent answers from the governed tables, cites them, and declines clinical advice.')]
w = 2.7; gap = 0.25
for i, (lab, tit, txt) in enumerate(steps):
    x = 0.89 + i*(w+gap); box(s, x, 1.95, w, 2.5, [L(lab), H(tit, size=14), B(txt, size=12)], fill=(TINT if i == 2 else WHITE), line=(None if i == 2 else LINE), pad=0.18)
gold_bar(s, 'The recorded decision — including every override — is the human-oversight record the EU AI Act asks for, kept as a table.', y=4.8)
tb(s, 0.89, 5.6, 11.55, 0.6, [N('Demo: open the worklist, open the top patient, record a decision, ask the agent one question and one it must refuse.')])
notes(s, 'Four screens. Worklist, patient, decision, ask. The decision record with overrides is the oversight record. Demo it live; the offline build is the fallback.')

# ================================================================== LEARNINGS
section('Learnings')

s = content('What we learned building it', 'Six things we would do again.')
items = [('Decide the label with clinicians first', 'The 7-point rule is a clinical fact. Everything else follows from it.'),
         ('Treat missing values by cause, not by column', 'Suppressed by NHS: keep as not recorded. Skipped by the patient: impute. Never guess a protected characteristic.'),
         ('Split before you fit anything', 'Imputation and encoding fitted on all data leak the test set into training.'),
         ('Use the metric that matches the harm', 'Precision–recall for a rare bad outcome. Calibrate, because the number is shown to a person.'),
         ('Log decisions, not just results', 'Tags for data version, interpretability and approval; a gate that can say no; the cut-off recorded on the model version.'),
         ('Prefer a model people can read', 'The EBM kept up with the random forest and can be challenged at the bedside.')]
for i, (t, d) in enumerate(items):
    r, c = divmod(i, 2); x = 0.89 + c*5.9; y = 1.9 + r*1.45
    box(s, x, y, 5.65, 1.3, [H(f'{i+1}.  {t}', size=14), B(d, size=12)], pad=0.16)
notes(s, 'Six learnings. Read them out; each has a slide behind it earlier in the deck.')

s = content('How this applies in a clinical setting', 'What has to be true before a score like this reaches a patient.')
table(s, 0.89, 1.85, 11.55, [
    ['Requirement', 'What it means in practice', 'How we met it'],
    ['Human oversight', 'A clinician makes the decision and can disagree with the model', 'Readable model; agree/override recorded with a reason'],
    ['Explanation for the patient', 'The patient can be told why, in plain words', 'Per-patient terms with clinician-readable labels'],
    ['A number that means what it says', 'A probability is acted on as a probability', 'Calibrated model; group-not-individual caveat shown'],
    ['A cut-off owned by the service', 'Capacity and harm decide the threshold, not the data scientist', 'Sweep in patients per 1,000; choice recorded on the model version'],
    ['Fairness across groups', 'The rule must not quietly fail for one group', 'Subgroup check of the cut-off; limitations in the model card'],
    ['Traceability', 'Which data and which model produced this score, and who approved it', 'Delta versions, MLflow tags, approved_by, scores stamped with the model version'],
    ['Access control', 'Clinicians see only their own patients', 'Row-level security on the data entity, enforced before rows leave Fabric'],
], col_w=[2.4, 4.5, 4.65], font=11, row_h=0.55)
notes(s, 'Map the regulation to practice. Each row is something the AI Act or GDPR asks for, what it means on the ward, and where in the build we did it.')

s = content('Why Fabric fits healthcare applications', 'Data, analytics and the decision stay in one governed place. No copies, no exports.')
three_cols(s, [
    [H('One estate'), bullet('OneLake holds the raw files, the cleaned tables and the scores'), bullet('Delta versions: any training input can be reconstructed exactly'), bullet('Lineage from the raw file to the recorded decision'), bullet('Sensitivity labels follow the data downstream')],
    [H('Built-in machine learning'), bullet('Notebooks with Spark for the big steps and Python for the interpretable model'), bullet('MLflow experiments and the model registry are workspace items, with permissions'), bullet('Managed endpoints from a registered model'), bullet('Data Pipelines to run scoring on a schedule')],
    [H('Delivery without leaving'), bullet('An application with database, API, sign-in and hosting inside the workspace (Rayfin)'), bullet('Row-level security enforced on the data'), bullet('A Data Agent that answers only from the governed tables, under the same permissions'), bullet('Healthcare data solutions for clinical data standards when you go beyond a single dataset')],
], y=1.90, h=4.15)
gold_bar(s, 'Accuracy gets a model into the room. Traceability, oversight and governed delivery get it to the bedside.', y=6.2)
notes(s, 'The closing argument. One estate: the data never leaves. Machine learning is built in, with experiments, registry and endpoints as governed items. Delivery, including the app and the agent, stays inside the same permissions. Leave this slide up for questions.')

# ---------- closing slide to the end ----------
sldIdLst.remove(rate_sldId); sldIdLst.append(rate_sldId)

# ---------- agenda (slide 3) ----------
agenda = [('01', 'Fabric Data Science & ML', '5'), ('02', 'Prediction models in EU healthcare', '8'), ('03', 'The data and the problem', '13'),
          ('04', 'Training and tracking the model in Fabric', '12'), ('05', 'A model a clinician can argue with', '7'), ('06', 'Delivery: the clinician app', '5'), ('07', 'Learnings', '6')]
s3 = prs.slides[2]
tbl = [sh for sh in s3.shapes if sh.has_table][0].table
tr_last = tbl._tbl.tr_lst[-1]
while len(tbl._tbl.tr_lst) < len(agenda): tbl._tbl.append(copy.deepcopy(tr_last))
for row, vals in zip(tbl.rows, agenda):
    row.height = Emu(500000)
    for cell, text in zip(row.cells, vals):
        tf = cell.text_frame; paras = list(tf.paragraphs)
        target = next((p for p in paras if p.runs), paras[0])
        if not target.runs: target.add_run()
        for p in paras:
            if p is not target: p._p.getparent().remove(p._p)
        target.runs[0].text = text
        for r in target.runs[1:]: r._r.getparent().remove(r._r)
prs.save(OUT); print('saved', OUT, 'slides', len(prs.slides))
