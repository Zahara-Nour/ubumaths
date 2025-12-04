<!--
	Spreadsheet Component
	=====================

	Main spreadsheet component assembling the formula bar, grid, and status bar.
	Provides complete keyboard navigation for Excel-like experience.

	FEATURES:
	- Formula bar for viewing/editing cell content
	- Scrollable grid with sticky headers
	- Status bar showing cell count and save status
	- Complete keyboard navigation:
	  - Arrows: Navigate between cells
	  - Enter: Start editing / Commit and move down
	  - Tab/Shift+Tab: Commit and move right/left
	  - Escape: Cancel editing
	  - F2: Start editing
	  - Delete/Backspace: Clear cell
	  - Direct character input: Start editing with that character

	USAGE:
	<Spreadsheet />

	The component uses the global spreadsheetStore for state management.
-->

<script lang="ts">
	import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';
	import SpreadsheetGrid from './SpreadsheetGrid.svelte';
	import SpreadsheetFormulaBar from './SpreadsheetFormulaBar.svelte';
	import SpreadsheetToolbar from './SpreadsheetToolbar.svelte';
	import SpreadsheetImportExport from './SpreadsheetImportExport.svelte';

	// State for tracking if we should capture keyboard input
	let containerRef: HTMLDivElement | null = $state(null);

	/**
	 * Check if a character is printable (should start editing)
	 */
	function isPrintableKey(event: KeyboardEvent): boolean {
		// Ignore if modifier keys are held (except Shift for uppercase)
		if (event.ctrlKey || event.metaKey || event.altKey) {
			return false;
		}

		// Single character keys (letters, numbers, symbols)
		if (event.key.length === 1) {
			return true;
		}

		return false;
	}

	/**
	 * Handle global keyboard events for navigation and editing
	 */
	function handleKeydown(event: KeyboardEvent) {
		// Don't handle if focus is in an input or textarea (formula bar handles its own)
		const target = event.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
			return;
		}

		// Handle based on editing state
		if (spreadsheetStore.isEditing) {
			handleEditingKeydown(event);
		} else {
			handleNavigationKeydown(event);
		}
	}

	/**
	 * Handle keydown when in editing mode
	 */
	function handleEditingKeydown(event: KeyboardEvent) {
		// Most editing is handled by the cell input itself
		// This is a fallback for any edge cases
		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				spreadsheetStore.cancelEdit();
				break;
			case 'Enter':
				event.preventDefault();
				spreadsheetStore.commitEdit();
				spreadsheetStore.navigate('down');
				break;
			case 'Tab':
				event.preventDefault();
				spreadsheetStore.commitEdit();
				if (event.shiftKey) {
					spreadsheetStore.navigate('left');
				} else {
					spreadsheetStore.navigate('right');
				}
				break;
		}
	}

	/**
	 * Handle keydown when in navigation mode
	 */
	function handleNavigationKeydown(event: KeyboardEvent) {
		// Format shortcuts (Ctrl/Cmd + key)
		if (event.ctrlKey || event.metaKey) {
			if (event.key === 'b' || event.key === 'B') {
				event.preventDefault();
				toggleBold();
				return;
			} else if (event.key === 'i' || event.key === 'I') {
				event.preventDefault();
				toggleItalic();
				return;
			}
		}

		switch (event.key) {
			// Arrow navigation
			case 'ArrowUp':
				event.preventDefault();
				spreadsheetStore.navigate('up');
				break;
			case 'ArrowDown':
				event.preventDefault();
				spreadsheetStore.navigate('down');
				break;
			case 'ArrowLeft':
				event.preventDefault();
				spreadsheetStore.navigate('left');
				break;
			case 'ArrowRight':
				event.preventDefault();
				spreadsheetStore.navigate('right');
				break;

			// Enter: Start editing or navigate down
			case 'Enter':
				event.preventDefault();
				spreadsheetStore.startEditing();
				break;

			// Tab: Navigate right (Shift+Tab: left)
			case 'Tab':
				event.preventDefault();
				if (event.shiftKey) {
					spreadsheetStore.navigate('left');
				} else {
					spreadsheetStore.navigate('right');
				}
				break;

			// F2: Start editing
			case 'F2':
				event.preventDefault();
				spreadsheetStore.startEditing();
				break;

			// Delete/Backspace: Clear cell
			case 'Delete':
			case 'Backspace':
				event.preventDefault();
				if (spreadsheetStore.selectedCell) {
					spreadsheetStore.clearCell(spreadsheetStore.selectedCell);
				}
				break;

			// Escape: Deselect (already not editing)
			case 'Escape':
				event.preventDefault();
				// Could deselect here if desired
				break;

			default:
				// Printable character: start editing with that character
				if (isPrintableKey(event)) {
					event.preventDefault();
					spreadsheetStore.startEditing(event.key);
				}
				break;
		}
	}

	/**
	 * Toggle bold formatting for selected cell
	 */
	function toggleBold() {
		if (!spreadsheetStore.selectedCell) return;
		const current = spreadsheetStore.getCellFormat(spreadsheetStore.selectedCell);
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			bold: !current?.bold
		});
	}

	/**
	 * Toggle italic formatting for selected cell
	 */
	function toggleItalic() {
		if (!spreadsheetStore.selectedCell) return;
		const current = spreadsheetStore.getCellFormat(spreadsheetStore.selectedCell);
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			italic: !current?.italic
		});
	}

	/**
	 * Handle container focus to enable keyboard navigation
	 */
	function handleContainerClick() {
		containerRef?.focus();
	}

	/**
	 * Handle cell selection - focus the container to enable keyboard navigation
	 */
	function handleCellSelect(_ref: string) {
		// Focus the container so keyboard events work
		containerRef?.focus();
	}

	/**
	 * Handle edit commit - refocus container for keyboard navigation
	 */
	function handleCommitEdit() {
		containerRef?.focus();
	}

	/**
	 * Handle edit cancel - refocus container for keyboard navigation
	 */
	function handleCancelEdit() {
		containerRef?.focus();
	}
</script>

<div
	bind:this={containerRef}
	class="spreadsheet-container flex h-full flex-col overflow-hidden rounded-lg border bg-background focus:outline-none"
	tabindex="-1"
	role="application"
	aria-label="Tableur interactif"
	onclick={handleContainerClick}
	onkeydown={handleKeydown}
>
	<!-- Toolbar with Import/Export -->
	<div class="flex items-center justify-between border-b border-border">
		<SpreadsheetToolbar />
		<div class="flex items-center gap-1 pr-2">
			<SpreadsheetImportExport />
		</div>
	</div>

	<!-- Formula bar -->
	<SpreadsheetFormulaBar />

	<!-- Grid -->
	<div class="flex-1 overflow-auto">
		<SpreadsheetGrid
			onCellSelect={handleCellSelect}
			onCommitEdit={handleCommitEdit}
			onCancelEdit={handleCancelEdit}
		/>
	</div>

	<!-- Status bar -->
	<div
		class="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground"
	>
		<span>
			{spreadsheetStore.cellCount}
			{spreadsheetStore.cellCount === 1 ? 'cellule' : 'cellules'}
		</span>
		<div class="flex items-center gap-4">
			<!-- Selected cell computed value preview -->
			{#if spreadsheetStore.selectedCellValue && spreadsheetStore.selectedCellValue.type !== 'empty'}
				<span class="text-muted-foreground/70">
					{#if spreadsheetStore.selectedCellValue.type === 'number'}
						= {spreadsheetStore.selectedCellValue.value}
					{:else if spreadsheetStore.selectedCellValue.type === 'string'}
						= "{spreadsheetStore.selectedCellValue.value}"
					{:else if spreadsheetStore.selectedCellValue.type === 'boolean'}
						= {spreadsheetStore.selectedCellValue.value ? 'VRAI' : 'FAUX'}
					{:else if spreadsheetStore.selectedCellValue.type === 'error'}
						<span class="text-destructive">{spreadsheetStore.selectedCellValue.code}</span>
					{/if}
				</span>
			{/if}

			<!-- Save status -->
			{#if spreadsheetStore.hasUnsavedChanges}
				<span class="text-amber-600 dark:text-amber-500">Non sauvegarde</span>
			{:else}
				<span class="text-green-600 dark:text-green-500">Sauvegarde</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.spreadsheet-container {
		/* Ensure the container can receive focus for keyboard events */
		outline: none;
	}

	/* When container is focused, show a subtle indicator */
	.spreadsheet-container:focus-within {
		box-shadow: 0 0 0 2px hsl(var(--ring) / 0.3);
	}
</style>
