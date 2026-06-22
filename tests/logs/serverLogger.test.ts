import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, readdir, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServerLogger } from '../../src/logs/serverLogger.js';

describe('log rotation', () => {
  it('rotates log when file exceeds maxFileSize', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-rotation-'));
    const logPath = join(dir, 'server.log');

    const logger = await createServerLogger(logPath, { maxFileSize: 100, maxBackups: 3 });

    await logger.info('first message');
    await logger.info('second message that makes the file bigger');

    await logger.info('this message will trigger rotation because file is already big');

    const backupPath = `${logPath}.1`;
    const backupExists = await stat(backupPath).then(() => true).catch(() => false);
    expect(backupExists).toBe(true);

    const backupContent = await readFile(backupPath, 'utf8');
    expect(backupContent).toContain('first message');
    expect(backupContent).toContain('second message');
  });

  it('keeps correct number of backups', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-rotation-backups-'));
    const logPath = join(dir, 'server.log');

    const logger = await createServerLogger(logPath, { maxFileSize: 50, maxBackups: 2 });

    for (let i = 0; i < 10; i++) {
      await logger.info(`message number ${i} padding padding padding`);
    }

    const files = await readdir(dir);
    const logFiles = files.filter((f) => f.startsWith('server.log'));

    expect(logFiles.length).toBeLessThanOrEqual(3);

    try {
      const mainLog = await readFile(logPath, 'utf8');
      expect(mainLog).toContain('message number');
    } catch {
      const backup1 = await readFile(`${logPath}.1`, 'utf8');
      expect(backup1).toContain('message number');
    }
  });

  it('deletes old backups when exceeding maxBackups', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-rotation-delete-'));
    const logPath = join(dir, 'server.log');

    const logger = await createServerLogger(logPath, { maxFileSize: 50, maxBackups: 2 });

    for (let i = 0; i < 20; i++) {
      await logger.info(`rotation test message number ${i} with padding`);
    }

    const files = await readdir(dir);
    const logFiles = files.filter((f) => f.startsWith('server.log'));

    expect(logFiles.length).toBeLessThanOrEqual(3);

    const backup1 = `${logPath}.1`;
    const backup2 = `${logPath}.2`;
    const backup3 = `${logPath}.3`;

    const backup1Exists = await stat(backup1).then(() => true).catch(() => false);
    const backup2Exists = await stat(backup2).then(() => true).catch(() => false);
    const backup3Exists = await stat(backup3).then(() => true).catch(() => false);

    expect(backup3Exists).toBe(false);
    expect(backup1Exists || backup2Exists).toBe(true);
  });

  it('does not rotate when file is below maxFileSize', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-rotation-small-'));
    const logPath = join(dir, 'server.log');

    const logger = await createServerLogger(logPath, { maxFileSize: 10000, maxBackups: 3 });

    await logger.info('small message');
    await logger.info('another small message');

    const files = await readdir(dir);
    const backupFiles = files.filter((f) => f.startsWith('server.log.') && f !== 'server.log');

    expect(backupFiles.length).toBe(0);
  });

  it('handles missing log file gracefully', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-rotation-missing-'));
    const logPath = join(dir, 'server.log');

    const logger = await createServerLogger(logPath, { maxFileSize: 100, maxBackups: 3 });

    await logger.info('first message');

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain('first message');
  });
});
