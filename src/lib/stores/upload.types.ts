export type UploadStatus =
  | "idle"
  | "validating"
  | "encrypting"
  | "uploading"
  | "complete"
  | "error";

export interface FileUploadState {
  file: File;
  status: "pending" | "encrypting" | "uploading" | "complete" | "error";
  progress: number;
  error?: string;
}

export interface UploadState {
  files: FileUploadState[];
  status: UploadStatus;
  overallProgress: number;
  error: string | null;
  /** When the error response carries an `upgradeUrl` (limit-hit on a
   *  Free tier cap), surface an "Upgrade to Pro" CTA alongside the
   *  generic Try Again button. Set together with `error`. */
  errorUpgradeUrl: string | null;
  shareUrl: string | null;
  expiresInHours: number;
  currentFileIndex: number;
  password: string;
  passwordEnabled: boolean;
  maxDownloads: number | null;
  /** Optional human-readable name for the transfer; encrypted under K_transfer
   *  before reaching the server (ADR-0005). 200 chars soft cap. */
  title: string;
}
