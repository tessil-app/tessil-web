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

export interface DownloadProgress {
  /** 0–100 across download + decrypt. */
  percent: number;
  /** Smoothed (EMA) download rate in bytes/sec; null during decrypt / until known. */
  bytesPerSecond: number | null;
  /** Estimated seconds remaining; null during decrypt / until a rate is known. */
  etaSeconds: number | null;
}

/**
 * Streams the encrypted blob from R2 with real bytes-received progress (so big
 * files don't look frozen), reports a smoothed speed + ETA, then decrypts.
 * Download maps to 0–90%, decrypt to 90–100% — the download dominates wall-clock.
 */
export async function downloadAndDecrypt(
  downloadUrl: string,
  ivBase64: string,
  key: CryptoKey,
  onProgress?: (progress: DownloadProgress) => void
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

  let emaBps = 0;
  let lastSampleT = performance.now();
  let lastSampleBytes = 0;
  let lastEmitT = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    received += value.length;

    const now = performance.now();
    const dt = (now - lastSampleT) / 1000;
    if (dt >= 0.2) {
      const inst = Math.max(0, (received - lastSampleBytes) / dt);
      emaBps = emaBps === 0 ? inst : 0.2 * inst + 0.8 * emaBps;
      lastSampleT = now;
      lastSampleBytes = received;
    }

    // Throttle UI emits — reads fire very frequently on a fast connection.
    if (onProgress && total > 0 && (now - lastEmitT >= 80 || received >= total)) {
      lastEmitT = now;
      onProgress({
        percent: (received / total) * 90, // 0-90%: download
        bytesPerSecond: emaBps > 0 ? emaBps : null,
        etaSeconds: emaBps > 0 ? Math.max(0, total - received) / emaBps : null,
      });
    }
  }

  const encryptedData = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    encryptedData.set(chunk, offset);
    offset += chunk.length;
  }

  onProgress?.({ percent: 90, bytesPerSecond: null, etaSeconds: null });

  return decryptFile(encryptedData.buffer as ArrayBuffer, ivBase64, key, (p) => {
    onProgress?.({
      percent: 90 + p * 0.1, // 90-100%: decrypt
      bytesPerSecond: null,
      etaSeconds: null,
    });
  });
}
