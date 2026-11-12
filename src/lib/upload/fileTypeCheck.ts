// Refuses executables by their leading bytes. Runs in the browser, so
// no part of the file's content leaves it before encryption.

const BLOCKED_SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: "exe/dll", bytes: [0x4d, 0x5a] },
  { name: "ELF", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "Mach-O", bytes: [0xfe, 0xed, 0xfa, 0xce] },
  { name: "Mach-O", bytes: [0xfe, 0xed, 0xfa, 0xcf] },
  { name: "Mach-O", bytes: [0xce, 0xfa, 0xed, 0xfe] },
  { name: "Mach-O", bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { name: "Mach-O universal", bytes: [0xca, 0xfe, 0xba, 0xbe] },
];

const SHEBANG = [0x23, 0x21]; // #!

const LONGEST = Math.max(SHEBANG.length, ...BLOCKED_SIGNATURES.map((s) => s.bytes.length));

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return bytes.length >= prefix.length && prefix.every((b, i) => bytes[i] === b);
}

/** Returns why the leading bytes are refused, or null when they are fine. */
export function blockedReason(bytes: Uint8Array): string | null {
  if (startsWith(bytes, SHEBANG)) return "Executable scripts are not allowed";
  const hit = BLOCKED_SIGNATURES.find((sig) => startsWith(bytes, sig.bytes));
  return hit ? `Executable files (${hit.name}) are not allowed` : null;
}

export async function checkFileType(file: Blob): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, LONGEST).arrayBuffer());
  return blockedReason(head);
}
