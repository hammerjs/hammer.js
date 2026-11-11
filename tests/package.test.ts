import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import ts from 'typescript';
import {build} from 'vite';
import {describe, it, expect} from 'vitest';

describe('Published package', () => {
  it('ships an ESM-only package, resolves under NodeNext TypeScript, strips @internal, and tree-shakes unused recognizers', async () => {
    const rootDir = resolve(__dirname, '..');
    const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8')) as {
      license: string;
      engines: Record<string, string>;
      exports: Record<string, Record<string, string>>;
    };
    expect(pkg.license).toBe('MIT');
    expect(pkg.engines.node).toBe('>=20.19.0');
    expect(pkg.exports['.']).toEqual({
      types: './dist/types/index.d.ts',
      default: './dist/hammer.es.js',
    });

    const tmpConsumerDir = mkdtempSync(join(tmpdir(), 'hammerjs-nodenext-'));
    try {
      mkdirSync(join(tmpConsumerDir, 'node_modules'), {recursive: true});
      symlinkSync(rootDir, join(tmpConsumerDir, 'node_modules/hammerjs'), 'dir');
      const entryPath = join(tmpConsumerDir, 'consumer.mts');
      writeFileSync(
        entryPath,
        [
          "import {Hammer, GestureManager, PanRecognizer} from 'hammerjs';",
          "const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');",
          'export const h = new Hammer(svg, {onTap: ev => ev.center.x});',
          'export const gm = new GestureManager(svg, {',
          '  recognizers: [new PanRecognizer({onPan: ev => ev.deltaX})],',
          '});',
        ].join('\n')
      );

      const program = ts.createProgram([entryPath], {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        target: ts.ScriptTarget.ES2022,
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
        strict: true,
        noEmit: true,
        preserveSymlinks: true,
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);
      expect(diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual(
        []
      );
    } finally {
      rmSync(tmpConsumerDir, {recursive: true, force: true});
    }

    const recognizerDts = readFileSync(
      resolve(__dirname, '../dist/types/gesture_recognizer.d.ts'),
      'utf8'
    );
    expect(recognizerDts).not.toContain('denyByArena');
    expect(recognizerDts).not.toContain('lastDispatchToken');

    const esEntry = resolve(__dirname, '../dist/hammer.es.js').replace(/\\/g, '/');
    const esMap = JSON.parse(
      readFileSync(resolve(__dirname, '../dist/hammer.es.js.map'), 'utf8')
    ) as {sources: string[]; sourcesContent?: string[]};
    expect(esMap.sources.length).toBeGreaterThan(0);
    expect(esMap.sourcesContent?.length).toBe(esMap.sources.length);
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
