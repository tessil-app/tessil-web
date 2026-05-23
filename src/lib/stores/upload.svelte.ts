import type {
  FileUploadState,
  UploadState,
  UploadStatus,
} from "./upload.types";

function createUploadStore() {
  let state = $state<UploadState>({
    files: [],
    status: "idle",
    overallProgress: 0,
    error: null,
    errorUpgradeUrl: null,
    shareUrl: null,
    expiresInHours: 24,
    currentFileIndex: 0,
    password: "",
    passwordEnabled: false,
    maxDownloads: null,
    title: "",
  });

  function calculateOverallProgress(): number {
    if (state.files.length === 0) return 0;
    const totalProgress = state.files.reduce((sum, f) => sum + f.progress, 0);
    return totalProgress / state.files.length;
  }

  return {
    get files() {
      return state.files;
    },
    get status() {
      return state.status;
    },
    get overallProgress() {
      return state.overallProgress;
    },
    get error() {
      return state.error;
    },
    get errorUpgradeUrl() {
      return state.errorUpgradeUrl;
    },
    get shareUrl() {
      return state.shareUrl;
    },
    get expiresInHours() {
      return state.expiresInHours;
    },
    get maxDownloads() {
      return state.maxDownloads;
    },
    get currentFileIndex() {
      return state.currentFileIndex;
    },
    get password() {
      return state.password;
    },
    get passwordEnabled() {
      return state.passwordEnabled;
    },
    get title() {
      return state.title;
    },

    addFiles(newFiles: File[]) {
      const fileStates: FileUploadState[] = newFiles.map((file) => ({
        file,
        status: "pending",
        progress: 0,
      }));
      state.files = [...state.files, ...fileStates];
      state.error = null;
      state.shareUrl = null;
      state.status = "idle";
    },

    removeFile(index: number) {
      state.files = state.files.filter((_, i) => i !== index);
      if (state.files.length === 0) {
        state.status = "idle";
        state.error = null;
      }
    },

    setFileStatus(
      index: number,
      status: FileUploadState["status"],
      progress?: number,
      error?: string
    ) {
      if (state.files[index]) {
        state.files[index].status = status;
        if (progress !== undefined) {
          state.files[index].progress = progress;
        }
        if (error !== undefined) {
          state.files[index].error = error;
        }
        state.overallProgress = calculateOverallProgress();
      }
    },

    setCurrentFileIndex(index: number) {
      state.currentFileIndex = index;
    },

    setStatus(status: UploadStatus) {
      state.status = status;
    },

    setOverallProgress(progress: number) {
      state.overallProgress = progress;
    },

    setError(error: string, upgradeUrl?: string | null) {
      state.error = error;
      state.errorUpgradeUrl = upgradeUrl ?? null;
      state.status = "error";
    },

    setShareUrl(url: string) {
      state.shareUrl = url;
      state.status = "complete";
    },

    setExpiresInHours(hours: number) {
      state.expiresInHours = hours;
    },

    setMaxDownloads(max: number | null) {
      state.maxDownloads = max;
    },

    setPassword(password: string) {
      state.password = password;
    },

    setPasswordEnabled(enabled: boolean) {
      state.passwordEnabled = enabled;
      if (!enabled) {
        state.password = "";
      }
    },

    setTitle(title: string) {
      state.title = title;
    },

    reset() {
      state = {
        files: [],
        status: "idle",
        overallProgress: 0,
        error: null,
        errorUpgradeUrl: null,
        shareUrl: null,
        expiresInHours: 24,
        currentFileIndex: 0,
        password: "",
        passwordEnabled: false,
        maxDownloads: null,
        title: "",
      };
    },
  };
}

export const uploadStore = createUploadStore();
