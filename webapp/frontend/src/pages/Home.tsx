import React from 'react';
import { useNavigate } from 'react-router-dom';

const CARDS = [
  {
    icon: '📋',
    title: 'Methodology',
    body: 'Understand every decision made — from problem definition and data sourcing, to model selection, class imbalance handling, and evaluation strategy.',
    link: '/methodology',
    linkText: 'Read the Methodology →',
    tag: 'Step-by-step explanation',
  },
  {
    icon: '📊',
    title: 'Model Dashboard',
    body: 'Explore performance metrics for all four trained models — Random Forest and Logistic Regression variants. Interactive confusion matrices, feature importance charts, and precision-recall curves.',
    link: '/dashboard',
    linkText: 'View Dashboard →',
    tag: 'Interactive analytics',
  },
  {
    icon: '🔬',
    title: 'Patient Predictor',
    body: 'Enter pre-operative patient details or generate a synthetic patient profile. The model predicts whether the patient is likely to achieve meaningful improvement after knee replacement.',
    link: '/predictor',
    linkText: 'Open Predictor →',
    tag: 'Live prediction',
  },
];

const STATS = [
  { value: '132,382', label: 'Patient records' },
  { value: '3 years', label: 'NHS data (2016–2019)' },
  { value: '57', label: 'Pre-operative features' },
  { value: '0.721', label: 'Best ROC-AUC (RF Tuned)' },
];

export function Home() {
  const navigate = useNavigate();

  return (
    <main className="nhs-main">
      {/* Hero */}
      <section className="nhs-hero">
        <div className="nhs-hero__inner">
          <div className="nhs-hero__tag">Research Decision-Support Tool</div>
          <h1 className="nhs-hero__title">
            NHS Knee Replacement<br />Outcome Predictor
          </h1>
          <p className="nhs-hero__subtitle">
            Using three years of NHS Patient-Reported Outcome Measures (PROMs) data,
            this tool predicts whether a patient undergoing knee replacement surgery
            is likely to achieve a clinically meaningful improvement in their Oxford
            Knee Score (OKS).
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="nhs-btn nhs-btn--primary nhs-btn--large"
              onClick={() => navigate('/predictor')}
            >
              Try the Patient Predictor
            </button>
            <button
              className="nhs-btn nhs-btn--secondary nhs-btn--large"
              style={{ color: 'var(--nhs-white)', borderColor: 'rgba(255,255,255,0.6)' }}
              onClick={() => navigate('/dashboard')}
            >
              View Model Results
            </button>
          </div>
        </div>
      </section>

      {/* Warning callout */}
      <div style={{ background: 'var(--nhs-pale-grey)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="nhs-warning-callout" style={{ marginBottom: 0 }}>
            <div className="nhs-warning-callout__title">
              <span>⚠️</span>
              Important: For research and decision-support only
            </div>
            <p style={{ fontSize: '0.9375rem', margin: 0 }}>
              This tool is a research prototype and must not replace clinical judgement.
              Predictions are based on historical data and may not generalise to all patient
              populations. Always consult clinical guidelines and exercise professional judgement.
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <section className="nhs-section nhs-section--grey">
        <div className="nhs-section__inner">
          <div className="nhs-grid nhs-grid--4">
            {STATS.map((s) => (
              <div key={s.label} className="nhs-card" style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--nhs-blue)',
                  lineHeight: 1.1,
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--nhs-mid-grey)', marginTop: '0.25rem' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="nhs-section">
        <div className="nhs-section__inner">
          <h2 className="nhs-section__title">What this tool provides</h2>
          <p className="nhs-section__lead">
            Three integrated sections to help NHS clinicians and researchers understand
            and apply the prediction models.
          </p>
          <div className="nhs-grid nhs-grid--3">
            {CARDS.map((card) => (
              <div
                key={card.title}
                className="nhs-card nhs-card--clickable"
                onClick={() => navigate(card.link)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(card.link)}
              >
                <div className="nhs-card__icon">{card.icon}</div>
                <span className="nhs-tag nhs-tag--blue" style={{ marginBottom: '0.75rem' }}>
                  {card.tag}
                </span>
                <div className="nhs-card__title">{card.title}</div>
                <div className="nhs-card__body">{card.body}</div>
                <div className="nhs-card__link">{card.linkText}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About the project */}
      <section className="nhs-section nhs-section--grey">
        <div className="nhs-section__inner">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
            <div>
              <h2 className="nhs-section__title">About the Project</h2>
              <p style={{ color: 'var(--nhs-dark-grey)', lineHeight: 1.6, marginBottom: '1rem' }}>
                NHS England collects Patient-Reported Outcome Measures (PROMs) for all patients
                undergoing elective hip and knee replacement surgery. Patients complete questionnaires
                before and after surgery, measuring pain, function, and quality of life.
              </p>
              <p style={{ color: 'var(--nhs-dark-grey)', lineHeight: 1.6, marginBottom: '1rem' }}>
                This project, completed as part of the EAISI Academy programme, applies machine
                learning to predict whether a patient will achieve a <strong>clinically meaningful
                improvement</strong> — defined as an Oxford Knee Score (OKS) change of more than
                7 points — following knee replacement surgery.
              </p>
              <p style={{ color: 'var(--nhs-dark-grey)', lineHeight: 1.6 }}>
                Only <strong>pre-operative data</strong> is used for prediction, making it
                actionable at the point of surgical planning.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--nhs-blue)', marginBottom: '1rem' }}>
                Oxford Knee Score (OKS)
              </h3>
              <div className="nhs-inset nhs-inset--blue">
                <p style={{ fontSize: '0.9375rem', color: 'var(--nhs-dark-grey)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  The OKS is a validated 12-item patient-reported outcome measure for knee
                  arthroplasty. Each item is scored 0–4, giving a total of 0–48.
                </p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--nhs-dark-grey)', lineHeight: 1.6 }}>
                  Higher scores indicate better function and less pain. A change of <strong>+7 or
                  more points</strong> is considered a clinically meaningful improvement
                  (the Minimal Clinically Important Difference).
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginTop: '1rem',
              }}>
                {[
                  { range: '0–20', label: 'Severe dysfunction' },
                  { range: '21–30', label: 'Moderate dysfunction' },
                  { range: '31–40', label: 'Mild dysfunction' },
                  { range: '41–48', label: 'Satisfactory function' },
                ].map((r) => (
                  <div key={r.range} className="nhs-card" style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--nhs-blue)' }}>{r.range}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)' }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
