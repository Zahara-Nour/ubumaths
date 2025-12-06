# Blockly Module - Quick Reference

Fast reference for common patterns and constants.

## Import

```typescript
import {
	// Types
	type ExecutorState,
	type ExecutionLanguage,
	type OutputLine,
	type BlocklyWorkspaceState,
	type CodeGenerationResult,
	type ExecutionContext,
	type WorkspaceOptions,

	// Enums
	LoadingStageIndex,

	// Config
	BLOCKLY_CONFIG,
	LOADING_STAGES,
	DEFAULT_WORKSPACE_OPTIONS,
	ERROR_MESSAGES,
	CODE_TEMPLATES,
	DISPLAY_CONFIG,

	// Toolbox
	STANDARD_TOOLBOX,
	type ToolboxDefinition
} from '$lib/shared/blockly';
```

## Types Cheat Sheet

```typescript
// State: 'initial' | 'ready' | 'executing' | 'error'
let state: ExecutorState = 'ready';

// Language: 'javascript' | 'python'
let lang: ExecutionLanguage = 'javascript';

// Output line
const line: OutputLine = {
	type: 'stdout', // 'stdout' | 'stderr' | 'info'
	text: 'Hello',
	timestamp: Date.now() // optional
};

// Workspace state
const workspace: BlocklyWorkspaceState = {
	xml: '<xml></xml>',
	lastModified: Date.now(),
	language: 'javascript',
	metadata: {
		// optional
		blockCount: 5,
		scale: 1.0,
		scrollX: 0,
		scrollY: 0
	}
};

// Code generation result
const result: CodeGenerationResult = {
	code: 'console.log("test");',
	language: 'javascript',
	success: true,
	blockCount: 3,
	error: undefined, // optional
	warnings: [] // optional
};

// Execution context
const ctx: ExecutionContext = {
	id: 'exec-123',
	language: 'javascript',
	jsTimeout: 10000,
	pythonTimeout: 30000,
	maxOutputLines: 1000,
	createdAt: Date.now()
};
```

## Constants

```typescript
// Timeouts
BLOCKLY_CONFIG.JS_TIMEOUT_MS; // 10,000 (10s)
BLOCKLY_CONFIG.PYTHON_TIMEOUT_MS; // 30,000 (30s)

// Limits
BLOCKLY_CONFIG.MAX_CODE_LENGTH; // 100,000 chars
BLOCKLY_CONFIG.MAX_OUTPUT_LINES; // 1,000 lines
BLOCKLY_CONFIG.MAX_BLOCKS; // 0 (unlimited)

// UI
BLOCKLY_CONFIG.CODE_GEN_DEBOUNCE_MS; // 300ms
```

## Error Messages (French)

```typescript
ERROR_MESSAGES.TIMEOUT_JS; // "L'execution JavaScript..."
ERROR_MESSAGES.TIMEOUT_PYTHON; // "L'execution Python..."
ERROR_MESSAGES.CODE_TOO_LONG; // "Le code genere depasse..."
ERROR_MESSAGES.TOO_MANY_OUTPUT_LINES; // "Trop de lignes..."
ERROR_MESSAGES.EXECUTION_ERROR; // "Erreur lors de l'execution..."
ERROR_MESSAGES.CODE_GENERATION_FAILED; // "Echec de la generation..."
ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED; // "L'espace de travail..."
ERROR_MESSAGES.BLOCKLY_NOT_LOADED; // "Blockly n'est pas charge"
ERROR_MESSAGES.INVALID_LANGUAGE; // "Langage non supporte"
ERROR_MESSAGES.MAX_BLOCKS_REACHED; // "Nombre maximum de blocs..."
ERROR_MESSAGES.WORKSPACE_LOAD_FAILED; // "Echec du chargement..."
```

## Loading Stages

```typescript
// Access by index
LoadingStageIndex.INITIALIZING; // 0
LoadingStageIndex.LOADING_BLOCKLY; // 1
LoadingStageIndex.INITIALIZING_WORKSPACE; // 2
LoadingStageIndex.READY; // 3

// Get stage info
LOADING_STAGES[0]; // { percent: 0, stage: 'Initialisation...' }
LOADING_STAGES[1]; // { percent: 33, stage: 'Chargement de Blockly...' }
LOADING_STAGES[2]; // { percent: 66, stage: "Initialisation de l'espace de travail..." }
LOADING_STAGES[3]; // { percent: 100, stage: 'Pret !' }
```

## Common Patterns

### Output Management

```typescript
const output: OutputLine[] = [];

// Add stdout
output.push({ type: 'stdout', text: 'Hello' });

// Add stderr
output.push({ type: 'stderr', text: 'Error!' });

// Add info
output.push({ type: 'info', text: 'Loading...' });

// Enforce limit
if (output.length > BLOCKLY_CONFIG.MAX_OUTPUT_LINES) {
	output = output.slice(-BLOCKLY_CONFIG.MAX_OUTPUT_LINES);
}
```

### State Transitions

```typescript
let state: ExecutorState = 'initial';

// Initialize
state = 'ready';

// Execute
state = 'executing';
try {
	// run code...
	state = 'ready';
} catch {
	state = 'error';
}
```

### Language Selection

```typescript
let language: ExecutionLanguage = 'javascript';

const timeout =
	language === 'javascript' ? BLOCKLY_CONFIG.JS_TIMEOUT_MS : BLOCKLY_CONFIG.PYTHON_TIMEOUT_MS;

const errorMsg =
	language === 'javascript' ? ERROR_MESSAGES.TIMEOUT_JS : ERROR_MESSAGES.TIMEOUT_PYTHON;
```

### Workspace Initialization

```typescript
import * as Blockly from 'blockly';

const workspace = Blockly.inject(container, {
	...DEFAULT_WORKSPACE_OPTIONS,
	toolbox: STANDARD_TOOLBOX
});
```

### Code Generation

```typescript
function generateCode(
	workspace: Blockly.WorkspaceSvg,
	language: ExecutionLanguage
): CodeGenerationResult {
	try {
		const code = generator.workspaceToCode(workspace);
		const blocks = workspace.getAllBlocks(false);

		if (code.length > BLOCKLY_CONFIG.MAX_CODE_LENGTH) {
			return {
				code: '',
				language,
				success: false,
				error: ERROR_MESSAGES.CODE_TOO_LONG,
				blockCount: blocks.length
			};
		}

		return {
			code,
			language,
			success: true,
			blockCount: blocks.length
		};
	} catch (error) {
		return {
			code: '',
			language,
			success: false,
			error: ERROR_MESSAGES.CODE_GENERATION_FAILED,
			blockCount: 0
		};
	}
}
```

## Code Templates

```typescript
// JavaScript wrapper
const wrapped = CODE_TEMPLATES.JAVASCRIPT_WRAPPER.replace('%CODE%', code);

// Python setup
const pythonCode = CODE_TEMPLATES.PYTHON_SETUP + '\n' + userCode;
```

## Display Config

```typescript
DISPLAY_CONFIG.MAX_LINE_LENGTH; // 1000 chars
DISPLAY_CONFIG.TRUNCATION_SUFFIX; // '...'
DISPLAY_CONFIG.DEFAULT_HIGHLIGHT_LANGUAGE; // 'javascript'
DISPLAY_CONFIG.OUTPUT_PANEL_HEIGHT; // '300px'
```

## Toolbox

```typescript
// Standard toolbox with French categories
STANDARD_TOOLBOX.contents // Array of categories:
// - Logique (Logic)
// - Boucles (Loops)
// - Math
// - Texte (Text)
// - Listes (Lists)
// - Variables
// - Fonctions (Functions)

// Type for custom toolboxes
const customToolbox: ToolboxDefinition = {
  kind: 'categoryToolbox',
  contents: [...]
};
```

## Type Guards

```typescript
function isValidLanguage(lang: string): lang is ExecutionLanguage {
	return lang === 'javascript' || lang === 'python';
}

function isValidOutputType(type: string): type is OutputLineType {
	return type === 'stdout' || type === 'stderr' || type === 'info';
}
```

## Svelte Integration

```typescript
import { type ExecutorState, type OutputLine } from '$lib/shared/blockly';

class BlocklyStore {
	state = $state<ExecutorState>('initial');
	output = $state<OutputLine[]>([]);
	language = $state<ExecutionLanguage>('javascript');

	addOutput(text: string, type: OutputLineType = 'stdout') {
		this.output.push({ type, text, timestamp: Date.now() });

		if (this.output.length > BLOCKLY_CONFIG.MAX_OUTPUT_LINES) {
			this.output = this.output.slice(-BLOCKLY_CONFIG.MAX_OUTPUT_LINES);
		}
	}
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { BLOCKLY_CONFIG, ERROR_MESSAGES } from '$lib/shared/blockly';

describe('Blockly', () => {
	it('should have correct timeout', () => {
		expect(BLOCKLY_CONFIG.JS_TIMEOUT_MS).toBe(10_000);
	});

	it('should have French errors', () => {
		expect(ERROR_MESSAGES.TIMEOUT_JS).toContain('JavaScript');
	});
});
```

---

**See Also**:

- [README.md](./README.md) - Full documentation
- [EXAMPLES.md](./EXAMPLES.md) - Comprehensive examples
