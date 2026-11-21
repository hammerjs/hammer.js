import {renameSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const playgroundDir = resolve(__dirname, 'tests/playground');
const outDir = resolve(__dirname, 'dist-playground/playground');

export default defineConfig({
  root: playgroundDir,
  base: './',
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(playgroundDir, 'playground.html'),
    },
  },
  plugins: [
    {
      name: 'rename-playground-index',
      closeBundle() {
        renameSync(resolve(outDir, 'playground.html'), resolve(outDir, 'index.html'));
      },
    },
  ],
});
