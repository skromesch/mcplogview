import { readFile, stat } from 'node:fs/promises';

export interface ReadLogChunkInput {
  path: string;
  cursor: string | null;
  maxLines: number;
}

export interface ReadLogChunkResult {
  lines: string[];
  cursor: string;
  eof: boolean;
}

interface CursorState {
  inode: number;
  offset: number;
}

interface ExtractedLines {
  lines: string[];
  consumedChars: number;
  eof: boolean;
}

function encodeCursor(state: CursorState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64');
}

function decodeCursor(cursor: string | null): CursorState | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as CursorState;
  } catch {
    return null;
  }
}

export function extractLinesFromChunk(chunk: string, maxLines: number): ExtractedLines {
  const lines: string[] = [];
  let index = 0;
  let consumedChars = 0;

  while (lines.length < maxLines) {
    const newlineIndex = chunk.indexOf('\n', index);
    if (newlineIndex < 0) {
      if (index < chunk.length) {
        lines.push(chunk.slice(index));
        consumedChars = chunk.length;
      }
      break;
    }

    lines.push(chunk.slice(index, newlineIndex));
    index = newlineIndex + 1;
    consumedChars = index;
  }

  return {
    lines,
    consumedChars,
    eof: consumedChars >= chunk.length
  };
}

export async function readLogChunk(input: ReadLogChunkInput): Promise<ReadLogChunkResult> {
  const fileStat = await stat(input.path);
  const decoded = decodeCursor(input.cursor);
  const offset = decoded && decoded.inode === fileStat.ino ? decoded.offset : 0;

  const content = await readFile(input.path, 'utf8');
  const chunk = content.slice(offset);
  const extracted = extractLinesFromChunk(chunk, input.maxLines);
  const consumedText = chunk.slice(0, extracted.consumedChars);
  const newOffset = offset + Buffer.byteLength(consumedText, 'utf8');

  return {
    lines: extracted.lines,
    cursor: encodeCursor({ inode: fileStat.ino, offset: newOffset }),
    eof: extracted.eof
  };
}
