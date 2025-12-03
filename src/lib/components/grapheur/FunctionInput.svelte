<!--
FunctionInput Component

A single function input row that displays a MathLive editor with color picker,
visibility toggle, and delete button.

Features:
- MathLive integration for LaTeX input
- Debounced updates to store (300ms)
- Color picker with function palette
- Visibility toggle with Eye/EyeOff icons
- Delete button with trash icon
- Parse error display
- Accessible controls with ARIA labels

@component
@example
```svelte
<FunctionInput {func} />
```
-->

<script lang="ts">
	import type { ExplicitFunction } from '$lib/grapheur/types';
	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import MathField from '$lib/components/MathField.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import { Eye, EyeOff, Trash2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	let { func }: { func: ExplicitFunction } = $props();

	// Local state for latex input (debounced update to store)
	let latex = $state(func.latex);
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

	// Update local latex when func changes (e.g., from localStorage load)
	$effect(() => {
		latex = func.latex;
	});

	/**
	 * Handle LaTeX changes with debouncing
	 *
	 * Updates are delayed by 300ms to avoid excessive re-parsing
	 * during rapid typing.
	 */
	function handleLatexChange(value: string) {
		latex = value;

		// Clear previous timeout
		if (debounceTimeout) clearTimeout(debounceTimeout);

		// Schedule update to store
		debounceTimeout = setTimeout(() => {
			grapheurStore.updateFunction(func.id, { latex: value });
		}, 300);
	}

	/**
	 * Handle color changes
	 */
	function handleColorChange(color: string) {
		grapheurStore.updateFunction(func.id, { color });
	}

	/**
	 * Toggle visibility
	 */
	function toggleVisibility() {
		grapheurStore.updateFunction(func.id, { visible: !func.visible });
	}

	/**
	 * Delete this function
	 */
	function deleteFunction() {
		grapheurStore.removeFunction(func.id);
	}
</script>

<div class="function-input flex items-start gap-2 rounded-md border border-border bg-card p-3">
	<!-- Color Picker -->
	<div class="flex-shrink-0 pt-2">
		<ColorPicker value={func.color} onchange={handleColorChange} />
	</div>

	<!-- Math Field Container -->
	<div class="min-w-0 flex-grow">
		<MathField
			value={latex}
			onchange={handleLatexChange}
			placeholder="f(x) = ..."
			virtual-keyboard-mode="manual"
			class="w-full"
		/>
		{#if func.parseError}
			<p class="mt-1 text-xs text-destructive" role="alert">
				{func.parseError}
			</p>
		{/if}
	</div>

	<!-- Action Buttons -->
	<div class="flex flex-shrink-0 gap-1 pt-1">
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={toggleVisibility}
			title={func.visible ? 'Masquer' : 'Afficher'}
			aria-label={func.visible ? 'Masquer la fonction' : 'Afficher la fonction'}
		>
			{#if func.visible}
				<Eye class="h-4 w-4" />
			{:else}
				<EyeOff class="h-4 w-4 text-muted-foreground" />
			{/if}
		</Button>

		<Button
			variant="ghost"
			size="icon-sm"
			onclick={deleteFunction}
			title="Supprimer"
			aria-label="Supprimer la fonction"
		>
			<Trash2 class="h-4 w-4 text-destructive" />
		</Button>
	</div>
</div>

<style>
	/* Ensure MathField takes full width */
	:global(.function-input math-field) {
		width: 100%;
		min-height: 40px;
		border: 1px solid hsl(var(--border));
		border-radius: 0.375rem;
		padding: 0.5rem;
		background: hsl(var(--background));
		font-size: 1rem;
	}

	:global(.function-input math-field:focus-within) {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}
</style>
