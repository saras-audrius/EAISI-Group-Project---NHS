import React, { useState, useCallback } from 'react';
import { predict, fetchSyntheticPatient, type PatientPayload, type PredictionResult } from '../utils/api';
import { generateSyntheticPatient, REGIONS } from '../utils/patientGenerator';

const AGE_BANDS = [
  { value: 2, label: '40–59 years' },
  { value: 3, label: '60–69 years' },
  { value: 4, label: '70–79 years' },
  { value: 5, label: '80+ years' },
];

const OKS_ITEMS = [
  { key: 'oks_t0_pain',        label: 'Pain in your knee' },
  { key: 'oks_t0_night_pain',  label: 'Pain at night in bed' },
  { key: 'oks_t0_washing',     label: 'Washing and drying yourself' },
  { key: 'oks_t0_transport',   label: 'Getting in/out of a car or bus' },
  { key: 'oks_t0_walking',     label: 'Walking' },
  { key: 'oks_t0_standing',    label: 'Standing for 30 minutes' },
  { key: 'oks_t0_limping',     label: 'Limping when walking' },
  { key: 'oks_t0_kneeling',    label: 'Kneeling down' },
  { key: 'oks_t0_work',        label: 'Work (paid or unpaid)' },
  { key: 'oks_t0_confidence',  label: 'Confidence in knee' },
  { key: 'oks_t0_shopping',    label: 'Shopping' },
  { key: 'oks_t0_stairs',      label: 'Going up and down stairs' },
] as const;

const EQ5D_ITEMS = [
  { key: 't0_mobility',   label: 'Mobility' },
  { key: 't0_self_care',  label: 'Self-care' },
  { key: 't0_activity',   label: 'Usual activities' },
  { key: 't0_discomfort', label: 'Pain / discomfort' },
  { key: 't0_anxiety',    label: 'Anxiety / depression' },
] as const;

const EQ5D_OPTIONS = [
  { value: 1, label: '1 — No problems' },
  { value: 2, label: '2 — Some problems' },
  { value: 3, label: '3 — Extreme problems' },
];

const SYMPTOM_PERIODS = [
  { value: 1, label: 'Less than 1 year' },
  { value: 2, label: '1–5 years' },
  { value: 3, label: '5–10 years' },
  { value: 4, label: 'More than 10 years' },
];

const LIVING_ARR = [
  { value: 1, label: 'Alone' },
  { value: 2, label: 'With others' },
  { value: 4, label: 'Care home / assisted' },
];

const COMORBIDITIES = [
  { key: 'heart_disease',  label: 'Heart disease' },
  { key: 'high_bp',        label: 'High blood pressure' },
  { key: 'stroke',         label: 'Stroke or TIA' },
  { key: 'circulation',    label: 'Circulation problems' },
  { key: 'lung_disease',   label: 'Lung disease' },
  { key: 'diabetes',       label: 'Diabetes' },
  { key: 'kidney_disease', label: 'Kidney disease' },
  { key: 'nervous_system', label: 'Nervous system condition' },
  { key: 'liver_disease',  label: 'Liver disease' },
  { key: 'cancer',         label: 'Cancer' },
  { key: 'depression',     label: 'Depression or anxiety' },
  { key: 'arthritis',      label: 'Arthritis' },
] as const;

const MODELS = [
  { value: 'random_forest_tuned', label: 'Random Forest (Tuned) — Best performing' },
  { value: 'lr_no_weights',       label: 'Logistic Regression (No Weights)' },
  { value: 'lr_lasso_l1',         label: 'Logistic Regression (LASSO L1)' },
  { value: 'lr_smote',            label: 'Logistic Regression (SMOTE)' },
];

type FormState = Omit<PatientPayload, 'oks_t0_score'>;

function defaultForm(): FormState {
  return {
    age_band: 3,
    gender: 0,
    oks_t0_pain: 2,
    oks_t0_night_pain: 2,
    oks_t0_washing: 3,
    oks_t0_transport: 2,
    oks_t0_walking: 2,
    oks_t0_standing: 2,
    oks_t0_limping: 2,
    oks_t0_kneeling: 1,
    oks_t0_work: 2,
    oks_t0_confidence: 2,
    oks_t0_shopping: 2,
    oks_t0_stairs: 2,
    t0_mobility: 2,
    t0_self_care: 1,
    t0_activity: 2,
    t0_discomfort: 2,
    t0_anxiety: 1,
    t0_symptom_period: 2,
    t0_living_arrangements: 2,
    t0_assisted: 0,
    t0_previous_surgery: 0,
    t0_disability: 0,
    heart_disease: 0,
    high_bp: 0,
    stroke: 0,
    circulation: 0,
    lung_disease: 0,
    diabetes: 0,
    kidney_disease: 0,
    nervous_system: 0,
    liver_disease: 0,
    cancer: 0,
    depression: 0,
    arthritis: 0,
    university_hospital: 1,
    independent_hospital: 0,
    region: 'West Midlands',
    model_name: 'random_forest_tuned',
  };
}

function ResultPanel({ result, loading }: { result: PredictionResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="nhs-result-panel">
        <div className="nhs-result-panel__header">Prediction Result</div>
        <div className="nhs-spinner">
          <div className="nhs-spinner__ring" />
          Running prediction...
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="nhs-result-panel">
        <div className="nhs-result-panel__header">Prediction Result</div>
        <div className="nhs-result-panel__body">
          <div className="nhs-outcome-badge nhs-outcome-badge--neutral">
            <div className="nhs-outcome-badge__icon">⬜</div>
            <div>
              <div className="nhs-outcome-badge__label">Awaiting input</div>
              <div style={{ fontSize: '1rem', color: 'var(--nhs-mid-grey)' }}>
                Complete the patient form and click "Predict Outcome"
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isGood = result.prediction === 0;
  const goodPct = Math.round(result.probability_good_outcome * 100);
  const riskPct = Math.round(result.probability_at_risk * 100);

  return (
    <div className="nhs-result-panel">
      <div className="nhs-result-panel__header">Prediction Result</div>
      <div className="nhs-result-panel__body">
        <div className={`nhs-outcome-badge ${isGood ? 'nhs-outcome-badge--good' : 'nhs-outcome-badge--risk'}`}>
          <div className="nhs-outcome-badge__icon">{isGood ? '✅' : '⚠️'}</div>
          <div>
            <div className="nhs-outcome-badge__label">Model prediction</div>
            <div className={`nhs-outcome-badge__text ${isGood ? 'nhs-outcome-badge__text--good' : 'nhs-outcome-badge__text--risk'}`}>
              {result.outcome_label}
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--nhs-mid-grey)' }}>Confidence</span>
          <span className={`nhs-tag ${result.confidence === 'High' ? 'nhs-tag--green' : result.confidence === 'Moderate' ? 'nhs-tag--amber' : 'nhs-tag--grey'}`}>
            {result.confidence}
          </span>
        </div>

        {/* Probability bars */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--nhs-dark-grey)' }}>
            Probability breakdown
          </div>
          <div className="nhs-prob-row">
            <div className="nhs-prob-row__label">Good Outcome</div>
            <div className="nhs-prob-bar-track">
              <div
                className="nhs-prob-bar nhs-prob-bar--green"
                style={{ width: `${goodPct}%` }}
              />
            </div>
            <div className="nhs-prob-row__pct" style={{ color: 'var(--nhs-green)' }}>
              {goodPct}%
            </div>
          </div>
          <div className="nhs-prob-row">
            <div className="nhs-prob-row__label">At Risk</div>
            <div className="nhs-prob-bar-track">
              <div
                className="nhs-prob-bar nhs-prob-bar--red"
                style={{ width: `${riskPct}%` }}
              />
            </div>
            <div className="nhs-prob-row__pct" style={{ color: 'var(--nhs-red)' }}>
              {riskPct}%
            </div>
          </div>
        </div>

        {/* Clinical note */}
        <div className={`nhs-inset ${isGood ? 'nhs-inset--blue' : ''}`} style={!isGood ? { borderLeftColor: 'var(--nhs-red)', background: '#FBE3E4' } : {}}>
          <strong>Clinical interpretation:</strong>
          <p style={{ marginTop: '0.375rem', fontSize: '0.875rem', lineHeight: 1.5, margin: '0.375rem 0 0 0' }}>
            {result.clinical_note}
          </p>
        </div>

        {/* Model used */}
        <div style={{ fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)', marginTop: '1rem' }}>
          Model: {result.model_used.replace(/_/g, ' ')}
        </div>

        {/* Disclaimer */}
        <div className="nhs-warning-callout" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <div className="nhs-warning-callout__title"><span>⚠️</span> Research tool only</div>
          <p style={{ fontSize: '0.8125rem', margin: 0 }}>
            Not validated for clinical use. Do not base clinical decisions solely on this
            prediction. Always apply professional judgement.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PatientPredictor() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState('');

  const oksScore = OKS_ITEMS.reduce((sum, item) => sum + (form[item.key] as number), 0);

  const set = useCallback((key: keyof FormState, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const synthetic = await fetchSyntheticPatient();
      setForm(prev => ({ ...prev, ...synthetic }));
      setResult(null);
      setApiError('');
    } catch {
      // Fall back to local generation if API is unavailable
      const local = generateSyntheticPatient();
      setForm(prev => ({ ...prev, ...local }));
      setResult(null);
    } finally {
      setGenerating(false);
    }
  };

  const handlePredict = async () => {
    setPredicting(true);
    setApiError('');
    try {
      const payload: PatientPayload = { ...form, oks_t0_score: oksScore };
      const res = await predict(payload);
      setResult(res);
    } catch (err: unknown) {
      setApiError(
        'Could not connect to the prediction API. Make sure the backend is running on port 8000.'
      );
    } finally {
      setPredicting(false);
    }
  };

  return (
    <main className="nhs-main">
      <div className="nhs-page-header">
        <div className="nhs-page-header__inner">
          <h1 className="nhs-page-header__title">Patient Outcome Predictor</h1>
          <p className="nhs-page-header__lead">
            Enter pre-operative patient details or generate a synthetic patient.
            The model will predict the likelihood of achieving meaningful improvement
            (OKS delta &gt; 7) after knee replacement surgery.
          </p>
        </div>
      </div>

      <section className="nhs-section">
        <div className="nhs-section__inner">
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem', alignItems: 'start' }}>

            {/* LEFT: Patient form */}
            <div>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  className="nhs-btn nhs-btn--secondary"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? '⏳ Generating...' : '🎲 Generate Synthetic Patient'}
                </button>
                <button
                  className="nhs-btn nhs-btn--secondary nhs-btn--sm"
                  onClick={() => { setForm(defaultForm()); setResult(null); }}
                  style={{ alignSelf: 'center' }}
                >
                  Reset form
                </button>
              </div>

              {/* Model selection */}
              <div className="nhs-form-section">
                <div className="nhs-form-section__title">⚙️ Model Selection</div>
                <div className="nhs-form-group">
                  <label className="nhs-label" htmlFor="model_name">Prediction model</label>
                  <select
                    id="model_name"
                    className="nhs-select"
                    value={form.model_name}
                    onChange={e => set('model_name', e.target.value)}
                  >
                    {MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Demographics */}
              <div className="nhs-form-section">
                <div className="nhs-form-section__title">👤 Demographics</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="nhs-form-group">
                    <label className="nhs-label" htmlFor="age_band">Age band</label>
                    <select
                      id="age_band"
                      className="nhs-select"
                      value={form.age_band}
                      onChange={e => set('age_band', Number(e.target.value))}
                    >
                      {AGE_BANDS.map(ab => (
                        <option key={ab.value} value={ab.value}>{ab.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="nhs-form-group">
                    <label className="nhs-label">Gender</label>
                    <div className="nhs-radio-group">
                      <label className={`nhs-radio${form.gender === 0 ? ' nhs-radio--selected' : ''}`}>
                        <input
                          type="radio"
                          name="gender"
                          value={0}
                          checked={form.gender === 0}
                          onChange={() => set('gender', 0)}
                        />
                        Female
                      </label>
                      <label className={`nhs-radio${form.gender === 1 ? ' nhs-radio--selected' : ''}`}>
                        <input
                          type="radio"
                          name="gender"
                          value={1}
                          checked={form.gender === 1}
                          onChange={() => set('gender', 1)}
                        />
                        Male
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* OKS scores */}
              <div className="nhs-form-section">
                <div className="nhs-form-section__title">
                  🦵 Oxford Knee Score (Pre-operative)
                  <span style={{
                    marginLeft: 'auto',
                    background: 'var(--nhs-light-blue)',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}>
                    Total: {oksScore}/48
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--nhs-mid-grey)', marginBottom: '1rem' }}>
                  Rate each item: 0 = Severe difficulty / None of the time, 4 = No difficulty / All of the time
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }}>
                  {OKS_ITEMS.map(item => (
                    <div key={item.key} className="nhs-form-group" style={{ marginBottom: '0.5rem' }}>
                      <label className="nhs-label" style={{ fontSize: '0.875rem' }} htmlFor={item.key}>
                        {item.label}
                        <span style={{ float: 'right', color: 'var(--nhs-light-blue)', fontWeight: 700 }}>
                          {form[item.key]}/4
                        </span>
                      </label>
                      <input
                        id={item.key}
                        type="range"
                        className="nhs-range"
                        min={0}
                        max={4}
                        step={1}
                        value={form[item.key] as number}
                        onChange={e => set(item.key, Number(e.target.value))}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-valuenow={form[item.key] as number}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* EQ-5D */}
              <div className="nhs-form-section">
                <div className="nhs-form-section__title">💊 EQ-5D Quality of Life</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }}>
                  {EQ5D_ITEMS.map(item => (
                    <div key={item.key} className="nhs-form-group" style={{ marginBottom: '0.25rem' }}>
                      <label className="nhs-label" style={{ fontSize: '0.875rem' }} htmlFor={item.key}>
                        {item.label}
                      </label>
                      <select
                        id={item.key}
                        className="nhs-select"
                        value={form[item.key] as number}
                        onChange={e => set(item.key, Number(e.target.value))}
                      >
                        {EQ5D_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comorbidities */}
              <div className="nhs-form-section">
                <div className="nhs-form-section__title">🏥 Medical History — Comorbidities</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1.5rem' }}>
                  {COMORBIDITIES.map(c => (
                    <label key={c.key} className="nhs-checkbox">
                      <input
                        type="checkbox"
                        checked={(form[c.key] as number) === 1}
                        onChange={e => set(c.key, e.target.checked ? 1 : 0)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Other details */}
              <div className="nhs-form-section">
                <div className="nhs-form-section__title">📋 Other Pre-operative Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }}>
                  <div className="nhs-form-group">
                    <label className="nhs-label" htmlFor="t0_symptom_period">Symptom duration</label>
                    <select
                      id="t0_symptom_period"
                      className="nhs-select"
                      value={form.t0_symptom_period}
                      onChange={e => set('t0_symptom_period', Number(e.target.value))}
                    >
                      {SYMPTOM_PERIODS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="nhs-form-group">
                    <label className="nhs-label" htmlFor="t0_living_arrangements">Living arrangements</label>
                    <select
                      id="t0_living_arrangements"
                      className="nhs-select"
                      value={form.t0_living_arrangements}
                      onChange={e => set('t0_living_arrangements', Number(e.target.value))}
                    >
                      {LIVING_ARR.map(l => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="nhs-form-group">
                    <label className="nhs-label" htmlFor="region">NHS Region</label>
                    <select
                      id="region"
                      className="nhs-select"
                      value={form.region}
                      onChange={e => set('region', e.target.value)}
                    >
                      <option value="East Midlands">East Midlands</option>
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="nhs-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {[
                      { key: 't0_previous_surgery' as keyof FormState, label: 'Previous knee surgery' },
                      { key: 't0_assisted' as keyof FormState, label: 'Needs assistance with daily tasks' },
                      { key: 't0_disability' as keyof FormState, label: 'Has a disability' },
                    ].map(cb => (
                      <label key={cb.key} className="nhs-checkbox">
                        <input
                          type="checkbox"
                          checked={(form[cb.key] as number) === 1}
                          onChange={e => set(cb.key, e.target.checked ? 1 : 0)}
                        />
                        {cb.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {apiError && (
                <div className="nhs-warning-callout">
                  <div className="nhs-warning-callout__title"><span>⚠️</span> Error</div>
                  <p style={{ margin: 0, fontSize: '0.9375rem' }}>{apiError}</p>
                </div>
              )}

              <button
                className="nhs-btn nhs-btn--primary nhs-btn--large"
                onClick={handlePredict}
                disabled={predicting}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {predicting ? '⏳ Running prediction...' : '🔮 Predict Outcome'}
              </button>
            </div>

            {/* RIGHT: Result panel */}
            <ResultPanel result={result} loading={predicting} />
          </div>
        </div>
      </section>
    </main>
  );
}
