import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readPackageJson() {
  const raw = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
  return JSON.parse(raw) as { scripts?: Record<string, string> };
}

describe('project bootstrap', () => {
  it('has required scripts', async () => {
    const pkg = await readPackageJson();
    expect(pkg.scripts).toMatchObject({
      build: 'tsc -p tsconfig.json',
      dev: 'tsx src/cli.ts',
      test: 'vitest run',
      'test:watch': 'vitest',
      'portable:bundle': 'node scripts/portable/build-entry.mjs',
      'portable:build': 'node scripts/portable/build-portable.mjs',
      'portable:build:raspi': 'bash scripts/portable/build-portable-docker.sh',
      'portable:verify': 'node scripts/portable/verify-portable.mjs',
      'portable:checksums': 'node scripts/portable/checksums.mjs'
    });
  });
});
