import type { ReactNode } from 'react';

/**
 * The small set of shapes every screen is built from.
 *
 * One card, one section header, one stat, one empty state and one error state,
 * used everywhere. A clinician scanning between clinics should never have to
 * work out what kind of box they are looking at.
 */

export function Card({
  children,
  className = '',
  as: Tag = 'section',
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
  style?: React.CSSProperties;
}) {
  return (
    <Tag
      style={style}
      className={`rounded-[var(--radius-card)] border border-line bg-elevated ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  hint,
  id,
  actions,
  eyebrow,
}: {
  title: string;
  hint?: ReactNode;
  id?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 id={id} className="text-lead font-semibold text-ink">
          {title}
        </h2>
        {hint && <p className="mt-0.5 max-w-prose text-small text-muted">{hint}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  hint,
  tone = 'ink',
  size = 'lg',
}: {
  label: string;
  value: ReactNode;
  /** Units are not optional in this app by convention. Pass one or explain why not. */
  unit?: string;
  hint?: ReactNode;
  tone?: 'ink' | 'accent' | 'ochre' | 'clay';
  /**
   * `lg` is the headline size. Use `md` in dense grids — three or more columns
   * inside a card — where a real five-digit cohort count at `lg` is wider than
   * its column.
   */
  size?: 'lg' | 'md';
}) {
  const color =
    tone === 'accent'
      ? 'text-accent-text'
      : tone === 'ochre'
        ? 'text-ochre'
        : tone === 'clay'
          ? 'text-clay'
          : 'text-ink';
  return (
    // `min-w-0` is load-bearing. A grid item defaults to `min-width: auto`, so
    // without it a long value cannot shrink below its own width and spills into
    // the next column — which is how "25,997 patients" ended up sitting on top of
    // the cell beside it once real cohort counts replaced the fixtures.
    <div className="min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd
        className={`numeral mt-1 flex flex-wrap items-baseline gap-x-1.5 font-medium leading-none ${
          size === 'lg' ? 'text-display' : 'text-title'
        } ${color}`}
      >
        <span className="min-w-0 break-words">{value}</span>
        {unit && <span className="font-sans text-small font-normal text-muted">{unit}</span>}
      </dd>
      {hint && <dd className="mt-1.5 max-w-[26ch] text-micro leading-4 text-muted">{hint}</dd>}
    </div>
  );
}

/** The value a field takes when the questionnaire did not record one. Never a zero. */
export function NotRecorded({ title }: { title?: string }) {
  return (
    <span
      className="text-small italic text-muted"
      title={title ?? 'Not recorded on the questionnaire. Shown as missing rather than as a zero.'}
    >
      not recorded
    </span>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: ReactNode }) {
  return (
    <div className="px-5 py-8 text-center">
      <p className="font-display text-lead text-ink">{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-prose text-small text-muted">{detail}</p>}
    </div>
  );
}

export function ErrorState({
  what,
  detail,
  onRetry,
}: {
  what: string;
  detail?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="m-4 rounded-lg border border-danger-border bg-danger-tint px-4 py-3 text-small text-danger-ink"
    >
      <p className="font-semibold">{what}</p>
      {detail && <p className="mt-1 break-words font-mono text-micro opacity-90">{detail}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded border border-danger-border bg-elevated px-2.5 py-1 text-micro font-medium text-ink hover:bg-sunken"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingBlock({ label, lines = 3 }: { label: string; lines?: number }) {
  return (
    <div className="space-y-2.5 p-5" role="status" aria-label={label}>
      <span className="sr-only-text">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-3 animate-pulse rounded bg-sunken"
          style={{ width: `${[92, 70, 84, 58, 76, 64, 88, 50][i % 8]}%` }}
        />
      ))}
    </div>
  );
}

/** A small mono label chip, for tables, model versions and source names. */
export function Chip({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'warn' | 'danger';
  title?: string;
}) {
  const cls =
    tone === 'accent'
      ? 'border-accent/30 bg-accent-tint text-accent-text'
      : tone === 'warn'
        ? 'border-warn-border bg-warn-tint text-warn-ink'
        : tone === 'danger'
          ? 'border-danger-border bg-danger-tint text-danger-ink'
          : 'border-line bg-sunken text-muted';
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-micro ${cls}`}
    >
      {children}
    </span>
  );
}
