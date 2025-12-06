# Blockly Module Usage Examples

Comprehensive examples for using the Blockly type definitions and configuration.

## Basic Usage

### Import Types and Config

```typescript
import {
	type ExecutorState,
	type ExecutionLanguage,
	type OutputLine,
	type BlocklyWorkspaceState,
	type CodeGenerationResult,
	type ExecutionContext,
	BLOCKLY_CONFIG,
	ERROR_MESSAGES,
	LOADING_STAGES,
	STANDARD_TOOLBOX
} from '$lib/shared/blockly';
```

## State Management

### Track Executor State

```typescript
import { type ExecutorState } from '$lib/shared/blockly';

class BlocklyExecutor {
	private state = $state<ExecutorState>('initial');

	async initialize() {
		this.state = 'ready';
	}

	async execute() {
		if (this.state !== 'ready') {
			throw new Error('Executor not ready');
		}
		this.state = 'executing';
		try {
			// Execute code...
			this.state = 'ready';
		} catch (error) {
			this.state = 'error';
		}
	}
}
```

## Output Handling

### Capture Execution Output

```typescript
import { type OutputLine, BLOCKLY_CONFIG } from '$lib/shared/blockly';

class OutputManager {
	private lines = $state<OutputLine[]>([]);

	addOutput(text: string, type: 'stdout' | 'stderr' = 'stdout') {
		const line: OutputLine = {
			type,
			text,
			timestamp: Date.now()
		};

		this.lines.push(line);

		// Enforce output limit
		if (this.lines.length > BLOCKLY_CONFIG.MAX_OUTPUT_LINES) {
			this.lines = this.lines.slice(-BLOCKLY_CONFIG.MAX_OUTPUT_LINES);
		}
	}

	addInfo(text: string) {
		this.lines.push({
			type: 'info',
			text,
			timestamp: Date.now()
		});
	}

	clear() {
		this.lines = [];
	}
}
```

## Code Generation

### Generate Code from Workspace

```typescript
import {
	type CodeGenerationResult,
	type ExecutionLanguage,
	BLOCKLY_CONFIG,
	ERROR_MESSAGES
} from '$lib/shared/blockly';
import * as Blockly from 'blockly';

function generateCode(
	workspace: Blockly.WorkspaceSvg,
	language: ExecutionLanguage
): CodeGenerationResult {
	try {
		const generator = language === 'javascript' ? javascriptGenerator : pythonGenerator;

		const code = generator.workspaceToCode(workspace);
		const blockCount = workspace.getAllBlocks(false).length;

		// Check code length
		if (code.length > BLOCKLY_CONFIG.MAX_CODE_LENGTH) {
			return {
				code: '',
				language,
				success: false,
				error: ERROR_MESSAGES.CODE_TOO_LONG,
				blockCount
			};
		}

		return {
			code,
			language,
			success: true,
			blockCount
		};
	} catch (error) {
		return {
			code: '',
			language,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			blockCount: 0
		};
	}
}
```

## Workspace Persistence

### Save and Load Workspace State

```typescript
import { type BlocklyWorkspaceState, type ExecutionLanguage } from '$lib/shared/blockly';
import * as Blockly from 'blockly';

class WorkspaceStateManager {
	saveState(workspace: Blockly.WorkspaceSvg, language: ExecutionLanguage): BlocklyWorkspaceState {
		const xml = Blockly.Xml.workspaceToDom(workspace);
		const xmlText = Blockly.Xml.domToText(xml);
		const blocks = workspace.getAllBlocks(false);

		return {
			xml: xmlText,
			lastModified: Date.now(),
			language,
			metadata: {
				blockCount: blocks.length,
				scale: workspace.scale,
				scrollX: workspace.scrollX,
				scrollY: workspace.scrollY
			}
		};
	}

	loadState(workspace: Blockly.WorkspaceSvg, state: BlocklyWorkspaceState): void {
		try {
			workspace.clear();
			const xml = Blockly.utils.xml.textToDom(state.xml);
			Blockly.Xml.domToWorkspace(xml, workspace);

			// Restore viewport
			if (state.metadata) {
				if (state.metadata.scale) {
					workspace.setScale(state.metadata.scale);
				}
				if (state.metadata.scrollX !== undefined && state.metadata.scrollY !== undefined) {
					workspace.scroll(state.metadata.scrollX, state.metadata.scrollY);
				}
			}
		} catch (error) {
			console.error('Failed to load workspace state:', error);
			throw new Error(ERROR_MESSAGES.WORKSPACE_LOAD_FAILED);
		}
	}
}
```

## JavaScript Execution

### Execute JavaScript with Timeout

```typescript
import {
	type OutputLine,
	BLOCKLY_CONFIG,
	ERROR_MESSAGES,
	CODE_TEMPLATES
} from '$lib/shared/blockly';

async function executeJavaScript(code: string): Promise<{ output: OutputLine[]; error?: string }> {
	const output: OutputLine[] = [];
	const startTime = Date.now();

	// Wrap code with output capture
	const wrappedCode = CODE_TEMPLATES.JAVASCRIPT_WRAPPER.replace('%CODE%', code);

	try {
		// Create timeout promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('timeout')), BLOCKLY_CONFIG.JS_TIMEOUT_MS);
		});

		// Execute with timeout
		const result = await Promise.race([Promise.resolve(eval(wrappedCode)), timeoutPromise]);

		// Process result
		if (result && result.output) {
			result.output.forEach((line: string) => {
				output.push({
					type: 'stdout',
					text: line,
					timestamp: Date.now()
				});
			});
		}

		if (!result.success && result.error) {
			return {
				output,
				error: result.error
			};
		}

		return { output };
	} catch (error) {
		if (error instanceof Error && error.message === 'timeout') {
			return {
				output,
				error: ERROR_MESSAGES.TIMEOUT_JS
			};
		}

		return {
			output,
			error: error instanceof Error ? error.message : ERROR_MESSAGES.EXECUTION_ERROR
		};
	}
}
```

## Python Execution (via Pyodide)

### Execute Python Code

```typescript
import { type OutputLine, BLOCKLY_CONFIG, ERROR_MESSAGES } from '$lib/shared/blockly';

async function executePython(
	code: string,
	pyodideWorker: Worker
): Promise<{ output: OutputLine[]; error?: string }> {
	const output: OutputLine[] = [];
	const executionId = crypto.randomUUID();

	return new Promise((resolve) => {
		const timeout = setTimeout(() => {
			resolve({
				output,
				error: ERROR_MESSAGES.TIMEOUT_PYTHON
			});
		}, BLOCKLY_CONFIG.PYTHON_TIMEOUT_MS);

		const messageHandler = (event: MessageEvent) => {
			const message = event.data;

			if (message.id !== executionId) return;

			switch (message.type) {
				case 'stdout':
					output.push({
						type: 'stdout',
						text: message.data,
						timestamp: Date.now()
					});
					break;

				case 'stderr':
					output.push({
						type: 'stderr',
						text: message.data,
						timestamp: Date.now()
					});
					break;

				case 'error':
					clearTimeout(timeout);
					pyodideWorker.removeEventListener('message', messageHandler);
					resolve({
						output,
						error: message.message
					});
					break;

				case 'complete':
					clearTimeout(timeout);
					pyodideWorker.removeEventListener('message', messageHandler);
					resolve({ output });
					break;
			}
		};

		pyodideWorker.addEventListener('message', messageHandler);
		pyodideWorker.postMessage({
			type: 'execute',
			code,
			id: executionId
		});
	});
}
```

## Loading Progress

### Display Loading Stages

```typescript
import { LOADING_STAGES, LoadingStageIndex } from '$lib/shared/blockly';

class LoadingProgressManager {
	private currentStage = $state<number>(0);

	get progress() {
		return LOADING_STAGES[this.currentStage];
	}

	nextStage() {
		if (this.currentStage < LOADING_STAGES.length - 1) {
			this.currentStage++;
		}
	}

	setStage(index: LoadingStageIndex) {
		this.currentStage = index;
	}

	reset() {
		this.currentStage = 0;
	}

	isComplete() {
		return this.currentStage === LoadingStageIndex.READY;
	}
}

// Usage in component
const progressManager = new LoadingProgressManager();

async function initializeBlockly() {
	progressManager.setStage(LoadingStageIndex.INITIALIZING);
	// Initialize...

	progressManager.setStage(LoadingStageIndex.LOADING_BLOCKLY);
	// Load Blockly...

	progressManager.setStage(LoadingStageIndex.INITIALIZING_WORKSPACE);
	// Create workspace...

	progressManager.setStage(LoadingStageIndex.READY);
}
```

## Workspace Configuration

### Initialize Workspace with Standard Toolbox

```typescript
import { DEFAULT_WORKSPACE_OPTIONS, STANDARD_TOOLBOX, ERROR_MESSAGES } from '$lib/shared/blockly';
import * as Blockly from 'blockly';

function createWorkspace(container: HTMLElement): Blockly.WorkspaceSvg {
	try {
		const workspace = Blockly.inject(container, {
			...DEFAULT_WORKSPACE_OPTIONS,
			toolbox: STANDARD_TOOLBOX
		});

		return workspace;
	} catch (error) {
		console.error('Failed to create workspace:', error);
		throw new Error(ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED);
	}
}
```

## Complete Example: Blockly Editor Component

```typescript
import {
	type ExecutorState,
	type ExecutionLanguage,
	type OutputLine,
	type CodeGenerationResult,
	BLOCKLY_CONFIG,
	ERROR_MESSAGES,
	LOADING_STAGES,
	STANDARD_TOOLBOX,
	DEFAULT_WORKSPACE_OPTIONS
} from '$lib/shared/blockly';
import * as Blockly from 'blockly';

class BlocklyEditor {
	private workspace: Blockly.WorkspaceSvg | null = null;
	private state = $state<ExecutorState>('initial');
	private language = $state<ExecutionLanguage>('javascript');
	private output = $state<OutputLine[]>([]);
	private generatedCode = $state<string>('');

	async initialize(container: HTMLElement) {
		try {
			this.workspace = Blockly.inject(container, {
				...DEFAULT_WORKSPACE_OPTIONS,
				toolbox: STANDARD_TOOLBOX
			});

			this.workspace.addChangeListener(() => {
				this.generateCode();
			});

			this.state = 'ready';
		} catch (error) {
			this.state = 'error';
			throw new Error(ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED);
		}
	}

	private generateCode() {
		if (!this.workspace) return;

		try {
			const result = this.generateCodeFromWorkspace();
			if (result.success) {
				this.generatedCode = result.code;
			} else {
				this.addOutput(result.error || ERROR_MESSAGES.CODE_GENERATION_FAILED, 'stderr');
			}
		} catch (error) {
			this.addOutput(ERROR_MESSAGES.CODE_GENERATION_FAILED, 'stderr');
		}
	}

	private generateCodeFromWorkspace(): CodeGenerationResult {
		if (!this.workspace) {
			return {
				code: '',
				language: this.language,
				success: false,
				error: ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED,
				blockCount: 0
			};
		}

		// Implementation similar to examples above
		return {
			code: '',
			language: this.language,
			success: true,
			blockCount: 0
		};
	}

	private addOutput(text: string, type: 'stdout' | 'stderr' | 'info' = 'stdout') {
		this.output.push({
			type,
			text,
			timestamp: Date.now()
		});

		if (this.output.length > BLOCKLY_CONFIG.MAX_OUTPUT_LINES) {
			this.output = this.output.slice(-BLOCKLY_CONFIG.MAX_OUTPUT_LINES);
		}
	}

	setLanguage(lang: ExecutionLanguage) {
		this.language = lang;
		this.generateCode();
	}

	async execute() {
		if (this.state !== 'ready') {
			throw new Error('Editor not ready');
		}

		this.state = 'executing';
		this.output = [];

		try {
			if (this.language === 'javascript') {
				await this.executeJavaScript();
			} else {
				await this.executePython();
			}
			this.state = 'ready';
		} catch (error) {
			this.state = 'error';
			this.addOutput(
				error instanceof Error ? error.message : ERROR_MESSAGES.EXECUTION_ERROR,
				'stderr'
			);
		}
	}

	private async executeJavaScript() {
		// Implementation...
	}

	private async executePython() {
		// Implementation...
	}

	clear() {
		this.workspace?.clear();
		this.output = [];
		this.generatedCode = '';
	}

	dispose() {
		this.workspace?.dispose();
		this.workspace = null;
	}
}
```

## Error Handling

### Display User-Friendly Errors

```typescript
import { ERROR_MESSAGES } from '$lib/shared/blockly';
import { toaster } from '$lib/stores/toaster.svelte';

function handleBlocklyError(error: unknown) {
	let message = ERROR_MESSAGES.EXECUTION_ERROR;

	if (error instanceof Error) {
		// Map specific errors to user messages
		if (error.message.includes('timeout')) {
			message = ERROR_MESSAGES.TIMEOUT_JS;
		} else if (error.message.includes('workspace')) {
			message = ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED;
		}
	}

	toaster.error(message);
}
```

## Type Guards

### Check Language Type

```typescript
import { type ExecutionLanguage } from '$lib/shared/blockly';

function isValidLanguage(lang: string): lang is ExecutionLanguage {
	return lang === 'javascript' || lang === 'python';
}

function setLanguage(lang: string) {
	if (isValidLanguage(lang)) {
		// TypeScript knows lang is ExecutionLanguage
		executeWithLanguage(lang);
	}
}

function executeWithLanguage(lang: ExecutionLanguage) {
	// Implementation...
}
```
