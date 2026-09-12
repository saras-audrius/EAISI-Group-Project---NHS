import { useState } from 'react';

import { useAuth } from '@/hooks/AuthContext';
import { isOfflineDemo } from '@/services/patients';

/**
 * Deployment plumbing, kept out of the clinical surface.
 *
 * The header used to carry a raw app-user GUID with a copy button and a comment
 * about `CLINICIAN_ASSIGNMENTS`. That value is genuinely needed — it is what
 * notebook 60 writes into `assignedClinicianId`, and it cannot be obtained any
 * other way — but it is a deployment affordance, not a clinical one, and a
 * clinician reviewing a patient should not be looking at a GUID.
 *
 * So it lives here: rendered only in a dev build, collapsed by default, pinned to
 * the corner. `import.meta.env.DEV` is false in the Fabric bundle, so this is
 * tree-shaken out of what ships.
 */
export function DevPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!import.meta.env.DEV || !user) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed bottom-3 right-3 z-50 max-w-xs text-micro">
      {open ? (
        <div className="rounded-md border border-line-strong bg-elevated p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="font-semibold text-ink">Developer</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted hover:text-ink"
            >
              close
            </button>
          </div>

          <dl className="space-y-2">
            <div>
              <dt className="text-muted">Backend</dt>
              <dd className="text-ink">
                {isOfflineDemo() ? 'offline fixtures' : 'Fabric · Data API Builder'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Rayfin app user id</dt>
              <dd className="mt-0.5 flex items-center gap-2">
                <code className="min-w-0 break-all font-mono text-ink">{user.id}</code>
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded border border-line px-1.5 py-0.5 hover:bg-sunken"
                >
                  {copied ? 'copied' : 'copy'}
                </button>
              </dd>
              <dd className="mt-1 text-muted">
                The value <code className="font-mono">assignedClinicianId</code> must hold —
                paste it into <code className="font-mono">CLINICIAN_ASSIGNMENTS</code> in
                notebook 60. Not the Entra object id, and not the full{' '}
                <code className="font-mono">sub</code> path.
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-line bg-elevated px-2 py-1 font-medium text-muted shadow hover:text-ink"
        >
          dev
        </button>
      )}
    </div>
  );
}
