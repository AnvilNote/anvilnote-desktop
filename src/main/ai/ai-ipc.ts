import type { IpcMainInvokeEvent } from "electron";
import type { AISecretStore, AISecretStatus } from "./ai-secret-store.js";
import type { AIAttachmentInput, AIAttachmentStore } from "./ai-attachment-store.js";
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
  listKeyProfiles: "anvilnote:ai:list-key-profiles",
  saveKeyProfile: "anvilnote:ai:save-key-profile",
  renameKeyProfile: "anvilnote:ai:rename-key-profile",
  activateKeyProfile: "anvilnote:ai:activate-key-profile",
  deactivateKeyProfile: "anvilnote:ai:deactivate-key-profile",
  deleteKeyProfile: "anvilnote:ai:delete-key-profile",
  testConnection: "anvilnote:ai:test-connection",
  estimate: "anvilnote:ai:estimate",
  execute: "anvilnote:ai:execute",
  cancel: "anvilnote:ai:cancel",
  listConversations: "anvilnote:ai:list-conversations",
  listConversationMessages: "anvilnote:ai:list-conversation-messages",
  executeConversationTurn: "anvilnote:ai:execute-conversation-turn",
  renameConversation: "anvilnote:ai:rename-conversation",
  deleteConversation: "anvilnote:ai:delete-conversation",
  prepareAttachments: "anvilnote:ai:prepare-attachments",
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
  attachmentStore: AIAttachmentStore;
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
    AI_IPC_CHANNELS.prepareAttachments,
    handler((rawInputs) => {
      if (!Array.isArray(rawInputs)) throw new Error("AI IPC input is invalid.");
      const inputs = rawInputs.map((rawInput): AIAttachmentInput => {
        const input = asRecord(rawInput);
        if (
          typeof input.name !== "string" ||
          typeof input.mimeType !== "string" ||
          !(input.data instanceof Uint8Array || input.data instanceof ArrayBuffer)
        ) {
          throw new Error("AI IPC input is invalid.");
        }
        return { name: input.name, mimeType: input.mimeType, data: input.data };
      });
      return options.attachmentStore.prepare(inputs);
    }),
  );
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
    AI_IPC_CHANNELS.listKeyProfiles,
    handler((rawProviderId) => options.secretStore.listProfiles(providerId(rawProviderId))),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.saveKeyProfile,
    handler(async (input) => {
      const record = asRecord(input);
      if (
        typeof record.label !== "string" ||
        typeof record.apiKey !== "string" ||
        typeof record.isActive !== "boolean"
      ) {
        throw new Error("AI IPC input is invalid.");
      }
      return options.secretStore.saveProfile(providerId(record.providerId), {
        label: record.label,
        secret: record.apiKey,
        isActive: record.isActive,
      });
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.renameKeyProfile,
    handler((input) => {
      const record = asRecord(input);
      if (typeof record.profileId !== "string" || typeof record.label !== "string") {
        throw new Error("AI IPC input is invalid.");
      }
      return options.secretStore.renameProfile(record.profileId, record.label);
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.activateKeyProfile,
    handler((rawProfileId) => {
      if (typeof rawProfileId !== "string") throw new Error("AI IPC input is invalid.");
      return options.secretStore.activateProfile(rawProfileId);
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.deactivateKeyProfile,
    handler((rawProfileId) => {
      if (typeof rawProfileId !== "string") throw new Error("AI IPC input is invalid.");
      return options.secretStore.deactivateProfile(rawProfileId);
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.deleteKeyProfile,
    handler((rawProfileId) => {
      if (typeof rawProfileId !== "string") throw new Error("AI IPC input is invalid.");
      return options.secretStore.deleteProfile(rawProfileId);
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
    AI_IPC_CHANNELS.listConversations,
    handler((input) => {
      const record = asRecord(input);
      if (
        typeof record.documentId !== "string" ||
        (record.cursor !== undefined && typeof record.cursor !== "string")
      ) {
        throw new Error("AI IPC input is invalid.");
      }
      return options.client.listConversations(
        record.documentId,
        typeof record.cursor === "string" ? record.cursor : undefined,
      );
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.listConversationMessages,
    handler((input) => {
      const record = asRecord(input);
      if (
        typeof record.documentId !== "string" ||
        typeof record.conversationId !== "string" ||
        (record.cursor !== undefined && typeof record.cursor !== "string")
      ) {
        throw new Error("AI IPC input is invalid.");
      }
      return options.client.listConversationMessages(
        record.documentId,
        record.conversationId,
        typeof record.cursor === "string" ? record.cursor : undefined,
      );
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.executeConversationTurn,
    handler(async (input) => {
      const record = asRecord(input);
      if (typeof record.documentId !== "string" || !record.request) {
        throw new Error("AI IPC input is invalid.");
      }
      const request = asRecord(record.request);
      const attachmentIds = request.attachmentIds;
      if (
        attachmentIds !== undefined &&
        (!Array.isArray(attachmentIds) || attachmentIds.some((id) => typeof id !== "string"))
      ) {
        throw new Error("AI IPC input is invalid.");
      }
      const { attachmentIds: _attachmentIds, ...safeRequest } = request;
      const ids = (attachmentIds ?? []) as string[];
      const preparedAttachments = options.attachmentStore.resolve(ids);
      if (ids.length !== preparedAttachments.length) {
        throw new Error("AI attachment reference is invalid or expired.");
      }
      const result = await options.client.executeConversationTurn(record.documentId, {
        ...safeRequest,
        ...(preparedAttachments.length ? { preparedAttachments } : {}),
      });
      options.attachmentStore.consume(ids);
      return result;
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.renameConversation,
    handler((input) => {
      const record = asRecord(input);
      if (
        typeof record.documentId !== "string" ||
        typeof record.conversationId !== "string" ||
        typeof record.title !== "string"
      ) {
        throw new Error("AI IPC input is invalid.");
      }
      return options.client.renameConversation(
        record.documentId,
        record.conversationId,
        record.title,
      );
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.deleteConversation,
    handler(async (input) => {
      const record = asRecord(input);
      if (typeof record.documentId !== "string" || typeof record.conversationId !== "string") {
        throw new Error("AI IPC input is invalid.");
      }
      const rawDeleted = await options.client.deleteConversation(
        record.documentId,
        record.conversationId,
      );
      const deleted = asRecord(rawDeleted);
      if (typeof deleted.id !== "string") throw new Error("AI API response is invalid.");
      const storageKeys = Array.isArray(deleted.orphanedStorageKeys)
        ? deleted.orphanedStorageKeys.filter((value): value is string => typeof value === "string")
        : [];
      await options.attachmentStore.removeStorageKeys(storageKeys);
      return { id: deleted.id };
    }),
  );
  options.ipcMain.handle(
    AI_IPC_CHANNELS.cancel,
    handler((rawRequestId) => {
      if (typeof rawRequestId !== "string") throw new Error("AI IPC input is invalid.");
      return options.client.cancel(rawRequestId);
    }),
  );
}

export type { AISecretStatus };
