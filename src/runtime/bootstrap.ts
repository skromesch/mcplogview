import { loadConfig } from '../config/loadConfig.js';
import { createLogRegistry } from '../logs/logRegistry.js';
import { createServerLogger, type ServerLogger } from '../logs/serverLogger.js';
import { formatBuildInfo, getBuildInfo } from './buildInfo.js';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface RuntimeContext {
  configPath: string;
  config: Awaited<ReturnType<typeof loadConfig>>;
  registry: ReturnType<typeof createLogRegistry>;
  logger: ServerLogger;
}

function createNoopLogger(): ServerLogger {
  return { info: async () => {}, error: async () => {}, close: async () => {} };
}

export async function resolveConfigPath(): Promise<string> {
  return process.env.LOG_SOURCES_CONFIG ?? 'config/log-sources.json';
}

async function ensureConfigExists(configPath: string): Promise<void> {
  try {
    await access(configPath);
    return;
  } catch {
    // Missing config is expected on first portable run.
  }

  await mkdir(dirname(configPath), { recursive: true });

  const minimalConfig = {
    transport: {
      mode: 'stdio',
      host: '127.0.0.1',
      port: 3333,
      path: '/mcp'
    },
    logging: {
      enabled: true,
      debug: true,
      maxBodyChars: 4000,
      path: 'logs/mcplogview-server.log',
      selfSourceId: 'mcplogview-self',
      selfSourceLabel: 'MCP Server Self Log',
      maxFileSize: 10 * 1024 * 1024,
      maxBackups: 5
    },
    skillsDir: 'config/log-skills',
    sources: []
  };

  await writeFile(configPath, JSON.stringify(minimalConfig, null, 2) + '\n', 'utf8');
  process.stderr.write(`mcplogview created default config: ${configPath}\n`);
}

export async function createRuntimeContext(configPath: string): Promise<RuntimeContext> {
  await ensureConfigExists(configPath);
  const config = await loadConfig(configPath);
  const logger = config.logging.enabled
    ? await createServerLogger(config.logging.path, {
        maxFileSize: config.logging.maxFileSize,
        maxBackups: config.logging.maxBackups
      })
    : createNoopLogger();
  const registry = createLogRegistry(config);
  await logger.info(formatBuildInfo(getBuildInfo()));

  return { configPath, config, registry, logger };
}
