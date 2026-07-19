import {
  createCipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10_485_760;
const MAX_TOTAL_BYTES = 26_214_400;
const MAGIC = Buffer.from("ANVAI001", "ascii");
const EXTENSIONS = new Set(["txt", "md", "markdown", "pdf", "docx"]);

interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

export interface AIAttachmentInput {
  name: string;
  mimeType: string;
  data: Uint8Array | ArrayBuffer;
}

export interface SafeAIAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  persisted: boolean;
}

export interface PreparedAIAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
}

export class AIAttachmentStore {
  private readonly prepared = new Map<string, PreparedAIAttachment>();
  private keyPromise: Promise<Buffer> | null = null;

  constructor(private readonly options: { rootDir: string; safeStorage: SafeStorageLike }) {}

  async prepare(inputs: AIAttachmentInput[]): Promise<SafeAIAttachment[]> {
    if (inputs.length === 0 || inputs.length > MAX_FILES) {
      throw new Error("AI attachment count is invalid.");
    }
    const normalized = inputs.map((input) => {
      const data = Buffer.from(input.data instanceof ArrayBuffer ? new Uint8Array(input.data) : input.data);
      const extension = input.name.split(".").pop()?.toLowerCase() ?? "";
      if (!EXTENSIONS.has(extension) || !input.name.trim() || input.name.length > 255) {
        throw new Error("AI attachment type is unsupported.");
      }
      if (data.byteLength > MAX_FILE_BYTES) throw new Error("AI attachment is too large.");
      return { ...input, name: path.basename(input.name), data };
    });
    if (normalized.reduce((sum, input) => sum + input.data.byteLength, 0) > MAX_TOTAL_BYTES) {
      throw new Error("AI attachments are too large.");
    }

    if (!this.options.safeStorage.isEncryptionAvailable()) {
      return normalized.map((input) => ({
        id: randomUUID(),
        originalName: input.name,
        mimeType: input.mimeType || "application/octet-stream",
        sizeBytes: input.data.byteLength,
        persisted: false,
      }));
    }

    const key = await this.key();
    return Promise.all(normalized.map(async (input) => {
      const id = randomUUID();
      const sha256 = createHash("sha256").update(input.data).digest("hex");
      const directory = path.join(this.options.rootDir, "blobs", sha256.slice(0, 2));
      const target = path.join(directory, `${sha256}.blob`);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      try {
        await readFile(target);
      } catch {
        const nonce = randomBytes(12);
        const cipher = createCipheriv("aes-256-gcm", key, nonce);
        const ciphertext = Buffer.concat([cipher.update(input.data), cipher.final()]);
        const envelope = Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), ciphertext]);
        await this.atomicWrite(target, envelope);
      }
      const prepared: PreparedAIAttachment = {
        id,
        originalName: input.name,
        mimeType: input.mimeType || "application/octet-stream",
        sizeBytes: input.data.byteLength,
        sha256,
        storageKey: sha256,
      };
      this.prepared.set(id, prepared);
      return {
        id,
        originalName: prepared.originalName,
        mimeType: prepared.mimeType,
        sizeBytes: prepared.sizeBytes,
        persisted: true,
      };
    }));
  }

  resolve(ids: string[]): PreparedAIAttachment[] {
    return ids.map((id) => this.prepared.get(id)).filter((value): value is PreparedAIAttachment => Boolean(value));
  }

  consume(ids: string[]): void {
    ids.forEach((id) => this.prepared.delete(id));
  }

  async removeStorageKeys(storageKeys: string[]): Promise<void> {
    await Promise.all(storageKeys.map(async (storageKey) => {
      if (!/^[a-f0-9]{64}$/u.test(storageKey)) return;
      const target = path.join(
        this.options.rootDir,
        "blobs",
        storageKey.slice(0, 2),
        `${storageKey}.blob`,
      );
      try {
        await unlink(target);
      } catch (error) {
        if (!error || typeof error !== "object" || (error as { code?: unknown }).code !== "ENOENT") {
          throw error;
        }
      }
    }));
  }

  private key(): Promise<Buffer> {
    this.keyPromise ??= this.loadOrCreateKey();
    return this.keyPromise;
  }

  private async loadOrCreateKey(): Promise<Buffer> {
    const keyPath = path.join(this.options.rootDir, "attachment-key.enc");
    await mkdir(this.options.rootDir, { recursive: true, mode: 0o700 });
    try {
      const encrypted = await readFile(keyPath);
      const decoded = Buffer.from(this.options.safeStorage.decryptString(encrypted), "base64");
      if (decoded.byteLength !== 32) throw new Error("AI attachment key is invalid.");
      return decoded;
    } catch (error) {
      if (error instanceof Error && error.message === "AI attachment key is invalid.") throw error;
      const key = randomBytes(32);
      await this.atomicWrite(
        keyPath,
        this.options.safeStorage.encryptString(key.toString("base64")),
      );
      return key;
    }
  }

  private async atomicWrite(target: string, data: Uint8Array): Promise<void> {
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, data, { mode: 0o600, flag: "wx" });
    await rename(temporary, target);
  }
}
