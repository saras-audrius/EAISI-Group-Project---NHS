import { entity, role, text, decimal, int, uuid } from '@microsoft/rayfin-core';

/**
 * Model-level curves: calibration, and the EBM's own shape functions.
 *
 * Two questions a clinician is entitled to ask, neither of which the app could
 * answer before:
 *
 * * *Can I trust the number?* — the calibration curve from notebook `43`.
 *   A calibrated probability is the app's central claim; showing the evidence
 *   for it is the difference between a claim and an assertion.
 * * *What would change it?* — the shape function for a driver. An EBM's
 *   prediction **is** the sum of these curves, so plotting one and marking the
 *   patient's value on it shows exactly how their risk would move if that value
 *   moved. No other model class can offer this honestly.
 *
 * Long format, one row per point, because the two curve families have different
 * x-domains and a wide table would fit neither.
 *
 * RLS: `read` to any authenticated user, no row predicate — see the note on
 * `CohortStat`. These rows describe the model, not a patient. They are the
 * model card, and a model card the reviewing clinician cannot read is not
 * oversight material.
 */
@entity()
@role('authenticated', 'read')
export class ModelCurve {
  @uuid() id!: string;

  /** calibration | shape */
  @text({ min: 1, max: 32 }) curveType!: string;

  /**
   * For `shape`, the model feature name (joins to `RiskExplanation.feature`).
   * For `calibration`, the empty string.
   */
  @text({ max: 128 }) series!: string;

  /** Clinician-readable name for the series — the same label the app shows elsewhere. */
  @text({ max: 200 }) seriesLabel!: string;

  /** Point order along x. The app sorts on this rather than on `x`, so categorical shapes work too. */
  @int({ min: 0, max: 500 }) pointIndex!: number;

  /**
   * calibration: mean predicted probability in the decile, 0-1.
   * shape: the feature value (bin centre for a continuous feature).
   */
  @decimal({ precision: 12, scale: 5 }) x!: number;

  /**
   * calibration: observed fraction with a poor outcome in that decile, 0-1.
   * shape: contribution to the log-odds of a poor outcome.
   */
  @decimal({ precision: 12, scale: 5 }) y!: number;

  /** Lower edge of the uncertainty band, where the artefact has one. */
  @decimal({ precision: 12, scale: 5, optional: true }) yLower?: number;

  /** Upper edge of the uncertainty band. */
  @decimal({ precision: 12, scale: 5, optional: true }) yUpper?: number;

  /**
   * Patients behind this point. A calibration decile drawn from 40 patients is
   * not the same evidence as one drawn from 4,000, and the chart says so.
   */
  @int({ min: 0, optional: true }) n?: number;

  /** Axis label for x, including units. Never render a bare number. */
  @text({ max: 64 }) xUnit!: string;

  @text({ max: 16 }) modelVersion!: string;
}
