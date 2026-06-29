const DEV_API_ORIGINS = new Set([
  "http://localhost:4000",
  "http://127.0.0.1:4000",
]);

export function rewriteDevApiUrl(
  input: string,
  apiBaseUrl: string,
): string | null {
  let url: URL;
  let target: URL;

  try {
    url = new URL(input);
    target = new URL(apiBaseUrl);
  } catch {
    return null;
  }

  if (!DEV_API_ORIGINS.has(url.origin)) {
    return null;
  }

  const rewritten = new URL(url.pathname + url.search + url.hash, target);
  return rewritten.toString();
}
