# Code Generation Examples

Practical examples of using the Blockly code generation module.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Error Handling](#error-handling)
- [Safety Checks](#safety-checks)
- [Custom Wrapping](#custom-wrapping)
- [Working with Raw Code](#working-with-raw-code)

## Basic Usage

### Generate JavaScript Code

```typescript
import { generateCode } from '$lib/shared/blockly/generators';
import type { Blockly } from 'blockly';

function handleGenerate(workspace: Blockly.WorkspaceSvg) {
	const result = generateCode(workspace, 'javascript');

	if (result.success) {
		console.log(`Generated code with ${result.blockCount} blocks`);
		console.log(result.code);

		// Execute the code (in a worker for safety)
		executeInWorker(result.code);
	} else {
		console.error('Generation failed:', result.error);
	}
}
```

### Generate Python Code

```typescript
function handlePythonGenerate(workspace: Blockly.WorkspaceSvg) {
	const result = generateCode(workspace, 'python');

	if (result.success) {
		console.log(`Generated Python code with ${result.blockCount} blocks`);

		// Send to Pyodide worker
		executePythonInPyodide(result.code);
	}
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { generateCode } from '$lib/shared/blockly/generators';
import { toaster } from '$lib/stores/toaster.svelte';

async function generateAndExecute(
	workspace: Blockly.WorkspaceSvg,
	language: 'javascript' | 'python'
) {
	// Generate code
	const result = generateCode(workspace, language);

	// Handle generation failure
	if (!result.success) {
		toaster.error(`Erreur de génération: ${result.error}`);
		return;
	}

	// Check for empty workspace
	if (result.blockCount === 0) {
		toaster.warning("Aucun bloc dans l'espace de travail");
		return;
	}

	// Check for warnings
	if (result.warnings && result.warnings.length > 0) {
		result.warnings.forEach((warning) => {
			toaster.warning(warning);
		});
	}

	// Check for infinite loop
	if (result.hasInfiniteLoop) {
		const confirm = await showConfirmDialog(
			'Boucle infinie détectée',
			'Le code pourrait ne jamais se terminer. Continuer quand même ?'
		);
		if (!confirm) return;
	}

	// Execute the code
	try {
		await executeCode(result.code, language);
		toaster.success('Exécution réussie');
	} catch (error) {
		toaster.error(`Erreur d'exécution: ${error.message}`);
	}
}
```

## Safety Checks

### Pre-Generation Validation

```typescript
import {
	generateCode,
	validateJsCodeLength,
	detectJsInfiniteLoops
} from '$lib/shared/blockly/generators';
import { BLOCKLY_CONFIG } from '$lib/shared/blockly/config';

function safeGenerate(workspace: Blockly.WorkspaceSvg) {
	// Generate code
	const result = generateCode(workspace, 'javascript');

	if (!result.success) {
		return { error: result.error };
	}

	// Additional safety checks
	const checks = {
		hasCode: result.code.length > 0,
		withinLimit: validateJsCodeLength(result.code, BLOCKLY_CONFIG.MAX_CODE_LENGTH),
		hasInfiniteLoop: detectJsInfiniteLoops(result.code),
		blockCount: result.blockCount
	};

	if (!checks.withinLimit) {
		return { error: 'Code trop long (limite : 100 000 caractères)' };
	}

	if (checks.hasInfiniteLoop) {
		return {
			warning: 'Boucle infinie potentielle détectée',
			code: result.code,
			checks
		};
	}

	return { code: result.code, checks };
}
```

### Rate Limiting Code Generation

```typescript
import { debounce } from '$lib/utils/debounce';

class BlocklyEditor {
	private workspace: Blockly.WorkspaceSvg;
	private currentLanguage: 'javascript' | 'python' = 'javascript';

	// Debounce code generation to avoid excessive updates
	private generateDebounced = debounce(() => {
		this.regenerateCode();
	}, 300);

	private regenerateCode() {
		const result = generateCode(this.workspace, this.currentLanguage);

		if (result.success) {
			this.updateCodeDisplay(result.code);
			this.updateBlockCount(result.blockCount);

			if (result.warnings) {
				this.showWarnings(result.warnings);
			}
		}
	}

	// Call on workspace change
	onWorkspaceChange() {
		this.generateDebounced();
	}
}
```

## Custom Wrapping

### Adding Custom Helper Functions

```typescript
import { wrapJavaScriptCode, JS_MATH_HELPERS } from '$lib/shared/blockly/generators';

function wrapWithCustomHelpers(code: string): string {
	const customHelpers = `
// Custom math helpers
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
`;

	// Combine standard helpers with custom ones
	return `
(function() {
  'use strict';

  ${JS_MATH_HELPERS}
  ${customHelpers}

  const __output__ = [];
  const __console_log__ = console.log;
  console.log = function(...args) {
    __output__.push(args.join(' '));
  };

  try {
    ${code}
    return { success: true, output: __output__ };
  } catch (error) {
    return { success: false, error: error.message, output: __output__ };
  } finally {
    console.log = __console_log__;
  }
})();
  `.trim();
}
```

### Custom Python Imports

```typescript
import {
	wrapPythonCode,
	PYTHON_IMPORTS,
	PYTHON_MATH_HELPERS
} from '$lib/shared/blockly/generators';

function wrapPythonWithNumpy(code: string): string {
	return `
${PYTHON_IMPORTS}
import numpy as np

${PYTHON_MATH_HELPERS}

# Generated code
${code}
  `.trim();
}
```

## Working with Raw Code

### Display Code Without Execution Wrapper

```typescript
import { getRawCode } from '$lib/shared/blockly/generators';

// For display in code editor
function showCodeToUser(workspace: Blockly.WorkspaceSvg, language: 'javascript' | 'python') {
	const rawCode = getRawCode(workspace, language);

	// Show in syntax-highlighted editor
	codeEditor.setValue(rawCode);
	codeEditor.setLanguage(language);
}
```

### Count Active Blocks

```typescript
import { countExecutableBlocks } from '$lib/shared/blockly/generators';

function updateBlockCounter(workspace: Blockly.WorkspaceSvg) {
	const count = countExecutableBlocks(workspace);

	blockCounterElement.textContent = `${count} bloc${count > 1 ? 's' : ''}`;

	// Disable run button if no executable blocks
	runButton.disabled = count === 0;
}
```

### Generate from Saved XML

```typescript
import { generateCodeFromXml } from '$lib/shared/blockly/generators';

async function loadAndGenerate(workspaceId: string) {
	// Load workspace XML from database
	const { data } = await supabase
		.from('blockly_workspaces')
		.select('xml')
		.eq('id', workspaceId)
		.single();

	if (!data) {
		throw new Error('Workspace not found');
	}

	// Generate code from saved XML
	const result = generateCodeFromXml(data.xml, 'javascript');

	if (result.success) {
		console.log('Generated from saved workspace:', result.code);
		return result.code;
	} else {
		throw new Error(result.error);
	}
}
```

## Real-World Integration

### Complete Blockly Editor Component

```typescript
import { generateCode } from '$lib/shared/blockly/generators';
import { toaster } from '$lib/stores/toaster.svelte';

class BlocklyProgrammingInterface {
	private workspace: Blockly.WorkspaceSvg;
	private language = $state<'javascript' | 'python'>('javascript');
	private generatedCode = $state('');
	private isExecuting = $state(false);

	async executeCode() {
		if (this.isExecuting) return;

		// Generate code
		const result = generateCode(this.workspace, this.language);

		// Validate
		if (!result.success) {
			toaster.error(`Erreur: ${result.error}`);
			return;
		}

		if (result.blockCount === 0) {
			toaster.warning('Ajoutez des blocs pour commencer');
			return;
		}

		// Warn about infinite loops
		if (result.hasInfiniteLoop) {
			toaster.warning('Attention: boucle infinie potentielle');
		}

		// Store generated code
		this.generatedCode = result.code;

		// Execute
		this.isExecuting = true;
		try {
			if (this.language === 'javascript') {
				await this.executeJavaScript(result.code);
			} else {
				await this.executePython(result.code);
			}
			toaster.success('Exécution réussie');
		} catch (error) {
			toaster.error(`Erreur: ${error.message}`);
		} finally {
			this.isExecuting = false;
		}
	}

	private async executeJavaScript(code: string) {
		// Execute in worker
		const worker = new Worker('/workers/js-executor.js');

		return new Promise((resolve, reject) => {
			worker.onmessage = (e) => {
				if (e.data.success) {
					this.displayOutput(e.data.output);
					resolve(e.data);
				} else {
					reject(new Error(e.data.error));
				}
				worker.terminate();
			};

			worker.onerror = (error) => {
				reject(error);
				worker.terminate();
			};

			worker.postMessage({ code });

			// Timeout
			setTimeout(() => {
				worker.terminate();
				reject(new Error('Timeout'));
			}, 10000);
		});
	}

	private async executePython(code: string) {
		// Execute in Pyodide worker
		// Implementation...
	}

	private displayOutput(lines: string[]) {
		// Display output in UI
		console.log('Output:', lines);
	}
}
```

## Performance Optimization

### Memoize Generated Code

```typescript
import { generateCode } from '$lib/shared/blockly/generators';

class CachedBlocklyGenerator {
	private cache = new Map<string, CodeGenerationResult>();

	generate(workspace: Blockly.WorkspaceSvg, language: 'javascript' | 'python') {
		// Create cache key from workspace XML
		const xml = Blockly.Xml.workspaceToDom(workspace);
		const xmlString = Blockly.Xml.domToText(xml);
		const cacheKey = `${language}:${xmlString}`;

		// Check cache
		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey)!;
		}

		// Generate and cache
		const result = generateCode(workspace, language);
		this.cache.set(cacheKey, result);

		return result;
	}

	clearCache() {
		this.cache.clear();
	}
}
```

This examples document provides comprehensive, real-world usage patterns for the code generation module.
