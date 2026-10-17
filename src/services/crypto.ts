/**
 * End-to-End Encryption Service (E2EE) using Web Crypto API.
 * Uses PBKDF2 for key derivation (100,000 iterations, SHA-256)
 * and AES-GCM (256-bit) for zero-knowledge client-side encryption.
 */

const SALT_STORAGE_KEY = 'khoros_e2ee_salt';
const PASS_CHECK_STORAGE_KEY = 'khoros_e2ee_verifier';

export class CryptoService {
  private static cachedKey: CryptoKey | null = null;

  private static getOrCreateSalt(): Uint8Array {
    const existing = localStorage.getItem(SALT_STORAGE_KEY);
    if (existing) {
      const binary = atob(existing);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    let binary = '';
    for (let i = 0; i < salt.length; i++) {
      binary += String.fromCharCode(salt[i]);
    }
    localStorage.setItem(SALT_STORAGE_KEY, btoa(binary));
    return salt;
  }

  public static async deriveKeyFromPassphrase(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const salt = this.getOrCreateSalt();
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    this.cachedKey = derivedKey;
    return derivedKey;
  }

  public static async setupVault(passphrase: string): Promise<boolean> {
    try {
      const key = await this.deriveKeyFromPassphrase(passphrase);
      // Store an encrypted known verifier string to check passphrase validity on unlock
      const verifierPayload = await this.encryptText('KHOROS_VAULT_VERIFIED', key);
      localStorage.setItem(PASS_CHECK_STORAGE_KEY, JSON.stringify(verifierPayload));
      return true;
    } catch (e) {
      console.error('Error initializing vault:', e);
      return false;
    }
  }

  public static async unlockVault(passphrase: string): Promise<boolean> {
    try {
      const storedVerifier = localStorage.getItem(PASS_CHECK_STORAGE_KEY);
      if (!storedVerifier) {
        // Vault not setup yet; setting it up now with this passphrase
        return await this.setupVault(passphrase);
      }
      const key = await this.deriveKeyFromPassphrase(passphrase);
      const parsed = JSON.parse(storedVerifier);
      const decrypted = await this.decryptText(parsed.ciphertext, parsed.iv, key);
      if (decrypted === 'KHOROS_VAULT_VERIFIED') {
        this.cachedKey = key;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public static lockVault() {
    this.cachedKey = null;
  }

  public static isVaultUnlocked(): boolean {
    return this.cachedKey !== null;
  }

  public static isVaultConfigured(): boolean {
    return localStorage.getItem(PASS_CHECK_STORAGE_KEY) !== null;
  }

  public static async encryptText(
    plainText: string,
    overrideKey?: CryptoKey
  ): Promise<{ ciphertext: string; iv: string }> {
    const key = overrideKey || this.cachedKey;
    if (!key) {
      throw new Error('La bóveda está bloqueada. Ingrese su clave para cifrar.');
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plainText);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
    const ivStr = btoa(String.fromCharCode(...iv));

    return { ciphertext, iv: ivStr };
  }

  public static async decryptText(
    ciphertext: string,
    ivStr: string,
    overrideKey?: CryptoKey
  ): Promise<string> {
    const key = overrideKey || this.cachedKey;
    if (!key) {
      throw new Error('La bóveda está bloqueada. Ingrese su clave para descifrar.');
    }

    const ivBinary = atob(ivStr);
    const iv = new Uint8Array(ivBinary.length);
    for (let i = 0; i < ivBinary.length; i++) {
      iv[i] = ivBinary.charCodeAt(i);
    }

    const cipherBinary = atob(ciphertext);
    const cipherBytes = new Uint8Array(cipherBinary.length);
    for (let i = 0; i < cipherBinary.length; i++) {
      cipherBytes[i] = cipherBinary.charCodeAt(i);
    }

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
}
