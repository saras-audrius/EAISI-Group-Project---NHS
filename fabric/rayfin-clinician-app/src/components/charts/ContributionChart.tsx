import { contributionInWords, describeFeatureValue, featureValueShort } from '@/clinical';
import type { ExplanationRow } from '@/services/patients';

import { ChartFrame, EmptyChart } from './ChartFrame';
import { CHART_COLOR, scale, ticks } from './chartUtils';

interface ContributionChartProps {
  rows: ExplanationRow[];
  /** Called when a row is activated, so the page can show the matching shape function. */
  onSelectFeature?: (feature: string) => void;
  selectedFeature?: string;
}

const W = 520;
const ROW_H = 34;
const PAD = { top: 22, right: 12, bottom: 30, left: 210 };

/**
 * The model's own additive terms, drawn as a diverging bar chart.
 *
 * This is a faithful rendering rather than an illustration: these are the
 * Explainable Boosting Machine's term contributions, and the prediction *is*
 * their sum. There is no separate explanation model to disagree with, which is
 * the one thing a glassbox buys you that SHAP over a forest cannot.
 *
 * Four things the previous version left out, each of which mattered:
 *
 * * **an axis with units.** It had bars scaled to the largest one and no
 *   reference, so the same picture could describe a decisive factor or a
 *   negligible one.
 * * **the value in clinical terms.** "value 3" is not a feature value a
 *   clinician can check; "3 conditions" is.
 * * **the log-odds translated.** `+0.42` is meaningless at a bedside and will be
 *   nodded at anyway, which is the automation-bias failure in miniature. Each row
 *   states the odds multiplier in words.
 * * **an interaction.** Selecting a factor pulls up its shape function, so "why"
 *   can become "what would change it".
 */
export function ContributionChart({
  rows,
  onSelectFeature,
  selectedFeature,
}: ContributionChartProps) {
  if (rows.length === 0) {
    return (
      <EmptyChart
        title="Contributing factors"
        message="No explanation has been published for this patient."
        detail="Explanations are written by notebook 50 and synced by notebook 60. A score without one should not be acted on."
      />
    );
  }

  const sorted = [...rows].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const extent = Math.max(...sorted.map((r) => Math.abs(r.contribution)), 0.1);
  const domain: [number, number] = [-extent * 1.15, extent * 1.15];
  const height = PAD.top + sorted.length * ROW_H + PAD.bottom;

  const x = (v: number) => scale(v, domain, [PAD.left, W - PAD.right]);
  const zero = x(0);

  const total = sorted.reduce((a, r) => a + r.contribution, 0);

  return (
    <ChartFrame
      title="Contributing factors"
      caption={`These ${sorted.length} factors moved this patient furthest from an average waiting-list patient. Bars to the right raise the risk, bars to the left lower it.`}
      denominator="Units are log-odds — the scale the model adds in. The plain-English multiplier beside each bar is the same number, exponentiated: it is how many times the odds of a poor outcome change."
      ariaLabel={`Diverging bar chart of ${sorted.length} contributing factors, in log-odds. ${sorted
        .map(
          (r) =>
            `${r.featureLabel}, ${featureValueShort(r.feature, r.featureValue)}, ${r.contribution > 0 ? 'increases' : 'reduces'} risk by ${Math.abs(r.contribution).toFixed(2)} log-odds`
        )
        .join('. ')}.`}
      table={{
        headers: ['Factor', 'What the patient answered', 'Recorded as', 'Log-odds', 'In words'],
        rows: sorted.map((r) => [
          r.featureLabel,
          featureValueShort(r.feature, r.featureValue),
          formatFeatureValue(r.featureValue),
          `${r.contribution > 0 ? '+' : ''}${r.contribution.toFixed(3)}`,
          contributionInWords(r.contribution),
        ]),
      }}
      footnote={`These six sum to ${total > 0 ? '+' : ''}${total.toFixed(2)} log-odds. The full model has more terms; the rest are individually small and are not shown.`}
    >
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full">
        {ticks(domain, 4).map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              y1={PAD.top - 6}
              x2={x(t)}
              y2={height - PAD.bottom}
              stroke={CHART_COLOR.grid}
              strokeWidth={1}
            />
            <text
              x={x(t)}
              y={height - PAD.bottom + 12}
              textAnchor="middle"
              fontSize={9}
              fill={CHART_COLOR.axis}
            >
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}

        <text x={PAD.left} y={12} fontSize={9} fill={CHART_COLOR.axis}>
          ← lowers risk
        </text>
        <text x={W - PAD.right} y={12} textAnchor="end" fontSize={9} fill={CHART_COLOR.axis}>
          raises risk →
        </text>

        {sorted.map((r, i) => {
          const y = PAD.top + i * ROW_H;
          const increases = r.contribution > 0;
          const barX = increases ? zero : x(r.contribution);
          const barW = Math.max(1, Math.abs(x(r.contribution) - zero));
          const selected = selectedFeature === r.feature;
          return (
            <g key={r.feature}>
              {selected && (
                <rect
                  x={2}
                  y={y - 2}
                  width={W - 4}
                  height={ROW_H - 4}
                  fill="var(--mf-accent-tint)"
                  rx={3}
                />
              )}
              <text
                x={PAD.left - 8}
                y={y + 12}
                textAnchor="end"
                fontSize={11}
                fontWeight={600}
                fill="var(--mf-text-primary)"
              >
                {truncate(r.featureLabel, 30)}
              </text>
              <text
                x={PAD.left - 8}
                y={y + 24}
                textAnchor="end"
                fontSize={9}
                fill={CHART_COLOR.axis}
              >
                {truncate(featureValueShort(r.feature, r.featureValue), 34)}
              </text>

              <rect
                x={barX}
                y={y + 3}
                width={barW}
                height={ROW_H - 14}
                fill={increases ? CHART_COLOR.increase : CHART_COLOR.decrease}
              />
              {/* The sign is written on the bar as well as encoded by its side, so
                  a monochrome print still reads. */}
              <text
                x={increases ? barX + barW + 4 : barX - 4}
                y={y + ROW_H / 2 + 1}
                textAnchor={increases ? 'start' : 'end'}
                fontSize={10}
                fontWeight={700}
                fill={increases ? CHART_COLOR.increase : CHART_COLOR.decrease}
              >
                {increases ? '+' : '−'}
                {Math.abs(r.contribution).toFixed(2)}
              </text>
            </g>
          );
        })}

        <line
          x1={zero}
          y1={PAD.top - 6}
          x2={zero}
          y2={height - PAD.bottom}
          stroke={CHART_COLOR.you}
          strokeWidth={1.5}
        />
        <text
          x={zero}
          y={height - 4}
          textAnchor="middle"
          fontSize={9}
          fill={CHART_COLOR.axis}
        >
          average patient · contribution to log-odds
        </text>
      </svg>

      {/* The interactive layer is HTML, not SVG: real buttons, real focus order,
          real screen-reader semantics. The chart above is decoration for them. */}
      <ul className="mt-3 space-y-1">
        {sorted.map((r) => {
          const selected = selectedFeature === r.feature;
          const meaning = describeFeatureValue(r.feature, r.featureValue);
          const body = (
            <>
              <span className="font-medium text-ink">{r.featureLabel}</span>
              <span className="text-muted"> — </span>
              <span className={`font-medium ${meaning?.isWorst ? 'text-risk-very-high' : 'text-ink'}`}>
                {featureValueShort(r.feature, r.featureValue)}
              </span>
              <span className="text-muted">, </span>
              <span className={r.contribution > 0 ? 'text-risk-high' : 'text-risk-low'}>
                {contributionInWords(r.contribution)}
              </span>
              {/* The raw code and the question behind it, for a clinician
                  checking the model's input against the patient. The number is
                  what the model saw; the sentence is what it means. */}
              {meaning && (
                <span className="mt-0.5 block text-micro text-muted">
                  {meaning.question ? `${meaning.question} · ` : ''}
                  recorded as {formatFeatureValue(r.featureValue)}
                  {meaning.scale ? ` — ${meaning.scale}` : ''}
                </span>
              )}
            </>
          );
          return (
            <li key={r.feature} className="text-small leading-5">
              {onSelectFeature ? (
                <button
                  type="button"
                  onClick={() => onSelectFeature(r.feature)}
                  aria-pressed={selected}
                  className={`w-full rounded px-2 py-1 text-left transition-colors hover:bg-sunken ${
                    selected ? 'bg-accent-tint' : ''
                  }`}
                >
                  {body}
                  <span className="ml-1 text-micro text-accent-text">
                    {selected ? '· showing how this moves risk' : '· see how this moves risk'}
                  </span>
                </button>
              ) : (
                <span className="block px-2 py-1">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function formatFeatureValue(v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return 'value not recorded';
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
