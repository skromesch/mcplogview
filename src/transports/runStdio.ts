import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ServerLogger } from '../logs/serverLogger.js';

export async function runStdioTransport(input: {
  server: McpServer;
  logger: ServerLogger;
  debug: boolean;
  maxBodyChars: number;
}): Promise<{ close: () => Promise<void> }> {
  const { server, logger, debug, maxBodyChars } = input;

  const trimBody = (text: string): string => {
    if (text.length <= maxBodyChars) return text;
    return `${text.slice(0, maxBodyChars)}...[truncated ${text.length - maxBodyChars} chars]`;
  };

  if (debug) {
    process.stdin.on('data', (chunk) => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      void logger.info(`stdio inbound raw=${trimBody(text)}`);
    });

    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown, ...args: unknown[]) => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
      void logger.info(`stdio outbound raw=${trimBody(text)}`);
      return originalWrite(chunk as never, ...(args as []));
    }) as typeof process.stdout.write;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  await logger.info('transport=stdio connected');

  return { close: () => transport.close() };
}
