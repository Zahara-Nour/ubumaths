# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is an educational math application created by a math teacher for their students. It makes heavy use of **MathLive** for mathematical input and rendering.

SvelteKit application built with:

- **Svelte 5** (latest with runes)
- **TypeScript** (strict mode enabled)
- **Tailwind CSS 4** (integrated via Vite plugin)
- **MathLive** (mathematical formula editor and rendering)
- **Vercel** deployment (adapter configured)
- **pnpm** as package manager

## Development Commands

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

## Testing Architecture

The project uses a **dual-project Vitest setup** with separate configurations for client and server code:

### Client Tests (`*.svelte.test.ts` or `*.svelte.spec.ts`)

- Run in **browser environment** using Playwright provider
- Located anywhere in `src/` except `src/lib/server/`
- Setup file: `vitest-setup-client.ts`
- Use for: Component tests, Svelte-specific logic, browser APIs

### Server Tests (`*.test.ts` or `*.spec.ts`)

- Run in **Node environment**
- Excludes `*.svelte.*` test files
- Use for: Server-side logic, API routes, utilities

### E2E Tests

- Located in `e2e/` directory
- Run with Playwright against production build
- Port 4173 (production preview server)

## Project Structure

- `src/routes/` - SvelteKit routes (file-based routing)
- `src/lib/` - Reusable components and utilities (accessible via `$lib` alias)
- `src/app.html` - HTML template
- `src/app.css` - Global styles
- `e2e/` - End-to-end tests

## Build Configuration

- **Adapter**: Vercel (`@sveltejs/adapter-vercel`)
- **Preprocessor**: `vitePreprocess()` for TypeScript/PostCSS support
- **Tailwind**: Integrated via `@tailwindcss/vite` plugin (v4 uses Vite instead of PostCSS)
- TypeScript config extends `.svelte-kit/tsconfig.json` (auto-generated)

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
