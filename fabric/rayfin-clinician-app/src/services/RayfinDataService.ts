import { getRayfinClient } from './rayfinClient';
import type {
  ClinicalDataService,
  CohortStatRow,
  DecisionInput,
  DecisionRow,
  ExplanationRow,
  ModelCardRow,
  ModelCurveRow,
  PatientRow,
  ThresholdOptionRow,
} from './types';

const PATIENT_FIELDS = [
  'id',
  'episodeId',
  'displayName',
  'providerCode',
  'providerType',
  'region',
  'ageBand',
  'sex',
  'oksT0Score',
  'oksPainSubscale',
  'oksFunctionSubscale',
  'oksAdlSubscale',
  'comorbidityCount',
  'heartDisease',
  'highBp',
  'stroke',
  'circulation',
  'lungDisease',
  'diabetes',
  'kidneyDisease',
  'nervousSystem',
  'liverDisease',
  'cancer',
  'depression',
  'arthritis',
  'eq5dMobility',
  'eq5dSelfCare',
  'eq5dActivity',
  'eq5dDiscomfort',
  'eq5dAnxiety',
  'symptomPeriod',
  'previousSurgery',
  'disability',
  'assistedCompletion',
  'livingArrangements',
  'riskPoorOutcome',
  'riskBand',
  'surgeryScheduledDate',
  'modelVersion',
  'modelName',
] as const;

/**
 * The governed path: every read goes through Data API Builder, which applies the
 * row-level security policy declared on the entity before a row leaves Fabric.
 *
 * Notice what is *not* in this file: any filter on provider or clinician. There
 * is no `WHERE assignedClinicianId = ...` anywhere, deliberately. The policy on
 * `PatientRisk` matches the caller's `sub` claim against the row inside DAB, so a
 * clinician who rewrites the GraphQL query in devtools still gets only their own
 * patients. A filter here would be a suggestion; the entity policy is a rule.
 *
 * `assignedClinicianId` is never selected either. The app has no use for it and
 * a column that is only ever a security key does not belong in a response body.
 */
export class RayfinDataService implements ClinicalDataService {
  readonly isOffline = false;

  async listPatients(): Promise<PatientRow[]> {
    const client = getRayfinClient();
    const rows = await client.data.PatientRisk.select([...PATIENT_FIELDS])
      .orderBy({ riskPoorOutcome: 'desc' })
      .execute();
    return rows as PatientRow[];
  }

  /**
   * One patient by episode id — what a deep link or a page refresh resolves.
   *
   * This is a query, not a lookup in a list the client already holds, so the RLS
   * policy is evaluated again on this request. Pasting somebody else's episode id
   * into the URL bar returns nothing.
   */
  async getPatient(episodeId: string): Promise<PatientRow | null> {
    const client = getRayfinClient();
    const rows = await client.data.PatientRisk.select([...PATIENT_FIELDS])
      .where({ episodeId })
      .execute();
    return (rows[0] as PatientRow | undefined) ?? null;
  }

  async getExplanation(episodeId: string): Promise<ExplanationRow[]> {
    const client = getRayfinClient();
    const rows = await client.data.RiskExplanation.select([
      'rank',
      'feature',
      'featureLabel',
      'featureValue',
      'contribution',
      'direction',
    ])
      .where({ episodeId })
      .orderBy({ rank: 'asc' })
      .execute();
    return rows as ExplanationRow[];
  }

  async getDecisions(episodeId: string): Promise<DecisionRow[]> {
    const client = getRayfinClient();
    const rows = await client.data.ReviewDecision.select([
      'id',
      'episodeId',
      'clinicianName',
      'decision',
      'rationale',
      'modelAgreement',
      'riskShown',
      'modelVersion',
      'decidedAt',
    ])
      .where({ episodeId })
      .orderBy({ decidedAt: 'desc' })
      .execute();
    return rows as DecisionRow[];
  }

  /**
   * Record what the clinician decided.
   *
   * This is the human-oversight artefact. Every write carries the model version
   * the clinician actually saw, so a later audit can reconstruct the decision as
   * it was made rather than as the current model would make it.
   */
  async recordDecision(input: DecisionInput): Promise<void> {
    const client = getRayfinClient();
    await client.data.ReviewDecision.create({ ...input, decidedAt: new Date() });
  }

  async getCohortStats(): Promise<CohortStatRow[]> {
    const client = getRayfinClient();
    const rows = await client.data.CohortStat.select([
      'metric',
      'binIndex',
      'binStart',
      'binEnd',
      'n',
      'cohortSize',
      'cohortMedian',
      'unit',
    ])
      .orderBy({ binIndex: 'asc' })
      .execute();
    return rows as CohortStatRow[];
  }

  async getModelCurves(): Promise<ModelCurveRow[]> {
    const client = getRayfinClient();
    const rows = await client.data.ModelCurve.select([
      'curveType',
      'series',
      'seriesLabel',
      'pointIndex',
      'x',
      'y',
      'yLower',
      'yUpper',
      'n',
      'xUnit',
    ])
      .orderBy({ pointIndex: 'asc' })
      .execute();
    return rows as ModelCurveRow[];
  }

  async getThresholdOptions(): Promise<ThresholdOptionRow[]> {
    const client = getRayfinClient();
    const rows = await client.data.ThresholdOption.select([
      'threshold',
      'flaggedPer1000',
      'correctlyFlaggedPer1000',
      'falseAlarmsPer1000',
      'missedPer1000',
      'precision',
      'recall',
      'isChosen',
      'rationale',
    ])
      .orderBy({ threshold: 'asc' })
      .execute();
    return rows as ThresholdOptionRow[];
  }

  async getModelCard(): Promise<ModelCardRow | null> {
    const client = getRayfinClient();
    const rows = await client.data.ModelCard.select([
      'modelName',
      'modelVersion',
      'modelType',
      'outcomeDefinition',
      'testSetSize',
      'prevalence',
      'averagePrecision',
      'calibrationError',
      'operatingThreshold',
      'dataSource',
      'datasetIsSynthetic',
      'limitations',
      'scoredAt',
    ]).execute();
    return (rows[0] as ModelCardRow | undefined) ?? null;
  }
}
