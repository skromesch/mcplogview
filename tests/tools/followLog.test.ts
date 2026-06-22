import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLogRegistry } from '../../src/logs/logRegistry.js';
import { followLogHandler } from '../../src/tools/followLog.js';

describe('follow_log tool', () => {
  it('returns new lines written after cursor', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const logPath = join(dir, 'app.log');
    await writeFile(logPath, 'first\n', 'utf8');

    const registry = createLogRegistry({
      sources: [{ type: 'local', id: 'app', label: 'App', path: logPath }]
    });

    const initial = await followLogHandler(registry, {
      sourceId: 'app',
      cursor: null,
      maxLines: 10,
      timeoutMs: 50,
      pollIntervalMs: 10
    });

    await appendFile(logPath, 'second\n', 'utf8');

    const next = await followLogHandler(registry, {
      sourceId: 'app',
      cursor: initial.cursor,
      maxLines: 10,
      timeoutMs: 500,
      pollIntervalMs: 50
    });

    expect(next.lines).toContain('second');
  });
});
