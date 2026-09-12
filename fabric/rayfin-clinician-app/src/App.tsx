import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { AuthPage } from '@/components/AuthPage';
import { Card, EmptyState } from '@/components/ui/Primitives';
import { useAuth } from '@/hooks/AuthContext';
import { CohortPage } from '@/pages/CohortPage';
import { PatientPage } from '@/pages/PatientPage';
import { getModelCard } from '@/services/patients';

/**
 * Routes, and the sign-in gate in front of them.
 *
 * Patient selection used to be `useState` in this component, which meant there
 * was no URL for a patient: no browser back, no deep link, no refresh survival,
 * and no way to send a colleague the record you are looking at. On a review
 * screen that is a workflow defect, not a nicety — a reload in the middle of
 * writing a rationale dropped the clinician back to the list.
 *
 * `/patient/:episodeId` re-queries the patient on load, so the row-level security
 * policy is evaluated on the deep link exactly as on the list.
 */
function App() {
  const { user, loading: authLoading } = useAuth();
  const [synthetic, setSynthetic] = useState(false);

  // The synthetic-data flag comes from governed data, not from a build constant,
  // so a live deployment pointed at a synthetic cohort still declares itself.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getModelCard()
      .then((card) => {
        if (!cancelled) setSynthetic(card?.datasetIsSynthetic ?? false);
      })
      .catch(() => {
        // A model card that will not load is not a reason to hide the rest of the
        // app; the banner simply stays off and the "can I trust this" panel shows
        // its own error.
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-small text-muted">
        <span role="status">Checking your sign-in…</span>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <AppShell syntheticData={synthetic}>
      <Routes>
        <Route path="/" element={<CohortPage />} />
        <Route path="/patient/:episodeId" element={<PatientPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

function NotFound() {
  return (
    <Card>
      <EmptyState
        title="That page does not exist."
        detail="The address may be mistyped, or the patient may have been removed from the pre-operative cohort."
      />
      <div className="px-6 pb-6 text-center">
        <Link to="/" className="text-small font-medium text-accent-text hover:underline">
          ← Back to your pre-operative list
        </Link>
      </div>
    </Card>
  );
}

export default App;
