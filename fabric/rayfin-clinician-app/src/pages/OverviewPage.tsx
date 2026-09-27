import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { RISK_BANDS, formatDate, timeToSurgery } from '@/clinical';
import { BandDistribution } from '@/components/charts/BandDistribution';
import { CalibrationCurve } from '@/components/charts/CalibrationCurve';
import { CohortDistribution } from '@/components/charts/CohortDistribution';
import { DriverFrequency } from '@/components/charts/DriverFrequency';
import { OperatingPointExplorer } from '@/components/charts/OperatingPointExplorer';
import { SegmentedBar } from '@/components/charts/SegmentedBar';
import { SurgeryTimeline } from '@/components/charts/SurgeryTimeline';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, Chip, ErrorState, LoadingBlock, SectionHeading, Stat } from '@/components/ui/Primitives';
import { useAsync } from '@/hooks/useAsync';
import {
  getCohortStats,
  getModelCard,
  getModelCurves,
  getThresholdOptions,
  listDecisions,
  listExplanations,
  listPatients,
} from '@/services/patients';

const DECISION_LABEL: Record<string, string> = {
  proceed: 'Proceed as planned',
  optimise_first: 'Optimise before surgery',
  discuss_alternatives: 'Discuss alternatives',
  defer: 'Defer decision',
};

/**
 * The service view: what is on the list, what is coming to theatre, what the
 * model is flagging and why, how the cut-off behaves, and whether the number
 * can be trusted — before any single patient is opened.
 *
 * Two kinds of data sit side by side and the page keeps them apart. Anything
 * about *your* patients is read through the row-level security policy and is
 * labelled "your list". Anything about the *cohort* — histograms, provider
 * aggregates, the sweep, the calibration curve — is model-scoped, has no
 * patient in it, and is labelled as such.
 */
export function OverviewPage() {
  const state = useAsync(
    () =>
      Promise.all([
        listPatients(),
        listExplanations(),
        listDecisions(),
        getCohortStats(),
        getThresholdOptions(),
        getModelCard(),
        getModelCurves(),
      ]),
    []
  );

  const [patients, explanations, decisions, cohortStats, thresholds, modelCard, curves] =
    state.data ?? [[], [], [], [], [], null, []];

  const now = useMemo(() => new Date(), []);

  const threshold = modelCard?.operatingThreshold ?? thresholds.find((t) => t.isChosen)?.threshold ?? 0.4;
  const flagged = patients.filter((p) => p.riskPoorOutcome >= threshold);
  const withinFortnight = patients.filter((p) => {
    const d = new Date(p.surgeryScheduledDate).getTime();
    return d >= now.getTime() - 86_400_000 && d <= now.getTime() + 14 * 86_400_000;
  });
  const reviewedIds = new Set(decisions.map((d) => d.episodeId));
  const reviewed = patients.filter((p) => reviewedIds.has(p.episodeId));
  const overrides = decisions.filter((d) => d.modelAgreement === 'overridden').length;
  const flaggedUnreviewed = flagged.filter((p) => !reviewedIds.has(p.episodeId));

  const bandCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of patients) out[p.riskBand] = (out[p.riskBand] ?? 0) + 1;
    return out;
  }, [patients]);

  const riskBins = cohortStats.filter((s) => s.metric === 'risk_poor_outcome');
  const calibration = curves.filter((c) => c.curveType === 'calibration');

  if (state.error) {
    return (
      <Card>
        <ErrorState what="The overview could not be loaded." detail={state.error} onRetry={state.reload} />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rise flex flex-wrap items-end justify-between gap-4" style={{ '--i': 0 } as React.CSSProperties}>
        <div>
          <div className="eyebrow mb-2">Service view · {formatDate(now)}</div>
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink">
            Your pre-operative list
          </h1>
          <p className="mt-2 max-w-[60ch] text-small text-muted">
            Patients awaiting knee replacement who are assigned to you, and where they sit
            against the whole service. Everything about your patients passed the row-level
            security policy before it left Fabric.
          </p>
        </div>
        {modelCard && (
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-small">
            <div>
              <dt className="eyebrow">Model</dt>
              <dd className="mt-0.5 flex items-center gap-2 text-ink">
                <Chip tone="accent">{modelCard.modelName}@v{modelCard.modelVersion}</Chip>
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Scored</dt>
              <dd className="mt-0.5 text-ink">{formatDate(modelCard.scoredAt)}</dd>
            </div>
            <div>
              <dt className="eyebrow">Cut-off in use</dt>
              <dd className="mt-0.5 tnum text-ink">{threshold.toFixed(2)}</dd>
            </div>
          </dl>
        )}
      </header>

      {/* ---------------- headline figures ---------------- */}
      <Card className="rise" style={{ '--i': 1 } as React.CSSProperties}>
        {state.loading ? (
          <LoadingBlock label="Loading your list" lines={2} />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="On your list" value={patients.length} unit="patients" hint="Assigned to you and awaiting surgery." />
            <Stat
              label="Flagged for review"
              value={flagged.length}
              unit={`at ≥ ${threshold.toFixed(2)}`}
              tone="clay"
              hint={`${flaggedUnreviewed.length} of them ${flaggedUnreviewed.length === 1 ? 'has' : 'have'} no recorded decision yet.`}
            />
            <Stat
              label="Theatre in 14 days"
              value={withinFortnight.length}
              unit="patients"
              tone="ochre"
              hint={`${withinFortnight.filter((p) => p.riskBand === 'high' || p.riskBand === 'very_high').length} in the high or very high band.`}
            />
            <Stat
              label="Reviewed"
              value={reviewed.length}
              unit={`of ${patients.length}`}
              tone="accent"
              hint="Patients with at least one recorded decision."
            />
            <Stat
              label="Overrides"
              value={decisions.length ? `${Math.round((overrides / decisions.length) * 100)}%` : '—'}
              unit={decisions.length ? `of ${decisions.length} decisions` : 'no decisions yet'}
              hint="Disagreement with the model is the cheapest drift signal there is."
            />
          </dl>
        )}
      </Card>

      {/* ---------------- time and triage ---------------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="rise" style={{ '--i': 2 } as React.CSSProperties}>
          <SectionHeading eyebrow="Your list" title="Surgeries ahead" hint="Week by week, stacked by risk band. This week is shaded." />
          <div className="p-5">
            {state.loading ? <LoadingBlock label="Loading the timeline" lines={4} /> : <SurgeryTimeline patients={patients} now={now} />}
          </div>
        </Card>

        <Card className="rise" style={{ '--i': 3 } as React.CSSProperties}>
          <SectionHeading eyebrow="Your list" title="Triage and oversight" hint="Bands are policy thresholds on the calibrated probability." />
          <div className="space-y-5 p-5">
            {state.loading ? (
              <LoadingBlock label="Loading the band split" lines={3} />
            ) : (
              <>
                <BandDistribution counts={bandCounts} total={patients.length} reviewed={reviewed.length} />
                <div>
                  <p className="mb-2 text-small font-medium text-ink">Review status</p>
                  <SegmentedBar
                    label="Review status"
                    total={patients.length}
                    segments={[
                      { key: 'reviewed', label: 'reviewed', n: reviewed.length, fill: 'var(--mf-chart-accent)' },
                      { key: 'pending', label: 'no decision yet', n: patients.length - reviewed.length, fill: 'var(--mf-chart-neutral)' },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-small font-medium text-ink">Your decisions against the model</p>
                  <SegmentedBar
                    label="Agreement"
                    total={decisions.length}
                    segments={[
                      { key: 'agreed', label: 'score matched assessment', n: decisions.length - overrides, fill: 'var(--mf-risk-low-mark)' },
                      { key: 'overridden', label: 'overrode the model', n: overrides, fill: 'var(--mf-chart-increase)' },
                    ]}
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ---------------- what the model is saying ---------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rise" style={{ '--i': 4 } as React.CSSProperties}>
          <SectionHeading eyebrow="Whole cohort" title="Predicted risk across the waiting list" hint="Every patient awaiting surgery, not only yours. Band boundaries drawn at their true positions." />
          <div className="p-5">
            {state.loading ? (
              <LoadingBlock label="Loading the cohort distribution" lines={4} />
            ) : (
              <CohortDistribution
                rows={riskBins}
                valueLabel=""
                title="Predicted risk across the waiting list"
                higherIsWorse
                markers={RISK_BANDS.slice(1).map((b) => ({ at: b.from * 100, label: b.label.toLowerCase() }))}
              />
            )}
          </div>
        </Card>

        <Card className="rise" style={{ '--i': 5 } as React.CSSProperties}>
          <SectionHeading eyebrow="Your list" title="What is driving the flags" hint="The model's leading risk-raising terms, counted across your patients." />
          <div className="p-5">
            {state.loading ? (
              <LoadingBlock label="Loading drivers" lines={4} />
            ) : (
              <DriverFrequency explanations={explanations} patientCount={patients.length} />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rise" style={{ '--i': 6 } as React.CSSProperties}>
          <SectionHeading eyebrow="The model" title="What is producing these scores" hint="Enough to decide whether to trust it — the full explanation is one click away." />
          <div className="space-y-4 p-5">
            {state.loading ? (
              <LoadingBlock label="Loading the model card" lines={4} />
            ) : (
              <>
                <p className="max-w-[62ch] text-small text-muted">
                  A calibrated{' '}
                  <strong className="text-ink">Explainable Boosting Machine</strong>: it learns one
                  curve per factor and adds them up, so the bars on a patient page are the
                  arithmetic of the score rather than a picture of it. Calibrated means{' '}
                  {modelCard ? `${(modelCard.prevalence * 100).toFixed(0)}%` : 'a percentage'} can be
                  read at face value — of 100 similar patients, about that many will not gain a
                  meaningful improvement.
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                  <Stat size="md" label="Trained to predict" value={<span className="text-lead">OKS gain ≤ 7</span>} hint="At six months — below the smallest change a patient notices." />
                  <Stat size="md" label="Average precision" value={modelCard ? modelCard.averagePrecision.toFixed(3) : '—'} tone="accent" hint={modelCard ? `Against ${modelCard.prevalence.toFixed(3)} for flagging at random.` : undefined} />
                  <Stat size="md" label="Measured on" value={modelCard ? modelCard.testSetSize.toLocaleString('en-GB') : '—'} unit="patients" hint="Held out from training entirely." />
                  <Stat size="md" label="Interpretability" value={<span className="text-lead">Glassbox</span>} hint="A deployment requirement here, not a preference." />
                </dl>
                <Link
                  to="/model"
                  className="inline-block rounded-md border border-line bg-elevated px-3 py-1.5 text-small font-medium text-accent-text transition-colors hover:bg-accent-tint"
                >
                  How this works, in plain language →
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card className="rise" style={{ '--i': 7 } as React.CSSProperties}>
          <SectionHeading eyebrow="Service policy" title="Move the cut-off" hint="What each operating point costs, in patients per 1,000 — and on your list." />
          {state.loading ? <LoadingBlock label="Loading the sweep" lines={4} /> : <OperatingPointExplorer options={thresholds} patients={patients} />}
        </Card>
      </div>

      {/* ---------------- trust and recent oversight ---------------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="rise" style={{ '--i': 8 } as React.CSSProperties}>
          <SectionHeading
            eyebrow="Model card"
            title="Can the number be trusted?"
            hint={
              modelCard
                ? `${modelCard.modelType}, version ${modelCard.modelVersion}. Measured on ${modelCard.testSetSize.toLocaleString('en-GB')} held-out patients.`
                : 'Model performance behind the risk scores.'
            }
          />
          <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {state.loading ? (
              <LoadingBlock label="Loading calibration" lines={5} />
            ) : (
              <>
                <CalibrationCurve rows={calibration} />
                {modelCard && (
                  <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-5">
                    <Stat label="Poor outcomes, test set" value={`${(modelCard.prevalence * 100).toFixed(1)}%`} hint="The rate you would predict knowing nothing about a patient." />
                    <Stat label="Average precision" value={modelCard.averagePrecision.toFixed(3)} hint={`Against a no-skill baseline of ${modelCard.prevalence.toFixed(3)}.`} />
                    <Stat label="Calibration error" value={modelCard.calibrationError !== undefined ? `${(modelCard.calibrationError * 100).toFixed(1)}` : '—'} unit="pts" hint="Mean gap between stated and observed risk across deciles." />
                    <Stat label="Outcome" value={<span className="text-lead">OKS gain ≤ 7</span>} hint="At six months — at or below the minimal clinically important difference." />
                    {modelCard.limitations && (
                      <div className="col-span-2 rounded-lg border border-line bg-sunken p-3">
                        <p className="text-small font-semibold text-ink">Known limitations</p>
                        <p className="mt-1 text-small text-muted">{modelCard.limitations}</p>
                      </div>
                    )}
                  </dl>
                )}
              </>
            )}
          </div>
        </Card>

        <Card className="rise" style={{ '--i': 9 } as React.CSSProperties}>
          <SectionHeading eyebrow="Oversight record" title="Recent decisions" hint="Newest first. Each is stored with the score and model version the clinician saw." />
          {state.loading ? (
            <LoadingBlock label="Loading decisions" lines={4} />
          ) : decisions.length === 0 ? (
            <p className="p-5 text-small text-muted">No decisions have been recorded yet. A score with no decision is a model acting alone.</p>
          ) : (
            <ol className="divide-y divide-line">
              {decisions.slice(0, 6).map((d) => {
                const patient = patients.find((p) => p.episodeId === d.episodeId);
                const overridden = d.modelAgreement === 'overridden';
                return (
                  <li key={d.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3">
                    <Link to={`/patient/${encodeURIComponent(d.episodeId)}`} className="font-medium text-accent-text hover:underline">
                      {patient?.displayName ?? d.episodeId}
                    </Link>
                    <span className="text-small text-ink">{DECISION_LABEL[d.decision] ?? d.decision}</span>
                    <Chip tone={overridden ? 'danger' : 'neutral'}>{overridden ? 'override' : 'agreed'}</Chip>
                    {patient && <RiskBadge band={patient.riskBand} probability={patient.riskPoorOutcome} />}
                    <span className="ml-auto text-micro text-muted">
                      {formatDate(d.decidedAt)} · {d.clinicianName}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {!state.loading && flaggedUnreviewed.length > 0 && (
            <div className="border-t border-line px-5 py-3 text-small text-muted">
              Flagged and not yet reviewed:{' '}
              {flaggedUnreviewed.slice(0, 4).map((p, i) => (
                <span key={p.episodeId}>
                  {i > 0 && ', '}
                  <Link to={`/patient/${encodeURIComponent(p.episodeId)}`} className="text-accent-text hover:underline">
                    {p.displayName}
                  </Link>
                  <span className="text-micro"> ({timeToSurgery(p.surgeryScheduledDate, now)})</span>
                </span>
              ))}
              {flaggedUnreviewed.length > 4 && ` and ${flaggedUnreviewed.length - 4} more`}.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
