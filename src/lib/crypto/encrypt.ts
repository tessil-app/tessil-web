import { generateIv, ivToBase64 } from './key';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export interface EncryptResult {
  encryptedBlob: Blob;
  iv: string; // base64 encoded IV used for the file
}

export interface EncryptedFilename {
  encryptedName: string;
  iv: string;
}

const FILENAME_PAD_MULTIPLE = 32;

export async function encryptFilename(
  filename: string,
  key: CryptoKey
): Promise<EncryptedFilename> {
  const iv = generateIv();
  const encoder = new TextEncoder();
  const raw = encoder.encode(filename);

  // Pad filename to next multiple of FILENAME_PAD_MULTIPLE to hide length metadata
  const paddedLength = Math.ceil(Math.max(raw.length, 1) / FILENAME_PAD_MULTIPLE) * FILENAME_PAD_MULTIPLE;
  const data = new Uint8Array(paddedLength);
  data.set(raw);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    data
  );

  return {
    encryptedName: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: ivToBase64(iv)
  };
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

  // Read and encrypt the file in chunks
  const reader = file.stream().getReader();
  let buffer = new Uint8Array(0);

  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      // Append new data to buffer
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;
    }

    // Process complete chunks
    while (buffer.length >= CHUNK_SIZE || (done && buffer.length > 0)) {
      const chunkSize = Math.min(CHUNK_SIZE, buffer.length);
      const chunk = buffer.slice(0, chunkSize);
      buffer = buffer.slice(chunkSize);

      chunks.push(chunk);
      processedSize += chunkSize;

      if (onProgress) {
        onProgress((processedSize / totalSize) * 50); // First 50% is reading
      }
    }

    if (done) break;
  }

  // Concatenate all chunks
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

  // Encrypt the entire file (AES-GCM handles the file as a single unit for auth)
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
