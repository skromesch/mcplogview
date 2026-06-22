# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENT.md

## Commands

```bash
npm run build   # TypeScript compile → dist/
npm run dev     # Run directly with tsx (no build step needed)
npm test        # vitest run (unit + integration)
```

Portable build (Node.js SEA):

```bash
npm run portable:build    # produces dist/portable/
npm run portable:verify   # smoke-test the binary
npm run portable:checksums
```

## Critical: stdio transport

In `stdio` mode, **only valid MCP JSON-RPC may go to `stdout`**. All debug output, warnings, and errors must go to `stderr` or `logging.path`. Writing anything else to stdout breaks MCP clients silently.

## Config

- `LOG_SOURCES_CONFIG` env var sets the config file path (default: `config/log-sources.json`)
- `config/log-sources.json` is gitignored — copy from `config/log-sources.example.json`
- If the config file is missing, the server auto-creates a minimal debug config with self-log enabled

## SSH sources

SSH tailing spawns `ssh` as a subprocess with `BatchMode=yes` (non-interactive). No SSH library is used. `identityFile` is passed via `-i`.

## Skill files

Optional per-source skills live in `config/log-skills/<sourceId>.md` (frontmatter + markdown body). The `mcplogview-self` skill is built-in and not file-loaded.

## MCP tools

| Tool | Purpose |
|------|---------|
| `list_logs` | Lists configured sources with labels and hints |
| `get_log_skill` | Returns structured + markdown skill for a source |
| `read_log_chunk` | Returns lines + next cursor (cursor-based paging) |
| `follow_log` | Short-polls for new lines until timeout |

Recommended agent flow: `list_logs` → `get_log_skill` → `read_log_chunk` / `follow_log`.
