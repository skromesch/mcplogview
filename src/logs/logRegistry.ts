import type { LogSource } from '../config/schema.js';

export interface LogRegistry {
  list(): LogSource[];
  get(id: string): LogSource | undefined;
}

export function createLogRegistry(config: { sources: LogSource[] }): LogRegistry {
  const byId = new Map(config.sources.map((source) => [source.id, source]));

  return {
    list() {
      return [...byId.values()];
    },
    get(id: string) {
      return byId.get(id);
    }
  };
}
