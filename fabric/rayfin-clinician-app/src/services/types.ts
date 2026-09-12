/**
 * The shapes the UI reads. One per entity in `rayfin/data/`, kept structurally
 * identical to the entity classes so the mapping stays a rename-free pass.
 */

export interface PatientRow {
  id: string;
  episodeId: string;
  displayName: string;
  providerCode: string;
  providerType?: 'nhs_trust' | 'university_hospital' | 'independent_sector';
  region?: string;
  ageBand?: string;
  sex?: string;

  oksT0Score: number;
  oksPainSubscale?: number;
  oksFunctionSubscale?: number;
  oksAdlSubscale?: number;

  comorbidityCount: number;
  heartDisease?: boolean;
  highBp?: boolean;
  stroke?: boolean;
  circulation?: boolean;
  lungDisease?: boolean;
  diabetes?: boolean;
  kidneyDisease?: boolean;
  nervousSystem?: boolean;
  liverDisease?: boolean;
  cancer?: boolean;
  depression?: boolean;
  arthritis?: boolean;

  eq5dMobility?: number;
  eq5dSelfCare?: number;
  eq5dActivity?: number;
  eq5dDiscomfort?: number;
  eq5dAnxiety?: number;

  symptomPeriod?: number;
  previousSurgery?: boolean;
  disability?: boolean;
  assistedCompletion?: boolean;
  livingArrangements?: number;

  riskPoorOutcome: number;
  riskBand: string;
  surgeryScheduledDate: Date;
  modelVersion: string;
  modelName: string;
}

export interface ExplanationRow {
  rank: number;
  feature: string;
  featureLabel: string;
  featureValue?: number;
  contribution: number;
  direction: string;
}

export interface DecisionRow {
  id: string;
  episodeId: string;
  clinicianName: string;
  decision: string;
  rationale: string;
  modelAgreement: string;
  riskShown: string;
  modelVersion: string;
  decidedAt: Date;
}

export interface DecisionInput {
  episodeId: string;
  clinicianId: string;
  clinicianName: string;
  decision: string;
  rationale: string;
  modelAgreement: string;
  riskShown: string;
  modelVersion: string;
}

export interface CohortStatRow {
  metric: string;
  binIndex: number;
  binStart: number;
  binEnd: number;
  n: number;
  cohortSize: number;
  cohortMedian?: number;
  unit: string;
}

export interface ModelCurveRow {
  curveType: string;
  series: string;
  seriesLabel: string;
  pointIndex: number;
  x: number;
  y: number;
  yLower?: number;
  yUpper?: number;
  n?: number;
  xUnit: string;
}

export interface ThresholdOptionRow {
  threshold: number;
  flaggedPer1000: number;
  correctlyFlaggedPer1000: number;
  falseAlarmsPer1000: number;
  missedPer1000: number;
  precision: number;
  recall: number;
  isChosen: boolean;
  rationale?: string;
}

export interface ModelCardRow {
  modelName: string;
  modelVersion: string;
  modelType: string;
  outcomeDefinition: string;
  testSetSize: number;
  prevalence: number;
  averagePrecision: number;
  calibrationError?: number;
  operatingThreshold?: number;
  dataSource: string;
  datasetIsSynthetic: boolean;
  limitations?: string;
  scoredAt: Date;
}

/**
 * Everything the app reads, behind one interface.
 *
 * Two implementations: `RayfinDataService` against the governed Fabric backend,
 * and `OfflineDataService` against fixtures. The interface exists so the offline
 * path is a *sibling* of the real one rather than a set of `if (offline)`
 * branches sprinkled through the data layer — branches like that are how a demo
 * ends up silently serving invented patients against a live tenant.
 *
 * Which one is in play is decided once, at boot, from `VITE_OFFLINE_DEMO`, and
 * the offline service is the only thing that can produce fixture data.
 */
export interface ClinicalDataService {
  /** True when this service serves fixtures. The UI renders a banner when it is. */
  readonly isOffline: boolean;

  listPatients(): Promise<PatientRow[]>;
  getPatient(episodeId: string): Promise<PatientRow | null>;
  getExplanation(episodeId: string): Promise<ExplanationRow[]>;
  getDecisions(episodeId: string): Promise<DecisionRow[]>;
  recordDecision(input: DecisionInput): Promise<void>;

  getCohortStats(): Promise<CohortStatRow[]>;
  getModelCurves(): Promise<ModelCurveRow[]>;
  getThresholdOptions(): Promise<ThresholdOptionRow[]>;
  getModelCard(): Promise<ModelCardRow | null>;
}
