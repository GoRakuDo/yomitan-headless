/**
 * Builds the publishable artefacts into `dist/`:
 *
 * 1. `dist/index.js`   — single ESM bundle. Yomitan's vendor sources are plain
 *    ESM JavaScript that imports JSON without import attributes
 *    (`kanji-processor`), which native Node ESM refuses to load. Bundling
 *    inlines those JSON modules, so the file works in Node, Tauri and any other
 *    runtime without loader flags.
 * 2. `dist/types/**`   — declarations emitted by `tsc` for our sources *and* the
 *    vendor modules they re-export, so consumers never need `allowJs` or the
 *    vendor checkout to type-check an import.
 * 3. `dist/index.d.ts` — the single entry declaration that `package.json#types`
 *    points at, re-exporting the emitted tree.
 */
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {rm, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

await rm('dist', {recursive: true, force: true});
await mkdir('dist', {recursive: true});

await build({
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    // `neutral` ignores package main fields by default; the vendor shims
    // (`ext/lib/*.js`) re-export plain packages that only define `main`/`module`.
    mainFields: ['module', 'main'],
    target: 'es2022',
    sourcemap: true,
    logLevel: 'info',
});

const tscBin = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.build.json'], {stdio: 'inherit'});

const entryDeclaration = [
    '/**',
    ' * Type entry point for @gorakudo/yomitan-headless.',
    ' *',
    ' * Declarations are emitted into ./types so the vendor modules re-exported by',
    ' * src/index.ts keep their generated .d.ts files in a mirrored layout.',
    ' * Consumers only ever resolve this file.',
    ' *',
    ' * The lib="dom" reference below is required because the generated declarations',
    ' * for Yomitan\'s DictionaryDatabase mention IndexedDB types (IDBDatabase,',
    ' * IDBObjectStore, ...). Referencing it here keeps consumers free of',
    ' * skipLibCheck and of any lib juggling of their own.',
    ' */',
    '/// <reference lib="dom" />',
    "export * from './types/src/index.js';",
    '',
].join('\n');

await writeFile('dist/index.d.ts', entryDeclaration);

console.log('build complete: dist/index.js + dist/index.d.ts');
