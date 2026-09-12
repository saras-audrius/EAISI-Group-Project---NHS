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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
