import { RISK_BANDS } from '@/clinical';
import type { PatientRow } from '@/services/patients';

import { ChartFrame, EmptyChart } from './ChartFrame';
import { CHART_COLOR, bandMarkVar, scale } from './chartUtils';

interface SurgeryTimelineProps {
  patients: PatientRow[];
  weeks?: number;
  now?: Date;
}

const W = 640;
const H = 190;
const PAD = { top: 22, right: 12, bottom: 36, left: 34 };

/**
 * The list, laid out in time: who is coming to theatre in each of the next
 * N weeks, stacked by band.
 *
 * A worklist sorted by risk makes the model the agenda. Sorted by date, the
 * question becomes the clinical one — which of next week's patients have not
 * been reviewed, and is there time to optimise the ones that should be.
 */
export function SurgeryTimeline({ patients, weeks = 10, now = new Date() }: SurgeryTimelineProps) {
  if (patients.length === 0) {
    return (
      <EmptyChart
        title="Surgeries ahead"
        message="No patients are assigned to you."
        detail="Assignment is set in CLINICIAN_ASSIGNMENTS in notebook 60 and enforced by row-level security."
      />
    );
  }

  const start = startOfWeek(now);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const from = new Date(start.getTime() + i * 7 * 86_400_000);
    const to = new Date(from.getTime() + 7 * 86_400_000);
    const inWeek = patients.filter((p) => {
      const d = new Date(p.surgeryScheduledDate);
      return d >= from && d < to;
    });
    const counts: Record<string, number> = {};
    for (const p of inWeek) counts[p.riskBand] = (counts[p.riskBand] ?? 0) + 1;
    return { from, to, total: inWeek.length, counts };
  });
  const overdue = patients.filter((p) => new Date(p.surgeryScheduledDate) < start).length;
  const later = patients.filter(
    (p) => new Date(p.surgeryScheduledDate) >= new Date(start.getTime() + weeks * 7 * 86_400_000)
  ).length;

  const maxN = Math.max(1, ...buckets.map((b) => b.total));
  const slot = (W - PAD.left - PAD.right) / weeks;
  const barW = Math.min(40, slot * 0.6);
  const y = (n: number) => scale(n, [0, maxN], [H - PAD.bottom, PAD.top]);

  const busiest = buckets.reduce((a, b) => (b.total > a.total ? b : a), buckets[0]);

  return (
    <ChartFrame
      title="Surgeries ahead"
      caption={`${patients.length - overdue - later} of your patients are scheduled in the next ${weeks} weeks; the busiest week starts ${formatShort(busiest.from)} with ${busiest.total}.${
        overdue ? ` ${overdue} ${overdue === 1 ? 'has' : 'have'} a scheduled date in the past.` : ''
      }`}
      denominator={`Denominator: ${patients.length} patients assigned to you. Weeks start on Monday. Stacked by risk band, lowest at the bottom.`}
      ariaLabel={`Stacked bar chart of scheduled surgeries per week for the next ${weeks} weeks, stacked by risk band. ${buckets
        .map((b) => `Week of ${formatShort(b.from)}: ${b.total}`)
        .join(', ')}.`}
      table={{
        headers: ['Week starting', 'Patients', ...RISK_BANDS.map((b) => b.label)],
        rows: buckets.map((b) => [
          formatShort(b.from),
          b.total,
          ...RISK_BANDS.map((band) => b.counts[band.key] ?? 0),
        ]),
      }}
      footnote={later ? `${later} more ${later === 1 ? 'patient is' : 'patients are'} scheduled beyond this window.` : undefined}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {[0, 0.5, 1].map((f) => {
          const v = Math.round(maxN * f);
          return (
            <g key={f}>
              <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)} stroke={CHART_COLOR.grid} />
              <text x={PAD.left - 5} y={y(v) + 3} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
                {v}
              </text>
            </g>
          );
        })}

        {buckets.map((b, i) => {
          const cx = PAD.left + slot * (i + 0.5);
          let cursor = 0;
          const isThisWeek = i === 0;
          return (
            <g key={i}>
              {isThisWeek && (
                <rect
                  x={cx - slot / 2}
                  y={PAD.top - 12}
                  width={slot}
                  height={H - PAD.bottom - PAD.top + 12}
                  fill="var(--mf-accent-tint)"
                  opacity={0.7}
                />
              )}
              {RISK_BANDS.map((band) => {
                const n = b.counts[band.key] ?? 0;
                if (n === 0) return null;
                const top = cursor + n;
                const el = (
                  <rect
                    key={band.key}
                    x={cx - barW / 2}
                    y={y(top)}
                    width={barW}
                    height={Math.max(0, y(cursor) - y(top) - 1)}
                    rx={cursor === 0 ? 0 : 0}
                    fill={bandMarkVar(band.key)}
                  >
                    <title>{`Week of ${formatShort(b.from)} · ${band.label}: ${n}`}</title>
                  </rect>
                );
                cursor = top;
                return el;
              })}
              {b.total > 0 && (
                <text
                  x={cx}
                  y={y(b.total) - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill="var(--mf-text-primary)"
                >
                  {b.total}
                </text>
              )}
              <text
                x={cx}
                y={H - PAD.bottom + 12}
                textAnchor="middle"
                fontSize={9}
                fontWeight={isThisWeek ? 700 : 400}
                fill={isThisWeek ? 'var(--mf-accent-text)' : CHART_COLOR.axis}
              >
                {isThisWeek ? 'this week' : formatShort(b.from)}
              </text>
            </g>
          );
        })}

        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={CHART_COLOR.axis} />
        <text x={PAD.left - 5} y={PAD.top - 8} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
          patients
        </text>

        {RISK_BANDS.map((band, i) => (
          <g key={band.key} transform={`translate(${PAD.left + i * 90}, ${H - 6})`}>
            <rect width={9} height={9} y={-8} fill={bandMarkVar(band.key)} />
            <text x={13} fontSize={9} fill={CHART_COLOR.axis}>
              {band.label}
            </text>
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}

function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (out.getDay() + 6) % 7; // Monday = 0
  out.setDate(out.getDate() - day);
  return out;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
