import { FunctionAgentService } from './agent/FunctionAgentService';
import { LocalAgentService } from './agent/LocalAgentService';
import { ProxyAgentService } from './agent/ProxyAgentService';
import { setAgentService } from './agent';
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
 * Which "Ask" backend to install. Three, in order of preference for a live
 * session:
 *
 * * `VITE_AGENT_PROXY_URL` set → the local MCP proxy to the Fabric Data Agent,
 *   running under the presenter's own sign-in.
 * * `VITE_AGENT_MODE=function` → the Rayfin function path (experimental).
 * * otherwise → the built-in query engine, which needs nothing and says so.
 */
function chooseAgent(): void {
  const proxy = import.meta.env.VITE_AGENT_PROXY_URL as string | undefined;
  const mode = import.meta.env.VITE_AGENT_MODE as string | undefined;
  if (proxy) setAgentService(new ProxyAgentService(proxy));
  else if (mode === 'function' && import.meta.env.VITE_OFFLINE_DEMO !== 'true')
    setAgentService(new FunctionAgentService());
  else setAgentService(new LocalAgentService());
}

/**
 * Choose a backend and install it. Called once from `main.tsx`.
 *
 * There are exactly two data modes and the choice is made here, from one variable:
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
 */
export function bootstrapApp(): IAuthService {
  if (import.meta.env.VITE_OFFLINE_DEMO === 'true') {
    setDataService(new OfflineDataService());
    chooseAgent();
    return new OfflineAuthService();
  }

  const apiUrl = required('VITE_RAYFIN_API_URL');

  const client = initRayfinClient({
    baseUrl: apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`,
    publishableKey: required('VITE_RAYFIN_PUBLISHABLE_KEY'),
  });

  setDataService(new RayfinDataService());
  chooseAgent();

  return new RayfinAuthService(client, {
    workspaceId: required('VITE_FABRIC_WORKSPACE_ID'),
    projectId: required('VITE_FABRIC_ITEM_ID'),
    fabricPortalUrl: required('VITE_FABRIC_PORTAL_URL'),
    returnOrigin: window.location.origin,
  });
}
