import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { SshLogSource } from '../config/schema.js';
import type { ReadLogChunkResult } from './tailer.js';
import { extractLinesFromChunk } from './tailer.js';
import { InvalidSshResponseError, RemoteLogFileNotFoundError } from '../errors.js';

const execFileAsync = promisify(execFile);
const MISSING_FILE_MARKER = '__MCPLOGVIEW_ERR__:missing';

interface SshCursorState {
  source: string;
  offset: number;
}

function encodeCursor(state: SshCursorState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64');
}

function decodeCursor(cursor: string | null): SshCursorState | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as SshCursorState;
  } catch {
    return null;
  }
}

function shellEscapeSingleQuoted(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function sourceFingerprint(source: SshLogSource): string {
  return `${source.user}@${source.host}:${source.port ?? 22}:${source.path}`;
}

export function buildSshArgs(source: SshLogSource, remoteCommand: string): string[] {
  const strict = source.strictHostKeyChecking === true ? 'yes' : 'no';
  return [
    '-i', source.identityFile,
    '-p', String(source.port ?? 22),
    '-o', 'BatchMode=yes',
    '-o', `StrictHostKeyChecking=${strict}`,
    `${source.user}@${source.host}`,
    remoteCommand
  ];
}

export async function readSshLogChunk(input: {
  source: SshLogSource;
  cursor: string | null;
  maxLines: number;
}): Promise<ReadLogChunkResult> {
  const fingerprint = sourceFingerprint(input.source);
  const decoded = decodeCursor(input.cursor);
  const requestedOffset = decoded && decoded.source === fingerprint ? decoded.offset : 0;

  const remotePath = shellEscapeSingleQuoted(input.source.path);
  const remoteCommand = [
    'sh -lc',
    shellEscapeSingleQuoted(
      `FILE=${remotePath}; ` +
      'SIZE=$(wc -c < "$FILE" 2>/dev/null || echo -1); ' +
      'if [ "$SIZE" -lt 0 ]; then echo "__MCPLOGVIEW_ERR__:missing"; exit 12; fi; ' +
      `REQ_OFFSET=${Math.max(0, requestedOffset)}; ` +
      'if [ "$REQ_OFFSET" -gt "$SIZE" ]; then REQ_OFFSET=0; fi; ' +
      'START=$((REQ_OFFSET + 1)); ' +
      'if [ "$START" -lt 1 ]; then START=1; fi; ' +
      'printf "__MCPLOGVIEW_SIZE__:%s\\n" "$SIZE"; ' +
      'tail -c +"$START" "$FILE"'
    )
  ].join(' ');

  const args = buildSshArgs(input.source, remoteCommand);
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync('ssh', args, { maxBuffer: 10 * 1024 * 1024 }));
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'stdout' in error &&
      typeof error.stdout === 'string' &&
      error.stdout.startsWith(MISSING_FILE_MARKER)
    ) {
      throw new RemoteLogFileNotFoundError(input.source.path);
    }
    throw error;
  }

  if (stdout.startsWith(MISSING_FILE_MARKER)) {
    throw new RemoteLogFileNotFoundError(input.source.path);
  }

  const newline = stdout.indexOf('\n');
  if (newline < 0) {
    throw new InvalidSshResponseError('invalid ssh log response header');
  }

  const header = stdout.slice(0, newline);
  const body = stdout.slice(newline + 1);
  if (!header.startsWith('__MCPLOGVIEW_SIZE__:')) {
    throw new InvalidSshResponseError('missing ssh size header');
  }

  const remoteSize = Number(header.replace('__MCPLOGVIEW_SIZE__:', '').trim());
  const effectiveOffset = requestedOffset > remoteSize ? 0 : requestedOffset;
  const extracted = extractLinesFromChunk(body, input.maxLines);
  const consumedText = body.slice(0, extracted.consumedChars);
  const newOffset = effectiveOffset + Buffer.byteLength(consumedText, 'utf8');

  return {
    lines: extracted.lines,
    cursor: encodeCursor({ source: fingerprint, offset: newOffset }),
    eof: extracted.eof
  };
}
