import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const kitchensinkDir = resolve(__dirname, 'tests/kitchensink');
const outDir = resolve(__dirname, 'dist-playground');

export default defineConfig({
  root: kitchensinkDir,
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@hammerjs/core': resolve(__dirname, 'src/index.ts'),
      '@hammerjs/react': resolve(__dirname, '../react/src/index.ts'),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(kitchensinkDir, 'index.html'),
    },
  },
});
