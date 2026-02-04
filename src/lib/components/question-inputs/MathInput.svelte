<!--
	Math Input Component
	====================

	Unified MathField for numerical and algebraic answer input.
	Used for all math-based question types:
	- numerical_exact, numerical_decimal, numerical_rounded
	- numerical_with_unit
	- algebraic_transform

	Props:
	- value: Current answer value (bindable)
	- disabled: Whether input is disabled (controls readonly attribute)
	- placeholder: Placeholder text
	- helperText: Optional helper text shown below input
	- onSubmit: Callback when Enter is pressed

	IMPORTANT: Uses 'readonly' attribute (not 'read-only') for MathLive compatibility.
	MathLive's <math-field> element follows HTML standard attribute naming.
-->

<script lang="ts">
	import MathField from '$lib/components/MathField.svelte';

	interface Props {
		value?: string;
		disabled?: boolean;
		placeholder?: string;
		helperText?: string;
		onSubmit?: () => void;
	}

	let {
		value = $bindable(''),
		disabled = false,
		placeholder = 'Entrez votre réponse...',
		helperText,
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

<div class="math-input-container">
	<!--
		MathField with readonly control
		- readonly={disabled}: Uses HTML standard 'readonly' attribute (NOT 'read-only')
		- virtual-keyboard-mode="manual": User controls when to show virtual keyboard
		- smart-mode: Enables intelligent mode switching (text/math)
	-->
	<MathField
		bind:value
		readonly={disabled}
		virtual-keyboard-mode="manual"
		smart-mode="true"
		class="math-input-field"
		onkeydown={handleKeydown}
		{placeholder}
	/>

	<!-- Optional helper text -->
	{#if helperText && !disabled}
		<div class="helper-text">
			<span class="text-xs text-muted-foreground">
				{helperText}
			</span>
		</div>
	{/if}
</div>

<style>
	.math-input-container {
		width: 100%;
	}

	:global(.math-input-field) {
		width: 100%;
		min-height: calc(3rem * var(--font-scale, 1));
		padding: calc(0.75rem * var(--font-scale, 1));
		font-size: calc(1.125rem * var(--font-scale, 1));
		border: 2px solid hsl(var(--border));
		border-radius: calc(0.5rem * var(--font-scale, 1));
		background: hsl(var(--background));
		transition: all 0.2s ease;
	}

	:global(.math-input-field:focus) {
		outline: none;
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
	}

	:global(.math-input-field[readonly]) {
		opacity: 0.5;
		cursor: not-allowed;
		background: hsl(var(--muted));
	}

	.helper-text {
		margin-top: calc(0.5rem * var(--font-scale, 1));
		font-size: calc(0.75rem * var(--font-scale, 1));
		color: hsl(var(--muted-foreground));
	}

	/* Dark mode adjustments */
	:global(.dark .math-input-field) {
		border-color: hsl(var(--border));
		background: hsl(var(--background));
	}
</style>
