import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildServer } from '../../src/index.js';
import { runHttpTransport } from '../../src/transports/runHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('graceful shutdown', () => {
  it('McpServer.close() closes connection cleanly', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-shutdown-stdio-'));
    const appLogPath = join(dir, 'app.log');
    const selfLogPath = join(dir, 'mcplogview-server.log');
    const configPath = join(dir, 'log-sources.json');

    await writeFile(appLogPath, 'line1\nline2\n', 'utf8');
    await writeFile(
      configPath,
      JSON.stringify({
        transport: { mode: 'stdio', host: '127.0.0.1', port: 3333, path: '/mcp' },
        logging: { enabled: true, debug: false, path: selfLogPath },
        sources: [{ type: 'local', id: 'app', label: 'App', path: appLogPath }]
      }),
      'utf8'
    );

    const built = await buildServer({ configPath });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await built.server.connect(serverTransport);

    const client = new Client({ name: 'test', version: '0.1.0' });
    await client.connect(clientTransport);

    await built.server.close();
    await client.close();
  }, 10000);

  it('http transport handle closes without error', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-shutdown-http-'));
    const appLogPath = join(dir, 'app.log');
    const selfLogPath = join(dir, 'mcplogview-server.log');
    const configPath = join(dir, 'log-sources.json');

    await writeFile(appLogPath, 'line1\nline2\n', 'utf8');
    await writeFile(
      configPath,
      JSON.stringify({
        transport: { mode: 'http', host: '127.0.0.1', port: 3334, path: '/mcp' },
        logging: { enabled: true, debug: false, path: selfLogPath },
        sources: [{ type: 'local', id: 'app', label: 'App', path: appLogPath }]
      }),
      'utf8'
    );

    const built = await buildServer({ configPath });

    const shutdownHandle = await runHttpTransport({
      server: built.server,
      logger: built.server as unknown as any,
      transportMode: 'http',
      host: '127.0.0.1',
      port: 3334,
      path: '/mcp',
      debug: false,
      maxBodyChars: 4000
    });

    await shutdownHandle.close();
  });

  it('shutdown writes marker to self-log', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-shutdown-log-'));
    const appLogPath = join(dir, 'app.log');
    const selfLogPath = join(dir, 'mcplogview-server.log');
    const configPath = join(dir, 'log-sources.json');

    await writeFile(appLogPath, 'line1\nline2\n', 'utf8');
    await writeFile(
      configPath,
      JSON.stringify({
        transport: { mode: 'stdio', host: '127.0.0.1', port: 3333, path: '/mcp' },
        logging: { enabled: true, debug: false, path: selfLogPath },
        sources: [{ type: 'local', id: 'app', label: 'App', path: appLogPath }]
      }),
      'utf8'
    );

    const built = await buildServer({ configPath });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await built.server.connect(serverTransport);

    const client = new Client({ name: 'test', version: '0.1.0' });
    await client.connect(clientTransport);

    await built.server.close();
    await (built as any).logger.close();
    await client.close();

    const selfLogContent = await readFile(selfLogPath, 'utf8');
    expect(selfLogContent).toContain('server shutting down');
  }, 10000);

  it('shutdown is idempotent — calling close twice does not throw', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-shutdown-idempotent-'));
    const appLogPath = join(dir, 'app.log');
    const selfLogPath = join(dir, 'mcplogview-server.log');
    const configPath = join(dir, 'log-sources.json');

    await writeFile(appLogPath, 'line1\n', 'utf8');
    await writeFile(
      configPath,
      JSON.stringify({
        transport: { mode: 'stdio', host: '127.0.0.1', port: 3333, path: '/mcp' },
        logging: { enabled: true, debug: false, path: selfLogPath },
        sources: [{ type: 'local', id: 'app', label: 'App', path: appLogPath }]
      }),
      'utf8'
    );

    const built = await buildServer({ configPath });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await built.server.connect(serverTransport);

    const client = new Client({ name: 'test', version: '0.1.0' });
    await client.connect(clientTransport);

    await built.server.close();
    await built.server.close();
    await client.close();
  }, 10000);
});
