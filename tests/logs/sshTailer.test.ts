import { describe, it, expect } from 'vitest';
import { buildSshArgs } from '../../src/logs/sshTailer.js';

describe('ssh tailer', () => {
  it('builds ssh args with identity file and safe defaults', () => {
    const args = buildSshArgs({
      type: 'ssh',
      id: 'r1',
      label: 'Remote',
      host: 'example.com',
      port: 2222,
      user: 'ubuntu',
      identityFile: '/tmp/id_rsa',
      strictHostKeyChecking: false,
      path: '/var/log/app.log'
    }, 'echo ok');

    expect(args).toEqual([
      '-i', '/tmp/id_rsa',
      '-p', '2222',
      '-o', 'BatchMode=yes',
      '-o', 'StrictHostKeyChecking=no',
      'ubuntu@example.com',
      'echo ok'
    ]);
  });
});
