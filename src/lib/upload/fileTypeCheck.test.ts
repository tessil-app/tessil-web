import { describe, expect, it } from "bun:test";
import { blockedReason, checkFileType } from "./fileTypeCheck";

describe("blockedReason", () => {
  it("refuses Windows, Linux and macOS executables", () => {
    expect(blockedReason(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toContain("exe/dll");
    expect(blockedReason(new Uint8Array([0x7f, 0x45, 0x4c, 0x46]))).toContain("ELF");
    expect(blockedReason(new Uint8Array([0xcf, 0xfa, 0xed, 0xfe]))).toContain("Mach-O");
  });

  it("refuses scripts with a shebang", () => {
    expect(blockedReason(new TextEncoder().encode("#!/bin/sh\n"))).toContain("scripts");
  });

  it("allows documents, including legacy Office files", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7");
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    // OLE compound document: .doc, .xls, .ppt, .msg
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(blockedReason(pdf)).toBeNull();
    expect(blockedReason(zip)).toBeNull();
    expect(blockedReason(ole)).toBeNull();
  });

  it("allows empty and very short files", () => {
    expect(blockedReason(new Uint8Array())).toBeNull();
    expect(blockedReason(new Uint8Array([0x4d]))).toBeNull();
  });
});

describe("checkFileType", () => {
  it("reads only the head of the file", async () => {
    const exe = new Blob([new Uint8Array([0x4d, 0x5a]), new Uint8Array(1024)]);
    expect(await checkFileType(exe)).toContain("exe/dll");
    expect(await checkFileType(new Blob(["plain text"]))).toBeNull();
  });
});
