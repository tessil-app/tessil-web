// Downloads one encrypted file, decrypts it and hands it to the browser to
// save. Large files stream straight to disk; small ones are decrypted in
// memory, which is quicker to start.

import { downloadAndDecrypt } from "$lib/crypto/decrypt";
import {
  canStreamToDisk,
  StreamInterruptedError,
  streamingDownloadToDisk,
} from "./streamDownload";

const STREAM_THRESHOLD = 50 * 1024 * 1024;

export interface SaveFileInput {
  downloadUrl: string;
  key: CryptoKey;
  fileIv: string;
  /** Stored (ciphertext) size. */
  size: number;
  name: string;
  mimeType?: string | null;
  /** 0 to 100. */
  onProgress?: (percent: number) => void;
}

export { StreamInterruptedError };

export async function saveDecryptedFile(input: SaveFileInput): Promise<void> {
  const { downloadUrl, key, fileIv, size, name, mimeType, onProgress } = input;

  if (canStreamToDisk() && size >= STREAM_THRESHOLD) {
    try {
      await streamingDownloadToDisk({
        downloadUrl,
        key,
        ciphertextSize: size,
        filename: name,
        mimeType,
        onProgress: (fraction) => onProgress?.(Math.round(fraction * 100)),
      });
      return;
    } catch (err) {
      // Once bytes have been written there is a partial file on disk, and
      // buffering a file this size could exhaust memory. Only a failure
      // before that falls through to the in-memory path.
      if (err instanceof StreamInterruptedError) throw err;
    }
  }

  const blob = await downloadAndDecrypt(downloadUrl, fileIv, key, (p) => onProgress?.(p.percent));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  onProgress?.(100);
}
