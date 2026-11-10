import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build, defineConfig, type Plugin} from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Emits a clean `dist/hammer.umd.js` bundle from `src/umd.ts` (default-only export)
 * alongside `dist/hammer.es.js` so UMD/CJS consumers receive the `Hammer` class
 * directly (`new window.Hammer(...)`) without a `.default` wrapper.
 */
function umdBundlePlugin(): Plugin {
  return {
    name: 'hammer-umd-bundle',
    apply: 'build',
    async closeBundle() {
      await build({
        configFile: false,
        logLevel: 'warn',
        build: {
          emptyOutDir: false,
          outDir: resolve(__dirname, 'dist'),
          lib: {
            entry: resolve(__dirname, 'src/umd.ts'),
            name: 'Hammer',
            formats: ['umd'],
            fileName: () => 'hammer.umd.js',
          },
        },
      });
    },
  };
}

export default defineConfig({
  plugins: [umdBundlePlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'hammer.es.js',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/umd.ts'],
    },
  },
});
