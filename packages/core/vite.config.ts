/// <reference types="vitest/config" />
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig, type Plugin, type PluginOption} from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Redirects `/` and friendly dev routes to `/tests/kitchensink/index.html` and
 * `/tests/playground/playground.html` during `vite dev` so relative links (`./playground/`
 * and `../`) work identically in dev and in the production GitHub Pages build.
 */
function playgroundDevPlugin(): Plugin {
  return {
    name: 'hammer-playground-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        const qIndex = url.indexOf('?');
        const pathname = qIndex >= 0 ? url.slice(0, qIndex) : url;
        const search = qIndex >= 0 ? url.slice(qIndex) : '';

        if (
          pathname === '/' ||
          pathname === '/index.html' ||
          pathname === '/tests' ||
          pathname === '/tests/' ||
          pathname === '/tests/kitchensink' ||
          pathname === '/tests/kitchensink/'
        ) {
          res.statusCode = 302;
          res.setHeader('Location', `/tests/kitchensink/index.html${search}`);
          res.end();
          return;
        }
        if (
          pathname === '/playground' ||
          pathname === '/playground/' ||
          pathname === '/tests/kitchensink/playground' ||
          pathname === '/tests/kitchensink/playground/' ||
          pathname === '/tests/playground' ||
          pathname === '/tests/playground/'
        ) {
          res.statusCode = 302;
          res.setHeader('Location', `/tests/playground/playground.html${search}`);
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({command, mode}) => {
  const isLibBuild = command === 'build' && mode !== 'test';
  const plugins: PluginOption[] = [playgroundDevPlugin()];
  if (!isLibBuild) {
    plugins.push(react());
    if (command === 'serve') {
      plugins.push(tailwindcss());
    }
  }

  return {
    plugins,
    resolve: isLibBuild
      ? undefined
      : {
          alias: {
            '@hammerjs/core': resolve(__dirname, 'src/index.ts'),
            '@hammerjs/react': resolve(__dirname, '../react/src/index.ts'),
          },
        },
    build: {
      target: ['chrome60', 'edge79', 'firefox59', 'safari13'],
      minify: false,
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        formats: ['es'],
        fileName: () => 'hammer.es.js',
      },
      rolldownOptions: {
        transform: {
          assumptions: {
            setPublicClassFields: true,
          },
        },
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
            include: ['tests/**/*.test.{ts,tsx}'],
            exclude: ['tests/browser/**'],
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
  };
});
