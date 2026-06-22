import { describe, it, expect } from 'vitest';
import { createLogRegistry } from '../../src/logs/logRegistry.js';

describe('logRegistry', () => {
  const registry = createLogRegistry({
    sources: [
      { type: 'local', id: 'api', label: 'API', path: '/tmp/api.log' },
      { type: 'local', id: 'worker', label: 'Worker', path: '/tmp/worker.log' }
    ]
  });

  it('lists all sources', () => {
    expect(registry.list().map((s) => s.id)).toEqual(['api', 'worker']);
  });

  it('gets source by id', () => {
    expect(registry.get('api')?.path).toBe('/tmp/api.log');
  });

  it('returns undefined for unknown id', () => {
    expect(registry.get('missing')).toBeUndefined();
  });
});
