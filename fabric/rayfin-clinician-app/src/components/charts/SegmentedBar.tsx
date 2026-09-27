interface Segment {
  key: string;
  label: string;
  n: number;
  fill: string;
}

/**
 * Parts of a whole as lengths, with the counts written on. Used for the
 * oversight mix (reviewed / not yet) and the agreement mix (agreed / overrode).
 * A pie would compare the same numbers by angle, which people do badly.
 */
export function SegmentedBar({ segments, total, label }: { segments: Segment[]; total: number; label: string }) {
  const W = 400;
  const H = 22;
  let cursor = 0;
  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-5 w-full"
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.n} ${s.label}`).join(', ')}, out of ${total}.`}
        preserveAspectRatio="none"
      >
        <rect x={0} y={0} width={W} height={H} rx={4} fill="var(--mf-chart-grid)" />
        {segments.map((s) => {
          const w = total > 0 ? (s.n / total) * W : 0;
          const x = cursor;
          cursor += w;
          if (w === 0) return null;
          return (
            <g key={s.key}>
              <rect x={x} y={0} width={Math.max(0, w - 1.5)} height={H} rx={4} fill={s.fill} />
              {w > 28 && (
                <text
                  x={x + w / 2}
                  y={H / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--mf-text-inverse)"
                  style={{ paintOrder: 'stroke' }}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={2}
                >
                  {s.n}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-micro text-muted">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.fill }} />
            {s.label} <span className="tnum text-ink">{s.n}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
