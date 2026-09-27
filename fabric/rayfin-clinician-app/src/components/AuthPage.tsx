import { useState } from 'react';

import { BRAND } from '@/brand';
import { Wordmark } from '@/components/Wordmark';
import { useAuth } from '@/hooks/AuthContext';
import { isOfflineDemo } from '@/services/patients';

const msLogo = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 21 21"
    className="mr-2"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

/**
 * The first screen anybody sees, and the one that has to establish what this is:
 * the organisation, the product, the outcome being predicted, and the
 * decision-support boundary — before the button, not after it.
 */
export function AuthPage() {
  const { signIn, fabricAuthEnabled } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const offline = isOfflineDemo();

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = isLoading
    ? fabricAuthEnabled
      ? 'Opening Fabric…'
      : 'Signing in…'
    : fabricAuthEnabled
      ? 'Sign in with Microsoft'
      : 'Continue to the offline demonstration';

  return (
    <div className="paper flex min-h-screen flex-col bg-surface">
      <header className="border-b border-line bg-elevated">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-2.5">
          <Wordmark />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:py-20">
        <div className="rise space-y-6" style={{ '--i': 0 } as React.CSSProperties}>
          <div>
            <div className="eyebrow mb-3">Pre-operative decision support · knee replacement</div>
            <h1 className="text-[2.25rem] font-semibold leading-tight tracking-tight text-ink">
              Pre-operative outcome review
            </h1>
            <p className="mt-5 max-w-[52ch] text-lead text-muted">
              A calibrated model scores patients awaiting knee replacement for the
              probability of a <strong className="font-semibold text-ink">poor outcome</strong>{' '}
              — an Oxford Knee Score gain of 7 points or fewer at six months, at or below
              the minimal clinically important difference. You review the score, see the
              reasoning behind it, and record what you decided.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-body font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fabricAuthEnabled && msLogo}
              {buttonLabel}
            </button>
            {error && (
              <p role="alert" className="mt-2 text-small text-danger-ink">
                {error}
              </p>
            )}
            <p className="mt-3 max-w-[56ch] text-micro text-muted">
              {fabricAuthEnabled
                ? 'Sign-in is brokered by Microsoft Entra through Fabric. Which patients you can see is decided by row-level security on the data, not by this application.'
                : 'No credentials are sent anywhere. This is a local demonstration identity.'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="rise rounded-[var(--radius-card)] border border-line bg-elevated p-5"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            <h2 className="text-lead font-semibold text-ink">What this tool is</h2>
            <p className="mt-1.5 text-small text-muted">{BRAND.disclaimer}</p>
            <p className="mt-2 text-small text-muted">
              Your recorded decision — including whether you agreed with the model or
              overrode it, and why — is the oversight record. It is stored against the
              model version you actually saw.
            </p>
          </div>

          <dl
            className="rise grid grid-cols-3 gap-3 rounded-[var(--radius-card)] border border-line bg-elevated p-5"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            {[
              ['Model', 'Glassbox EBM, calibrated'],
              ['Delivery', 'Fabric App · row-level security'],
              ['Oversight', 'Every decision recorded'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-1 text-small font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          {offline && (
            <div
              role="note"
              className="rise rounded-[var(--radius-card)] border border-warn-border bg-warn-tint p-4 text-small text-warn-ink"
              style={{ '--i': 3 } as React.CSSProperties}
            >
              <strong className="block">Offline demonstration.</strong>
              This build serves synthetic patients from local fixtures. There is no
              backend, no tenant and no real clinical data anywhere in it.
            </div>
          )}
        </div>
      </div>

      <footer className="mx-auto w-full max-w-5xl px-5 pb-8 text-micro text-muted">
        {BRAND.org} is a fictional organisation created for this demonstration. The
        Oxford Knee Score, the EQ-5D-3L and the NHS PROMs dataset the underlying model
        was trained on are real and are named accurately.
      </footer>
    </div>
  );
}
