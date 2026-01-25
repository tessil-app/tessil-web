const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000';

export interface CreateTransferResponse {
  transferId: string;
  expiresAt: string;
}

export interface AddFileRequest {
  transferId: string;
  contentType: string;
  encryptedName: string;
  encryptedNameIv: string;
  fileIv: string;
}

export interface AddFileResponse {
  fileId: string;
}

export interface FileInfo {
  id: string;
  encryptedName: string;
  encryptedNameIv: string;
  fileIv: string;
  size: number;
  mimeType: string | null;
}

export interface TransferMetadata {
  id: string;
  expiresAt: string;
  passwordRequired: boolean;
  fileCount?: number;
  files?: FileInfo[];
}

export interface ValidationResponse {
  valid: boolean;
  reason?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
    } catch (err) {
      throw new Error(`Network error: Unable to reach API at ${this.baseUrl}`);
    }

    const text = await response.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('API response was not JSON:', text.slice(0, 200));
      throw new Error(`API error: ${response.status} - ${text.slice(0, 100) || 'Empty response'}`);
    }

    if (!response.ok) {
      throw new Error(data.error ?? `Request failed: ${response.status}`);
    }

    return data;
  }

  async validateMagicBytes(magicBytes: string): Promise<ValidationResponse> {
    return this.request('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ magicBytes })
    });
  }

  async createTransfer(expiresInDays: number, password?: string): Promise<CreateTransferResponse> {
    const body: { expiresInDays: number; password?: string } = { expiresInDays };
    if (password) {
      body.password = password;
    }
    return this.request('/api/upload/create-transfer', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async addFile(
    data: AddFileRequest,
    fileBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<AddFileResponse> {
    const url = `${this.baseUrl}/api/upload/add-file`;

    // Use FormData for efficient file upload
    const formData = new FormData();
    formData.append('transferId', data.transferId);
    formData.append('contentType', data.contentType);
    formData.append('encryptedName', data.encryptedName);
    formData.append('encryptedNameIv', data.encryptedNameIv);
    formData.append('fileIv', data.fileIv);
    formData.append('file', fileBlob);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Invalid response'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || `Upload failed: ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  async completeTransfer(transferId: string): Promise<{ success: boolean; shareUrl: string }> {
    return this.request('/api/upload/complete', {
      method: 'POST',
      body: JSON.stringify({ transferId })
    });
  }

  async getTransferMetadata(id: string): Promise<TransferMetadata> {
    return this.request(`/api/download/transfer/${id}`);
  }

  async verifyTransferPassword(id: string, password: string): Promise<TransferMetadata> {
    return this.request(`/api/download/transfer/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/api/download/file/${fileId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.arrayBuffer();
  }
}

export const api = new ApiClient(API_URL);
