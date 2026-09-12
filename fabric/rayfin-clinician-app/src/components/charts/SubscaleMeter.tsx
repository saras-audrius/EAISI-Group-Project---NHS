import { CHART_COLOR, scale } from './chartUtils';

interface SubscaleMeterProps {
  label: string;
  value?: number;
  max: number;
  /** Cohort median for the same measure, drawn as a tick. */
  median?: number;
  /** What the twelve items behind this subscale ask about. */
  items: string;
}

const W = 240;
const H = 30;
const TRACK_Y = 8;
const TRACK_H = 12;

/**
 * One Oxford Knee Score component against its own maximum, with the cohort
 * median marked.
 *
 * The old patient page showed "22/48" and nothing else, which loses the two
 * things a clinician needs. The first is the split: a total of 22 driven by pain
 * and a total of 22 driven by loss of function are different patients with
 * different pre-operative options. The second is the reference class — 22 is
 * only interpretable next to where the rest of the waiting list sits.
 *
 * The OKS runs 0-48 with **lower being worse**, which is the opposite of most
 * bars a reader has seen, so the direction is stated in words on the panel rather
 * than left to be inferred from a filled rectangle.
 */
export function SubscaleMeter({ label, value, max, median, items }: SubscaleMeterProps) {
  const x = (v: number) => scale(v, [0, max], [1, W - 1]);
  const recorded = value !== undefined;

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0">
        <div className="text-small font-medium text-ink">{label}</div>
        <div className="text-micro text-muted">/{max}</div>
      </div>

      <div className="min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full max-w-[260px]"
          role="img"
          aria-label={
            recorded
              ? `${label}: ${value} out of ${max} points${median !== undefined ? `, cohort median ${median}` : ''}. Lower is worse. Items: ${items}.`
              : `${label}: not recorded for this patient.`
          }
        >
          <rect
            x={1}
            y={TRACK_Y}
            width={W - 2}
            height={TRACK_H}
            fill="var(--mf-surface-sunken)"
            stroke={CHART_COLOR.grid}
          />
          {recorded && (
            <rect
              x={1}
              y={TRACK_Y}
              width={Math.max(1, x(value) - 1)}
              height={TRACK_H}
              fill={CHART_COLOR.neutral}
            />
          )}
          {median !== undefined && (
            <g>
              <line
                x1={x(median)}
                y1={TRACK_Y - 4}
                x2={x(median)}
                y2={TRACK_Y + TRACK_H + 4}
                stroke={CHART_COLOR.axis}
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
              <text x={x(median)} y={H - 1} textAnchor="middle" fontSize={7} fill={CHART_COLOR.axis}>
                median
              </text>
            </g>
          )}
          {recorded && (
            <line
              x1={x(value)}
              y1={TRACK_Y - 3}
              x2={x(value)}
              y2={TRACK_Y + TRACK_H + 3}
              stroke={CHART_COLOR.you}
              strokeWidth={2.5}
            />
          )}
          <text x={1} y={6} fontSize={7} fill={CHART_COLOR.axis}>
            0 (worst)
          </text>
          <text x={W - 1} y={6} textAnchor="end" fontSize={7} fill={CHART_COLOR.axis}>
            {max} (best)
          </text>
        </svg>
      </div>

      <div className="w-20 shrink-0 text-right">
        {recorded ? (
          <span className="text-lead font-semibold tnum text-ink">
            {value}
            <span className="text-small font-normal text-muted">/{max}</span>
          </span>
        ) : (
          <span className="text-small italic text-muted">not recorded</span>
        )}
      </div>
    </div>
  );
}
