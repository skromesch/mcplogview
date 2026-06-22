import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const { build: esbuild } = await import('esbuild');

const outFile = resolve('dist/portable/entry.cjs');
await mkdir(dirname(outFile), { recursive: true });

await esbuild({
  entryPoints: [resolve('dist/src/cli.js')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  logLevel: 'silent'
});

const seaConfigPath = resolve('dist/portable/sea-config.json');
const config = {
  main: outFile,
  output: resolve('dist/portable/sea-prep.blob'),
  disableExperimentalSEAWarning: true
};
await writeFile(seaConfigPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outFile} and ${seaConfigPath}`);
