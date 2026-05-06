# JTransfer Brand Guide

## Brand Structure

JTransfer is a single-product service: end-to-end encrypted file transfer.
The brand and the product are the same thing. There are no sub-products.

## Naming Rules

- Page/document title format: `<Page Name> - JTransfer` (e.g. `Privacy Policy - JTransfer`).
- Home title: `JTransfer - End-to-end encrypted file transfer`.
- Keep legal/policy page titles umbrella-first:
  - `Privacy Policy - JTransfer`
  - `Terms of Service - JTransfer`
  - `Security Overview - JTransfer`

## Copy Rules

- Lead with what the service does: send files with end-to-end encryption.
- Keep security claims precise and verifiable:
  - Preferred: `client-side encryption`, `encryption key stays in URL fragment`, `AES-256-GCM`.
  - Avoid vague claims like `military-grade` or `unbreakable`.
- Do not describe the service as a "suite" or imply additional products.

## Metadata Rules

- Canonical URL per public page.
- Keep the brand signature in metadata: OG/Twitter title format `<Page Name> - JTransfer`.

## Route/SEO Rules

- Public indexable routes: `/`, `/privacy`, `/terms`, `/abuse`, `/security`.
- Private transfer routes must remain non-indexable: `/d/*` with
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.
- Keep sitemap aligned with public routes only.
