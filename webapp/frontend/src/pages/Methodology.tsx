import React, { useState } from 'react';

interface AccordionSection {
  step: number;
  title: string;
  content: React.ReactNode;
}

function AccordionItem({ step, title, content }: AccordionSection) {
  const [open, setOpen] = useState(false);

  return (
    <div className="nhs-accordion__item">
      <button
        className="nhs-accordion__header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="nhs-accordion__step-badge">{step}</span>
          {title}
        </span>
        <span className={`nhs-accordion__chevron${open ? ' nhs-accordion__chevron--open' : ''}`}>
          ▼
        </span>
      </button>
      {open && (
        <div className="nhs-accordion__content">
          {content}
        </div>
      )}
    </div>
  );
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
          <li><strong>Class 0 — Good Outcome:</strong> OKS delta &gt; 7 (patient achieves meaningful improvement; majority ~82%)</li>
          <li><strong>Class 1 — At Risk:</strong> OKS delta ≤ 7 (patient unlikely to achieve meaningful improvement; minority ~18%)</li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          <strong>Why binary classification?</strong> A binary framing directly answers the
          most clinically actionable question: "Is this patient likely to benefit sufficiently
          from surgery?" This supports shared decision-making conversations.
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
            { label: 'Procedure', value: 'Knee Replacement' },
            { label: 'Total records (cleaned)', value: '132,382' },
            { label: 'Providers', value: '294 NHS organisations' },
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
          <li><strong>T0 (pre-operative):</strong> Before admission — demographics, comorbidities, OKS, EQ-5D</li>
          <li><strong>T1 (post-operative):</strong> 6 months after surgery — OKS, EQ-5D, satisfaction, complications</li>
        </ul>
        <p>
          <strong>Important:</strong> Only T0 (pre-operative) data is used for prediction,
          ensuring the model is applicable at the point of clinical planning, before the
          operation has occurred.
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
          Rather than dropping incomplete records (which would introduce bias and reduce the
          dataset), we used <strong>Multiple Imputation by Chained Equations (MICE)</strong>.
        </p>
        <div className="nhs-inset nhs-inset--blue" style={{ marginBottom: '1rem' }}>
          <strong>Why MICE?</strong> MICE imputes missing values by iteratively modelling
          each feature with missing data as a function of all other features. It preserves
          the distributional properties of the data and produces statistically valid
          imputed datasets, unlike simpler methods (mean/median imputation) which can
          distort relationships between variables.
        </div>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Train-test split:</strong> An 80/20 stratified split (random_state=42)
          was applied, maintaining class proportions in both sets. Imputation was fit
          only on the training set to prevent data leakage into the test set.
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8 }}>
          <li>Training set: <strong>105,905 patients</strong></li>
          <li>Test set: <strong>26,477 patients</strong></li>
        </ul>
      </div>
    ),
  },
  {
    step: 4,
    title: 'Feature Engineering — What Inputs Does the Model Use?',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          57 features are used (after one-hot encoding), derived from 40 pre-operative variables:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[
            {
              title: 'Demographics',
              items: ['Age band (40–59, 60–69, 70–79, 80+)', 'Gender'],
            },
            {
              title: 'OKS Pre-operative (12 items, 0–4 each)',
              items: ['Pain, Night pain', 'Walking, Standing, Limping', 'Kneeling, Stairs, Shopping', 'Transport, Washing, Work, Confidence', 'Total OKS score (0–48)'],
            },
            {
              title: 'EQ-5D Quality of Life (1–3 scale)',
              items: ['Mobility, Self-care, Usual activity', 'Pain/discomfort, Anxiety/depression'],
            },
            {
              title: 'Medical History',
              items: ['12 comorbidities (yes/no)', 'Comorbidity count', 'Previous knee surgery', 'Disability status'],
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
        <p style={{ fontSize: '0.9375rem', color: 'var(--nhs-dark-grey)' }}>
          <strong>Provider excluded:</strong> Hospital provider codes were excluded from
          the model to improve generalisability across NHS trusts. Including provider
          as a feature would make the model trust-specific and impractical for new providers.
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.9375rem', color: 'var(--nhs-dark-grey)' }}>
          <strong>OKS subscales derived:</strong> Three derived subscale scores were computed
          (pain subscale, function subscale, ADL subscale) to capture clinical groupings
          within the OKS items.
        </p>
      </div>
    ),
  },
  {
    step: 5,
    title: 'Model Selection — Why Random Forest and Logistic Regression?',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Four models were evaluated across two families:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="nhs-card" style={{ padding: '0.875rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', marginBottom: '0.5rem' }}>
              Logistic Regression (3 variants)
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nhs-dark-grey)' }}>
              <li><strong>No weights</strong> — baseline, standard LR</li>
              <li><strong>Balanced weights</strong> — addresses imbalance via class weighting</li>
              <li><strong>SMOTE</strong> — synthetic oversampling of minority class</li>
              <li><strong>LASSO (L1)</strong> — regularised for feature selection</li>
            </ul>
            <div className="nhs-tag nhs-tag--blue" style={{ marginTop: '0.75rem' }}>Interpretable, fast, linear</div>
          </div>
          <div className="nhs-card" style={{ padding: '0.875rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', marginBottom: '0.5rem' }}>
              Random Forest (Tuned)
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nhs-dark-grey)' }}>
              <li>Ensemble of 200 decision trees</li>
              <li>Hyperparameters tuned via GridSearchCV</li>
              <li>Handles non-linear feature interactions</li>
              <li>Provides feature importance scores</li>
              <li>Best test ROC-AUC: 0.721</li>
            </ul>
            <div className="nhs-tag nhs-tag--green" style={{ marginTop: '0.75rem' }}>Best performing model</div>
          </div>
        </div>
        <div className="nhs-inset" style={{ marginTop: '0.5rem' }}>
          <strong>Why not deep learning or XGBoost?</strong> Given the dataset size (~106K),
          tabular data format, and the need for model interpretability in a clinical context,
          tree-based and linear models are appropriate. Deep learning offers no significant
          benefit for structured tabular data of this scale and introduces unnecessary
          complexity. XGBoost was considered but Random Forest showed comparable performance
          with simpler tuning.
        </div>
      </div>
    ),
  },
  {
    step: 6,
    title: 'Handling Class Imbalance — 82% vs 18%',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          The dataset is imbalanced: approximately <strong>82% of patients have a good outcome</strong>
          (Class 0) and <strong>18% are at risk</strong> (Class 1). A naïve model could achieve
          82% accuracy by predicting "good outcome" for everyone — yet have zero clinical utility.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Three strategies were explored:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[
            {
              title: 'Balanced Class Weights',
              body: 'Penalises misclassification of the minority class more heavily. Simple and effective. No data generation involved.',
              tag: 'Recommended approach',
              tagVariant: 'green',
            },
            {
              title: 'SMOTE',
              body: 'Synthetically generates new minority class samples by interpolating between existing samples. Applied inside cross-validation to prevent leakage.',
              tag: 'Tested',
              tagVariant: 'blue',
            },
            {
              title: 'Threshold Tuning',
              body: 'Adjusting the classification threshold (default 0.5) to trade precision for recall on the minority class. Useful for specific clinical scenarios.',
              tag: 'Explored',
              tagVariant: 'grey',
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
          <div className="nhs-warning-callout__title"><span>⚠️</span> Why accuracy is misleading here</div>
          <p style={{ fontSize: '0.9375rem' }}>
            A model predicting "good outcome" for all patients gets 82% accuracy but 0% recall
            for at-risk patients. We prioritise <strong>Precision-Recall AUC</strong> and
            <strong> Macro F1</strong> as primary metrics, which are robust to class imbalance.
          </p>
        </div>
      </div>
    ),
  },
  {
    step: 7,
    title: 'Evaluation Strategy — How Do We Know the Model Works?',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          All models were evaluated using <strong>5-fold stratified cross-validation</strong>
          on the training set, with final performance reported on the held-out test set.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Primary metrics (given class imbalance):</strong>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            {
              metric: 'Precision-Recall AUC (PR-AUC)',
              why: 'More informative than ROC-AUC for imbalanced datasets. Measures the trade-off between identifying at-risk patients (recall) and the accuracy of those flags (precision).',
            },
            {
              metric: 'ROC-AUC',
              why: 'Measures discrimination ability across all thresholds. Less sensitive to class imbalance than accuracy, but PR-AUC is preferred here.',
            },
            {
              metric: 'F1 Score (Macro)',
              why: 'Harmonic mean of precision and recall. Macro averaging gives equal weight to each class, preventing the majority class from dominating.',
            },
            {
              metric: 'Confusion Matrix',
              why: 'Breaks down predictions into True Positives, True Negatives, False Positives, and False Negatives — showing where the model makes errors.',
            },
          ].map(m => (
            <div key={m.metric} className="nhs-card" style={{ padding: '0.875rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--nhs-blue)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>{m.metric}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--nhs-dark-grey)', lineHeight: 1.5, margin: 0 }}>{m.why}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.9375rem', color: 'var(--nhs-dark-grey)' }}>
          <strong>Cross-validation approach:</strong> Stratified 5-fold CV ensures that each
          fold contains the same proportion of classes as the full dataset. This gives an
          unbiased estimate of generalisation performance before final evaluation on the
          held-out test set.
        </p>
      </div>
    ),
  },
  {
    step: 8,
    title: 'Limitations and Considerations',
    content: (
      <div>
        <div className="nhs-warning-callout">
          <div className="nhs-warning-callout__title"><span>⚠️</span> Important limitations</div>
        </div>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 2, color: 'var(--nhs-dark-grey)', fontSize: '0.9375rem' }}>
          <li>
            <strong>Historical data (2016–2019):</strong> The model was trained on pre-pandemic
            data. Patient populations, surgical techniques, and care pathways may have changed.
          </li>
          <li>
            <strong>Binary simplification:</strong> Outcome is collapsed to two classes.
            The magnitude of improvement is not predicted — a patient predicted as "good outcome"
            may improve by 8 or 30 OKS points.
          </li>
          <li>
            <strong>Knee replacement only:</strong> The model applies exclusively to elective
            knee replacement. It should not be used for hip replacement, revision surgery,
            or other procedures.
          </li>
          <li>
            <strong>Selection bias:</strong> PROMs data relies on voluntary questionnaire
            completion. Non-responders may differ systematically from responders.
          </li>
          <li>
            <strong>No causal inference:</strong> The model identifies predictive associations,
            not causal relationships. A predicted poor outcome does not mean surgery should
            be withheld — only that closer assessment and shared decision-making is warranted.
          </li>
          <li>
            <strong>High precision, low recall:</strong> The model is conservative — it flags
            fewer patients as at-risk (high precision) but misses many true at-risk cases
            (low recall). This trade-off should be understood before clinical application.
          </li>
          <li>
            <strong>Equity considerations:</strong> Model performance may vary across patient
            subgroups (age, gender, deprivation). Fairness audits should be conducted
            before any deployment.
          </li>
        </ul>
      </div>
    ),
  },
];

export function Methodology() {
  const [allOpen, setAllOpen] = useState(false);
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (step: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(step)) { next.delete(step); } else { next.add(step); }
      return next;
    });
  };

  const expandAll = () => {
    setOpenItems(new Set(SECTIONS.map(s => s.step)));
    setAllOpen(true);
  };

  const collapseAll = () => {
    setOpenItems(new Set());
    setAllOpen(false);
  };

  return (
    <main className="nhs-main">
      <div className="nhs-page-header">
        <div className="nhs-page-header__inner">
          <h1 className="nhs-page-header__title">Project Methodology</h1>
          <p className="nhs-page-header__lead">
            A step-by-step explanation of every decision made — from problem definition
            to model evaluation. Expand each section to read the rationale.
          </p>
        </div>
      </div>

      <section className="nhs-section">
        <div className="nhs-section__inner">
          {/* Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button className="nhs-btn nhs-btn--secondary nhs-btn--sm" onClick={expandAll}>
              Expand All
            </button>
            <button className="nhs-btn nhs-btn--secondary nhs-btn--sm" onClick={collapseAll}>
              Collapse All
            </button>
          </div>

          {/* Accordion */}
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

          {/* Summary note */}
          <div className="nhs-inset nhs-inset--blue" style={{ marginTop: '2rem' }}>
            <strong>Summary of key decisions:</strong>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: 1.8, fontSize: '0.9375rem' }}>
              <li>Binary classification with OKS MCID threshold of +7 points</li>
              <li>MICE imputation to preserve all records (no list-wise deletion)</li>
              <li>Provider excluded for generalisability across NHS trusts</li>
              <li>Random Forest chosen as primary model (ROC-AUC = 0.721)</li>
              <li>PR-AUC prioritised over accuracy due to 82/18 class imbalance</li>
              <li>Conservative operating threshold — high precision, lower recall</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
