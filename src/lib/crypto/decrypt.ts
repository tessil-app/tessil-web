import { base64ToIv } from './key';

/** Strips right-padding zero bytes added by encryptString. */
export async function decryptString(
  ciphertext: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const iv = base64ToIv(ivBase64);
  const encrypted = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encrypted.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted).replace(/\0+$/, '');
}

export async function decryptFilename(
  encryptedName: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  return decryptString(encryptedName, ivBase64, key);
}

export async function decryptFile(
  encryptedData: ArrayBuffer,
  ivBase64: string,
  key: CryptoKey,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const iv = base64ToIv(ivBase64);

  if (onProgress) {
    onProgress(10);
  }

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encryptedData
  );

  if (onProgress) {
    onProgress(100);
  }

  return new Blob([decrypted]);
}

export async function downloadAndDecrypt(
  downloadUrl: string,
  ivBase64: string,
  key: CryptoKey,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    received += value.length;

    if (onProgress && total > 0) {
      onProgress((received / total) * 80); // 0-80%: download
    }
  }

  const encryptedData = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    encryptedData.set(chunk, offset);
    offset += chunk.length;
  }

  if (onProgress) {
    onProgress(80);
  }

  return decryptFile(encryptedData.buffer as ArrayBuffer, ivBase64, key, (p) => {
    if (onProgress) {
      onProgress(80 + (p * 0.2)); // 80-100%: decrypt
    }
  });
}
