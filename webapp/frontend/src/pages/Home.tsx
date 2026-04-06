import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  fetchPRCurves, fetchThresholdAnalysis, fetchMetrics,
  type PRCurves, type ThresholdAnalysis, type ModelMeta,
} from '../utils/api';

/* ── Hooks ───────────────────────────────────────────────── */

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCounter(target: number, active: boolean, duration = 1100) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(eased * target);
      if (t < 1) requestAnimationFrame(tick);
      else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return val;
}

/* ── Static data ─────────────────────────────────────────── */

const DATA_STATS = [
  { display: '132,382', label: 'Patient records',       sub: 'Cleaned from 139,236 original records' },
  { display: '3 yrs',   label: 'NHS data collected',    sub: '2016/17 – 2018/19 PROMs datasets' },
  { display: '57',      label: 'Pre-operative features', sub: 'After encoding and feature engineering' },
  { display: '294',     label: 'NHS provider orgs',     sub: 'Mapped to region, teaching status, ownership' },
];

const FE_TRANSFORMS = [
  {
    title: 'Provider enrichment',
    color: '#005EB8',
    from: 'provider_code — 294 unique hospital codes',
    derived: ['Teaching hospital (yes / no)', 'Geographic region (from postal code)', 'Public vs. private ownership'],
    note: 'Original code dropped. Signal retained without cardinality problems.',
  },
  {
    title: 'Comorbidity count',
    color: '#0072CE',
    from: '12 individual condition flags',
    derived: ['comorbidity_count = Σ of all conditions', 'e.g. cancer + diabetes + heart disease + …'],
    note: 'Sum across: cancer, circulation, kidney, heart, stroke, lung, nervous system, liver, diabetes, high BP, depression, arthritis.',
  },
  {
    title: 'OKS subscales',
    color: '#41B6E6',
    from: '12 Oxford questionnaire items (0–4 each)',
    derived: ['Pain subscale (6 items)', 'ADL subscale (4 items)', 'Function subscale (5 items)'],
    note: 'Individual items kept alongside subscales to preserve non-linear signal for the models.',
  },
];

const APPROACH_MODELS = [
  {
    label: 'Baseline',
    name: 'Logistic Regression',
    color: '#0072CE',
    pillars: ['Linear probability model', 'Direct coefficient interpretation', 'Fully transparent — every weight readable'],
  },
  {
    label: 'Ensemble',
    name: 'Random Forest',
    color: '#003087',
    pillars: ['300 decision trees combined', 'Captures non-linear patterns', 'Black-box — requires post-hoc SHAP to explain'],
  },
  {
    label: 'Glass-box',
    name: 'Explainable Boosting Machine',
    color: '#425563',
    pillars: ['Additive boosting model', 'Native global + local explanations — no post-hoc tools needed', "Each feature's contribution directly inspectable"],
  },
];

const TOP_FEATURES = [
  { rank: '01', name: 'Pre-operative limping severity', note: 'Strongest single predictor' },
  { rank: '02', name: 'Disability status (T0)', note: '' },
  { rank: '03', name: 'Age band 65–79', note: '' },
  { rank: '04', name: 'Self-care limitations', note: '' },
  { rank: '05', name: 'Pre-operative pain score', note: '' },
  { rank: '06', name: 'Anxiety level (T0)', note: '' },
];

const STABILITY = [
  { name: 'Random Forest', train: 100, val: 92, test: 96.9, color: '#5B9BD5' },
  { name: 'EBM (Recommended)', train: 96.2, val: 95.7, test: 94.1, color: '#009639' },
];

const MODEL_COLORS: Record<string, string> = {
  ebm_model:           '#009639',
  random_forest_tuned: '#5B9BD5',
  lr_no_weights:       '#41B6E6',
};
const MODEL_LABELS: Record<string, string> = {
  ebm_model:           'EBM',
  random_forest_tuned: 'Random Forest',
  lr_no_weights:       'Logistic Regression',
};
const KEY_MODELS = ['ebm_model', 'random_forest_tuned', 'lr_no_weights'];

/* ── Visual components ───────────────────────────────────── */

function PersonGrid({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', maxWidth: '240px' }}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const highlighted = i === 0;
        const color = highlighted ? '#DA291C' : '#D8DDE0';
        return (
          <div key={i} style={{
            opacity: active ? 1 : 0,
            transform: active ? 'translateY(0)' : 'translateY(20px)',
            transition: `opacity 0.45s ease ${150 + i * 100}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${150 + i * 100}ms`,
          }}>
            <svg width="34" height="46" viewBox="0 0 34 46" fill="none">
              <circle cx="17" cy="9" r="8" fill={color} />
              <path d="M2 44 C2 28 8 22 17 22 C26 22 32 28 32 44 Z" fill={color} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function ClassSplitBar({ active }: { active: boolean }) {
  return (
    <div style={{ marginTop: '2rem', maxWidth: '540px' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--nhs-mid-grey)', marginBottom: '0.75rem' }}>
        Class distribution — 132,382 patients
      </div>
      {[
        { label: 'Good outcome (OKS ≥ +7)', pct: 82.5, color: 'var(--nhs-green)' },
        { label: 'Poor outcome (OKS < +7)', pct: 17.5, color: 'var(--nhs-red)' },
      ].map(({ label, pct, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.625rem' }}>
          <div style={{ flex: 1, height: '28px', background: 'var(--nhs-light-grey)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: active ? `${pct}%` : '0%', background: color, borderRadius: '4px',
              transition: 'width 1.1s cubic-bezier(0.16,1,0.3,1) 0.4s',
              display: 'flex', alignItems: 'center', paddingLeft: '10px',
              color: '#fff', fontSize: '0.8125rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
              {pct}%
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--nhs-dark-grey)', width: '220px', flexShrink: 0 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ t, active, delay }: { t: typeof FE_TRANSFORMS[0]; active: boolean; delay: number }) {
  return (
    <div className="nhs-fe-card" style={{
      opacity: active ? 1 : 0,
      transform: active ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      <div className="nhs-fe-card__header" style={{ background: t.color }}>{t.title}</div>
      <div className="nhs-fe-card__body">
        <div className="nhs-fe-card__from">{t.from}</div>
        <div className="nhs-fe-card__arrow">↓</div>
        {t.derived.map((d) => (
          <div key={d} className="nhs-fe-card__to-item">
            <span className="nhs-fe-card__to-dot" style={{ background: t.color }} />
            {d}
          </div>
        ))}
        <div className="nhs-fe-card__note">{t.note}</div>
      </div>
    </div>
  );
}

const HYPERPARAMETER_SEARCH_SPACE: Record<string, { param: string; values: string }[]> = {
  random_forest_tuned: [
    { param: 'n_estimators',      values: '100, 200, 300' },
    { param: 'max_depth',         values: '10, 15, 20, 25, None' },
    { param: 'min_samples_split', values: '2, 5, 10, 20' },
    { param: 'min_samples_leaf',  values: '1, 2, 4, 8' },
    { param: 'class_weight',      values: 'balanced, balanced_subsample' },
  ],
  ebm_model: [
    { param: 'max_rounds',    values: '100, 200, 300' },
    { param: 'learning_rate', values: '0.001, 0.01, 0.05' },
    { param: 'max_leaves',    values: '3, 5, 7' },
  ],
};

function ModelTable({ models }: { models: ModelMeta[] }) {
  const displayed = KEY_MODELS
    .filter(k => HYPERPARAMETER_SEARCH_SPACE[k])
    .map(k => models.find(m => m.name === k))
    .filter(Boolean) as ModelMeta[];

  const rows: { modelName: string; displayName: string; param: string; values: string; rowSpan?: number }[] = [];
  displayed.forEach(m => {
    const space = HYPERPARAMETER_SEARCH_SPACE[m.name] ?? [];
    space.forEach((entry, i) => {
      rows.push({ modelName: m.name, displayName: m.display_name, ...entry, rowSpan: i === 0 ? space.length : undefined });
    });
  });

  return (
    <table className="nhs-data-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Hyperparameter</th>
          <th>Values Tested</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.modelName}-${row.param}`}>
            {row.rowSpan !== undefined && (
              <td rowSpan={row.rowSpan} style={{ verticalAlign: 'middle' }}>
                <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: MODEL_COLORS[row.modelName] ?? '#768692', marginRight: 8, verticalAlign: 'middle' }} />
                <strong>{row.displayName}</strong>
              </td>
            )}
            <td style={{ fontSize: '0.8125rem', color: 'var(--nhs-dark-grey)' }}>{row.param}</td>
            <td style={{ fontSize: '0.8125rem' }}>{row.values}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PRCurveChart({ prCurves }: { prCurves: PRCurves }) {
  const getCurveData = (key: string) => {
    const c = prCurves[key];
    if (!c) return [];
    return c.recall
      .map((r, i) => ({ recall: parseFloat((r * 100).toFixed(3)), precision: parseFloat((c.precision[i] * 100).toFixed(2)) }))
      .filter(p => p.recall >= 0 && p.precision >= 0)
      .sort((a, b) => a.recall - b.recall);
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {KEY_MODELS.map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: MODEL_COLORS[k], display: 'inline-block', flexShrink: 0 }} />
            {MODEL_LABELS[k]}
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart margin={{ top: 5, right: 10, bottom: 25, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis
            type="number" dataKey="recall" domain={[0, 'dataMax']}
            tickFormatter={v => `${v.toFixed(1)}%`}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
            label={{ value: 'Recall (%)', position: 'insideBottom', offset: -12, fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
          />
          <YAxis
            domain={[0, 100]} tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
            label={{ value: 'Precision (%)', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
          />
          <Tooltip content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0];
            return (
              <div style={{ background: '#0d2240', border: `1px solid ${d.stroke}60`, padding: '8px 12px', borderRadius: 4, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: d.stroke as string, marginBottom: 4 }}>{d.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)' }}>Precision: <strong>{(d.payload.precision as number).toFixed(1)}%</strong></div>
                <div style={{ color: 'rgba(255,255,255,0.8)' }}>Recall: <strong>{(d.payload.recall as number).toFixed(2)}%</strong></div>
              </div>
            );
          }} />
          {KEY_MODELS.map(k => (
            <Line
              key={k}
              data={getCurveData(k)}
              dataKey="precision"
              name={MODEL_LABELS[k]}
              stroke={MODEL_COLORS[k]}
              dot={false}
              strokeWidth={2.5}
              type="monotone"
              isAnimationActive
              animationDuration={1000}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ThresholdExplorer({ thresholdData, selected, onChange }: {
  thresholdData: ThresholdAnalysis | null;
  selected: number;
  onChange: (v: number) => void;
}) {
  const getMetrics = (key: string) => {
    if (!thresholdData) return null;
    const ts = thresholdData.thresholds;
    const idx = ts.reduce((best, t, i) =>
      Math.abs(t - selected) < Math.abs(ts[best] - selected) ? i : best, 0);
    const c = thresholdData.models[key];
    if (!c) return null;
    return {
      precision: c.precision[idx] * 100,
      recall: c.recall[idx] * 100,
      flagged: Math.round(c.predicted_positive[idx]),
    };
  };

  return (
    <div style={{ marginTop: '1.75rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
            Decision threshold
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
            {selected.toFixed(2)}
          </span>
        </div>
        <input
          type="range" min={0.1} max={0.9} step={0.05}
          value={selected}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="nhs-threshold-slider"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.28)', marginTop: '2px' }}>
          <span>0.10 — more patients flagged</span>
          <span>0.90 — higher precision</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
        {KEY_MODELS.map(k => {
          const m = getMetrics(k);
          return (
            <div key={k} style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${MODEL_COLORS[k]}35`,
              borderTop: `2px solid ${MODEL_COLORS[k]}`,
              borderRadius: '4px',
              padding: '0.875rem 0.75rem',
            }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: MODEL_COLORS[k], marginBottom: '0.375rem', letterSpacing: '0.04em' }}>
                {MODEL_LABELS[k]}
              </div>
              <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {m ? `${m.precision.toFixed(1)}%` : '—'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', marginBottom: '0.5rem' }}>precision</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)' }}>
                {m ? `${m.recall.toFixed(2)}% recall` : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                {m != null ? `${m.flagged} flagged` : '—'}
              </div>
            </div>
          );
        })}
      </div>
      {!thresholdData && (
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginTop: '0.75rem' }}>
          Backend offline — connect the API to enable live threshold analysis.
        </p>
      )}
    </div>
  );
}

function StabilityBars({ active }: { active: boolean }) {
  const splits = ['Train', 'Validation', 'Test'];
  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        Precision stability across data splits
      </div>
      {STABILITY.map((m) => (
        <div key={m.name} style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: '0.5rem' }}>{m.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {[m.train, m.val, m.test].map((v, i) => (
              <div key={i}>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ height: '100%', width: active ? `${v}%` : '0%', background: m.color, borderRadius: '4px', transition: `width 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 150}ms` }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                  {splits[i]}: <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{v}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */

export function Home() {
  const navigate = useNavigate();
  const ch1 = useReveal();
  const ch2 = useReveal();
  const ch3 = useReveal();
  const ch4 = useReveal();
  const ch5 = useReveal();
  const about = useReveal(0.05);

  const pct17 = useCounter(17.5, ch1.visible, 1400);

  const [models, setModels] = useState<ModelMeta[]>([]);
  const [prCurves, setPrCurves] = useState<PRCurves | null>(null);
  const [thresholdData, setThresholdData] = useState<ThresholdAnalysis | null>(null);
  const [selectedThreshold, setSelectedThreshold] = useState(0.8);

  useEffect(() => {
    if (!ch3.visible) return;
    fetchMetrics().then(setModels).catch(() => {});
  }, [ch3.visible]);

  useEffect(() => {
    if (!ch4.visible) return;
    fetchPRCurves().then(setPrCurves).catch(() => {});
    fetchThresholdAnalysis(0.8, 0.1, 0.9, 0.05).then(setThresholdData).catch(() => {});
  }, [ch4.visible]);

  return (
    <main className="nhs-main">

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="nhs-hero nhs-hero--tall">
        <div className="nhs-hero__inner">
          <div className="nhs-hero__tag">EAISI Academy · The Commodores · March 2026</div>
          <h1 className="nhs-hero__title">Predicting Poor Outcomes<br />in Knee Replacement Surgery</h1>
          <p className="nhs-hero__subtitle">
            A supervised machine learning study using three years of NHS Patient-Reported Outcome
            Measures to identify — before surgery — which patients are unlikely to gain meaningful
            benefit from knee replacement.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="nhs-btn nhs-btn--primary nhs-btn--large" onClick={() => navigate('/methodology')}>Read the Methodology</button>
            <button className="nhs-btn nhs-btn--large" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '2px solid rgba(255,255,255,0.45)' }} onClick={() => navigate('/predictor')}>Try the Predictor</button>
          </div>
          <p className="nhs-hero__scroll-hint">Scroll to explore the story ↓</p>
        </div>
      </section>

      {/* ── DISCLAIMER ─────────────────────────────────────── */}
      <div style={{ background: 'var(--nhs-pale-grey)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="nhs-warning-callout" style={{ marginBottom: 0 }}>
            <div className="nhs-warning-callout__title"><span>Important</span></div>
            <p style={{ fontSize: '0.9375rem', margin: 0 }}>
              This tool is a research prototype for decision-support only. It must not replace clinical judgement.
              Predictions are based on historical NHS PROMs data (2016–2019) and may not reflect current patient populations.
            </p>
          </div>
        </div>
      </div>

      {/* ── CHAPTER 01: THE CHALLENGE ──────────────────────── */}
      <section ref={ch1.ref} className={`nhs-story-section${ch1.visible ? ' is-visible' : ''}`} style={{ background: 'var(--nhs-white)' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="nhs-reveal"><div className="nhs-chapter-marker">Chapter 01 — The Challenge</div></div>
          <div className="nhs-story-split" style={{ alignItems: 'start' }}>
            <div className="nhs-reveal" style={{ transitionDelay: '100ms' }}>
              <PersonGrid active={ch1.visible} />
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ fontSize: 'clamp(3rem,8vw,5.5rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--nhs-red)' }}>
                  {pct17.toFixed(1)}%
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--nhs-dark-grey)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                  of knee replacement patients<br />gain no meaningful benefit
                </div>
              </div>
            </div>
            <div className="nhs-reveal" style={{ transitionDelay: '220ms' }}>
              <h2 className="nhs-story-heading">When surgery doesn't solve the pain</h2>
              <p className="nhs-story-body">Across the NHS, <strong>15–25% of patients</strong> still experience persistent pain or functional limitations one year after knee replacement. Our analysis of 132,382 records confirms: <strong>17.5% do not meet the Minimal Clinically Important Difference</strong> — an Oxford Knee Score improvement of at least 7 points.</p>
              <p className="nhs-story-body" style={{ marginTop: '1rem' }}>In 2018 alone, over 100,000 knee replacements were performed in the UK. At 17.5%, that is <strong>~17,500 patients per year</strong> who underwent major surgery without achieving the desired result. Can we identify them <em>before</em> the decision to operate is made?</p>
            </div>
          </div>
          <div className={`nhs-chapter-expanded${ch1.visible ? ' is-open' : ''}`}>
            <div className="nhs-chapter-expanded__inner">
              <div className="nhs-deep-dive-label">Problem Statement &amp; Goals</div>
              <div className="nhs-detail-split">
                <div><div className="nhs-detail-heading">Why this matters</div><p className="nhs-detail-body">For clinicians, the unpredictability makes accurate pre-operative counselling difficult, leading to unrealistic patient expectations. For the healthcare system, costs are incurred while benefits fail to materialise. Identifying at-risk patients before the decision to operate is the core challenge.</p></div>
                <div><div className="nhs-detail-heading">Project goals</div><p className="nhs-detail-body">Build a supervised ML classification model — using only pre-operative data — that classifies patients into two risk categories: <strong>Green</strong> (surgery recommended) and <strong>Red</strong> (surgery not recommended), giving clinicians a transparent, evidence-based basis for discussion.</p></div>
                <div><div className="nhs-detail-heading">Why knee, not hip?</div><p className="nhs-detail-body">Knee shows lower average improvement: <strong>16.89 OKS points</strong> vs 21.94 for hip. More patients gain less — making predictive intervention more valuable. Knee is also more prevalent: 100,547 vs 94,936 procedures in 2018.</p></div>
                <div><div className="nhs-detail-heading">Who is this for?</div><p className="nhs-detail-body">Designed for <strong>orthopaedic surgeons and clinical specialists</strong>, and built for use <em>with</em> patients — especially older adults. The dual focus strengthens shared decision-making, ensuring surgical choices are guided by both medical expertise and data-driven insight.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHAPTER 02: THE DATA ───────────────────────────── */}
      <section ref={ch2.ref} className={`nhs-story-section nhs-section--grey${ch2.visible ? ' is-visible' : ''}`}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="nhs-reveal">
            <div className="nhs-chapter-marker">Chapter 02 — The Data</div>
            <h2 className="nhs-story-heading" style={{ maxWidth: '560px', marginBottom: '2.5rem' }}>Three years of NHS patient voices</h2>
          </div>
          <div className="nhs-reveal" style={{ transitionDelay: '120ms' }}>
            <div className="nhs-grid nhs-grid--4" style={{ marginBottom: '2rem' }}>
              {DATA_STATS.map(s => (
                <div key={s.label} className="nhs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(1.5rem,3.5vw,2.25rem)', fontWeight: 900, color: 'var(--nhs-blue)', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.display}</div>
                  <div style={{ fontWeight: 700, color: 'var(--nhs-dark-grey)', margin: '0.375rem 0 0.25rem', fontSize: '0.9375rem' }}>{s.label}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)', lineHeight: 1.5 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="nhs-reveal" style={{ transitionDelay: '240ms' }}><ClassSplitBar active={ch2.visible} /></div>
          <div className="nhs-reveal" style={{ transitionDelay: '340ms' }}>
            <div className="nhs-inset nhs-inset--blue" style={{ maxWidth: '680px', marginTop: '2rem' }}>
              <strong>Target variable — "poor outcome":</strong> Oxford Knee Score improvement of <strong>≤ 7 points</strong> (T1 − T0). The Minimal Clinically Important Difference. Only <strong>pre-operative data</strong> is used for prediction.
            </div>
          </div>
          <div className={`nhs-chapter-expanded${ch2.visible ? ' is-open' : ''}`}>
            <div className="nhs-chapter-expanded__inner">
              <div className="nhs-deep-dive-label">Dataset Anatomy &amp; Design Decisions</div>
              <div className="nhs-detail-split">
                <div><div className="nhs-detail-heading">Six variable categories</div><p className="nhs-detail-body">Administrative identifiers, questionnaire administration, patient background (demographics, comorbidities, symptom duration), EQ-5D general health, Oxford Knee Score (12-item joint-specific), and post-operative experience. All T1 variables removed to prevent data leakage.</p></div>
                <div><div className="nhs-detail-heading">Why OKS over EQ-5D?</div><p className="nhs-detail-body">OKS is joint-specific — 12 questions directly measuring knee pain and function. It also has higher completeness: <strong>97.37%</strong> of patients have both pre- and post-operative scores, vs <strong>90.51%</strong> for EQ-5D index. Higher completeness reduces bias and minimises imputation.</p></div>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <div className="nhs-detail-heading" style={{ marginBottom: '0.75rem' }}>Records excluded</div>
                <table className="nhs-data-table" style={{ maxWidth: '520px' }}>
                  <thead><tr><th>Reason</th><th style={{ textAlign: 'right' }}>Count</th><th style={{ textAlign: 'right' }}>%</th></tr></thead>
                  <tbody>
                    <tr><td>Incomplete T0 Oxford Knee Score</td><td style={{ textAlign: 'right' }}>1,669</td><td style={{ textAlign: 'right' }}>1.20%</td></tr>
                    <tr><td>Revision surgery (different clinical scenario)</td><td style={{ textAlign: 'right' }}>5,185</td><td style={{ textAlign: 'right' }}>3.64%</td></tr>
                    <tr><td>Remaining clean dataset</td><td style={{ textAlign: 'right' }}>132,382</td><td style={{ textAlign: 'right' }}>95.16%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHAPTER 03: THE APPROACH ───────────────────────── */}
      <section ref={ch3.ref} className={`nhs-story-section${ch3.visible ? ' is-visible' : ''}`} style={{ background: 'var(--nhs-white)' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="nhs-reveal">
            <div className="nhs-chapter-marker">Chapter 03 — The Approach</div>
            <div style={{ maxWidth: '620px', marginBottom: '2.5rem' }}>
              <h2 className="nhs-story-heading">Feature engineering and model selection</h2>
              <p className="nhs-story-body">
                Alongside selecting the right algorithm, significant effort went into enriching
                the feature space — extracting new signal from existing variables. We also applied
                a hard constraint on model selection: the chosen model must not only perform well,
                it must be able to <strong>explain its reasoning</strong> to both clinician and patient.
                We <strong>prioritised precision over recall</strong>: when the model flags a patient,
                we must be right.
              </p>
            </div>
          </div>

          {/* Feature engineering visual */}
          <div className="nhs-reveal" style={{ transitionDelay: '100ms' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--nhs-mid-grey)', marginBottom: '1rem' }}>
              Engineered features — derived from raw data
            </div>
            <div className="nhs-fe-grid">
              {FE_TRANSFORMS.map((t, i) => <FeatureCard key={t.title} t={t} active={ch3.visible} delay={i * 120} />)}
            </div>
          </div>

          {/* MICE imputation brief */}
          <div className="nhs-reveal" style={{ transitionDelay: '220ms' }}>
            <div className="nhs-inset nhs-inset--blue" style={{ maxWidth: '740px', marginBottom: '2.5rem' }}>
              <strong>Missing data — MICE imputation:</strong> Remaining missing pre-operative variables
              (age band, gender, disability, EQ-5D items) were imputed using{' '}
              <strong>Multiple Imputation by Chained Equations</strong> with LightGBM — capturing
              multivariate relationships rather than substituting simple mean/mode values. Fitted
              on training data only to prevent leakage.
            </div>
          </div>

          {/* Model selection cards */}
          <div className="nhs-reveal" style={{ transitionDelay: '300ms' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--nhs-mid-grey)', marginBottom: '1rem' }}>
              Three classification models tested
            </div>
            <div className="nhs-model-comparison" style={{ marginBottom: '2rem' }}>
              {APPROACH_MODELS.map(m => (
                <div key={m.name} className="nhs-model-card" style={{ borderTop: `3px solid ${m.color}` }}>
                  <div className="nhs-model-card__label">{m.label}</div>
                  <div className="nhs-model-card__name">{m.name}</div>
                  <ul style={{ listStyle: 'none', marginTop: '0.5rem' }}>
                    {m.pillars.map(p => (
                      <li key={p} style={{ fontSize: '0.875rem', color: 'var(--nhs-dark-grey)', padding: '0.3rem 0', borderBottom: '1px solid var(--nhs-light-grey)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: m.color, fontWeight: 700, flexShrink: 0 }}>—</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Hyperparameter table in expanded */}
          <div className={`nhs-chapter-expanded${ch3.visible ? ' is-open' : ''}`}>
            <div className="nhs-chapter-expanded__inner">
              <div className="nhs-deep-dive-label">Hyperparameter Tuning Results</div>
              <p className="nhs-detail-body" style={{ marginBottom: '1rem' }}>
                Random Forest used RandomizedSearchCV (50 of 960 configs, 5-fold CV).
                EBM used GridSearchCV (all 135 configs, 5-fold CV). Logistic Regression
                was tested with default parameters, L1 regularisation, and SMOTE — all
                performed identically.
              </p>
              <ModelTable models={models} />
            </div>
          </div>

          <div className="nhs-reveal" style={{ transitionDelay: '380ms' }}>
            <button className="nhs-btn nhs-btn--secondary" style={{ marginTop: '0.5rem' }} onClick={() => navigate('/methodology')}>
              Full methodology — all 8 steps →
            </button>
          </div>
        </div>
      </section>

      {/* ── CHAPTER 04: THE RESULTS ────────────────────────── */}
      <section ref={ch4.ref} className={`nhs-story-section nhs-story-section--dark${ch4.visible ? ' is-visible' : ''}`}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="nhs-reveal"><div className="nhs-chapter-marker nhs-chapter-marker--white">Chapter 04 — The Results</div></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: '3.5rem', alignItems: 'start' }}>
            {/* Left: stat + features */}
            <div className="nhs-reveal" style={{ transitionDelay: '120ms' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                EBM · threshold 0.8
              </div>
              <div className="nhs-giant-stat nhs-giant-stat--white">94.1%</div>
              <div className="nhs-giant-stat__label nhs-giant-stat__label--white" style={{ marginBottom: '2rem' }}>
                precision · 169 patients flagged<br />on the held-out test set
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>
                Top predictors — EBM global explanation
              </div>
              {TOP_FEATURES.map((f, i) => (
                <div key={f.rank} style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'baseline',
                  padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)',
                  opacity: ch4.visible ? 1 : 0,
                  transform: ch4.visible ? 'translateX(0)' : 'translateX(-16px)',
                  transition: `opacity 0.5s ease ${300 + i * 80}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${300 + i * 80}ms`,
                }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', flexShrink: 0 }}>{f.rank}</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                    {f.name}
                    {f.note && <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{f.note}</span>}
                  </span>
                </div>
              ))}
              <button
                className="nhs-btn"
                style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
                onClick={() => navigate('/dashboard')}
              >
                Explore model dashboard →
              </button>
            </div>

            {/* Right: PR curves + threshold slider */}
            <div className="nhs-reveal" style={{ transitionDelay: '200ms' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: '0.5rem' }}>
                Precision–Recall curves
              </div>
              {prCurves
                ? <PRCurveChart prCurves={prCurves} />
                : <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: '1px dashed rgba(255,255,255,0.12)' }}>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>Connect backend to load PR curves</span>
                  </div>
              }
              <ThresholdExplorer thresholdData={thresholdData} selected={selectedThreshold} onChange={setSelectedThreshold} />
            </div>
          </div>

          {/* Expanded: stability */}
          <div className={`nhs-chapter-expanded${ch4.visible ? ' is-open' : ''}`}>
            <div className="nhs-chapter-expanded__inner--dark">
              <div className="nhs-deep-dive-label nhs-deep-dive-label--white">Performance Stability &amp; Real-World Impact</div>
              <div className="nhs-detail-split">
                <div>
                  <div className="nhs-detail-heading nhs-detail-heading--white">Stability across data splits</div>
                  <p className="nhs-detail-body nhs-detail-body--white">Both ensemble models dramatically outperformed LR — flagging 160+ patients vs just 18. Random Forest showed high variance: 100% precision on training, dropping to 92% on validation. EBM held steady at 96.2% → 95.7% → 94.1%, with predicted positive counts stable within a narrow 578–583 range across folds.</p>
                  <StabilityBars active={ch4.visible} />
                </div>
                <div>
                  <div className="nhs-detail-heading nhs-detail-heading--white">Real-world deployment impact</div>
                  <p className="nhs-detail-body nhs-detail-body--white">Based on 2016–2019 data: ~46,412 knee replacements per year (~893/week). Approximately 152 patients/week historically experience poor outcomes. At threshold 0.8, the model flags ~4–5 poor-outcome patients per week for enhanced counselling. Over 25 weeks: ~100 avoidable surgeries in high-risk patients — reducing the poor-outcome proportion by approximately <strong style={{ color: 'rgba(255,255,255,0.9)' }}>0.4 percentage points</strong>. Annual evaluation against NHS PROMs data is the appropriate measurement cycle.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHAPTER 05: THE TOOL ───────────────────────────── */}
      <section ref={ch5.ref} className={`nhs-story-section nhs-section--grey${ch5.visible ? ' is-visible' : ''}`}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="nhs-reveal"><div className="nhs-chapter-marker">Chapter 05 — The Tool</div></div>

          <div className="nhs-reveal" style={{ transitionDelay: '80ms', marginBottom: '3rem' }}>
            <div className="nhs-inset nhs-inset--blue" style={{ maxWidth: '760px' }}>
              <strong>Why the Explainable Boosting Machine?</strong>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9375rem', lineHeight: 1.7 }}>
                Random Forest achieved marginally higher precision (96.9% vs 94.1%), and SHAP
                values could technically be applied to approximate its explanations after the
                fact. But SHAP is a post-hoc approximation — it estimates what the model probably
                relied on, it does not read the model directly. The EBM is an additive glass-box:
                each feature's contribution is an exact, inspectable function of the input, with
                no approximation involved. Given comparable performance, native full explainability
                — for both global model behaviour and individual patient predictions — made the
                EBM the clear choice for a clinical setting.
              </p>
            </div>
          </div>

          <div className="nhs-story-split nhs-story-split--reversed">
            <div className="nhs-reveal" style={{ transitionDelay: '150ms' }}>
              <h2 className="nhs-story-heading">Built for the consultation room</h2>
              <p className="nhs-story-body">The <strong>Knee Replacement Outcome Predictor</strong> translates the EBM's probabilistic output into a clear, visual decision framework. It presents a traffic-light recommendation alongside the patient's OKS subscale profile — and explains the top 3 factors driving the prediction, so the clinician can show the patient <em>why</em>, not just <em>what</em>.</p>
              <p className="nhs-story-body" style={{ marginTop: '1rem' }}>The model output is not a gate. It is a structured conversation starter that supports shared decision-making rather than replacing it.</p>
              <button className="nhs-btn nhs-btn--primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/predictor')}>Open the Predictor →</button>
            </div>
            <div className="nhs-reveal" style={{ transitionDelay: '250ms' }}>
              <div className="nhs-decision-zones">
                <div className="nhs-zone nhs-zone--green">
                  <div className="nhs-zone__title nhs-zone__title--green"><span className="nhs-zone__dot nhs-zone__dot--green" />Green Zone</div>
                  <div className="nhs-zone__body"><strong>Surgery recommended.</strong> Model predicts meaningful OKS improvement. Expected benefit justifies the procedure.</div>
                </div>
                <div className="nhs-zone nhs-zone--red">
                  <div className="nhs-zone__title nhs-zone__title--red"><span className="nhs-zone__dot nhs-zone__dot--red" />Red Zone</div>
                  <div className="nhs-zone__body"><strong>High risk of poor outcome.</strong> Alternatives — physiotherapy, pain management — should be explored first.</div>
                </div>
              </div>
              <div className="nhs-inset" style={{ marginBottom: 0 }}>
                <strong>Precision by design.</strong> At threshold 0.8, when the model raises a red flag it is correct over 94% of the time.
              </div>
            </div>
          </div>

          <div className={`nhs-chapter-expanded${ch5.visible ? ' is-open' : ''}`}>
            <div className="nhs-chapter-expanded__inner">
              <div className="nhs-deep-dive-label">Interface Design &amp; Recommended Next Steps</div>
              <div className="nhs-detail-split">
                <div>
                  <div className="nhs-detail-heading">Four interface components</div>
                  <p className="nhs-detail-body"><strong>1. Decision Indicator</strong> — Red or Green colour bar based on predicted probability ≥ 80%.</p>
                  <p className="nhs-detail-body" style={{ marginTop: '0.5rem' }}><strong>2. Patient Risk Profile</strong> — Pain, Function, Activity subscales visualised.</p>
                  <p className="nhs-detail-body" style={{ marginTop: '0.5rem' }}><strong>3. The "Why?" explanation</strong> — Top 3 most influential factors (risk-increasing and decreasing).</p>
                  <p className="nhs-detail-body" style={{ marginTop: '0.5rem' }}><strong>4. Shared Decision Support</strong> — Actionable text suggesting the next clinical step.</p>
                </div>
                <div>
                  <div className="nhs-detail-heading">Next steps for clinical adoption</div>
                  <ul className="nhs-next-steps">
                    <li><span className="nhs-next-steps__num">1</span><span><strong>Clinical validation pilot</strong> in several NHS hospitals to measure real-world performance and usability.</span></li>
                    <li><span className="nhs-next-steps__num">2</span><span><strong>Grey Zone calibration</strong> — better define the boundary for intermediate-probability patients.</span></li>
                    <li><span className="nhs-next-steps__num">3</span><span><strong>EHR integration</strong> — embed the predictor into Electronic Health Record systems.</span></li>
                    <li><span className="nhs-next-steps__num">4</span><span><strong>Expansion to hip replacement</strong> using Oxford Hip Score data in the PROMs programme.</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────── */}
      <section ref={about.ref} className={`nhs-story-section${about.visible ? ' is-visible' : ''}`} style={{ background: 'var(--nhs-white)' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="nhs-reveal"><div className="nhs-chapter-marker">About this Project</div></div>
          <div className="nhs-reveal" style={{ transitionDelay: '100ms' }}>
            <h2 className="nhs-story-heading" style={{ marginBottom: '0.75rem' }}>The Commodores</h2>
            <p className="nhs-story-body" style={{ maxWidth: '600px', marginBottom: '2.5rem' }}>
              EAISI Academy programme (Eindhoven AI Systems Institute), in collaboration with NHS England.
              Supervised machine learning applied to three years of NHS PROMs data to build an interpretable,
              precision-focused prediction tool for knee replacement outcomes.
            </p>
            <div className="nhs-team-cards">
              {[
                { name: 'Bart Appels',   img: '/bart.jpeg' },
                { name: 'Yvonne Kuijt',  img: '/yvonne.jpeg' },
                { name: 'Audrius Saras', img: '/audrius.jpeg' },
                { name: 'Jos Schaffers', img: '/jos.jpeg' },
              ].map(({ name, img }) => (
                <div key={name} className="nhs-team-card">
                  <div className="nhs-team-card__photo">
                    {img
                      ? <img src={img} alt={name} />
                      : <div className="nhs-team-card__placeholder">
                          <svg width="48" height="56" viewBox="0 0 48 56" fill="none">
                            <circle cx="24" cy="16" r="13" fill="var(--nhs-light-grey)" />
                            <path d="M4 54 C4 38 12 30 24 30 C36 30 44 38 44 54 Z" fill="var(--nhs-light-grey)" />
                          </svg>
                        </div>
                    }
                  </div>
                  <div className="nhs-team-card__name">{name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
