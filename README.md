# JTransfer Frontend

[![CI](https://github.com/VerburgtJimmy/jtransfer-front/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/VerburgtJimmy/jtransfer-front/actions/workflows/ci.yml)

Frontend application for JTransfer - a secure, end-to-end encrypted file sharing service.

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
- Local image converter (HEIC/JPG/PNG/WEBP and more)
- Local PDF tools (merge, split, rotate, remove pages)

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
│   ├── +page.svelte     # File Share page
│   ├── image-converter/ # Image Converter page
│   ├── pdf-tools/       # PDF Tools page
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

JTransfer uses end-to-end encryption:

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

MIT License - see [LICENSE](LICENSE) for details.
