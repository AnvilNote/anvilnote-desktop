import { randomBytes } from "node:crypto";
import {
  AIWriterRequestSchema,
  AIWriterResultSchema,
  getModelDefinition,
  type AIWriterResult,
  type ConnectionTestResult,
} from "@anvilnote/ai-writer";
import type { AISecretStore } from "./ai-secret-store.js";

const ALLOWED_PATHS = new Set([
  "/api/ai/providers",
  "/api/ai/estimate",
  "/api/ai/test-connection",
  "/api/ai/compose",
  "/api/ai/rewrite-selection",
]);
const CANCEL_PATH = /^\/api\/ai\/requests\/[A-Za-z0-9._:-]{1,128}\/cancel$/u;

export function createDesktopTrustToken(): string {
  return randomBytes(32).toString("hex");
}

export function isAllowedAIPath(pathname: string): boolean {
  return ALLOWED_PATHS.has(pathname) || CANCEL_PATH.test(pathname);
}

export interface SafeAIProxyError {
  code: string;
  messageKey: string;
  retryable: boolean;
  requestId?: string;
  details?: Record<string, unknown>;
}

export function toSafeAIProxyError(error: unknown): SafeAIProxyError {
  if (error instanceof AIProxyError) return error.shape;
  return {
    code: "unknown_error",
    messageKey: "ai.errors.unknown_error",
    retryable: false,
  };
}

export class AIProxyError extends Error {
  constructor(readonly shape: SafeAIProxyError) {
    super(shape.messageKey);
    this.name = "AIProxyError";
  }
}

type FetchLike = typeof fetch;

interface TrustedAIClientOptions {
  getApiBaseUrl: () => string;
  trustToken: string;
  secretStore: AISecretStore;
  fetch?: FetchLike;
}

function parseErrorPayload(value: unknown): SafeAIProxyError {
  if (!value || typeof value !== "object") return toSafeAIProxyError(value);
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== "object") return toSafeAIProxyError(value);
  const record = error as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : "unknown_error",
    messageKey:
      typeof record.messageKey === "string"
        ? record.messageKey
        : "ai.errors.unknown_error",
    retryable: record.retryable === true,
    ...(typeof record.requestId === "string" ? { requestId: record.requestId } : {}),
    ...(record.details && typeof record.details === "object"
      ? { details: record.details as Record<string, unknown> }
      : {}),
  };
}

function connectionResult(value: unknown): ConnectionTestResult {
  if (!value || typeof value !== "object") throw new AIProxyError(toSafeAIProxyError(value));
  const record = value as Record<string, unknown>;
  const statuses = new Set([
    "success",
    "invalid-key",
    "permission-denied",
    "insufficient-credit",
    "model-unavailable",
    "rate-limited",
    "network-error",
    "timeout",
    "cancelled",
    "unknown-error",
  ]);
  if (
    typeof record.status !== "string" ||
    !statuses.has(record.status) ||
    typeof record.provider !== "string" ||
    typeof record.model !== "string" ||
    typeof record.messageKey !== "string"
  ) {
    throw new AIProxyError({
      code: "invalid_structured_output",
      messageKey: "ai.errors.invalid_structured_output",
      retryable: true,
    });
  }
  return record as unknown as ConnectionTestResult;
}

export class TrustedAIClient {
  private readonly active = new Map<string, AbortController>();
  private readonly fetch: FetchLike;

  constructor(private readonly options: TrustedAIClientOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  private async post(
    pathname: string,
    body: unknown,
    options: { credential?: string; signal?: AbortSignal } = {},
  ): Promise<unknown> {
    if (!isAllowedAIPath(pathname)) {
      throw new AIProxyError({
        code: "permission_denied",
        messageKey: "ai.errors.permission_denied",
        retryable: false,
      });
    }
    const response = await this.fetch(new URL(pathname, this.options.getApiBaseUrl()), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-anvilnote-desktop-token": this.options.trustToken,
        ...(options.credential
          ? { "x-anvilnote-ai-credential": options.credential }
          : {}),
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object" || !("data" in payload)) {
      throw new AIProxyError(parseErrorPayload(payload));
    }
    return (payload as { data: unknown }).data;
  }

  async testConnection(input: {
    providerId: string;
    model: string;
    apiKey?: string;
  }): Promise<ConnectionTestResult> {
    if (!getModelDefinition(input.providerId, input.model)?.enabled) {
      throw new AIProxyError({
        code: "model_unavailable",
        messageKey: "ai.errors.model_unavailable",
        retryable: false,
      });
    }
    const credential =
      input.apiKey?.trim() ||
      (await this.options.secretStore.getForTrustedExecution(input.providerId));
    if (!credential) {
      throw new AIProxyError({
        code: "invalid_api_key",
        messageKey: "ai.errors.invalid_api_key",
        retryable: false,
      });
    }
    return connectionResult(
      await this.post(
        "/api/ai/test-connection",
        { providerId: input.providerId, model: input.model },
        { credential },
      ),
    );
  }

  async estimate(requestInput: unknown): Promise<unknown> {
    const request = AIWriterRequestSchema.parse(requestInput);
    return this.post("/api/ai/estimate", request);
  }

  async execute(requestInput: unknown): Promise<AIWriterResult> {
    const request = AIWriterRequestSchema.parse(requestInput);
    const credential = await this.options.secretStore.getForTrustedExecution(
      request.provider.id,
    );
    if (!credential) {
      throw new AIProxyError({
        code: "invalid_api_key",
        messageKey: "ai.errors.invalid_api_key",
        retryable: false,
      });
    }
    const controller = new AbortController();
    this.active.set(request.requestId, controller);
    try {
      const pathname =
        request.intent === "rewrite-selection"
          ? "/api/ai/rewrite-selection"
          : "/api/ai/compose";
      return AIWriterResultSchema.parse(
        await this.post(pathname, request, {
          credential,
          signal: controller.signal,
        }),
      );
    } finally {
      this.active.delete(request.requestId);
    }
  }

  async cancel(requestId: string): Promise<boolean> {
    if (!/^[A-Za-z0-9._:-]{1,128}$/u.test(requestId)) return false;
    const controller = this.active.get(requestId);
    controller?.abort();
    try {
      const result = await this.post(`/api/ai/requests/${requestId}/cancel`, {});
      return Boolean(
        result && typeof result === "object" && (result as { cancelled?: unknown }).cancelled,
      );
    } catch {
      return Boolean(controller);
    }
  }
}
