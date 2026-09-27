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
 *
 * **1 and 2 were the wrong way round here until 2026-09-13.** The NHS PROMs Data
 * Dictionary v3.4 defines `Q1 Living Arrangements` as `1 = I live with
 * partner/spouse/family/friends` and `2 = I live alone`, and nothing in silver or
 * gold reverses them — `30_gold_features` only folds 3 into 4. The app was
 * therefore telling a clinician that a patient living with their family lived
 * alone, and the reverse, on the panel whose stated purpose is deciding whether
 * "optimise before surgery" is realistic. Discharge planning and the feasibility
 * of a pre-habilitation programme both turn on it.
 */
export const LIVING_ARRANGEMENTS: Readonly<Record<number, string>> = {
  1: 'Lives with partner, family or friends',
  2: 'Lives alone',
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

// ---------------------------------------------------------------------------
// Translating a raw feature value into what the patient actually answered
// ---------------------------------------------------------------------------

/**
 * What a model feature's value *means*, in the questionnaire's own words.
 *
 * The explanation chart previously rendered the model's raw input: "Pre-op OKS:
 * washing — 0". That number is unreadable and, worse, invites the wrong reading.
 * On the Oxford Knee Score **0 is the worst possible answer**, not an absence —
 * "washing = 0" is a patient who cannot wash and dry themselves at all. A
 * clinician scanning the screen has every reason to read a zero as "nothing to
 * see here", and the whole value of a glassbox model is that they can check its
 * inputs against the patient in front of them.
 *
 * Every scale below is transcribed from the **NHS PROMs Data Dictionary v3.4**
 * (`references/nhs/proms_data_dictionary.pdf`), not inferred. Each Oxford Knee
 * Score item has its own wording — "Rarely/Never" for limping is not the same
 * answer as "No trouble at all" for washing — so they are carried per item, the
 * way the instrument is written.
 *
 * Codes reaching the app have already been through `20_silver_clean`, which maps
 * the questionnaire's `2 = No` onto `0` for the yes/no items and decodes the
 * missing-value sentinels. So the booleans here are 1/0, not the raw 1/2.
 */

/** The five answers to an Oxford Knee Score item, worst (0) to best (4). */
type OksItemScale = readonly [string, string, string, string, string];

const OKS_ITEM_SCALES: Readonly<Record<string, { question: string; answers: OksItemScale }>> = {
  pain: {
    question: 'How would you describe the pain you usually had from your knee?',
    answers: ['Severe', 'Moderate', 'Mild', 'Very mild', 'None'],
  },
  night_pain: {
    question: 'Have you been troubled by pain from your knee in bed at night?',
    answers: ['Every night', 'Most nights', 'Some nights', 'Only 1 or 2 nights', 'No nights'],
  },
  washing: {
    question: 'Have you had trouble washing and drying yourself (all over) because of your knee?',
    answers: ['Impossible to do', 'Extreme difficulty', 'Moderate trouble', 'Very little trouble', 'No trouble at all'],
  },
  transport: {
    question: 'Have you had trouble getting in or out of a car or using public transport because of your knee?',
    answers: ['Impossible to do', 'Extreme difficulty', 'Moderate trouble', 'Very little trouble', 'No trouble at all'],
  },
  walking: {
    question: 'For how long have you been able to walk before pain from your knee becomes severe?',
    answers: ['Not at all — pain severe on walking', 'Around the house only', '5–15 minutes', '16–30 minutes', 'No pain, or more than 30 minutes'],
  },
  standing: {
    question: 'After a meal, how painful has it been to stand up from a chair because of your knee?',
    answers: ['Unbearable', 'Very painful', 'Moderately painful', 'Slightly painful', 'Not at all painful'],
  },
  limping: {
    question: 'Have you been limping when walking, because of your knee?',
    answers: ['All of the time', 'Most of the time', 'Often, not just at first', 'Sometimes or just at first', 'Rarely or never'],
  },
  kneeling: {
    question: 'Could you kneel down and get up again afterwards?',
    answers: ['No, impossible', 'With extreme difficulty', 'With moderate difficulty', 'With little difficulty', 'Yes, easily'],
  },
  work: {
    question: 'How much has pain from your knee interfered with your usual work, including housework?',
    answers: ['Totally', 'Greatly', 'Moderately', 'A little bit', 'Not at all'],
  },
  confidence: {
    question: "Have you felt that your knee might suddenly 'give way' or let you down?",
    answers: ['All of the time', 'Most of the time', 'Often, not just at first', 'Sometimes or just at first', 'Rarely or never'],
  },
  shopping: {
    question: 'Could you do the household shopping on your own?',
    answers: ['No, impossible', 'With extreme difficulty', 'With moderate difficulty', 'With little difficulty', 'Yes, easily'],
  },
  stairs: {
    question: 'Could you walk down one flight of stairs?',
    answers: ['No, impossible', 'With extreme difficulty', 'With moderate difficulty', 'With little difficulty', 'Yes, easily'],
  },
};

/** EQ-5D-3L dimensions, keyed by the model's feature name. */
const EQ5D_BY_FEATURE: Readonly<Record<string, Eq5dKey>> = {
  t0_mobility: 'eq5dMobility',
  t0_self_care: 'eq5dSelfCare',
  t0_activity: 'eq5dActivity',
  t0_discomfort: 'eq5dDiscomfort',
  t0_anxiety: 'eq5dAnxiety',
};

/**
 * Yes/no features. The value is just "Yes" or "No" because the factor's own
 * label always sits immediately before it — "Previous surgery on this knee —
 * Yes — previous surgery on this knee" is how you get a screen nobody reads.
 * The question, where the instrument asks one, carries the context instead.
 */
const YES_NO_FEATURES: Readonly<Record<string, { question?: string }>> = {
  t0_previous_surgery: { question: 'Have you previously had surgery on this knee?' },
  t0_disability: { question: 'Do you have a disability?' },
  t0_assisted: { question: 'Did someone help you complete this questionnaire?' },
  university_hospital: {},
  independent_hospital: {},
  heart_disease: {},
  high_bp: {},
  stroke: {},
  circulation: {},
  lung_disease: {},
  diabetes: {},
  kidney_disease: {},
  nervous_system: {},
  liver_disease: {},
  cancer: {},
  depression: {},
  arthritis: {},
};

/** A totalled score: the value, its maximum, and which end is bad. */
const TOTAL_FEATURES: Readonly<Record<string, { max: number; lowerIsWorse: boolean; noun: string }>> = {
  oks_t0_score: { max: 48, lowerIsWorse: true, noun: 'points' },
  oks_pain_subscale: { max: 8, lowerIsWorse: true, noun: 'points' },
  oks_function_subscale: { max: 24, lowerIsWorse: true, noun: 'points' },
  oks_adl_subscale: { max: 16, lowerIsWorse: true, noun: 'points' },
  comorbidity_count: { max: 12, lowerIsWorse: false, noun: 'conditions' },
};

export interface FeatureValueMeaning {
  /** What the patient answered, in the instrument's own words. */
  text: string;
  /** The raw value and its range, for a clinician who wants to check it. */
  scale?: string;
  /** The question that produced it, where the instrument asks one. */
  question?: string;
  /** True when this is the worst available answer — worth seeing at a glance. */
  isWorst?: boolean;
}

/**
 * Turn `(feature, value)` into something a clinician can check against the
 * patient. Returns `null` when the feature has no known scale, so the caller can
 * fall back to the raw number rather than inventing a meaning for it.
 */
export function describeFeatureValue(
  feature: string,
  value: number | undefined
): FeatureValueMeaning | null {
  if (value === undefined || Number.isNaN(value)) return null;

  // --- Oxford Knee Score items: 0 is the WORST answer, 4 the best ------------
  if (feature.startsWith('oks_t0_') && !(feature in TOTAL_FEATURES)) {
    const item = OKS_ITEM_SCALES[feature.slice('oks_t0_'.length)];
    if (item) {
      const i = Math.round(value);
      if (i >= 0 && i <= 4) {
        return {
          text: item.answers[i],
          scale: 'scored 0 to 4 · 0 is the worst answer, 4 the best',
          question: item.question,
          isWorst: i === 0,
        };
      }
    }
  }

  // --- EQ-5D-3L: 1 no problems, 3 extreme -----------------------------------
  const eqKey = EQ5D_BY_FEATURE[feature];
  if (eqKey) {
    const dim = EQ5D_DIMENSIONS.find((d) => d.key === eqKey);
    const level = Math.round(value);
    if (dim && level >= 1 && level <= 3) {
      return {
        text: dim.levels[level - 1],
        scale: 'levels 1 to 3 · 1 is no problems, 3 is the worst',
        isWorst: level === 3,
      };
    }
  }

  // --- yes / no --------------------------------------------------------------
  const yn = YES_NO_FEATURES[feature];
  if (yn) {
    return { text: value >= 0.5 ? 'Yes' : 'No', scale: '1 is yes, 0 is no', question: yn.question };
  }

  // --- ordered categories ----------------------------------------------------
  if (feature === 't0_symptom_period') {
    const label = SYMPTOM_PERIOD[Math.round(value)];
    if (label) {
      return {
        text: label,
        scale: 'coded 1 to 4 · 1 is under a year, 4 is over ten',
        question: 'How long have you had knee symptoms?',
        isWorst: Math.round(value) === 4,
      };
    }
  }
  if (feature === 't0_living_arrangements' || feature === 'living_arrangements_grouped') {
    const label = LIVING_ARRANGEMENTS[Math.round(value)];
    if (label) return { text: label, scale: 'a category, not a scale', question: 'What are your living arrangements?' };
  }

  // --- totals ----------------------------------------------------------------
  const total = TOTAL_FEATURES[feature];
  if (total) {
    return {
      text: `${value} of ${total.max} ${total.noun}`,
      scale: total.lowerIsWorse ? 'lower is worse' : 'higher means more conditions',
      isWorst: total.lowerIsWorse ? value === 0 : value === total.max,
    };
  }

  // --- one-hot columns: the label already names the category ------------------
  if (/^(region_|age_band_grouped_|sex_|year_|living_arrangements_grouped_)/.test(feature)) {
    return { text: value >= 0.5 ? 'Yes' : 'No', scale: '1 is yes, 0 is no' };
  }

  return null;
}

/** The one-line form used where space is tight, e.g. under a bar in a chart. */
export function featureValueShort(feature: string, value: number | undefined): string {
  const meaning = describeFeatureValue(feature, value);
  if (meaning) return meaning.text;
  if (value === undefined || Number.isNaN(value)) return 'not recorded';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
