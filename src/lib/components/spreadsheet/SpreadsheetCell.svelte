<!--
	SpreadsheetCell Component
	=========================

	Individual editable cell for the spreadsheet grid.
	Handles selection, editing, and display of cell values with proper styling.

	FEATURES:
	- Single click: Select cell
	- Double click: Start editing
	- Direct character input: Start editing with that character
	- Enter: Commit and move down
	- Tab: Commit and move right
	- Escape: Cancel edit
	- Error display with tooltip
	- Formula indicator (small triangle)
	- Custom formatting support

	Props:
	- ref: Cell reference (e.g., "A1", "B2")
	- value: Raw value or formula
	- computed: Evaluated result
	- format: Optional cell formatting
	- isSelected: Whether cell is selected
	- isEditing: Whether cell is in edit mode
	- editValue: Current edit value
	- onSelect: Callback when cell is selected
	- onStartEdit: Callback to start editing
	- onCommitEdit: Callback to commit edit
	- onCancelEdit: Callback to cancel edit
	- onEditValueChange: Callback when edit value changes
-->

<script lang="ts">
	import { tick } from 'svelte';
	import type { ComputedValue, CellFormat } from '$lib/spreadsheet/types';
	import { formatComputedValue } from '$lib/spreadsheet/format';
	import { cn } from '$lib/utils';

	// Types
	interface Props {
		ref: string;
		value: string;
		computed: ComputedValue;
		format?: CellFormat;
		isSelected: boolean;
		isEditing: boolean;
		editValue: string;
		selectOnFocus: boolean;
		onSelect: (ref: string) => void;
		onStartEdit: () => void;
		onCommitEdit: (value: string) => void;
		onCancelEdit: () => void;
		onEditValueChange: (value: string) => void;
	}

	let {
		ref,
		value,
		computed,
		format,
		isSelected,
		isEditing,
		editValue,
		selectOnFocus,
		onSelect,
		onStartEdit,
		onCommitEdit,
		onCancelEdit,
		onEditValueChange
	}: Props = $props();

	// State
	let inputRef: HTMLInputElement | null = $state(null);

	// Derived state
	const isFormula = $derived(value.startsWith('='));
	const isError = $derived(computed.type === 'error');
	const displayValue = $derived(formatComputedValue(computed, format));

	// Focus input when editing starts
	$effect(() => {
		if (isEditing) {
			// Wait for DOM update then focus
			tick().then(() => {
				if (inputRef) {
					inputRef.focus();
					if (selectOnFocus) {
						inputRef.select();
					} else {
						// Place cursor at end
						inputRef.setSelectionRange(inputRef.value.length, inputRef.value.length);
					}
				}
			});
		}
	});

	/**
	 * Get text alignment class based on computed value type and format
	 */
	function getAlignmentClass(cv: ComputedValue, fmt?: CellFormat): string {
		if (fmt?.align) {
			return fmt.align === 'left'
				? 'text-left'
				: fmt.align === 'right'
					? 'text-right'
					: 'text-center';
		}

		// Default alignment by type
		if (cv.type === 'number') return 'text-right';
		if (cv.type === 'boolean') return 'text-center';
		return 'text-left';
	}

	/**
	 * Handle cell click
	 */
	function handleClick() {
		if (!isSelected) {
			onSelect(ref);
		}
	}

	/**
	 * Handle cell double-click to start editing
	 */
	function handleDoubleClick() {
		onSelect(ref);
		onStartEdit();
	}

	/**
	 * Handle input keydown for edit mode
	 */
	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			onCommitEdit(editValue);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			onCancelEdit();
		} else if (event.key === 'Tab') {
			event.preventDefault();
			onCommitEdit(editValue);
		}
	}

	/**
	 * Handle input change
	 */
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		onEditValueChange(target.value);
	}

	/**
	 * Build inline style from format
	 */
	function getInlineStyle(fmt?: CellFormat): string {
		if (!fmt) return '';
		const styles: string[] = [];
		if (fmt.textColor) styles.push(`color: ${fmt.textColor}`);
		if (fmt.bgColor) styles.push(`background-color: ${fmt.bgColor}`);
		return styles.join('; ');
	}
</script>

{#if isEditing}
	<!-- Edit Mode -->
	<td
		class={cn(
			'cell relative h-8 min-w-[80px] border border-border p-0',
			'z-10 ring-2 ring-primary',
			isSelected && 'bg-primary/5'
		)}
	>
		<input
			bind:this={inputRef}
			type="text"
			value={editValue}
			oninput={handleInput}
			onkeydown={handleInputKeydown}
			onblur={() => onCommitEdit(editValue)}
			class="h-full w-full border-none bg-background px-2 py-1 font-mono text-sm outline-none"
			aria-label={`Edition de la cellule ${ref}`}
		/>
	</td>
{:else}
	<!-- Display Mode -->
	<td
		class={cn(
			'cell relative h-8 min-w-[80px] cursor-pointer border border-border px-2 py-1',
			'truncate text-sm transition-colors',
			isSelected && 'bg-primary/5 ring-2 ring-primary ring-inset',
			isError && 'bg-destructive/10 text-destructive',
			format?.bold && 'font-bold',
			format?.italic && 'italic',
			getAlignmentClass(computed, format)
		)}
		style={getInlineStyle(format)}
		onclick={handleClick}
		ondblclick={handleDoubleClick}
		aria-label={`Cellule ${ref}${displayValue ? `: ${displayValue}` : ''}`}
		aria-selected={isSelected}
		title={isError && computed.type === 'error' ? computed.message : undefined}
	>
		<!-- Formula indicator -->
		{#if isFormula && !isError}
			<div
				class="absolute top-0 left-0 h-0 w-0 border-t-[6px] border-r-[6px] border-t-primary border-r-transparent"
				title="Formule"
			></div>
		{/if}

		<!-- Cell value -->
		<span class="block truncate">{displayValue}</span>
	</td>
{/if}
