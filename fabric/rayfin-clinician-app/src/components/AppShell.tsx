import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { BRAND } from '@/brand';
import { DevPanel } from '@/components/DevPanel';
import { Wordmark } from '@/components/Wordmark';
import { useAuth } from '@/hooks/AuthContext';
import { isOfflineDemo } from '@/services/patients';

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Overview', end: true },
  { to: '/worklist', label: 'Worklist' },
  { to: '/ask', label: 'Ask' },
  { to: '/model', label: 'How this works' },
];

/**
 * The frame every signed-in screen sits in.
 *
 * One header row: wordmark, three destinations, theme, who is signed in.
 * There is no hero and no marketing — a worklist tool is used between clinics,
 * and vertical space spent on chrome is space not spent on patients.
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
    <div className="paper min-h-screen bg-surface">
      <a
        href="#main"
        className="sr-only-text focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-elevated focus:px-3 focus:py-2 focus:text-small focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-elevated">
        <div className="mx-auto flex max-w-[1400px] items-stretch gap-8 px-5">
          <Link to="/" className="my-2.5 min-w-0 rounded" aria-label={`${BRAND.product} — overview`}>
            <Wordmark />
          </Link>

          {/* Tabs on the header rule, the way a workspace application labels its
              sections: the active one is underlined, not filled. */}
          <nav aria-label="Primary" className="hidden items-stretch gap-6 sm:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `-mb-px flex items-center border-b-2 px-0.5 text-small font-medium transition-colors ${
                    isActive
                      ? 'border-accent text-ink'
                      : 'border-transparent text-muted hover:border-line-strong hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <>
                <span className="hidden text-small text-muted md:block">{user.name}</span>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-md border border-line px-2.5 py-1 text-small font-medium text-ink transition-colors hover:bg-sunken"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>

        <nav aria-label="Primary, compact" className="flex gap-1 border-t border-line px-3 py-1.5 sm:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1 text-small font-medium ${
                  isActive ? 'bg-accent-tint text-accent-text' : 'text-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* A synthetic cohort has to announce itself where the patients are, on
            every screen, in the reading path — not in a footer nobody reaches. */}
        {syntheticData && (
          <div
            role="note"
            className="border-t border-warn-border bg-warn-tint px-4 py-1 text-center text-micro font-medium text-warn-ink"
          >
            Demonstration data — every patient shown here is synthetic. No real
            person appears in this system.
          </div>
        )}
      </header>

      <main id="main" className="mx-auto max-w-[1400px] px-5 py-6">
        {children}
      </main>

      <footer className="mx-auto max-w-[1400px] px-5 pb-10 pt-8 text-micro leading-relaxed text-muted">
        <div className="border-t border-line pt-4">
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
        </div>
      </footer>

      <DevPanel />
    </div>
  );
}
