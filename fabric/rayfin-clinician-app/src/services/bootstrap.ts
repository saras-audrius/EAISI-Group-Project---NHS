import type { IAuthService } from './IAuthService';
import { OfflineAuthService } from './OfflineAuthService';
import { OfflineDataService } from './OfflineDataService';
import { RayfinAuthService } from './RayfinAuthService';
import { RayfinDataService } from './RayfinDataService';
import { setDataService } from './patients';
import { initRayfinClient } from './rayfinClient';

/** Fail with a message that names the fix, not just the symptom. */
function required(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv] as
    | string
    | undefined;
  if (!value) {
    throw new Error(
      `${name} is not set. Run \`npx rayfin up\` to provision the backend, ` +
        `then \`npx rayfin env --framework vite\` to write .env.local. ` +
        `Or run \`npm run dev:offline\` to work against fixtures.`
    );
  }
  return value;
}

/**
 * Choose a backend and install it. Called once from `main.tsx`.
 *
 * There are exactly two modes and the choice is made here, from one variable:
 *
 * * `VITE_OFFLINE_DEMO=true` — fixtures and a local sign-in. Nothing leaves the
 *   machine, and the UI carries a synthetic-data banner throughout.
 * * otherwise — the governed Fabric path, where every read passes through the
 *   row-level security policies in Data API Builder.
 *
 * The Fabric path does not fall back. If the backend is unreachable this throws,
 * loudly, at boot: an app that can silently substitute invented patients for
 * real ones is an app that can show invented patients on stage without anybody
 * noticing, and in a clinical setting that is worse than a blank screen.
 *
 * Every value below is written by `rayfin env --framework vite` after a
 * successful `rayfin up`.
 */
export function bootstrapApp(): IAuthService {
  if (import.meta.env.VITE_OFFLINE_DEMO === 'true') {
    setDataService(new OfflineDataService());
    return new OfflineAuthService();
  }

  const apiUrl = required('VITE_RAYFIN_API_URL');

  const client = initRayfinClient({
    baseUrl: apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`,
    publishableKey: required('VITE_RAYFIN_PUBLISHABLE_KEY'),
  });

  setDataService(new RayfinDataService());

  return new RayfinAuthService(client, {
    workspaceId: required('VITE_FABRIC_WORKSPACE_ID'),
    projectId: required('VITE_FABRIC_ITEM_ID'),
    fabricPortalUrl: required('VITE_FABRIC_PORTAL_URL'),
    returnOrigin: window.location.origin,
  });
}
