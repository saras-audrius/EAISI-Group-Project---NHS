import { bandFor } from '@/clinical';

interface RiskBadgeProps {
  band: string;
  probability: number;
  size?: 'sm' | 'lg';
}

/** Tint background, band-ink text, band-ink rule. Every pair is >= 4.5:1 in both themes. */
const BAND_CLASS: Record<string, string> = {
  low: 'bg-risk-low-tint text-risk-low border-risk-low',
  moderate: 'bg-risk-moderate-tint text-risk-moderate border-risk-moderate',
  high: 'bg-risk-high-tint text-risk-high border-risk-high',
  very_high: 'bg-risk-very-high-tint text-risk-very-high border-risk-very-high',
};

/**
 * The score, as a clinician reads it.
 *
 * Percentage and band together, on purpose: the band alone hides how close a
 * patient sits to a threshold, and the percentage alone invites false precision.
 *
 * Three encodings, not one. The band is carried by a **four-block glyph** and by
 * the **word**, with colour third. This screen gets projected and printed, and
 * roughly one man in twelve cannot separate the high band from the low one by
 * hue.
 */
export function RiskBadge({ band, probability, size = 'sm' }: RiskBadgeProps) {
  const meta = bandFor(band);
  const label = meta?.label ?? band;
  const glyph = meta?.glyph ?? '▯▯▯▯';
  const classes = BAND_CLASS[band] ?? 'bg-sunken text-muted border-line-strong';
  const pct = probability * 100;

  if (size === 'lg') {
    return (
      <div
        className={`rounded-xl border-l-4 border-y border-r border-y-line border-r-line px-5 py-4 ${classes}`}
        role="img"
        aria-label={`Risk of a poor outcome: ${pct.toFixed(1)} percent, ${label} band, level ${meta?.level ?? '?'} of 4.`}
      >
        <div className="flex items-baseline gap-1">
          <span className="numeral text-hero font-medium">{pct.toFixed(0)}</span>
          <span className="font-display text-title font-medium">%</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span aria-hidden="true" className="font-mono text-small tracking-tight">
            {glyph}
          </span>
          <span className="text-small font-semibold uppercase tracking-[0.08em]">
            {label} risk
          </span>
        </div>
        <p className="mt-1 text-small opacity-90">of a poor outcome after knee replacement</p>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border-l-[3px] border-y border-r border-y-line border-r-line px-2 py-0.5 text-small font-semibold ${classes}`}
      role="img"
      aria-label={`${pct.toFixed(0)} percent, ${label} risk`}
    >
      <span aria-hidden="true" className="font-mono text-micro tracking-tight">
        {glyph}
      </span>
      <span className="tnum">{pct.toFixed(0)}%</span>
      <span className="font-normal opacity-90">{label}</span>
    </span>
  );
}

/**
 * A 0-100% track with the four band boundaries and this patient's position —
 * the worklist's per-row miniature of the risk ladder. Numbers are in the
 * badge beside it; this only adds *where on the scale*.
 */
export function RiskTrack({ probability, band }: { probability: number; band: string }) {
  const pct = Math.max(0, Math.min(100, probability * 100));
  const mark = `var(--mf-risk-${band.replace('_', '-')}-mark)`;
  return (
    <svg viewBox="0 0 100 8" className="h-2 w-full max-w-[120px]" aria-hidden="true" preserveAspectRatio="none">
      <rect x="0" y="2" width="100" height="4" rx="2" fill="var(--mf-chart-grid)" />
      {[20, 40, 60].map((t) => (
        <rect key={t} x={t - 0.4} y="1" width="0.8" height="6" fill="var(--mf-chart-axis)" opacity="0.6" />
      ))}
      <rect x="0" y="2" width={pct} height="4" rx="2" fill={mark} />
      <circle cx={pct} cy="4" r="3" fill={mark} stroke="var(--mf-elevated)" strokeWidth="1" />
    </svg>
  );
}
