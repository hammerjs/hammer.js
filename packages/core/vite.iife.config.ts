import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    target: ['chrome60', 'edge79', 'firefox59', 'safari13'],
    emptyOutDir: false,
    minify: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/global.ts'),
      name: 'Hammer',
      formats: ['iife'],
      fileName: () => 'hammer.min.js',
    },
    rolldownOptions: {
      transform: {
        assumptions: {
          setPublicClassFields: true,
        },
      },
      output: {
        exports: 'default',
      },
    },
  },
});
