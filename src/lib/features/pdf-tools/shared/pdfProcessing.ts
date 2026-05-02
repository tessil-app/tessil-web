export type ActionMode = "show" | "download" | "zip";

export type OutputItem = {
  id: string;
  name: string;
  size: number;
  url: string;
};

export type ProcessedFile = {
  name: string;
  blob: Blob;
};

export const MAX_MERGE_FILES = 10;
export const MAX_SPLIT_PAGES = 200;

function getBaseName(name: string) {
  const parts = name.split(".");
  if (parts.length <= 1) return name;
  parts.pop();
  return parts.join(".");
}

function getRangeLabel(range: string) {
  const compact = range.replace(/\s+/g, "").replace(/[^0-9,-]/g, "");
  if (!compact) return "selected-pages";
  return compact.slice(0, 40);
}

function bytesToPdfBlob(bytes: Uint8Array) {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return new Blob([copied], { type: "application/pdf" });
}

function assertPageInRange(page: number, totalPages: number) {
  if (page < 1 || page > totalPages) {
    throw new Error(`Page ${page} is out of range. This PDF has ${totalPages} pages.`);
  }
}

function parsePageSelection(rangeInput: string, totalPages: number) {
  const normalized = rangeInput.replace(/\s+/g, "");
  if (!normalized) {
    throw new Error("Enter a page range like 1-3,5.");
  }

  const segments = normalized.split(",");
  const pageSet = new Set<number>();

  for (const segment of segments) {
    if (!segment) continue;

    if (/^\d+$/.test(segment)) {
      const page = Number(segment);
      assertPageInRange(page, totalPages);
      pageSet.add(page - 1);
      continue;
    }

    if (/^\d+-\d+$/.test(segment)) {
      const [startText, endText] = segment.split("-");
      const start = Number(startText);
      const end = Number(endText);
      if (start > end) {
        throw new Error(`Invalid range \"${segment}\". Start must be <= end.`);
      }
      assertPageInRange(start, totalPages);
      assertPageInRange(end, totalPages);

      for (let page = start; page <= end; page++) {
        pageSet.add(page - 1);
      }
      continue;
    }

    throw new Error(`Invalid range segment: \"${segment}\".`);
  }

  if (pageSet.size === 0) {
    throw new Error("No valid pages selected.");
  }

  return Array.from(pageSet).sort((a, b) => a - b);
}

async function loadPdfLib() {
  return import("pdf-lib");
}

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export async function mergePdfFiles(files: File[]): Promise<ProcessedFile[]> {
  const { PDFDocument } = await loadPdfLib();
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const source = await PDFDocument.load(bytes);
    const copiedPages = await merged.copyPages(source, source.getPageIndices());
    copiedPages.forEach((page) => merged.addPage(page));
  }

  const mergedBytes = await merged.save();
  const mergedName = `jtransfer-merged-${formatTimestamp(new Date())}.pdf`;

  return [{ name: mergedName, blob: bytesToPdfBlob(mergedBytes) }];
}

export async function splitPdfByRange(
  file: File,
  pageRange: string
): Promise<ProcessedFile[]> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const pageIndices = parsePageSelection(pageRange, source.getPageCount());

  const output = await PDFDocument.create();
  const copiedPages = await output.copyPages(source, pageIndices);
  copiedPages.forEach((page) => output.addPage(page));

  const outputBytes = await output.save();
  const rangeLabel = getRangeLabel(pageRange);
  const name = `${getBaseName(file.name)}-pages-${rangeLabel}.pdf`;

  return [{ name, blob: bytesToPdfBlob(outputBytes) }];
}

export async function splitPdfAllPages(file: File): Promise<ProcessedFile[]> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const pageCount = source.getPageCount();

  if (pageCount > MAX_SPLIT_PAGES) {
    throw new Error(
      `This PDF has ${pageCount} pages. The limit for \"every page\" export is ${MAX_SPLIT_PAGES}.`
    );
  }

  const splitFiles: ProcessedFile[] = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(source, [pageIndex]);
    singlePagePdf.addPage(copiedPage);

    const outputBytes = await singlePagePdf.save();
    splitFiles.push({
      name: `${getBaseName(file.name)}-page-${pageIndex + 1}.pdf`,
      blob: bytesToPdfBlob(outputBytes),
    });
  }

  return splitFiles;
}

export async function rotatePdfPages(
  file: File,
  pageRange: string,
  rotateDegrees: 90 | 180 | 270
): Promise<ProcessedFile[]> {
  const { PDFDocument, degrees } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const document = await PDFDocument.load(bytes);
  const pageIndices = parsePageSelection(pageRange, document.getPageCount());

  for (const pageIndex of pageIndices) {
    const page = document.getPage(pageIndex);
    const currentAngle = page.getRotation().angle;
    const nextAngle = (currentAngle + rotateDegrees) % 360;
    page.setRotation(degrees(nextAngle));
  }

  const outputBytes = await document.save();
  const outputName = `${getBaseName(file.name)}-rotated-${rotateDegrees}.pdf`;

  return [{ name: outputName, blob: bytesToPdfBlob(outputBytes) }];
}

export async function removePdfPages(
  file: File,
  pageRange: string
): Promise<ProcessedFile[]> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const document = await PDFDocument.load(bytes);
  const totalPages = document.getPageCount();
  const pageIndices = parsePageSelection(pageRange, totalPages);

  if (pageIndices.length >= totalPages) {
    throw new Error("You cannot remove all pages. Keep at least one page.");
  }

  const descendingIndices = [...pageIndices].sort((a, b) => b - a);
  for (const pageIndex of descendingIndices) {
    document.removePage(pageIndex);
  }

  const outputBytes = await document.save();
  const outputName = `${getBaseName(file.name)}-removed-${getRangeLabel(pageRange)}.pdf`;

  return [{ name: outputName, blob: bytesToPdfBlob(outputBytes) }];
}

export function createOutputItems(processedFiles: ProcessedFile[]): OutputItem[] {
  return processedFiles.map((file, index) => ({
    id: `${file.name}-${file.blob.size}-${index}-${Date.now()}`,
    name: file.name,
    size: file.blob.size,
    url: URL.createObjectURL(file.blob),
  }));
}

export function revokeOutputItems(outputs: OutputItem[]) {
  outputs.forEach((item) => URL.revokeObjectURL(item.url));
}

function triggerDownload(url: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function downloadAsZip(files: ProcessedFile[]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  files.forEach((file) => zip.file(file.name, file.blob));
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipUrl = URL.createObjectURL(zipBlob);
  const zipName = `jtransfer-pdf-${formatTimestamp(new Date())}.zip`;
  triggerDownload(zipUrl, zipName);
  URL.revokeObjectURL(zipUrl);
}

export async function applyActionMode(
  processedFiles: ProcessedFile[],
  actionMode: ActionMode
): Promise<{ warning: string | null }> {
  if (processedFiles.length === 0 || actionMode === "show") {
    return { warning: null };
  }

  if (actionMode === "zip" || processedFiles.length > 1) {
    await downloadAsZip(processedFiles);
    if (actionMode === "download" && processedFiles.length > 1) {
      return { warning: "Multiple outputs were bundled into a ZIP for easier download." };
    }
    return { warning: null };
  }

  const singleFile = processedFiles[0];
  const url = URL.createObjectURL(singleFile.blob);
  triggerDownload(url, singleFile.name);
  URL.revokeObjectURL(url);

  return { warning: null };
}

export function formatTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
