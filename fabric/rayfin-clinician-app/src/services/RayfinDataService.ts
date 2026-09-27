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
  ProviderStatRow,
  ThresholdOptionRow,
} from './types';

/**
 * Rows per request when reading a list that can outgrow one page.
 *
 * Data API Builder pages at 100 rows by default and `execute()` returns that
 * single page without saying whether more exist — a worklist read that way is
 * the 100 highest-risk patients, with no sign the other two thousand are there.
 * `executePaginated()` carries the cursor, so these reads page to the end.
 */
const PAGE_SIZE = 500;

/** The slice of the query builder these paged reads use. */
interface PagedQuery {
  after(cursor: string): PagedQuery;
  executePaginated(): Promise<{
    items: unknown[];
    hasNextPage: boolean;
    endCursor?: string;
  }>;
}

/**
 * Read every page of a query.
 *
 * `build` is called once per page and must set `.first(PAGE_SIZE)` itself, since
 * the builder is single-use. Row-level security is evaluated per request, so a
 * clinician pages through their own rows and nobody else's.
 */
async function readAllPages<T>(build: () => PagedQuery): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;

  do {
    const base = build();
    const page = await (cursor ? base.after(cursor) : base).executePaginated();
    all.push(...(page.items as T[]));
    // Advance only with both a next page and a cursor, so a server that reports
    // one without the other ends the loop instead of re-reading page one.
    cursor = page.hasNextPage ? page.endCursor : undefined;
  } while (cursor);

  return all;
}

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
    return readAllPages<PatientRow>(() =>
      client.data.PatientRisk.select([...PATIENT_FIELDS])
        .orderBy({ riskPoorOutcome: 'desc' })
        .first(PAGE_SIZE) as unknown as PagedQuery
    );
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

  /**
   * Every explanation row the caller is entitled to see, in one query. The
   * policy on `RiskExplanation` filters by `assignedClinicianId`, so this is
   * the caller's own patients' rows and nobody else's — the same guarantee as
   * `listPatients`, and again with no WHERE clause written here.
   */
  async listExplanations(): Promise<ExplanationRow[]> {
    const client = getRayfinClient();
    const rows = await client.data.RiskExplanation.select([
      'episodeId',
      'rank',
      'feature',
      'featureLabel',
      'featureValue',
      'contribution',
      'direction',
    ])
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

  /** Every decision the caller may read — their own, under the `ReviewDecision` policy. */
  async listDecisions(): Promise<DecisionRow[]> {
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

  /**
   * Calibration points and every shape function, across all features — well past
   * one page once a model has more than a handful of terms, and a curve cut
   * mid-feature draws as a line that simply stops.
   */
  async getModelCurves(): Promise<ModelCurveRow[]> {
    const client = getRayfinClient();
    return readAllPages<ModelCurveRow>(() =>
      client.data.ModelCurve.select([
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
        .first(PAGE_SIZE) as unknown as PagedQuery
    );
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

  /**
   * One row per provider. NHS PROMs covers several hundred, so reading a single
   * page would drop the tail — and the tail is sorted to be the lowest-risk
   * providers, which is exactly the comparison a partial read distorts.
   */
  async getProviderStats(): Promise<ProviderStatRow[]> {
    const client = getRayfinClient();
    return readAllPages<ProviderStatRow>(() =>
      client.data.ProviderStat.select([
        'providerCode',
        'providerType',
        'region',
        'patients',
        'meanRisk',
        'medianRisk',
        'flagged',
        'low',
        'moderate',
        'high',
        'veryHigh',
        'medianOks',
      ])
        .orderBy({ meanRisk: 'desc' })
        .first(PAGE_SIZE) as unknown as PagedQuery
    );
  }
}
