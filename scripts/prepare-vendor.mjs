/**
 * Materialises the vendor runtime shims.
 *
 * Yomitan's build copies `dev/lib/*.js` (thin re-exports of npm packages) into
 * `ext/lib/`, which is gitignored in the vendor clone. The headless engine needs
 * those shims because the vendor language modules import them by relative path.
 *
 * Every `.js` file in `dev/lib` is copied (not a hardcoded subset) so the shim
 * set tracks whatever Yomitan's own build produces. Copying instead of
 * hand-writing keeps the vendor as the single source of truth.
 */
import {copyFile, mkdir, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';

const vendorRoot = 'vendor/yomitan';
const sourceDir = `${vendorRoot}/dev/lib`;
const targetDir = `${vendorRoot}/ext/lib`;

if (!existsSync(vendorRoot)) {
    throw new Error(
        `Vendor clone missing at ${vendorRoot}. ` +
        'Run `git submodule update --init --recursive` to fetch the pinned Yomitan revision.',
    );
}

const shims = (await readdir(sourceDir)).filter((name) => name.endsWith('.js')).sort();
if (shims.length === 0) {
    throw new Error(`No vendor shims found in ${sourceDir}`);
}

await mkdir(targetDir, {recursive: true});
for (const shim of shims) {
    await copyFile(`${sourceDir}/${shim}`, `${targetDir}/${shim}`);
}

console.log(`vendor shims ready (${shims.length}): ${shims.join(', ')}`);
