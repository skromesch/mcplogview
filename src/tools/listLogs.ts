import type { LogRegistry } from '../logs/logRegistry.js';

export async function listLogsHandler(registry: LogRegistry) {
  return {
    logs: registry.list().map((source) => ({
      id: source.id,
      label: source.label,
      description: source.description,
      hint: source.hint
    }))
  };
}
