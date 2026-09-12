import { EmptyState } from '@/components/ui/Primitives';
import type { DecisionRow } from '@/services/patients';

const DECISION_LABEL: Record<string, string> = {
  proceed: 'Proceed as planned',
  optimise_first: 'Optimise before surgery',
  discuss_alternatives: 'Discuss alternatives',
  defer: 'Defer decision',
};

function formatWhen(d: Date | string): string {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * What has already been decided about this patient, and by whom.
 *
 * `getDecisions()` existed in the data layer and was never called, which made the
 * oversight log write-only: a clinician could add to it but never read it. That
 * is a real clinical safety gap rather than a missing feature — the second
 * clinician to open a patient had no way to know a colleague had already
 * reviewed them, why, or whether they had overridden the model.
 *
 * Each entry carries the score **as shown at the time** and the model version it
 * was shown under, so a decision made against v3 does not silently appear to have
 * been made against v4. When those differ from the current score, the entry says
 * so — a colleague's reasoning about a 47% patient is different evidence once the
 * same patient scores 31%.
 */
export function DecisionHistory({
  decisions,
  currentModelVersion,
  currentRisk,
}: {
  decisions: DecisionRow[];
  currentModelVersion: string;
  currentRisk: number;
}) {
  if (decisions.length === 0) {
    return (
      <EmptyState
        title="No decision has been recorded for this patient yet."
        detail="A score with no recorded decision is a model acting alone. Recording one below is what makes this decision support."
      />
    );
  }

  return (
    <ol className="divide-y divide-line">
      {decisions.map((d) => {
        const overridden = d.modelAgreement === 'overridden';
        const shown = Number(d.riskShown);
        const staleVersion = d.modelVersion !== currentModelVersion;
        const movedScore = Number.isFinite(shown) && Math.abs(shown - currentRisk) >= 0.02;

        return (
          <li key={d.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-small font-semibold text-ink">
                {DECISION_LABEL[d.decision] ?? d.decision}
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 text-micro font-medium ${
                  overridden
                    ? 'border-risk-high bg-risk-high-tint text-risk-high'
                    : 'border-line bg-sunken text-muted'
                }`}
              >
                {overridden ? 'overrode the model' : 'agreed with the model'}
              </span>
              <span className="ml-auto text-micro text-muted">{formatWhen(d.decidedAt)}</span>
            </div>

            <p className="mt-1 text-small text-ink">{d.rationale}</p>

            <p className="mt-1.5 text-micro text-muted">
              {d.clinicianName} · score shown{' '}
              {Number.isFinite(shown) ? `${(shown * 100).toFixed(1)}%` : d.riskShown} · model
              v{d.modelVersion}
              {(staleVersion || movedScore) && (
                <span className="ml-1 text-warn-ink">
                  · this patient now scores {(currentRisk * 100).toFixed(1)}% under v
                  {currentModelVersion}
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
