import { z } from 'zod';
import type { LogRegistry } from '../logs/logRegistry.js';
import { readChunkForSource } from '../logs/readChunkForSource.js';
import { UnknownSourceError } from '../errors.js';

const inputSchema = z.object({
  sourceId: z.string().min(1),
  cursor: z.string().nullable().optional().default(null),
  maxLines: z.number().int().min(1).max(500).default(100)
});

export type ReadLogChunkToolInput = z.infer<typeof inputSchema>;

export async function readLogChunkHandler(registry: LogRegistry, input: ReadLogChunkToolInput) {
  const args = inputSchema.parse(input);
  const source = registry.get(args.sourceId);

  if (!source) {
    throw new UnknownSourceError(args.sourceId);
  }

  return readChunkForSource({
    source,
    cursor: args.cursor,
    maxLines: args.maxLines
  });
}
