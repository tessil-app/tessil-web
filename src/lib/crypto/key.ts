export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64Url(exported);
}

export async function importKey(base64Url: string): Promise<CryptoKey> {
  const keyData = base64UrlToArrayBuffer(base64Url);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// PBKDF2 + AES-KW. Wrapped fragment format: "w.{salt}.{wrappedKey}".
const PBKDF2_ITERATIONS = 300_000;

async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

export async function wrapKey(key: CryptoKey, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await deriveWrappingKey(password, salt);
  const wrappedKeyBuffer = await crypto.subtle.wrapKey('raw', key, wrappingKey, 'AES-KW');
  const saltB64 = arrayBufferToBase64Url(salt.buffer as ArrayBuffer);
  const wrappedB64 = arrayBufferToBase64Url(wrappedKeyBuffer);
  return `w.${saltB64}.${wrappedB64}`;
}

export async function unwrapKey(fragment: string, password: string): Promise<CryptoKey> {
  const parts = fragment.split('.');
  if (parts.length !== 3 || parts[0] !== 'w') {
    throw new Error('Invalid wrapped key format');
  }
  const salt = new Uint8Array(base64UrlToArrayBuffer(parts[1]));
  const wrappedKeyBuffer = base64UrlToArrayBuffer(parts[2]);
  const wrappingKey = await deriveWrappingKey(password, salt);
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBuffer,
    wrappingKey,
    'AES-KW',
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export function isWrappedKey(fragment: string): boolean {
  return fragment.startsWith('w.');
}

export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
}

export function ivToBase64(iv: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < iv.length; i++) {
    binary += String.fromCharCode(iv[i]);
  }
  return btoa(binary);
}

export function base64ToIv(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
