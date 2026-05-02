# JTransfer Brand Guide

## Brand Structure

- `JTransfer` is the umbrella brand.
- Each feature is a product under JTransfer, with its own product name and page title.

Current product names:

- `File Share` (route: `/`)
- `Image Converter` (route: `/image-converter`)
- `PDF Tools` (route: `/pdf-tools`)

## Naming Rules

- Keep UI labels short:
  - Navigation label: `File Share`
  - Navigation label: `Image Converter`
  - Navigation label: `PDF Tools`
- Use page/document titles in this format:
  - `<Product Name> - JTransfer`
  - Examples:
    - `File Share - JTransfer`
    - `Image Converter - JTransfer`
    - `PDF Tools - JTransfer`
- Keep legal/policy pages umbrella-first:
  - `Privacy Policy - JTransfer`
  - `Terms of Service - JTransfer`
  - `Security - JTransfer`

## Copy Rules

- Write product copy with explicit scope:
  - File Share copy talks about encrypted upload/download flows.
  - Image Converter copy talks about local, in-browser conversion.
  - PDF Tools copy talks about local, in-browser PDF processing.
- Do not mix product promises unless the page is a cross-product policy page (`/privacy`, `/terms`, `/security`).
- Keep security claims precise and verifiable:
  - Preferred: `client-side encryption`, `encryption key stays in URL fragment`, `local conversion in browser`.
  - Avoid vague claims like `military-grade` or `unbreakable`.

## Metadata Rules

- Canonical URL per public page.
- Product pages should include product-specific description and OG title.
- Keep the brand signature in metadata:
  - OG/Twitter title format: `<Product Name> - JTransfer`

## Route/SEO Rules

- Public indexable routes:
  - `/`, `/image-converter`, `/pdf-tools`, `/privacy`, `/terms`, `/abuse`, `/security`
- Private transfer routes must remain non-indexable:
  - `/d/*` with `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- Keep sitemap aligned with public routes only.
