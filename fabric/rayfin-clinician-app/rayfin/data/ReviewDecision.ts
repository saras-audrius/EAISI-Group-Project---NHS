import { entity, role, text, date, uuid } from '@microsoft/rayfin-core';

/**
 * The human-oversight record: what a clinician actually decided after seeing a
 * risk score, and why.
 *
 * This is the only entity in the app that is written rather than read, and it is
 * what makes the EU AI Act's human-oversight requirement demonstrable rather
 * than merely asserted. A score with no recorded decision is a model acting
 * alone; a score with a decision attached is decision *support*.
 *
 * The policy scopes full access to the authoring clinician — nobody edits
 * somebody else's clinical reasoning — while the `governance` role may read
 * everything, which is the whole point of keeping an oversight log.
 */
@entity()
@role('authenticated', '*', {
  policy: (claims, item) =>
    claims.sub.eq(item.clinicianId).or(claims.role.eq('governance')),
})
export class ReviewDecision {
  @uuid() id!: string;

  /** Joins to PatientRisk.episodeId. */
  @text({ min: 1, max: 64 }) episodeId!: string;

  /** Rayfin app user id of the reviewing clinician. The security key. */
  @text({ min: 1, max: 64 }) clinicianId!: string;

  @text({ min: 1, max: 200 }) clinicianName!: string;

  /** proceed | optimise_first | discuss_alternatives | defer */
  @text({ min: 1, max: 32 }) decision!: string;

  /**
   * Free-text clinical rationale. Required — a decision without a reason is not
   * oversight, it is a rubber stamp with a timestamp.
   */
  @text({ min: 1, max: 2000 }) rationale!: string;

  /**
   * agreed | overridden. Tracking the override rate is how you notice the model
   * drifting before the offline metrics do.
   */
  @text({ min: 1, max: 16 }) modelAgreement!: string;

  /** The score as shown at decision time, so the record is self-contained. */
  @text({ max: 16 }) riskShown!: string;

  /** Model version the clinician actually saw — not the current one. */
  @text({ max: 16 }) modelVersion!: string;

  @date() decidedAt!: Date;
}
