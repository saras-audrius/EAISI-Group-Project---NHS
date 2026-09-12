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
 * the **word**, with colour third. That ordering is deliberate — this screen gets
 * projected and printed, and roughly one man in twelve cannot separate the
 * high band from the low one by hue. Anything that survives only in colour is
 * information this app does not really have.
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
        className={`rounded-lg border-l-4 border-y border-r border-y-line border-r-line p-4 ${classes}`}
        role="img"
        aria-label={`Risk of a poor outcome: ${pct.toFixed(1)} percent, ${label} band, level ${meta?.level ?? '?'} of 4.`}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-display font-bold tnum">{pct.toFixed(0)}</span>
          <span className="text-lead font-semibold">%</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span aria-hidden="true" className="font-mono text-small tracking-tight">
            {glyph}
          </span>
          <span className="text-small font-semibold uppercase tracking-wide">
            {label} risk
          </span>
        </div>
        <p className="mt-1 text-small opacity-90">of a poor outcome after knee replacement</p>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border-l-[3px] border-y border-r border-y-line border-r-line px-2 py-0.5 text-small font-semibold ${classes}`}
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
