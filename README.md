# UbuMaths

An educational math application built by a math teacher for students, featuring interactive mathematical input and rendering.

## Features

- Interactive mathematical formula editor powered by **MathLive**
- Modern responsive UI with **Tailwind CSS 4**
- Built with **Svelte 5** and **SvelteKit**
- Full TypeScript support
- **Standardized logging system** with color-coded severity levels and threshold filtering

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
│   └── utils/       # Utility functions including logger
├── app.html         # HTML template
└── app.css          # Global styles
```

## Logging System

The application includes a standardized logging system for development debugging:

### Features

- **4 Severity Levels**: `trace` (0) < `info` (1) < `warn` (2) < `error` (3)
- **Color-Coded Output**:
  - 🔴 **Red** for errors
  - 🟠 **Orange** for warnings
  - 🔵 **Blue** for info
  - ⚪ **Normal** for trace
- **File Prefix**: Shows `[filename]` for each log message
- **Threshold Filtering**: Set minimum log level (default: `info`)
- **Environment-Aware**:
  - Browser: Styled console output in Chrome DevTools
  - Server: ANSI colored output with timestamps in VSCode terminal
- **Production Safe**: Automatically disabled in production mode

### Usage

```typescript
import { createLogger } from '$lib/utils/logger';

// Default threshold (info) - trace messages suppressed
const logger = createLogger('MyComponent.svelte');

logger.trace('Detailed debug info');  // Not displayed (below threshold)
logger.info('User action');           // ✅ Displayed
logger.warn('Potential issue');       // ✅ Displayed
logger.error('Error occurred');       // ✅ Displayed

// Custom threshold for debugging
const debugLogger = createLogger('Debug.svelte', 'trace');
debugLogger.trace('Now visible');     // ✅ Displayed (trace threshold)

// Production-like (errors only)
const prodLogger = createLogger('Service.ts', 'error');
prodLogger.info('Info message');      // Not displayed (below error threshold)
prodLogger.error('Critical error');   // ✅ Displayed
```

### Server Output Format

```
4:55:51 PM [server/auth.ts] User verified: user@example.com
4:55:52 PM [+layout.ts] Loading, isBrowser: false
```

### Demo

Visit the main page to see an interactive demo of the logging system with examples of all threshold levels.

## License

Created for educational purposes.
