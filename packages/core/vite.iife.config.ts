import {dirname, normalize, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import propertiesRenameTransformerModule from 'ts-transformer-properties-rename';
import ts from 'typescript';
import {defineConfig, type Plugin} from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, 'src');

type PropertiesRenameFactory = (
  program: ts.Program,
  config?: {
    entrySourceFiles?: string[];
    privatePrefix?: string;
    internalPrefix?: string;
    publicJSDocTag?: string;
    ignoreDecorated?: boolean;
  }
) => ts.TransformerFactory<ts.SourceFile>;

const propertiesRenameTransformer: PropertiesRenameFactory =
  (propertiesRenameTransformerModule as unknown as {default?: PropertiesRenameFactory}).default ??
  (propertiesRenameTransformerModule as unknown as PropertiesRenameFactory);

/**
 * Compiles `packages/core/src` with the TypeScript Compiler API and
 * `ts-transformer-properties-rename`, serving the property-prefixed JS directly
 * to Vite/Rolldown so Terser can safely mangle every private & internal property.
 *
 * Note: `ts-transformer-properties-rename` traces public/DOM contracts via explicit
 * inheritance trees (not structural duck typing), so internal classes fulfilling
 * public or DOM interfaces (e.g. `ArenaContext`, `EventListenerObject`) must use
 * explicit `implements` clauses so those methods are not mangled.
 */
function tsPropertiesRenamePlugin(): Plugin {
  const emittedBySource = new Map<string, string>();

  return {
    name: 'hammer-ts-properties-rename',
    enforce: 'pre',
    buildStart() {
      emittedBySource.clear();

      const configPath = resolve(__dirname, 'tsconfig.json');
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (configFile.error) {
        throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
      }

      const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, __dirname);
      const entryFiles = [resolve(srcDir, 'global.ts')];
      const rootNames = Array.from(new Set([...parsed.fileNames, ...entryFiles]));

      const compilerOptions: ts.CompilerOptions = {
        ...parsed.options,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        declaration: false,
        declarationMap: false,
        emitDeclarationOnly: false,
        noEmit: false,
        sourceMap: false,
        useDefineForClassFields: false,
        outDir: undefined,
        rootDir: srcDir,
      };

      const program = ts.createProgram({rootNames, options: compilerOptions});
      const transformer = propertiesRenameTransformer(program, {
        entrySourceFiles: entryFiles,
        privatePrefix: '_private_',
        internalPrefix: '_internal_',
      });

      const emitResult = program.emit(
        undefined,
        (fileName, data, _bom, _onError, sourceFiles) => {
          const sourceFile = sourceFiles?.[0];
          if (sourceFile && fileName.endsWith('.js')) {
            emittedBySource.set(normalize(sourceFile.fileName), data);
          }
        },
        undefined,
        false,
        {before: [transformer]}
      );

      const errors = emitResult.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
      if (errors.length > 0) {
        throw new Error(
          errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n')
        );
      }
    },
    load(id) {
      const cleanId = normalize(id.split('?')[0]);
      const transformed = emittedBySource.get(cleanId);
      if (transformed !== undefined) {
        return {code: transformed, map: null};
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [tsPropertiesRenamePlugin()],
  build: {
    target: ['chrome60', 'edge79', 'firefox59', 'safari13'],
    emptyOutDir: false,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        ecma: 2020,
        passes: 3,
        pure_getters: true,
      },
      mangle: {
        properties: {
          regex: /^_(?:private|internal)_/,
        },
      },
      format: {
        comments: false,
      },
    },
    lib: {
      entry: resolve(srcDir, 'global.ts'),
      name: 'Hammer',
      formats: ['iife'],
      fileName: () => 'hammer.min.js',
    },
    rolldownOptions: {
      output: {
        exports: 'default',
      },
    },
  },
});
