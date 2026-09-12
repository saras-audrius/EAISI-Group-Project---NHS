import type { ReactNode } from 'react';

export interface ChartTable {
  headers: string[];
  rows: (string | number)[][];
}

interface ChartFrameProps {
  title: string;
  /** One line of plain English saying what the chart means. Not what it shows — what it means. */
  caption: string;
  /**
   * What the numbers are out of. A chart without a stated denominator is a chart
   * that can be read as anything.
   */
  denominator: string;
  /** The whole chart as one sentence, for `role="img"`. */
  ariaLabel: string;
  /** The same data as a table. Mandatory: see the note below. */
  table: ChartTable;
  children: ReactNode;
  footnote?: ReactNode;
}

/**
 * Every chart in this app is wrapped in this.
 *
 * It exists to make four things impossible to forget rather than optional:
 *
 * * a caption in plain English — a chart a clinician has to decode is a chart
 *   they will ignore, which is the recurring finding in the deterioration-score
 *   literature;
 * * a stated denominator;
 * * an `aria-label` that is a real sentence, not "chart";
 * * a **text equivalent**. It is a `<details>`, so it is keyboard reachable and
 *   useful to sighted users too — the Predict: Breast Cancer redevelopment found
 *   clinicians wanted the table for exactly the small differences a plot flattens.
 *
 * The SVG child is `aria-hidden`; the label and the table carry the meaning.
 */
export function ChartFrame({
  title,
  caption,
  denominator,
  ariaLabel,
  table,
  children,
  footnote,
}: ChartFrameProps) {
  return (
    <figure className="m-0">
      <div role="img" aria-label={ariaLabel}>
        <div aria-hidden="true">{children}</div>
      </div>

      <figcaption className="mt-2 space-y-1">
        <p className="text-small text-ink">{caption}</p>
        <p className="text-micro text-muted">{denominator}</p>
        {footnote && <p className="text-micro text-muted">{footnote}</p>}
      </figcaption>

      <details className="mt-2 group">
        <summary className="cursor-pointer list-none text-micro font-medium text-accent-text underline decoration-dotted underline-offset-2">
          <span className="group-open:hidden">Show the numbers</span>
          <span className="hidden group-open:inline">Hide the numbers</span>
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-micro">
            <caption className="sr-only-text">{title}: underlying values</caption>
            <thead>
              <tr>
                {table.headers.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="border-b border-line px-2 py-1 text-left font-semibold text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border-b border-line px-2 py-1 text-ink">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/**
 * What a chart renders when its data has not arrived.
 *
 * A blank panel is the failure mode that matters here: a clinician reads absence
 * of a chart as absence of a finding. So the empty state names the chart, says
 * the data is missing rather than the finding, and says what would produce it.
 */
export function EmptyChart({
  title,
  message,
  detail,
}: {
  title: string;
  message: string;
  detail?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${title}: no data available. ${message}`}
      className="rounded border border-dashed border-line-strong bg-sunken px-4 py-6 text-center"
    >
      <p className="text-small font-medium text-ink">{title} — not available</p>
      <p className="mt-1 text-small text-muted">{message}</p>
      {detail && <p className="mt-1 text-micro text-muted">{detail}</p>}
    </div>
  );
}
