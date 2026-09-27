import { bandFor, RISK_BANDS, formatDate } from '@/clinical';
import {
  getModelCard,
  getProviderStats,
  getThresholdOptions,
  listExplanations,
  listPatients,
  type ExplanationRow,
  type PatientRow,
} from '@/services/patients';

import type { AgentAnswer, AgentService, AgentTable, AskOptions } from './types';

/**
 * A grounded question-answering engine with no language model in it.
 *
 * It recognises the shapes of question the Data Agent is rehearsed on
 * (notebook 50 §8 and the FabCon run-of-show), runs the equivalent query
 * against the same data service the rest of the app uses — so it inherits the
 * row-level security of the caller — and shows the SQL it stands for. Anything
 * it cannot map onto a table it declines, which is the behaviour the stage
 * demo is meant to show: a grounded answer, or none.
 *
 * It is deliberately not clever. Its job is to be correct, offline, and to
 * say what it is.
 */
export class LocalAgentService implements AgentService {
  readonly mode = 'local' as const;
  readonly description =
    'Built-in query engine — no language model. Answers are computed from the governed tables you can already see, and shown with the query that produced them.';

  readonly suggestedQuestions = [
    'Which of my pre-operative patients are flagged, and why?',
    'How does our flag rate compare with other providers?',
    'What happens to the flagged count at a threshold of 0.7?',
    'Who is having surgery in the next two weeks?',
    'Should I cancel a patient’s operation?',
  ] as const;

  async ask(question: string, options: AskOptions = {}): Promise<AgentAnswer> {
    const started = performance.now();
    const base = {
      id: `ans-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      question,
      source: this.mode,
      threadId: options.threadId ?? 'local',
    };
    try {
      const answer = await this.route(question.trim(), options);
      return { ...base, ...answer, latencyMs: Math.round(performance.now() - started) };
    } catch (err) {
      return {
        ...base,
        status: 'error',
        text: err instanceof Error ? err.message : 'The question could not be answered.',
        groundedOn: [],
        citations: [],
        latencyMs: Math.round(performance.now() - started),
      };
    }
  }

  // ---------------------------------------------------------------------------

  private async route(
    question: string,
    options: AskOptions
  ): Promise<Omit<AgentAnswer, 'id' | 'question' | 'source' | 'latencyMs' | 'threadId'>> {
    const q = question.toLowerCase();

    // Clinical advice is out of scope by design, and the refusal says so before
    // any table is consulted. The rule is deliberately broad.
    if (/\b(should i|should we|recommend|cancel|advise|is it safe|what would you do|prescribe)\b/.test(q)) {
      return declined(
        'That is a clinical judgement, and this tool does not make them. It can tell you what the model scored, why, and how the score compares across the service — the decision, and the rationale for it, are yours to record on the patient page.',
        []
      );
    }

    const patients = await listPatients();

    // "Why is Margaret Hughes high risk?" / "which factors for this patient?"
    const named = findPatient(q, patients, options.episodeId);
    if (named && /\b(why|factor|driver|contribut|explain|reason|score)\b/.test(q)) {
      return this.explainPatient(named);
    }

    if (/\b(threshold|cut-?off|operating point)\b/.test(q) || /\b0\.\d+\b/.test(q)) {
      return this.thresholdWhatIf(q, patients);
    }

    if (/\b(provider|providers|hospital|hospitals|trust|trusts|site|sites|compare|comparison)\b/.test(q)) {
      return this.providerComparison(patients);
    }

    if (/\b(surgery|surgeries|operation|operations|listed|scheduled|theatre)\b/.test(q)) {
      return this.upcomingSurgery(q, patients);
    }

    if (/\b(how many|count|number of)\b/.test(q) && /\b(low|moderate|high|very high|band|bands)\b/.test(q)) {
      return this.bandCounts(q, patients);
    }

    if (/\b(average|mean|median|typical)\b/.test(q) && /\brisk\b/.test(q)) {
      return this.averageRisk(patients);
    }

    if (/\b(flagged|highest|top|riskiest|most at risk|high risk|high-risk|why)\b/.test(q)) {
      return this.flaggedPatients(q, patients);
    }

    if (named) return this.explainPatient(named);

    return declined(
      'I could not ground that question in the tables this agent is allowed to read: gold.patient_risk, gold.risk_explanation, the provider aggregates and the threshold sweep. Try asking about flagged patients, a named patient’s drivers, providers, or a cut-off.',
      []
    );
  }

  private async flaggedPatients(q: string, patients: PatientRow[]) {
    const [card, explanations] = await Promise.all([getModelCard(), listExplanations()]);
    const threshold = card?.operatingThreshold ?? 0.4;
    const limit = /\btop (\d+)\b/.exec(q)?.[1] ? Number(/\btop (\d+)\b/.exec(q)![1]) : 10;
    const flagged = patients
      .filter((p) => p.riskPoorOutcome >= threshold)
      .sort((a, b) => b.riskPoorOutcome - a.riskPoorOutcome)
      .slice(0, limit);

    const byEpisode = groupExplanations(explanations);
    const table: AgentTable = {
      headers: ['Patient', 'Risk', 'Band', 'Surgery', 'Top drivers (raise risk)'],
      rows: flagged.map((p) => [
        p.displayName,
        `${(p.riskPoorOutcome * 100).toFixed(1)}%`,
        bandFor(p.riskBand)?.label ?? p.riskBand,
        formatDate(p.surgeryScheduledDate),
        (byEpisode.get(p.episodeId) ?? [])
          .filter((e) => e.direction === 'increases_risk')
          .slice(0, 3)
          .map((e) => e.featureLabel)
          .join('; ') || '—',
      ]),
    };

    const text =
      flagged.length === 0
        ? `None of your ${patients.length} pre-operative patients is at or above the operating cut-off of ${threshold.toFixed(2)}.`
        : `${flagged.length} of your ${patients.length} pre-operative patients ${flagged.length === 1 ? 'is' : 'are'} at or above the operating cut-off of ${threshold.toFixed(2)}, listed highest first. The drivers are the model’s own additive terms for each patient, ranked by size.`;

    return {
      status: 'answered' as const,
      text,
      query: `SELECT r.display_name, ROUND(r.risk_poor_outcome*100,1) AS risk_pct, r.risk_band,
       r.surgery_scheduled_date,
       CONCAT_WS('; ', COLLECT_LIST(e.feature_label)) AS top_drivers
FROM gold.patient_risk r
JOIN gold.risk_explanation e
  ON e.episode_id = r.episode_id AND e.rank <= 3 AND e.direction = 'increases_risk'
WHERE r.risk_poor_outcome >= ${threshold.toFixed(2)}
GROUP BY r.display_name, r.risk_poor_outcome, r.risk_band, r.surgery_scheduled_date
ORDER BY r.risk_poor_outcome DESC
LIMIT ${limit}`,
      groundedOn: ['gold.patient_risk', 'gold.risk_explanation', 'ModelCard.operatingThreshold'],
      citations: flagged.map((p) => ({ episodeId: p.episodeId, label: p.displayName })),
      table,
    };
  }

  private async explainPatient(patient: PatientRow) {
    const rows = (await listExplanations()).filter((e) => e.episodeId === patient.episodeId);
    const sorted = [...rows].sort((a, b) => a.rank - b.rank);
    const raises = sorted.filter((r) => r.direction === 'increases_risk');
    const lowers = sorted.filter((r) => r.direction !== 'increases_risk');
    const band = bandFor(patient.riskBand)?.label.toLowerCase() ?? patient.riskBand;

    const text = [
      `${patient.displayName} scores ${(patient.riskPoorOutcome * 100).toFixed(1)}% — ${band} risk — under model v${patient.modelVersion}.`,
      raises.length
        ? `Raising the risk: ${raises.map((r) => `${r.featureLabel.toLowerCase()} (+${r.contribution.toFixed(2)})`).join(', ')}.`
        : '',
      lowers.length
        ? `Lowering it: ${lowers.map((r) => `${r.featureLabel.toLowerCase()} (${r.contribution.toFixed(2)})`).join(', ')}.`
        : '',
      'Contributions are in log-odds and sum, with the intercept, to the score. Open the patient page to see each one against the waiting list.',
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      status: 'answered' as const,
      text,
      query: `SELECT rank, feature_label, ROUND(contribution, 4) AS contribution, direction
FROM gold.risk_explanation
WHERE episode_id = '${patient.episodeId}'
ORDER BY rank`,
      groundedOn: ['gold.patient_risk', 'gold.risk_explanation'],
      citations: [{ episodeId: patient.episodeId, label: patient.displayName }],
      table: {
        headers: ['Rank', 'Factor', 'Contribution (log-odds)', 'Direction'],
        rows: sorted.map((r) => [
          r.rank,
          r.featureLabel,
          `${r.contribution > 0 ? '+' : ''}${r.contribution.toFixed(3)}`,
          r.direction === 'increases_risk' ? 'raises risk' : 'lowers risk',
        ]),
      },
    };
  }

  private async providerComparison(patients: PatientRow[]) {
    const [stats, card] = await Promise.all([getProviderStats(), getModelCard()]);
    const threshold = card?.operatingThreshold ?? 0.4;
    if (stats.length === 0) {
      return declined(
        'No provider aggregates have been published yet. They are written by notebook 60 §2d; until it runs there is nothing to compare against.',
        ['ProviderStat']
      );
    }
    const mine = new Set(patients.map((p) => p.providerCode));
    const sorted = [...stats].sort((a, b) => b.flagged / b.patients - a.flagged / a.patients);
    const table: AgentTable = {
      headers: ['Provider', 'Patients', 'Mean risk', 'Flag rate', 'Yours'],
      rows: sorted.map((s) => [
        s.providerCode,
        s.patients,
        `${(s.meanRisk * 100).toFixed(1)}%`,
        `${((s.flagged / Math.max(1, s.patients)) * 100).toFixed(1)}%`,
        mine.has(s.providerCode) ? 'yes' : '',
      ]),
    };
    const own = sorted.filter((s) => mine.has(s.providerCode));
    const overall = sorted.reduce((a, s) => a + s.flagged, 0) / Math.max(1, sorted.reduce((a, s) => a + s.patients, 0));
    const text = [
      `Across ${sorted.length} providers, ${(overall * 100).toFixed(1)}% of pre-operative patients are flagged at the ${threshold.toFixed(2)} cut-off.`,
      own.length
        ? `Your ${own.length === 1 ? 'provider' : 'providers'}: ${own.map((s) => `${s.providerCode} at ${((s.flagged / s.patients) * 100).toFixed(1)}% (${s.patients} patients, mean risk ${(s.meanRisk * 100).toFixed(1)}%)`).join('; ')}.`
        : '',
      // The caveat is part of the answer, not a footnote. An unadjusted flag rate
      // is a statement about who a provider treats, not how well it treats them,
      // and this is exactly the confusion NHS case-mix adjustment exists to stop.
      'A word of caution on reading these across providers: the flag rate reflects the patients a provider sees, not the quality of its surgery. A unit taking more patients with severe pre-operative scores will flag more of them, and that is the model working correctly. The NHS PROMs predicted score is the case-mix adjusted instrument for provider comparison; this one is not.',
      'These are aggregates over the whole cohort, readable by any signed-in user; no patient row is in them.',
    ]
      .filter(Boolean)
      .join('\n\n');
    return {
      status: 'answered' as const,
      text,
      query: `SELECT provider_code, COUNT(*) AS patients,
       ROUND(AVG(risk_poor_outcome)*100, 1) AS mean_risk_pct,
       SUM(CASE WHEN risk_poor_outcome >= ${threshold.toFixed(2)} THEN 1 ELSE 0 END) AS flagged
FROM gold.patient_risk
GROUP BY provider_code
HAVING COUNT(*) >= 5
ORDER BY flagged / patients DESC`,
      groundedOn: ['gold.patient_risk', 'silver.provider', 'ProviderStat'],
      citations: [],
      table,
    };
  }

  private async thresholdWhatIf(q: string, patients: PatientRow[]) {
    const options = await getThresholdOptions();
    const asked = /\b(0\.\d+)\b/.exec(q)?.[1];
    const chosen = options.find((o) => o.isChosen);
    const target = asked ? Number(asked) : (chosen?.threshold ?? 0.4);
    const nearest = [...options].sort(
      (a, b) => Math.abs(a.threshold - target) - Math.abs(b.threshold - target)
    )[0];
    if (!nearest) {
      return declined('No threshold sweep has been published for this model version.', ['ThresholdOption']);
    }
    const ownFlagged = patients.filter((p) => p.riskPoorOutcome >= nearest.threshold).length;
    const now = chosen ? patients.filter((p) => p.riskPoorOutcome >= chosen.threshold).length : undefined;
    const text = [
      `At a cut-off of ${nearest.threshold.toFixed(2)}, every 1,000 patients produce ${nearest.flaggedPer1000} flags — ${nearest.correctlyFlaggedPer1000} correct and ${nearest.falseAlarmsPer1000} unnecessary — and ${nearest.missedPer1000} poor outcomes go unflagged.`,
      `On your list that would flag ${ownFlagged} of ${patients.length} patients${now !== undefined && chosen ? `, against ${now} at the cut-off in use (${chosen.threshold.toFixed(2)})` : ''}.`,
      'The cut-off is a service policy, not a model output: moving it changes who gets a conversation, not how anyone is scored.',
    ].join('\n\n');
    return {
      status: 'answered' as const,
      text,
      query: `SELECT threshold, flagged_per_1000, correctly_flagged_per_1000,
       false_alarms_per_1000, missed_per_1000, is_chosen
FROM gold.threshold_sweep
WHERE threshold = ${nearest.threshold.toFixed(2)};

SELECT COUNT(*) AS flagged_on_my_list
FROM gold.patient_risk
WHERE risk_poor_outcome >= ${nearest.threshold.toFixed(2)}`,
      groundedOn: ['gold.threshold_sweep', 'gold.patient_risk'],
      citations: [],
      table: {
        headers: ['Cut-off', 'Flagged /1000', 'Correct', 'False alarms', 'Missed', 'On your list'],
        rows: options.map((o) => [
          o.threshold.toFixed(2),
          o.flaggedPer1000,
          o.correctlyFlaggedPer1000,
          o.falseAlarmsPer1000,
          o.missedPer1000,
          patients.filter((p) => p.riskPoorOutcome >= o.threshold).length,
        ]),
      },
    };
  }

  private async upcomingSurgery(q: string, patients: PatientRow[]) {
    const weeks = /\b(\d+)\s*weeks?\b/.exec(q)?.[1]
      ? Number(/\b(\d+)\s*weeks?\b/.exec(q)![1])
      : /\bthis week\b/.test(q)
        ? 1
        : /\btwo weeks|fortnight\b/.test(q)
          ? 2
          : 4;
    const now = new Date();
    const horizon = new Date(now.getTime() + weeks * 7 * 86_400_000);
    const soon = patients
      .filter((p) => {
        const d = new Date(p.surgeryScheduledDate);
        return d <= horizon;
      })
      .sort((a, b) => new Date(a.surgeryScheduledDate).getTime() - new Date(b.surgeryScheduledDate).getTime());
    const flaggedSoon = soon.filter((p) => p.riskBand === 'high' || p.riskBand === 'very_high');
    return {
      status: 'answered' as const,
      text: `${soon.length} of your patients ${soon.length === 1 ? 'is' : 'are'} scheduled within the next ${weeks} ${weeks === 1 ? 'week' : 'weeks'}; ${flaggedSoon.length} of them ${flaggedSoon.length === 1 ? 'is' : 'are'} in the high or very high band. Soonest first.`,
      query: `SELECT display_name, surgery_scheduled_date, ROUND(risk_poor_outcome*100,1) AS risk_pct, risk_band
FROM gold.patient_risk
WHERE surgery_scheduled_date <= DATE_ADD(CURRENT_DATE, ${weeks * 7})
ORDER BY surgery_scheduled_date`,
      groundedOn: ['gold.patient_risk'],
      citations: soon.map((p) => ({ episodeId: p.episodeId, label: p.displayName })),
      table: {
        headers: ['Patient', 'Surgery', 'Risk', 'Band'],
        rows: soon.map((p) => [
          p.displayName,
          formatDate(p.surgeryScheduledDate),
          `${(p.riskPoorOutcome * 100).toFixed(1)}%`,
          bandFor(p.riskBand)?.label ?? p.riskBand,
        ]),
      },
    };
  }

  private async bandCounts(q: string, patients: PatientRow[]) {
    const counts = RISK_BANDS.map((b) => ({ band: b, n: patients.filter((p) => p.riskBand === b.key).length }));
    const asked = RISK_BANDS.find((b) => q.includes(b.label.toLowerCase()));
    const text = asked
      ? `${counts.find((c) => c.band.key === asked.key)?.n ?? 0} of your ${patients.length} patients are in the ${asked.label.toLowerCase()} band (${asked.from * 100}–${asked.to * 100}%).`
      : `Your ${patients.length} patients by band: ${counts.map((c) => `${c.n} ${c.band.label.toLowerCase()}`).join(', ')}.`;
    return {
      status: 'answered' as const,
      text,
      query: `SELECT risk_band, COUNT(*) AS patients
FROM gold.patient_risk
GROUP BY risk_band
ORDER BY MIN(risk_poor_outcome)`,
      groundedOn: ['gold.patient_risk'],
      citations: [],
      table: {
        headers: ['Band', 'Range', 'Patients'],
        rows: counts.map((c) => [c.band.label, `${c.band.from * 100}–${c.band.to * 100}%`, c.n]),
      },
    };
  }

  private async averageRisk(patients: PatientRow[]) {
    const risks = patients.map((p) => p.riskPoorOutcome).sort((a, b) => a - b);
    const mean = risks.reduce((a, b) => a + b, 0) / Math.max(1, risks.length);
    const median = risks[Math.floor(risks.length / 2)] ?? 0;
    return {
      status: 'answered' as const,
      text: `Across your ${patients.length} pre-operative patients the mean predicted risk is ${(mean * 100).toFixed(1)}% and the median is ${(median * 100).toFixed(1)}%. The probabilities are calibrated, so ${(mean * 100).toFixed(0)}% means about ${(mean * 100).toFixed(0)} in 100 similar patients.`,
      query: `SELECT ROUND(AVG(risk_poor_outcome)*100,1) AS mean_risk_pct,
       ROUND(PERCENTILE(risk_poor_outcome, 0.5)*100,1) AS median_risk_pct
FROM gold.patient_risk`,
      groundedOn: ['gold.patient_risk'],
      citations: [],
    };
  }
}

// -----------------------------------------------------------------------------

function declined(text: string, groundedOn: string[]) {
  return { status: 'declined' as const, text, groundedOn, citations: [] };
}

function groupExplanations(rows: ExplanationRow[]): Map<string, ExplanationRow[]> {
  const out = new Map<string, ExplanationRow[]>();
  for (const r of rows) {
    if (!r.episodeId) continue;
    const list = out.get(r.episodeId) ?? [];
    list.push(r);
    out.set(r.episodeId, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.rank - b.rank);
  return out;
}

/** Match a patient by episode id, full name, or surname; the page context wins. */
function findPatient(q: string, patients: PatientRow[], episodeId?: string): PatientRow | undefined {
  if (/\b(this patient|her|him|them)\b/.test(q) && episodeId) {
    const ctx = patients.find((p) => p.episodeId === episodeId);
    if (ctx) return ctx;
  }
  const byId = patients.find((p) => q.includes(p.episodeId.toLowerCase()));
  if (byId) return byId;
  const byFull = patients.find((p) => q.includes(p.displayName.toLowerCase()));
  if (byFull) return byFull;
  const bySurname = patients.filter((p) => {
    const surname = p.displayName.split(' ').slice(-1)[0].toLowerCase();
    return new RegExp(`\\b${surname}\\b`).test(q);
  });
  return bySurname.length === 1 ? bySurname[0] : undefined;
}
