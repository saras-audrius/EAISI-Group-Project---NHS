import { entity, role, text, int, decimal, date, boolean, uuid } from '@microsoft/rayfin-core';

/**
 * The headline facts about the model version the clinician is looking at:
 * what it was measured on, how well it did, and what the data behind it is.
 *
 * One row per model version. It is the provenance strip at the bottom of the
 * patient page and the "can I trust this" panel — the numbers that let a
 * clinician judge the score rather than merely receive it.
 *
 * `datasetIsSynthetic` is not decoration. A demonstration that shows invented
 * patients without saying so is the single most damaging thing this app could
 * do, so the flag is carried in governed data next to the score and rendered
 * wherever patient data appears. It is set by notebook 60, not by the frontend.
 *
 * RLS: `read` to any authenticated user, no row predicate — see `CohortStat`.
 */
@entity()
@role('authenticated', 'read')
export class ModelCard {
  @uuid() id!: string;

  @text({ min: 1, max: 64 }) modelName!: string;

  @text({ min: 1, max: 16 }) modelVersion!: string;

  /** e.g. "Explainable Boosting Machine, isotonic-calibrated". */
  @text({ max: 200 }) modelType!: string;

  /** The label rule, in words: "OKS gain of 7 points or less at six months". */
  @text({ max: 400 }) outcomeDefinition!: string;

  /** Patients in the held-out test set the metrics below were computed on. */
  @int({ min: 0 }) testSetSize!: number;

  /** Share of the test set that actually had a poor outcome. The no-skill baseline. */
  @decimal({ min: 0, max: 1, precision: 5, scale: 4 }) prevalence!: number;

  /** Average precision on the test set. The headline metric for an imbalanced problem. */
  @decimal({ min: 0, max: 1, precision: 5, scale: 4 }) averagePrecision!: number;

  /**
   * Mean absolute difference between predicted and observed risk across the
   * calibration deciles. The number that backs the phrase "calibrated".
   */
  @decimal({ min: 0, max: 1, precision: 5, scale: 4, optional: true })
  calibrationError?: number;

  /** Operating threshold recorded on the model version by notebook 42. */
  @decimal({ min: 0, max: 1, precision: 5, scale: 4, optional: true })
  operatingThreshold?: number;

  /** Named source of the training data, e.g. "NHS PROMs, knee replacement, 2018/19-2019/20". */
  @text({ max: 300 }) dataSource!: string;

  /**
   * True when the cohort on screen is synthetic or pseudonymised rather than a
   * live patient list. Rendered as a persistent banner, not a footnote.
   */
  @boolean() datasetIsSynthetic!: boolean;

  /** Free text for the known limitations a reviewing clinician should have in mind. */
  @text({ max: 2000, optional: true }) limitations?: string;

  @date() scoredAt!: Date;
}
