# Tessil Web

[![CI](https://github.com/tessil-app/tessil-web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tessil-app/tessil-web/actions/workflows/ci.yml)

Frontend application for Tessil - a secure, end-to-end encrypted file sharing service.

## Status

Active development. `main` is the working trunk and is not yet promoted for general production use.

## Features

- Drag and drop file upload
- Client-side AES-GCM encryption (files encrypted before upload)
- Encrypted filenames
- Optional password protection
- Configurable expiration (1, 6, 12, 24, or 72 hours)
- Progress tracking for encryption and upload
- Dark mode UI

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) - Web framework
- [Svelte 5](https://svelte.dev/) - UI framework with runes
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - Encryption

## Prerequisites

- [Bun](https://bun.sh/) 1.0 or higher

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
```

## Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Type check
bun run check

# Build for production
bun run build

# Preview production build
bun run preview
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── routes/              # SvelteKit pages
│   ├── +page.svelte     # Transfer page
│   └── d/[id]/          # Download page
├── lib/
│   ├── api/             # API client
│   ├── components/      # Reusable UI components
│   ├── crypto/          # Encryption/decryption utilities
│   └── stores/          # Svelte stores
├── app.css              # Global styles and design tokens
└── app.html             # HTML template
```

## Security Model

Tessil uses end-to-end encryption:

1. **File encryption**: Files are encrypted in the browser using AES-GCM with a randomly generated 256-bit key
2. **Filename encryption**: Filenames are also encrypted with the same key
3. **Key storage**: The encryption key is stored in the URL fragment (after `#`) and never sent to the server
4. **Optional password**: Adds server-side access control (separate from encryption)

The server never has access to:

- Unencrypted files
- Original filenames
- Encryption keys

## Security & Governance

- Security policy: [SECURITY.md](SECURITY.md)
- Change history: [CHANGELOG.md](CHANGELOG.md)
- Brand guide: [docs/brand.md](docs/brand.md)
- Cloudflare indexing runbook: [docs/cloudflare-edge-rules.md](docs/cloudflare-edge-rules.md)
- Security overview page: `/security`

## Author

Built by Jimmy Verburgt. Contact via [jimmyverburgt@gmail.com](mailto:jimmyverburgt@gmail.com) or [GitHub](https://github.com/VerburgtJimmy).

## License

Copyright © 2024–2026 Jimmy Verburgt.

Source code is licensed under the **GNU Affero General Public
License v3.0** — see [LICENSE](LICENSE) for the full text. AGPL-3.0
is a strong copyleft license: anyone who runs a modified version
of Tessil as a network service must make the source of their
modifications available to users of that service.

The **Tessil name, logo, and visual identity are trademarks**
and are **not** licensed under AGPL — see [TRADEMARK.md](TRADEMARK.md)
for what you can and cannot do with the brand. Forks must rename
and re-brand before being run as a service.
