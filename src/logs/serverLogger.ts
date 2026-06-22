import { appendFile, mkdir, rename, unlink, stat, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface ServerLogger {
  info(message: string): Promise<void>;
  error(message: string, err?: unknown): Promise<void>;
  close(): Promise<void>;
}

function formatLine(level: 'INFO' | 'ERROR', message: string): string {
  const ts = new Date().toISOString();
  return `${ts} [${level}] ${message}\n`;
}

function backupPath(logFilePath: string, index: number): string {
  return `${logFilePath}.${index}`;
}

async function rotateLog(logFilePath: string, maxBackups: number): Promise<void> {
  for (let i = maxBackups; i >= 1; i--) {
    const oldBackup = backupPath(logFilePath, i);
    const newBackup = backupPath(logFilePath, i + 1);

    try {
      await stat(oldBackup);
      if (i + 1 > maxBackups) {
        await unlink(oldBackup).catch(() => {});
      } else {
        await rename(oldBackup, newBackup).catch(() => {});
      }
    } catch {
      // file doesn't exist, skip
    }
  }

  try {
    await rename(logFilePath, backupPath(logFilePath, 1));
  } catch {
    // file doesn't exist or can't be renamed, skip
  }
}

async function checkAndRotate(
  logFilePath: string,
  maxFileSize: number,
  maxBackups: number
): Promise<void> {
  try {
    const fileStat = await stat(logFilePath);
    if (fileStat.size >= maxFileSize) {
      await rotateLog(logFilePath, maxBackups);
    }
  } catch {
    // file doesn't exist yet, no rotation needed
  }
}

export async function createServerLogger(
  logFilePath: string,
  options: { maxFileSize?: number; maxBackups?: number } = {}
): Promise<ServerLogger> {
  const maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024;
  const maxBackups = options.maxBackups ?? 5;

  await mkdir(dirname(logFilePath), { recursive: true });

  return {
    async info(message: string) {
      await appendFile(logFilePath, formatLine('INFO', message), 'utf8');
      await checkAndRotate(logFilePath, maxFileSize, maxBackups);
    },
    async error(message: string, err?: unknown) {
      const details = err instanceof Error
        ? `${err.name}: ${err.message}${err.stack ? ` | stack=${err.stack.replace(/\n/g, '\\n')}` : ''}`
        : String(err ?? 'unknown');
      await appendFile(logFilePath, formatLine('ERROR', `${message} | ${details}`), 'utf8');
      await checkAndRotate(logFilePath, maxFileSize, maxBackups);
    },
    async close() {
      await appendFile(logFilePath, formatLine('INFO', 'server shutting down'), 'utf8');
    }
  };
}
