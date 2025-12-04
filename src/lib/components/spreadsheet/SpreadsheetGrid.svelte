<!--
	SpreadsheetGrid Component
	=========================

	Complete spreadsheet grid with column and row headers.
	Displays a grid of cells with sticky headers for easy navigation.

	FEATURES:
	- Dynamic columns (A-T for 20 columns by default)
	- Dynamic rows (1-20 by default)
	- Sticky headers (both column and row)
	- Automatic cell rendering with SpreadsheetCell
	- Handles selection and editing state from store

	Props:
	- onCellSelect: Callback when a cell is selected
	- onStartEdit: Callback to start editing
	- onCommitEdit: Callback to commit edit
	- onCancelEdit: Callback to cancel edit
	- onEditValueChange: Callback when edit value changes
-->

<script lang="ts">
	import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';
	import SpreadsheetCell from './SpreadsheetCell.svelte';

	// Types
	interface Props {
		onCellSelect?: (ref: string) => void;
		onStartEdit?: () => void;
		onCommitEdit?: (value: string) => void;
		onCancelEdit?: () => void;
		onEditValueChange?: (value: string) => void;
	}

	let { onCellSelect, onStartEdit, onCommitEdit, onCancelEdit, onEditValueChange }: Props =
		$props();

	// Derived state: Generate column letters (A-T for 20 columns)
	const columns = $derived(
		Array.from({ length: spreadsheetStore.cols }, (_, i) => String.fromCharCode(65 + i))
	);

	// Derived state: Generate row numbers (1-20)
	const rows = $derived(Array.from({ length: spreadsheetStore.rows }, (_, i) => i + 1));

	/**
	 * Handle cell selection
	 */
	function handleCellSelect(ref: string) {
		spreadsheetStore.select(ref);
		onCellSelect?.(ref);
	}

	/**
	 * Handle start editing
	 */
	function handleStartEdit() {
		spreadsheetStore.startEditing();
		onStartEdit?.();
	}

	/**
	 * Handle commit edit
	 */
	function handleCommitEdit(value: string) {
		spreadsheetStore.editValue = value;
		spreadsheetStore.commitEdit();
		onCommitEdit?.(value);
	}

	/**
	 * Handle cancel edit
	 */
	function handleCancelEdit() {
		spreadsheetStore.cancelEdit();
		onCancelEdit?.();
	}

	/**
	 * Handle edit value change
	 */
	function handleEditValueChange(value: string) {
		spreadsheetStore.editValue = value;
		onEditValueChange?.(value);
	}
</script>

<div class="spreadsheet-grid max-h-full overflow-auto">
	<table class="table-fixed border-collapse">
		<!-- Column Headers -->
		<thead>
			<tr>
				<!-- Corner cell (empty) -->
				<th
					class="sticky top-0 left-0 z-20 h-8 w-12 min-w-[48px] border border-border bg-muted text-xs font-semibold text-muted-foreground"
				>
					<!-- Empty corner -->
				</th>

				<!-- Column letters (A, B, C, ...) -->
				{#each columns as col (col)}
					<th
						class="sticky top-0 z-10 h-8 min-w-[80px] border border-border bg-muted px-2 text-center text-xs font-semibold text-muted-foreground"
					>
						{col}
					</th>
				{/each}
			</tr>
		</thead>

		<!-- Grid Body -->
		<tbody>
			{#each rows as row (row)}
				<tr>
					<!-- Row number header -->
					<td
						class="sticky left-0 z-10 h-8 w-12 min-w-[48px] border border-border bg-muted px-2 text-right text-xs font-semibold text-muted-foreground"
					>
						{row}
					</td>

					<!-- Cells for this row -->
					{#each columns as col (col)}
						{@const cellRef = `${col}${row}`}
						<SpreadsheetCell
							ref={cellRef}
							value={spreadsheetStore.getCellValue(cellRef)}
							computed={spreadsheetStore.getComputedValue(cellRef)}
							format={spreadsheetStore.getCellFormat(cellRef)}
							isSelected={spreadsheetStore.selectedCell === cellRef}
							isEditing={spreadsheetStore.selectedCell === cellRef && spreadsheetStore.isEditing}
							editValue={spreadsheetStore.editValue}
							onSelect={handleCellSelect}
							onStartEdit={handleStartEdit}
							onCommitEdit={handleCommitEdit}
							onCancelEdit={handleCancelEdit}
							onEditValueChange={handleEditValueChange}
						/>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* Ensure consistent table layout */
	.spreadsheet-grid table {
		table-layout: fixed;
	}

	/* Ensure cells align properly */
	.spreadsheet-grid td,
	.spreadsheet-grid th {
		vertical-align: middle;
	}

	/* Prevent text selection during drag operations */
	.spreadsheet-grid {
		user-select: none;
	}
</style>
