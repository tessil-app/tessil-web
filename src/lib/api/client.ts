// Relative by default — same-origin in prod (reverse proxy), and dev uses the
// Vite /api proxy (see vite.config.ts). VITE_API_URL is an explicit override
// for environments that prefer cross-origin (must set up CORS + credentials).
const API_URL = import.meta.env.VITE_API_URL ?? "";

export interface CreateTransferResponse {
  transferId: string;
  expiresAt: string;
}

export interface InitMultipartUploadRequest {
  transferId: string;
  contentType: string;
  encryptedName: string;
  encryptedNameIv: string;
  fileIv: string;
  size: number;
}

export interface InitMultipartUploadPart {
  partNumber: number;
  url: string;
  contentLength: number;
}

export interface InitMultipartUploadResponse {
  fileId: string;
  r2Key: string;
  uploadId: string;
  partUrls: InitMultipartUploadPart[];
}

export interface CompleteMultipartUploadPart {
  partNumber: number;
  etag: string;
}

export interface CompleteMultipartUploadRequest {
  transferId: string;
  fileId: string;
  uploadId: string;
  parts: CompleteMultipartUploadPart[];
}

export interface AbortMultipartUploadRequest {
  transferId: string;
  fileId: string;
  uploadId: string;
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
  // Issued by /transfer/:id/verify when the transfer is password-protected.
  // Must be presented as `X-Transfer-Token` on subsequent /file/:id/url calls.
  accessToken?: string;
  accessTokenExpiresAt?: string;
  // Optional title encrypted under the URL-fragment transfer key.
  // Decrypted in the browser; the server only ever sees ciphertext.
  encryptedTitle?: string | null;
  encryptedTitleIv?: string | null;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
  size: number;
}

export interface ValidationResponse {
  valid: boolean;
  reason?: string;
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
    tier: string;
    createdAt: string;
    /**
     * The authenticator that minted the current session, or null. Used by
     * /dashboard/settings to mark which passkey signed in here. Sessions
     * minted via magic link, verify-code, or pre-migration rows are null.
     */
    currentAuthenticatorId: string | null;
    /**
     * ISO timestamp when the user completed vault setup, or null if
     * they haven't yet. The dashboard route guard bounces users with
     * null here to /setup/vault.
     */
    vaultSetupCompletedAt: string | null;
  } | null;
}

export interface OwnedTransferSummary {
  id: string;
  createdAt: string;
  expiresAt: string;
  fileCount: number;
  totalBytes: number;
  downloadCount: number;
  isCompleted: boolean;
  hasPassword: boolean;
  // K_transfer wrapped under the owner's vault key. NULL on
  // anonymous-at-creation rows. Unwrap requires the vault to be
  // unlocked first.
  wrappedKey: string | null;
  // Optional title encrypted under K_transfer. Both fields set
  // together or both null. Decrypted client-side once the row's
  // K_transfer is unwrapped.
  encryptedTitle: string | null;
  encryptedTitleIv: string | null;
}

export interface ListMyTransfersResponse {
  transfers: OwnedTransferSummary[];
  nextCursor: string | null;
}

// Returned by GET /api/me/transfers/:id/files for a transfer the
// caller owns. encryptedName + encryptedNameIv are decrypted
// client-side under K_transfer (unwrapped from the row's
// wrappedKey blob).
export interface OwnedTransferFileMetadata {
  id: string;
  encryptedName: string;
  encryptedNameIv: string;
  size: number;
  mimeType: string | null;
}

export interface RequestMagicLinkResponse {
  ok: true;
  message: string;
}

export interface VerifyCodeResponse {
  ok: true;
}

export interface PasskeySummary {
  id: string;
  nickname: string | null;
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

// Vault wire-format payloads. Salts/wraps are base64url-encoded raw
// bytes — the server cannot read any of them. Layout:
//   salt*  : 16 random bytes (Argon2id salt)
//   wrap*  : 60 bytes = iv(12) || ciphertext(32) || tag(16)
export type VaultStatus =
  | { isSetup: false }
  | {
      isSetup: true;
      kdfVersion: number;
      saltPassword: string;
      saltPhrase: string;
      wrapPassword: string;
      wrapPhrase: string;
      passwordChangedAt: string | null;
      phraseRegeneratedAt: string | null;
    };

export interface VaultSetupRequest {
  kdfVersion: number;
  saltPassword: string;
  saltPhrase: string;
  wrapPassword: string;
  wrapPhrase: string;
}

export interface VaultPasswordChangeRequest {
  kdfVersion: number;
  saltPassword: string;
  wrapPassword: string;
}

export interface BillingStatusResponse {
  tier: string;
  subscription: {
    status: string; // 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
  } | null;
}

export interface UsageResponse {
  tier: string;
  monthlyVolume: {
    usedBytes: number;
    capBytes: number;
    resetAt: string;
  };
  dailyTransfers: {
    used: number;
    cap: number;
    resetAt: string;
  };
  caps: {
    maxFileSize: number;
    maxTransferSize: number;
    allowedExpiryHours: number[];
  };
}

export interface VaultPhraseRegenerateRequest {
  kdfVersion: number;
  saltPhrase: string;
  wrapPhrase: string;
}

// Thrown by `ApiClient.request` for any non-2xx response. Carries
// the optional upgrade hints (`code`, `upgradeUrl`) the API attaches
// to limit-hit errors so UI can render an upgrade-aware message.
export class ApiError extends Error {
  status: number;
  code?: string;
  upgradeUrl?: string;

  constructor(
    message: string,
    status: number,
    extras: { code?: string; upgradeUrl?: string } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = extras.code;
    this.upgradeUrl = extras.upgradeUrl;
  }
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
        credentials: "include",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    } catch (err) {
      throw new Error(`Network error: Unable to reach API at ${this.baseUrl || "/"}`);
    }

    const text = await response.text();

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("API response was not JSON:", text.slice(0, 200));
      throw new Error(
        `API error: ${response.status} - ${
          text.slice(0, 100) || "Empty response"
        }`
      );
    }

    if (!response.ok) {
      const body =
        typeof data === "object" && data !== null
          ? (data as { error?: unknown; code?: unknown; upgradeUrl?: unknown })
          : {};
      const errorMessage = body.error
        ? String(body.error)
        : `Request failed: ${response.status}`;
      throw new ApiError(errorMessage, response.status, {
        code: typeof body.code === "string" ? body.code : undefined,
        upgradeUrl:
          typeof body.upgradeUrl === "string" ? body.upgradeUrl : undefined,
      });
    }

    return data as T;
  }

  async validateMagicBytes(magicBytes: string): Promise<ValidationResponse> {
    return this.request("/api/validate", {
      method: "POST",
      body: JSON.stringify({ magicBytes }),
    });
  }

  async createTransfer(
    expiresInHours: number,
    password?: string,
    maxDownloads?: number | null,
    encryptedTitle?: { encryptedTitle: string; encryptedTitleIv: string } | null,
  ): Promise<CreateTransferResponse> {
    const body: {
      expiresInHours: number;
      password?: string;
      maxDownloads?: number;
      encryptedTitle?: string;
      encryptedTitleIv?: string;
    } = {
      expiresInHours,
    };
    if (password) {
      body.password = password;
    }
    if (maxDownloads != null) {
      body.maxDownloads = maxDownloads;
    }
    if (encryptedTitle) {
      body.encryptedTitle = encryptedTitle.encryptedTitle;
      body.encryptedTitleIv = encryptedTitle.encryptedTitleIv;
    }
    return this.request("/api/upload/create-transfer", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // ─── Multipart upload ─────────────────────────────────────────────
  // Three round-trips per File: init (returns all Part URLs) →
  // upload each Part directly to R2 → complete (or abort on
  // failure). Orchestration lives in `$lib/upload/multipart.ts` —
  // these methods are thin wrappers around the API.

  async initMultipartUpload(
    data: InitMultipartUploadRequest,
  ): Promise<InitMultipartUploadResponse> {
    return this.request("/api/upload/init-multipart", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async completeMultipartUpload(
    data: CompleteMultipartUploadRequest,
  ): Promise<{ fileId: string; size: number }> {
    return this.request("/api/upload/complete-multipart", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async abortMultipartUpload(data: AbortMultipartUploadRequest): Promise<void> {
    await this.request("/api/upload/abort-multipart", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async completeTransfer(
    transferId: string,
    vaultWrap?: { wrappedKey: string },
  ): Promise<{ success: boolean; shareUrl: string }> {
    const body: { transferId: string; wrappedKey?: string } = { transferId };
    if (vaultWrap) {
      body.wrappedKey = vaultWrap.wrappedKey;
    }
    return this.request("/api/upload/complete", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async abortTransfer(transferId: string): Promise<void> {
    await this.request("/api/upload/abort", {
      method: "POST",
      body: JSON.stringify({ transferId }),
    });
  }

  async getTransferMetadata(id: string): Promise<TransferMetadata> {
    return this.request(`/api/download/transfer/${id}`);
  }

  async verifyTransferPassword(
    id: string,
    password: string
  ): Promise<TransferMetadata> {
    return this.request(`/api/download/transfer/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  async getDownloadUrl(fileId: string, accessToken?: string): Promise<DownloadUrlResponse> {
    const headers: Record<string, string> = {};
    if (accessToken) headers["X-Transfer-Token"] = accessToken;
    return this.request(`/api/download/file/${fileId}/url`, { headers });
  }

  async downloadFile(fileId: string, accessToken?: string): Promise<ArrayBuffer> {
    // Get presigned download URL from API
    const { downloadUrl } = await this.getDownloadUrl(fileId, accessToken);

    // Download directly from R2
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error("Download failed");
    }

    return response.arrayBuffer();
  }

  async requestMagicLink(email: string): Promise<RequestMagicLinkResponse> {
    return this.request("/api/auth/request-magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async verifyCode(code: string): Promise<VerifyCodeResponse> {
    return this.request("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async getMe(): Promise<MeResponse> {
    return this.request("/api/auth/me");
  }

  async logout(): Promise<{ ok: true }> {
    return this.request("/api/auth/logout", { method: "POST" });
  }

  async logoutAll(): Promise<{ ok: true; sessionsRevoked: number }> {
    return this.request("/api/auth/logout-all", { method: "POST" });
  }

  async listMyTransfers(
    cursor: string | null = null,
    limit = 20,
  ): Promise<ListMyTransfersResponse> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return this.request(`/api/me/transfers${qs ? `?${qs}` : ""}`);
  }

  async getMyTransferFiles(
    id: string,
  ): Promise<{ files: OwnedTransferFileMetadata[] }> {
    return this.request(`/api/me/transfers/${encodeURIComponent(id)}/files`);
  }

  // Rewrite (or clear) the encrypted title on an owned transfer. Pass null
  // for both fields to clear. Server treats not-found / not-owned / soft-
  // deleted the same: 404.
  async setMyTransferTitle(
    id: string,
    encryptedTitle: string | null,
    encryptedTitleIv: string | null,
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/me/transfers/${encodeURIComponent(id)}/title`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encryptedTitle, encryptedTitleIv }),
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error("Transfer not found.");
      if (response.status === 429) throw new Error("Too many title changes. Try again in a minute.");
      throw new Error(`Request failed: ${response.status}`);
    }
  }

  async deleteMyTransfer(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/me/transfers/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      // 404 covers both "not found" and "not yours" by design.
      if (response.status === 404) {
        throw new Error("Transfer not found.");
      }
      throw new Error(`Request failed: ${response.status}`);
    }
  }

  async exportMyAccount(): Promise<{ blob: Blob; filename: string }> {
    const response = await fetch(`${this.baseUrl}/api/me/export`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("Not signed in.");
      if (response.status === 429) {
        let message = "Too many export requests. Try again later.";
        try {
          const data = await response.json();
          if (data && typeof data === "object" && "error" in data) {
            message = String((data as { error: unknown }).error);
          }
        } catch {
          /* fall through */
        }
        throw new Error(message);
      }
      throw new Error(`Request failed: ${response.status}`);
    }

    // Prefer the filename the server suggested via Content-Disposition.
    const disposition = response.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = match?.[1] ?? `jtransfer-export-${stamp}.json`;

    const blob = await response.blob();
    return { blob, filename };
  }

  // ── Passkeys / WebAuthn ─────────────────────────────────────────────────

  async passkeyRegisterBegin(): Promise<{ options: unknown; challengeId: string }> {
    return this.request("/api/auth/passkey/register/begin", { method: "POST" });
  }

  async passkeyRegisterFinish(
    challengeId: string,
    response: unknown,
    nickname: string | null,
  ): Promise<{ authenticator: PasskeySummary }> {
    return this.request("/api/auth/passkey/register/finish", {
      method: "POST",
      body: JSON.stringify({ challengeId, response, nickname }),
    });
  }

  async passkeyLoginBegin(): Promise<{ options: unknown; challengeId: string }> {
    return this.request("/api/auth/passkey/login/begin", { method: "POST" });
  }

  async passkeyLoginFinish(
    challengeId: string,
    response: unknown,
  ): Promise<{ ok: true }> {
    return this.request("/api/auth/passkey/login/finish", {
      method: "POST",
      body: JSON.stringify({ challengeId, response }),
    });
  }

  async listPasskeys(): Promise<{ authenticators: PasskeySummary[] }> {
    return this.request("/api/auth/passkeys");
  }

  async renamePasskey(
    id: string,
    nickname: string | null,
  ): Promise<{ authenticator: PasskeySummary }> {
    return this.request(`/api/auth/passkey/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ nickname }),
    });
  }

  async deletePasskey(id: string): Promise<void> {
    await this.request<{ ok: true }>(`/api/auth/passkey/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  // ── Vault ───────────────────────────────────────────────────────────────

  async getVault(): Promise<VaultStatus> {
    return this.request("/api/me/vault");
  }

  async setupVault(body: VaultSetupRequest): Promise<{ ok: true }> {
    return this.request("/api/me/vault/setup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async changeVaultPassword(body: VaultPasswordChangeRequest): Promise<{ ok: true }> {
    return this.request("/api/me/vault/password", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async regenerateVaultPhrase(body: VaultPhraseRegenerateRequest): Promise<{ ok: true }> {
    return this.request("/api/me/vault/phrase", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // ─── Billing (Polar) ──────────────────────────────────────────────
  // Drives the subscription panel on /dashboard/settings/account and
  // the Pro upgrade flow. Checkout + portal redirect the user to
  // Polar-hosted pages — we don't render any billing UI ourselves.

  async getBillingStatus(): Promise<BillingStatusResponse> {
    return this.request("/api/billing/status");
  }

  async createBillingCheckout(cycle: "monthly" | "annual"): Promise<{ url: string }> {
    return this.request("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ cycle }),
    });
  }

  async openBillingPortal(): Promise<{ url: string }> {
    return this.request("/api/billing/portal", { method: "POST" });
  }

  async getMyUsage(): Promise<UsageResponse> {
    return this.request("/api/me/usage");
  }

  async deleteMyAccount(confirmEmail: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/me`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail }),
    });
    if (response.ok) return;

    // The error body is small JSON — parse but tolerate non-JSON.
    let message: string | null = null;
    try {
      const data = await response.json();
      if (data && typeof data === "object" && "error" in data) {
        message = String((data as { error: unknown }).error);
      }
    } catch {
      /* fall through */
    }

    if (response.status === 400) {
      throw new Error(message ?? "Confirmation does not match account email.");
    }
    if (response.status === 401) {
      throw new Error("Not signed in.");
    }
    if (response.status === 429) {
      throw new Error(message ?? "Too many attempts. Try again later.");
    }
    throw new Error(message ?? `Request failed: ${response.status}`);
  }
}

export const api = new ApiClient(API_URL);
