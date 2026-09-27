import type { ClinicalDataService, DecisionInput } from './types';

export type {
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

let service: ClinicalDataService | null = null;

/**
 * Install the data service. Called once by `bootstrapApp()`.
 *
 * The service is set at boot rather than resolved per call so that the choice
 * between the governed backend and the offline fixtures is made exactly once,
 * from one environment variable, in one place you can read.
 */
export function setDataService(next: ClinicalDataService): void {
  service = next;
}

function required(): ClinicalDataService {
  if (!service) {
    throw new Error('Data service not initialised. Call bootstrapApp() first.');
  }
  return service;
}

/** True when the app is serving fixtures rather than governed Fabric data. */
export function isOfflineDemo(): boolean {
  return service?.isOffline ?? false;
}

/**
 * The clinician's inbox, highest risk first.
 *
 * The absence of a provider filter here is the demo: enforcement lives in the
 * row-level security policy on the `PatientRisk` entity, evaluated inside Data
 * API Builder. See `RayfinDataService` and `rayfin/data/PatientRisk.ts`.
 */
export const listPatients = () => required().listPatients();

/** One patient by episode id. Re-evaluates RLS — a deep link is not a bypass. */
export const getPatient = (episodeId: string) => required().getPatient(episodeId);

/** The six ranked contributions behind one patient's score. */
export const getExplanation = (episodeId: string) => required().getExplanation(episodeId);

/** Every explanation row the caller may see, for the worklist and the overview. */
export const listExplanations = () => required().listExplanations();

/** Decisions already recorded for a patient, newest first. */
export const getDecisions = (episodeId: string) => required().getDecisions(episodeId);

/** Every decision the caller may see, newest first. */
export const listDecisions = () => required().listDecisions();

export const recordDecision = (input: DecisionInput) => required().recordDecision(input);

/** Cohort distributions, so a number on the patient page has something to sit against. */
export const getCohortStats = () => required().getCohortStats();

/** Calibration and EBM shape functions. */
export const getModelCurves = () => required().getModelCurves();

/** The operating-point sweep from notebook 42, in patients per 1,000. */
export const getThresholdOptions = () => required().getThresholdOptions();

/** Headline model facts and the synthetic-data flag. */
export const getModelCard = () => required().getModelCard();

/** Per-provider aggregates over the whole cohort. Empty until notebook 60 §2d has run. */
export const getProviderStats = () => required().getProviderStats();
