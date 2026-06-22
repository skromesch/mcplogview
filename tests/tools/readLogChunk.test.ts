import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLogRegistry } from '../../src/logs/logRegistry.js';
import { readLogChunkHandler } from '../../src/tools/readLogChunk.js';

describe('read_log_chunk tool', () => {
  it('reads log lines from selected source', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const logPath = join(dir, 'app.log');
    await writeFile(logPath, 'line1\nline2\n', 'utf8');

    const registry = createLogRegistry({
      sources: [{ type: 'local', id: 'app', label: 'App', path: logPath }]
    });

    const result = await readLogChunkHandler(registry, {
      sourceId: 'app',
      cursor: null,
      maxLines: 50
    });

    expect(result.lines).toEqual(['line1', 'line2']);
    expect(result.cursor).toBeTypeOf('string');
  });

  it('throws for unknown source id', async () => {
    const registry = createLogRegistry({
      sources: [{ type: 'local', id: 'app', label: 'App', path: '/tmp/app.log' }]
    });

    await expect(readLogChunkHandler(registry, {
      sourceId: 'missing',
      cursor: null,
      maxLines: 50
    })).rejects.toThrow(/unknown source/i);
  });
});
