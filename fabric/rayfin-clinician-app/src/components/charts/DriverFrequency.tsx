import type { ExplanationRow } from '@/services/patients';

import { ChartFrame, EmptyChart } from './ChartFrame';
import { CHART_COLOR, scale } from './chartUtils';

interface DriverFrequencyProps {
  explanations: ExplanationRow[];
  patientCount: number;
  /** How many top-ranked terms per patient count as "leading". */
  topN?: number;
  max?: number;
}

const W = 560;
const ROW_H = 26;
const PAD = { top: 18, right: 50, bottom: 26, left: 230 };

/**
 * Which factors are doing the work across the list.
 *
 * For each patient, the top-N terms that raise risk are counted; the chart is
 * how many patients each factor leads for. It answers the service question a
 * per-patient chart cannot: "is it pain, or is it mood, or is it duration that
 * is driving our flags" — and therefore which pre-habilitation pathway would
 * touch the most people.
 */
export function DriverFrequency({ explanations, patientCount, topN = 3, max = 8 }: DriverFrequencyProps) {
  const byPatient = new Map<string, ExplanationRow[]>();
  for (const e of explanations) {
    if (!e.episodeId) continue;
    const list = byPatient.get(e.episodeId) ?? [];
    list.push(e);
    byPatient.set(e.episodeId, list);
  }

  const tally = new Map<string, { label: string; n: number; sum: number }>();
  for (const rows of byPatient.values()) {
    const leading = rows
      .filter((r) => r.direction === 'increases_risk')
      .sort((a, b) => a.rank - b.rank)
      .slice(0, topN);
    for (const r of leading) {
      const t = tally.get(r.feature) ?? { label: r.featureLabel, n: 0, sum: 0 };
      t.n += 1;
      t.sum += r.contribution;
      tally.set(r.feature, t);
    }
  }

  const rows = [...tally.entries()]
    .map(([feature, t]) => ({ feature, ...t, mean: t.sum / t.n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, max);

  if (rows.length === 0 || patientCount === 0) {
    return (
      <EmptyChart
        title="What is driving the flags"
        message="No explanations are available for your list."
        detail="Explanations are written by notebook 50 and synced by notebook 60."
      />
    );
  }

  const denominator = byPatient.size;
  const height = PAD.top + rows.length * ROW_H + PAD.bottom;
  const x = (v: number) => scale(v, [0, denominator], [PAD.left, W - PAD.right]);
  const lead = rows[0];

  return (
    <ChartFrame
      title="What is driving the flags"
      caption={`${lead.label} is among the top ${topN} risk-raising factors for ${lead.n} of ${denominator} patients on your list — more than any other factor.`}
      denominator={`Denominator: ${denominator} patients with a published explanation. A factor is counted once per patient when it is in that patient's top ${topN} risk-raising terms.`}
      ariaLabel={`Bar chart of how many patients each factor leads for. ${rows.map((r) => `${r.label}: ${r.n}`).join(', ')}.`}
      table={{
        headers: ['Factor', 'Patients it leads for', 'Share', 'Mean contribution (log-odds)'],
        rows: rows.map((r) => [
          r.label,
          r.n,
          `${Math.round((r.n / denominator) * 100)}%`,
          `+${r.mean.toFixed(2)}`,
        ]),
      }}
    >
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = denominator * f;
          return (
            <g key={f}>
              <line x1={x(v)} y1={PAD.top - 6} x2={x(v)} y2={height - PAD.bottom} stroke={CHART_COLOR.grid} />
              <text x={x(v)} y={height - PAD.bottom + 12} textAnchor="middle" fontSize={9} fill={CHART_COLOR.axis}>
                {Math.round(f * 100)}%
              </text>
            </g>
          );
        })}
        {rows.map((r, i) => {
          const y = PAD.top + i * ROW_H;
          return (
            <g key={r.feature}>
              <title>{`${r.label}: leads for ${r.n} of ${denominator}`}</title>
              <text x={PAD.left - 10} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={11} fill="var(--mf-text-primary)">
                {truncate(r.label, 34)}
              </text>
              <rect
                x={PAD.left}
                y={y + 6}
                width={Math.max(2, x(r.n) - PAD.left)}
                height={ROW_H - 12}
                rx={3}
                fill={i === 0 ? CHART_COLOR.increase : CHART_COLOR.neutral}
              />
              <text x={x(r.n) + 6} y={y + ROW_H / 2 + 4} fontSize={10} fontWeight={600} fill="var(--mf-text-primary)">
                {r.n}
              </text>
            </g>
          );
        })}
        <text x={PAD.left} y={height - 4} fontSize={9} fill={CHART_COLOR.axis}>
          share of your patients this factor leads for
        </text>
      </svg>
    </ChartFrame>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
