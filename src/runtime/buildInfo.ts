export interface BuildInfo {
  version: string;
  buildTimestamp: string;
  target: string;
  commit: string;
}

export function getBuildInfo(): BuildInfo {
  return {
    version: process.env.MCPLOGVIEW_VERSION ?? '0.1.0',
    buildTimestamp: process.env.MCPLOGVIEW_BUILD_TIMESTAMP ?? 'dev',
    target: process.env.MCPLOGVIEW_TARGET ?? process.platform,
    commit: process.env.MCPLOGVIEW_COMMIT ?? 'unknown'
  };
}

export function formatBuildInfo(info: BuildInfo): string {
  return `build version=${info.version} target=${info.target} timestamp=${info.buildTimestamp} commit=${info.commit}`;
}
