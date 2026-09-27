import { useId, useMemo, useState } from 'react';

import type { PatientRow, ThresholdOptionRow } from '@/services/patients';

import { CHART_COLOR, scale } from './chartUtils';

interface OperatingPointExplorerProps {
  options: ThresholdOptionRow[];
  patients: PatientRow[];
}

const W = 560;
const H = 120;
const PAD = { top: 14, right: 12, bottom: 28, left: 12 };

/**
 * The threshold what-if, as a control rather than a chart to be read.
 *
 * Notebook 42's argument is that the cut-off is a service policy: nothing in
 * the training data can decide whether a missed poor outcome is worse than an
 * unnecessary conversation. So the clinical team should be able to move it and
 * watch what happens — in patients per 1,000 on the held-out set, and in
 * patients on their own list right now.
 */
export function OperatingPointExplorer({ options, patients }: OperatingPointExplorerProps) {
  const sorted = useMemo(() => [...options].sort((a, b) => a.threshold - b.threshold), [options]);
  const chosenIndex = Math.max(0, sorted.findIndex((o) => o.isChosen));
  const [index, setIndex] = useState(chosenIndex);
  const id = useId();

  if (sorted.length === 0) {
    return (
      <p className="p-5 text-small text-muted">No threshold sweep has been published for this model version.</p>
    );
  }

  const current = sorted[Math.min(index, sorted.length - 1)];
  const chosen = sorted[chosenIndex];
  const flaggedNow = patients.filter((p) => p.riskPoorOutcome >= current.threshold).length;
  const flaggedChosen = patients.filter((p) => p.riskPoorOutcome >= chosen.threshold).length;
  const delta = flaggedNow - flaggedChosen;

  const x = (v: number) => scale(v, [sorted[0].threshold, sorted[sorted.length - 1].threshold], [PAD.left, W - PAD.right]);
  const maxMissed = Math.max(...sorted.map((o) => o.missedPer1000), 1);
  const maxFlag = Math.max(...sorted.map((o) => o.flaggedPer1000), 1);
  const yTop = PAD.top;
  const yBase = H - PAD.bottom;
  const yFor = (v: number, max: number) => scale(v, [0, max], [yBase, yTop]);

  const pathOf = (key: 'flaggedPer1000' | 'missedPer1000', max: number) =>
    sorted.map((o, i) => `${i === 0 ? 'M' : 'L'}${x(o.threshold)},${yFor(o[key], max)}`).join(' ');

  return (
    <div className="p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <label htmlFor={id} className="flex items-baseline justify-between text-small font-medium text-ink">
            <span>Cut-off for a review flag</span>
            <span className="numeral text-title text-accent-text">{current.threshold.toFixed(2)}</span>
          </label>
          <input
            id={id}
            type="range"
            min={0}
            max={sorted.length - 1}
            step={1}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--mf-accent)]"
            aria-valuetext={`${current.threshold.toFixed(2)}${current.isChosen ? ', the cut-off in use' : ''}`}
          />
          <div className="mt-1 flex justify-between text-micro text-muted">
            <span>{sorted[0].threshold.toFixed(2)} · flag almost everyone</span>
            <span>{sorted[sorted.length - 1].threshold.toFixed(2)} · flag almost no one</span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-3">
            <Figure label="Flagged / 1,000" value={current.flaggedPer1000} tone="ink" />
            <Figure label="Of which unnecessary" value={current.falseAlarmsPer1000} tone="ochre" />
            <Figure label="Poor outcomes missed" value={current.missedPer1000} tone="clay" />
          </dl>

          <p className="mt-4 rounded-lg border border-line bg-sunken px-3 py-2 text-small text-ink">
            On your list this would flag{' '}
            <strong className="tnum">{flaggedNow}</strong> of {patients.length} patients
            {current.isChosen ? (
              <span className="text-muted"> — this is the cut-off in use.</span>
            ) : (
              <span className="text-muted">
                {' '}
                ({delta > 0 ? `${delta} more` : delta < 0 ? `${-delta} fewer` : 'the same'} than the{' '}
                {chosen.threshold.toFixed(2)} in use).
              </span>
            )}
          </p>
        </div>

        <figure className="m-0 min-w-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Two lines across the cut-off range: patients flagged per 1,000, falling as the cut-off rises, and poor outcomes missed per 1,000, rising. The selected cut-off ${current.threshold.toFixed(2)} is marked.`}>
            <line x1={PAD.left} y1={yBase} x2={W - PAD.right} y2={yBase} stroke={CHART_COLOR.axis} />
            {sorted.map((o) => (
              <text key={o.threshold} x={x(o.threshold)} y={yBase + 12} textAnchor="middle" fontSize={8} fill={o.isChosen ? 'var(--mf-accent-text)' : CHART_COLOR.axis} fontWeight={o.isChosen ? 700 : 400}>
                {o.threshold.toFixed(2)}
              </text>
            ))}
            <path d={pathOf('flaggedPer1000', maxFlag)} fill="none" stroke={CHART_COLOR.you} strokeWidth={2} />
            <path d={pathOf('missedPer1000', maxMissed)} fill="none" stroke={CHART_COLOR.increase} strokeWidth={2} strokeDasharray="5 3" />
            <line x1={x(current.threshold)} y1={yTop - 4} x2={x(current.threshold)} y2={yBase} stroke="var(--mf-accent)" strokeWidth={2} />
            <circle cx={x(current.threshold)} cy={yFor(current.flaggedPer1000, maxFlag)} r={5} fill={CHART_COLOR.you} stroke="var(--mf-elevated)" strokeWidth={2} />
            <circle cx={x(current.threshold)} cy={yFor(current.missedPer1000, maxMissed)} r={5} fill={CHART_COLOR.increase} stroke="var(--mf-elevated)" strokeWidth={2} />
            <text x={PAD.left + 2} y={yTop + 2} fontSize={9} fill={CHART_COLOR.you} fontWeight={600}>
              flagged / 1,000
            </text>
            <text x={W - PAD.right - 2} y={yTop + 2} textAnchor="end" fontSize={9} fill={CHART_COLOR.increase} fontWeight={600}>
              missed / 1,000
            </text>
          </svg>
          <figcaption className="mt-2 text-micro text-muted">
            Each line on its own scale, from zero to its maximum across the sweep. Held-out test set, per 1,000 patients. The cut-off is a service decision, not a model output.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: number; tone: 'ink' | 'ochre' | 'clay' }) {
  const color = tone === 'ochre' ? 'text-ochre' : tone === 'clay' ? 'text-clay' : 'text-ink';
  return (
    <div>
      <dt className="text-micro font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`numeral mt-0.5 text-title ${color}`}>{value}</dd>
    </div>
  );
}
