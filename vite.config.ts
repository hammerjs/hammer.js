/// <reference types="vitest/config" />
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig, type Plugin} from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Redirects `/` to `/tests/playground.html` during `vite dev` so opening the
 * root dev-server URL (`http://localhost:5173/`) loads the interactive playground
 * instead of returning a 404.
 */
function playgroundDevPlugin(): Plugin {
  return {
    name: 'hammer-playground-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url === '/index.html' || req.url?.startsWith('/?')) {
          const search = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
          res.statusCode = 302;
          res.setHeader('Location', `/tests/playground.html${search}`);
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [playgroundDevPlugin()],
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'hammer.es.js',
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          // Reuses one jsdom per worker (environment setup dominated the run time).
          pool: 'vmThreads',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/browser/**', 'tests/package.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          // Bundles `dist/` with Vite/Rolldown, whose native bindings need a real Node realm.
          name: 'package',
          environment: 'node',
          include: ['tests/package.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({contextOptions: {hasTouch: true}}),
            instances: [{browser: 'chromium'}],
            viewport: {width: 800, height: 600},
          },
        },
      },
    ],
  },
});
