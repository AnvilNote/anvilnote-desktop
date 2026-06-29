const API_BASE_URL_ARG_PREFIX = "--anvilnote-api-base-url=";

export function buildApiBaseUrlArg(apiBaseUrl: string): string {
  return `${API_BASE_URL_ARG_PREFIX}${apiBaseUrl}`;
}

export function readApiBaseUrlFromArgv(argv: readonly string[]): string | null {
  const arg = argv.find((value) => value.startsWith(API_BASE_URL_ARG_PREFIX));
  if (!arg) return null;
  const value = arg.slice(API_BASE_URL_ARG_PREFIX.length).trim();
  return value ? value : null;
}

export function resolveSidecarExecPath(paths: {
  execPath: string;
  helperExecPath?: string | null;
}): string {
  return paths.helperExecPath?.trim() || paths.execPath;
}
