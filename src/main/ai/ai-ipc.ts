import type { IpcMainInvokeEvent } from "electron";
import type { AISecretStore, AISecretStatus } from "./ai-secret-store.js";
import {
  TrustedAIClient,
  toSafeAIProxyError,
  type SafeAIProxyError,
} from "./trusted-ai-client.js";

export const AI_IPC_CHANNELS = {
  capabilities: "anvilnote:ai:capabilities",
  credentialStatus: "anvilnote:ai:credential-status",
  saveCredential: "anvilnote:ai:save-credential",
  removeCredential: "anvilnote:ai:remove-credential",
  testConnection: "anvilnote:ai:test-connection",
  estimate: "anvilnote:ai:estimate",
  execute: "anvilnote:ai:execute",
  cancel: "anvilnote:ai:cancel",
} as const;

export type AIIPCResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SafeAIProxyError };

interface IPCRegistrar {
  handle(
    channel: string,
    listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown,
  ): void;
}

interface RegisterAIIPCOptions {
  ipcMain: IPCRegistrar;
  secretStore: AISecretStore;
  client: TrustedAIClient;
}

function providerId(value: unknown): "openai" {
  if (value !== "openai") throw new Error("AI provider is not supported.");
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI IPC input is invalid.");
  }
  return value as Record<string, unknown>;
}

function safeError(error: unknown): SafeAIProxyError {
  if (error instanceof Error && error.message === "Secure credential storage is unavailable.") {
    return {
      code: "secure_storage_unavailable",
      messageKey: "ai.errors.secure_storage_unavailable",
      retryable: false,
    };
  }
  return toSafeAIProxyError(error);
}

function handler<T>(operation: (...args: unknown[]) => Promise<T> | T) {
  return async (_event: IpcMainInvokeEvent, ...args: unknown[]): Promise<AIIPCResult<T>> => {
    try {
      return { ok: true, data: await operation(...args) };
    } catch (error) {
      return { ok: false, error: safeError(error) };
    }
  };
}

export function registerAIIPCHandlers(options: RegisterAIIPCOptions): void {
  options.ipcMain.handle(
    AI_IPC_CHANNELS.capabilities,
    handler(async () => {
      const status = await options.secretStore.getStatus("openai");
      return {
        runtime: "desktop" as const,
        persistentCredentialStorage: status.storage === "os-secure-storage",
        sessionCredentialStorage: status.storage === "session-only",
        smartModeAvailable: status.storage !== "unavailable",
        ...(status.storage === "unavailable"
          ? { reason: "secure_storage_unavailable" }
          : {}),
      };
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.credentialStatus,
    handler((rawProviderId) => options.secretStore.getStatus(providerId(rawProviderId))),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.saveCredential,
    handler((input) => {
      const record = asRecord(input);
      if (typeof record.apiKey !== "string") throw new Error("AI IPC input is invalid.");
      return options.secretStore.save(providerId(record.providerId), record.apiKey);
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.removeCredential,
    handler(async (rawProviderId) => {
      await options.secretStore.remove(providerId(rawProviderId));
      return options.secretStore.getStatus("openai");
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.testConnection,
    handler((input) => {
      const record = asRecord(input);
      if (typeof record.model !== "string") throw new Error("AI IPC input is invalid.");
      if (record.apiKey !== undefined && typeof record.apiKey !== "string") {
        throw new Error("AI IPC input is invalid.");
      }
      return options.client.testConnection({
        providerId: providerId(record.providerId),
        model: record.model,
        ...(typeof record.apiKey === "string" ? { apiKey: record.apiKey } : {}),
      });
    }),
  );
  options.ipcMain.handle(AI_IPC_CHANNELS.estimate, handler((input) => options.client.estimate(input)));
  options.ipcMain.handle(AI_IPC_CHANNELS.execute, handler((input) => options.client.execute(input)));
  options.ipcMain.handle(
    AI_IPC_CHANNELS.cancel,
    handler((rawRequestId) => {
      if (typeof rawRequestId !== "string") throw new Error("AI IPC input is invalid.");
      return options.client.cancel(rawRequestId);
    }),
  );
}

export type { AISecretStatus };
