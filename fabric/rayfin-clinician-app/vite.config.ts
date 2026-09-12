import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Pin the dev server to Rayfin's per-project port (VITE_PORT, mapped from
  // RAYFIN_PUBLIC_FRONTEND_PORT in .env.local) so multiple local frontends
  // don't collide and the deployed backend can allow-list one stable origin.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const port = env.VITE_PORT ? Number(env.VITE_PORT) : undefined;

  // `--mode offline` is the switch, not an env file. `.env.local` is written by
  // `rayfin env` and outranks `.env.offline` in Vite's precedence order, so a
  // developer with a provisioned backend would otherwise never reach the
  // fixtures. Defining the value here beats both.
  const offline = mode === 'offline';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_OFFLINE_DEMO': JSON.stringify(
        offline ? 'true' : (env.VITE_OFFLINE_DEMO ?? '')
      ),
    },
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, 'src'),
      },
    },
    ...(port ? { server: { port, strictPort: true } } : {}),
    build: {
      target: 'es2022',
    },
    esbuild: {
      target: 'es2022',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
  };
});
