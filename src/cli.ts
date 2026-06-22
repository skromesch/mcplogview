import { runCli } from './index.js';

void runCli().catch((err) => {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  process.stderr.write(`mcplogview startup failed: ${message}\n`);
  process.exitCode = 1;
});
