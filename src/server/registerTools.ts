import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppConfig } from '../config/schema.js';
import type { LogRegistry } from '../logs/logRegistry.js';
import type { ServerLogger } from '../logs/serverLogger.js';
import { listLogsHandler } from '../tools/listLogs.js';
import { readLogChunkHandler } from '../tools/readLogChunk.js';
import { followLogHandler } from '../tools/followLog.js';
import { getLogSkillHandler } from '../tools/getLogSkill.js';

export async function registerTools(input: {
  server: McpServer;
  registry: LogRegistry;
  config: AppConfig;
  logger: ServerLogger;
}): Promise<string[]> {
  const { server, registry, config, logger } = input;
  const toolNames: string[] = [];

  type ToolOk = { content: Array<{ type: 'text'; text: string }>; isError?: false };
  type ToolError = { content: Array<{ type: 'text'; text: string }>; isError: true };

  async function runToolWithLogging(toolName: string, context: string, fn: () => Promise<ToolOk>): Promise<ToolOk | ToolError> {
    await logger.info(`tool=${toolName} ${context}`.trim());
    try {
      return await fn();
    } catch (err) {
      await logger.error(`tool=${toolName} failed ${context}`.trim(), err);
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Tool error (${toolName}): ${message}` }],
        isError: true
      };
    }
  }

  server.tool('list_logs', 'List configured log sources', async () => {
    return runToolWithLogging('list_logs', '', async () => ({
      content: [{ type: 'text', text: JSON.stringify(await listLogsHandler(registry)) }]
    }));
  });
  toolNames.push('list_logs');

  server.tool('get_log_skill', 'Get usage skill for a configured log source', {
    sourceId: z.string()
  }, async (inputArgs) => {
    const sourceId = inputArgs.sourceId;
    return runToolWithLogging('get_log_skill', `sourceId=${sourceId}`, async () => ({
      content: [{
        type: 'text',
        text: JSON.stringify(await getLogSkillHandler(registry, config, { sourceId }))
      }]
    }));
  });
  toolNames.push('get_log_skill');

  server.tool('read_log_chunk', 'Read a chunk of lines from a configured log source', {
    sourceId: z.string(),
    cursor: z.string().nullable().optional(),
    maxLines: z.number().int().min(1).max(500).optional()
  }, async (inputArgs) => {
    const sourceId = inputArgs.sourceId;
    const cursor = inputArgs.cursor ?? null;
    const maxLines = inputArgs.maxLines ?? 100;

    return runToolWithLogging(
      'read_log_chunk',
      `sourceId=${sourceId} maxLines=${maxLines}`,
      async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify(await readLogChunkHandler(registry, {
            sourceId,
            cursor,
            maxLines
          }))
        }]
      })
    );
  });
  toolNames.push('read_log_chunk');

  server.tool('follow_log', 'Wait briefly for newly appended log lines', {
    sourceId: z.string(),
    cursor: z.string().nullable().optional(),
    maxLines: z.number().int().min(1).max(500).optional(),
    timeoutMs: z.number().int().min(1).max(30000).optional(),
    pollIntervalMs: z.number().int().min(10).max(1000).optional()
  }, async (inputArgs) => {
    const sourceId = inputArgs.sourceId;
    const cursor = inputArgs.cursor ?? null;
    const maxLines = inputArgs.maxLines ?? 100;
    const timeoutMs = inputArgs.timeoutMs ?? 5000;
    const pollIntervalMs = inputArgs.pollIntervalMs ?? 200;

    return runToolWithLogging(
      'follow_log',
      `sourceId=${sourceId} maxLines=${maxLines} timeoutMs=${timeoutMs} pollIntervalMs=${pollIntervalMs}`,
      async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify(await followLogHandler(registry, {
            sourceId,
            cursor,
            maxLines,
            timeoutMs,
            pollIntervalMs
          }))
        }]
      })
    );
  });
  toolNames.push('follow_log');

  return toolNames;
}
