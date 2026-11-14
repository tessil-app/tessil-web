// Relative by default - same-origin in prod, /api proxy in dev. VITE_API_URL overrides for cross-origin setups.
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
  /** Salt for deriving the password verifier; null on older transfers. */
  passwordSalt?: string | null;
  fileCount?: number;
  files?: FileInfo[];
  /** Issued by /transfer/:id/verify; presented as X-Transfer-Token on later /file calls. */
  accessToken?: string;
  accessTokenExpiresAt?: string;
  encryptedTitle?: string | null;
  encryptedTitleIv?: string | null;
}

export interface PortalRow {
  id: string;
  role: "owner" | "member";
  /** Encrypted under the link key; holds the title and public key. */
  publicBundle: string;
  /** This member's copy of the portal's keys. */
  sealedKeys: string;
  keyVersion: number;
  isDisabled: boolean;
  createdAt: string;
  /** Live deliveries; absent from an older server. */
  deliveries?: number;
  /** Deliveries that arrived since this member last looked. */
  unseen?: number;
  storedBytes?: number;
  lastDeliveryAt?: string | null;
  /** Who made the portal. Their public key is what a handed copy is checked against. */
  owner?: { userId: string; email: string; publicKey: string | null };
}

export interface PortalSharingResponse {
  maxGuests: number;
  guests: { userId: string; email: string; publicKey: string | null }[];
  invites: {
    id: string;
    email: string;
    createdAt: string;
    /** Null until the invitee has an account with a keypair. */
    ready: { userId: string; publicKey: string } | null;
  }[];
}

export interface DepositRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  /** The deposit's key, sealed to the portal's public key. */
  sealedKey: string;
  /** The depositor's optional note, encrypted under the deposit's key. */
  encryptedTitle: string | null;
  encryptedTitleIv: string | null;
  files: FileInfo[];
}

export interface ListDepositsResponse {
  deposits: DepositRow[];
  /** When this member last looked; newer deliveries are new to them. */
  lastSeenAt?: string | null;
  nextCursor: string | null;
}

export interface PortalPublic {
  id: string;
  publicBundle: string;
  keyVersion: number;
  /** False when the owner switched it off or left the paid plans. */
  accepting: boolean;
  /** Most that one deposit may hold. */
  maxTotalSize?: number;
}

export interface ListPortalsResponse {
  /** 0 on plans without portals. */
  maxPortals: number;
  portals: PortalRow[];
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
  size: number;
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
  /** K_transfer wrapped under the owner's vault key. Null on anonymous-at-creation rows. */
  wrappedKey: string | null;
  encryptedTitle: string | null;
  encryptedTitleIv: string | null;
}

export interface ListMyTransfersResponse {
  transfers: OwnedTransferSummary[];
  nextCursor: string | null;
}

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

/**
 * Result of redeeming a magic-link token. `signed_in` means the session cookie
 * is set. `code_issued` means the link was opened on a different device than it
 * was requested from, so the 6-digit code must be typed on the original device.
 */
export interface VerifyLinkResponse {
  action: "signed_in" | "code_issued";
  code?: string;
  expiresIn?: number;
}

export interface PasskeySummary {
  id: string;
  nickname: string | null;
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
  /** base64url WebAuthn credential ID. */
  credentialId: string;
}

/** A passkey that can unlock the vault. */
export interface VaultPasskeyWrap {
  authenticatorId: string;
  credentialId: string;
  prfSalt: string;
  wrap: string;
}

// Vault wire format: salt* = 16-byte Argon2id salt, wrap* = iv(12)||ct(32)||tag(16), base64url-encoded.
export type VaultStatus =
  /** `passkeyOnlySetup` is set by an API that can create a vault without a password. */
  | { isSetup: false; passkeyOnlySetup?: boolean }
  | {
      isSetup: true;
      /** ECDH P-256 public key and its vault-sealed private half; null until generated. */
      publicKey: string | null;
      wrappedPrivateKey: string | null;
      /** Absent from an API that predates passkey unlock. */
      passkeyWraps?: VaultPasskeyWrap[];
      kdfVersion: number;
      /** Both null for a vault opened by passkey and recovery phrase only. */
      saltPassword: string | null;
      saltPhrase: string;
      wrapPassword: string | null;
      wrapPhrase: string;
      passwordChangedAt: string | null;
      phraseRegeneratedAt: string | null;
    };

export interface VaultSetupRequest {
  kdfVersion: number;
  saltPhrase: string;
  wrapPhrase: string;
  /** A vault needs a password, a passkey, or both. */
  saltPassword?: string;
  wrapPassword?: string;
  passkey?: { authenticatorId: string; prfSalt: string; wrap: string };
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
  /** Bytes kept right now, transfers and portal files together. Null without a quota. */
  storage?: { usedBytes: number; quotaBytes: number } | null;
  /** Received through all of the account's portals this month. Null without portals. */
  portalVolume?: { usedBytes: number; capBytes: number; resetAt: string } | null;
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

  // `protection.verifier` is derived from the password in the browser;
  // the password itself is never sent.
  async createTransfer(
    expiresInHours: number,
    protection?: { verifier: string; salt: string },
    maxDownloads?: number | null,
    encryptedTitle?: { encryptedTitle: string; encryptedTitleIv: string } | null,
  ): Promise<CreateTransferResponse> {
    const body: {
      expiresInHours: number;
      password?: string;
      passwordSalt?: string;
      maxDownloads?: number;
      encryptedTitle?: string;
      encryptedTitleIv?: string;
    } = {
      expiresInHours,
    };
    if (protection) {
      body.password = protection.verifier;
      body.passwordSalt = protection.salt;
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
  // Orchestration lives in $lib/upload/multipart.ts; these are thin API wrappers.

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

  // `wrappedKey` keeps the key in the sender's vault; `sealedKey` is a
  // deposit's key sealed to its portal. A transfer has one or neither.
  async completeTransfer(
    transferId: string,
    keys?: { wrappedKey?: string; sealedKey?: string },
  ): Promise<{ success: boolean; shareUrl: string }> {
    const body: { transferId: string; wrappedKey?: string; sealedKey?: string } = { transferId };
    if (keys?.wrappedKey) body.wrappedKey = keys.wrappedKey;
    if (keys?.sealedKey) body.sealedKey = keys.sealedKey;
    // The call is idempotent on the server, so a response lost to a
    // dropped connection is retried instead of failing a finished upload.
    const delays = [1000, 3000, 8000];
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.request("/api/upload/complete", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch (err) {
        const dropped = err instanceof Error && err.message.startsWith("Network error");
        if (!dropped || attempt >= delays.length) throw err;
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
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

  // `password` is the derived verifier, or the typed password for a
  // transfer old enough to have no salt.
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
    const { downloadUrl } = await this.getDownloadUrl(fileId, accessToken);
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

  /** Redeems a magic-link token read from the /signin/verify URL fragment. */
  async verifyMagicLink(token: string): Promise<VerifyLinkResponse> {
    return this.request("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
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

  /** Pass null for both fields to clear. */
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

    const disposition = response.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = match?.[1] ?? `tessil-export-${stamp}.json`;

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

  // ── Portals ─────────────────────────────────────────────────────────────

  async listPortals(): Promise<ListPortalsResponse> {
    return this.request("/api/portals");
  }

  async createPortal(body: {
    id: string;
    publicBundle: string;
    sealedKeys: string;
    depositToken: string;
  }): Promise<{ id: string; createdAt: string }> {
    return this.request("/api/portals", { method: "POST", body: JSON.stringify(body) });
  }

  async updatePortal(
    id: string,
    changes: { isDisabled?: boolean; publicBundle?: string },
  ): Promise<{ ok: true }> {
    return this.request(`/api/portals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
  }

  /** What a depositor's browser needs. No session involved. */
  async getPortalPublic(id: string): Promise<PortalPublic> {
    return this.request(`/api/portals/${encodeURIComponent(id)}/public`);
  }

  async startDeposit(
    portalId: string,
    body: { depositToken: string; encryptedTitle?: string; encryptedTitleIv?: string },
  ): Promise<{ transferId: string; expiresAt: string; maxFileSize: number; maxTotalSize: number }> {
    return this.request(`/api/portals/${encodeURIComponent(portalId)}/deposits`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async listDeposits(portalId: string, cursor: string | null = null): Promise<ListDepositsResponse> {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request(`/api/portals/${encodeURIComponent(portalId)}/deposits${qs}`);
  }

  async getDepositFileUrl(portalId: string, fileId: string): Promise<DownloadUrlResponse> {
    return this.request(
      `/api/portals/${encodeURIComponent(portalId)}/deposits/files/${encodeURIComponent(fileId)}/url`,
    );
  }

  async deleteDeposit(portalId: string, transferId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/portals/${encodeURIComponent(portalId)}/deposits/${encodeURIComponent(transferId)}`,
      { method: "DELETE", credentials: "include" },
    );
    if (!response.ok) {
      throw new ApiError(
        response.status === 404 ? "Not found." : `Request failed: ${response.status}`,
        response.status,
      );
    }
  }

  /** Tells the server this member has looked at everything that arrived so far. */
  async markPortalSeen(portalId: string): Promise<{ ok: true }> {
    return this.request(`/api/portals/${encodeURIComponent(portalId)}/seen`, { method: "POST" });
  }

  // ── Sharing a portal ────────────────────────────────────────────────────

  async getPortalSharing(portalId: string): Promise<PortalSharingResponse> {
    return this.request(`/api/portals/${encodeURIComponent(portalId)}/sharing`);
  }

  async invitePortalGuest(portalId: string, email: string): Promise<{ id: string }> {
    return this.request(`/api/portals/${encodeURIComponent(portalId)}/invites`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async admitPortalInvitee(
    portalId: string,
    body: { inviteId: string; sealedKeys: string; sealedTo: string },
  ): Promise<{ userId: string }> {
    return this.request(`/api/portals/${encodeURIComponent(portalId)}/members`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async replaceMyPortalKeys(portalId: string, sealedKeys: string): Promise<{ ok: true }> {
    return this.request(`/api/portals/${encodeURIComponent(portalId)}/members/me`, {
      method: "PUT",
      body: JSON.stringify({ sealedKeys }),
    });
  }

  private async deletePortalPart(portalId: string, part: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/portals/${encodeURIComponent(portalId)}/${part}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      throw new ApiError(
        response.status === 404 ? "Not found." : `Request failed: ${response.status}`,
        response.status,
      );
    }
  }

  deletePortalInvite(portalId: string, inviteId: string): Promise<void> {
    return this.deletePortalPart(portalId, `invites/${encodeURIComponent(inviteId)}`);
  }

  /** The owner removes their guest, or a guest leaves. */
  removePortalMember(portalId: string, userId: string): Promise<void> {
    return this.deletePortalPart(portalId, `members/${encodeURIComponent(userId)}`);
  }

  async deletePortal(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/portals/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      throw new ApiError(
        response.status === 404 ? "Portal not found." : `Request failed: ${response.status}`,
        response.status,
      );
    }
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

  async createVaultKeypair(body: {
    publicKey: string;
    wrappedPrivateKey: string;
  }): Promise<{ ok: true }> {
    return this.request("/api/me/vault/keypair", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async setVaultPasskeyWrap(
    authenticatorId: string,
    body: { prfSalt: string; wrap: string },
  ): Promise<{ ok: true }> {
    return this.request(`/api/me/vault/passkeys/${encodeURIComponent(authenticatorId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async deleteVaultPasskeyWrap(authenticatorId: string): Promise<{ ok: true }> {
    return this.request(`/api/me/vault/passkeys/${encodeURIComponent(authenticatorId)}`, {
      method: "DELETE",
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

  async getBillingStatus(): Promise<BillingStatusResponse> {
    return this.request("/api/billing/status");
  }

  async createBillingCheckout(
    cycle: "monthly" | "annual",
    plan: "pro" | "max" = "pro",
  ): Promise<{ url: string }> {
    return this.request("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ cycle, plan }),
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
