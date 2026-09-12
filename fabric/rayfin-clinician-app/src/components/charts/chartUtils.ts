/**
 * Pure geometry and colour helpers shared by the chart components.
 *
 * Kept out of `ChartFrame` so that file exports components only — the charts are
 * hot-reloaded constantly while a layout is being worked on, and a module that
 * mixes components with constants defeats fast refresh for all of them.
 */

/** Linear map from a data domain onto pixels. */
export function scale(
  value: number,
  domain: [number, number],
  range: [number, number]
): number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return r0;
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/** "Nice" round tick values across a domain — the axis a person would have drawn. */
export function ticks(domain: [number, number], count = 5): number[] {
  const [lo, hi] = domain;
  const raw = (hi - lo) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? magnitude * 10;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) {
    out.push(Number(t.toFixed(6)));
  }
  return out;
}

/** Token name for a band's chart fill, resolved at paint time so themes swap for free. */
export function bandMarkVar(band: string): string {
  return `var(--mf-risk-${band.replace('_', '-')}-mark)`;
}

export const CHART_COLOR = {
  axis: 'var(--mf-chart-axis)',
  grid: 'var(--mf-chart-grid)',
  neutral: 'var(--mf-chart-neutral)',
  you: 'var(--mf-chart-you)',
  increase: 'var(--mf-chart-increase)',
  decrease: 'var(--mf-chart-decrease)',
} as const;

