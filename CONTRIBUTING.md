# Contributing to JTransfer Frontend

Thank you for your interest in contributing to JTransfer Frontend! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/jtransfer-front.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`

## Development

```bash
# Start development server
npm run dev

# Type check
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

## Code Style

- Use TypeScript for all new code
- Follow Svelte 5 patterns (use runes: `$state`, `$derived`, `$props`)
- Use semantic CSS classes from the design system
- Keep components focused and reusable

## Commit Messages

We follow conventional commits. Format your commit messages as:

```
type(scope): description

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
- `feat(upload): add drag and drop support`
- `fix(download): handle decryption errors gracefully`
- `docs(readme): update installation instructions`

## Pull Requests

1. Update documentation if needed
2. Make sure your code passes type checking (`npm run check`)
3. Write a clear PR description explaining your changes
4. Link any related issues

## Project Structure

```
src/
├── routes/           # SvelteKit pages
├── lib/
│   ├── api/          # API client
│   ├── components/   # Reusable components
│   ├── crypto/       # Encryption utilities
│   └── stores/       # Svelte stores
└── app.css           # Global styles
```

## Reporting Issues

When reporting issues, please include:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information

## Security

If you discover a security vulnerability, please do NOT open a public issue. Instead, email the maintainers directly.

## Questions?

Feel free to open an issue for any questions about contributing.
