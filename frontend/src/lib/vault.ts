/**
 * CV Vault — AES-256 encryption using crypto-js (pure JS, works over HTTP).
 *
 * Key derivation: PBKDF2-SHA256, 100,000 iterations
 * Encryption: AES-CBC with random IV prepended to ciphertext
 * Salt: deterministic from userId — same password always yields same key
 *
 * What the server stores when vault is active:
 *   - AES ciphertext (base64) in extracted_text column
 *   - is_cv_encrypted = true
 *
 * What the server CANNOT read: plaintext CV content (key never leaves browser)
 * What the server DOES see (unavoidable): plaintext during LLM evaluation only
 */

import CryptoJS from "crypto-js";

const VAULT_KEY_SESSION = "cvhell_vault_key";
const VAULT_VERIFIER_KEY = "cvhell_vault_verifier"; // localStorage — persists across tabs
const PBKDF2_ITERATIONS = 100_000;
const KEY_SIZE = 256 / 32; // 256-bit key = 8 words
const VERIFY_PLAINTEXT = "cvhell-vault-ok"; // known string we encrypt to verify key

export type VaultKey = string; // hex string

/** Derive AES key from password + userId salt via PBKDF2. Returns hex string. */
export function deriveKey(password: string, userId: string): Promise<VaultKey> {
  return new Promise((resolve) => {
    const salt = CryptoJS.enc.Utf8.parse(`cvhell-vault-${userId}`);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: KEY_SIZE,
      iterations: PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256,
    });
    resolve(key.toString(CryptoJS.enc.Hex));
  });
}

/** Encrypt plaintext → base64 ciphertext (IV prepended). */
export function encryptText(plaintext: string, keyHex: VaultKey): Promise<string> {
  return new Promise((resolve) => {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    // Prepend IV (hex) to ciphertext so we can decrypt later
    const combined = iv.toString(CryptoJS.enc.Hex) + ":" + encrypted.toString();
    resolve(btoa(combined));
  });
}

/** Decrypt base64 ciphertext → plaintext. Throws if key is wrong. */
export function decryptText(ciphertextB64: string, keyHex: VaultKey): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const combined = atob(ciphertextB64);
      const [ivHex, ciphertext] = combined.split(":");
      if (!ivHex || !ciphertext) throw new Error("Invalid ciphertext format");
      const key = CryptoJS.enc.Hex.parse(keyHex);
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      if (!plaintext) throw new Error("Decryption failed — wrong key?");
      resolve(plaintext);
    } catch (e) {
      reject(e);
    }
  });
}

// ---------- Session helpers ----------

/**
 * Save key to sessionStorage AND store an encrypted verifier in localStorage.
 * The verifier lets us confirm the correct password on re-unlock.
 */
export async function saveKeyToSession(key: VaultKey): Promise<void> {
  sessionStorage.setItem(VAULT_KEY_SESSION, key);
  // Always overwrite verifier so it stays in sync with the current login password
  const verifier = await encryptText(VERIFY_PLAINTEXT, key);
  localStorage.setItem(VAULT_VERIFIER_KEY, verifier);
}

/**
 * Verify a key against the stored verifier.
 * Returns true if the key is correct, false if wrong password.
 */
export async function verifyKey(key: VaultKey): Promise<boolean> {
  const verifier = localStorage.getItem(VAULT_VERIFIER_KEY);
  if (!verifier) {
    // No verifier yet — first time setup: write verifier so future unlocks can be validated
    const newVerifier = await encryptText(VERIFY_PLAINTEXT, key);
    localStorage.setItem(VAULT_VERIFIER_KEY, newVerifier);
    return true;
  }
  try {
    const decrypted = await decryptText(verifier, key);
    return decrypted === VERIFY_PLAINTEXT;
  } catch {
    return false;
  }
}

/** Restore key from sessionStorage. Returns null if not found. */
export function loadKeyFromSession(): Promise<VaultKey | null> {
  const key = sessionStorage.getItem(VAULT_KEY_SESSION);
  return Promise.resolve(key || null);
}

export function clearKeyFromSession(): void {
  sessionStorage.removeItem(VAULT_KEY_SESSION);
}

export function isVaultUnlocked(): boolean {
  return !!sessionStorage.getItem(VAULT_KEY_SESSION);
}
