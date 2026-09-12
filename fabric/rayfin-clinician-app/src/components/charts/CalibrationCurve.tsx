import type { ModelCurveRow } from '@/services/patients';

import { ChartFrame, EmptyChart } from './ChartFrame';
import { CHART_COLOR, scale } from './chartUtils';

const W = 340;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 44, left: 46 };

/**
 * Predicted risk against observed risk, in deciles.
 *
 * The app's central claim is that 34% means "about 34 in 100". That is a claim
 * about calibration, and until this chart existed it was asserted on the patient
 * page with nothing behind it. A clinician being asked to act on a probability is
 * entitled to see whether the probability holds up.
 *
 * Points on the diagonal mean the model's stated risk matched what happened.
 * Above it, the model under-predicted; below, it over-predicted. The vertical
 * bars are 95% Wilson intervals on the observed rate: a decile of forty patients
 * is thin evidence, and the chart should say so rather than draw a confident dot.
 */
export function CalibrationCurve({ rows }: { rows: ModelCurveRow[] }) {
  const points = [...rows].sort((a, b) => a.pointIndex - b.pointIndex);

  if (points.length === 0) {
    return (
      <EmptyChart
        title="Calibration"
        message="No calibration curve has been published for this model version."
        detail="Produced by notebook 43 and synced by notebook 60."
      />
    );
  }

  const x = (v: number) => scale(v, [0, 1], [PAD.left, W - PAD.right]);
  const y = (v: number) => scale(v, [0, 1], [H - PAD.bottom, PAD.top]);

  const meanError =
    points.reduce((a, p) => a + Math.abs(p.x - p.y), 0) / points.length;
  const totalN = points.reduce((a, p) => a + (p.n ?? 0), 0);

  return (
    <ChartFrame
      title="Calibration"
      caption={`Across the ten risk deciles the model's stated probability differs from what actually happened by ${(meanError * 100).toFixed(1)} percentage points on average. Points on the diagonal mean the number can be read at face value.`}
      denominator={`Denominator: ${totalN.toLocaleString('en-GB')} held-out patients with a known six-month outcome, split into ${points.length} equal-sized risk groups. Vertical bars are 95% confidence intervals on the observed rate.`}
      ariaLabel={`Calibration plot. Predicted probability on the x-axis against observed proportion with a poor outcome on the y-axis, for ${points.length} deciles of ${totalN.toLocaleString('en-GB')} held-out patients. Mean absolute difference ${(meanError * 100).toFixed(1)} percentage points.`}
      table={{
        headers: ['Decile', 'Predicted', 'Observed', '95% CI', 'Patients'],
        rows: points.map((p, i) => [
          i + 1,
          `${(p.x * 100).toFixed(1)}%`,
          `${(p.y * 100).toFixed(1)}%`,
          p.yLower !== undefined && p.yUpper !== undefined
            ? `${(p.yLower * 100).toFixed(1)}% to ${(p.yUpper * 100).toFixed(1)}%`
            : '—',
          p.n ?? '—',
        ]),
      }}
      footnote="Calibration is a property of the group, not of an individual. A well-calibrated model still cannot say which patient in a group of a hundred will be one of the thirty-four."
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke={CHART_COLOR.grid} />
            <text x={PAD.left - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
              {t * 100}%
            </text>
            <text
              x={x(t)}
              y={H - PAD.bottom + 12}
              textAnchor="middle"
              fontSize={9}
              fill={CHART_COLOR.axis}
            >
              {t * 100}%
            </text>
          </g>
        ))}

        {/* Perfect calibration. Labelled on the line, because a legend entry for a
            reference line is a legend entry nobody reads. */}
        <line
          x1={x(0)}
          y1={y(0)}
          x2={x(1)}
          y2={y(1)}
          stroke={CHART_COLOR.axis}
          strokeWidth={1.25}
          strokeDasharray="4 3"
        />
        <text
          x={x(0.72)}
          y={y(0.72) - 6}
          fontSize={9}
          fill={CHART_COLOR.axis}
          transform={`rotate(-45 ${x(0.72)} ${y(0.72) - 6})`}
        >
          perfect calibration
        </text>

        {points.map((p, i) => (
          <g key={i}>
            {p.yLower !== undefined && p.yUpper !== undefined && (
              <line
                x1={x(p.x)}
                y1={y(p.yLower)}
                x2={x(p.x)}
                y2={y(p.yUpper)}
                stroke={CHART_COLOR.neutral}
                strokeWidth={2}
              />
            )}
            <circle cx={x(p.x)} cy={y(p.y)} r={4} fill={CHART_COLOR.you} />
          </g>
        ))}

        <path
          d={points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x)},${y(p.y)}`).join(' ')}
          fill="none"
          stroke={CHART_COLOR.you}
          strokeWidth={1.25}
        />

        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={CHART_COLOR.axis} />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke={CHART_COLOR.axis} />
        <text
          x={(PAD.left + W - PAD.right) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={9}
          fill={CHART_COLOR.axis}
        >
          probability the model predicted
        </text>
        <text
          x={-(PAD.top + H - PAD.bottom) / 2}
          y={12}
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize={9}
          fill={CHART_COLOR.axis}
        >
          proportion who actually had a poor outcome
        </text>
      </svg>
    </ChartFrame>
  );
}
