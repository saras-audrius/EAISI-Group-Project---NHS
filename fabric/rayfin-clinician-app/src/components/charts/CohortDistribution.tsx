import type { CohortStatRow } from '@/services/patients';

import { ChartFrame, EmptyChart } from './ChartFrame';
import { CHART_COLOR, scale, ticks } from './chartUtils';

interface CohortDistributionProps {
  rows: CohortStatRow[];
  /** The patient's own value, in the metric's units. */
  value?: number;
  valueLabel: string;
  title: string;
  /** Optional vertical rules, e.g. the four risk-band thresholds. */
  markers?: { at: number; label: string }[];
  /** Set when higher values are worse, so the caption reads correctly. */
  higherIsWorse?: boolean;
  height?: number;
}

const W = 480;
const PAD = { top: 14, right: 12, bottom: 34, left: 44 };

/**
 * Where this patient sits among everyone awaiting surgery.
 *
 * The NSQIP calculator's most-copied idea is showing the patient against the
 * average patient, and the reason it works is that a number with no reference
 * class cannot be acted on: "OKS 22" is only meaningful once you can see that
 * most of the waiting list is between 14 and 24.
 *
 * Counts, not densities — the y-axis is patients, which is a unit a clinician
 * can hold. The patient's own value is a labelled rule rather than a
 * differently-coloured bar, so it survives greyscale.
 */
export function CohortDistribution({
  rows,
  value,
  valueLabel,
  title,
  markers = [],
  higherIsWorse = false,
  height = 170,
}: CohortDistributionProps) {
  const bins = [...rows].sort((a, b) => a.binIndex - b.binIndex);

  if (bins.length === 0) {
    return (
      <EmptyChart
        title={title}
        message="No cohort distribution has been published for this measure."
        detail="Run notebook 60 to sync gold.knee_preop_cohort into the app database."
      />
    );
  }

  const domain: [number, number] = [bins[0].binStart, bins[bins.length - 1].binEnd];
  const maxN = Math.max(...bins.map((b) => b.n), 1);
  const cohortSize = bins[0].cohortSize;
  const unit = bins[0].unit;
  const median = bins[0].cohortMedian;

  const x = (v: number) => scale(v, domain, [PAD.left, W - PAD.right]);
  const y = (n: number) => scale(n, [0, maxN], [height - PAD.bottom, PAD.top]);

  // Where the patient falls, expressed as a percentile — the sentence a clinician
  // actually wants. Computed from the published bins, so it inherits their
  // resolution rather than pretending to more.
  const below =
    value === undefined
      ? undefined
      : bins.filter((b) => b.binEnd <= value).reduce((a, b) => a + b.n, 0);
  const percentile =
    below === undefined || cohortSize === 0 ? undefined : Math.round((below / cohortSize) * 100);

  const direction = higherIsWorse ? 'higher' : 'lower';
  const caption =
    value === undefined
      ? `Distribution of ${title.toLowerCase()} across the pre-operative cohort.`
      : `This patient is at ${formatValue(value)}, ${direction === 'higher' ? 'above' : 'below'} or level with about ${percentile ?? 0}% of the waiting list.`;

  return (
    <ChartFrame
      title={title}
      caption={caption}
      denominator={`Denominator: ${cohortSize.toLocaleString('en-GB')} patients awaiting surgery. Bars are patient counts; x-axis is ${unit}. Bins holding fewer than 5 patients are suppressed and shown as zero.`}
      ariaLabel={`Histogram of ${title.toLowerCase()} across ${cohortSize.toLocaleString('en-GB')} patients awaiting surgery, x-axis in ${unit}.${value === undefined ? '' : ` This patient is marked at ${formatValue(value)}, at about the ${percentile}th percentile.`}`}
      table={{
        headers: [unit, 'Patients', 'This patient'],
        rows: bins.map((b) => [
          `${formatValue(b.binStart)} to ${formatValue(b.binEnd)}`,
          b.n,
          value !== undefined && value >= b.binStart && value < b.binEnd ? 'yes' : '',
        ]),
      }}
      footnote={median === undefined ? undefined : `Cohort median: ${formatValue(median)} ${unit}.`}
    >
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full">
        {ticks([0, maxN], 4).map((t) => (
          <g key={`y${t}`}>
            <line
              x1={PAD.left}
              y1={y(t)}
              x2={W - PAD.right}
              y2={y(t)}
              stroke={CHART_COLOR.grid}
              strokeWidth={1}
            />
            <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
              {t}
            </text>
          </g>
        ))}

        {bins.map((b) => {
          const bx = x(b.binStart);
          const bw = Math.max(1, x(b.binEnd) - x(b.binStart) - 1);
          return (
            <rect
              key={b.binIndex}
              x={bx}
              y={y(b.n)}
              width={bw}
              height={Math.max(0, height - PAD.bottom - y(b.n))}
              fill={CHART_COLOR.neutral}
            />
          );
        })}

        {markers.map((m) => (
          <g key={m.label}>
            <line
              x1={x(m.at)}
              y1={PAD.top}
              x2={x(m.at)}
              y2={height - PAD.bottom}
              stroke={CHART_COLOR.axis}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={x(m.at)}
              y={PAD.top - 3}
              textAnchor="middle"
              fontSize={8}
              fill={CHART_COLOR.axis}
            >
              {m.label}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          y1={height - PAD.bottom}
          x2={W - PAD.right}
          y2={height - PAD.bottom}
          stroke={CHART_COLOR.axis}
          strokeWidth={1}
        />
        {ticks(domain, 5).map((t) => (
          <text
            key={`x${t}`}
            x={x(t)}
            y={height - PAD.bottom + 12}
            textAnchor="middle"
            fontSize={9}
            fill={CHART_COLOR.axis}
          >
            {formatValue(t)}
          </text>
        ))}
        <text
          x={(PAD.left + W - PAD.right) / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={9}
          fill={CHART_COLOR.axis}
        >
          {unit}
        </text>
        <text
          x={PAD.left - 4}
          y={PAD.top - 4}
          textAnchor="end"
          fontSize={9}
          fill={CHART_COLOR.axis}
        >
          patients
        </text>

        {value !== undefined && (
          <g>
            <line
              x1={x(value)}
              y1={PAD.top - 2}
              x2={x(value)}
              y2={height - PAD.bottom}
              stroke={CHART_COLOR.you}
              strokeWidth={2.5}
            />
            <polygon
              points={`${x(value)},${height - PAD.bottom} ${x(value) - 5},${height - PAD.bottom + 8} ${x(value) + 5},${height - PAD.bottom + 8}`}
              fill={CHART_COLOR.you}
            />
            <text
              x={Math.min(Math.max(x(value), PAD.left + 24), W - PAD.right - 24)}
              y={PAD.top + 8}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={CHART_COLOR.you}
            >
              {valueLabel}
            </text>
          </g>
        )}
      </svg>
    </ChartFrame>
  );
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
