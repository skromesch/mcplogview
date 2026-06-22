import { describe, it, expect } from 'vitest';
import { access } from 'node:fs/promises';

describe('portable smoke assets', () => {
  it('portable scripts are present', async () => {
    await expect(access('scripts/portable/build-portable.mjs')).resolves.toBeUndefined();
    await expect(access('scripts/portable/verify-portable.mjs')).resolves.toBeUndefined();
    await expect(access('scripts/portable/checksums.mjs')).resolves.toBeUndefined();
  });
});
