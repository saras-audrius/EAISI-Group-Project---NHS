import { entity, role, text, int, decimal, uuid } from '@microsoft/rayfin-core';

/**
 * Why the model scored this patient the way it did — one row per contributing
 * feature, six per patient, ranked by absolute contribution.
 *
 * Mirrors `gold.risk_explanation`. These are the Explainable Boosting Machine's
 * own additive term contributions, not a post-hoc approximation: for a glassbox
 * model the explanation *is* the model, so there is no fidelity gap to argue
 * about with a regulator.
 *
 * Under GDPR Art. 22 a patient subject to an automated decision is owed a
 * meaningful explanation. That obligation is why this lives in governed data
 * rather than in a chart on someone's laptop.
 *
 * ## A note on the policy
 *
 * Rayfin policies compare claims to fields on *this* row; they cannot join to
 * `PatientRisk` to inherit its assignment. Rather than pretend otherwise, the
 * clinician's assignment is denormalised onto this table too when gold is
 * synced. Explanation rows carry no patient identity of their own — only an
 * `episodeId` and feature contributions — but they are still filtered, because
 * "it is only an episode id" is exactly the reasoning that turns into a breach
 * notification later.
 */
@entity()
@role('authenticated', 'read', {
  policy: (claims, item) =>
    claims.sub
      .eq(item.assignedClinicianId)
      .or(claims.role.eq('governance')),
})
export class RiskExplanation {
  @uuid() id!: string;

  /** Joins to PatientRisk.episodeId. */
  @text({ min: 1, max: 64 }) episodeId!: string;

  /**
   * Denormalised from PatientRisk so the row can filter itself.
   * Holds the Rayfin app user id — see the note on `PatientRisk`.
   */
  @text({ min: 1, max: 256 }) assignedClinicianId!: string;

  /** 1 = strongest contributor for this patient. */
  @int({ min: 1, max: 50 }) rank!: number;

  /** Raw model feature name, e.g. oks_function_subscale. */
  @text({ min: 1, max: 128 }) feature!: string;

  /** Clinician-readable label, e.g. "Pre-op physical function". Render this one. */
  @text({ min: 1, max: 200 }) featureLabel!: string;

  /** The patient's value for this feature, as fed to the model. */
  @decimal({ precision: 12, scale: 4, optional: true }) featureValue?: number;

  /** Additive contribution to the log-odds of a poor outcome. Positive increases risk. */
  @decimal({ precision: 12, scale: 6 }) contribution!: number;

  /** increases_risk | reduces_risk */
  @text({ min: 1, max: 20 }) direction!: string;

  @text({ max: 16 }) modelVersion!: string;
}
