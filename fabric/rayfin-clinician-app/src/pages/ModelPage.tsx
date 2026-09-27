import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { OKS_MCID, formatDate } from '@/clinical';
import { CalibrationCurve } from '@/components/charts/CalibrationCurve';
import { ThresholdTradeoff } from '@/components/charts/ThresholdTradeoff';
import { Card, Chip, ErrorState, LoadingBlock, SectionHeading, Stat } from '@/components/ui/Primitives';
import { useAsync } from '@/hooks/useAsync';
import { getModelCard, getModelCurves, getThresholdOptions } from '@/services/patients';

/**
 * How this works — the plain-language explanation of the model.
 *
 * The app previously told a clinician the model was called
 * `knee-poor-outcome-ebm@v4` and that its output was calibrated, and left it
 * there. That is a name and an assertion, not an explanation. Under the AI Act
 * a high-risk system owes its users enough understanding to exercise
 * meaningful oversight, and under GDPR Art. 22 a patient is owed a meaningful
 * account of an automated decision — neither is satisfied by a version string.
 *
 * Two rules for the writing here:
 *
 * 1. **No jargon without its plain-English meaning attached.** "Calibrated",
 *    "average precision", "log-odds" and "isotonic" all appear, because a
 *    clinician who wants to challenge the model needs the real vocabulary — but
 *    each arrives with a sentence saying what it means.
 * 2. **Nothing is claimed that the pipeline does not do.** Every number comes
 *    from the model card in governed data; every methodology statement matches
 *    `40_train_register`. Where the honest answer is "we do not know", it says
 *    so — see "What this model cannot do".
 */
export function ModelPage() {
  const state = useAsync(
    () => Promise.all([getModelCard(), getModelCurves(), getThresholdOptions()]),
    []
  );
  const [card, curves, thresholds] = state.data ?? [null, [], []];
  const calibration = (curves ?? []).filter((c) => c.curveType === 'calibration');

  return (
    <div className="space-y-6">
      <header className="rise max-w-[70ch]" style={{ '--i': 0 } as React.CSSProperties}>
        <div className="eyebrow mb-2">How this works</div>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink">
          What the model does, and what it does not
        </h1>
        <p className="mt-3 text-lead text-muted">
          Written for a clinician who has not seen the code and has no reason to trust it
          yet. If something here does not convince you, that is the correct response — the
          decision on the patient page is yours, and disagreeing with the model is a
          first-class outcome it records.
        </p>
      </header>

      {state.error ? (
        <Card>
          <ErrorState what="The model card could not be loaded." detail={state.error} onRetry={state.reload} />
        </Card>
      ) : state.loading ? (
        <Card>
          <LoadingBlock label="Loading the model card" lines={6} />
        </Card>
      ) : (
        <>
          {/* ------------------------------------------------ 1. the question */}
          <Card className="rise" style={{ '--i': 1 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="1 — The question it answers"
              title="Will this operation leave the patient meaningfully better off?"
            />
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Prose>
                <p>
                  Every patient on your list fills in the Oxford Knee Score before surgery: twelve
                  questions about pain and daily function, scored from 0 to 48, where lower is worse.
                  Six months after the operation they fill in the same twelve questions again.
                </p>
                <p>
                  The difference between those two scores is what this model is about. If the score
                  improves by <strong className="text-ink">more than {OKS_MCID} points</strong>, the
                  patient noticed. If it improves by {OKS_MCID} points or fewer, they generally did
                  not — that threshold is the <em>minimal clinically important difference</em>, the
                  smallest change a patient can reliably feel, and it is an established property of
                  the instrument rather than something chosen for this project.
                </p>
                <p>
                  The model estimates the probability of that second outcome, which the app calls a{' '}
                  <strong className="text-ink">poor outcome</strong>. It is not predicting death,
                  complications, or surgical failure. A patient can have a technically perfect
                  operation and still be in this group.
                </p>
                <p className="text-muted">
                  It uses only what is known <strong className="text-ink">before</strong> surgery.
                  Nothing from the operation or afterwards is available to it, which is what makes it
                  useful in clinic and also what caps how well it can ever do.
                </p>
              </Prose>
              <aside className="rounded-lg border border-line bg-sunken p-4">
                <div className="eyebrow mb-2">In one line</div>
                <p className="text-small text-ink">
                  "Out of 100 patients who look like this one before surgery, how many will not feel
                  meaningfully better six months later?"
                </p>
                <p className="mt-3 text-micro text-muted">
                  That is the whole claim. Everything else on this page is about how much to trust
                  the number, and what it leaves out.
                </p>
              </aside>
            </div>
          </Card>

          {/* ------------------------------------------------ 2. reading the number */}
          <Card className="rise" style={{ '--i': 2 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="2 — Reading the number"
              title="Why 34% really means about 34 in 100"
              hint="The property that makes the score usable is calibration, and it is measurable rather than asserted."
            />
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <Prose>
                <p>
                  Many risk scores produce a number that ranks patients correctly but whose face
                  value means nothing — a "0.7" that actually corresponds to a one-in-three chance.
                  Acting on such a number as though it were a percentage is a well-known way to be
                  badly wrong.
                </p>
                <p>
                  This model is <strong className="text-ink">calibrated</strong>, which means the
                  number has been checked against reality: among the held-out patients the model
                  scored at roughly 34%, roughly 34 in 100 did go on to have a poor outcome. The
                  chart beside this shows that check across the whole range.
                </p>
                <p>
                  Calibration was not free. The model was trained first, then its raw scores were
                  corrected using a technique called <em>isotonic regression</em> on data it had not
                  seen. That step improves the honesty of the number without changing who the model
                  ranks as higher or lower risk.
                </p>
                <p className="rounded-lg border-l-4 border-warn-border bg-warn-tint p-3 text-warn-ink">
                  <strong>The important caveat.</strong> Calibration is a property of{' '}
                  <em>groups</em>, not of individuals. A well-calibrated model still cannot tell you
                  which 34 of the 100 they will be. Nothing here predicts what will happen to the
                  patient in front of you.
                </p>
              </Prose>
              <div>
                <CalibrationCurve rows={calibration} />
              </div>
            </div>
          </Card>

          {/* ------------------------------------------------ 3. how it works */}
          <Card className="rise" style={{ '--i': 3 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="3 — How it works"
              title="A sum of simple curves, not a black box"
              hint="This is the reason you can argue with it."
            />
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Prose>
                <p>
                  The model is an <strong className="text-ink">Explainable Boosting Machine</strong>.
                  Despite the name it is close in spirit to something very old and very readable: it
                  learns one curve per factor — one for the pre-operative Oxford Knee Score, one for
                  the number of long-term conditions, one for how long symptoms have lasted, and so
                  on — and then adds them up.
                </p>
                <p>
                  To score a patient it reads each of that patient's values off the matching curve,
                  adds the results to a baseline, and converts the total into a probability. That is
                  the entire calculation.
                </p>
                <p>
                  Which is why the bars on the patient page are not an approximation of the model.{' '}
                  <strong className="text-ink">They are the model.</strong> Each bar is one curve's
                  contribution for that patient, and the bars plus the baseline add up to exactly the
                  score shown. Selecting a factor draws its whole curve, with the patient marked on
                  it, so you can see what a different value would have contributed.
                </p>
                <p>
                  This matters more than accuracy. A clinician can look at a curve and say "that is
                  wrong, and here is why" — and the decision they record then carries a reason. With
                  a model that cannot show its reasoning there is nothing to disagree <em>with</em>,
                  and oversight becomes a signature.
                </p>
              </Prose>
              <aside className="space-y-3">
                <div className="rounded-lg border border-line bg-sunken p-4">
                  <div className="eyebrow mb-2">The arithmetic</div>
                  <p className="font-mono text-micro leading-relaxed text-ink">
                    baseline
                    <br />+ curve(pre-op OKS)
                    <br />+ curve(conditions)
                    <br />+ curve(symptom duration)
                    <br />+ …
                    <br />
                    <span className="text-muted">──────────────</span>
                    <br />= the score
                  </p>
                </div>
                <p className="text-micro text-muted">
                  Because the terms simply add, removing one, or disagreeing with one, has an effect
                  you can read off the screen rather than having to re-run anything.
                </p>
              </aside>
            </div>
          </Card>

          {/* ------------------------------------------------ 4. alternatives */}
          <Card className="rise" style={{ '--i': 4 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="4 — What else was tried"
              title="Three models were trained. The most interpretable one ships."
              hint="Accuracy was not the deciding criterion, and that was a deliberate choice."
            />
            <div className="space-y-4 p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-small">
                  <thead className="border-b border-line text-micro uppercase tracking-[0.08em] text-muted">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-semibold">Model</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Role</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Can it show its reasoning?</th>
                      <th scope="col" className="py-2 font-semibold">Why it was or was not chosen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line align-top">
                    <tr>
                      <td className="py-3 pr-4 font-medium text-ink">Logistic regression</td>
                      <td className="py-3 pr-4"><Chip>baseline</Chip></td>
                      <td className="py-3 pr-4 text-ink">Yes — one weight per factor</td>
                      <td className="py-3 text-muted">
                        The sanity check. It assumes every factor pushes risk in a straight line,
                        which is not how the Oxford Knee Score behaves at the extremes. Kept as the
                        floor that anything more complex has to clear.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium text-ink">Random forest</td>
                      <td className="py-3 pr-4"><Chip tone="warn">challenger</Chip></td>
                      <td className="py-3 pr-4 text-ink">No — reasoning must be reconstructed after the fact</td>
                      <td className="py-3 text-muted">
                        Hundreds of decision trees voting. Often competitive, and kept precisely to
                        make the comparison honest — but its explanation is a separate approximation
                        of the model rather than the model itself, which is a gap a regulator can ask
                        about and nobody can close.
                      </td>
                    </tr>
                    <tr className="bg-accent-soft">
                      <td className="py-3 pr-4 font-medium text-ink">Explainable Boosting Machine</td>
                      <td className="py-3 pr-4"><Chip tone="accent">in use</Chip></td>
                      <td className="py-3 pr-4 text-ink">Yes — the explanation is the model</td>
                      <td className="py-3 text-muted">
                        Learns a curve per factor, so it captures the non-linear behaviour the
                        straight-line model misses while staying readable. Then calibrated, so the
                        probability can be taken at face value. This is the one that ships.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="max-w-[80ch] text-small text-muted">
                If the random forest had clearly outperformed the EBM, the honest thing would be to
                say so on this page rather than hide it. Interpretability is treated as a{' '}
                <strong className="text-ink">deployment requirement</strong> for this use, not a
                tie-breaker: a model that cannot be challenged cannot be overseen, and a system that
                cannot be overseen should not be scoring patients.
              </p>
            </div>
          </Card>

          {/* ------------------------------------------------ 5. how it is judged */}
          <Card className="rise" style={{ '--i': 5 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="5 — How it is judged"
              title="Why accuracy is the wrong measure here"
            />
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Prose>
                <p>
                  Roughly {card ? `${(card.prevalence * 100).toFixed(0)} in 100` : 'one in five'}{' '}
                  patients in the held-out data had a poor outcome. A model that ignored every
                  patient and simply predicted "good outcome" for everybody would therefore be right
                  about {card ? (100 - card.prevalence * 100).toFixed(0) : '80'}% of the time — and
                  would identify nobody who might benefit from being optimised first. Accuracy
                  rewards exactly the wrong behaviour when one outcome is much rarer than the other.
                </p>
                <p>
                  So the headline measure is <strong className="text-ink">average precision</strong>:
                  of the patients the model flags, what share genuinely do have a poor outcome, across
                  every possible cut-off. The number to compare it against is the rate you would get
                  by flagging patients at random, which is the prevalence itself.
                </p>
                <p className="text-muted">
                  Before any version can be deployed it has to pass four automated checks: it must
                  beat that random baseline by a clear margin, its calibration error must be under
                  5%, it must still catch a usable share of poor outcomes at a strict cut-off, and it
                  must be an interpretable model family. A version that fails any of them is blocked
                  from promotion — and passing still leaves it requiring a named clinical reviewer
                  before it is marked approved.
                </p>
              </Prose>
              {card && (
                <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-5">
                  <Stat
                    size="md"
                    label="Average precision"
                    value={card.averagePrecision.toFixed(3)}
                    tone="accent"
                    hint={`Against ${card.prevalence.toFixed(3)} for flagging at random. Higher is better; 1.0 is perfect.`}
                  />
                  <Stat
                    size="md"
                    label="Poor outcomes in test set"
                    value={`${(card.prevalence * 100).toFixed(1)}%`}
                    hint={`${card.testSetSize.toLocaleString('en-GB')} patients the model never saw during training.`}
                  />
                  <Stat
                    size="md"
                    label="Calibration error"
                    value={card.calibrationError !== undefined ? (card.calibrationError * 100).toFixed(1) : '—'}
                    unit="pts"
                    hint="Average gap between the stated risk and what actually happened."
                  />
                  <Stat
                    size="md"
                    label="Version in use"
                    value={`v${card.modelVersion}`}
                    hint={`Scored ${formatDate(card.scoredAt)}. Every decision is stored against the version that produced it.`}
                  />
                </dl>
              )}
            </div>
          </Card>

          {/* ------------------------------------------------ 6. the cut-off */}
          <Card className="rise" style={{ '--i': 6 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="6 — The cut-off"
              title="Where the line is drawn is a service decision, not a model output"
              hint="Nothing in the data can decide it for you."
            />
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <Prose>
                <p>
                  The model produces a probability for every patient. Turning that into "flagged" or
                  "not flagged" requires choosing a threshold, and no amount of data can make that
                  choice: it depends on whether a missed poor outcome is worse than an unnecessary
                  conversation, and by how much. That is a clinical and operational judgement.
                </p>
                <p>
                  Lower the cut-off and you catch more of the patients who would do badly, at the
                  cost of flagging more who would have been fine. Raise it and the flags get more
                  reliable while more poor outcomes slip past unseen. The chart states both costs in
                  patients per 1,000 rather than in rates, because a rate is not a thing a service can
                  staff for.
                </p>
                <p className="text-muted">
                  The four risk bands on the worklist come from the same decision. They are a triage
                  convenience agreed with the service — not something the model discovered — which is
                  why the patient page always shows the underlying percentage alongside the band.
                </p>
              </Prose>
              <div>
                <ThresholdTradeoff rows={thresholds ?? []} />
              </div>
            </div>
          </Card>

          {/* ------------------------------------------------ 7. the NHS model */}
          <Card className="rise" style={{ '--i': 7 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="7 — A different model you may already know"
              title="This is not the NHS PROMs predicted score"
              hint="They answer different questions and are not interchangeable."
            />
            <div className="overflow-x-auto p-5">
              <table className="w-full text-left text-small">
                <thead className="border-b border-line text-micro uppercase tracking-[0.08em] text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-semibold" />
                    <th scope="col" className="py-2 pr-4 font-semibold">NHS PROMs predicted score</th>
                    <th scope="col" className="py-2 font-semibold">This model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line align-top">
                  {[
                    ['What it produces', 'An expected Oxford Knee Score at six months, on the 0–48 scale', 'A probability that the improvement will not be meaningful'],
                    ['Built for', 'Comparing hospitals, adjusting for the patients they treat', 'Identifying individual patients who may need optimising first'],
                    ['Who built it', 'NHS Digital, nationally validated and in use since 2013', 'This project, validated only on held-out data from the same source'],
                    ['Shape', 'A regression — assumes factors act in straight lines', 'A curve per factor, so non-linear behaviour is captured'],
                  ].map(([label, nhs, ours]) => (
                    <tr key={label}>
                      <th scope="row" className="py-3 pr-4 text-left font-medium text-ink">{label}</th>
                      <td className="py-3 pr-4 text-muted">{nhs}</td>
                      <td className="py-3 text-muted">{ours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 max-w-[80ch] text-small text-muted">
                The NHS model is the established instrument for asking whether a hospital is
                performing as expected, and it is case-mix adjusted precisely because raw outcome
                comparisons between providers are misleading. This model does not attempt that job
                and should not be used for it.
              </p>
            </div>
          </Card>

          {/* ------------------------------------------------ 8. limits */}
          <Card className="rise" style={{ '--i': 8 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="8 — Limits"
              title="What this model cannot do"
              hint="The list a clinical safety officer would ask for."
            />
            <div className="grid gap-x-8 gap-y-5 p-5 md:grid-cols-2">
              <Limit title="It is not causal.">
                A factor raising the predicted risk does not mean changing it would lower the real
                risk. Long symptom duration is associated with worse outcomes; operating sooner is a
                separate clinical question this model cannot answer.
              </Limit>
              <Limit title="It has not been validated prospectively.">
                Performance is measured on held-out patients from the same historical extract, not on
                a live cohort at this service. Real-world performance may be worse.
              </Limit>
              <Limit title="It learned from 2016–2019 data.">
                Practice, pathways and populations move. That is what the override rate on the
                overview is for — when clinicians start disagreeing more often, something has
                changed before the offline metrics notice.
              </Limit>
              <Limit title="It only knows what the questionnaire captured.">
                Radiographs, examination findings, deformity, BMI, surgical plan and the
                conversation you just had are all invisible to it. You have information it does not.
              </Limit>
              <Limit title="Missing answers are handled, not conjured.">
                Where a questionnaire item is blank the app shows "not recorded" rather than a zero,
                and the model contributes nothing for it. Absence is not evidence of absence.
              </Limit>
              <Limit title="It cannot speak to fairness it was never measured for.">
                Subgroup performance has not been established for every group this would affect.
                Until it is, treat the score as weaker evidence for patients unlike the training
                population.
              </Limit>
            </div>
            {card?.limitations && (
              <div className="border-t border-line p-5">
                <div className="eyebrow mb-1">Recorded on this version</div>
                <p className="max-w-[80ch] text-small text-muted">{card.limitations}</p>
              </div>
            )}
          </Card>

          {/* ------------------------------------------------ 9. oversight */}
          <Card className="rise" style={{ '--i': 9 } as React.CSSProperties}>
            <SectionHeading
              eyebrow="9 — Oversight"
              title="Your decision is the part that counts"
            />
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Prose>
                <p>
                  Clinical decision support of this kind is treated as high-risk under the EU AI Act,
                  which requires meaningful human oversight, and a patient subject to an automated
                  decision is owed a real explanation under GDPR Article 22. "A clinician looked at
                  it" does not satisfy either.
                </p>
                <p>
                  So the decision you record on the patient page carries four things: what you
                  decided, why in your own words, whether you agreed with the model or overrode it,
                  and the exact score and model version you were shown at the time. That last detail
                  is what lets a later review reconstruct your decision as it was actually made
                  rather than as today's model would make it.
                </p>
                <p className="text-muted">
                  Nothing on the form is pre-selected and agreeing takes exactly as many clicks as
                  overriding — deliberately. The fastest route through the screen must not be to
                  endorse the model without reading it.
                </p>
              </Prose>
              <aside className="rounded-lg border border-line bg-sunken p-4 text-small">
                <div className="eyebrow mb-2">This tool does not</div>
                <ul className="space-y-1.5 text-muted">
                  <li>· authorise or refuse an operation</li>
                  <li>· prioritise or schedule a waiting list</li>
                  <li>· replace examination or imaging</li>
                  <li>· make a decision without you</li>
                </ul>
                <p className="mt-3 text-micro text-muted">
                  It informs a conversation between a clinician and a patient. That is the whole
                  intended use, and the model is registered under it.
                </p>
              </aside>
            </div>
          </Card>

          <p className="rise pb-4 text-small text-muted" style={{ '--i': 10 } as React.CSSProperties}>
            Still have a question this page does not answer?{' '}
            <Link to="/ask" className="font-medium text-accent-text hover:underline">
              Ask the data directly
            </Link>{' '}
            — it answers from the same governed tables, and declines what it cannot ground.
          </p>
        </>
      )}
    </div>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-[68ch] space-y-3 text-body leading-relaxed text-muted">{children}</div>;
}

function Limit({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-small font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-[46ch] text-small text-muted">{children}</p>
    </div>
  );
}
