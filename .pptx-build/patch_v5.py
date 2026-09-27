p="build_deck_v5.py"; s=open(p).read()
def rep(old, new, count=1):
    global s
    assert old in s, old[:80]
    s = s.replace(old, new, count)

rep("""     N('Read these two counts from the Fabric notebook 31 output before the session.')],""", """    ],""")
rep("""B('Episodes in gold:  [count from gold.knee_features]', bold=True), B('Episodes with a known six-month outcome:  [count where has_label = true]', bold=True)""",
    """B('Episodes:  [count from the Fabric data]', bold=True), B('Episodes with a known six-month outcome:  [count from the Fabric data]', bold=True)""")
rep("""bullet('The label and has_label'), bullet('Every column documented, so the Data Agent can read it'),
     bullet('No imputation, no encoding, no split — those belong to the model'), N('Notebook 30')],""",
    """bullet('The outcome label, and a flag for episodes with no follow-up'), bullet('Every column documented, so the Data Agent can read it'),
     bullet('No imputation, no encoding, no split — those belong to the model')],""")
rep("""bullet('Each load stamped with its source file and batch'), N('Notebook 10')],""", """bullet('Each load stamped with its source file and batch')],""")
rep("""bullet('Cohort rules: keep primary knee replacements with a pre-operative score'), N('Notebook 20')],""", """bullet('Cohort rules: keep primary knee replacements with a pre-operative score')],""")
rep("""B('Share of poor outcomes in gold:  [from notebook 31]', bold=True), B('Episodes without a label:  [from notebook 31]', bold=True)]""",
    """B('Share of poor outcomes:  [from the Fabric data]', bold=True), B('Episodes without a six-month questionnaire:  [from the Fabric data]', bold=True)]""")
rep("""B('Patients who never returned the six-month questionnaire have no label. They are marked has_label = false and are not used for training — they are not counted as poor outcomes.'),""",
    """B('Patients who never returned the six-month questionnaire have no label. They are kept apart and not used for training — they are not counted as poor outcomes.'),""")
rep("""tb(s, 0.89, 5.75, 11.55, 0.8, [B('Share missing per column:  [from notebook 20 or 31 output]', bold=True), N('Demo option: show the missing-value table live in notebook 31.')])""",
    """tb(s, 0.89, 5.75, 11.55, 0.8, [B('Share missing per column:  [from the Fabric data]', bold=True)])""")
rep("""    N('These are assertions in notebook 40. They fail loudly instead of quietly producing a number nobody should quote.')], fill=TINT, line=None)""", """    ], fill=TINT, line=None)""")
rep("""box(s, 6.79, 1.90, 5.65, 4.25, [L('THE DEPLOYMENT GATE · LAST CELL OF NOTEBOOK 40'), H('Four checks, pass or fail'),""", """box(s, 6.79, 1.90, 5.65, 4.25, [L('THE DEPLOYMENT GATE · THE LAST STEP OF TRAINING'), H('Four checks, pass or fail'),""")
rep("""box(s, 0.89, 1.90, 5.65, 3.6, [L('BATCH SCORING · NOTEBOOK 50'), H('The whole waiting list, on a schedule'), B('A Data Pipeline runs the notebooks in order and re-scores every patient awaiting surgery.'),""",
    """box(s, 0.89, 1.90, 5.65, 3.6, [L('BATCH SCORING'), H('The whole waiting list, on a schedule'), B('A Data Pipeline runs the steps in order and re-scores every patient awaiting surgery.'),""")
rep("""N('Illustrative values. Replace with Margaret’s terms from notebook 43 §3.')], fill=TINT, line=None)""", """N('Illustrative values; replace with a real patient from the Fabric run.')], fill=TINT, line=None)""")
rep("""tb(s, 0.89, 6.1, 7.5, 0.4, [N('Bars are editable shapes. Values shown are an example, not a Fabric result.')])\n""", "")
rep("""    B('Notebook 60 copies the scored gold tables into the app’s SQL database. The app never loads a model; it reads governed tables.'),""",
    """    B('The scored tables are copied from the Lakehouse into the app’s SQL database. The app never loads a model; it reads governed tables.'),""")
rep("""['Fairness across groups', 'The rule must not quietly fail for one group', 'Subgroup check in notebook 42; limitations in the model card'],""",
    """['Fairness across groups', 'The rule must not quietly fail for one group', 'Subgroup check of the cut-off; limitations in the model card'],""")

start = s.index("s = content('Why accuracy is the wrong score'")
end = s.index("s = content('Train on some patients, test on the rest'")
new_block = r'''s = content('Class imbalance: why it makes prediction hard', 'About four patients in five do well. The patients we want to find are the minority.')
rect(s, 0.89, 1.95, 9.24, 0.7, fill=RGBColor(0x9F,0xC9,0xBD), rounded=False); rect(s, 10.13, 1.95, 2.31, 0.7, fill=RED, rounded=False)
tb(s, 0.89, 1.95, 9.24, 0.7, [dict(t='Meaningful improvement · about 4 in 5', size=14, color=INK, bold=True, align=PP_ALIGN.CENTER)], anchor=MSO_ANCHOR.MIDDLE)
tb(s, 10.13, 1.95, 2.31, 0.7, [dict(t='Poor outcome · about 1 in 5', size=12, color=WHITE, bold=True, align=PP_ALIGN.CENTER)], anchor=MSO_ANCHOR.MIDDLE)
tb(s, 0.89, 2.7, 11.55, 0.3, [N('Exact shares: [from the Fabric data]. Bar is illustrative.')])
three_cols(s, [
    [L('WHAT GOES WRONG'), B('If left unaddressed, a model favours the majority class: it predicts “good outcome” for most patients simply because that is the most common result.'),
     B('That gives high overall accuracy — about 80% — and poor performance on the minority class we actually care about.'), B('The model sees far fewer examples of a poor outcome, so the patterns behind it are harder to learn and easier to mistake for noise.')],
    [L('WHAT IT DOES TO THE SCORE'), B('The probabilities come out low for almost everyone, because a poor outcome is rare. A patient at 30% is already well above the average patient.'),
     B('So the cut-off cannot be the usual 50%. Where to put it becomes a decision in its own right (next slides).'), B('Accuracy hides all of this. We do not use it.')],
    [L('WHAT WE DID'), B('Class weighting: mistakes on poor-outcome patients cost the model more during training, so it cannot ignore them. No synthetic data is added.'),
     B('Stratified splitting: training and test sets keep the same share of poor outcomes.'), B('Metrics built for the minority class: precision, recall and average precision.'),
     N('Oversampling (SMOTE) was also considered; it adds made-up patients and can add noise, so weighting was preferred.')],
], y=3.15, h=3.15, fill=[WHITE, WHITE, TINT])
notes(s, 'Class imbalance in plain words: one in five is a poor outcome. A model that ignores them looks accurate and helps nobody. Rare outcomes are harder to learn, and the probabilities come out low for everyone, so the usual 50 percent cut-off does not apply. We used class weighting, stratified splits, and metrics that look at the minority class.')

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

s = content('From a probability to a decision: the threshold', 'The model outputs a probability. A cut-off turns it into a yes or no. Moving the cut-off moves precision and recall in opposite directions.')
table(s, 0.89, 1.85, 6.4, [
    ['Cut-off', 'Precision', 'Recall', 'Patients flagged'],
    ['0.5', '0.67', '0.09', '2,696'], ['0.6', '0.78', '0.06', '1,459'], ['0.7', '0.88', '0.04', '864'], ['0.8', '0.96', '0.03', '583'],
], col_w=[1.2, 1.6, 1.4, 2.2], font=12, row_h=0.46)
tb(s, 0.89, 4.2, 6.4, 0.5, [N('EBM on the validation set, from the project report. Replace with the Fabric threshold analysis.')])
box(s, 0.89, 4.7, 6.4, 1.5, [B('Raise the cut-off: fewer patients flagged, almost all of them correct, most poor outcomes missed.'), B('Lower it: more patients flagged, more of them wrongly.')], fill=TINT, line=None)
box(s, 7.55, 1.85, 4.89, 4.35, [L('HOW TO READ THE TABLE'), B('At 0.5 the model flags many patients, but a third of them would have done fine.'), B('At 0.8 nearly every flagged patient really is at risk — but only about 3 in 100 poor outcomes are caught.'),
    B('Precision rises with the cut-off in every model we tried. That is why 0.8 was used to compare models, and why the app shows the service what each cut-off costs before anyone moves it.'),
    B('The cut-off is a policy choice: it depends on how many patients the service can review and on which mistake it can live with. It is not a property of the model.', bold=True)])
notes(s, 'This is the slide that makes the trade-off concrete. A higher cut-off buys precision with recall. Read one row: at 0.8 nearly every flagged patient is right, but only three in a hundred poor outcomes are found. The service chooses the row, not the data scientist.')

'''
s = s[:start] + new_block + s[end:]

rep("""s = content('Train on some patients, test on the rest', 'The split happens first. Everything the model learns is learned from the training patients only.')
steps = [('STEP 1', 'Split', '80% training, 20% test, keeping the same share of poor outcomes in both.'), ('STEP 2', 'Fill in and encode — on training only', 'MICE and one-hot encoding are fitted on the training patients, then applied to the test patients.'), ('STEP 3', 'Evaluate once', 'The test set is used once, at the end, for the numbers we report.')]""",
    """s = content('Train, validate, test', 'The split happens first. Everything the model learns is learned from the training patients only.')
steps = [('STEP 1', 'Split', '80% training, 20% test, keeping the same share of poor outcomes in both.'), ('STEP 2', 'Fill in, encode, tune — on training only', 'Imputation and encoding are fitted on the training patients. Model settings are chosen by cross-validation inside the training set.'), ('STEP 3', 'Evaluate once', 'The test set is used once, at the end, for the numbers we report.')]""")
rep("""box(s, 0.89, 4.05, 11.55, 2.1, [L('THREE CHECKS BEFORE ANY MODEL IS FITTED'),
    bullet('No after-surgery column can be a feature (nothing from the six-month questionnaire).'),
    bullet('Every feature the model expects really exists in the gold table.'),
    bullet('Age band and sex are never filled in by imputation.'),
    ], fill=TINT, line=None)""",
    """box(s, 0.89, 4.05, 5.65, 2.15, [L('CROSS-VALIDATION · HOW THE SETTINGS ARE CHOSEN'),
    B('The training set is cut into 5 folds. Each candidate setting is trained on 4 folds and scored on the 5th, five times over, and the scores are averaged.', size=12),
    B('Every model has settings to choose (tree depth, learning rate, number of rounds). Cross-validation picks them without ever touching the test set.', size=12),
    B('Each of these runs is recorded in the Fabric experiment, so the winning settings can be promoted rather than retyped.', size=12)], fill=TINT, line=None)
box(s, 6.79, 4.05, 5.65, 2.15, [L('THREE CHECKS BEFORE ANY MODEL IS FITTED'),
    bullet('No after-surgery column can be a feature (nothing from the six-month questionnaire).', size=12),
    bullet('Every feature the model expects really exists in the data.', size=12),
    bullet('Age band and sex are never filled in by imputation.', size=12)])""")
rep("""notes(s, 'Split first, then fit the imputation and encoding on the training half only. Otherwise information from the test patients leaks into training and the test numbers are not honest. Three checks run before any model is fitted.')""",
    """notes(s, 'Split first. Then imputation, encoding and the choice of settings happen inside the training set, using five-fold cross-validation. The test set is touched once. Three checks run before any model is fitted.')""")

rep("""    B('One more run: ebm-calibrated — the version that ships.'),""",
    """    B('Cross-validation runs sit underneath: one run per setting tried, so the best settings can be promoted from the experiment instead of copied by hand.'),
    B('One more run: ebm-calibrated — the version that ships.'),""")
rep("""box(s, 0.89, 1.90, 7.0, 4.25, [L('HOW OUR EXPERIMENT IS ORGANISED')""", """box(s, 0.89, 1.90, 7.0, 4.45, [L('HOW OUR EXPERIMENT IS ORGANISED')""")
rep("""box(s, 8.14, 1.90, 4.3, 4.25, [L('WHY IT MATTERS'), B('Six weeks later nobody remembers which notebook cell produced the model in use. The experiment does.'),""",
    """box(s, 8.14, 1.90, 4.3, 4.45, [L('WHY IT MATTERS'), B('Six weeks later nobody remembers which run produced the model in use. The experiment does.'),""")

rep("""B('Calibration error before / after:  [from experiment]', bold=True)""", """B('Calibration error before / after:  [from the Fabric experiment]', bold=True)""")
rep("""B('Performance difference EBM vs random forest:  [from experiment]', bold=True)""", """B('Performance difference EBM vs random forest:  [from the Fabric experiment]', bold=True)""")
s = s.replace("'[from experiment]'", "'[from the Fabric experiment]'")
rep("""N('Current champion version:  [from the model item]')""", """N('Current champion version:  [from the Fabric model item]')""")

start = s.index("s = content('Where to put the cut-off'")
end = s.index("# ================================================================== DELIVERY")
s = s[:start] + r'''s = content('Choosing the cut-off with the service', 'The trade-off is known. Now it has to be made in patients, by the people who run the pathway.')
table(s, 0.89, 1.85, 7.3, [
    ['Cut-off', 'Patients flagged per 1,000', 'Of which unnecessary', 'Poor outcomes missed'],
    ['0.5', '[from the Fabric threshold analysis]', '[…]', '[…]'], ['0.7', '[…]', '[…]', '[…]'], ['0.8', '[…]', '[…]', '[…]'],
], col_w=[1.2, 2.4, 1.9, 1.8], font=12, row_h=0.5)
box(s, 8.45, 1.85, 3.99, 2.9, [L('OUR STARTING POINT'), B('80% precision: four of five flagged patients should really be at risk, or the review pathway loses credibility.'), B('Counts per 1,000 patients make the cost of each cut-off visible to a clinic manager, not only to a data scientist.')], fill=TINT, line=None)
box(s, 0.89, 4.15, 7.3, 2.0, [L('TWO MORE CHECKS BEFORE THE CUT-OFF IS WRITTEN INTO A PATHWAY'), bullet('Does it hold for each subgroup — for example the over-80s? A rule that works on average and fails for one group goes in the model card as a limitation.'), bullet('Is using the model at this cut-off better than reviewing everyone, or nobody?')])
box(s, 8.45, 4.95, 3.99, 1.2, [B('The chosen cut-off is recorded on the model version, so the number the app uses can always be traced to this analysis.', size=12)], fill=GOLDTINT, line=None)
notes(s, 'The service chooses the cut-off from what it costs in patients per thousand, checks it holds for subgroups, and the choice is recorded on the model version.')

''' + s[end:]

start = s.index("s = content('What to take with you'")
end = s.index("# ---------- closing slide to the end ----------")
s = s[:start] + s[end:]
rep("""notes(s, 'The closing argument. One estate: the data never leaves. Machine learning is built in, with experiments, registry and endpoints as governed items. Delivery, including the app and the agent, stays inside the same permissions.')""",
    """notes(s, 'The closing argument. One estate: the data never leaves. Machine learning is built in, with experiments, registry and endpoints as governed items. Delivery, including the app and the agent, stays inside the same permissions. Leave this slide up for questions.')""")
rep("""('03', 'The data and the problem', '10'),""", """('03', 'The data and the problem', '12'),""")
rep("""('07', 'Learnings', '7')""", """('07', 'Learnings', '6')""")
open(p,"w").write(s)
import re
print("remaining notebook refs:", re.findall(r"[Nn]otebook[s]? ?\d*", s))
