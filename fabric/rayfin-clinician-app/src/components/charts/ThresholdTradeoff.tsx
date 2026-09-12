import type { ThresholdOptionRow } from '@/services/patients';

import { ChartFrame, EmptyChart } from './ChartFrame';
import { CHART_COLOR, scale } from './chartUtils';

const W = 540;
const H = 260;
const PAD = { top: 20, right: 14, bottom: 52, left: 46 };

/**
 * What each cut-off costs, counted in patients.
 *
 * Notebook 42 makes the argument and then leaves it in a notebook: the threshold
 * is a service policy, not a modelling result, and nothing in the training data
 * can decide whether a missed poor outcome is worse than an unnecessary
 * conversation. That judgement belongs to the clinical team — so it has to be
 * visible to them.
 *
 * Counts per 1,000, never rates. A clinical director cannot act on "recall 0.34";
 * they can act on "you flag 210 patients, 150 of them correctly, and 260 poor
 * outcomes still go unflagged". Same numbers, one of them usable.
 *
 * Three stacked segments per bar, each labelled, so the trade-off is one shape
 * rather than three charts: correctly flagged, false alarms, missed.
 */
export function ThresholdTradeoff({ rows }: { rows: ThresholdOptionRow[] }) {
  const options = [...rows].sort((a, b) => a.threshold - b.threshold);

  if (options.length === 0) {
    return (
      <EmptyChart
        title="Where the cut-off sits"
        message="No threshold analysis has been published for this model version."
        detail="Produced by notebook 42 and synced by notebook 60."
      />
    );
  }

  const maxTotal = Math.max(
    ...options.map((o) => o.correctlyFlaggedPer1000 + o.falseAlarmsPer1000 + o.missedPer1000)
  );
  const chosen = options.find((o) => o.isChosen);

  const bandWidth = (W - PAD.left - PAD.right) / options.length;
  const barW = Math.min(26, bandWidth * 0.62);
  const cx = (i: number) => PAD.left + bandWidth * (i + 0.5);
  const y = (v: number) => scale(v, [0, maxTotal], [H - PAD.bottom, PAD.top]);
  const h = (v: number) => H - PAD.bottom - y(v);

  const segments = [
    { key: 'correctlyFlaggedPer1000', label: 'Correctly flagged', fill: 'var(--mf-risk-low-mark)' },
    { key: 'falseAlarmsPer1000', label: 'False alarms', fill: 'var(--mf-risk-moderate-mark)' },
    { key: 'missedPer1000', label: 'Poor outcomes missed', fill: 'var(--mf-risk-very-high-mark)' },
  ] as const;

  return (
    <ChartFrame
      title="Where the cut-off sits"
      caption={
        chosen
          ? `At the cut-off in use (${chosen.threshold.toFixed(2)}), every 1,000 patients produce ${chosen.flaggedPer1000} flags — ${chosen.correctlyFlaggedPer1000} correct, ${chosen.falseAlarmsPer1000} unnecessary — and ${chosen.missedPer1000} poor outcomes still go unflagged.`
          : 'Each cut-off buys fewer missed cases at the price of more unnecessary conversations.'
      }
      denominator="Denominator: 1,000 patients, on the held-out test set. The cut-off is a service policy decision, not a model output — moving it changes who gets a conversation, not how the model scores."
      ariaLabel={`Stacked bar chart of the threshold trade-off. For each cut-off from ${options[0].threshold.toFixed(2)} to ${options[options.length - 1].threshold.toFixed(2)}, the number per 1,000 patients correctly flagged, falsely flagged, and missed.${chosen ? ` The cut-off in use is ${chosen.threshold.toFixed(2)}.` : ''}`}
      table={{
        headers: [
          'Cut-off',
          'Flagged /1000',
          'Correctly flagged',
          'False alarms',
          'Missed',
          'In use',
        ],
        rows: options.map((o) => [
          o.threshold.toFixed(2),
          o.flaggedPer1000,
          o.correctlyFlaggedPer1000,
          o.falseAlarmsPer1000,
          o.missedPer1000,
          o.isChosen ? 'yes' : '',
        ]),
      }}
      footnote={chosen?.rationale}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = Math.round(maxTotal * f);
          return (
            <g key={f}>
              <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)} stroke={CHART_COLOR.grid} />
              <text x={PAD.left - 5} y={y(v) + 3} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
                {v}
              </text>
            </g>
          );
        })}

        {options.map((o, i) => {
          let cursor = 0;
          return (
            <g key={o.threshold}>
              {o.isChosen && (
                <rect
                  x={cx(i) - bandWidth / 2}
                  y={PAD.top - 12}
                  width={bandWidth}
                  height={H - PAD.bottom - PAD.top + 12}
                  fill="var(--mf-accent-tint)"
                />
              )}
              {segments.map((s) => {
                const v = o[s.key];
                const top = cursor + v;
                const rect = (
                  <rect
                    key={s.key}
                    x={cx(i) - barW / 2}
                    y={y(top)}
                    width={barW}
                    height={Math.max(0, h(v))}
                    fill={s.fill}
                    stroke="var(--mf-elevated)"
                    strokeWidth={0.5}
                  />
                );
                cursor = top;
                return rect;
              })}
              <text
                x={cx(i)}
                y={H - PAD.bottom + 12}
                textAnchor="middle"
                fontSize={9}
                fontWeight={o.isChosen ? 700 : 400}
                fill={o.isChosen ? 'var(--mf-text-primary)' : CHART_COLOR.axis}
              >
                {o.threshold.toFixed(2)}
              </text>
              {o.isChosen && (
                <text
                  x={cx(i)}
                  y={PAD.top - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="var(--mf-accent-text)"
                >
                  in use
                </text>
              )}
            </g>
          );
        })}

        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={CHART_COLOR.axis} />
        <text
          x={(PAD.left + W - PAD.right) / 2}
          y={H - PAD.bottom + 26}
          textAnchor="middle"
          fontSize={9}
          fill={CHART_COLOR.axis}
        >
          risk cut-off at which a patient is flagged for review
        </text>
        <text x={PAD.left - 5} y={PAD.top - 8} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
          per 1,000
        </text>

        {/* Direct labels rather than a colour key: the segments are stacked in a
            fixed order, so naming them in that order is the legend. */}
        {segments.map((s, i) => (
          <g key={s.label} transform={`translate(${PAD.left + i * 165}, ${H - 8})`}>
            <rect width={9} height={9} y={-8} fill={s.fill} />
            <text x={13} fontSize={9} fill={CHART_COLOR.axis}>
              {s.label}
            </text>
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}
