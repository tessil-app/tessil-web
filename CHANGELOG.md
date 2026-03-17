# Changelog

All notable changes to this project will be documented in this file.

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
