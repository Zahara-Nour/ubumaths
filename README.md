# UbuMaths

An educational math application built by a math teacher for students, featuring interactive mathematical input and rendering.

## Features

- Interactive mathematical formula editor powered by **MathLive**
- Modern responsive UI with **Tailwind CSS 4**
- Built with **Svelte 5** and **SvelteKit**
- Full TypeScript support

## Tech Stack

- [Svelte 5](https://svelte.dev/) - Modern reactive framework with runes
- [SvelteKit](https://kit.svelte.dev/) - Full-stack framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first styling
- [MathLive](https://cortexjs.io/mathlive/) - Mathematical input and rendering
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E testing

## Prerequisites

- Node.js 18+
- pnpm (recommended package manager)

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm check            # Run svelte-check for type checking
pnpm check:watch      # Watch mode for type checking
pnpm lint             # Run prettier and eslint checks
pnpm format           # Format code with prettier
pnpm test             # Run all tests (unit + e2e)
pnpm test:unit        # Run Vitest unit tests
pnpm test:e2e         # Run Playwright e2e tests
```

## Testing

The project uses a dual-project Vitest setup:

- **Client tests** (`*.svelte.test.ts`) - Run in browser environment for component testing
- **Server tests** (`*.test.ts`) - Run in Node environment for server-side logic
- **E2E tests** (`e2e/*.spec.ts`) - Full application testing with Playwright

## Deployment

Configured for deployment on [Vercel](https://vercel.com/) using `@sveltejs/adapter-vercel`.

## Project Structure

```
src/
├── routes/          # SvelteKit file-based routes
├── lib/             # Reusable components and utilities ($lib alias)
├── app.html         # HTML template
└── app.css          # Global styles
```

## License

Created for educational purposes.
