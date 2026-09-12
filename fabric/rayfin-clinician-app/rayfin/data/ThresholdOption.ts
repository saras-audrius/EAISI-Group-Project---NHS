import { entity, role, text, int, decimal, boolean, uuid } from '@microsoft/rayfin-core';

/**
 * The operating-point trade-off from notebook `42_threshold_analysis`, expressed
 * in patients rather than rates.
 *
 * Notebook 42 makes the argument well and then leaves it in a notebook: the
 * threshold is a *policy* choice, not a modelling one, and nothing in the
 * training data can tell you whether a missed poor outcome is worse than an
 * unnecessary conversation. A clinician reviewing a score is entitled to know
 * where the cut-off sits and what moving it would cost — so the sweep is synced
 * across and drawn.
 *
 * Counts, not rates, and per 1,000 patients, because "recall 0.34" is not
 * something a service can act on and "of every 1,000 patients, you flag 210 and
 * miss 260" is.
 *
 * RLS: `read` to any authenticated user, no row predicate — see `CohortStat`.
 * These are test-set aggregates over historical episodes; there is no
 * pre-operative patient in them at all.
 */
@entity()
@role('authenticated', 'read')
export class ThresholdOption {
  @uuid() id!: string;

  /** Probability cut-off, 0-1. */
  @decimal({ min: 0, max: 1, precision: 5, scale: 4 }) threshold!: number;

  /** Patients flagged, per 1,000 screened. */
  @int({ min: 0, max: 1000 }) flaggedPer1000!: number;

  /** Of those flagged, how many genuinely had a poor outcome. */
  @int({ min: 0, max: 1000 }) correctlyFlaggedPer1000!: number;

  /** Flagged but would have done well — an unnecessary conversation. */
  @int({ min: 0, max: 1000 }) falseAlarmsPer1000!: number;

  /** Poor outcomes not flagged — a patient nobody warned. */
  @int({ min: 0, max: 1000 }) missedPer1000!: number;

  @decimal({ min: 0, max: 1, precision: 5, scale: 4 }) precision!: number;

  @decimal({ min: 0, max: 1, precision: 5, scale: 4 }) recall!: number;

  /**
   * True for the threshold recorded on the model version by notebook 42, i.e.
   * the one the service actually chose. Exactly one row should carry it, and the
   * app labels it rather than silently centring the chart on it.
   */
  @boolean() isChosen!: boolean;

  /** The clinical reasoning behind the chosen threshold, from notebook 42. */
  @text({ max: 1000, optional: true }) rationale?: string;

  @text({ max: 16 }) modelVersion!: string;
}
