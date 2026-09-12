import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { BRAND } from '@/brand';
import {
  COMORBIDITIES,
  EQ5D_DIMENSIONS,
  LIVING_ARRANGEMENTS,
  NOT_RECORDED_EXPLANATION,
  OKS_MCID,
  OKS_PARTS,
  PROVIDER_TYPE,
  RISK_BANDS,
  SEX_LABEL,
  SYMPTOM_PERIOD,
  comorbidityCoverage,
  formatDate,
  timeToSurgery,
} from '@/clinical';
import { CalibrationCurve } from '@/components/charts/CalibrationCurve';
import { CohortDistribution } from '@/components/charts/CohortDistribution';
import { ContributionChart } from '@/components/charts/ContributionChart';
import { IconArray } from '@/components/charts/IconArray';
import { RiskLadder } from '@/components/charts/RiskLadder';
import { ShapeFunction } from '@/components/charts/ShapeFunction';
import { SubscaleMeter } from '@/components/charts/SubscaleMeter';
import { ThresholdTradeoff } from '@/components/charts/ThresholdTradeoff';
import { DecisionForm } from '@/components/DecisionForm';
import { DecisionHistory } from '@/components/DecisionHistory';
import { RiskBadge } from '@/components/RiskBadge';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  NotRecorded,
  SectionHeading,
  Stat,
} from '@/components/ui/Primitives';
import { useAuth } from '@/hooks/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import {
  getCohortStats,
  getDecisions,
  getExplanation,
  getModelCard,
  getModelCurves,
  getPatient,
  getThresholdOptions,
  recordDecision,
  type PatientRow,
} from '@/services/patients';

/**
 * One patient, reviewable.
 *
 * The order of this page is the order of the questions a clinician asks, which is
 * the "right information, right format, right time" half of the five rights of
 * clinical decision support:
 *
 *   who is this  →  how likely  →  why  →  what would change it  →
 *   what do I actually know about them  →  can I trust the number  →  decide.
 *
 * The decision panel sits beside the score rather than at the bottom, because a
 * decision recorded after scrolling past six charts is a decision recorded by
 * somebody who has stopped reading.
 */
export function PatientPage() {
  const { episodeId = '' } = useParams();
  const { user } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [decisionNonce, setDecisionNonce] = useState(0);

  const patientState = useAsync(() => getPatient(episodeId), [episodeId]);
  const explanationState = useAsync(() => getExplanation(episodeId), [episodeId]);
  const decisionsState = useAsync(() => getDecisions(episodeId), [episodeId, decisionNonce]);

  // Model-level artefacts change per model version, not per patient, so they are
  // fetched together rather than as four separate waterfalls.
  const modelState = useAsync(
    () =>
      Promise.all([
        getCohortStats(),
        getModelCurves(),
        getThresholdOptions(),
        getModelCard(),
      ]),
    []
  );

  const onRecorded = useCallback(() => setDecisionNonce((n) => n + 1), []);

  if (patientState.loading) {
    return (
      <Card>
        <LoadingBlock label="Loading this patient" lines={8} />
      </Card>
    );
  }

  if (patientState.error) {
    return (
      <Card>
        <ErrorState
          what="This patient could not be loaded."
          detail={patientState.error}
          onRetry={patientState.reload}
        />
      </Card>
    );
  }

  const patient = patientState.data;

  if (!patient) {
    return (
      <Card>
        <EmptyState
          title="No patient with that episode id is available to you."
          detail="Either the id does not exist, or it belongs to a patient assigned to a different clinician. Access is decided by the row-level security policy on the data, so a link alone does not grant it."
        />
        <div className="px-6 pb-6 text-center">
          <Link to="/" className="text-small font-medium text-accent-text hover:underline">
            ← Back to your pre-operative list
          </Link>
        </div>
      </Card>
    );
  }

  const [cohortStats, curves, thresholds, modelCard] = modelState.data ?? [null, null, null, null];
  const riskBins = (cohortStats ?? []).filter((s) => s.metric === 'risk_poor_outcome');
  const calibration = (curves ?? []).filter((c) => c.curveType === 'calibration');
  const shapeRows = (curves ?? []).filter(
    (c) => c.curveType === 'shape' && c.series === selectedFeature
  );
  const selectedValue =
    selectedFeature === null
      ? undefined
      : (explanationState.data ?? []).find((r) => r.feature === selectedFeature)?.featureValue;

  const handleDecision = async (input: {
    decision: string;
    rationale: string;
    modelAgreement: string;
  }) => {
    await recordDecision({
      ...input,
      episodeId: patient.episodeId,
      clinicianId: user?.id ?? 'unknown',
      clinicianName: user?.name ?? 'Unknown clinician',
      // The score as shown, not as re-fetched. If the model is re-run between
      // this page loading and the decision saving, the record has to say what the
      // clinician was actually looking at.
      riskShown: patient.riskPoorOutcome.toFixed(4),
      modelVersion: patient.modelVersion,
    });
  };

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-block text-small font-medium text-accent-text hover:underline">
        ← Pre-operative list
      </Link>

      <PatientHeader patient={patient} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        {/* ---------------- left: the score and the reasoning ---------------- */}
        <div className="min-w-0 space-y-4">
          <Card>
            <SectionHeading
              title="How likely is a poor outcome?"
              hint={`Poor outcome means an Oxford Knee Score gain of ${OKS_MCID} points or fewer at six months — at or below the smallest change a patient reliably notices.`}
            />
            <div className="grid gap-5 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div className="space-y-4">
                <RiskBadge band={patient.riskBand} probability={patient.riskPoorOutcome} size="lg" />
                <IconArray
                  probability={patient.riskPoorOutcome}
                  band={patient.riskBand}
                  outcomeLabel="would not gain a clinically meaningful improvement"
                />
              </div>

              <div className="min-w-0 space-y-4">
                <RiskLadder probability={patient.riskPoorOutcome} band={patient.riskBand} />
                <p className="text-small text-muted">
                  The probability is calibrated, which means the number can be read at
                  face value. It is still a statement about a{' '}
                  <strong className="text-ink">group</strong> of similar patients, not a
                  verdict on this one — nothing here predicts what will happen to{' '}
                  {patient.displayName.split(' ')[0]}.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Where this patient sits"
              hint="Against everyone currently awaiting knee replacement."
            />
            <div className="p-4">
              {modelState.loading ? (
                <LoadingBlock label="Loading the cohort distribution" />
              ) : modelState.error ? (
                <ErrorState
                  what="The cohort distribution could not be loaded."
                  detail={modelState.error}
                  onRetry={modelState.reload}
                />
              ) : (
                <CohortDistribution
                  rows={riskBins}
                  value={patient.riskPoorOutcome * 100}
                  valueLabel="this patient"
                  title="Predicted risk across the waiting list"
                  higherIsWorse
                  markers={RISK_BANDS.slice(1).map((b) => ({
                    at: b.from * 100,
                    label: b.label.toLowerCase(),
                  }))}
                />
              )}
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Why this score"
              hint="The model's own additive terms. For a glassbox model the explanation is the model — there is no separate approximation to disagree with."
            />
            <div className="p-4">
              {explanationState.loading ? (
                <LoadingBlock label="Loading the explanation" lines={6} />
              ) : explanationState.error ? (
                <ErrorState
                  what="The explanation could not be loaded."
                  detail={explanationState.error}
                  onRetry={explanationState.reload}
                />
              ) : (
                <ContributionChart
                  rows={explanationState.data ?? []}
                  selectedFeature={selectedFeature ?? undefined}
                  onSelectFeature={(f) => setSelectedFeature(f === selectedFeature ? null : f)}
                />
              )}
            </div>
          </Card>

          {selectedFeature && (
            <Card>
              <SectionHeading
                title="What would change it"
                hint="How the model's contribution moves across the range of this factor, with this patient marked."
                actions={
                  <button
                    type="button"
                    onClick={() => setSelectedFeature(null)}
                    className="text-micro text-muted hover:text-ink"
                  >
                    close
                  </button>
                }
              />
              <div className="p-4">
                {modelState.loading ? (
                  <LoadingBlock label="Loading the shape function" />
                ) : (
                  <ShapeFunction rows={shapeRows} patientValue={selectedValue} />
                )}
              </div>
            </Card>
          )}

          <ClinicalDetail patient={patient} cohortStats={cohortStats ?? []} loading={modelState.loading} />
        </div>

        {/* ---------------- right: oversight ---------------- */}
        <div className="min-w-0 space-y-4">
          <Card>
            <SectionHeading
              title="Record your review"
              hint="Nothing is pre-selected. Agreeing and overriding take the same two clicks."
            />
            <DecisionForm patient={patient} onSubmit={handleDecision} onRecorded={onRecorded} />
          </Card>

          <Card>
            <SectionHeading
              title="Previous reviews"
              hint="Every decision recorded against this patient, newest first."
            />
            {decisionsState.loading ? (
              <LoadingBlock label="Loading previous reviews" lines={3} />
            ) : decisionsState.error ? (
              <ErrorState
                what="Previous reviews could not be loaded."
                detail={decisionsState.error}
                onRetry={decisionsState.reload}
              />
            ) : (
              <DecisionHistory
                decisions={decisionsState.data ?? []}
                currentModelVersion={patient.modelVersion}
                currentRisk={patient.riskPoorOutcome}
              />
            )}
          </Card>

          <Card as="div">
            <div className="border-l-4 border-warn-border bg-warn-tint p-4 text-small leading-relaxed text-warn-ink">
              <strong className="block">Decision support only.</strong>
              {BRAND.disclaimer.replace('Decision support only. ', '')}
            </div>
          </Card>
        </div>
      </div>

      {/* ---------------- full width: the model itself ---------------- */}
      <Card>
        <SectionHeading
          title="Can I trust this number?"
          hint={
            modelCard
              ? `${modelCard.modelType}, version ${modelCard.modelVersion}. Measured on ${modelCard.testSetSize.toLocaleString('en-GB')} held-out patients.`
              : 'Model performance and the operating point behind the risk bands.'
          }
        />
        {modelState.loading ? (
          <LoadingBlock label="Loading model performance" lines={5} />
        ) : modelState.error ? (
          <ErrorState
            what="Model performance could not be loaded."
            detail={modelState.error}
            onRetry={modelState.reload}
          />
        ) : (
          <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="space-y-4">
              <CalibrationCurve rows={calibration} />
              {modelCard && (
                <dl className="grid grid-cols-2 gap-4">
                  <Stat
                    label="Poor outcomes in the test set"
                    value={`${(modelCard.prevalence * 100).toFixed(1)}%`}
                    hint={`${modelCard.testSetSize.toLocaleString('en-GB')} patients. This is the rate you would predict knowing nothing about a patient.`}
                  />
                  <Stat
                    label="Average precision"
                    value={modelCard.averagePrecision.toFixed(3)}
                    hint={`Against a no-skill baseline of ${modelCard.prevalence.toFixed(3)}. Higher is better; 1.0 is perfect.`}
                  />
                </dl>
              )}
            </div>
            <div className="space-y-4">
              <ThresholdTradeoff rows={thresholds ?? []} />
              {modelCard?.limitations && (
                <div className="rounded border border-line bg-sunken p-3">
                  <h3 className="text-small font-semibold text-ink">Known limitations</h3>
                  <p className="mt-1 text-small text-muted">{modelCard.limitations}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Who this is, in one strip.
 *
 * The episode id is present but de-emphasised: it is the key an audit needs and
 * the thing a clinician least needs to read. The old header gave it the same
 * weight as the age band.
 */
function PatientHeader({ patient }: { patient: PatientRow }) {
  const sex = patient.sex ? (SEX_LABEL[patient.sex] ?? patient.sex) : undefined;
  const suppressed = patient.sex === 'not_recorded' || patient.ageBand === 'not_recorded';

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title font-semibold tracking-tight text-ink">
            {patient.displayName}
          </h1>
          <p className="mt-1 text-small text-muted">
            {patient.ageBand === 'not_recorded' ? 'Age band not recorded' : (patient.ageBand ?? '—')}
            {' · '}
            {sex ?? 'Sex not recorded'}
            {' · '}
            {patient.providerCode}
            {patient.providerType ? ` (${PROVIDER_TYPE[patient.providerType]})` : ''}
            {patient.region ? ` · ${patient.region}` : ''}
          </p>
          {suppressed && (
            <p className="mt-1 max-w-prose text-micro text-muted">{NOT_RECORDED_EXPLANATION}</p>
          )}
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <Stat
            label="Surgery scheduled"
            value={formatDate(patient.surgeryScheduledDate)}
            hint={timeToSurgery(patient.surgeryScheduledDate)}
          />
          <Stat
            label="Model"
            value={`v${patient.modelVersion}`}
            hint={patient.modelName}
          />
        </dl>
      </div>

      <p className="mt-3 border-t border-line pt-2 font-mono text-micro text-muted">
        episode {patient.episodeId}
      </p>
    </Card>
  );
}

/**
 * The clinical record the model was scored from.
 *
 * This is the section the previous build did not have at all, and its absence was
 * the most serious problem with it: a clinician was asked to agree or override a
 * risk score for a patient described by six facts. Everything here already
 * existed in `gold.knee_features` and simply was not carried across.
 */
function ClinicalDetail({
  patient,
  cohortStats,
  loading,
}: {
  patient: PatientRow;
  cohortStats: import('@/services/patients').CohortStatRow[];
  loading: boolean;
}) {
  const { present, absent, unrecorded } = comorbidityCoverage(patient);
  const medianFor = (metric: string) =>
    cohortStats.find((s) => s.metric === metric)?.cohortMedian;

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeading
          title="Oxford Knee Score, before surgery"
          hint="0-48, lower is worse. The single strongest driver of the score above — and three patients with the same total can be three different clinical problems."
        />
        <div className="space-y-3 p-4">
          {OKS_PARTS.map((part) => (
            <SubscaleMeter
              key={part.key}
              label={part.label}
              value={patient[part.key]}
              max={part.max}
              median={loading ? undefined : medianFor(part.metric)}
              items={part.items}
            />
          ))}
          <p className="pt-1 text-micro text-muted">
            Dashed tick is the median of everyone awaiting surgery. Subscales are the
            twelve OKS items grouped as pain (pain, night pain), function (washing,
            stairs, walking, standing, limping, kneeling) and daily activities (work,
            confidence, shopping, transport).
          </p>
        </div>

        {!loading && (
          <div className="border-t border-line p-4">
            <CohortDistribution
              rows={cohortStats.filter((s) => s.metric === 'oks_t0_score')}
              value={patient.oksT0Score}
              valueLabel={`${patient.oksT0Score}/48`}
              title="Total OKS across the waiting list"
              height={150}
            />
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionHeading
            title="Long-term conditions"
            hint={`${present.length} of the twelve NHS PROMs conditions recorded as present.`}
          />
          <div className="p-4">
            {unrecorded.length === COMORBIDITIES.length ? (
              <EmptyState
                title="The comorbidity section was not returned."
                detail="The model scored this patient with a count of zero. Treat that as missing information, not as an absence of conditions, and check the record before acting on the score."
              />
            ) : (
              <>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                  {COMORBIDITIES.map(({ key, label }) => {
                    const value = patient[key];
                    return (
                      <li key={key} className="flex items-baseline gap-2 text-small">
                        <span
                          aria-hidden="true"
                          className={`w-4 shrink-0 text-center font-mono ${
                            value === true ? 'text-risk-high' : 'text-muted'
                          }`}
                        >
                          {value === true ? '●' : value === false ? '○' : '?'}
                        </span>
                        <span className={value === true ? 'font-medium text-ink' : 'text-muted'}>
                          {label}
                        </span>
                        <span className="sr-only-text">
                          {value === true ? 'present' : value === false ? 'not present' : 'not recorded'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-micro text-muted">
                  ● present · ○ not present · ? not recorded.{' '}
                  {present.length} present, {absent.length} not present, {unrecorded.length} not
                  recorded, out of 12.
                </p>
              </>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeading
            title="EQ-5D-3L profile"
            hint="The patient's own description of their health on the day they completed the questionnaire."
          />
          <div className="p-4">
            {EQ5D_DIMENSIONS.every((d) => patient[d.key] === undefined) ? (
              <EmptyState
                title="No EQ-5D responses were recorded."
                detail="Two EQ-5D dimensions are model features. Where they are missing the model contributed nothing for them, rather than assuming no problems."
              />
            ) : (
              <dl className="space-y-2">
                {EQ5D_DIMENSIONS.map((dim) => {
                  const level = patient[dim.key];
                  return (
                    <div key={dim.key} className="flex flex-wrap items-baseline gap-x-2">
                      <dt className="w-36 shrink-0 text-small font-medium text-ink">
                        {dim.label}
                      </dt>
                      <dd className="flex-1 text-small text-muted">
                        {level === undefined ? (
                          <NotRecorded />
                        ) : (
                          <>
                            <span
                              aria-hidden="true"
                              className={`mr-1.5 font-mono ${
                                level === 3
                                  ? 'text-risk-very-high'
                                  : level === 2
                                    ? 'text-risk-moderate'
                                    : 'text-risk-low'
                              }`}
                            >
                              {'▮'.repeat(level)}
                              {'▯'.repeat(3 - level)}
                            </span>
                            <span className="text-ink">{dim.levels[level - 1]}</span>
                            <span className="text-muted"> (level {level} of 3)</span>
                          </>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeading
          title="Pre-operative context"
          hint="What decides whether 'optimise before surgery' is an actionable suggestion for this patient."
        />
        <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Symptom duration"
            value={
              patient.symptomPeriod === undefined ? (
                <NotRecorded />
              ) : (
                (SYMPTOM_PERIOD[patient.symptomPeriod] ?? `code ${patient.symptomPeriod}`)
              )
            }
          />
          <Stat
            label="Previous surgery on this knee"
            value={boolLabel(patient.previousSurgery)}
          />
          <Stat label="Recorded disability" value={boolLabel(patient.disability)} />
          <Stat
            label="Living arrangements"
            value={
              patient.livingArrangements === undefined ? (
                <NotRecorded />
              ) : (
                (LIVING_ARRANGEMENTS[patient.livingArrangements] ??
                  `code ${patient.livingArrangements}`)
              )
            }
            hint="Bears on discharge planning and on how realistic a pre-habilitation programme is."
          />
          <Stat
            label="Questionnaire completed with help"
            value={boolLabel(patient.assistedCompletion)}
            hint="Where true, the self-reported scores above were not entered unaided."
          />
          <Stat
            label="Conditions recorded"
            value={`${patient.comorbidityCount}`}
            unit="of 12"
          />
        </dl>
      </Card>
    </div>
  );
}

function boolLabel(value: boolean | undefined) {
  if (value === undefined) return <NotRecorded />;
  return value ? 'Yes' : 'No';
}
