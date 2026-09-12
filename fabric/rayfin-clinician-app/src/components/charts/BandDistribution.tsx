import { RISK_BANDS } from '@/clinical';

import { ChartFrame, EmptyChart } from './ChartFrame';
import { CHART_COLOR, bandMarkVar } from './chartUtils';

interface BandDistributionProps {
  counts: Record<string, number>;
  /** How many of the listed patients already have a recorded decision. */
  reviewed?: number;
  total: number;
}

const W = 520;
const H = 58;
const BAR_Y = 4;
const BAR_H = 26;

/**
 * The clinician's own list, split by band.
 *
 * This is the "what is my team doing with these scores" view, and it is a
 * worklist question rather than a modelling one: how many patients am I carrying,
 * how many are in the top two bands, and how many have I not yet reviewed.
 *
 * A segmented bar rather than a pie: proportions of a whole are compared by
 * length far more accurately than by angle, and the counts are written on the
 * segments so nobody has to estimate either way.
 */
export function BandDistribution({ counts, reviewed, total }: BandDistributionProps) {
  if (total === 0) {
    return (
      <EmptyChart
        title="Your list by risk band"
        message="No patients are assigned to you."
        detail="Assignment is set in CLINICIAN_ASSIGNMENTS in notebook 60 and enforced by row-level security, not by this screen."
      />
    );
  }

  const width = (n: number) => (n / total) * (W - 2);
  let cursor = 1;

  const outstanding = reviewed === undefined ? undefined : total - reviewed;

  return (
    <ChartFrame
      title="Your list by risk band"
      caption={`${total} patients awaiting surgery on your list.${
        outstanding === undefined
          ? ''
          : ` ${outstanding} of them have no recorded decision yet.`
      }`}
      denominator={`Denominator: ${total} patients assigned to you. Bands are policy thresholds on the calibrated probability, not model output.`}
      ariaLabel={`Segmented bar showing your list of ${total} patients by risk band: ${RISK_BANDS.map(
        (b) => `${counts[b.key] ?? 0} ${b.label.toLowerCase()}`
      ).join(', ')}.`}
      table={{
        headers: ['Band', 'Range', 'Patients', 'Share'],
        rows: RISK_BANDS.map((b) => [
          `${b.glyph} ${b.label}`,
          `${b.from * 100}-${b.to * 100}%`,
          counts[b.key] ?? 0,
          `${Math.round(((counts[b.key] ?? 0) / total) * 100)}%`,
        ]),
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {RISK_BANDS.map((b) => {
          const n = counts[b.key] ?? 0;
          const w = width(n);
          const x = cursor;
          cursor += w;
          if (n === 0) return null;
          return (
            <g key={b.key}>
              <rect
                x={x}
                y={BAR_Y}
                width={w}
                height={BAR_H}
                fill={bandMarkVar(b.key)}
                stroke="var(--mf-elevated)"
                strokeWidth={1}
              />
              {w > 24 && (
                <text
                  x={x + w / 2}
                  y={BAR_Y + BAR_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--mf-text-inverse)"
                  style={{ paintOrder: 'stroke' }}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth={2.5}
                >
                  {n}
                </text>
              )}
              <text
                x={x + w / 2}
                y={BAR_Y + BAR_H + 14}
                textAnchor="middle"
                fontSize={9}
                fill={CHART_COLOR.axis}
              >
                {w > 52 ? b.label : b.glyph}
              </text>
            </g>
          );
        })}
        <text x={1} y={H - 2} fontSize={9} fill={CHART_COLOR.axis}>
          {total} patients · lowest risk on the left
        </text>
      </svg>
    </ChartFrame>
  );
}
