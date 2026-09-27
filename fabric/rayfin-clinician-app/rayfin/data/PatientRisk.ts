import {
  entity,
  role,
  text,
  int,
  decimal,
  date,
  uuid,
  boolean,
  set,
} from '@microsoft/rayfin-core';

/**
 * One pre-operative patient and their calibrated risk of a poor outcome.
 *
 * Mirrors `gold.patient_risk` joined to `gold.knee_preop_cohort` in the Fabric
 * Lakehouse, written by notebook `50_batch_score`. The scores come from the
 * registered model `knee-poor-outcome-ebm@champion`; this app never loads a model.
 *
 * ## Why this entity is wide
 *
 * It used to carry eight fields, and the patient page could therefore show eight
 * facts. A clinician asked to agree or override a risk score for a patient they
 * cannot see is not exercising oversight, they are rubber-stamping — so the
 * clinical detail the model was actually built on is synced across as well:
 * the OKS subscales, the twelve individual comorbidities, the EQ-5D profile, and
 * the pre-operative context that decides whether "optimise before surgery" is an
 * actionable suggestion or an empty one.
 *
 * Every one of these columns already exists in `gold.knee_features`. Nothing here
 * is derived in the app, and nothing here is invented.
 *
 * Fields that gold may not hold for a given patient are `optional`. That is
 * deliberate: NHS PROMs suppresses demographics for small cells, and a
 * questionnaire item can simply be unanswered. The UI renders those as an
 * explicit "not recorded", never as a zero.
 *
 * ## Row-level security
 *
 * Rayfin policies compare token claims against row fields, and the claim set is
 * fixed: `sub`, `email`, `role`. There is no `provider_code` claim to filter on,
 * so the assignment is materialised **onto the row** as `assignedClinicianId`
 * when gold is synced into the app database.
 *
 * ### What goes in that column
 *
 * The Rayfin **app user id**: the bare GUID minted the first time that person
 * signs into this app — which is also the id the developer panel displays.
 *
 * Not the Entra object id (`az ad user show --query id` is the wrong command),
 * and not the whole `sub` claim. Inside Fabric the broker issues a token with
 * `idtyp: 'fmi'` whose `sub` is a hierarchical path:
 *
 *     /eid1/c/pub/t/<tenant>/a/<app>/workspaces/<ws>/projects/<item>/users/<uid>
 *
 * The backend passes only the trailing `<uid>` to Data API Builder — the same
 * segment `extractUserIdFromToken` keeps (`rayfin-auth/dist/Auth.js`). Storing
 * the full path matches nothing: verified 2026-08-31 by splitting the cohort
 * between both forms and signing in. Only the bare uid came back.
 *
 * The column stays `NVARCHAR(256)` because narrowing it would force a
 * destructive `db apply` for no gain; 36 of those characters are used.
 *
 * ### Why there are two assignment columns
 *
 * `assignedClinicianId` is exact but unknowable in advance: the GUID does not
 * exist until that person has signed in once, which makes setting up a demo a
 * chicken-and-egg problem and makes `CLINICIAN_ASSIGNMENTS` unreadable.
 *
 * `assignedClinicianEmail` is the same assignment written the way a human can
 * type it before anybody has signed in. `claims.email` is a first-class claim in
 * Rayfin's policy DSL, and the Fabric broker carries the address in the token
 * (top-level `email`, or `xms_attr.<appId>.rfn_email` for a managed-hosting
 * token — see `extractEmailFromToken` in `rayfin-auth/dist/Auth.js`).
 *
 * The policy accepts **either**, deliberately. Whether Data API Builder is
 * handed an `email` claim for a Fabric-brokered session is not something the
 * client bundle can prove, so the id branch stays as the path already verified
 * to work, and the email branch is the one that makes setup humane. Populate
 * whichever you have; notebook 60 writes both.
 *
 * Emails are written lower-cased by notebook 60. Fabric SQL databases are
 * created with a case-insensitive collation, so this is belt and braces.
 *
 * The policy below therefore reads: a signed-in user may read a patient row when
 * they are the assigned clinician — by app user id or by email address — *or*
 * when their `role` claim is `governance`, the audit/oversight role that
 * legitimately sees the whole cohort.
 *
 * Enforcement happens in Data API Builder, not in the frontend. A clinician who
 * rewrites the GraphQL query in devtools still gets only their own patients.
 * Widening the column set does not widen the disclosure: the policy filters
 * whole rows, so a field that is invisible today is invisible with fifty more
 * columns beside it.
 */
@entity()
@role('authenticated', 'read', {
  policy: (claims, item) =>
    claims.sub
      .eq(item.assignedClinicianId)
      .or(claims.email.eq(item.assignedClinicianEmail))
      .or(claims.role.eq('governance')),
})
export class PatientRisk {
  @uuid() id!: string;

  /** Stable key from gold.patient_risk. Joins to RiskExplanation. */
  @text({ min: 1, max: 64 }) episodeId!: string;

  /** Pseudonymous display name — the PROMs extract carries no identifier. */
  @text({ min: 1, max: 120 }) displayName!: string;

  /** The row-level security key: Rayfin app user id of the responsible clinician. */
  @text({ min: 1, max: 256 }) assignedClinicianId!: string;

  /**
   * The same assignment by email address — the readable half of the key.
   *
   * Optional so that `rayfin up db apply` can add it to a populated table as a
   * plain nullable column — a required column would need a default or a
   * destructive rebuild, and `ReviewDecisions` holds recorded clinical
   * decisions that must not be dropped to add a convenience key.
   *
   * Notebook 60 never writes blank: where no address is configured it writes the
   * sentinel `unassigned@invalid`, because an empty string could collide with an
   * absent claim and turn a mis-set row into a visible one. NULL matches nothing,
   * so a row the sync has not touched stays invisible.
   */
  @text({ max: 256, optional: true }) assignedClinicianEmail?: string;

  // ---- provider and demographics -------------------------------------------

  /** Hospital that owns this patient. Display and grouping only. */
  @text({ min: 1, max: 16 }) providerCode!: string;

  /**
   * Derived in notebook 60 from the mutually exclusive `university_hospital` and
   * `independent_hospital` flags on the provider dimension. Carried as one label
   * because that is how it is read — nobody scans two booleans.
   */
  @set(
    { optional: true },
    'nhs_trust',
    'university_hospital',
    'independent_sector'
  )
  providerType?: 'nhs_trust' | 'university_hospital' | 'independent_sector';

  @text({ max: 64, optional: true }) region?: string;

  @text({ max: 16, optional: true }) ageBand?: string;

  /**
   * male | female | not_recorded. `not_recorded` means NHS suppressed the value
   * for disclosure control — it is a real category, not a null to be filled in.
   */
  @text({ max: 16, optional: true }) sex?: string;

  // ---- Oxford Knee Score ---------------------------------------------------

  /** Pre-operative Oxford Knee Score, 0-48. Lower is worse. */
  @int({ min: 0, max: 48 }) oksT0Score!: number;

  /** OKS pain subscale (pain + night pain), 0-8. Lower is worse. */
  @int({ min: 0, max: 8, optional: true }) oksPainSubscale?: number;

  /** OKS function subscale (washing, stairs, walking, standing, limping, kneeling), 0-24. */
  @int({ min: 0, max: 24, optional: true }) oksFunctionSubscale?: number;

  /** OKS activities-of-daily-living subscale (work, confidence, shopping, transport), 0-16. */
  @int({ min: 0, max: 16, optional: true }) oksAdlSubscale?: number;

  // ---- comorbidities -------------------------------------------------------

  /** Count of the twelve recorded long-term conditions. Kept for sorting and triage. */
  @int({ min: 0, max: 12 }) comorbidityCount!: number;

  /**
   * The twelve conditions, individually. "Three long-term conditions" and
   * "diabetes, depression, heart disease" are not the same clinical fact, and
   * only the second one tells a clinician what to do next.
   *
   * Optional because a blank questionnaire item is not a denial — `undefined`
   * renders as "not recorded", `false` renders as "no".
   */
  @boolean({ optional: true }) heartDisease?: boolean;
  @boolean({ optional: true }) highBp?: boolean;
  @boolean({ optional: true }) stroke?: boolean;
  @boolean({ optional: true }) circulation?: boolean;
  @boolean({ optional: true }) lungDisease?: boolean;
  @boolean({ optional: true }) diabetes?: boolean;
  @boolean({ optional: true }) kidneyDisease?: boolean;
  @boolean({ optional: true }) nervousSystem?: boolean;
  @boolean({ optional: true }) liverDisease?: boolean;
  @boolean({ optional: true }) cancer?: boolean;
  @boolean({ optional: true }) depression?: boolean;
  @boolean({ optional: true }) arthritis?: boolean;

  // ---- EQ-5D-3L ------------------------------------------------------------

  /**
   * The five EQ-5D-3L dimensions as supplied by NHS PROMs: 1 = no problems,
   * 2 = some problems, 3 = extreme problems / unable. Stored as the raw level
   * rather than a utility index, because a clinician acts on the dimension.
   */
  @int({ min: 1, max: 3, optional: true }) eq5dMobility?: number;
  @int({ min: 1, max: 3, optional: true }) eq5dSelfCare?: number;
  @int({ min: 1, max: 3, optional: true }) eq5dActivity?: number;
  @int({ min: 1, max: 3, optional: true }) eq5dDiscomfort?: number;
  @int({ min: 1, max: 3, optional: true }) eq5dAnxiety?: number;

  // ---- pre-operative context -----------------------------------------------

  /** 1 = under 1 year, 2 = 1-5 years, 3 = 6-10 years, 4 = over 10 years. */
  @int({ min: 1, max: 4, optional: true }) symptomPeriod?: number;

  /** Previous surgery on this knee. */
  @boolean({ optional: true }) previousSurgery?: boolean;

  /** Patient reports a disability. */
  @boolean({ optional: true }) disability?: boolean;

  /**
   * The questionnaire was completed with help. Relevant twice over: it changes
   * how much weight the self-reported scores carry, and it is itself a model
   * feature that can appear in the explanation.
   */
  @boolean({ optional: true }) assistedCompletion?: boolean;

  /** 1 = alone, 2 = with partner/family, 4 = other/care setting (3 merged into 4 in gold). */
  @int({ min: 1, max: 4, optional: true }) livingArrangements?: number;

  // ---- the score -----------------------------------------------------------

  /**
   * Calibrated probability of a poor outcome.
   * Calibrated means 0.34 really is "about 34 in 100 similar patients".
   */
  @decimal({ min: 0, max: 1, precision: 6, scale: 5 })
  riskPoorOutcome!: number;

  /** low | moderate | high | very_high — clinical policy bands, not model output. */
  @text({ min: 1, max: 16 }) riskBand!: string;

  @date() surgeryScheduledDate!: Date;

  /** Registry version that produced this score. Shown in the UI on purpose. */
  @text({ max: 16 }) modelVersion!: string;

  @text({ max: 64 }) modelName!: string;
}
