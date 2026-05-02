# Changelog

All notable changes to this project will be documented in this file.

## 2026-03-17

### Added

- New `PDF Tools` product page at `/pdf-tools`.
- Local PDF merge workflow (combine up to 10 PDFs into one file).
- Local PDF split workflow:
  - Extract selected page ranges (e.g. `1-3,5`)
  - Export every page as separate PDFs (with ZIP download support)
- Local PDF page editing tools:
  - Rotate selected pages by 90/180/270 degrees
  - Remove selected page ranges

### Changed

- Main navigation now includes `PDF Tools`.
- App-level metadata routing now includes `/pdf-tools`.
- Sitemap now includes `/pdf-tools`.
- Brand guide updated with the `PDF Tools` product naming and route.
- Page-range help in PDF Tools now uses an Origin UI-style tooltip implementation built with `bits-ui`.
- UI motion polish: replaced broad `transition-all` usages with targeted property transitions and shorter durations.
- Added media-query gating to disable hover transition animations on touch/non-hover devices.

## 2026-02-28

### Added

- Image converter page with local-only processing and batch conversion workflow.
- Download action modes for converted files (manual, auto-download, ZIP).
- Image size and quality controls in image converter (clearer optimization settings).
- SEO crawl plumbing: `sitemap.xml`, updated `robots.txt`, and transfer route exclusions.
- Edge-level indexing protection for transfer links using `_headers` and `X-Robots-Tag`.
- Security overview page at `/security`.
- Security policy at `SECURITY.md`.
- Brand governance guide at `docs/brand.md`.
- Cloudflare edge runbook for private-link indexing controls at `docs/cloudflare-edge-rules.md`.

### Changed

- Improved metadata and structured data on existing public pages.
- Deferred Ko-fi widget loading and limited it to homepage.
- Strengthened internal trust and policy linking across pages.
- Switched SvelteKit preload behavior from hover to tap to reduce background route prefetching.
- Updated Ko-fi widget loading to wait for user interaction (with delayed fallback) on homepage.
- Improved HEIC conversion path to prefer native browser decoding before loading HEIC fallback bundle.
- Upgraded build tooling to Vite 8 and refreshed SvelteKit to 2.55 for compatibility.
