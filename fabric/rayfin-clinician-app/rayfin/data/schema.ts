import { CohortStat } from './CohortStat.js';
import { ModelCard } from './ModelCard.js';
import { ModelCurve } from './ModelCurve.js';
import { PatientRisk } from './PatientRisk.js';
import { ProviderStat } from './ProviderStat.js';
import { ReviewDecision } from './ReviewDecision.js';
import { RiskExplanation } from './RiskExplanation.js';
import { ThresholdOption } from './ThresholdOption.js';

/**
 * The app's data model. `rayfin up` reads these decorated classes and generates
 * the Data API Builder configuration, the SQL database in Fabric, and the
 * GraphQL endpoint — including the row-level security policies declared on each
 * entity.
 *
 * Two tiers, and the split is the security story:
 *
 * * **Patient-scoped** — `PatientRisk`, `RiskExplanation`, `ReviewDecision`.
 *   Every one filters rows against a claim. A clinician sees their own patients
 *   and nobody else's.
 * * **Model-scoped** — `CohortStat`, `ProviderStat`, `ModelCurve`,
 *   `ThresholdOption`, `ModelCard`. Aggregates and model documentation,
 *   readable by any authenticated user. Each carries a comment explaining why
 *   a row predicate would be wrong rather than merely absent.
 */
export type ClinicianAppSchema = {
  PatientRisk: PatientRisk;
  RiskExplanation: RiskExplanation;
  ReviewDecision: ReviewDecision;
  CohortStat: CohortStat;
  ProviderStat: ProviderStat;
  ModelCurve: ModelCurve;
  ThresholdOption: ThresholdOption;
  ModelCard: ModelCard;
};

export const schema = [
  PatientRisk,
  RiskExplanation,
  ReviewDecision,
  CohortStat,
  ProviderStat,
  ModelCurve,
  ThresholdOption,
  ModelCard,
];
