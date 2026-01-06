# Calculator Store API

## Overview

The calculator store is a Svelte 5 reactive store managing expression evaluation, history, and persistence.

**File**: `src/lib/stores/calculator.svelte.ts`

## Import

```typescript
import { calculatorStore } from '$lib/stores/calculator.svelte';
import type {
	CalculationResult,
	CalculatorInput,
	CommandInfo
} from '$lib/stores/calculator.svelte';
```

---

## Types

### CalculationResult

Result of a calculation stored in history.

```typescript
interface CalculationResult {
	readonly id: string; // UUID
	readonly input: string; // Original expression/command
	readonly output: string; // Result (LaTeX format)
	readonly outputHtml?: string; // HTML formatted output
	readonly isError: boolean; // Error flag
	readonly errorMessage?: string; // Error details
	readonly timestamp: number; // Unix ms
}
```

### CalculatorInput

Input for the `execute` method.

```typescript
interface CalculatorInput {
	readonly type: 'expression' | 'command';
	readonly command?: string; // Required if type is 'command'
	readonly expression: string; // Expression or command argument
}
```

### CommandInfo

Command metadata for UI display.

```typescript
interface CommandInfo {
	readonly name: string;
	readonly description: string;
	readonly aliases: readonly string[];
}
```

---

## Reactive State

### `history`

```typescript
history: CalculationResult[]
```

Calculation history array (newest first). Maximum 100 entries.

**Usage**:

```svelte
{#each calculatorStore.history as result (result.id)}
	<div>{result.input} = {result.output}</div>
{/each}
```

### `historyIndex`

```typescript
historyIndex: number;
```

Current position in history navigation (`-1` = not navigating).

### `isLoading`

```typescript
isLoading: boolean;
```

Whether a calculation is in progress.

**Usage**:

```svelte
{#if calculatorStore.isLoading}
	<Spinner />
{/if}
```

---

## Derived State

### `hasHistory`

```typescript
hasHistory: boolean;
```

Whether there are any history entries.

### `historyCount`

```typescript
historyCount: number;
```

Number of history entries.

### `lastResult`

```typescript
lastResult: CalculationResult | undefined;
```

Most recent calculation result.

---

## Methods

### `execute(input)`

Execute an expression or command.

```typescript
async execute(input: CalculatorInput): Promise<void>
```

**Parameters**:

- `input.type`: `'expression'` or `'command'`
- `input.command`: Command name (e.g., `'.diff'`) if type is `'command'`
- `input.expression`: Expression string

**Examples**:

```typescript
// Evaluate expression
await calculatorStore.execute({
	type: 'expression',
	expression: '2 + 3 * 4'
});

// Execute command
await calculatorStore.execute({
	type: 'command',
	command: '.diff',
	expression: 'x^2'
});

// Define variable
await calculatorStore.execute({
	type: 'command',
	command: '.let',
	expression: 'a = 5'
});
```

**Validation**:

- Expression max length: 1000 characters
- Command max length: 50 characters
- Zod schema validation on all inputs

### `navigateHistory(direction, currentInput)`

Navigate through calculation history (up/down arrows).

```typescript
navigateHistory(direction: 'up' | 'down', currentInput?: string): string | null
```

**Parameters**:

- `direction`: `'up'` (older) or `'down'` (newer)
- `currentInput`: Current input value (saved on first up press)

**Returns**: Input string at new position, or `null` if navigation not possible.

**Example**:

```typescript
function handleKeyDown(event: KeyboardEvent, currentValue: string) {
	if (event.key === 'ArrowUp') {
		const prev = calculatorStore.navigateHistory('up', currentValue);
		if (prev !== null) inputValue = prev;
	}
	if (event.key === 'ArrowDown') {
		const next = calculatorStore.navigateHistory('down');
		if (next !== null) inputValue = next;
	}
}
```

### `resetNavigation()`

Reset history navigation state.

```typescript
resetNavigation(): void
```

Call when user starts typing or clears input.

### `clearHistory()`

Clear all calculation history.

```typescript
clearHistory(): void
```

Also clears localStorage.

### `getCommands()`

Get all available CAS commands.

```typescript
getCommands(): CommandInfo[]
```

**Returns**: Array of command metadata for autocomplete/help.

**Example**:

```typescript
const commands = calculatorStore.getCommands();
// [
//   { name: 'diff', description: 'Differentiate', aliases: ['d'] },
//   { name: 'simplify', description: 'Simplify', aliases: ['s'] },
//   ...
// ]
```

---

## Validation Schemas

### Input Validation

```typescript
const CalculatorInputSchema = z.object({
	type: z.enum(['expression', 'command']),
	command: z.string().max(50).optional(),
	expression: z.string().max(1000)
});
```

### History Entry Validation

```typescript
const HistoryEntrySchema = z.object({
	id: z.string().max(50),
	input: z.string().max(1000),
	output: z.string().max(1000),
	outputHtml: z.string().max(2000).optional(),
	isError: z.boolean(),
	errorMessage: z.string().max(500).optional(),
	timestamp: z.number().int().positive()
});
```

---

## Persistence

### localStorage Key

```
'ubumaths-calc-history'
```

### Storage Limits

| Limit            | Value      |
| ---------------- | ---------- |
| Max entries      | 100        |
| Max total size   | 100KB      |
| Entry input max  | 1000 chars |
| Entry output max | 1000 chars |

### Security

- `outputHtml` is NOT stored (XSS prevention)
- All loaded entries validated with Zod
- Corrupted entries silently skipped
- Auto-clear on complete corruption

### Quota Handling

```typescript
// On QuotaExceededError:
// 1. Try with half the history
// 2. If still failing, clear history
```

---

## Error Handling

### Invalid Input

```typescript
await calculatorStore.execute({
	type: 'expression',
	expression: 'x'.repeat(2000) // Too long
});

// Result:
// {
//   isError: true,
//   errorMessage: 'Expression trop longue ou invalide'
// }
```

### Calculation Error

```typescript
await calculatorStore.execute({
	type: 'expression',
	expression: '1/0'
});

// Result:
// {
//   isError: true,
//   errorMessage: 'Division by zero'
// }
```

---

## Full Example

```svelte
<script>
	import { calculatorStore } from '$lib/stores/calculator.svelte';

	let inputValue = $state('');

	async function handleSubmit() {
		if (!inputValue.trim()) return;

		await calculatorStore.execute({
			type: 'expression',
			expression: inputValue
		});

		inputValue = '';
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit();
		} else if (event.key === 'ArrowUp') {
			const prev = calculatorStore.navigateHistory('up', inputValue);
			if (prev) inputValue = prev;
		} else if (event.key === 'ArrowDown') {
			const next = calculatorStore.navigateHistory('down');
			if (next !== null) inputValue = next;
		}
	}
</script>

<input bind:value={inputValue} onkeydown={handleKeyDown} placeholder="Enter expression..." />

{#if calculatorStore.isLoading}
	<p>Calculating...</p>
{/if}

<ul>
	{#each calculatorStore.history as result (result.id)}
		<li class:error={result.isError}>
			{result.input} = {result.output}
		</li>
	{/each}
</ul>

{#if calculatorStore.hasHistory}
	<button onclick={() => calculatorStore.clearHistory()}> Clear History </button>
{/if}
```
