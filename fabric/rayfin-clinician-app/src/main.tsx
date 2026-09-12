import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';

import App from '@/App';
import { AuthProvider } from '@/hooks/AuthContext';
import { bootstrapApp } from '@/services/bootstrap';

import './main.css';

// One call decides the backend — governed Fabric or offline fixtures — and
// installs the data service the whole app reads through. It throws loudly rather
// than degrading, which is deliberate: see `bootstrapApp`.
const authService = bootstrapApp();

// Path routing (`/patient/:episodeId`) is the right answer and the default. It needs
// the host to serve index.html for unknown paths, and Rayfin's `staticHosting` block
// exposes only `indexDocument` — there is no documented SPA-fallback setting, and I
// could not verify Fabric static hosting's behaviour for an unmatched path without
// deploying. So the escape hatch is one variable rather than a rebuild: if a hard
// refresh on a patient URL 404s against the deployed app, set VITE_ROUTER=hash and
// deep links become `/#/patient/...`, which every static host serves correctly.
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <AuthProvider authService={authService}>
    <Router>
      <App />
    </Router>
  </AuthProvider>
);
