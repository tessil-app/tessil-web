# JTransfer Frontend

Frontend application for JTransfer - a secure, end-to-end encrypted file sharing service.

## Features

- Drag and drop file upload
- Client-side AES-GCM encryption (files encrypted before upload)
- Encrypted filenames
- Optional password protection
- Configurable expiration (1 or 3 days)
- Progress tracking for encryption and upload
- Dark mode UI

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) - Web framework
- [Svelte 5](https://svelte.dev/) - UI framework with runes
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - Encryption

## Prerequisites

- Node.js 18 or higher
- npm, pnpm, or yarn

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── routes/              # SvelteKit pages
│   ├── +page.svelte     # Upload page
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

## License

MIT License - see [LICENSE](LICENSE) for details.
