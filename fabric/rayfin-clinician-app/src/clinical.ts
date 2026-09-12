import type { PatientRow } from '@/services/patients';

/**
 * The clinical vocabulary of this app, in one place.
 *
 * Everything here is a real, named instrument or a real coding from the NHS
 * PROMs extract. The Oxford Knee Score, its three subscales, the EQ-5D-3L
 * descriptive system and the 7-point minimal clinically important difference are
 * not this project's inventions and are not renamed — only the *branding* around
 * them is fictional. Where wording is quoted from an instrument it is quoted
 * accurately, because a paraphrased EQ-5D level is a different question.
 */

// ---------------------------------------------------------------------------
// Risk bands
// ---------------------------------------------------------------------------

export type RiskBandKey = 'low' | 'moderate' | 'high' | 'very_high';

export interface RiskBand {
  key: RiskBandKey;
  label: string;
  /** Inclusive lower bound of the band as a probability. */
  from: number;
  /** Exclusive upper bound. The top band runs to 1. */
  to: number;
  /**
   * Four filled blocks out of four. This is the channel that survives a
   * greyscale printout and every form of colour-vision deficiency — the colour
   * is the second encoding, never the only one.
   */
  glyph: string;
  /** 1-4, used for `aria-valuenow` and for sorting. */
  level: 1 | 2 | 3 | 4;
}

/**
 * The bands are a **clinical policy decision**, not model output — set in
 * `50_batch_score` and deliberately kept visible in the UI so nobody mistakes
 * them for something the model discovered.
 */
export const RISK_BANDS: readonly RiskBand[] = [
  { key: 'low', label: 'Low', from: 0, to: 0.2, glyph: '▮▯▯▯', level: 1 },
  { key: 'moderate', label: 'Moderate', from: 0.2, to: 0.4, glyph: '▮▮▯▯', level: 2 },
  { key: 'high', label: 'High', from: 0.4, to: 0.6, glyph: '▮▮▮▯', level: 3 },
  { key: 'very_high', label: 'Very high', from: 0.6, to: 1, glyph: '▮▮▮▮', level: 4 },
];

export function bandFor(key: string): RiskBand | undefined {
  return RISK_BANDS.find((b) => b.key === key);
}

/**
 * Distance to the nearer edge of the patient's band, in percentage points.
 *
 * A band hides how close a patient sits to its edge, and a patient at 39.4% and
 * one at 20.1% are both "moderate" while being clinically quite different
 * conversations. The patient page states this distance in words.
 */
export function distanceToBandEdge(
  probability: number,
  band: RiskBand
): { points: number; edge: 'lower' | 'upper' } {
  const toLower = probability - band.from;
  const toUpper = band.to - probability;
  return toLower <= toUpper
    ? { points: toLower * 100, edge: 'lower' }
    : { points: toUpper * 100, edge: 'upper' };
}

// ---------------------------------------------------------------------------
// Oxford Knee Score
// ---------------------------------------------------------------------------

/** The MCID for the Oxford Knee Score. Below this, surgery did not deliver a change the patient notices. */
export const OKS_MCID = 7;

export interface OksPart {
  key: 'oksT0Score' | 'oksPainSubscale' | 'oksFunctionSubscale' | 'oksAdlSubscale';
  label: string;
  max: number;
  /** The metric name in `CohortStat`, so a subscale can be drawn against the cohort. */
  metric: string;
  items: string;
}

export const OKS_PARTS: readonly OksPart[] = [
  {
    key: 'oksT0Score',
    label: 'Total',
    max: 48,
    metric: 'oks_t0_score',
    items: 'all twelve items',
  },
  {
    key: 'oksPainSubscale',
    label: 'Pain',
    max: 8,
    metric: 'oks_pain_subscale',
    items: 'pain, night pain',
  },
  {
    key: 'oksFunctionSubscale',
    label: 'Function',
    max: 24,
    metric: 'oks_function_subscale',
    items: 'washing, stairs, walking, standing, limping, kneeling',
  },
  {
    key: 'oksAdlSubscale',
    label: 'Daily activities',
    max: 16,
    metric: 'oks_adl_subscale',
    items: 'work, confidence, shopping, transport',
  },
];

// ---------------------------------------------------------------------------
// Comorbidities
// ---------------------------------------------------------------------------

export type ComorbidityKey =
  | 'heartDisease'
  | 'highBp'
  | 'stroke'
  | 'circulation'
  | 'lungDisease'
  | 'diabetes'
  | 'kidneyDisease'
  | 'nervousSystem'
  | 'liverDisease'
  | 'cancer'
  | 'depression'
  | 'arthritis';

/** The twelve long-term conditions NHS PROMs asks about, in questionnaire order. */
export const COMORBIDITIES: readonly { key: ComorbidityKey; label: string }[] = [
  { key: 'heartDisease', label: 'Heart disease' },
  { key: 'highBp', label: 'High blood pressure' },
  { key: 'stroke', label: 'Stroke' },
  { key: 'circulation', label: 'Circulation problems' },
  { key: 'lungDisease', label: 'Lung disease' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'kidneyDisease', label: 'Kidney disease' },
  { key: 'nervousSystem', label: 'Nervous system disease' },
  { key: 'liverDisease', label: 'Liver disease' },
  { key: 'cancer', label: 'Cancer' },
  { key: 'depression', label: 'Depression' },
  { key: 'arthritis', label: 'Arthritis' },
];

// ---------------------------------------------------------------------------
// EQ-5D-3L
// ---------------------------------------------------------------------------

export type Eq5dKey =
  | 'eq5dMobility'
  | 'eq5dSelfCare'
  | 'eq5dActivity'
  | 'eq5dDiscomfort'
  | 'eq5dAnxiety';

/**
 * The EQ-5D-3L descriptive system. Level 3 is worded differently in every
 * dimension — "confined to bed" is not "extreme problems" — so the wording is
 * carried per dimension rather than shared, which is how the instrument works.
 */
export const EQ5D_DIMENSIONS: readonly {
  key: Eq5dKey;
  label: string;
  levels: readonly [string, string, string];
}[] = [
  {
    key: 'eq5dMobility',
    label: 'Mobility',
    levels: [
      'No problems walking about',
      'Some problems walking about',
      'Confined to bed',
    ],
  },
  {
    key: 'eq5dSelfCare',
    label: 'Self-care',
    levels: [
      'No problems with self-care',
      'Some problems washing or dressing',
      'Unable to wash or dress',
    ],
  },
  {
    key: 'eq5dActivity',
    label: 'Usual activities',
    levels: [
      'No problems with usual activities',
      'Some problems with usual activities',
      'Unable to perform usual activities',
    ],
  },
  {
    key: 'eq5dDiscomfort',
    label: 'Pain or discomfort',
    levels: ['No pain or discomfort', 'Moderate pain or discomfort', 'Extreme pain or discomfort'],
  },
  {
    key: 'eq5dAnxiety',
    label: 'Anxiety or depression',
    levels: [
      'Not anxious or depressed',
      'Moderately anxious or depressed',
      'Extremely anxious or depressed',
    ],
  },
];

// ---------------------------------------------------------------------------
// Pre-operative context codings
// ---------------------------------------------------------------------------

export const SYMPTOM_PERIOD: Readonly<Record<number, string>> = {
  1: 'Less than 1 year',
  2: '1 to 5 years',
  3: '6 to 10 years',
  4: 'More than 10 years',
};

/**
 * Code 3 (long-term care) was merged into 4 in `30_gold_features` — 84 episodes,
 * too thin to model alone — so the label for 4 has to cover both, and says so.
 */
export const LIVING_ARRANGEMENTS: Readonly<Record<number, string>> = {
  1: 'Lives alone',
  2: 'Lives with partner, family or friends',
  4: 'Care setting or other arrangement',
};

export const PROVIDER_TYPE: Readonly<Record<string, string>> = {
  nhs_trust: 'NHS trust',
  university_hospital: 'Teaching hospital',
  independent_sector: 'Independent sector',
};

export const SEX_LABEL: Readonly<Record<string, string>> = {
  male: 'Male',
  female: 'Female',
  not_recorded: 'Not recorded',
};

/**
 * `not_recorded` needs its own sentence wherever it appears. NHS PROMs suppresses
 * age band and sex together for cells of 1-5 records; the value was withheld to
 * protect confidentiality, not skipped by the patient and not lost by us.
 */
export const NOT_RECORDED_EXPLANATION =
  'Withheld by NHS PROMs disclosure control for small-cell confidentiality — not missing data, and never imputed.';

// ---------------------------------------------------------------------------
// Translating the model's units into clinical English
// ---------------------------------------------------------------------------

/**
 * A log-odds contribution, said out loud.
 *
 * The EBM's terms are additive in log-odds, and a bare "+0.42" on a clinical
 * screen is a number nobody can act on and everybody will nod at. Exponentiating
 * gives the odds multiplier, which is a thing a clinician already reasons in.
 */
export function contributionInWords(contribution: number): string {
  const factor = Math.exp(Math.abs(contribution));
  const rounded = factor >= 10 ? factor.toFixed(0) : factor.toFixed(1);
  if (Math.abs(contribution) < 0.01) return 'barely moves the odds';
  return contribution > 0
    ? `multiplies the odds of a poor outcome by about ${rounded}`
    : `divides the odds of a poor outcome by about ${rounded}`;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatPercent(p: number, dp = 0): string {
  return `${(p * 100).toFixed(dp)}%`;
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Days until surgery, phrased as a clinician would say it. Negative values are
 * kept and labelled rather than clamped: a scheduled date in the past is a data
 * problem the clinician should see, not one the UI should hide.
 */
export function timeToSurgery(date: Date | string, now = new Date()): string {
  const target = new Date(date);
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} weeks`;
}

/** How many of the twelve conditions were actually answered, for an honest denominator. */
export function comorbidityCoverage(patient: PatientRow): {
  present: ComorbidityKey[];
  absent: ComorbidityKey[];
  unrecorded: ComorbidityKey[];
} {
  const present: ComorbidityKey[] = [];
  const absent: ComorbidityKey[] = [];
  const unrecorded: ComorbidityKey[] = [];
  for (const { key } of COMORBIDITIES) {
    const value = patient[key];
    if (value === true) present.push(key);
    else if (value === false) absent.push(key);
    else unrecorded.push(key);
  }
  return { present, absent, unrecorded };
}
