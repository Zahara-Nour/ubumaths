<!--
	BlankInput Component
	====================

	Renders an inline input field for fill-in-the-blank questions.
	Integrates naturally within text flow (display: inline-block).

	Features:
	- Inline rendering within text flow
	- Validation state styling (correct/incorrect/neutral)
	- Keyboard handling (Enter to submit)
	- Accessibility support (aria-label, aria-invalid)

	@see BlankInputProps in types.ts for prop definitions
	@see ParagraphNode.svelte for rendering context
	@module components/markdown/nodes/BlankInput
-->
<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		/** 1-based index of the blank */
		index: number;
		/** Current value */
		value?: string;
		/** Disabled (read-only) */
		disabled?: boolean;
		/** Validation state: true=correct, false=incorrect, null=not validated */
		validationState?: boolean | null;
		/** Callback when value changes */
		onValueChange?: (value: string) => void;
		/** Callback when user submits (Enter key) */
		onSubmit?: () => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		index,
		value = $bindable(''),
		disabled = false,
		validationState = null,
		onValueChange,
		onSubmit,
		class: className = ''
	}: Props = $props();

	/**
	 * Handle input events - update value and notify parent
	 */
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		onValueChange?.(value);
	}

	/**
	 * Handle keydown - submit on Enter
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			onSubmit?.();
		}
	}

	/**
	 * Compute CSS classes based on validation state
	 */
	let inputClasses = $derived(
		cn(
			// Base styles
			'inline-block min-w-16 w-auto',
			'px-2 py-0.5',
			'border-2 rounded-md',
			'font-inherit text-inherit leading-normal',
			'align-baseline',
			'bg-background',
			// Focus state
			'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
			// Disabled state
			'disabled:opacity-50 disabled:cursor-not-allowed',
			// Validation states
			validationState === true && 'border-green-500/80 bg-green-500/10',
			validationState === false && 'border-destructive/80 bg-destructive/10',
			validationState === null && 'border-border',
			// Custom classes
			className
		)
	);
</script>

<input
	type="text"
	{value}
	{disabled}
	oninput={handleInput}
	onkeydown={handleKeydown}
	class={inputClasses}
	aria-label="Reponse {index}"
	aria-invalid={validationState === false ? 'true' : undefined}
	autocomplete="off"
	spellcheck="false"
/>
