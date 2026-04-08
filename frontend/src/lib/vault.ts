/**
 * CV Vault — Client-side AES-256-GCM encryption using Web Crypto API.
 *
 * What the server stores when vault is active:
 *   - AES-GCM ciphertext (base64) in the extracted_text column
 *   - is_cv_encrypted = true
 *
 * What the server CANNOT read:
 *   - The plaintext CV content (key never leaves the browser)
 *
 * What the server DOES see (unavoidable — LLM needs it):
 *   - Plaintext during the evaluation request only
 *
 * Key derivation: PBKDF2-SHA256, 300,000 iterations, 32-byte key
 * Salt: deterministic from userId so the same password always yields the same key
 */

const VAULT_KEY_SESSION = "cvhell_vault_key";
const PBKDF2_ITERATIONS = 300_000;

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/** Derive AES-GCM key from password + userId salt via PBKDF2. */
export async function deriveKey(password: string, userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = enc.encode(`cvhell-vault-${userId}`);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,  // extractable=true so we can store it in sessionStorage
    ["encrypt", "decrypt"],
  );
}

/** Encrypt plaintext → base64 ciphertext (IV prepended). */
export async function encryptText(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  // Prepend IV to ciphertext so we can decrypt later
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return bufferToBase64(combined.buffer);
}

/** Decrypt base64 ciphertext → plaintext. Throws if key is wrong. */
export async function decryptText(ciphertextB64: string, key: CryptoKey): Promise<string> {
  const combined = new Uint8Array(base64ToBuffer(ciphertextB64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plainBuf);
}

// ---------- Session helpers ----------

/** Store derived key in sessionStorage (base64 encoded raw key bytes) — cleared on tab close. */
export async function saveKeyToSession(key: CryptoKey): Promise<void> {
  const raw = await crypto.subtle.exportKey("raw", key);
  sessionStorage.setItem(VAULT_KEY_SESSION, bufferToBase64(raw));
}

/** Restore key from sessionStorage. Returns null if not found. */
export async function loadKeyFromSession(): Promise<CryptoKey | null> {
  const raw = sessionStorage.getItem(VAULT_KEY_SESSION);
  if (!raw) return null;
  try {
    return await crypto.subtle.importKey(
      "raw",
      base64ToBuffer(raw),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    return null;
  }
}

export function clearKeyFromSession(): void {
  sessionStorage.removeItem(VAULT_KEY_SESSION);
}

export function isVaultUnlocked(): boolean {
  return !!sessionStorage.getItem(VAULT_KEY_SESSION);
}
