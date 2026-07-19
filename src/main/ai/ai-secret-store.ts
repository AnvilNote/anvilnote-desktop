import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export interface AISecretStatus {
  configured: boolean;
  lastFour?: string;
  updatedAt?: string;
  storage: "os-secure-storage" | "session-only" | "unavailable";
}

export interface AISecretStore {
  getStatus(providerId: string): Promise<AISecretStatus>;
  save(providerId: string, secret: string): Promise<AISecretStatus>;
  getForTrustedExecution(providerId: string): Promise<string | null>;
  remove(providerId: string): Promise<void>;
}

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
  getSelectedStorageBackend?(): string;
}

export interface AISecretStoreOptions {
  storageDir: string;
  platform: NodeJS.Platform;
  safeStorage: SafeStorageLike;
}

type StoredSecret = {
  version: 1;
  providerId: "openai";
  encrypted: string;
  lastFour: string;
  updatedAt: string;
};

function assertProvider(providerId: string): asserts providerId is "openai" {
  if (providerId !== "openai") throw new Error("AI provider is not supported.");
}

function isStoredSecret(value: unknown): value is StoredSecret {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    record.providerId === "openai" &&
    typeof record.encrypted === "string" &&
    record.encrypted.length > 0 &&
    typeof record.lastFour === "string" &&
    record.lastFour.length <= 4 &&
    typeof record.updatedAt === "string" &&
    Number.isFinite(Date.parse(record.updatedAt))
  );
}

export class AISecretStoreImpl implements AISecretStore {
  private readonly sessionSecrets = new Map<string, { secret: string; updatedAt: string }>();
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly options: AISecretStoreOptions) {}

  private credentialDirectory(): string {
    return path.join(this.options.storageDir, "ai-credentials");
  }

  private credentialFile(providerId: "openai"): string {
    return path.join(this.credentialDirectory(), `${providerId}.json`);
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

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release: () => void = () => undefined;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async readStored(providerId: "openai"): Promise<StoredSecret | null> {
    try {
      const raw = await fs.readFile(this.credentialFile(providerId), "utf8");
      const parsed: unknown = JSON.parse(raw);
      return isStoredSecret(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private decrypt(stored: StoredSecret): string | null {
    try {
      const secret = this.options.safeStorage.decryptString(
        Buffer.from(stored.encrypted, "base64"),
      );
      return secret.trim() || null;
    } catch {
      return null;
    }
  }

  async getStatus(providerId: string): Promise<AISecretStatus> {
    assertProvider(providerId);
    const storage = this.storageMode();
    if (storage === "session-only") {
      const session = this.sessionSecrets.get(providerId);
      return session
        ? {
            configured: true,
            lastFour: session.secret.slice(-4),
            updatedAt: session.updatedAt,
            storage,
          }
        : { configured: false, storage };
    }
    if (storage === "unavailable") return { configured: false, storage };
    const stored = await this.readStored(providerId);
    if (!stored || !this.decrypt(stored)) return { configured: false, storage };
    return {
      configured: true,
      lastFour: stored.lastFour,
      updatedAt: stored.updatedAt,
      storage,
    };
  }

  async save(providerId: string, secretInput: string): Promise<AISecretStatus> {
    assertProvider(providerId);
    const secret = secretInput.trim();
    if (!secret || secret.length > 4096) throw new Error("AI credential is invalid.");
    const storage = this.storageMode();
    const updatedAt = new Date().toISOString();
    if (storage === "session-only") {
      this.sessionSecrets.set(providerId, { secret, updatedAt });
      return {
        configured: true,
        lastFour: secret.slice(-4),
        updatedAt,
        storage,
      };
    }
    if (storage === "unavailable") {
      throw new Error("Secure credential storage is unavailable.");
    }
    return this.exclusive(async () => {
      const directory = this.credentialDirectory();
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const encrypted = this.options.safeStorage.encryptString(secret).toString("base64");
      const stored: StoredSecret = {
        version: 1,
        providerId,
        encrypted,
        lastFour: secret.slice(-4),
        updatedAt,
      };
      const temporary = path.join(directory, `.${providerId}.${randomUUID()}.tmp`);
      try {
        await fs.writeFile(temporary, JSON.stringify(stored), {
          encoding: "utf8",
          mode: 0o600,
          flag: "wx",
        });
        await fs.rename(temporary, this.credentialFile(providerId));
        await fs.chmod(this.credentialFile(providerId), 0o600);
      } catch {
        await fs.rm(temporary, { force: true }).catch(() => undefined);
        throw new Error("Secure credential storage could not be updated.");
      }
      return {
        configured: true,
        lastFour: stored.lastFour,
        updatedAt,
        storage,
      };
    });
  }

  async getForTrustedExecution(providerId: string): Promise<string | null> {
    assertProvider(providerId);
    const storage = this.storageMode();
    if (storage === "session-only") return this.sessionSecrets.get(providerId)?.secret ?? null;
    if (storage === "unavailable") return null;
    const stored = await this.readStored(providerId);
    return stored ? this.decrypt(stored) : null;
  }

  async remove(providerId: string): Promise<void> {
    assertProvider(providerId);
    this.sessionSecrets.delete(providerId);
    await this.exclusive(async () => {
      await fs.rm(this.credentialFile(providerId), { force: true });
    });
  }
}
