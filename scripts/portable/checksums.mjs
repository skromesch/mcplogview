import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const dir = resolve('dist/portable');
const files = await readdir(dir);
const lines = [];
for (const file of files) {
  if (file.endsWith('.sha256')) continue;
  const full = resolve(dir, file);
  const data = await readFile(full);
  const hash = createHash('sha256').update(data).digest('hex');
  lines.push(`${hash}  ${file}`);
}
const out = resolve(dir, 'checksums.sha256');
await writeFile(out, lines.sort().join('\n') + '\n', 'utf8');
console.log(`Wrote ${out}`);
