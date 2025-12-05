# Python Playground - Technical Guide

Complete technical documentation for the Python Playground feature in UbuMaths.

## Overview

The Python Playground is a browser-based Python execution environment that allows students to write and run Python code directly in the browser. It uses **Pyodide** (Python compiled to WebAssembly) running in a **Web Worker** for non-blocking execution.

### Key Features

- **Full Python 3.12+ support** via Pyodide v0.26.2
- **Lazy loading packages**: NumPy, Matplotlib, SymPy loaded on-demand
- **Interactive charts**: Plotly.js support for rich visualizations
- **CodeMirror 6 editor** with syntax highlighting and autocompletion
- **Intelligent autocompletion** via Pyodide introspection
- **Plot rendering**: Matplotlib figures as PNG and Plotly interactive charts
- **LaTeX rendering**: SymPy expressions via MathLive
- **Pedagogic error messages**: French translations for common errors
- **URL sharing**: LZ-String compressed code sharing
- **Cloud storage**: Save files to database (students & teachers)
- **File assignments**: Teachers can assign Python files to classes
- **Responsive design**: Mobile and desktop layouts
- **Persistent state**: localStorage + cloud storage for authenticated users

## Quick Links

| Document                          | Description                                |
| --------------------------------- | ------------------------------------------ |
| [Architecture](./architecture.md) | System design, data flow, technology stack |
| [Components](./components.md)     | Svelte 5 component documentation           |
| [Store](./store.md)               | Reactive state management                  |
| [Worker](./worker.md)             | Pyodide Web Worker implementation          |

## File Structure

```
src/
├── routes/(public)/python/
│   ├── +page.svelte                    # Route entry point
│   └── +page.server.ts                 # Server load (user data)
├── routes/api/python-files/
│   ├── +server.ts                      # GET (list), POST (create)
│   ├── [id]/
│   │   ├── +server.ts                  # GET, PUT, DELETE
│   │   └── assign/+server.ts           # POST (assign to class)
│   └── students/+server.ts             # GET (teacher view)
├── lib/
│   ├── components/python/
│   │   ├── PythonPlayground.svelte     # Main container
│   │   ├── PythonEditor.svelte         # CodeMirror 6 editor
│   │   ├── PythonToolbar.svelte        # Action buttons
│   │   ├── PythonOutput.svelte         # Results display
│   │   ├── PythonSplitter.svelte       # Resizable panels
│   │   ├── PythonSaveDialog.svelte     # Cloud save dialog
│   │   ├── PythonFileManager.svelte    # File list/management
│   │   └── PythonMigrationPrompt.svelte # localStorage migration
│   ├── stores/
│   │   └── pythonPlayground.svelte.ts  # Reactive store (+ cloud methods)
│   ├── server/validation/
│   │   └── python-files.ts             # Zod schemas for API
│   ├── workers/
│   │   └── pyodide.worker.ts           # Web Worker
│   └── types/
│       └── python-worker.ts            # TypeScript types
supabase/migrations/
└── 20251205100000_create_python_files.sql  # DB tables + RLS
```

## Technology Stack

| Technology | Version  | Purpose               |
| ---------- | -------- | --------------------- |
| Pyodide    | v0.26.2  | Python in WebAssembly |
| CodeMirror | v6.x     | Code editor           |
| LZ-String  | v1.5.0   | URL compression       |
| MathLive   | v0.107.1 | LaTeX rendering       |

### Python Packages

#### Standard Library

All Python 3.12 standard library modules available (loaded automatically).

#### Optional Packages (Lazy-Loaded)

- **NumPy** - Numerical computing (loaded on first use)
- **Matplotlib** - Plotting and visualization (loaded on first use)
- **SymPy** - Symbolic mathematics (loaded on first use)

#### Visualization

- **Plotly.js v2.27.0** - Interactive charts via CDN (loaded on first use)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         +page.svelte                             │
│                    (Route Entry Point)                           │
│                    - URL code loading                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PythonPlayground.svelte                       │
│                    (Main Container)                              │
│  - Layout management (mobile/desktop)                            │
│  - Fullscreen mode                                               │
│  - Event handlers                                                │
└───────┬─────────────┬─────────────┬─────────────┬───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│  Toolbar  │  │  Editor   │  │ Splitter  │  │  Output   │
│   .svelte │  │   .svelte │  │   .svelte │  │   .svelte │
└───────────┘  └─────┬─────┘  └───────────┘  └─────┬─────┘
                     │                              │
                     │    ┌──────────────────┐      │
                     └───►│  pythonStore     │◄─────┘
                          │  (Svelte 5 Store)│
                          └────────┬─────────┘
                                   │ postMessage
                                   ▼
                          ┌──────────────────┐
                          │ pyodide.worker   │
                          │ (Web Worker)     │
                          ├──────────────────┤
                          │ Pyodide v0.26.2  │
                          │ NumPy, Matplotlib│
                          │ SymPy            │
                          └──────────────────┘
```

## Execution Flow

### 1. Initialization

```
Page Load
    │
    ├── Load code from URL (if ?code= parameter exists)
    │
    └── onMount()
        │
        └── pythonStore.initPyodide()
            │
            └── Create Web Worker
                │
                └── Worker: loadPyodide()
                    │
                    ├── Download Python WASM (~15MB)
                    │
                    └── Load packages (numpy, matplotlib, sympy)
                        │
                        └── Send 'pyodide-ready' message
```

### 2. Code Execution

```
User clicks "Executer" or Ctrl+Enter
    │
    └── pythonStore.execute()
        │
        ├── Generate unique execution ID
        ├── Set state to 'executing'
        ├── Clear previous output
        ├── Set 30-second timeout
        │
        └── postMessage({ type: 'execute', code, id })
            │
            └── Worker: executeCode()
                │
                ├── Redirect stdout/stderr
                ├── Parse and execute code
                │
                └── Capture and send results:
                    ├── stdout → { type: 'stdout' }
                    ├── stderr → { type: 'stderr' }
                    ├── plots  → { type: 'plot' }
                    ├── sympy  → { type: 'latex' }
                    └── done   → { type: 'complete' }
```

### 3. Autocompletion

```
User types code
    │
    └── CodeMirror triggers completion
        │
        └── pythonStore.requestCompletion(code, cursor)
            │
            ├── Debounce (150ms)
            │
            └── postMessage({ type: 'autocomplete' })
                │
                └── Worker: Python introspection
                    │
                    └── { type: 'autocomplete-result' }
```

## Keyboard Shortcuts

| Shortcut                   | Action               |
| -------------------------- | -------------------- |
| `Ctrl+Enter` / `Cmd+Enter` | Execute code         |
| `Ctrl+S` / `Cmd+S`         | Save to localStorage |
| `Escape`                   | Exit fullscreen      |

## State Machine

```
┌─────────┐
│ initial │
└────┬────┘
     │ initPyodide()
     ▼
┌──────────────────┐
│ loading-pyodide  │
└────────┬─────────┘
         │ packages loaded
         ▼
┌──────────────────┐
│ loading-packages │
└────────┬─────────┘
         │ ready
         ▼
┌─────────┐ ◄──────────────┐
│  ready  │                │
└────┬────┘                │
     │ execute()           │
     ▼                     │
┌───────────┐              │
│ executing │──────────────┘
└─────┬─────┘  complete/error/timeout
      │
      │ fatal error
      ▼
┌─────────┐
│  error  │
└─────────┘
```

## localStorage Keys

| Key                          | Content                                   |
| ---------------------------- | ----------------------------------------- |
| `ubumaths-python-playground` | `{ code, showPedagogicErrors, fontSize }` |
| `ubumaths-python-splitter`   | Splitter position (20-80%)                |

## Configuration

```typescript
const PYODIDE_CONFIG = {
	CDN_URL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
	PACKAGES: ['numpy', 'matplotlib', 'sympy'],
	TIMEOUT_MS: 30000 // 30 seconds
};
```

## Testing

```bash
# Store tests (45 tests)
pnpm test:client src/lib/stores/pythonPlayground.svelte.test.ts

# Output component tests
pnpm test:client src/lib/components/python/PythonOutput.svelte.test.ts
```

## Security Considerations

1. **Sandboxed execution**: Code runs in Web Worker (separate thread)
2. **No file system access**: Pyodide virtual FS only
3. **No network access**: Python cannot make HTTP requests
4. **Timeout protection**: 30-second max execution
5. **Zod validation**: All worker messages are validated

## Performance Notes

### Initial Load Optimization

With lazy loading, the Python Playground is now much faster:

| Scenario             | Initial (MB) | Time  | Notes                 |
| -------------------- | ------------ | ----- | --------------------- |
| **Initial load**     | ~10          | 2-4s  | Pyodide + stdlib only |
| **First NumPy**      | +5           | +1-2s | Loaded on-demand      |
| **First Matplotlib** | +8           | +2-3s | Loaded on-demand      |
| **First Plotly**     | +3           | +1s   | CDN cached by browser |

**Previous approach**: ~26MB / 5-10s (all packages pre-loaded)

### Performance Features

1. **Lazy-loaded packages**: Only download what's needed
2. **Cached after first load**: Browser caches Pyodide and packages
3. **Web Worker**: Non-blocking main thread
4. **Debounced autocomplete**: 150ms delay
5. **Lazy-loaded CodeMirror**: Only loads when component mounts
6. **CDN Plotly**: Cached locally after first use
