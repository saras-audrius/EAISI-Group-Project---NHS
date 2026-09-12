import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { BRAND } from '@/brand';
import { DevPanel } from '@/components/DevPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wordmark } from '@/components/Wordmark';
import { useAuth } from '@/hooks/AuthContext';
import { isOfflineDemo } from '@/services/patients';

/**
 * The frame every signed-in screen sits in.
 *
 * Header is one row and stays one row: a worklist tool is used between clinics,
 * and vertical space spent on chrome is vertical space not spent on patients.
 * There is no hero, no gradient and no marketing.
 */
export function AppShell({
  children,
  syntheticData,
}: {
  children: ReactNode;
  /** True when the cohort on screen is synthetic — drives the banner, not a footnote. */
  syntheticData: boolean;
}) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main"
        className="sr-only-text focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-elevated focus:px-3 focus:py-2 focus:text-small focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <Link to="/" className="min-w-0 rounded" aria-label={`${BRAND.product} — cohort list`}>
            <Wordmark />
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <>
                <span className="hidden text-small text-muted sm:block">{user.name}</span>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded border border-line px-2.5 py-1 text-small font-medium text-ink transition-colors hover:bg-sunken"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>

        {/* A synthetic cohort has to announce itself where the patients are, on
            every screen, in the reading path — not in a footer nobody reaches. */}
        {syntheticData && (
          <div
            role="note"
            className="border-t border-warn-border bg-warn-tint px-4 py-1.5 text-center text-micro font-medium text-warn-ink"
          >
            Demonstration data — every patient shown here is synthetic. No real
            person appears in this system.
          </div>
        )}
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-5">
        {children}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 text-micro leading-relaxed text-muted">
        <p className="mb-2 font-medium text-ink">{BRAND.disclaimer}</p>
        <p>
          Scores are read from <code className="font-mono">gold.patient_risk</code> in
          OneLake and produced by the registered model{' '}
          <code className="font-mono">knee-poor-outcome-ebm@champion</code>. Access is
          filtered per clinician by row-level security on the data entity, enforced in
          Data API Builder rather than in this application. Every decision recorded here
          is stored with the model version it was made against.
        </p>
        <p className="mt-2">
          Outcome measures are the Oxford Knee Score and the EQ-5D-3L, from the NHS PROMs
          knee replacement dataset. {BRAND.org} is a fictional organisation created for
          this demonstration.
          {isOfflineDemo() && ' This build is running offline against local fixtures.'}
        </p>
      </footer>

      <DevPanel />
    </div>
  );
}
