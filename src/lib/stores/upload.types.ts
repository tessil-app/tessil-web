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
  /** Set together with `error` when the limit response carries an upgrade URL. */
  errorUpgradeUrl: string | null;
  shareUrl: string | null;
  expiresInHours: number;
  currentFileIndex: number;
  password: string;
  maxDownloads: number | null;
  /** Optional, encrypted under K_transfer before reaching the server. */
  title: string;
}
