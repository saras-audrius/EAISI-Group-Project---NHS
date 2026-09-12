import { RISK_BANDS } from '@/clinical';

import type {
  CohortStatRow,
  DecisionRow,
  ExplanationRow,
  ModelCardRow,
  ModelCurveRow,
  PatientRow,
  ThresholdOptionRow,
} from './types';

/**
 * The offline demonstration cohort.
 *
 * **Every patient in here is synthetic.** Nobody in this file was ever a
 * patient, and the app says so on every screen that renders one — the
 * `datasetIsSynthetic` flag on the model card drives a persistent banner rather
 * than a footnote.
 *
 * ## Why it is generated rather than typed out
 *
 * A hand-written fixture drifts: the risk says 41%, the six explanation bars say
 * something else, and the cohort histogram behind them was made up separately.
 * That is a demo that teaches the wrong thing, because the app's central claim
 * is that the explanation *is* the arithmetic of the score.
 *
 * So this file carries a small additive model with the same structure as an
 * Explainable Boosting Machine — one shape function per feature, summed in
 * log-odds — and derives everything from it:
 *
 * * a patient's risk is `sigmoid(intercept + Σ f_j(x_j))`,
 * * their explanation rows are the six largest of those same `f_j(x_j)` terms,
 *   so the bars are the model's arithmetic rather than a picture of it — and the
 *   whole set of terms really does sum, with the intercept, back to the score
 *   (asserted in `fixtures.test.ts`),
 * * the shape-function curves are those same `f_j`, plotted,
 * * the cohort histograms are the actual distribution of the generated cohort,
 * * the calibration curve and the threshold sweep are computed from sampled
 *   outcomes over that cohort, so the counts are real counts of real (synthetic)
 *   rows rather than plausible-looking numbers.
 *
 * The generator is seeded, so the demo is identical on every machine and every
 * rehearsal.
 */

// ---------------------------------------------------------------------------
// Deterministic PRNG
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, and stable across engines, which is the whole requirement. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260831);

const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)];
const chance = (p: number): boolean => rng() < p;

/** Sum of `n` Bernoulli draws — a bounded, roughly bell-shaped integer on [0, n]. */
const binomial = (n: number, p: number): number => {
  let k = 0;
  for (let i = 0; i < n; i += 1) if (rng() < p) k += 1;
  return k;
};

const weighted = (weights: readonly number[]): number => {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
};

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

// ---------------------------------------------------------------------------
// The synthetic additive model
// ---------------------------------------------------------------------------

interface Term {
  feature: string;
  label: string;
  /** Domain to plot the shape function over, and the axis unit for it. */
  domain: number[];
  unit: string;
  f: (x: number) => number;
  /** Reads the feature value off a generated patient. */
  read: (p: PatientRow) => number | undefined;
}

/**
 * Eight terms, in log-odds. Feature names match the `FEATURE_LABELS` map in
 * `50_batch_score` so that a label rendered offline is the label rendered live.
 *
 * Each function is centred on the cohort mean, which is what makes a
 * contribution readable as "this patient versus an average patient" rather than
 * as an absolute quantity with no reference class.
 */
const TERMS: readonly Term[] = [
  {
    feature: 'oks_t0_score',
    label: 'Overall pre-op Oxford Knee Score',
    domain: Array.from({ length: 49 }, (_, i) => i),
    unit: 'points (0-48, lower is worse)',
    f: (x) => (18 - x) * 0.062,
    read: (p) => p.oksT0Score,
  },
  {
    feature: 'comorbidity_count',
    label: 'Number of long-term conditions',
    domain: Array.from({ length: 13 }, (_, i) => i),
    unit: 'conditions (0-12)',
    f: (x) => (x - 2.2) * 0.17,
    read: (p) => p.comorbidityCount,
  },
  {
    feature: 't0_symptom_period',
    label: 'How long symptoms have lasted',
    domain: [1, 2, 3, 4],
    unit: '1 = under 1 year … 4 = over 10 years',
    f: (x) => [-0.26, -0.06, 0.16, 0.38][Math.round(x) - 1] ?? 0,
    read: (p) => p.symptomPeriod,
  },
  {
    feature: 't0_anxiety',
    label: 'Anxiety / depression (EQ-5D)',
    domain: [1, 2, 3],
    unit: 'EQ-5D-3L level (1-3)',
    f: (x) => [-0.19, 0.11, 0.47][Math.round(x) - 1] ?? 0,
    read: (p) => p.eq5dAnxiety,
  },
  {
    feature: 'oks_pain_subscale',
    label: 'Pre-op pain severity',
    domain: Array.from({ length: 9 }, (_, i) => i),
    unit: 'points (0-8, lower is worse)',
    f: (x) => (3.2 - x) * 0.095,
    read: (p) => p.oksPainSubscale,
  },
  {
    feature: 't0_mobility',
    label: 'Mobility (EQ-5D)',
    domain: [1, 2, 3],
    unit: 'EQ-5D-3L level (1-3)',
    f: (x) => [-0.16, 0.04, 0.4][Math.round(x) - 1] ?? 0,
    read: (p) => p.eq5dMobility,
  },
  {
    feature: 't0_previous_surgery',
    label: 'Previous surgery on this knee',
    domain: [0, 1],
    unit: '0 = no, 1 = yes',
    f: (x) => (x >= 0.5 ? 0.43 : -0.06),
    read: (p) => (p.previousSurgery === undefined ? undefined : p.previousSurgery ? 1 : 0),
  },
  {
    feature: 'independent_hospital',
    label: 'Treated at an independent-sector provider',
    domain: [0, 1],
    unit: '0 = no, 1 = yes',
    f: (x) => (x >= 0.5 ? -0.23 : 0.05),
    read: (p) => (p.providerType === 'independent_sector' ? 1 : 0),
  },
];

/** Chosen so the cohort's mean risk lands near the ~30% poor-outcome rate gold reports. */
export const FIXTURE_INTERCEPT = -0.86;

function contributions(patient: PatientRow): { term: Term; value: number; contribution: number }[] {
  const out: { term: Term; value: number; contribution: number }[] = [];
  for (const term of TERMS) {
    const value = term.read(patient);
    // A feature the questionnaire did not capture contributes nothing, and its
    // absence is visible in the UI rather than silently scored as zero risk.
    if (value === undefined) continue;
    out.push({ term, value, contribution: term.f(value) });
  }
  return out;
}

function scoreOf(patient: PatientRow): number {
  const total = contributions(patient).reduce((sum, c) => sum + c.contribution, FIXTURE_INTERCEPT);
  return sigmoid(total);
}

function bandOf(p: number): string {
  return RISK_BANDS.find((b) => p >= b.from && p < b.to)?.key ?? 'very_high';
}

// ---------------------------------------------------------------------------
// Cohort generation
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Margaret', 'Alan', 'Priya', 'David', 'Joan', 'Winston', 'Eileen', 'Raymond',
  'Doreen', 'Colin', 'Sylvia', 'Nigel', 'Beryl', 'Patrick', 'Maureen', 'Trevor',
  'Gladys', 'Dennis', 'Hazel', 'Roy', 'Ivy', 'Clifford', 'Rosemary', 'Malcolm',
];
const LAST_NAMES = [
  'Hughes', 'Okafor', 'Sharma', 'Whitfield', 'Bennett', 'Clarke', 'Osei',
  'Fletcher', 'Nowak', 'Bailey', 'Ahmed', 'Sutcliffe', 'Reid', 'Kaur',
];

const AGE_BANDS = ['40 to 59', '60 to 69', '70 to 79', '80 to 120'];
const REGIONS = ['North West', 'London', 'South East', 'Yorkshire and the Humber'];

const PROVIDERS: readonly {
  code: string;
  type: NonNullable<PatientRow['providerType']>;
  region: string;
}[] = [
  { code: 'MFC01', type: 'nhs_trust', region: 'North West' },
  { code: 'MFC04', type: 'university_hospital', region: 'London' },
  { code: 'MFC09', type: 'independent_sector', region: 'South East' },
];

/** Per-condition prevalence, in the questionnaire order of `COMORBIDITIES`. */
const COMORBIDITY_P = [0.12, 0.38, 0.04, 0.09, 0.11, 0.15, 0.05, 0.06, 0.02, 0.06, 0.14, 0.62];

const COMORBIDITY_KEYS = [
  'heartDisease', 'highBp', 'stroke', 'circulation', 'lungDisease', 'diabetes',
  'kidneyDisease', 'nervousSystem', 'liverDisease', 'cancer', 'depression', 'arthritis',
] as const;

const MODEL_NAME = 'knee-poor-outcome-ebm';
const MODEL_VERSION = '4';

/** Fixed reference date so a screenshot taken today matches one taken next month. */
const TODAY = new Date('2026-08-31T00:00:00Z');

function makePatient(index: number): PatientRow {
  const provider = PROVIDERS[index % PROVIDERS.length];

  // NHS PROMs suppresses age band and sex together for cells of 1-5 records.
  // Roughly one in twelve rows, so the UI's "not recorded" path is exercised.
  const suppressed = chance(0.08);

  const pain = binomial(8, 0.31);
  const fn = binomial(24, 0.36);
  const adl = binomial(16, 0.4);

  const comorbidFlags = COMORBIDITY_P.map((p) => chance(p));
  // One row in twenty has no comorbidity section at all — an unreturned page,
  // which is a different fact from "no conditions" and must render differently.
  const comorbidityMissing = chance(0.05);
  // And one row in twenty-five is missing its EQ-5D page.
  const eq5dMissing = chance(0.04);

  const patient: PatientRow = {
    id: `fx-${index.toString().padStart(5, '0')}`,
    episodeId: `MFC-2026-${(100000 + index * 7).toString()}`,
    displayName: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index * 5) % LAST_NAMES.length]}`,
    providerCode: provider.code,
    providerType: provider.type,
    region: chance(0.85) ? provider.region : pick(REGIONS),
    ageBand: suppressed ? 'not_recorded' : pick(AGE_BANDS),
    sex: suppressed ? 'not_recorded' : chance(0.57) ? 'female' : 'male',

    oksT0Score: pain + fn + adl,
    oksPainSubscale: pain,
    oksFunctionSubscale: fn,
    oksAdlSubscale: adl,

    comorbidityCount: comorbidityMissing ? 0 : comorbidFlags.filter(Boolean).length,

    eq5dMobility: eq5dMissing ? undefined : weighted([0.18, 0.62, 0.2]) + 1,
    eq5dSelfCare: eq5dMissing ? undefined : weighted([0.42, 0.48, 0.1]) + 1,
    eq5dActivity: eq5dMissing ? undefined : weighted([0.16, 0.6, 0.24]) + 1,
    eq5dDiscomfort: eq5dMissing ? undefined : weighted([0.04, 0.61, 0.35]) + 1,
    eq5dAnxiety: eq5dMissing ? undefined : weighted([0.5, 0.4, 0.1]) + 1,

    symptomPeriod: weighted([0.16, 0.45, 0.24, 0.15]) + 1,
    previousSurgery: chance(0.16),
    disability: chance(0.23),
    assistedCompletion: chance(0.11),
    livingArrangements: [1, 2, 2, 2, 4][weighted([0.26, 0.3, 0.2, 0.18, 0.06])],

    riskPoorOutcome: 0,
    riskBand: 'low',
    surgeryScheduledDate: new Date(TODAY.getTime() + ((index * 3) % 70 + 5) * 86_400_000),
    modelVersion: MODEL_VERSION,
    modelName: MODEL_NAME,
  };

  for (let i = 0; i < COMORBIDITY_KEYS.length; i += 1) {
    patient[COMORBIDITY_KEYS[i]] = comorbidityMissing ? undefined : comorbidFlags[i];
  }

  patient.riskPoorOutcome = scoreOf(patient);
  patient.riskBand = bandOf(patient.riskPoorOutcome);
  return patient;
}

const COHORT_SIZE = 4200;
/** The clinician's own list. The rest of the cohort exists only as denominators. */
const VISIBLE_PATIENTS = 26;

const allPatients: PatientRow[] = Array.from({ length: COHORT_SIZE }, (_, i) => makePatient(i));

export const fixturePatients: PatientRow[] = allPatients
  .slice(0, VISIBLE_PATIENTS)
  .sort((a, b) => b.riskPoorOutcome - a.riskPoorOutcome);

// ---------------------------------------------------------------------------
// Explanations — the same terms, ranked
// ---------------------------------------------------------------------------

/**
 * Every term for one patient, not just the six shown. Exported so a test can
 * assert the invariant this file's whole design rests on: that the explanation
 * and the score are the same arithmetic.
 */
export function fixtureLogOdds(episodeId: string): { intercept: number; sum: number; risk: number } | null {
  const patient = allPatients.find((p) => p.episodeId === episodeId);
  if (!patient) return null;
  return {
    intercept: FIXTURE_INTERCEPT,
    sum: contributions(patient).reduce((a, c) => a + c.contribution, 0),
    risk: patient.riskPoorOutcome,
  };
}

export function fixtureExplanation(episodeId: string): ExplanationRow[] {
  const patient = allPatients.find((p) => p.episodeId === episodeId);
  if (!patient) return [];
  return contributions(patient)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 6)
    .map((c, i) => ({
      rank: i + 1,
      feature: c.term.feature,
      featureLabel: c.term.label,
      featureValue: c.value,
      contribution: c.contribution,
      direction: c.contribution > 0 ? 'increases_risk' : 'reduces_risk',
    }));
}

// ---------------------------------------------------------------------------
// Sampled outcomes — the basis for calibration and the threshold sweep
// ---------------------------------------------------------------------------

/**
 * A held-out outcome for each cohort member, drawn from their own predicted
 * probability with a mild miscalibration (`p^1.04`) so the calibration curve has
 * something to show. A curve that sits exactly on the diagonal proves nothing
 * except that it was drawn from the same numbers it is checking.
 */
const outcomes: number[] = allPatients.map((p) => (rng() < Math.pow(p.riskPoorOutcome, 1.04) ? 1 : 0));

const PREVALENCE = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;

// ---------------------------------------------------------------------------
// Cohort distributions
// ---------------------------------------------------------------------------

/** Bins with 1-4 patients are written as 0, mirroring the small-cell suppression in notebook 60. */
const SUPPRESSION_FLOOR = 5;

function histogram(
  metric: string,
  unit: string,
  values: number[],
  start: number,
  end: number,
  binWidth: number
): CohortStatRow[] {
  const bins = Math.ceil((end - start) / binWidth);
  const counts = new Array<number>(bins).fill(0);
  for (const v of values) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((v - start) / binWidth)));
    counts[i] += 1;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return counts.map((n, i) => ({
    metric,
    binIndex: i,
    binStart: start + i * binWidth,
    binEnd: start + (i + 1) * binWidth,
    n: n < SUPPRESSION_FLOOR ? 0 : n,
    cohortSize: values.length,
    cohortMedian: median,
    unit,
  }));
}

export const fixtureCohortStats: CohortStatRow[] = [
  ...histogram('risk_poor_outcome', '% probability of a poor outcome',
    allPatients.map((p) => p.riskPoorOutcome * 100), 0, 100, 5),
  ...histogram('oks_t0_score', 'points (0-48)',
    allPatients.map((p) => p.oksT0Score), 0, 48, 4),
  ...histogram('oks_pain_subscale', 'points (0-8)',
    allPatients.map((p) => p.oksPainSubscale ?? 0), 0, 9, 1),
  ...histogram('oks_function_subscale', 'points (0-24)',
    allPatients.map((p) => p.oksFunctionSubscale ?? 0), 0, 24, 2),
  ...histogram('oks_adl_subscale', 'points (0-16)',
    allPatients.map((p) => p.oksAdlSubscale ?? 0), 0, 16, 2),
  ...histogram('comorbidity_count', 'conditions (0-12)',
    allPatients.map((p) => p.comorbidityCount), 0, 13, 1),
];

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

/** Wilson score interval — behaves at small n, where a normal approximation does not. */
function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [
    Math.max(0, (centre - spread) / denom),
    Math.min(1, (centre + spread) / denom),
  ];
}

const DECILES = 10;

const calibrationPoints: ModelCurveRow[] = (() => {
  const indexed = allPatients
    .map((p, i) => ({ p: p.riskPoorOutcome, y: outcomes[i] }))
    .sort((a, b) => a.p - b.p);
  const size = Math.floor(indexed.length / DECILES);
  const rows: ModelCurveRow[] = [];
  for (let d = 0; d < DECILES; d += 1) {
    const slice = indexed.slice(d * size, d === DECILES - 1 ? indexed.length : (d + 1) * size);
    const meanPred = slice.reduce((a, b) => a + b.p, 0) / slice.length;
    const hits = slice.reduce((a, b) => a + b.y, 0);
    const [lo, hi] = wilson(hits, slice.length);
    rows.push({
      curveType: 'calibration',
      series: '',
      seriesLabel: 'Calibrated EBM',
      pointIndex: d,
      x: meanPred,
      y: hits / slice.length,
      yLower: lo,
      yUpper: hi,
      n: slice.length,
      xUnit: 'predicted probability',
    });
  }
  return rows;
})();

const CALIBRATION_ERROR =
  calibrationPoints.reduce((a, r) => a + Math.abs(r.x - r.y), 0) / calibrationPoints.length;

// ---------------------------------------------------------------------------
// Shape functions
// ---------------------------------------------------------------------------

const shapePoints: ModelCurveRow[] = TERMS.flatMap((term) => {
  // Uncertainty widens where the cohort has few patients at that value, which is
  // the honest shape for it: the model knows least where it has seen least.
  const counts = new Map<number, number>();
  for (const p of allPatients) {
    const v = term.read(p);
    if (v !== undefined) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return term.domain.map((x, i) => {
    const n = counts.get(x) ?? 0;
    const se = n > 0 ? Math.min(0.5, 3 / Math.sqrt(n)) : 0.5;
    return {
      curveType: 'shape',
      series: term.feature,
      seriesLabel: term.label,
      pointIndex: i,
      x,
      y: term.f(x),
      yLower: term.f(x) - se,
      yUpper: term.f(x) + se,
      n,
      xUnit: term.unit,
    };
  });
});

export const fixtureModelCurves: ModelCurveRow[] = [...calibrationPoints, ...shapePoints];

// ---------------------------------------------------------------------------
// Threshold sweep
// ---------------------------------------------------------------------------

const sweep = (() => {
  const per = 1000 / allPatients.length;
  const rows: Omit<ThresholdOptionRow, 'isChosen' | 'rationale'>[] = [];
  for (let t = 0.05; t <= 0.8001; t += 0.05) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    allPatients.forEach((p, i) => {
      const flagged = p.riskPoorOutcome >= t;
      if (flagged && outcomes[i] === 1) tp += 1;
      else if (flagged) fp += 1;
      else if (outcomes[i] === 1) fn += 1;
    });
    // The three counts are rounded once and then added, rather than rounded
    // independently: the chart's caption says "N flags, X correct and Y
    // unnecessary", and those have to be arithmetic a reader can check.
    const correct = Math.round(tp * per);
    const alarms = Math.round(fp * per);
    rows.push({
      threshold: Number(t.toFixed(2)),
      flaggedPer1000: correct + alarms,
      correctlyFlaggedPer1000: correct,
      falseAlarmsPer1000: alarms,
      missedPer1000: Math.round(fn * per),
      precision: tp + fp > 0 ? tp / (tp + fp) : 0,
      recall: tp + fn > 0 ? tp / (tp + fn) : 0,
    });
  }
  return rows;
})();

/**
 * Notebook 42's fallback ladder: aim for 80% precision, and if the data will not
 * support it, drop a rung and say so rather than quietly shipping a target
 * nobody can hit.
 */
const chosen =
  [0.8, 0.7, 0.6, 0.5].map((target) => sweep.filter((r) => r.precision >= target).sort((a, b) => b.recall - a.recall)[0]).find(Boolean) ??
  sweep[sweep.length - 1];

const CHOSEN_TARGET = [0.8, 0.7, 0.6, 0.5].find((t) => chosen.precision >= t) ?? 0;

export const fixtureThresholdOptions: ThresholdOptionRow[] = sweep.map((r) => ({
  ...r,
  isChosen: r.threshold === chosen.threshold,
  rationale:
    r.threshold === chosen.threshold
      ? `Highest recall achievable while holding precision at ${Math.round(CHOSEN_TARGET * 100)}%. A pre-operative optimisation pathway loses clinical credibility when a large share of its flags are wrong. This is a service decision, not a modelling one.`
      : undefined,
}));

// ---------------------------------------------------------------------------
// Model card
// ---------------------------------------------------------------------------

/** Average precision — the area under the precision-recall curve, computed the long way. */
const AVERAGE_PRECISION = (() => {
  const ranked = allPatients
    .map((p, i) => ({ p: p.riskPoorOutcome, y: outcomes[i] }))
    .sort((a, b) => b.p - a.p);
  const positives = ranked.reduce((a, b) => a + b.y, 0);
  let tp = 0;
  let sum = 0;
  ranked.forEach((r, i) => {
    if (r.y === 1) {
      tp += 1;
      sum += tp / (i + 1);
    }
  });
  return positives > 0 ? sum / positives : 0;
})();

export const fixtureModelCard: ModelCardRow = {
  modelName: MODEL_NAME,
  modelVersion: MODEL_VERSION,
  modelType: 'Explainable Boosting Machine, isotonic-calibrated',
  outcomeDefinition:
    'Poor outcome = an Oxford Knee Score gain of 7 points or fewer at six months, i.e. at or below the minimal clinically important difference.',
  testSetSize: COHORT_SIZE,
  prevalence: PREVALENCE,
  averagePrecision: AVERAGE_PRECISION,
  calibrationError: CALIBRATION_ERROR,
  operatingThreshold: chosen.threshold,
  dataSource:
    'Synthetic cohort generated locally by src/services/fixtures.ts for offline demonstration. The deployed app reads gold.patient_risk in Fabric, derived from the NHS PROMs knee replacement extract.',
  datasetIsSynthetic: true,
  limitations:
    'Offline demonstration data. The generator is an additive model of eight features and is far simpler than the trained EBM; it reproduces the app\'s arithmetic faithfully but not the real cohort\'s epidemiology. No conclusion about knee replacement outcomes should be drawn from this screen.',
  scoredAt: TODAY,
};

// ---------------------------------------------------------------------------
// Prior decisions
// ---------------------------------------------------------------------------

/**
 * Two decisions already on the highest-risk patient, so the oversight log has
 * something in it before the clinician adds a third — including one override,
 * because a log that only ever shows agreement teaches the wrong lesson about
 * what this screen is for.
 */
export const fixtureDecisions: DecisionRow[] = [
  {
    id: 'dec-0001',
    episodeId: fixturePatients[0].episodeId,
    clinicianName: 'Ms E. Adeyemi (consultant)',
    decision: 'optimise_first',
    rationale:
      'Agree with the score. Anxiety and long symptom duration are both modifiable-adjacent; referred to pre-habilitation and to the practice for review of low mood before listing.',
    modelAgreement: 'agreed',
    riskShown: fixturePatients[0].riskPoorOutcome.toFixed(4),
    modelVersion: MODEL_VERSION,
    decidedAt: new Date(TODAY.getTime() - 9 * 86_400_000),
  },
  {
    id: 'dec-0002',
    episodeId: fixturePatients[0].episodeId,
    clinicianName: 'Mr D. Whitlock (registrar)',
    decision: 'proceed',
    rationale:
      'Override. The model weights previous surgery heavily; that entry is an arthroscopy in 2011, not a failed arthroplasty, and does not carry the same prognosis. Radiographs show end-stage disease and she is clear about her goals. Proceeding, documented with the patient.',
    modelAgreement: 'overridden',
    riskShown: fixturePatients[0].riskPoorOutcome.toFixed(4),
    modelVersion: MODEL_VERSION,
    decidedAt: new Date(TODAY.getTime() - 2 * 86_400_000),
  },
];

/** A demo identity for the offline auth service. Obviously not a real person. */
export const fixtureUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo.clinician@marrowfield.example',
  name: 'Dr Sam Okonjo (demo)',
};
