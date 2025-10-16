# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MathGraph32 is a free, multiplatform software for geometry, analysis, and mathematical simulation by Yves Biton. It's a JavaScript application that creates and animates dynamic mathematical figures in the browser.

The project has multiple build targets:
- **Web version** (standard online version)
- **PWA** (Progressive Web App for offline use)
- **Electron app** (desktop application)
- **Portable version** (single-file HTML)
- **CLI version** (command-line interface for figure conversion)

## Development Commands

### Setup

Install dependencies (requires Node.js >=18):
```bash
pnpm install
```

### Development Workflows

**Standard development** (with hot reload):
```bash
pnpm start
# Opens http://localhost:8082/ with automatic reload on code changes
```

**HTTPS development** (for features requiring secure context like clipboard):
```bash
# Terminal 1: Build with watch mode
pnpm build-watch

# Terminal 2: Start HTTPS server
pnpm start-secure
# Opens https://localhost:4433/editeur.html or https://localhost:4433/player.html
# Manual page refresh required after code changes
```

**PWA development**:
```bash
# Terminal 1: Build PWA
pnpm build-pwa-dev

# Terminal 2: Start PWA server
pnpm start-pwa-dev
# Opens https://localhost:4433/
# Refresh browser TWICE after rebuilding
```

For non-localhost IPs:
```bash
HOST=192.168.x.y PORT=4433 pnpx https-localhost docroot
```

### Building

```bash
pnpm build              # Standard web build → docroot/
pnpm build-pwa          # PWA build
pnpm build-electron     # Electron build
pnpm build-portable     # Portable single-file build
pnpm build-cli          # CLI version
```

### Testing and Linting

```bash
pnpm test               # Run vitest tests
pnpm lint               # Run ESLint with auto-fix
```

### Documentation

```bash
pnpm build-types        # Generate dist/types.d.ts for TypeScript definitions
pnpm doc                # Generate documentation
pnpm doc-full           # Full documentation
pnpm doc-loading        # Loading API documentation
```

## Architecture

### Core Application Classes

**MtgAppBase** (`src/MtgAppBase.js`, ~3300 lines): Base class providing core functionality for managing mathematical figures, SVG rendering, and document state.

**MtgApp** (`src/MtgApp.js`, ~2100 lines): Editor application class extending MtgAppBase. Handles figure creation, modification, and full editing capabilities.

**MtgAppLecteur** (`src/MtgAppLecteur.js`, ~1800 lines): Player/viewer application class for displaying and interacting with existing figures (read-only mode with limited interactions like dragging points).

**mtgLoad** (`src/mtgLoad.js`): Main entry point and loader. Manages dynamic imports, figure loading queues, and initialization of editor or player instances.

### Directory Structure

- `src/objets/` - Mathematical object classes (points, lines, circles, polygons, etc.)
- `src/objetsAdd/` - Additional mathematical objects
- `src/outils/` - Tools for creating/manipulating objects
- `src/dialogs/` - Dialog classes for UI interactions
- `src/interface/` - UI components (buttons, panels, toolbars)
- `src/kernel/` - Core utilities (DOM helpers, calculations, constants)
- `src/types/` - Type definitions and enumerations
- `src/entreesSorties/` - Input/output streams for serialization
- `src/api/` - Public API for programmatic usage
- `src/textes/` - Internationalized text strings
- `src/pwa/` - PWA-specific files (manifest, service worker)
- `src/start/` - Development-only startup code
- `public/` - Static HTML files for different use cases

### Custom HTML Elements

`src/mathgraphElements.js` defines custom HTML elements for embedding figures:
- `<mathgraph-player>` - Embeds a player figure
- `<mathgraph-editor>` - Embeds an editor

These are loaded independently (not via Vite) and compressed with Terser. Use ES2017 syntax maximum.

### Build System (Vite)

Configuration in `vite.config.js`:
- Multiple build modes controlled by environment variables (CLI, ELECTRON, PORTABLE, PWA, DEV)
- Custom plugins for dependency bundling, post-build processing
- Manual chunk splitting for vendor libraries (jQuery, jQuery UI, etc.)
- Legacy browser support via `@vitejs/plugin-legacy`

Pre-build: `scripts/buildDependencies.js` generates factory.js and mtgLoad.dependencies.js

Post-build: `scripts/postBuild.js` finalizes build and compresses mathgraphElements

### Key Patterns

**Figure Serialization**: Figures are stored as base64-encoded binary data. Classes use `DataInputStream`/`DataOutputStream` for serialization.

**Dynamic Loading**: The application uses dynamic imports heavily to reduce initial bundle size. The loading queue system (`src/kernel/Queue.js`) prevents race conditions when loading multiple figures on one page.

**Internationalization**: Text strings are in `src/textes/` with language-specific files. Use `getStr()` from `src/kernel/kernel.js` to retrieve localized strings.

**Object Factory Pattern**: Mathematical objects are created via factory functions based on type constants (`NatObj`, `NatCal` enums).

## Special Considerations

### Node Version Issue

If you encounter `ERR_OSSL_EVP_UNSUPPORTED` during build with recent Node versions:
```bash
export NODE_OPTIONS=--openssl-legacy-provider
```

### Type Generation

TypeScript definitions are generated using `tsd-jsdoc` (unmaintained but functional with a patch). The project attempted to use TypeScript compiler but JSDoc type generation was insufficient. A patch is automatically applied via pnpm after install.

### Browser Compatibility

- Main application requires ES2017+ support
- `src/mtgLoad.preload.js` is ES5 for maximum compatibility
- PWA requires browser support for custom elements and service workers

### Development Tools

ESLint configuration uses `neostandard` (replacement for eslint-config-standard with ESLint 9 support). Custom rules enforce single-line imports via `eslint-plugin-import-newlines`.

## Common File Types

- `.html` files in `public/` - Entry points for different use cases (editeur.html, player.html, etc.)
- `.js` files - ES modules using modern JavaScript features
- `.css` files in `css/` - Styling (imported in JS files)
- `.mgr` files - MathGraph figure format (base64 encoded)

## Testing

Tests are in `test/` directory using Vitest with Happy DOM. Run individual test files with:
```bash
pnpm test -- test/kernel/Queue.test.js
```
