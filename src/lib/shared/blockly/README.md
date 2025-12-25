# Blockly Module

Type definitions and configuration for the Blockly visual programming system in UbuMaths.

## Overview

This module provides TypeScript type definitions and constants for building a Blockly-based visual programming interface that supports both JavaScript and Python code generation and execution.

## Structure

```
blockly/
├── types.ts       # TypeScript type definitions
├── config.ts      # Configuration constants and error messages
├── index.ts       # Barrel exports
└── __tests__/
    └── types.test.ts  # Type and config tests
```

## Usage

```typescript
import {
	type ExecutorState,
	type ExecutionLanguage,
	type OutputLine,
	type BlocklyWorkspaceState,
	type CodeGenerationResult,
	BLOCKLY_CONFIG,
	ERROR_MESSAGES,
	LOADING_STAGES
} from '$lib/shared/blockly';

// Create an output line
const output: OutputLine = {
	type: 'stdout',
	text: 'Hello from Blockly!',
	timestamp: Date.now()
};

// Use configuration constants
const timeout =
	language === 'javascript' ? BLOCKLY_CONFIG.JS_TIMEOUT_MS : BLOCKLY_CONFIG.PYTHON_TIMEOUT_MS;

// Access error messages (French)
console.error(ERROR_MESSAGES.TIMEOUT_JS);
```

## Types

### Core Types

- **`ExecutorState`**: `'initial' | 'ready' | 'executing' | 'error'`

  - Lifecycle states for the Blockly executor

- **`ExecutionLanguage`**: `'javascript' | 'python'`

  - Supported code generation languages

- **`OutputLineType`**: `'stdout' | 'stderr' | 'info'`
  - Output classification types

### Data Structures

- **`OutputLine`**: Single line of execution output

  - `type`: Output classification
  - `text`: Line content
  - `timestamp?`: Optional timestamp

- **`BlocklyWorkspaceState`**: Workspace persistence state

  - `xml`: Workspace XML representation
  - `lastModified`: Modification timestamp
  - `language`: Selected language
  - `metadata?`: Optional workspace metadata

- **`CodeGenerationResult`**: Result of code generation

  - `code`: Generated source code
  - `language`: Target language
  - `success`: Generation status
  - `error?`: Error message if failed
  - `blockCount`: Number of blocks processed
  - `warnings?`: Warning messages

- **`ExecutionContext`**: Execution environment configuration

  - `id`: Unique execution ID
  - `language`: Target language
  - `jsTimeout`: JavaScript timeout (ms)
  - `pythonTimeout`: Python timeout (ms)
  - `maxOutputLines`: Output line limit
  - `createdAt`: Creation timestamp

- **`WorkspaceOptions`**: Blockly workspace configuration
  - `toolbox`: Toolbox definition (string or object)
  - `grid?`: Grid configuration
  - `zoom?`: Zoom controls
  - `trashcan?`: Enable trash can
  - `maxBlocks?`: Block count limit
  - `sounds?`: Enable sounds
  - `move?`: Movement controls

## Configuration

### `BLOCKLY_CONFIG`

Execution timeouts and limits:

- `JS_TIMEOUT_MS`: 10,000 (10 seconds for JavaScript)
- `PYTHON_TIMEOUT_MS`: 30,000 (30 seconds for Python via Pyodide)
- `MAX_CODE_LENGTH`: 100,000 characters
- `MAX_OUTPUT_LINES`: 1,000 lines
- `MAX_BLOCKS`: 0 (unlimited)
- `CODE_GEN_DEBOUNCE_MS`: 300ms

### `LOADING_STAGES`

Four loading stages with French messages:

1. Initialisation... (0%)
2. Chargement de Blockly... (33%)
3. Initialisation de l'espace de travail... (66%)
4. Pret ! (100%)

### `ERROR_MESSAGES`

French error messages for user-facing errors:

- `TIMEOUT_JS`: JavaScript execution timeout
- `TIMEOUT_PYTHON`: Python execution timeout
- `CODE_TOO_LONG`: Code length limit exceeded
- `TOO_MANY_OUTPUT_LINES`: Output line limit exceeded
- `EXECUTION_ERROR`: Code execution error
- `CODE_GENERATION_FAILED`: Code generation failure
- `WORKSPACE_NOT_INITIALIZED`: Workspace not initialized
- `BLOCKLY_NOT_LOADED`: Blockly library not loaded
- `INVALID_LANGUAGE`: Unsupported language
- `MAX_BLOCKS_REACHED`: Block count limit reached
- `WORKSPACE_LOAD_FAILED`: Workspace loading failure

### `CODE_TEMPLATES`

Code wrapping templates:

- `JAVASCRIPT_WRAPPER`: Wraps JS code with output capture
- `PYTHON_SETUP`: Python import statements

### `DEFAULT_WORKSPACE_OPTIONS`

Default Blockly workspace configuration with grid, zoom, and UI settings.

## Design Patterns

This module follows the same pattern as `src/lib/shared/python/`:

1. **Strict TypeScript**: All types use strict mode, no `any` types
2. **Const Assertions**: Configuration uses `as const` for literal types
3. **French Messages**: User-facing messages in French
4. **JSDoc Comments**: All exports documented in English
5. **Barrel Exports**: Central `index.ts` for clean imports

## Related Modules

- `src/lib/shared/python/`: Python execution (Pyodide) types and config
- Blockly library: https://developers.google.com/blockly

## Testing

Tests verify:

- Type definitions work correctly
- Configuration constants are immutable
- French error messages are present
- Loading stages have correct structure

Run tests:

```bash
pnpm test:server src/lib/shared/blockly/__tests__/types.test.ts
```
