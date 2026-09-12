import { bandFor, distanceToBandEdge, RISK_BANDS } from '@/clinical';

import { ChartFrame } from './ChartFrame';
import { CHART_COLOR, bandMarkVar, scale } from './chartUtils';

interface RiskLadderProps {
  probability: number;
  band: string;
}

const W = 480;
const H = 96;
const PAD_X = 16;
const TRACK_Y = 40;
const TRACK_H = 22;

/**
 * The four policy bands drawn as one scale, with this patient marked on it.
 *
 * A band label on its own hides the thing a clinician most needs: how close the
 * patient sits to its edge. 39% and 21% are both "moderate" and are not the same
 * conversation. So the boundaries are drawn at their actual positions, the
 * patient sits at their actual probability, and the caption states the distance
 * to the nearer edge in percentage points.
 *
 * The bands are labelled inside the track, so the ordering is legible without
 * colour at all — which is the requirement for a screen that gets projected and
 * printed.
 */
export function RiskLadder({ probability, band }: RiskLadderProps) {
  const current = bandFor(band);
  const x = (p: number) => scale(p, [0, 1], [PAD_X, W - PAD_X]);
  const markerX = x(probability);
  const edge = current ? distanceToBandEdge(probability, current) : null;

  const edgeSentence = (() => {
    if (!current || !edge) return '';
    if (edge.edge === 'upper') {
      const next = RISK_BANDS[RISK_BANDS.indexOf(current) + 1];
      return next
        ? ` It is ${edge.points.toFixed(1)} percentage points below the ${next.label.toLowerCase()} band.`
        : '';
    }
    const prev = RISK_BANDS[RISK_BANDS.indexOf(current) - 1];
    return prev
      ? ` It is ${edge.points.toFixed(1)} percentage points above the ${prev.label.toLowerCase()} band.`
      : '';
  })();

  return (
    <ChartFrame
      title="Risk ladder"
      caption={`This patient is at ${(probability * 100).toFixed(1)}%, in the ${current?.label.toLowerCase() ?? band} band.${edgeSentence}`}
      denominator="Bands are a clinical policy decision taken with the service, not an output of the model. Scale runs 0-100% probability of a poor outcome."
      ariaLabel={`Risk scale from 0 to 100 percent showing four policy bands: low below 20 percent, moderate 20 to 40, high 40 to 60, very high above 60. This patient is marked at ${(probability * 100).toFixed(1)} percent, in the ${current?.label ?? band} band.`}
      table={{
        headers: ['Band', 'From', 'To', 'This patient'],
        rows: RISK_BANDS.map((b) => [
          `${b.glyph} ${b.label}`,
          `${b.from * 100}%`,
          `${b.to * 100}%`,
          b.key === band ? `yes — ${(probability * 100).toFixed(1)}%` : '—',
        ]),
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {RISK_BANDS.map((b) => {
          const x0 = x(b.from);
          const x1 = x(b.to);
          const isCurrent = b.key === band;
          return (
            <g key={b.key}>
              <rect
                x={x0}
                y={TRACK_Y}
                width={x1 - x0}
                height={TRACK_H}
                fill={bandMarkVar(b.key)}
                opacity={isCurrent ? 1 : 0.4}
                stroke={CHART_COLOR.axis}
                strokeWidth={0.5}
              />
              <text
                x={(x0 + x1) / 2}
                y={TRACK_Y + TRACK_H / 2 + 4}
                textAnchor="middle"
                fontSize={10}
                fontWeight={isCurrent ? 700 : 500}
                fill="var(--mf-text-inverse)"
                style={{ paintOrder: 'stroke' }}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth={2.5}
              >
                {b.label}
              </text>
              <text
                x={x0}
                y={TRACK_Y + TRACK_H + 14}
                textAnchor="middle"
                fontSize={9}
                fill={CHART_COLOR.axis}
              >
                {Math.round(b.from * 100)}%
              </text>
            </g>
          );
        })}
        <text
          x={W - PAD_X}
          y={TRACK_Y + TRACK_H + 14}
          textAnchor="middle"
          fontSize={9}
          fill={CHART_COLOR.axis}
        >
          100%
        </text>

        {/* The patient marker: a shape, a rule and a number — three channels, no
            reliance on the fill colour underneath it. */}
        <g>
          <line
            x1={markerX}
            y1={TRACK_Y - 4}
            x2={markerX}
            y2={TRACK_Y + TRACK_H + 4}
            stroke={CHART_COLOR.you}
            strokeWidth={2.5}
          />
          <polygon
            points={`${markerX},${TRACK_Y - 5} ${markerX - 5},${TRACK_Y - 13} ${markerX + 5},${TRACK_Y - 13}`}
            fill={CHART_COLOR.you}
          />
          <text
            x={Math.min(Math.max(markerX, 30), W - 30)}
            y={TRACK_Y - 18}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill={CHART_COLOR.you}
          >
            {(probability * 100).toFixed(1)}%
          </text>
        </g>

        <text x={PAD_X} y={H - 6} fontSize={9} fill={CHART_COLOR.axis}>
          probability of a poor outcome
        </text>
      </svg>
    </ChartFrame>
  );
}
