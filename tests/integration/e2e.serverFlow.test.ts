import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { buildServer } from '../../src/index.js';

describe('e2e server flow', () => {
  it('starts server, exercises tools, and writes clean self-log', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-e2e-'));
    const appLogPath = join(dir, 'app.log');
    const selfLogPath = join(dir, 'mcplogview-server.log');
    const configPath = join(dir, 'log-sources.json');

    await writeFile(appLogPath, 'line1\nline2\n', 'utf8');
    await writeFile(
      configPath,
      JSON.stringify({
        transport: { mode: 'stdio', host: '127.0.0.1', port: 3333, path: '/mcp' },
        logging: { enabled: true, debug: true, path: selfLogPath },
        sources: [{ type: 'local', id: 'app', label: 'App', path: appLogPath }]
      }),
      'utf8'
    );

    const built = await buildServer({ configPath });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await built.server.connect(serverTransport);

    const client = new Client({ name: 'mcplogview-e2e-test', version: '0.1.0' });
    await client.connect(clientTransport);

    try {
      const list = await client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
      expect(list.tools.map((t) => t.name).sort()).toEqual(['follow_log', 'get_log_skill', 'list_logs', 'read_log_chunk']);

      const listLogsResult = await client.request({
        method: 'tools/call',
        params: { name: 'list_logs', arguments: {} }
      }, CallToolResultSchema);
      expect(listLogsResult.isError).not.toBe(true);
      const listLogsPayload = JSON.parse((listLogsResult.content[0] as { text: string }).text) as {
        logs: Array<{ id: string; label: string }>;
      };
      expect(Array.isArray(listLogsPayload.logs)).toBe(true);
      expect(listLogsPayload.logs.some((x) => x.id === 'app')).toBe(true);

      const readResult = await client.request({
        method: 'tools/call',
        params: { name: 'read_log_chunk', arguments: { sourceId: 'app', maxLines: 2 } }
      }, CallToolResultSchema);
      expect(readResult.isError).not.toBe(true);
      const readPayload = JSON.parse((readResult.content[0] as { text: string }).text) as {
        lines: string[];
        cursor: string;
        eof: boolean;
      };
      expect(readPayload.lines).toEqual(['line1', 'line2']);
      expect(typeof readPayload.cursor).toBe('string');
      expect(typeof readPayload.eof).toBe('boolean');

      const followResult = await client.request({
        method: 'tools/call',
        params: { name: 'follow_log', arguments: { sourceId: 'app', maxLines: 1, timeoutMs: 50, pollIntervalMs: 10 } }
      }, CallToolResultSchema);
      expect(followResult.isError).not.toBe(true);
      const followPayload = JSON.parse((followResult.content[0] as { text: string }).text) as {
        lines: string[];
        cursor: string;
        eof: boolean;
      };
      expect(Array.isArray(followPayload.lines)).toBe(true);
      expect(typeof followPayload.cursor).toBe('string');
      expect(typeof followPayload.eof).toBe('boolean');

      const selfLog = await readFile(selfLogPath, 'utf8');
      expect(selfLog).toContain('tool=list_logs');
      expect(selfLog).toContain('tool=read_log_chunk');
      expect(selfLog).toContain('tool=follow_log');
      expect(selfLog).not.toContain(' ERROR ');
    } finally {
      await clientTransport.close().catch(() => {});
      await serverTransport.close().catch(() => {});
    }
  });
});
