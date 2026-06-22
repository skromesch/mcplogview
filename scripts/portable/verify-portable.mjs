import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const pkg = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const ext = process.platform === 'win32' ? '.exe' : '';
const target = `${process.platform}-${process.arch}`;
const executable = resolve(`dist/portable/mcplogview-${pkg.version}-${target}${ext}`);

await access(executable, constants.R_OK);
await access(resolve('dist/portable/entry.cjs'), constants.R_OK);
await access(resolve('dist/portable/sea-config.json'), constants.R_OK);

await new Promise((resolvePromise, rejectPromise) => {
  const child = spawn(executable, ['--help'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });
  child.on('exit', (code) => {
    if (code !== 0) {
      rejectPromise(new Error(`portable executable exited with ${code}`));
      return;
    }
    if (!stderr.includes('mcplogview usage')) {
      rejectPromise(new Error('portable executable did not print help text'));
      return;
    }
    resolvePromise(undefined);
  });
  child.on('error', rejectPromise);
});

console.log(`Portable artifact verified: ${executable}`);
