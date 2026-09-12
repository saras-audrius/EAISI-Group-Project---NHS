import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { formatDate, RISK_BANDS, timeToSurgery } from '@/clinical';
import { BandDistribution } from '@/components/charts/BandDistribution';
import { RiskBadge } from '@/components/RiskBadge';
import { Card, EmptyState, ErrorState, LoadingBlock, SectionHeading } from '@/components/ui/Primitives';
import { useAsync } from '@/hooks/useAsync';
import { listPatients, type PatientRow } from '@/services/patients';

type SortKey = 'risk' | 'surgery' | 'name' | 'oks';

const SORTS: { key: SortKey; label: string; compare: (a: PatientRow, b: PatientRow) => number }[] = [
  { key: 'risk', label: 'Highest risk first', compare: (a, b) => b.riskPoorOutcome - a.riskPoorOutcome },
  {
    key: 'surgery',
    label: 'Soonest surgery first',
    compare: (a, b) =>
      new Date(a.surgeryScheduledDate).getTime() - new Date(b.surgeryScheduledDate).getTime(),
  },
  { key: 'name', label: 'Name (A-Z)', compare: (a, b) => a.displayName.localeCompare(b.displayName) },
  { key: 'oks', label: 'Worst pre-op OKS first', compare: (a, b) => a.oksT0Score - b.oksT0Score },
];

/**
 * The clinician's pre-operative list.
 *
 * Every patient shown here passed the row-level security policy on the
 * `PatientRisk` entity — the list is already filtered to the caller before it
 * leaves Fabric. Nothing on this page filters for security; search and sort are
 * conveniences over data the caller was already entitled to see.
 *
 * Sorted by risk by default, but not *only* by risk. A worklist that can only be
 * ordered by the model's output makes the model the agenda; a surgeon whose next
 * clinic is Thursday needs the date, and the ordering is theirs to choose.
 */
export function CohortPage() {
  const { data, loading, error, reload } = useAsync(() => listPatients(), []);
  const [query, setQuery] = useState('');
  const [bands, setBands] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const navigate = useNavigate();

  const patients = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of patients) out[p.riskBand] = (out[p.riskBand] ?? 0) + 1;
    return out;
  }, [patients]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const compare = SORTS.find((s) => s.key === sortKey)?.compare ?? SORTS[0].compare;
    return patients
      .filter((p) => bands.size === 0 || bands.has(p.riskBand))
      .filter(
        (p) =>
          q === '' ||
          p.displayName.toLowerCase().includes(q) ||
          p.episodeId.toLowerCase().includes(q) ||
          p.providerCode.toLowerCase().includes(q)
      )
      .sort(compare);
  }, [patients, query, bands, sortKey]);

  const toggleBand = (key: string) => {
    setBands((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-title font-semibold tracking-tight text-ink">
          Pre-operative list
        </h1>
        <p className="mt-1 text-small text-muted">
          Patients awaiting knee replacement who are assigned to you. Filtered by
          row-level security on the data, not by this page.
        </p>
      </div>

      <Card className="p-4">
        {loading ? (
          <LoadingBlock label="Loading your list summary" lines={2} />
        ) : (
          <BandDistribution counts={counts} total={patients.length} />
        )}
      </Card>

      <Card>
        <SectionHeading
          title="Your patients"
          hint={
            loading
              ? 'Loading…'
              : `${visible.length} of ${patients.length} shown${bands.size > 0 || query ? ' — filters applied' : ''}`
          }
        />

        <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="cohort-search" className="mb-1 block text-micro font-medium text-muted">
              Search name, episode id or provider
            </label>
            <input
              id="cohort-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Hughes or MFC-2026-100042"
              className="w-full rounded-md border border-line bg-elevated px-3 py-1.5 text-small text-ink"
            />
          </div>

          <div>
            <label htmlFor="cohort-sort" className="mb-1 block text-micro font-medium text-muted">
              Order by
            </label>
            <select
              id="cohort-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border border-line bg-elevated px-3 py-1.5 text-small text-ink"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="min-w-0">
            <legend className="mb-1 text-micro font-medium text-muted">Risk band</legend>
            <div className="flex flex-wrap gap-1.5">
              {RISK_BANDS.map((b) => {
                const active = bands.has(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleBand(b.key)}
                    className={`rounded border px-2 py-1 text-micro font-medium transition-colors ${
                      active
                        ? 'border-accent bg-accent-tint text-accent-text'
                        : 'border-line text-muted hover:bg-sunken'
                    }`}
                  >
                    <span aria-hidden="true" className="mr-1 font-mono">
                      {b.glyph}
                    </span>
                    {b.label}
                    <span className="ml-1 tnum opacity-70">{counts[b.key] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {error ? (
          <ErrorState
            what="Your pre-operative list could not be loaded."
            detail={error}
            onRetry={reload}
          />
        ) : loading ? (
          <LoadingBlock label="Loading your pre-operative list" lines={6} />
        ) : patients.length === 0 ? (
          <EmptyState
            title="No pre-operative patients are assigned to you."
            detail="Assignment is set in CLINICIAN_ASSIGNMENTS in notebook 60 and enforced by the row-level security policy on the PatientRisk entity."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No patients match these filters."
            detail="Clear the search box or the band filters to see your full list."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-small">
              <caption className="sr-only-text">
                Pre-operative patients assigned to you, {visible.length} rows. Select a row
                to open the patient.
              </caption>
              <thead className="bg-sunken text-micro uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">Patient</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Age band</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Pre-op OKS</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Conditions</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Surgery</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Predicted risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((p) => (
                  // The whole row is clickable for speed, but the link in the first
                  // cell is what carries the semantics: it is focusable, it announces
                  // itself as a link, Enter activates it, and it can be opened in a new
                  // tab. The old `<tr onClick>` had none of that and was unreachable by
                  // keyboard entirely.
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patient/${encodeURIComponent(p.episodeId)}`)}
                    className="cursor-pointer transition-colors hover:bg-sunken"
                  >
                    <td className="px-4 py-2">
                      <Link
                        to={`/patient/${encodeURIComponent(p.episodeId)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-accent-text underline-offset-2 hover:underline"
                      >
                        {p.displayName}
                      </Link>
                      <span className="block font-mono text-micro text-muted">
                        {p.episodeId}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {p.ageBand === 'not_recorded' ? 'not recorded' : (p.ageBand ?? '—')}
                    </td>
                    <td className="px-4 py-2 tnum text-ink">
                      {p.oksT0Score}
                      <span className="text-muted">/48</span>
                    </td>
                    <td className="px-4 py-2 tnum text-ink">
                      {p.comorbidityCount}
                      <span className="text-muted">/12</span>
                    </td>
                    <td className="px-4 py-2 text-ink">
                      {formatDate(p.surgeryScheduledDate)}
                      <span className="block text-micro text-muted">
                        {timeToSurgery(p.surgeryScheduledDate)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <RiskBadge band={p.riskBand} probability={p.riskPoorOutcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
