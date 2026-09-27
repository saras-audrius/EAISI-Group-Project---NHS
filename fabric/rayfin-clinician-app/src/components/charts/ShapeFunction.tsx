import { featureValueShort } from '@/clinical';
import type { ModelCurveRow } from '@/services/patients';

import { ChartFrame, EmptyChart } from './ChartFrame';
import { CHART_COLOR, scale, ticks } from './chartUtils';

interface ShapeFunctionProps {
  rows: ModelCurveRow[];
  /** The patient's value on this feature, marked on the curve. */
  patientValue?: number;
  /** Model feature name, so the marked value can be said in the instrument's words. */
  feature?: string;
}

const W = 520;
const H = 210;
const PAD = { top: 18, right: 14, bottom: 40, left: 46 };

/**
 * One term of the model, drawn: how risk moves across the range of one factor.
 *
 * This is the "what would change it" chart, and it is the reason a glassbox model
 * was chosen over a more accurate black box. An EBM's prediction is the sum of
 * these curves, so a clinician can read one, mark where their patient sits, and
 * see what a different value would have contributed — and, crucially, *disagree*
 * with it. A clinician cannot disagree with a random forest, and "meaningful
 * human oversight" of something you cannot disagree with is not oversight.
 *
 * The uncertainty band is drawn, not hidden. It widens where the training cohort
 * held few patients at that value, which is exactly where a confident-looking
 * line would be most misleading.
 */
export function ShapeFunction({ rows, patientValue, feature }: ShapeFunctionProps) {
  const points = [...rows].sort((a, b) => a.pointIndex - b.pointIndex);

  if (points.length === 0) {
    return (
      <EmptyChart
        title="How this factor moves risk"
        message="No shape function has been published for this factor."
        detail="Shape functions come from notebook 43 and are synced by notebook 60."
      />
    );
  }

  const label = points[0].seriesLabel;
  const xUnit = points[0].xUnit;
  const xDomain: [number, number] = [points[0].x, points[points.length - 1].x];
  const lows = points.map((p) => p.yLower ?? p.y);
  const highs = points.map((p) => p.yUpper ?? p.y);
  const yDomain: [number, number] = [Math.min(...lows, 0), Math.max(...highs, 0)];

  const x = (v: number) => scale(v, xDomain, [PAD.left, W - PAD.right]);
  const y = (v: number) => scale(v, yDomain, [H - PAD.bottom, PAD.top]);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x)},${y(p.y)}`).join(' ');
  const bandPath =
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x)},${y(p.yUpper ?? p.y)}`).join(' ') +
    ' ' +
    [...points]
      .reverse()
      .map((p) => `L${x(p.x)},${y(p.yLower ?? p.y)}`)
      .join(' ') +
    ' Z';

  const atPatient =
    patientValue === undefined
      ? undefined
      : points.reduce((best, p) =>
          Math.abs(p.x - patientValue) < Math.abs(best.x - patientValue) ? p : best
        );

  return (
    <ChartFrame
      title={`How ${label.toLowerCase()} moves risk`}
      caption={
        atPatient
          ? `At this patient's answer — ${feature ? featureValueShort(feature, patientValue) : format(patientValue ?? 0)} — this factor contributes ${atPatient.y > 0 ? '+' : ''}${atPatient.y.toFixed(2)} log-odds. Reading along the line shows what a different value would contribute instead.`
          : `Across the range of ${label.toLowerCase()}, this is what the model adds to the risk.`
      }
      denominator={`x-axis: ${xUnit}. y-axis: contribution to the log-odds of a poor outcome; zero is the average waiting-list patient. Shaded band is the model's uncertainty, widening where few patients had that value.`}
      ariaLabel={`Line chart of the model's contribution for ${label}, x-axis in ${xUnit}, y-axis in log-odds.${atPatient ? ` This patient's value of ${format(patientValue ?? 0)} contributes ${atPatient.y.toFixed(2)} log-odds.` : ''}`}
      table={{
        headers: [xUnit, 'Contribution (log-odds)', 'Uncertainty', 'Patients at this value'],
        rows: points.map((p) => [
          format(p.x),
          `${p.y > 0 ? '+' : ''}${p.y.toFixed(3)}`,
          p.yLower !== undefined && p.yUpper !== undefined
            ? `${p.yLower.toFixed(2)} to ${p.yUpper.toFixed(2)}`
            : '—',
          p.n ?? '—',
        ]),
      }}
      footnote="This curve is the model, not a summary of it: the score is the sum of curves like this one plus an intercept."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {ticks(yDomain, 4).map((t) => (
          <g key={`y${t}`}>
            <line
              x1={PAD.left}
              y1={y(t)}
              x2={W - PAD.right}
              y2={y(t)}
              stroke={CHART_COLOR.grid}
            />
            <text x={PAD.left - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}

        <path d={bandPath} fill={CHART_COLOR.neutral} opacity={0.25} />

        {/* Zero is where the average patient sits, so it gets its own emphasis. */}
        <line
          x1={PAD.left}
          y1={y(0)}
          x2={W - PAD.right}
          y2={y(0)}
          stroke={CHART_COLOR.axis}
          strokeWidth={1.25}
          strokeDasharray="4 3"
        />

        <path d={line} fill="none" stroke={CHART_COLOR.you} strokeWidth={2} />

        {atPatient && (
          <g>
            <line
              x1={x(atPatient.x)}
              y1={PAD.top}
              x2={x(atPatient.x)}
              y2={H - PAD.bottom}
              stroke={CHART_COLOR.you}
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
            <circle cx={x(atPatient.x)} cy={y(atPatient.y)} r={5} fill={CHART_COLOR.you} />
            <text
              x={Math.min(x(atPatient.x) + 8, W - PAD.right - 60)}
              y={y(atPatient.y) - 8}
              fontSize={10}
              fontWeight={700}
              fill={CHART_COLOR.you}
            >
              this patient
            </text>
          </g>
        )}

        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke={CHART_COLOR.axis}
        />
        {ticks(xDomain, 6).map((t) => (
          <text
            key={`x${t}`}
            x={x(t)}
            y={H - PAD.bottom + 12}
            textAnchor="middle"
            fontSize={9}
            fill={CHART_COLOR.axis}
          >
            {format(t)}
          </text>
        ))}
        <text
          x={(PAD.left + W - PAD.right) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={9}
          fill={CHART_COLOR.axis}
        >
          {xUnit}
        </text>
        <text x={PAD.left - 5} y={PAD.top - 5} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
          log-odds
        </text>
      </svg>
    </ChartFrame>
  );
}

function format(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
