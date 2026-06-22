import { z } from 'zod';

export const transportSchema = z.object({
  mode: z.enum(['stdio', 'http', 'https-dev']).default('stdio'),
  host: z.string().min(1).default('127.0.0.1'),
  port: z.number().int().min(1).max(65535).default(3333),
  path: z.string().min(1).default('/mcp')
});

export const loggingSchema = z.object({
  enabled: z.boolean().default(true),
  debug: z.boolean().default(false),
  maxBodyChars: z.number().int().min(128).max(20000).default(4000),
  path: z.string().min(1).default('scripts/logs/mcplogview-server.log'),
  selfSourceId: z.string().min(1).default('mcplogview-self'),
  selfSourceLabel: z.string().min(1).default('MCP Server Self Log'),
  maxFileSize: z.number().int().min(1024).max(1024 * 1024 * 1024).default(10 * 1024 * 1024),
  maxBackups: z.number().int().min(1).max(100).default(5)
});

const baseLogSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  hint: z.string().optional()
});

export const localLogSourceSchema = baseLogSourceSchema.extend({
  type: z.literal('local').optional().default('local'),
  path: z.string().min(1)
});

export const sshLogSourceSchema = baseLogSourceSchema.extend({
  type: z.literal('ssh'),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(22),
  user: z.string().min(1),
  identityFile: z.string().min(1),
  strictHostKeyChecking: z.boolean().default(false),
  path: z.string().min(1)
});

export const logSourceSchema = z.union([localLogSourceSchema, sshLogSourceSchema]);

export const appConfigSchema = z.object({
  sources: z.array(logSourceSchema).default([]),
  skillsDir: z.string().min(1).default('config/log-skills'),
  transport: transportSchema.default({
    mode: 'stdio',
    host: '127.0.0.1',
    port: 3333,
    path: '/mcp'
  }),
  logging: loggingSchema.default({
    enabled: true,
    debug: false,
    maxBodyChars: 4000,
    path: 'scripts/logs/mcplogview-server.log',
    selfSourceId: 'mcplogview-self',
    selfSourceLabel: 'MCP Server Self Log',
    maxFileSize: 10 * 1024 * 1024,
    maxBackups: 5
  })
});

export type LocalLogSource = z.infer<typeof localLogSourceSchema>;
export type SshLogSource = z.infer<typeof sshLogSourceSchema>;
export type LogSource = z.infer<typeof logSourceSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;
