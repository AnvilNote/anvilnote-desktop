// Minimal timestamped logger. A file sink (e.g. under app.getPath("logs")) can
// be layered on later; for the skeleton, the console is enough.

type Level = "info" | "warn" | "error";

function emit(level: Level, scope: string, args: unknown[]): void {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${scope}]`;
  if (level === "error") console.error(prefix, ...args);
  else if (level === "warn") console.warn(prefix, ...args);
  else console.log(prefix, ...args);
}

export function createLogger(scope: string) {
  return {
    info: (...args: unknown[]) => emit("info", scope, args),
    warn: (...args: unknown[]) => emit("warn", scope, args),
    error: (...args: unknown[]) => emit("error", scope, args),
  };
}

export type Logger = ReturnType<typeof createLogger>;
