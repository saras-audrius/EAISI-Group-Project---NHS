/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `'true'` selects the fixtures backend. Set by `npm run dev:offline`. */
  readonly VITE_OFFLINE_DEMO?: string;
  readonly VITE_RAYFIN_API_URL?: string;
  readonly VITE_RAYFIN_PUBLISHABLE_KEY?: string;
  readonly VITE_FABRIC_WORKSPACE_ID?: string;
  readonly VITE_FABRIC_ITEM_ID?: string;
  readonly VITE_FABRIC_PORTAL_URL?: string;
  readonly VITE_PORT?: string;
  /** `'hash'` switches to hash routing for hosts that do not fall back to index.html. */
  readonly VITE_ROUTER?: string;
  /** Base URL of `tools/agent_proxy.py`, e.g. `http://localhost:8765`. Selects the Data Agent path. */
  readonly VITE_AGENT_PROXY_URL?: string;
  /** `'function'` selects the Rayfin-function Data Agent path (experimental). */
  readonly VITE_AGENT_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
