import { generateIv, ivToBase64 } from './key';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export interface EncryptResult {
  encryptedBlob: Blob;
  iv: string; // base64 encoded IV used for the file
}

export interface EncryptedString {
  ciphertext: string; // base64 AES-GCM output (no url-safe; no padding stripped)
  iv: string; // base64 12-byte IV (no padding)
}

export interface EncryptedFilename {
  encryptedName: string;
  iv: string;
}

const STRING_PAD_MULTIPLE = 32;

/** Pads to a 32-byte boundary to hide length metadata. */
export async function encryptString(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedString> {
  const iv = generateIv();
  const encoder = new TextEncoder();
  const raw = encoder.encode(plaintext);

  const paddedLength = Math.ceil(Math.max(raw.length, 1) / STRING_PAD_MULTIPLE) * STRING_PAD_MULTIPLE;
  const data = new Uint8Array(paddedLength);
  data.set(raw);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    data
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: ivToBase64(iv)
  };
}

export async function encryptFilename(
  filename: string,
  key: CryptoKey
): Promise<EncryptedFilename> {
  const { ciphertext, iv } = await encryptString(filename, key);
  return { encryptedName: ciphertext, iv };
}

export async function encryptFile(
  file: File,
  key: CryptoKey,
  onProgress?: (progress: number) => void
): Promise<EncryptResult> {
  const iv = generateIv();
  const chunks: Uint8Array[] = [];
  const totalSize = file.size;
  let processedSize = 0;

  const reader = file.stream().getReader();
  let buffer = new Uint8Array(0);

  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;
    }

    while (buffer.length >= CHUNK_SIZE || (done && buffer.length > 0)) {
      const chunkSize = Math.min(CHUNK_SIZE, buffer.length);
      const chunk = buffer.slice(0, chunkSize);
      buffer = buffer.slice(chunkSize);

      chunks.push(chunk);
      processedSize += chunkSize;

      if (onProgress) {
        onProgress((processedSize / totalSize) * 50); // 0-50%: read
      }
    }

    if (done) break;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const plaintext = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    plaintext.set(chunk, offset);
    offset += chunk.length;
  }

  if (onProgress) {
    onProgress(50);
  }

  // AES-GCM auths the file as a single unit.
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext.buffer as ArrayBuffer
  );

  if (onProgress) {
    onProgress(100);
  }

  return {
    encryptedBlob: new Blob([encrypted], { type: 'application/octet-stream' }),
    iv: ivToBase64(iv)
  };
}
