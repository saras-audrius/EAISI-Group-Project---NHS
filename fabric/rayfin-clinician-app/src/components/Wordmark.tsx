import { BRAND } from '@/brand';

/**
 * The Marrowfield mark: two offset bars on a rule, read as a joint line.
 *
 * Drawn rather than fetched — an app served from static hosting should not make
 * a network request to render its own logo. It is a geometric mark on purpose:
 * it has to be unmistakably *not* the emblem of any real health organisation,
 * and a plain shape cannot be confused for one.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 28 28"
        className="h-7 w-7 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="0.5" y="0.5" width="27" height="27" rx="5" fill="var(--mf-accent)" />
        <rect x="7" y="6" width="4.5" height="11" rx="1.4" fill="var(--mf-accent-fg)" />
        <rect x="16.5" y="11" width="4.5" height="11" rx="1.4" fill="var(--mf-accent-fg)" opacity="0.75" />
        <rect x="6" y="19.5" width="16" height="2" rx="1" fill="var(--mf-accent-fg)" opacity="0.55" />
      </svg>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-body font-semibold tracking-tight text-ink">
          {BRAND.product}
        </span>
        {!compact && (
          <span className="block truncate text-micro text-muted">
            {BRAND.org} · {BRAND.orgQualifier}
          </span>
        )}
      </span>
    </span>
  );
}
