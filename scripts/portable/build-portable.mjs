import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

async function run(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolvePromise() : rejectPromise(new Error(`${command} exited with ${code}`))));
    child.on('error', rejectPromise);
  });
}

async function runIgnoreFailure(command, args) {
  try {
    await run(command, args);
  } catch {
    // Best-effort helper for platform-specific steps.
  }
}

const portableDir = resolve('dist/portable');
await rm(portableDir, { recursive: true, force: true });
await mkdir(portableDir, { recursive: true });
await run(process.execPath, [resolve('scripts/portable/build-entry.mjs')]);
await run(process.execPath, [`--experimental-sea-config=${resolve('dist/portable/sea-config.json')}`]);

const version = JSON.parse(await readFile(resolve('package.json'), 'utf8')).version;
const ext = process.platform === 'win32' ? '.exe' : '';
const target = `${process.platform}-${process.arch}`;
const out = resolve(`${portableDir}/mcplogview-${version}-${target}${ext}`);

await cp(process.execPath, out);
if (process.platform === 'darwin') {
  await runIgnoreFailure('codesign', ['--remove-signature', out]);
}

const postjectArgs = [
  out,
  'NODE_SEA_BLOB',
  resolve('dist/portable/sea-prep.blob'),
  '--sentinel-fuse',
  'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
];
if (process.platform === 'darwin') {
  postjectArgs.push('--macho-segment-name', 'NODE_SEA');
}
await run(resolve('node_modules/.bin/postject'), postjectArgs);
if (process.platform === 'darwin') {
  await run('codesign', ['--sign', '-', out]);
}

const note = `portable SEA binary built from runtime (${process.execPath})`;
await writeFile(`${out}.note.txt`, `${note}\n`, 'utf8');

const sha = createHash('sha256').update(await readFile(out)).digest('hex');
await writeFile(resolve(`${portableDir}/build-metadata.json`), JSON.stringify({ version, target, sha256: sha }, null, 2) + '\n', 'utf8');
console.log(`Built ${out}`);
