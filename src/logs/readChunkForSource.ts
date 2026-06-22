import type { LogSource } from '../config/schema.js';
import { readLogChunk, type ReadLogChunkResult } from './tailer.js';
import { readSshLogChunk } from './sshTailer.js';

export async function readChunkForSource(input: {
  source: LogSource;
  cursor: string | null;
  maxLines: number;
}): Promise<ReadLogChunkResult> {
  if (input.source.type === 'ssh') {
    return readSshLogChunk({
      source: input.source,
      cursor: input.cursor,
      maxLines: input.maxLines
    });
  }

  return readLogChunk({
    path: input.source.path,
    cursor: input.cursor,
    maxLines: input.maxLines
  });
}
