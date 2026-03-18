import type { PatientPayload } from './api';

function weightedChoice<T>(options: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function bernoulli(p: number): number {
  return Math.random() < p ? 1 : 0;
}

export const REGIONS = [
  'East Midlands',
  'East of England',
  'London',
  'North East',
  'North West',
  'South East',
  'South West',
  'West Midlands',
  'Yorkshire and The Humber',
];

export function generateSyntheticPatient(): PatientPayload {
  const oks_t0_pain        = weightedChoice([0,1,2,3,4], [5,25,35,25,10]);
  const oks_t0_night_pain  = weightedChoice([0,1,2,3,4], [5,20,35,30,10]);
  const oks_t0_washing     = weightedChoice([0,1,2,3,4], [3,10,25,40,22]);
  const oks_t0_transport   = weightedChoice([0,1,2,3,4], [5,15,30,35,15]);
  const oks_t0_walking     = weightedChoice([0,1,2,3,4], [5,20,35,30,10]);
  const oks_t0_standing    = weightedChoice([0,1,2,3,4], [5,20,35,30,10]);
  const oks_t0_limping     = weightedChoice([0,1,2,3,4], [5,25,35,25,10]);
  const oks_t0_kneeling    = weightedChoice([0,1,2,3,4], [25,30,25,15,5]);
  const oks_t0_work        = weightedChoice([0,1,2,3,4], [10,20,30,25,15]);
  const oks_t0_confidence  = weightedChoice([0,1,2,3,4], [5,15,30,35,15]);
  const oks_t0_shopping    = weightedChoice([0,1,2,3,4], [5,15,30,35,15]);
  const oks_t0_stairs      = weightedChoice([0,1,2,3,4], [10,25,35,25,5]);

  const oks_t0_score = oks_t0_pain + oks_t0_night_pain + oks_t0_washing +
    oks_t0_transport + oks_t0_walking + oks_t0_standing + oks_t0_limping +
    oks_t0_kneeling + oks_t0_work + oks_t0_confidence + oks_t0_shopping + oks_t0_stairs;

  return {
    age_band:               weightedChoice([2,3,4,5], [10,35,40,15]),
    gender:                 weightedChoice([0,1], [55,45]),
    oks_t0_pain,
    oks_t0_night_pain,
    oks_t0_washing,
    oks_t0_transport,
    oks_t0_walking,
    oks_t0_standing,
    oks_t0_limping,
    oks_t0_kneeling,
    oks_t0_work,
    oks_t0_confidence,
    oks_t0_shopping,
    oks_t0_stairs,
    oks_t0_score,
    t0_mobility:            weightedChoice([1,2,3], [15,60,25]),
    t0_self_care:           weightedChoice([1,2,3], [50,40,10]),
    t0_activity:            weightedChoice([1,2,3], [15,55,30]),
    t0_discomfort:          weightedChoice([1,2,3], [5,45,50]),
    t0_anxiety:             weightedChoice([1,2,3], [50,35,15]),
    t0_symptom_period:      weightedChoice([1,2,3,4], [15,45,25,15]),
    t0_living_arrangements: weightedChoice([1,2,4], [25,73,2]),
    t0_assisted:            bernoulli(0.15),
    t0_previous_surgery:    bernoulli(0.10),
    t0_disability:          bernoulli(0.20),
    arthritis:              bernoulli(0.60),
    high_bp:                bernoulli(0.40),
    heart_disease:          bernoulli(0.15),
    diabetes:               bernoulli(0.15),
    depression:             bernoulli(0.12),
    lung_disease:           bernoulli(0.08),
    stroke:                 bernoulli(0.05),
    circulation:            bernoulli(0.08),
    kidney_disease:         bernoulli(0.05),
    nervous_system:         bernoulli(0.04),
    liver_disease:          bernoulli(0.02),
    cancer:                 bernoulli(0.05),
    university_hospital:    bernoulli(0.40),
    independent_hospital:   bernoulli(0.10),
    region:                 REGIONS[Math.floor(Math.random() * REGIONS.length)],
    model_name:             'random_forest_tuned',
  };
}
