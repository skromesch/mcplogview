import { describe, it, expect } from 'vitest';
import { getHelpText } from '../../src/index.js';

describe('help text', () => {
  it('describes config and tools', () => {
    const help = getHelpText();
    expect(help).toContain('LOG_SOURCES_CONFIG');
    expect(help).toContain('minimal debug config is auto-created');
    expect(help).toContain('SSH source example');
    expect(help).toContain('"type": "ssh"');
    expect(help).toContain('list_logs, get_log_skill, read_log_chunk, follow_log');
  });
});
