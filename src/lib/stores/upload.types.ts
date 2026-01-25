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
  expiresInDays: number;
  currentFileIndex: number;
  password: string;
  passwordEnabled: boolean;
}
