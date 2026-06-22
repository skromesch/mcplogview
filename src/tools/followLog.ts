import { z } from 'zod';
import type { LogRegistry } from '../logs/logRegistry.js';
import { readChunkForSource } from '../logs/readChunkForSource.js';
import { UnknownSourceError } from '../errors.js';

const followInputSchema = z.object({
  sourceId: z.string().min(1),
  cursor: z.string().nullable().optional().default(null),
  maxLines: z.number().int().min(1).max(500).default(100),
  timeoutMs: z.number().int().min(1).max(30000).default(5000),
  pollIntervalMs: z.number().int().min(10).max(1000).default(200)
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function followLogHandler(registry: LogRegistry, input: z.infer<typeof followInputSchema>) {
  const args = followInputSchema.parse(input);
  const source = registry.get(args.sourceId);
  if (!source) throw new UnknownSourceError(args.sourceId);

  const deadline = Date.now() + args.timeoutMs;
  let cursor = args.cursor;

  while (Date.now() <= deadline) {
    const res = await readChunkForSource({ source, cursor, maxLines: args.maxLines });
    if (res.lines.length > 0) return res;

    cursor = res.cursor;
    await sleep(args.pollIntervalMs);
  }

  return { lines: [], cursor: cursor ?? '', eof: true };
}
