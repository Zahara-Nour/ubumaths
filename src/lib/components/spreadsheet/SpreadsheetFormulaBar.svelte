<!--
	SpreadsheetFormulaBar Component
	================================

	Excel-style formula bar showing the current cell reference and value/formula.
	Allows direct editing of cell content.

	FEATURES:
	- Displays current cell reference (readonly)
	- fx indicator (highlighted when formula)
	- Editable input for value/formula
	- Enter to commit, Escape to cancel
	- Syncs with spreadsheet store

	This component provides a convenient way to view and edit
	the full formula or value of the selected cell, especially
	useful for long formulas that don't fit in the cell.
-->

<script lang="ts">
	import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';

	// Local state for the input value
	let inputValue = $state('');

	// Derived state
	const isFormula = $derived(spreadsheetStore.selectedCellData?.value?.startsWith('=') ?? false);

	// Sync input value with store
	$effect(() => {
		if (spreadsheetStore.isEditing) {
			inputValue = spreadsheetStore.editValue;
		} else {
			inputValue = spreadsheetStore.selectedCellData?.value ?? '';
		}
	});

	/**
	 * Handle focus on the input - start editing
	 */
	function handleFocus() {
		if (!spreadsheetStore.isEditing && spreadsheetStore.selectedCell) {
			spreadsheetStore.startEditing();
		}
	}

	/**
	 * Handle input change
	 */
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		spreadsheetStore.editValue = target.value;
	}

	/**
	 * Handle keydown events
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			spreadsheetStore.commitEdit();
			// Blur the input after committing
			(event.target as HTMLInputElement).blur();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			spreadsheetStore.cancelEdit();
			(event.target as HTMLInputElement).blur();
		}
	}

	/**
	 * Handle blur - commit edit
	 */
	function handleBlur() {
		if (spreadsheetStore.isEditing) {
			spreadsheetStore.commitEdit();
		}
	}
</script>

<div class="flex items-center gap-2 border-b border-border bg-muted/30 px-2 py-1">
	<!-- Cell reference (readonly) -->
	<div
		class="w-16 rounded border border-border bg-background px-2 py-1 text-center font-mono text-sm select-none"
	>
		{spreadsheetStore.selectedCell ?? '-'}
	</div>

	<!-- fx indicator -->
	<div class="w-6 flex-shrink-0 text-sm text-muted-foreground">
		{#if isFormula}
			<span class="font-mono font-bold text-primary">fx</span>
		{:else}
			<span class="font-mono text-muted-foreground/50">fx</span>
		{/if}
	</div>

	<!-- Formula/value input -->
	<input
		type="text"
		bind:value={inputValue}
		class="h-8 flex-1 rounded border border-border bg-background px-2 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
		placeholder="Entrez une valeur ou une formule (ex: =A1+B1)"
		onfocus={handleFocus}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={handleBlur}
	/>
</div>
