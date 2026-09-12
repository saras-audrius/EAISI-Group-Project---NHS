import { entity, role, text, int, decimal, uuid } from '@microsoft/rayfin-core';

/**
 * The distribution of one measure across the whole pre-operative cohort, binned.
 *
 * This exists so that a number on the patient page can mean something. "OKS
 * 22/48" is a fact about a patient; "OKS 22/48, and here is where that sits
 * among the 4,100 patients awaiting surgery" is a fact a clinician can act on.
 * Without it, every scale on the screen is an unanchored number.
 *
 * Long format — one row per (metric, bin) — because the app plots several
 * different measures and a wide table would need a schema change every time a
 * new one is added. Written by notebook `60_sync_app_db` from `gold.patient_risk`
 * and `gold.knee_preop_cohort`.
 *
 * ## Row-level security: why there is no row predicate here
 *
 * Every other entity in this app filters to the assigned clinician. This one
 * cannot and should not:
 *
 * * There is no patient in it. A row is a bin label and a count over thousands
 *   of episodes, with `n` suppressed below a minimum bin size by notebook 60,
 *   so no row is attributable to an individual.
 * * The whole point of the entity is the denominator. A per-clinician cohort
 *   distribution would be computed over a few dozen patients, which is both
 *   statistically useless and *more* disclosive than the pooled one — a
 *   clinician with eleven patients could read individual values straight off
 *   the histogram.
 *
 * So the grant is `read` to any authenticated user with no policy, and that is
 * a decision recorded here rather than an omission. Data API Builder still
 * requires a valid session; anonymous access is not granted to anything.
 */
@entity()
@role('authenticated', 'read')
export class CohortStat {
  @uuid() id!: string;

  /**
   * risk_poor_outcome | oks_t0_score | oks_pain_subscale | oks_function_subscale
   * | oks_adl_subscale | comorbidity_count
   */
  @text({ min: 1, max: 64 }) metric!: string;

  /** 0-based bin index, ascending. The app relies on this for ordering. */
  @int({ min: 0, max: 200 }) binIndex!: number;

  /** Inclusive lower edge of the bin, in the metric's own units. */
  @decimal({ precision: 12, scale: 4 }) binStart!: number;

  /** Exclusive upper edge, except for the last bin which is inclusive. */
  @decimal({ precision: 12, scale: 4 }) binEnd!: number;

  /** Patients in this bin. Suppressed bins are written as 0 — see notebook 60. */
  @int({ min: 0 }) n!: number;

  /** Total across all bins of this metric, so the app never has to sum to get a denominator. */
  @int({ min: 0 }) cohortSize!: number;

  /** Cohort median for this metric. Denormalised so a chart can draw it without a second query. */
  @decimal({ precision: 12, scale: 4, optional: true }) cohortMedian?: number;

  /** Units for the axis label, e.g. "points (0-48)" or "% probability". */
  @text({ max: 64 }) unit!: string;

  @text({ max: 16 }) modelVersion!: string;
}
