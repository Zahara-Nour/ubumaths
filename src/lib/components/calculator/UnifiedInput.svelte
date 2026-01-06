<script lang="ts">
	import type { MathfieldElement } from 'mathlive';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { Play } from 'lucide-svelte';

	// Types
	interface SubmitInput {
		type: 'expression' | 'command';
		command?: string;
		expression: string;
	}

	interface Props {
		onSubmit: (input: SubmitInput) => void;
		disabled?: boolean;
		mathFieldElement?: MathfieldElement | null;
	}

	let { onSubmit, disabled = false, mathFieldElement = $bindable(null) }: Props = $props();

	// State
	let mode = $state<'mathfield' | 'command'>('mathfield');
	let mathValue = $state('');
	let commandValue = $state('');
	let selectedSuggestionIndex = $state(-1);
	let _commandInputRef: HTMLInputElement | null = null;

	// Reference to mathfield element (managed by action)
	let mathfield: MathfieldElement | null = null;

	// Available CAS commands (for autocomplete)
	const commands = ['.diff', '.simplify', '.eval', '.normal', '.taylor', '.let', '.def', '.clear'];

	// Derived: filtered suggestions based on command input
	let suggestions = $derived(
		commandValue.length > 0 ? commands.filter((c) => c.startsWith(commandValue)) : commands
	);

	// Store event handlers for cleanup
	let inputHandler: (() => void) | null = null;
	let keydownHandler: ((e: Event) => void) | null = null;

	// Action to initialize the mathfield (only runs once)
	function initMathField(container: HTMLDivElement) {
		// Dynamically import mathlive
		import('mathlive').then(() => {
			const mf = document.createElement('math-field') as MathfieldElement;
			mf.value = mathValue;
			// @ts-expect-error - virtualKeyboardMode exists but not in types
			mf.virtualKeyboardMode = 'manual';
			mf.setAttribute('placeholder', 'Entrez une expression...');

			// Style the mathfield
			mf.style.display = 'block';
			mf.style.width = '100%';
			mf.style.minHeight = '2.5rem';
			mf.style.padding = '0.5rem';
			mf.style.fontSize = '1.125rem';
			mf.style.border = 'none';
			mf.style.outline = 'none';
			mf.style.background = 'transparent';

			// Create handlers
			inputHandler = () => {
				mathValue = mf.value;
			};
			keydownHandler = handleMathFieldKeydown as (e: Event) => void;

			// Listen for input changes
			mf.addEventListener('input', inputHandler);

			// Listen for keydown to detect "." at the beginning
			mf.addEventListener('keydown', keydownHandler);

			container.appendChild(mf);
			mathfield = mf;
			// Expose to parent via bindable prop
			mathFieldElement = mf;
		});

		return {
			destroy() {
				if (mathfield) {
					// Remove event listeners
					if (inputHandler) {
						mathfield.removeEventListener('input', inputHandler);
					}
					if (keydownHandler) {
						mathfield.removeEventListener('keydown', keydownHandler);
					}
					mathfield.remove();
					mathfield = null;
					mathFieldElement = null;
					inputHandler = null;
					keydownHandler = null;
				}
			}
		};
	}

	// Action to capture command input ref and auto-focus when in command mode
	function captureCommandInput(node: HTMLInputElement) {
		_commandInputRef = node;
		// Auto-focus when switching to command mode
		requestAnimationFrame(() => {
			node.focus();
			// Position cursor at end
			node.setSelectionRange(node.value.length, node.value.length);
		});

		return {
			destroy() {
				_commandInputRef = null;
			}
		};
	}

	function handleMathFieldKeydown(event: KeyboardEvent) {
		// Switch to command mode if "." is pressed at the beginning (empty mathfield)
		if (event.key === '.' && mathValue === '') {
			event.preventDefault();
			switchToCommandMode();
			return;
		}

		// Enter key submits the expression
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
			return;
		}

		// Arrow up/down for history navigation (future feature)
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			// TODO: Implement history navigation
		}
	}

	function switchToCommandMode() {
		mode = 'command';
		commandValue = '.';
		selectedSuggestionIndex = -1;
	}

	function switchToMathFieldMode() {
		mode = 'mathfield';
		commandValue = '';
		selectedSuggestionIndex = -1;

		// Focus the mathfield after mode switch
		requestAnimationFrame(() => {
			mathfield?.focus();
		});
	}

	function handleCommandInput(event: Event) {
		const input = event.target as HTMLInputElement;
		commandValue = input.value;
		selectedSuggestionIndex = -1;
	}

	function handleCommandKeydown(event: KeyboardEvent) {
		// Backspace on empty or just "." returns to mathfield mode
		if (event.key === 'Backspace' && (commandValue === '' || commandValue === '.')) {
			event.preventDefault();
			switchToMathFieldMode();
			return;
		}

		// Tab or Space after command moves focus to mathfield
		if ((event.key === 'Tab' || event.key === ' ') && commandValue.length > 1) {
			event.preventDefault();
			mathfield?.focus();
			return;
		}

		// Arrow down to navigate suggestions
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (suggestions.length > 0) {
				selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
			}
			return;
		}

		// Arrow up to navigate suggestions
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (suggestions.length > 0) {
				selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
			}
			return;
		}

		// Select suggestion with Enter when navigating
		if (event.key === 'Enter' && selectedSuggestionIndex >= 0) {
			event.preventDefault();
			selectSuggestion(suggestions[selectedSuggestionIndex]);
			return;
		}

		// Enter submits if we have both command and expression
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
			return;
		}
	}

	function selectSuggestion(suggestion: string) {
		commandValue = suggestion;
		selectedSuggestionIndex = -1;
		// Move focus to mathfield after selecting a command
		requestAnimationFrame(() => {
			mathfield?.focus();
		});
	}

	function handleSubmit() {
		if (disabled) return;

		if (mode === 'command') {
			// Command mode: need both command and expression
			const command = commandValue.trim();
			const expression = mathValue.trim();

			if (command && expression) {
				onSubmit({
					type: 'command',
					command: command,
					expression: expression
				});
				// Clear inputs after submit
				commandValue = '';
				mathValue = '';
				if (mathfield) mathfield.value = '';
				switchToMathFieldMode();
			} else if (command && !expression) {
				// Focus mathfield if expression is missing
				mathfield?.focus();
			}
		} else {
			// MathField mode: just expression
			const expression = mathValue.trim();

			if (expression) {
				onSubmit({
					type: 'expression',
					expression: expression
				});
				// Clear input after submit
				mathValue = '';
				if (mathfield) mathfield.value = '';
			}
		}
	}

	// Sync mathfield value when mathValue changes externally
	$effect(() => {
		if (mathfield && mathfield.value !== mathValue) {
			mathfield.value = mathValue;
		}
	});
</script>

<div class="unified-input flex flex-col gap-2">
	<!-- Main input container -->
	<div
		class={cn(
			'flex items-center rounded-lg border border-border bg-background transition-colors',
			'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
			disabled && 'cursor-not-allowed opacity-50'
		)}
	>
		<!-- Command input (only visible in command mode) -->
		{#if mode === 'command'}
			<input
				use:captureCommandInput
				type="text"
				value={commandValue}
				oninput={handleCommandInput}
				onkeydown={handleCommandKeydown}
				{disabled}
				class={cn(
					'w-32 shrink-0 border-r border-border bg-muted/50 px-3 py-2',
					'rounded-l-lg font-mono text-sm text-primary',
					'placeholder:text-muted-foreground',
					'focus:outline-none',
					disabled && 'cursor-not-allowed'
				)}
				placeholder=".cmd"
			/>
		{/if}

		<!-- MathField container (always present) -->
		<div use:initMathField class="flex-1"></div>

		<!-- Submit button -->
		<Button
			variant="ghost"
			size="icon"
			onclick={handleSubmit}
			{disabled}
			class="mx-1 shrink-0"
			aria-label="Executer"
		>
			<Play class="h-4 w-4" />
		</Button>
	</div>

	<!-- Suggestions dropdown (command mode only) -->
	{#if mode === 'command' && suggestions.length > 0}
		<div
			class="rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
			role="listbox"
			aria-label="Suggestions de commandes"
		>
			{#each suggestions as suggestion, index (suggestion)}
				<button
					type="button"
					class={cn(
						'w-full cursor-pointer rounded px-3 py-1.5 text-left font-mono text-sm',
						'hover:bg-accent hover:text-accent-foreground',
						index === selectedSuggestionIndex && 'bg-accent text-accent-foreground'
					)}
					onclick={() => selectSuggestion(suggestion)}
					role="option"
					aria-selected={index === selectedSuggestionIndex}
				>
					{suggestion}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Ensure mathfield takes full height and looks integrated */
	.unified-input :global(math-field) {
		--caret-color: hsl(var(--primary));
	}

	.unified-input :global(math-field::part(content)) {
		padding: 0.5rem;
	}

	.unified-input :global(math-field:focus) {
		outline: none;
	}
</style>
