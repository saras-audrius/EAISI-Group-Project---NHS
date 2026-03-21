import React, { useState } from 'react';

interface AccordionSection {
  step: number;
  title: string;
  content: React.ReactNode;
}

const SECTIONS: AccordionSection[] = [
  {
    step: 1,
    title: 'Problem Definition — What Are We Predicting?',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          We aim to predict whether a patient will achieve a <strong>clinically meaningful
          improvement</strong> in knee function following elective knee replacement surgery,
          using only information available <em>before</em> the operation.
        </p>
        <div className="nhs-inset nhs-inset--blue">
          <strong>Target Variable:</strong> Oxford Knee Score (OKS) delta &gt; 7 points
          between pre-operative (T0) and post-operative (T1) assessments.
          <br /><br />
          A change of +7 or more OKS points is widely accepted as the Minimal Clinically
          Important Difference (MCID) — the smallest improvement that patients perceive
          as meaningful.
        </div>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Class definitions:</strong>
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8 }}>
          <li><strong>Class 0 — Good Outcome:</strong> OKS delta &gt; 7 (patient achieves meaningful improvement; majority ~82.5%)</li>
          <li><strong>Class 1 — Poor Outcome:</strong> OKS delta ≤ 7 (patient unlikely to achieve meaningful improvement; minority ~17.5%)</li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          <strong>Why binary classification?</strong> Classification directly answers the most
          clinically actionable question: "Is this patient likely to benefit sufficiently from
          surgery?" This framing supports shared decision-making conversations and is more robust
          to temporal variability than regression — a categorical prediction remains valid even
          if a patient's condition fluctuates slightly between assessment and surgery.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <strong>Why knee replacement?</strong> Our analysis showed that knee procedures have a
          notably lower average OKS improvement (16.89 points) compared to hip procedures (21.94
          points), and a higher proportion of poor outcomes — making predictive intervention both
          more necessary and more impactful for knee surgery.
        </p>
      </div>
    ),
  },
  {
    step: 2,
    title: 'Data Source — NHS England PROMs Programme',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Data is sourced from the <strong>NHS England Patient-Reported Outcome Measures
          (PROMs) programme</strong> — a mandatory national data collection for all patients
          undergoing elective hip and knee replacement in NHS hospitals.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[
            { label: 'Years covered', value: '2016/17 – 2018/19' },
            { label: 'Procedure', value: 'Knee Replacement (primary only)' },
            { label: 'Total records (cleaned)', value: '132,382' },
            { label: 'Provider organisations', value: '294 NHS trusts' },
          ].map(item => (
            <div key={item.label} className="nhs-card" style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)' }}>{item.label}</div>
              <div style={{ fontWeight: 700, color: 'var(--nhs-blue)' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <p style={{ marginBottom: '1rem' }}>
          Patients complete a questionnaire at two time points:
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          <li><strong>T0 (pre-operative):</strong> Before admission — demographics, comorbidities, OKS items, EQ-5D</li>
          <li><strong>T1 (post-operative):</strong> 6 months after surgery — OKS, EQ-5D, satisfaction, complications</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Why the Oxford Knee Score (OKS) over EQ-5D?</strong> The OKS is a joint-specific,
          validated 12-item outcome measure — it captures pain and functional ability directly
          attributable to the knee, unlike the generic EQ-5D health measure. Additionally, OKS
          has higher data completeness across all datasets (average coverage 97.4% vs 90.5% for
          EQ-5D index), reducing imputation needs and improving model robustness.
        </p>
        <p>
          <strong>Exclusions:</strong> 6,854 records were removed — 1,669 with incomplete T0
          OKS scores (required as a component of the target variable) and 5,185 revision surgeries
          (which represent a fundamentally different clinical scenario with different baseline
          characteristics and outcome trajectories).
        </p>
      </div>
    ),
  },
  {
    step: 3,
    title: 'Data Preprocessing — Handling Missing Values',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          NHS PROMs data contains missing values due to incomplete questionnaire responses.
          Rather than dropping incomplete records (which would introduce bias), we used{' '}
          <strong>Multiple Imputation by Chained Equations (MICE)</strong> via the miceforest
          library, using LightGBM as the underlying model.
        </p>
        <div className="nhs-inset nhs-inset--blue" style={{ marginBottom: '1rem' }}>
          <strong>Why MICE?</strong> MICE iteratively predicts each missing variable using all
          other variables as predictors. This captures multivariate relationships in the data —
          a patient's age band, for instance, is predicted from their specific combination of
          mobility limitations, living arrangements, and other characteristics — rather than
          applying a simple mean or mode. Crucially, it preserves the original distributions of
          imputed variables, unlike mean imputation which artificially reduces variance.
        </div>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Key implementation details:</strong>
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          <li><strong>Train-test split first:</strong> An 80/20 stratified split was applied before imputation. MICE was fitted only on the training set and then applied to the test set — preventing data leakage from test records into the imputation model.</li>
          <li><strong>Category merging:</strong> Low-frequency categories were merged before running MICE to avoid numerical instability. Age bands for 40–50 and 50–60 were combined; age bands for 80–90 and 90+ were combined. Living arrangement "care home" (n=92) was merged with "other".</li>
          <li><strong>Age/gender missingness:</strong> Missing values for age_band and gender were perfectly coincident — every record missing one was also missing the other — indicating a systematic data collection issue (Missing Not At Random), handled appropriately by MICE.</li>
        </ul>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="nhs-card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)' }}>Training set</div>
            <div style={{ fontWeight: 700, color: 'var(--nhs-blue)' }}>105,905 patients</div>
          </div>
          <div className="nhs-card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)' }}>Test set (held-out)</div>
            <div style={{ fontWeight: 700, color: 'var(--nhs-blue)' }}>26,477 patients</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 4,
    title: 'Feature Engineering — What Inputs Does the Model Use?',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          57 features are used (after one-hot encoding), derived from pre-operative variables
          through three layers of engineering:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[
            {
              title: 'Demographics',
              items: ['Age band (combined: 40–60, 60–70, 70–80, 80+)', 'Gender'],
            },
            {
              title: 'OKS Pre-operative (12 items, 0–4 each)',
              items: ['Pain, Night pain', 'Walking, Standing, Limping', 'Kneeling, Stairs, Shopping', 'Transport, Washing, Work, Confidence', 'Total OKS score (0–48)'],
            },
            {
              title: 'EQ-5D Quality of Life',
              items: ['Mobility, Self-care, Usual activity', 'Pain/discomfort, Anxiety/depression'],
            },
            {
              title: 'Medical History',
              items: ['12 comorbidities (yes/no): heart disease, high BP, stroke, circulation, lung, diabetes, kidney, nervous system, liver, cancer, depression, arthritis', 'Comorbidity count (derived sum)', 'Previous knee surgery', 'Disability status', 'Symptom duration', 'Living arrangements'],
            },
          ].map(group => (
            <div key={group.title} className="nhs-card" style={{ padding: '0.875rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
                {group.title}
              </div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nhs-dark-grey)' }}>
                {group.items.map(i => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="nhs-inset nhs-inset--blue" style={{ marginBottom: '1rem' }}>
          <strong>Derived OKS subscales:</strong> Three clinically meaningful subscales were
          computed from the 12 OKS items — (a) <strong>Pain subscale</strong> (pain, night pain),
          (b) <strong>Activity of Daily Life</strong> (work, confidence, shopping, transport),
          (c) <strong>Function</strong> (washing, stairs, walking, standing, limping, kneeling).
          These provide more explainable inputs for clinicians while capturing grouped clinical
          patterns. Individual items were also retained for non-linear models to exploit.
        </div>
        <p style={{ fontSize: '0.9375rem', color: 'var(--nhs-dark-grey)', marginBottom: '0.75rem' }}>
          <strong>Provider-derived features:</strong> The raw provider_code (294 unique values)
          was dropped to avoid overfitting and ensure generalisability across NHS trusts. Instead,
          three higher-level attributes were derived from external NHS reference data: whether the
          provider is a <strong>university teaching hospital</strong>, its{' '}
          <strong>geographic region</strong> (from postal codes), and whether it is{' '}
          <strong>public or private</strong>.
        </p>
        <p style={{ fontSize: '0.9375rem', color: 'var(--nhs-dark-grey)' }}>
          <strong>Comorbidity count:</strong> A derived sum of all 12 comorbidities, added as a
          single feature. Multiple comorbidities are associated with reduced surgical recovery
          across clinical literature — this feature captures cumulative burden efficiently.
        </p>
      </div>
    ),
  },
  {
    step: 5,
    title: 'Model Selection — Why LR, Random Forest, and EBM?',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Three classification algorithms were evaluated, chosen to span the full spectrum of
          predictive power versus interpretability — a critical consideration in clinical settings:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="nhs-card" style={{ padding: '0.875rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', marginBottom: '0.5rem' }}>
              Logistic Regression
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nhs-dark-grey)' }}>
              <li>Baseline model — 3 variants tested: no weights, SMOTE, L1 (LASSO)</li>
              <li>Perfectly transparent coefficients</li>
              <li>Assumes linear relationships</li>
              <li>Test precision: 100% · 18 patients flagged</li>
            </ul>
            <div className="nhs-tag nhs-tag--grey" style={{ marginTop: '0.75rem' }}>Baseline</div>
          </div>
          <div className="nhs-card" style={{ padding: '0.875rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', marginBottom: '0.5rem' }}>
              Random Forest
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nhs-dark-grey)' }}>
              <li>200–300 trees, tuned via RandomizedSearchCV</li>
              <li>Handles non-linear interactions</li>
              <li>High training/test variance suggests overfitting</li>
              <li>Test precision: 96.9% · 163 patients flagged</li>
            </ul>
            <div className="nhs-tag nhs-tag--blue" style={{ marginTop: '0.75rem' }}>Strong performer</div>
          </div>
          <div className="nhs-card" style={{ padding: '0.875rem', border: '2px solid var(--nhs-green)' }}>
            <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', marginBottom: '0.5rem' }}>
              Explainable Boosting Machine
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nhs-dark-grey)' }}>
              <li>Glass-box gradient boosting — additive structure, one feature at a time</li>
              <li>Global and local explanations available</li>
              <li>Stable across train/validation/test splits</li>
              <li>Test precision: 94.1% · 169 patients flagged</li>
            </ul>
            <div className="nhs-tag nhs-tag--green" style={{ marginTop: '0.75rem' }}>Recommended model</div>
          </div>
        </div>
        <div className="nhs-inset nhs-inset--blue">
          <strong>Why EBM over Random Forest?</strong> EBM and Random Forest achieved nearly
          identical F1 scores and recall. EBM's decisive advantage lies in <strong>consistency
          and interpretability</strong>. Random Forest showed substantial variance between training
          (100% precision, 1,728 flagged) and validation (92% precision, 551 flagged) — a sign of
          overfitting. EBM maintained stable performance throughout (96.2% → 95.7% → 94.1%
          precision across train/validation/test). Its additive structure with limited leaf nodes
          per feature allows clinicians to inspect exactly how each predictor — baseline OKS score,
          age, comorbidity burden — contributes to a risk assessment, and to explain that reasoning
          directly to the patient.
        </div>
        <div className="nhs-inset" style={{ marginTop: '0.75rem' }}>
          <strong>Why not deep learning or XGBoost?</strong> For structured tabular data of this
          scale (~106K training records), tree-based and linear models are appropriate and
          well-validated. Deep learning offers no significant benefit and introduces unnecessary
          complexity and opacity — incompatible with the clinical interpretability requirement.
        </div>
      </div>
    ),
  },
  {
    step: 6,
    title: 'Handling Class Imbalance — 82.5% vs 17.5%',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          The dataset is imbalanced: approximately <strong>82.5% of patients have a good
          outcome</strong> (OKS delta &gt; 7) and <strong>17.5% have a poor outcome</strong>
          (OKS delta ≤ 7). A naïve model could achieve 82.5% accuracy by predicting "good
          outcome" for everyone — yet have zero clinical utility.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Two strategies were explored:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[
            {
              title: 'Balanced Class Weights',
              body: 'Penalises misclassification of the minority class more heavily during training. Simple, computationally efficient, introduces no synthetic data. Directly supported by all algorithms tested.',
              tag: 'Primary approach',
              tagVariant: 'green',
            },
            {
              title: 'SMOTE',
              body: 'Synthetically generates new minority-class examples by interpolating between existing samples. Applied inside cross-validation to prevent leakage. Risk: if classes overlap, synthetic samples may introduce noise.',
              tag: 'Also tested',
              tagVariant: 'blue',
            },
          ].map(s => (
            <div key={s.title} className="nhs-card" style={{ padding: '0.875rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>{s.title}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--nhs-dark-grey)', lineHeight: 1.6, marginBottom: '0.75rem' }}>{s.body}</p>
              <span className={`nhs-tag nhs-tag--${s.tagVariant}`}>{s.tag}</span>
            </div>
          ))}
        </div>
        <div className="nhs-warning-callout">
          <div className="nhs-warning-callout__title"><span>Why accuracy is misleading here</span></div>
          <p style={{ fontSize: '0.9375rem' }}>
            A model predicting "good outcome" for all patients achieves 82.5% accuracy but 0%
            recall for at-risk patients. We prioritise <strong>Precision-Recall AUC</strong> and{' '}
            <strong>Macro F1</strong> as primary metrics — these are robust to class imbalance and
            reflect the model's ability to identify the minority class we actually care about.
          </p>
        </div>
        <p style={{ fontSize: '0.9375rem', color: 'var(--nhs-dark-grey)', marginTop: '1rem' }}>
          <strong>Decision threshold set to 0.8:</strong> Across all models, precision increases
          monotonically as the probability threshold increases. We set a threshold of 0.8 — a
          patient is only flagged as "poor outcome" if the model assigns ≥80% probability. This
          conservative operating point prioritises high precision, minimising false positives
          (incorrectly advising against surgery).
        </p>
      </div>
    ),
  },
  {
    step: 7,
    title: 'Evaluation Strategy — How Do We Know the Model Works?',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          All models were evaluated using <strong>stratified 5-fold cross-validation</strong>
          on the training set, with final performance reported on the held-out test set (20%).
          Stratification ensures each fold contains the same class distribution as the full dataset.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Primary metrics (given class imbalance):</strong>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            {
              metric: 'Precision',
              why: 'The fraction of patients flagged as poor outcome who truly have poor outcomes. Our primary metric — incorrectly advising against surgery carries high ethical cost.',
            },
            {
              metric: 'Precision-Recall AUC (PR-AUC)',
              why: 'Measures the trade-off between identifying at-risk patients (recall) and the accuracy of those flags (precision). More informative than ROC-AUC for imbalanced datasets.',
            },
            {
              metric: 'F1 Score (Macro)',
              why: 'Harmonic mean of precision and recall. Macro averaging gives equal weight to each class, preventing the majority class from dominating the score.',
            },
            {
              metric: 'Confusion Matrix',
              why: 'Breaks down predictions into TP, TN, FP, FN — showing exactly where the model makes errors and at what clinical cost.',
            },
          ].map(m => (
            <div key={m.metric} className="nhs-card" style={{ padding: '0.875rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>{m.metric}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--nhs-dark-grey)', lineHeight: 1.5, margin: 0 }}>{m.why}</p>
            </div>
          ))}
        </div>
        <div className="nhs-inset nhs-inset--blue">
          <strong>Test set results at threshold 0.8:</strong>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: 1.9, fontSize: '0.9375rem' }}>
            <li><strong>Logistic Regression:</strong> Precision 100% · Recall 0.4% · 18 patients flagged</li>
            <li><strong>Random Forest (tuned):</strong> Precision 96.9% · Recall 3.3% · 163 patients flagged</li>
            <li><strong>EBM (recommended):</strong> Precision 94.1% · Recall 3.3% · 169 patients flagged · F1 = 0.064</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    step: 8,
    title: 'Limitations and Considerations',
    content: (
      <div>
        <div className="nhs-warning-callout">
          <div className="nhs-warning-callout__title"><span>Important limitations</span></div>
        </div>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 2, color: 'var(--nhs-dark-grey)', fontSize: '0.9375rem' }}>
          <li>
            <strong>Definition of "poor outcome":</strong> The MCID threshold of ≤7 OKS points is
            clinically accepted but generalised. The perception of a "good" outcome varies
            between individuals — a patient improving by 8 points and one improving by 40 are both
            classified as "good."
          </li>
          <li>
            <strong>Limited feature space:</strong> The model is constrained to variables available
            in the NHS PROMs dataset. Potentially influential factors — psychological resilience,
            social support, specific surgical techniques, surgeon experience — are not captured.
          </li>
          <li>
            <strong>Historical data (2016–2019):</strong> The model was trained on pre-pandemic
            data. Patient populations, surgical techniques, care pathways, and referral patterns
            may have changed.
          </li>
          <li>
            <strong>Conservative operating point:</strong> At threshold 0.8, the model flags fewer
            than 4% of poor-outcome patients per week. Measurable population-level impact will
            accumulate slowly — estimated at approximately 0.4 percentage point reduction in poor
            outcomes over 25 weeks of deployment.
          </li>
          <li>
            <strong>Selection bias:</strong> PROMs relies on voluntary questionnaire completion.
            Non-responders at T1 may differ systematically from responders — their outcomes are
            unknown and excluded from the target variable.
          </li>
          <li>
            <strong>No causal inference:</strong> The model identifies predictive associations,
            not causal relationships. A predicted poor outcome does not mean surgery should be
            withheld — only that closer assessment and shared decision-making is warranted.
          </li>
          <li>
            <strong>Knee replacement only:</strong> The model applies exclusively to primary
            elective knee replacement. It must not be used for hip replacement, revision surgery,
            or other procedures.
          </li>
          <li>
            <strong>Equity considerations:</strong> Model performance may vary across patient
            subgroups (age, gender, deprivation, ethnicity). Fairness audits across clinically
            relevant subgroups should be conducted before any deployment.
          </li>
        </ul>
      </div>
    ),
  },
];

export function Methodology() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (step: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(step)) { next.delete(step); } else { next.add(step); }
      return next;
    });
  };

  const expandAll = () => setOpenItems(new Set(SECTIONS.map(s => s.step)));
  const collapseAll = () => setOpenItems(new Set());

  return (
    <main className="nhs-main">
      <div className="nhs-page-header">
        <div className="nhs-page-header__inner">
          <h1 className="nhs-page-header__title">Project Methodology</h1>
          <p className="nhs-page-header__lead">
            A step-by-step walkthrough of every decision made — from problem definition and data
            sourcing, through feature engineering, model selection, and evaluation. Expand each
            section to read the rationale.
          </p>
        </div>
      </div>

      <section className="nhs-section">
        <div className="nhs-section__inner">
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button className="nhs-btn nhs-btn--secondary nhs-btn--sm" onClick={expandAll}>
              Expand All
            </button>
            <button className="nhs-btn nhs-btn--secondary nhs-btn--sm" onClick={collapseAll}>
              Collapse All
            </button>
          </div>

          <div className="nhs-accordion">
            {SECTIONS.map((section) => (
              <div key={section.step} className="nhs-accordion__item">
                <button
                  className="nhs-accordion__header"
                  onClick={() => toggleItem(section.step)}
                  aria-expanded={openItems.has(section.step)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="nhs-accordion__step-badge">{section.step}</span>
                    {section.title}
                  </span>
                  <span className={`nhs-accordion__chevron${openItems.has(section.step) ? ' nhs-accordion__chevron--open' : ''}`}>
                    ▼
                  </span>
                </button>
                {openItems.has(section.step) && (
                  <div className="nhs-accordion__content">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="nhs-inset nhs-inset--blue" style={{ marginTop: '2rem' }}>
            <strong>Summary of key decisions:</strong>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: 1.8, fontSize: '0.9375rem' }}>
              <li>Binary classification with OKS MCID threshold of +7 points; focus on knee replacement (lower average improvement than hip)</li>
              <li>MICE imputation fitted on training set only, preventing data leakage</li>
              <li>Provider code dropped; three higher-level attributes derived (teaching status, region, public/private)</li>
              <li>Three derived OKS subscales added (pain, function, ADL); comorbidity count as a derived feature</li>
              <li>EBM chosen as recommended model: stable performance across splits, glass-box interpretability for clinicians and patients</li>
              <li>Decision threshold set to 0.8 — precision prioritised; 94.1% precision on held-out test set</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
