import crypto from "crypto";

const SECRET_SOURCE =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "keyzor-dev-secret-key-change-in-production-32bytes";

function getAesKey(): Buffer {
  return crypto.createHash("sha256").update(SECRET_SOURCE).digest();
}

export interface EncryptedSharePayload {
  projectId: string;
  shareVersion: string;
  iat: number;
}

/**
 * Encrypts a project share payload using AES-256-GCM so stakeholder/presentation
 * views are only accessible via an authenticated, encrypted share token.
 */
export function createEncryptedShareToken(
  projectId: string,
  shareVersion: string
): string {
  const key = getAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const payload: EncryptedSharePayload = {
    projectId,
    shareVersion,
    iat: Date.now(),
  };

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const ivB64 = iv.toString("base64url");
  const tagB64 = authTag.toString("base64url");
  const dataB64 = encrypted.toString("base64url");

  return `kzs_${ivB64}.${tagB64}.${dataB64}`;
}

/**
 * Decrypts and verifies an AES-256-GCM encrypted stakeholder share token.
 */
export function verifyEncryptedShareToken(
  token: string
): EncryptedSharePayload | null {
  try {
    const cleaned = decodeURIComponent(token.trim());
    if (!cleaned.startsWith("kzs_")) return null;
    const parts = cleaned.slice(4).split(".");
    if (parts.length !== 3) return null;

    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, "base64url");
    const authTag = Buffer.from(tagB64, "base64url");
    const encrypted = Buffer.from(dataB64, "base64url");

    if (iv.length !== 12 || authTag.length !== 16) return null;

    const key = getAesKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const parsed = JSON.parse(
      decrypted.toString("utf8")
    ) as EncryptedSharePayload;

    if (!parsed.projectId || !parsed.shareVersion) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
}

export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const randomPart = crypto.randomBytes(18).toString("base64url");
  const rawKey = `kz_live_${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = `${rawKey.slice(0, 12)}...${rawKey.slice(-4)}`;
  return { rawKey, keyHash, keyPrefix };
}
