import {
  fixtureCohortStats,
  fixtureDecisions,
  fixtureExplanation,
  fixtureModelCard,
  fixtureModelCurves,
  fixturePatients,
  fixtureThresholdOptions,
} from './fixtures';
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

/** A short delay on every read, so loading skeletons are exercised rather than theoretical. */
const LATENCY_MS = 180;

function delayed<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

/**
 * The offline demonstration backend: fixtures, no network, no tenant.
 *
 * This exists for two reasons, and only one of them is convenience.
 *
 * 1. The app was previously impossible to run, review or test without a live
 *    Fabric workspace and an Entra sign-in. A clinical UI nobody can open is a
 *    clinical UI nobody reviews.
 * 2. It is the break-glass path for a live demonstration. A venue network is not
 *    a dependency you get to control.
 *
 * `isOffline` is true, and the UI turns that into a banner on every screen. The
 * one failure mode worth engineering against here is a demo that shows invented
 * patients while looking exactly like the real thing.
 *
 * Recorded decisions accumulate in memory for the session. They are not
 * persisted, because a fixture that survives a reload would be indistinguishable
 * from a governed record, which is precisely the confusion this app exists to
 * prevent.
 */
export class OfflineDataService implements ClinicalDataService {
  readonly isOffline = true;

  private readonly decisions: DecisionRow[] = [...fixtureDecisions];

  listPatients(): Promise<PatientRow[]> {
    return delayed([...fixturePatients].sort((a, b) => b.riskPoorOutcome - a.riskPoorOutcome));
  }

  getPatient(episodeId: string): Promise<PatientRow | null> {
    return delayed(fixturePatients.find((p) => p.episodeId === episodeId) ?? null);
  }

  getExplanation(episodeId: string): Promise<ExplanationRow[]> {
    return delayed(fixtureExplanation(episodeId));
  }

  getDecisions(episodeId: string): Promise<DecisionRow[]> {
    return delayed(
      this.decisions
        .filter((d) => d.episodeId === episodeId)
        .sort((a, b) => b.decidedAt.getTime() - a.decidedAt.getTime())
    );
  }

  async recordDecision(input: DecisionInput): Promise<void> {
    await delayed(null);
    this.decisions.push({
      id: `dec-local-${this.decisions.length + 1}`,
      episodeId: input.episodeId,
      clinicianName: input.clinicianName,
      decision: input.decision,
      rationale: input.rationale,
      modelAgreement: input.modelAgreement,
      riskShown: input.riskShown,
      modelVersion: input.modelVersion,
      decidedAt: new Date(),
    });
  }

  getCohortStats(): Promise<CohortStatRow[]> {
    return delayed(fixtureCohortStats);
  }

  getModelCurves(): Promise<ModelCurveRow[]> {
    return delayed(fixtureModelCurves);
  }

  getThresholdOptions(): Promise<ThresholdOptionRow[]> {
    return delayed(fixtureThresholdOptions);
  }

  getModelCard(): Promise<ModelCardRow | null> {
    return delayed(fixtureModelCard);
  }
}
