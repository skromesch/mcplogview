import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './config/loadConfig.js';
import { createLogRegistry } from './logs/logRegistry.js';
import { createServerLogger } from './logs/serverLogger.js';
import { createRuntimeContext, resolveConfigPath } from './runtime/bootstrap.js';
import { registerTools } from './server/registerTools.js';
import { runStdioTransport } from './transports/runStdio.js';
import { runHttpTransport } from './transports/runHttp.js';

function createNoopLogger() {
  return { info: async () => {}, error: async () => {}, close: async () => {} };
}

export function getHelpText(): string {
  return [
    'mcplogview usage',
    '',
    '  mcplogview [--help|-h]',
    '',
    'Environment:',
    '  LOG_SOURCES_CONFIG   Path to config JSON (default: config/log-sources.json)',
    '',
    'Behavior:',
    '  - If config file is missing, a minimal debug config is auto-created.',
    '  - Self-log source (mcplogview-self) is enabled by default in generated config.',
    '',
    'Minimal config example:',
    '{',
    '  "transport": { "mode": "stdio", "host": "127.0.0.1", "port": 3333, "path": "/mcp" },',
    '  "logging": { "enabled": true, "debug": true, "path": "logs/mcplogview-server.log" },',
    '  "sources": [',
    '    { "type": "local", "id": "app", "label": "App", "path": "/absolute/path/to/app.log" }',
    '  ]',
    '}',
    '',
    'SSH source example:',
    '{',
    '  "type": "ssh",',
    '  "id": "prod-api",',
    '  "label": "Prod API",',
    '  "host": "10.0.0.12",',
    '  "port": 22,',
    '  "user": "ubuntu",',
    '  "identityFile": "/home/pi/.ssh/id_ed25519",',
    '  "strictHostKeyChecking": false,',
    '  "path": "/var/log/myapp/api.log"',
    '}',
    '',
    'MCP tools:',
    '  list_logs, get_log_skill, read_log_chunk, follow_log'
  ].join('\n');
}

export async function buildServer(args: { configPath: string }) {
  const config = await loadConfig(args.configPath);
  const registry = createLogRegistry(config);
  const logger = config.logging.enabled
    ? await createServerLogger(config.logging.path, {
        maxFileSize: config.logging.maxFileSize,
        maxBackups: config.logging.maxBackups
      })
    : createNoopLogger();
  const server = new McpServer({ name: 'mcplogview', version: '0.1.0' });
  const toolNames = await registerTools({ server, registry, config, logger });

  await logger.info(`server initialized with ${config.sources.length} sources`);

  return {
    server,
    logger,
    getRegisteredToolNames: () => toolNames
  };
}

export async function runCli(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stderr.write(`${getHelpText()}\n`);
    return;
  }

  const configPath = await resolveConfigPath();
  const runtime = await createRuntimeContext(configPath);
  const appConfig = runtime.config;
  const logger = runtime.logger;
  process.stderr.write(`mcplogview log file: ${appConfig.logging.path}\n`);

  const built = await buildServer({ configPath });

  process.on('unhandledRejection', (reason) => {
    void logger.error('process unhandledRejection', reason);
  });
  process.on('uncaughtException', (err) => {
    void logger.error('process uncaughtException', err);
  });

  let shutdownCalled = false;

  async function performShutdown(): Promise<void> {
    if (shutdownCalled) return;
    shutdownCalled = true;

    await logger.info('shutdown initiated');

    try {
      await built.server.close();
    } catch {
      // ignore close errors during shutdown
    }

    try {
      await transportHandle.close();
    } catch {
      // ignore close errors during shutdown
    }

    try {
      await logger.close();
    } catch {
      // ignore close errors during shutdown
    }

    process.exit(0);
  }

  process.on('SIGINT', () => {
    void performShutdown();
  });
  process.on('SIGTERM', () => {
    void performShutdown();
  });

  const transportHandle =
    appConfig.transport.mode === 'stdio'
      ? await runStdioTransport({
          server: built.server,
          logger,
          debug: appConfig.logging.debug,
          maxBodyChars: appConfig.logging.maxBodyChars
        })
      : await runHttpTransport({
          server: built.server,
          logger,
          transportMode: appConfig.transport.mode,
          host: appConfig.transport.host,
          port: appConfig.transport.port,
          path: appConfig.transport.path,
          debug: appConfig.logging.debug,
          maxBodyChars: appConfig.logging.maxBodyChars
        });
}
