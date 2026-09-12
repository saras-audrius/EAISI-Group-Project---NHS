import type { ReactNode } from 'react';

/**
 * The small set of shapes every screen is built from.
 *
 * There is one card, one section header, one stat, one empty state and one error
 * state, and they are used everywhere. That is the point: a clinician scanning
 * between clinics should never have to work out what kind of box they are
 * looking at, and a screen that invents a new container per feature is a screen
 * that has to be re-read every time.
 */

export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag
      className={`rounded-lg border border-line bg-elevated ${className}`}
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
}: {
  title: string;
  hint?: ReactNode;
  id?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h2 id={id} className="text-body font-semibold text-ink">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-small text-muted">{hint}</p>}
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
}: {
  label: string;
  value: ReactNode;
  /** Units are not optional in this app by convention. Pass one or explain why not. */
  unit?: string;
  hint?: ReactNode;
}) {
  return (
    <div>
      <dt className="text-micro font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-lead font-semibold tnum text-ink">
        {value}
        {unit && <span className="ml-1 text-small font-normal text-muted">{unit}</span>}
      </dd>
      {hint && <dd className="text-micro leading-4 text-muted">{hint}</dd>}
    </div>
  );
}

/** The value a field takes when the questionnaire did not record one. Never a zero. */
export function NotRecorded({ title }: { title?: string }) {
  return (
    <span
      className="text-muted italic"
      title={title ?? 'This field was not captured for this patient.'}
    >
      not recorded
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-sunken ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * The state where a fetch has not finished. It reserves the space the content
 * will occupy so the page does not jump under a clinician mid-read.
 */
export function LoadingBlock({ label, lines = 3 }: { label: string; lines?: number }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-live="polite">
      <span className="sr-only-text">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={i === 0 ? 'h-4 w-2/5' : 'h-4 w-full'} />
      ))}
    </div>
  );
}

/**
 * A fetch that failed.
 *
 * It says what could not be loaded and offers a retry, because the alternative —
 * a chart area that renders empty — is a clinician silently reading a missing
 * factor as an absent one.
 */
export function ErrorState({
  what,
  detail,
  onRetry,
}: {
  what: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="m-4 rounded-md border border-danger-border bg-danger-tint p-3 text-small text-danger-ink"
    >
      <p className="font-semibold">{what}</p>
      {detail && <p className="mt-1 break-words opacity-90">{detail}</p>}
      <p className="mt-1 opacity-90">
        Nothing is missing from the patient's record — this screen could not read it.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded border border-danger-border px-2.5 py-1 text-micro font-medium hover:bg-danger-border/25"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** A successful fetch that returned nothing. Distinct from an error, on purpose. */
export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="p-6 text-center">
      <p className="text-small font-medium text-ink">{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-md text-small text-muted">{detail}</p>}
    </div>
  );
}

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'warn';
}) {
  const tones = {
    neutral: 'border-line bg-sunken text-muted',
    accent: 'border-accent/40 bg-accent-tint text-accent-text',
    warn: 'border-warn-border bg-warn-tint text-warn-ink',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-micro font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
