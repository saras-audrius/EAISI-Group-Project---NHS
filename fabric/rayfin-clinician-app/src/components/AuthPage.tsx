import { useState } from 'react';

import { BRAND } from '@/brand';
import { ThemeToggle } from '@/components/ThemeToggle';
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
 * The first screen anybody sees, and the one that has to establish what this is.
 *
 * It previously said "Todo App" over a gradient with two decorative blur circles
 * — untouched template boilerplate. That is not a cosmetic problem. The sign-in
 * page is where a clinical system declares whose it is, what it does, and what it
 * does not do, and a screen that declares none of those things has already
 * mis-set expectations before the first patient is loaded.
 *
 * So: the organisation, the product, the outcome being predicted, and the
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
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-line bg-elevated">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <Wordmark />
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 items-start px-4 py-10">
        <div className="w-full space-y-5">
          <div>
            <h1 className="text-title font-semibold tracking-tight text-ink">
              Pre-operative outcome review
            </h1>
            <p className="mt-2 max-w-prose text-body text-muted">
              A calibrated model scores patients awaiting knee replacement for the
              probability of a <strong className="text-ink">poor outcome</strong> — an
              Oxford Knee Score gain of 7 points or fewer at six months, at or below the
              minimal clinically important difference. You review the score, see the
              reasoning behind it, and record what you decided.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-elevated p-4">
            <h2 className="text-small font-semibold text-ink">What this tool is</h2>
            <p className="mt-1 max-w-prose text-small text-muted">{BRAND.disclaimer}</p>
            <p className="mt-2 max-w-prose text-small text-muted">
              Your recorded decision — including whether you agreed with the model or
              overrode it, and why — is the oversight record. It is stored against the
              model version you actually saw.
            </p>
          </div>

          {offline && (
            <div
              role="note"
              className="rounded-lg border border-warn-border bg-warn-tint p-4 text-small text-warn-ink"
            >
              <strong className="block">Offline demonstration.</strong>
              This build serves synthetic patients from local fixtures. There is no
              backend, no tenant and no real clinical data anywhere in it.
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-small font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fabricAuthEnabled && msLogo}
              {buttonLabel}
            </button>
            {error && (
              <p role="alert" className="mt-2 text-small text-danger-ink">
                {error}
              </p>
            )}
            <p className="mt-2 text-micro text-muted">
              {fabricAuthEnabled
                ? 'Sign-in is brokered by Microsoft Entra through Fabric. Which patients you can see is decided by row-level security on the data, not by this application.'
                : 'No credentials are sent anywhere. This is a local demonstration identity.'}
            </p>
          </div>
        </div>
      </div>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-8 text-micro text-muted">
        {BRAND.org} is a fictional organisation created for this demonstration. The
        Oxford Knee Score, the EQ-5D-3L and the NHS PROMs dataset the underlying model
        was trained on are real and are named accurately.
      </footer>
    </div>
  );
}
