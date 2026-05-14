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
  shareUrl: string | null;
  expiresInHours: number;
  currentFileIndex: number;
  password: string;
  passwordEnabled: boolean;
  maxDownloads: number | null;
  // Phase F vault opt-in (doc 28 §10 D-112). Only honoured when the
  // signed-in user has ≥1 PRF-capable credential — otherwise ignored.
  vaultEnabled: boolean;
}
