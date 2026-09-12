import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { AuthProvider } from '@/hooks/AuthContext';
import { OfflineAuthService } from '@/services/OfflineAuthService';
import { OfflineDataService } from '@/services/OfflineDataService';
import { fixturePatients } from '@/services/fixtures';
import { setDataService } from '@/services/patients';

/**
 * The whole app, driven through the offline stack.
 *
 * These are the claims the acceptance criteria make, asserted rather than
 * demonstrated by hand: the sign-in page does not say "Todo", a deep link to a
 * patient resolves on a cold load, the synthetic banner is present wherever
 * patients are, and the decision form will not accept a review until the
 * clinician has made both choices and written something.
 */
function renderApp(route = '/') {
  setDataService(new OfflineDataService());
  return render(
    <AuthProvider authService={new OfflineAuthService()}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );
}

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole('button', { name: /continue to the offline/i });
  await user.click(button);
}

beforeEach(() => {
  setDataService(new OfflineDataService());
});

describe('sign-in', () => {
  it('says what the tool is and never says "Todo"', async () => {
    renderApp();
    expect(await screen.findByText(/pre-operative outcome review/i)).toBeInTheDocument();
    expect(screen.queryByText(/todo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/decision support only/i)).toBeInTheDocument();
  });

  it('names the fictional organisation as fictional', async () => {
    renderApp();
    expect(
      await screen.findByText(/Marrowfield Orthopaedic Centre is a fictional organisation/i)
    ).toBeInTheDocument();
  });
});

describe('cohort list', () => {
  it('lists the clinician’s patients after sign-in', async () => {
    const user = userEvent.setup();
    renderApp();
    await signIn(user);

    expect(await screen.findByRole('heading', { name: /pre-operative list/i })).toBeInTheDocument();
    const first = fixturePatients[0];
    expect(await screen.findByRole('link', { name: first.displayName })).toBeInTheDocument();
  });

  it('declares the cohort as synthetic where the patients are', async () => {
    const user = userEvent.setup();
    renderApp();
    await signIn(user);
    expect(
      await screen.findByText(/every patient shown here is synthetic/i)
    ).toBeInTheDocument();
  });

  it('filters the list by risk band', async () => {
    const user = userEvent.setup();
    renderApp();
    await signIn(user);
    await screen.findByRole('link', { name: fixturePatients[0].displayName });

    const lowCount = fixturePatients.filter((p) => p.riskBand === 'low').length;
    await user.click(screen.getByRole('button', { name: /Low/ }));

    await waitFor(() => {
      const table = screen.queryByRole('table', { name: /pre-operative patients assigned to you/i });
      if (lowCount === 0) {
        expect(screen.getByText(/no patients match these filters/i)).toBeInTheDocument();
      } else {
        expect(within(table!).getAllByRole('row').length).toBe(lowCount + 1);
      }
    });
  });

  it('narrows the list by search', async () => {
    const user = userEvent.setup();
    renderApp();
    await signIn(user);
    const first = fixturePatients[0];
    await screen.findByRole('link', { name: first.displayName });

    await user.type(screen.getByLabelText(/search name, episode id or provider/i), first.episodeId);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: first.displayName })).toBeInTheDocument();
    });
    const table = screen.getByRole('table', { name: /pre-operative patients assigned to you/i });
    expect(within(table).getAllByRole('row').length).toBe(2);
  });
});

describe('patient page', () => {
  it('resolves a deep link on a cold load, without going through the list', async () => {
    const user = userEvent.setup();
    const patient = fixturePatients[0];
    renderApp(`/patient/${encodeURIComponent(patient.episodeId)}`);
    await signIn(user);

    expect(
      await screen.findByRole('heading', { name: patient.displayName })
    ).toBeInTheDocument();
    expect(screen.getByText(`episode ${patient.episodeId}`)).toBeInTheDocument();
  });

  it('answers "how likely", "why" and "how sure" on one screen', async () => {
    const user = userEvent.setup();
    renderApp(`/patient/${encodeURIComponent(fixturePatients[0].episodeId)}`);
    await signIn(user);

    expect(await screen.findByText(/how likely is a poor outcome\?/i)).toBeInTheDocument();
    expect(await screen.findByText(/why this score/i)).toBeInTheDocument();
    expect(await screen.findByText(/can i trust this number\?/i)).toBeInTheDocument();
    // The icon array's natural-frequency phrasing, not just a percentage.
    expect(
      await screen.findByRole('img', { name: /of the 100 are shaded/i })
    ).toBeInTheDocument();
  });

  it('shows prior decisions, including an override', async () => {
    const user = userEvent.setup();
    renderApp(`/patient/${encodeURIComponent(fixturePatients[0].episodeId)}`);
    await signIn(user);

    expect(await screen.findByText(/overrode the model/i)).toBeInTheDocument();
    expect(screen.getByText(/agreed with the model/i)).toBeInTheDocument();
  });

  it('tells the reviewer an unknown episode id is not theirs to see', async () => {
    const user = userEvent.setup();
    renderApp('/patient/not-a-real-episode');
    await signIn(user);

    expect(
      await screen.findByText(/no patient with that episode id is available to you/i)
    ).toBeInTheDocument();
  });
});

describe('the decision form resists automation bias', () => {
  it('pre-selects nothing and blocks submission until both choices are made', async () => {
    const user = userEvent.setup();
    renderApp(`/patient/${encodeURIComponent(fixturePatients[1].episodeId)}`);
    await signIn(user);

    const submit = await screen.findByRole('button', { name: /record decision/i });
    expect(submit).toBeDisabled();

    for (const radio of screen.getAllByRole('radio', { name: /assessment/i })) {
      expect(radio).not.toBeChecked();
    }
    expect(screen.getByLabelText(/clinical decision/i)).toHaveValue('');
  });

  it('records a review and shows it in the log', async () => {
    const user = userEvent.setup();
    const patient = fixturePatients[1];
    renderApp(`/patient/${encodeURIComponent(patient.episodeId)}`);
    await signIn(user);

    await screen.findByRole('button', { name: /record decision/i });

    await user.click(screen.getByRole('radio', { name: /my assessment differs from the score/i }));
    await user.selectOptions(screen.getByLabelText(/clinical decision/i), 'proceed');
    await user.type(
      screen.getByLabelText(/clinical rationale/i),
      'Radiographs show end-stage disease and the previous procedure was an arthroscopy, not a failed arthroplasty.'
    );

    const submit = screen.getByRole('button', { name: /record decision/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(
      await screen.findByText(new RegExp(`Recorded against .* v${patient.modelVersion}`, 'i'))
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/overrode the model/i)).toBeInTheDocument();
    });
  });
});
