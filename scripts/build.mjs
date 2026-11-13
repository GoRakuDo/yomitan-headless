/**
 * Builds the publishable artefacts into `dist/`:
 *
 * 1. `dist/index.js`   — single ESM bundle. Yomitan's vendor sources are plain
 *    ESM JavaScript that imports JSON without import attributes
 *    (`kanji-processor`), which native Node ESM refuses to load. Bundling
 *    inlines those JSON modules, so the file works in Node, Tauri and any other
 *    runtime without loader flags.
 * 2. `dist/server.js`  — Node.js HTTP + Fetch API compatible Yomitan API server.
 * 3. `dist/types/**`   — declarations emitted by `tsc` for our sources *and* the
 *    vendor modules they re-export, so consumers never need `allowJs` or the
 *    vendor checkout to type-check an import.
 * 4. `dist/index.d.ts` — the single entry declaration that `package.json#types`
 *    points at, re-exporting the emitted tree.
 */
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {rm, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

await rm('dist', {recursive: true, force: true});
await mkdir('dist', {recursive: true});

await build({
    // Object entryPoints pin the OUTPUT names (`index.js`, `settings.js`) so
    // they match `package.json#exports`. An array entryPoints list is mirrored
    // as a directory tree instead (`settings/index.js`), which the exports map
    // does not point at.
    entryPoints: {index: 'src/index.ts', settings: 'src/settings/index.ts'},
    outdir: 'dist',
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

// The server entry is bundled separately with `platform: 'node'` so `node:http`
// / `node:net` stay external imports instead of failing resolution under
// `neutral`. It gets the same inlined-vendor treatment as the main bundle.
await build({
    entryPoints: {server: 'src/server/index.ts'},
    outdir: 'dist',
    bundle: true,
    format: 'esm',
    platform: 'node',
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

const settingsDeclaration = [
    '/**',
    ' * Type entry point for @gorakudo/yomitan-headless/settings.',
    ' *',
    ' * Settings types are DOM-free; no lib reference is required.',
    ' */',
    "export * from './types/src/settings/index.js';",
    '',
].join('\n');

await writeFile('dist/settings.d.ts', settingsDeclaration);

const serverDeclaration = [
    '/**',
    ' * Type entry point for @gorakudo/yomitan-headless/server.',
    ' *',
    ' * Node.js HTTP + Fetch API compatible Yomitan API server.',
    ' */',
    "export * from './types/src/server/index.js';",
    '',
].join('\n');

await writeFile('dist/server.d.ts', serverDeclaration);

console.log('build complete: dist/index.js + dist/index.d.ts + dist/settings.js + dist/settings.d.ts + dist/server.js + dist/server.d.ts');