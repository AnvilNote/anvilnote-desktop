import { randomUUID } from "node:crypto";

export interface AIKeyProfile {
  id: string;
  providerId: "openai";
  label: string;
  display: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AISecretStatus {
  configured: boolean;
  lastFour?: string;
  updatedAt?: string;
  activeProfile?: AIKeyProfile;
  storage: "os-secure-storage" | "session-only" | "unavailable";
}

export interface AISecretStore {
  getStatus(providerId: string): Promise<AISecretStatus>;
  listProfiles(providerId: string): Promise<AIKeyProfile[]>;
  save(providerId: string, secret: string): Promise<AISecretStatus>;
  saveProfile(
    providerId: string,
    input: { label: string; secret: string; isActive: boolean },
  ): Promise<AIKeyProfile>;
  renameProfile(profileId: string, label: string): Promise<AIKeyProfile>;
  activateProfile(profileId: string): Promise<AIKeyProfile>;
  deactivateProfile(profileId: string): Promise<AIKeyProfile>;
  deleteProfile(profileId: string): Promise<{ id: string }>;
  getForTrustedExecution(providerId: string): Promise<string | null>;
  remove(providerId: string): Promise<void>;
}

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
  getSelectedStorageBackend?(): string;
}

type FetchLike = typeof fetch;

export interface AISecretStoreOptions {
  platform: NodeJS.Platform;
  safeStorage: SafeStorageLike;
  getApiBaseUrl: () => string;
  trustToken: string;
  fetch?: FetchLike;
}

interface ActiveEncryptedSecret {
  id: string;
  providerId: "openai";
  encryptedSecret: string;
}

interface SessionProfile {
  profile: AIKeyProfile;
  secret: string;
}

function assertProvider(providerId: string): asserts providerId is "openai" {
  if (providerId !== "openai") throw new Error("AI provider is not supported.");
}

function prefixAndLastFour(secret: string): {
  safeDisplayPrefix: "sk-" | "sk-proj-";
  lastFour: string;
} {
  const safeDisplayPrefix = secret.startsWith("sk-proj-")
    ? "sk-proj-"
    : secret.startsWith("sk-")
      ? "sk-"
      : null;
  const lastFour = Array.from(secret).slice(-4).join("");
  if (!safeDisplayPrefix || !/^[A-Za-z0-9_-]{4}$/u.test(lastFour)) {
    throw new Error("AI credential is invalid.");
  }
  return { safeDisplayPrefix, lastFour };
}

function validateProfile(value: unknown): AIKeyProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    record.providerId !== "openai" ||
    typeof record.label !== "string" ||
    typeof record.display !== "string" ||
    typeof record.isActive !== "boolean" ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string"
  ) {
    return null;
  }
  return record as unknown as AIKeyProfile;
}

function validateActiveEncryptedSecret(value: unknown): ActiveEncryptedSecret | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    record.providerId !== "openai" ||
    typeof record.encryptedSecret !== "string" ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(record.encryptedSecret)
  ) {
    return null;
  }
  return record as unknown as ActiveEncryptedSecret;
}

export class AISecretStoreImpl implements AISecretStore {
  private readonly sessionProfiles = new Map<string, SessionProfile>();
  private readonly fetch: FetchLike;

  constructor(private readonly options: AISecretStoreOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  private storageMode(): AISecretStatus["storage"] {
    if (
      this.options.platform === "linux" &&
      this.options.safeStorage.getSelectedStorageBackend?.() === "basic_text"
    ) {
      return "session-only";
    }
    try {
      return this.options.safeStorage.isEncryptionAvailable()
        ? "os-secure-storage"
        : "unavailable";
    } catch {
      return "unavailable";
    }
  }

  private async request<T>(
    pathname: string,
    options: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown },
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.fetch(new URL(pathname, this.options.getApiBaseUrl()), {
        method: options.method,
        headers: {
          "x-anvilnote-desktop-token": this.options.trustToken,
          ...(options.body ? { "content-type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch {
      throw new Error("AI key profile storage is unavailable.");
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object" || !("data" in payload)) {
      throw new Error("AI key profile storage is unavailable.");
    }
    return (payload as { data: T }).data;
  }

  private async activeEncryptedSecret(providerId: "openai"): Promise<ActiveEncryptedSecret | null> {
    try {
      const value = await this.request<unknown>(
        `/api/ai/key-profiles/active/${providerId}/secret`,
        { method: "GET" },
      );
      return validateActiveEncryptedSecret(value);
    } catch {
      return null;
    }
  }

  private decrypt(stored: ActiveEncryptedSecret): string | null {
    try {
      const secret = this.options.safeStorage.decryptString(
        Buffer.from(stored.encryptedSecret, "base64"),
      );
      return secret.trim() || null;
    } catch {
      return null;
    }
  }

  async listProfiles(providerId: string): Promise<AIKeyProfile[]> {
    assertProvider(providerId);
    if (this.storageMode() === "session-only") {
      const session = this.sessionProfiles.get(providerId);
      return session ? [session.profile] : [];
    }
    if (this.storageMode() === "unavailable") return [];
    const value = await this.request<unknown>(
      `/api/ai/key-profiles?providerId=${providerId}`,
      { method: "GET" },
    );
    if (!Array.isArray(value)) throw new Error("AI key profile storage is unavailable.");
    const profiles = value.map(validateProfile);
    if (profiles.some((profile) => !profile)) {
      throw new Error("AI key profile storage is unavailable.");
    }
    return profiles as AIKeyProfile[];
  }

  async getStatus(providerId: string): Promise<AISecretStatus> {
    assertProvider(providerId);
    const storage = this.storageMode();
    if (storage === "session-only") {
      const session = this.sessionProfiles.get(providerId);
      return session
        ? {
            configured: true,
            lastFour: session.profile.display.slice(-4),
            updatedAt: session.profile.updatedAt,
            activeProfile: session.profile,
            storage,
          }
        : { configured: false, storage };
    }
    if (storage === "unavailable") return { configured: false, storage };
    const profiles = await this.listProfiles(providerId);
    const active = profiles.find((profile) => profile.isActive);
    if (!active) return { configured: false, storage };
    const encrypted = await this.activeEncryptedSecret(providerId);
    if (!encrypted || !this.decrypt(encrypted)) return { configured: false, storage };
    return {
      configured: true,
      lastFour: active.display.slice(-4),
      updatedAt: active.updatedAt,
      activeProfile: active,
      storage,
    };
  }

  async save(providerId: string, secret: string): Promise<AISecretStatus> {
    await this.saveProfile(providerId, {
      label: "OpenAI key",
      secret,
      isActive: true,
    });
    return this.getStatus(providerId);
  }

  async saveProfile(
    providerId: string,
    input: { label: string; secret: string; isActive: boolean },
  ): Promise<AIKeyProfile> {
    assertProvider(providerId);
    const secret = input.secret.trim();
    if (!secret || secret.length > 4096 || !input.label.trim() || input.label.length > 120) {
      throw new Error("AI credential is invalid.");
    }
    const metadata = prefixAndLastFour(secret);
    const storage = this.storageMode();
    const updatedAt = new Date().toISOString();
    if (storage === "session-only") {
      const profile: AIKeyProfile = {
        id: `session:${randomUUID()}`,
        providerId,
        label: input.label.trim(),
        display: `OpenAI · ${metadata.safeDisplayPrefix}****${metadata.lastFour}`,
        isActive: input.isActive,
        createdAt: updatedAt,
        updatedAt,
      };
      this.sessionProfiles.set(providerId, { profile, secret });
      return profile;
    }
    if (storage === "unavailable") {
      throw new Error("Secure credential storage is unavailable.");
    }
    let encryptedSecret: string;
    try {
      encryptedSecret = this.options.safeStorage.encryptString(secret).toString("base64");
    } catch {
      throw new Error("Secure credential storage is unavailable.");
    }
    const profile = await this.request<unknown>("/api/ai/key-profiles", {
      method: "POST",
      body: {
        providerId,
        label: input.label.trim(),
        encryptedSecret,
        safeDisplayPrefix: metadata.safeDisplayPrefix,
        lastFour: metadata.lastFour,
        isActive: input.isActive,
      },
    });
    const validated = validateProfile(profile);
    if (!validated) throw new Error("AI key profile storage is unavailable.");
    return validated;
  }

  async renameProfile(profileId: string, label: string): Promise<AIKeyProfile> {
    if (!profileId || !label.trim() || label.length > 120) {
      throw new Error("AI key profile is invalid.");
    }
    const profile = await this.request<unknown>(`/api/ai/key-profiles/${encodeURIComponent(profileId)}`, {
      method: "PATCH",
      body: { label: label.trim() },
    });
    const validated = validateProfile(profile);
    if (!validated) throw new Error("AI key profile storage is unavailable.");
    return validated;
  }

  async activateProfile(profileId: string): Promise<AIKeyProfile> {
    const profile = await this.request<unknown>(
      `/api/ai/key-profiles/${encodeURIComponent(profileId)}/activate`,
      { method: "POST" },
    );
    const validated = validateProfile(profile);
    if (!validated) throw new Error("AI key profile storage is unavailable.");
    return validated;
  }

  async deactivateProfile(profileId: string): Promise<AIKeyProfile> {
    const profile = await this.request<unknown>(
      `/api/ai/key-profiles/${encodeURIComponent(profileId)}/deactivate`,
      { method: "POST" },
    );
    const validated = validateProfile(profile);
    if (!validated) throw new Error("AI key profile storage is unavailable.");
    return validated;
  }

  async deleteProfile(profileId: string): Promise<{ id: string }> {
    const result = await this.request<unknown>(
      `/api/ai/key-profiles/${encodeURIComponent(profileId)}`,
      { method: "DELETE" },
    );
    if (!result || typeof result !== "object" || typeof (result as { id?: unknown }).id !== "string") {
      throw new Error("AI key profile storage is unavailable.");
    }
    return { id: (result as { id: string }).id };
  }

  async getForTrustedExecution(providerId: string): Promise<string | null> {
    assertProvider(providerId);
    const storage = this.storageMode();
    if (storage === "session-only") return this.sessionProfiles.get(providerId)?.secret ?? null;
    if (storage === "unavailable") return null;
    const encrypted = await this.activeEncryptedSecret(providerId);
    return encrypted ? this.decrypt(encrypted) : null;
  }

  async remove(providerId: string): Promise<void> {
    assertProvider(providerId);
    if (this.storageMode() === "session-only") {
      this.sessionProfiles.delete(providerId);
      return;
    }
    if (this.storageMode() === "unavailable") return;
    const active = (await this.listProfiles(providerId)).find((profile) => profile.isActive);
    if (active) await this.deleteProfile(active.id);
  }
}
