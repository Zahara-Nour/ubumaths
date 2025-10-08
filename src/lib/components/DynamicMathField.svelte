<script lang="ts">
	import { onMount } from 'svelte';
	import type { MathfieldElement } from 'mathlive';

	let {
		initialValue = '',
		readonly = false,
		placeholder = 'Enter math...',
		virtualKeyboardMode = 'auto',
		oninput,
		...restProps
	}: {
		initialValue?: string;
		readonly?: boolean;
		placeholder?: string;
		virtualKeyboardMode?: 'auto' | 'manual' | 'onfocus' | 'off';
		oninput?: (latex: string, mathfield: MathfieldElement) => void;
		[key: string]: unknown;
	} = $props();

	let container: HTMLDivElement;
	let mathfield: MathfieldElement | null = null;

	onMount(async () => {
		await import('mathlive');

		// Create math-field element programmatically
		mathfield = document.createElement('math-field') as MathfieldElement;
		mathfield.value = initialValue;
		mathfield.readOnly = readonly;
		mathfield.virtualKeyboardMode = virtualKeyboardMode;

		// Set placeholder if provided
		if (placeholder) {
			mathfield.setAttribute('placeholder', placeholder);
		}

		// Apply any additional props as attributes
		for (const [key, value] of Object.entries(restProps)) {
			if (value !== undefined && value !== null) {
				mathfield.setAttribute(key, String(value));
			}
		}

		// Listen for input changes
		mathfield.addEventListener('input', () => {
			if (mathfield && oninput) {
				oninput(mathfield.value, mathfield);
			}
		});

		// Append to container
		container.appendChild(mathfield);

		return () => {
			// Cleanup on unmount
			if (mathfield) {
				mathfield.remove();
			}
		};
	});

	// Expose methods to control the mathfield
	export function getValue(): string {
		return mathfield?.value ?? '';
	}

	export function setValue(value: string): void {
		if (mathfield) {
			mathfield.value = value;
		}
	}

	export function focus(): void {
		mathfield?.focus();
	}

	export function blur(): void {
		mathfield?.blur();
	}

	export function getMathfield(): MathfieldElement | null {
		return mathfield;
	}
</script>

<div bind:this={container} class="mathfield-container"></div>

<style>
	.mathfield-container :global(math-field) {
		display: block;
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
		font-size: 1rem;
	}

	.mathfield-container :global(math-field:focus) {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}
</style>
