import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { extractLinesFromChunk, readLogChunk } from '../../src/logs/tailer.js';

describe('tailer', () => {
  it('reads initial lines and advances cursor', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const file = join(dir, 'app.log');
    await writeFile(file, 'a\nb\nc\n', 'utf8');

    const first = await readLogChunk({ path: file, cursor: null, maxLines: 2 });
    expect(first.lines).toEqual(['a', 'b']);
    expect(first.cursor).not.toBeNull();

    const second = await readLogChunk({ path: file, cursor: first.cursor, maxLines: 2 });
    expect(second.lines).toEqual(['c']);
  });

  it('keeps empty lines and advances cursor accurately', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const file = join(dir, 'app.log');
    await writeFile(file, 'a\n\nb\n', 'utf8');

    const first = await readLogChunk({ path: file, cursor: null, maxLines: 2 });
    expect(first.lines).toEqual(['a', '']);

    const second = await readLogChunk({ path: file, cursor: first.cursor, maxLines: 2 });
    expect(second.lines).toEqual(['b']);
  });

  it('falls back to start when cursor is invalid', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const file = join(dir, 'app.log');
    await writeFile(file, 'a\nb\n', 'utf8');

    const res = await readLogChunk({ path: file, cursor: 'not-base64', maxLines: 10 });
    expect(res.lines).toEqual(['a', 'b']);
  });

  it('extracts lines and eof correctly for chunk without final newline', () => {
    const extracted = extractLinesFromChunk('a\n\nb', 3);
    expect(extracted.lines).toEqual(['a', '', 'b']);
    expect(extracted.eof).toBe(true);
    expect(extracted.consumedChars).toBe(4);
  });
});
