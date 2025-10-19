<!--
	Numerical Input Component
	=========================

	Editable MathField for numerical answer input.
	Used for numerical_exact, numerical_decimal, numerical_rounded questions.

	Props:
	- value: Current answer value (bindable)
	- disabled: Whether input is disabled
	- placeholder: Placeholder text
	- onSubmit: Callback when Enter is pressed
-->

<script lang="ts">
	import MathField from '$lib/components/MathField.svelte';

	interface Props {
		value?: string;
		disabled?: boolean;
		placeholder?: string;
		onSubmit?: () => void;
	}

	let {
		value = $bindable(''),
		disabled = false,
		placeholder = 'Entrez votre réponse...',
		onSubmit
	}: Props = $props();

	// Handle Enter key to submit
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !disabled && onSubmit) {
			e.preventDefault();
			onSubmit();
		}
	}
</script>

<div class="numerical-input-container">
	<MathField
		bind:value
		read-only={disabled}
		virtual-keyboard-mode="manual"
		smart-mode
		class="numerical-input-field"
		onkeydown={handleKeydown}
		{placeholder}
	/>
</div>

<style>
	.numerical-input-container {
		width: 100%;
	}

	:global(.numerical-input-field) {
		width: 100%;
		min-height: calc(3rem * var(--font-scale, 1));
		padding: calc(0.75rem * var(--font-scale, 1));
		font-size: calc(1.125rem * var(--font-scale, 1));
		border: 2px solid hsl(var(--border));
		border-radius: calc(0.5rem * var(--font-scale, 1));
		background: hsl(var(--background));
		transition: all 0.2s ease;
	}

	:global(.numerical-input-field:focus) {
		outline: none;
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
	}

	:global(.numerical-input-field[read-only]) {
		opacity: 0.5;
		cursor: not-allowed;
		background: hsl(var(--muted));
	}

	/* Dark mode adjustments */
	:global(.dark .numerical-input-field) {
		border-color: hsl(var(--border));
		background: hsl(var(--background));
	}
</style>
