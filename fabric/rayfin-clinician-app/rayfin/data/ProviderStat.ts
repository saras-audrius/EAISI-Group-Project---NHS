import { entity, role, text, int, decimal, uuid, set } from '@microsoft/rayfin-core';

/**
 * One provider's slice of the whole pre-operative cohort.
 *
 * Model-scoped, like `CohortStat`: there is no patient in a row — it is a
 * provider code, a headcount and a handful of aggregates — so it carries no
 * row policy and is readable by any authenticated user. The value of the
 * entity is the comparison across providers, which a per-clinician filter
 * would destroy.
 *
 * Written by notebook 60 §2d from `gold.patient_risk`. Providers with fewer
 * than the suppression floor of patients are not written at all, and any band
 * count under the floor is written as zero, matching `CohortStat`.
 */
@entity()
@role('authenticated', 'read')
export class ProviderStat {
  @uuid() id!: string;

  @text({ min: 1, max: 16 }) providerCode!: string;

  @set({ optional: true }, 'nhs_trust', 'university_hospital', 'independent_sector')
  providerType?: 'nhs_trust' | 'university_hospital' | 'independent_sector';

  @text({ max: 64, optional: true }) region?: string;

  @int({ min: 0 }) patients!: number;

  /** Mean calibrated probability of a poor outcome across the provider's pre-op patients. */
  @decimal({ min: 0, max: 1, precision: 6, scale: 5 }) meanRisk!: number;

  @decimal({ min: 0, max: 1, precision: 6, scale: 5, optional: true }) medianRisk?: number;

  /** Patients at or above the operating threshold recorded on the model card. */
  @int({ min: 0 }) flagged!: number;

  @int({ min: 0 }) low!: number;
  @int({ min: 0 }) moderate!: number;
  @int({ min: 0 }) high!: number;
  @int({ min: 0 }) veryHigh!: number;

  @decimal({ precision: 6, scale: 2, optional: true }) medianOks?: number;

  @text({ max: 16 }) modelVersion!: string;
}
