# mcplogview

General MCP logviewer server for exposing configured log files as MCP tools.

## Configuration

Copy `config/log-sources.example.json` to `config/log-sources.json` and edit paths.

```json
{
  "transport": {
    "mode": "stdio",
    "host": "127.0.0.1",
    "port": 3333,
    "path": "/mcp"
  },
  "logging": {
    "enabled": true,
    "path": "scripts/logs/mcplogview-server.log",
    "selfSourceId": "mcplogview-self",
    "selfSourceLabel": "MCP Server Self Log"
  },
  "skillsDir": "config/log-skills",
  "sources": [
    { "type": "local", "id": "app", "label": "App", "path": "/absolute/path/to/app.log", "hint": "Start here for API errors" },
    {
      "type": "ssh",
      "id": "prod-api",
      "label": "Prod API",
      "host": "10.0.0.12",
      "port": 22,
      "user": "ubuntu",
      "identityFile": "/Users/you/.ssh/id_ed25519",
      "strictHostKeyChecking": false,
      "path": "/var/log/myapp/api.log"
    }
  ]
}
```

Transport modes:
- `stdio` (default): MCP over stdin/stdout
- `http`: Streamable HTTP endpoint (`http://host:port/path`)
- `https-dev`: Streamable HTTPS endpoint with runtime-generated self-signed cert (or custom key/cert from config)

Logging:
- Server writes internal logs to `logging.path` when `logging.enabled=true`.
- By default, that self log is auto-added as a queryable source (`mcplogview-self`).
- If `logging.enabled=false`, self-source is not auto-injected.
- Request and tool errors are logged with stack traces to help diagnose HTTP `500` issues.

## Usage

```bash
npm install
npm run build
LOG_SOURCES_CONFIG=config/log-sources.json npm run dev
```

If `LOG_SOURCES_CONFIG` is not set, default path is `config/log-sources.json`.

## SSH Notes

- SSH source uses non-interactive mode (`BatchMode=yes`).
- `identityFile` is used automatically from config.
- `strictHostKeyChecking` defaults to `false` for debug/dev convenience; set `true` if needed.
- Ensure your key permissions are correct and target host is reachable.

## MCP Integration

Add the server command in your MCP client configuration:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/mcplogview/dist/src/cli.js"],
  "env": { "LOG_SOURCES_CONFIG": "/absolute/path/to/mcplogview/config/log-sources.json" }
}
```

## Tools

- `list_logs`: Lists available configured logs, with optional `hint`.
- `get_log_skill`: Returns usage skill (`structured` + `renderedMarkdown`) for a log source.
- `read_log_chunk`: Returns lines and next cursor.
- `follow_log`: Polls for new lines until timeout.

Recommended flow for agents:
- `list_logs`
- `get_log_skill` for selected `sourceId`
- `read_log_chunk` / `follow_log`

## Skill Files

Optional file-based skill per source:
- `config/log-skills/<sourceId>.md`

Format:

```md
---
name: app-log
sourceId: app
version: 1
hint: Inspect this first for backend errors
tags: [api, backend, errors]
---
# App log guidance

Use this source during API incident triage.
```

Notes:
- `mcplogview-self` skill is built-in (server debug guidance), not loaded from file.
- If a file is missing/invalid, `get_log_skill` returns a fallback skill with warnings.

## HTTPS (Dev Mode)

When `transport.mode` is `https-dev`, mcplogview serves MCP over HTTPS. It uses custom key/cert files from config when provided, and falls back to runtime self-signed certificate generation when files are missing or invalid.

### Configuration with custom key/cert

Provide your own key and cert paths in the transport config:

```json
{
  "transport": {
    "mode": "https-dev",
    "host": "127.0.0.1",
    "port": 3333,
    "path": "/mcp",
    "httpsKey": "config/certs/key.pem",
    "httpsCert": "config/certs/cert.pem"
  },
  "sources": [
    { "type": "local", "id": "demo", "label": "Demo Log", "path": "/tmp/mcplogview-demo.log" }
  ]
}
```

### Fallback: auto-generated self-signed cert

When `httpsKey`/`httpsCert` are not provided, or when file loading fails, mcplogview generates a self-signed certificate at runtime:
- Algorithm: EC prime256v1
- Validity: 365 days
- Common Name: `localhost`
- Generated via `openssl` CLI (requires `openssl` installed)

The generated cert is temporary and recreated on each server restart. To generate your own persistent cert:

```bash
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -keyout config/certs/key.pem -out config/certs/cert.pem \
  -days 365 -nodes -subj /CN=localhost
```

Then reference them in your config as shown above.

Start server:

```bash
LOG_SOURCES_CONFIG=config/log-sources.json npm run dev
```

For clients/Inspector, use endpoint:
- `https://127.0.0.1:3333/mcp`

### MCP Inspector with HTTPS

When connecting MCP Inspector to an `https-dev` server:

1. Start the MCP server with `transport.mode: "https-dev"`:

```bash
LOG_SOURCES_CONFIG=config/log-sources.json npm run dev
```

2. Start MCP Inspector in a separate terminal (bypass self-signed cert check):

```bash
NODE_TLS_REJECT_UNAUTHORIZED="0" npx @modelcontextprotocol/inspector
```

3. In the Inspector UI, create a new connection:
   - **Transport**: HTTP(S)
   - **URL**: `https://127.0.0.1:3333/mcp`

4. When the Inspector prompts about the self-signed certificate:
   - Click "Allow" or "Proceed Anyway" to trust the cert
   - The connection will be established

Note: The self-signed cert is only valid for `localhost`. If you need to connect from another machine, generate a cert with the target hostname or IP as the CN.

## Quick Local Test (Generator + Inspector)

1. Start demo log generator in terminal A:

```bash
./scripts/generate-demo-log.sh /tmp/mcplogview-demo.log 5
```

2. Start MCP server (terminal B):

```bash
LOG_SOURCES_CONFIG=config/log-sources.json npm run dev
```

3. In MCP Inspector, connect this server and call tools in order:
- `list_logs` -> expect configured ids
- `read_log_chunk` with `{ "sourceId": "demo", "cursor": null, "maxLines": 20 }`
- `follow_log` with `{ "sourceId": "demo", "cursor": "<cursor from previous call>", "maxLines": 20, "timeoutMs": 7000, "pollIntervalMs": 250 }`

## MCP Inspector Usage

Prerequisites:
- `npm install` executed in this repo
- built server (`npm run build`) or direct TS run (`npm run dev`)
- valid config file at `config/log-sources.json`

1. Install and start MCP Inspector

Recommended (no global install):

```bash
npx @modelcontextprotocol/inspector
```

Optional global install:

```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector
```

Inspector typically opens a local web UI (if not, open the URL shown in terminal, usually `http://127.0.0.1:6274`).

2. Start the server

Stdio mode (default):

```bash
LOG_SOURCES_CONFIG=config/log-sources.json npm run dev
```

HTTP/HTTPS-dev mode: set `"transport.mode"` in config (`http` or `https-dev`), then start the same command above.

3. Open MCP Inspector

Use the Inspector UI and create a new connection:

- For `stdio`:
  - command: `node`
  - args: `["/absolute/path/to/mcplogview/dist/src/cli.js"]`
  - env: `{ "LOG_SOURCES_CONFIG": "/absolute/path/to/mcplogview/config/log-sources.json" }`
- For `http`:
  - URL: `http://127.0.0.1:3333/mcp` (or your configured `host:port/path`)
- For `https-dev`:
  - URL: `https://127.0.0.1:3333/mcp`
  - allow self-signed cert in Inspector/client settings

4. Call tools in recommended order

- `list_logs`
- `get_log_skill` with selected `sourceId`
- `read_log_chunk` (first page)
- `follow_log` using returned `cursor`

Example payloads:

```json
{ "sourceId": "demo", "cursor": null, "maxLines": 20 }
```

```json
{
  "sourceId": "demo",
  "cursor": "<cursor from read_log_chunk>",
  "maxLines": 20,
  "timeoutMs": 7000,
  "pollIntervalMs": 250
}
```

5. Troubleshooting

- Empty tool results: verify log file path exists and process has read access.
- Connection error on HTTPS-dev: trust/allow self-signed certificate.
- `500`/tool failures: check server self-log (`logging.path`) and query `mcplogview-self`.
- No config found: set `LOG_SOURCES_CONFIG` explicitly.

## Portable Quickstart

Portable build uses Node.js SEA-oriented packaging scripts and produces artifacts in `dist/portable`.

```bash
npm run build
npm run portable:build
npm run portable:verify
npm run portable:checksums
```

Run with config override:

```bash
LOG_SOURCES_CONFIG=config/log-sources.json ./dist/portable/mcplogview-<version>-<platform>
```

Windows example:

```powershell
$env:LOG_SOURCES_CONFIG='config/log-sources.json'
.\dist\portable\mcplogview-<version>-<platform>.exe
```

Raspberry Pi build from macOS (without building on Pi):

**Prerequisites:** Docker Desktop (or Docker Engine) must be installed and running, with `linux/arm64` platform support enabled (Docker Desktop ships this by default via QEMU).

```bash
npm run portable:build:raspi
```

This runs a `linux/arm64` Docker build (`node:22-bookworm`) and writes Raspberry-compatible artifacts to `dist/portable/`.
The container installs dependencies in its own `/work` folder, so your host `node_modules` stays untouched.

If `LOG_SOURCES_CONFIG` points to a missing file, `mcplogview` now auto-creates a minimal config with `logging.debug=true` and self-log source enabled.
