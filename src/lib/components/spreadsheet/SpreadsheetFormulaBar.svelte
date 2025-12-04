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
	import { untrack, tick } from 'svelte';

	// Input reference - NOT reactive to avoid re-triggering effects
	let inputRef: HTMLInputElement | null = null;

	// Derived state
	const isFormula = $derived(spreadsheetStore.selectedCellData?.value?.startsWith('=') ?? false);

	/**
	 * Display value for the input:
	 * - When editing: show editValue from store
	 * - When not editing: show cell's raw value
	 */
	const displayValue = $derived(
		spreadsheetStore.isEditing
			? spreadsheetStore.editValue
			: (spreadsheetStore.selectedCellData?.value ?? '')
	);

	/**
	 * Handle focus on the input - start editing
	 */
	function handleFocus() {
		if (!spreadsheetStore.isEditing && spreadsheetStore.selectedCell) {
			spreadsheetStore.startEditing();
		}
	}

	/**
	 * Handle click - start editing and take focus
	 */
	async function handleClick() {
		if (!spreadsheetStore.selectedCell) return;

		if (!spreadsheetStore.isEditing) {
			spreadsheetStore.startEditing();
		}

		// Wait for Svelte to update the DOM (readonly attribute)
		await tick();
		inputRef?.focus();
	}

	/**
	 * Handle input - update store directly
	 * Flow: input event → handler → store.$state update → displayValue updates → DOM
	 */
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		spreadsheetStore.editValue = target.value;
	}

	/**
	 * Handle keydown events
	 */
	function handleKeydown(event: KeyboardEvent) {
		// Only handle when editing
		if (!spreadsheetStore.isEditing) return;

		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			spreadsheetStore.commitEdit();
			spreadsheetStore.navigate('down');
			untrack(() => inputRef?.blur());
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			spreadsheetStore.cancelEdit();
			untrack(() => inputRef?.blur());
		} else if (event.key === 'Tab') {
			event.preventDefault();
			event.stopPropagation();
			spreadsheetStore.commitEdit();
			spreadsheetStore.navigate(event.shiftKey ? 'left' : 'right');
			untrack(() => inputRef?.blur());
		}
	}

	/**
	 * Handle blur - don't commit here, let keydown handlers manage it
	 * This prevents the formula bar from interfering with cell editing
	 */
	function handleBlur() {
		// Commit is handled by keydown (Enter/Tab) or by clicking elsewhere
		// The cell's blur handler will commit if focus goes to a non-formula-bar element
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
	<!-- Single input element - NEVER recreated. Toggle readonly based on editing state -->
	<!-- Flow: input event → handleInput → store.editValue update → displayValue derived → DOM -->
	<input
		bind:this={inputRef}
		type="text"
		value={displayValue}
		readonly={!spreadsheetStore.isEditing}
		data-formula-bar="true"
		class="h-8 flex-1 rounded border bg-background px-2 font-mono text-sm outline-none
			{spreadsheetStore.isEditing
			? 'border-primary ring-1 ring-primary'
			: 'border-border focus:border-primary focus:ring-1 focus:ring-primary'}"
		placeholder="Entrez une valeur ou une formule (ex: =A1+B1)"
		onclick={handleClick}
		onfocus={handleFocus}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={handleBlur}
	/>
</div>
