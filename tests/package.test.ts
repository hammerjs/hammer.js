import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {build} from 'vite';
import {describe, it, expect} from 'vitest';

describe('Published package', () => {
  it('ships an ESM-only package, strips @internal from .d.ts, and tree-shakes unused recognizers', async () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as {
      exports: Record<string, Record<string, string>>;
    };
    expect(pkg.exports['.']).toEqual({
      types: './dist/types/index.d.ts',
      default: './dist/hammer.es.js',
    });

    const recognizerDts = readFileSync(
      resolve(__dirname, '../dist/types/gesture_recognizer.d.ts'),
      'utf8'
    );
    expect(recognizerDts).not.toContain('denyByArena');
    expect(recognizerDts).not.toContain('lastDispatchToken');

    const esEntry = resolve(__dirname, '../dist/hammer.es.js').replace(/\\/g, '/');
    const publicApi = (await import(/* @vite-ignore */ esEntry)) as Record<string, unknown>;
    expect(publicApi.default).toBeUndefined();
    expect(publicApi.GestureArena).toBeUndefined();
    expect(publicApi.MotionEventStream).toBeUndefined();
    expect(publicApi.applySurfaceBehavior).toBeUndefined();
    expect(typeof publicApi.Hammer).toBe('function');
    expect(typeof publicApi.GestureManager).toBe('function');
    expect(typeof publicApi.QuickScaleRecognizer).toBe('function');

    const required = createRequire(import.meta.url)(esEntry) as Record<string, unknown>;
    expect(Object.keys(required).sort()).toEqual(Object.keys(publicApi).sort());

    const buildResult = await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [
        {
          name: 'virtual-entry',
          resolveId(id: string) {
            return id === 'virtual:tap-only' ? id : null;
          },
          load(id: string) {
            return id === 'virtual:tap-only'
              ? `import {GestureManager, TapRecognizer} from '${esEntry}'; export {GestureManager, TapRecognizer};`
              : null;
          },
        },
      ],
      build: {
        write: false,
        minify: false,
        rollupOptions: {
          input: 'virtual:tap-only',
          preserveEntrySignatures: 'strict',
        },
      },
    });
    const output = Array.isArray(buildResult) ? buildResult[0] : buildResult;
    if (!('output' in output)) {
      throw new Error('Expected bundle output from vite.build');
    }
    const shakenCode = output.output[0].code;
    const fullEsCode = readFileSync(esEntry, 'utf8');
    expect(shakenCode).toContain('TapRecognizer');
    expect(shakenCode).not.toContain('requireDoubleTapFailure');
    expect(shakenCode).not.toContain('onPanStart');
    expect(shakenCode).not.toContain('onScaleStart');
    expect(shakenCode).not.toContain('onRotateStart');
    expect(shakenCode).not.toContain('onLongPress');
    expect(shakenCode).not.toContain('quickScale');
    expect(shakenCode).not.toContain('computeCurrentVelocity');
    expect(shakenCode.length).toBeLessThan(fullEsCode.length * 0.6);
  });
});
