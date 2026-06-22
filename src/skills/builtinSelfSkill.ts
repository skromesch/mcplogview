import type { LogSkillPayload } from './types.js';

export function createBuiltinSelfSkill(): LogSkillPayload {
  return {
    sourceId: 'mcplogview-self',
    hint: 'Use this source to debug mcplogview runtime and MCP transport issues.',
    origin: 'builtin',
    warnings: [],
    structured: {
      name: 'mcplogview-self-debug',
      sourceId: 'mcplogview-self',
      version: 1,
      tags: ['mcplogview', 'debug', 'transport', 'tools'],
      purpose: 'Diagnose mcplogview startup, transport connectivity, and tool invocation failures.',
      quickStart: [
        'Call read_log_chunk on mcplogview-self with maxLines=200 to inspect startup lines.',
        'If tools fail, search recent lines for "tool=<name> failed".',
        'For HTTP mode, verify request/response logs around 4xx/5xx statuses.'
      ],
      queries: [
        'read_log_chunk {"sourceId":"mcplogview-self","maxLines":200}',
        'follow_log {"sourceId":"mcplogview-self","timeoutMs":5000,"pollIntervalMs":200}',
        'read_log_chunk with previous cursor to inspect contiguous failure windows'
      ],
      troubleshooting: [
        'Check for "network listen failed code=EADDRINUSE" and change port.',
        'Check for "tool=<name> failed" and the associated exception details.',
        'Check for malformed HTTP request/JSON parse errors in transport logs.'
      ]
    },
    renderedMarkdown: [
      '# mcplogview self-log debugging',
      '',
      'Use this source to debug the server itself.',
      '',
      '## Recommended flow',
      '1. Read the latest startup lines.',
      '2. Inspect failing tool invocations (`tool=<name> failed`).',
      '3. Follow the log during reproduce attempts.',
      '',
      '## Common signatures',
      '- `network listen failed code=EADDRINUSE`',
      '- `http request json parse failed`',
      '- `tool=<name> failed`'
    ].join('\n')
  };
}
