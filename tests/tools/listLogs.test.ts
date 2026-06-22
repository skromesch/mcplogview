import { describe, it, expect } from 'vitest';
import { createLogRegistry } from '../../src/logs/logRegistry.js';
import { listLogsHandler } from '../../src/tools/listLogs.js';

describe('list_logs tool', () => {
  it('returns configured sources', async () => {
    const registry = createLogRegistry({
      sources: [{ type: 'local', id: 'api', label: 'API', path: '/tmp/api.log', hint: 'Check API errors first' }]
    });

    const result = await listLogsHandler(registry);
    expect(result).toEqual({
      logs: [{ id: 'api', label: 'API', description: undefined, hint: 'Check API errors first' }]
    });
  });
});
