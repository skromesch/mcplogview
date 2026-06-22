import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/index.js';

describe('server tool registration', () => {
  it('registers expected tool names', async () => {
    const built = await buildServer({
      configPath: 'config/log-sources.example.json'
    });

    const names = built.getRegisteredToolNames();
    expect(names).toEqual(['list_logs', 'get_log_skill', 'read_log_chunk', 'follow_log']);
  });
});
