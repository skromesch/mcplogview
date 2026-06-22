import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('portable scripts wiring', () => {
  it('contains portable scripts in package.json', async () => {
    const raw = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
    const pkg = JSON.parse(raw) as { scripts: Record<string, string> };
    expect(pkg.scripts['portable:bundle']).toBe('node scripts/portable/build-entry.mjs');
    expect(pkg.scripts['portable:build']).toBe('node scripts/portable/build-portable.mjs');
    expect(pkg.scripts['portable:verify']).toBe('node scripts/portable/verify-portable.mjs');
    expect(pkg.scripts['portable:checksums']).toBe('node scripts/portable/checksums.mjs');
  });
});
