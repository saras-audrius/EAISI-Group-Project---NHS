import { useEffect, useState, type FormEvent } from 'react';

import type { PatientRow } from '@/services/patients';

const DECISIONS = [
  { value: 'proceed', label: 'Proceed as planned' },
  { value: 'optimise_first', label: 'Optimise before surgery' },
  { value: 'discuss_alternatives', label: 'Discuss alternatives' },
  { value: 'defer', label: 'Defer decision' },
] as const;

const AGREEMENT = [
  {
    value: 'agreed',
    label: 'The score matches my assessment',
    hint: 'Recorded as agreement with the model.',
  },
  {
    value: 'overridden',
    label: 'My assessment differs from the score',
    hint: 'Recorded as an override. Say what the model is missing.',
  },
] as const;

const MIN_RATIONALE = 20;

interface DecisionFormProps {
  patient: PatientRow;
  onSubmit: (input: {
    decision: string;
    rationale: string;
    modelAgreement: string;
  }) => Promise<void>;
  /** Called after a successful write so the oversight log can refresh. */
  onRecorded?: () => void;
}

/**
 * Human oversight, made recordable — and made deliberately effortful.
 *
 * The EU AI Act requires that a high-risk system be subject to meaningful human
 * oversight. "A clinician looked at it" is not evidence; a decision, a rationale,
 * and an explicit agree/override against a named model version is.
 *
 * Four choices here are anti-automation-bias measures rather than styling:
 *
 * * **Nothing is pre-selected.** The old form defaulted to "proceed" and
 *   "agreed", which meant the fastest path through the screen was to endorse the
 *   model without reading it — the exact commission error the CDS literature
 *   describes. A submit that requires two deliberate choices costs a few seconds
 *   and is the only part of this app that constitutes oversight.
 * * **Agree and override are the same shape, same size, same order every time.**
 *   Overriding must not be visibly the harder path.
 * * **Neither option is worded as the model being right.** "The score matches my
 *   assessment" puts the clinician's judgement first grammatically as well as
 *   procedurally.
 * * **The rationale has a floor.** "Agree" as a rationale is a rubber stamp with
 *   a timestamp; the limit is low enough not to obstruct and high enough to stop
 *   a single word.
 */
export function DecisionForm({ patient, onSubmit, onRecorded }: DecisionFormProps) {
  const [decision, setDecision] = useState('');
  const [rationale, setRationale] = useState('');
  const [agreement, setAgreement] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The form is reused as the route changes. Without this, a success message
  // from one patient could still be on screen above another patient's record —
  // which reads as "a decision has been recorded for this patient" and has not.
  useEffect(() => {
    setDecision('');
    setRationale('');
    setAgreement('');
    setSaved(null);
    setError(null);
  }, [patient.episodeId]);

  const rationaleTooShort = rationale.trim().length < MIN_RATIONALE;
  const incomplete = !decision || !agreement || rationaleTooShort;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (incomplete) return;
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ decision, rationale, modelAgreement: agreement });
      setSaved(
        `Recorded against ${patient.modelName} v${patient.modelVersion}, at the score you were shown (${(patient.riskPoorOutcome * 100).toFixed(1)}%).`
      );
      setDecision('');
      setRationale('');
      setAgreement('');
      onRecorded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save decision.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <fieldset>
        <legend className="mb-2 text-small font-medium text-ink">
          Your assessment against the model
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {AGREEMENT.map((option) => {
            const active = agreement === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer gap-2 rounded-md border p-3 text-small transition-colors ${
                  active ? 'border-accent bg-accent-tint' : 'border-line hover:bg-sunken'
                }`}
              >
                <input
                  type="radio"
                  name="agreement"
                  value={option.value}
                  checked={active}
                  onChange={(e) => setAgreement(e.target.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium text-ink">{option.label}</span>
                  <span className="block text-micro text-muted">{option.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="decision" className="mb-1 block text-small font-medium text-ink">
          Clinical decision
        </label>
        <select
          id="decision"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          required
          className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-small text-ink"
        >
          <option value="" disabled>
            Choose a decision…
          </option>
          {DECISIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="rationale" className="mb-1 block text-small font-medium text-ink">
          Clinical rationale <span className="font-normal text-muted">(required)</span>
        </label>
        <textarea
          id="rationale"
          required
          rows={4}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          aria-describedby="rationale-help"
          placeholder="What informed this decision beyond the model score? If you are overriding, what does the model not know about this patient?"
          className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-small text-ink"
        />
        <p id="rationale-help" className="mt-1 text-micro text-muted">
          {rationaleTooShort
            ? `At least ${MIN_RATIONALE} characters — ${Math.max(0, MIN_RATIONALE - rationale.trim().length)} to go.`
            : 'This is the part an audit reads. Write it for a colleague, not for a form.'}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-small text-danger-ink">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-small text-risk-low">
          {saved}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || incomplete}
          className="rounded-md bg-accent px-4 py-2 text-small font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Recording…' : 'Record decision'}
        </button>
        {incomplete && (
          <span className="text-micro text-muted">
            Choose your assessment, a decision, and give a rationale.
          </span>
        )}
      </div>
    </form>
  );
}
