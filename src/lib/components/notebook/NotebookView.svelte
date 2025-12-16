<script lang="ts">
	/**
	 * NotebookView Component
	 *
	 * Main container for the Jupyter-like notebook interface
	 * Features:
	 * - Loads notebook on mount
	 * - Renders cells in order
	 * - Keyboard shortcuts (Shift+Enter, Ctrl+Enter, Alt+Enter, Ctrl+S)
	 * - Cell selection and navigation
	 * - Toolbar and status bar
	 */

	import { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import NotebookToolbar from './NotebookToolbar.svelte';
	import NotebookStatusBar from './NotebookStatusBar.svelte';
	import NotebookCell from './NotebookCell.svelte';
	import { Alert } from '$lib/components/ui/alert';
	import { Eye } from 'lucide-svelte';

	// Props
	let {
		notebookId = null as string | null,
		isReadonly = false
	}: {
		notebookId?: string | null;
		isReadonly?: boolean;
	} = $props();

	// Create notebook store instance
	const notebook = new NotebookStore();

	// State
	let isInitialized = $state(false);
	let containerRef: HTMLDivElement | null = $state(null);

	// Load notebook
	async function loadNotebook(): Promise<void> {
		if (!notebookId) {
			toaster.error('Aucun ID de notebook fourni');
			return;
		}

		const loaded = await notebook.loadNotebook(notebookId);
		if (loaded) {
			// Initialize Pyodide after loading
			notebook.initPyodide();
			isInitialized = true;

			// Set first cell as active if no active cell
			if (!notebook.activeCell && notebook.cells.length > 0) {
				notebook.setActiveCell(notebook.cells[0].id);
			}
		} else {
			toaster.error(notebook.cloudError ?? 'Erreur lors du chargement du notebook');
		}
	}

	// Toolbar actions
	async function handleSave(): Promise<void> {
		const success = await notebook.saveNotebook();
		if (success) {
			toaster.success('Notebook enregistré');
		} else {
			toaster.error(notebook.cloudError ?? 'Erreur lors de la sauvegarde');
		}
	}

	// Track cell content for autosave detection
	let previousCellsHash = $state('');

	// Setup autosave effect - watches for cell changes and schedules debounced save
	$effect(() => {
		// Create a snapshot of current cell content
		const cellsHash = notebook.cells.map((c) => `${c.id}:${c.source}`).join('|');

		// Detect if cells have changed
		if (cellsHash !== previousCellsHash) {
			previousCellsHash = cellsHash;

			// Mark as modified and schedule autosave only if not readonly
			if (!isReadonly) {
				notebook.markModified();
				notebook.scheduleAutoSave();
			}
		}
	});

	function handleAddCodeCell(): void {
		const activeIndex = notebook.activeCell
			? notebook.getCellIndex(notebook.activeCell)
			: notebook.cells.length - 1;

		const newCellId = notebook.addCell({
			type: 'code',
			index: activeIndex + 1
		});

		if (newCellId) {
			notebook.setActiveCell(newCellId);
		}
	}

	function handleAddMarkdownCell(): void {
		const activeIndex = notebook.activeCell
			? notebook.getCellIndex(notebook.activeCell)
			: notebook.cells.length - 1;

		const newCellId = notebook.addCell({
			type: 'markdown',
			index: activeIndex + 1
		});

		if (newCellId) {
			notebook.setActiveCell(newCellId);
		}
	}

	async function handleRunCurrent(): Promise<void> {
		if (!notebook.activeCell) return;
		await notebook.executeCell(notebook.activeCell);
	}

	async function handleRunAll(): Promise<void> {
		await notebook.executeAllCells();
	}

	function handleStop(): void {
		notebook.stopExecution();
	}

	function handleResetKernel(): void {
		notebook.resetKernel();
		toaster.info('Noyau réinitialisé');
	}

	// Cell actions
	function handleSelectCell(cellId: string): void {
		notebook.setActiveCell(cellId);
	}

	function handleDeleteCell(cellId: string): void {
		const success = notebook.deleteCell(cellId);
		if (!success) {
			toaster.warning('Impossible de supprimer la dernière cellule');
		}
	}

	function handleMoveUp(cellId: string): void {
		notebook.moveCell(cellId, 'up');
	}

	function handleMoveDown(cellId: string): void {
		notebook.moveCell(cellId, 'down');
	}

	async function handleExecuteCell(cellId: string): Promise<void> {
		await notebook.executeCell(cellId);
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent): void {
		// Ctrl+S / Cmd+S: Save (always available, even in readonly mode)
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			handleSave();
			return;
		}

		// Disable all other shortcuts in readonly mode
		if (isReadonly) return;

		// Only handle cell execution shortcuts if there's an active cell
		if (!notebook.activeCell) {
			// Handle Arrow Up/Down for navigation even without active cell
			if (e.key === 'ArrowUp' && notebook.cells.length > 0) {
				e.preventDefault();
				notebook.setActiveCell(notebook.cells[0].id);
			} else if (e.key === 'ArrowDown' && notebook.cells.length > 0) {
				e.preventDefault();
				notebook.setActiveCell(notebook.cells[0].id);
			}
			return;
		}

		const currentIndex = notebook.getCellIndex(notebook.activeCell);

		// Arrow Up: Navigate to previous cell
		if (e.key === 'ArrowUp' && currentIndex > 0) {
			// Only navigate if not in edit mode (check if event target is editor)
			const target = e.target as HTMLElement;
			const isInEditor = target.closest('[data-editor="true"]');

			if (!isInEditor) {
				e.preventDefault();
				notebook.setActiveCell(notebook.cells[currentIndex - 1].id);
			}
			return;
		}

		// Arrow Down: Navigate to next cell
		if (e.key === 'ArrowDown' && currentIndex < notebook.cells.length - 1) {
			// Only navigate if not in edit mode
			const target = e.target as HTMLElement;
			const isInEditor = target.closest('[data-editor="true"]');

			if (!isInEditor) {
				e.preventDefault();
				notebook.setActiveCell(notebook.cells[currentIndex + 1].id);
			}
			return;
		}

		// Escape: Exit edit mode / deselect (dispatch custom event to cells)
		if (e.key === 'Escape') {
			e.preventDefault();
			// Dispatch custom event for cells to exit edit mode
			const event = new CustomEvent('notebook:escape', { bubbles: true });
			containerRef?.dispatchEvent(event);
			return;
		}

		// Shift+Enter: Run cell and move to next
		if (e.shiftKey && e.key === 'Enter') {
			e.preventDefault();
			handleExecuteCell(notebook.activeCell).then(() => {
				// Move to next cell or create new one
				if (currentIndex < notebook.cells.length - 1) {
					notebook.setActiveCell(notebook.cells[currentIndex + 1].id);
				} else {
					handleAddCodeCell();
				}
			});
			return;
		}

		// Ctrl+Enter / Cmd+Enter: Run cell
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			e.preventDefault();
			handleExecuteCell(notebook.activeCell);
			return;
		}

		// Alt+Enter: Run cell and insert below
		if (e.altKey && e.key === 'Enter') {
			e.preventDefault();
			handleExecuteCell(notebook.activeCell).then(() => {
				handleAddCodeCell();
			});
			return;
		}

		// Enter on selected cell: Enter edit mode (dispatch custom event)
		if (e.key === 'Enter') {
			const target = e.target as HTMLElement;
			const isInEditor = target.closest('[data-editor="true"]');

			if (!isInEditor) {
				e.preventDefault();
				// Dispatch custom event for cell to enter edit mode
				const event = new CustomEvent('notebook:enter-edit', { bubbles: true });
				containerRef?.dispatchEvent(event);
			}
		}
	}

	// Lifecycle - Load notebook on mount
	$effect(() => {
		loadNotebook();
	});

	// Lifecycle - Keyboard listener with cleanup
	$effect(() => {
		const container = containerRef;
		if (container) {
			container.addEventListener('keydown', handleKeydown);

			return () => {
				container.removeEventListener('keydown', handleKeydown);
			};
		}
	});

	// Lifecycle - Notebook cleanup
	$effect(() => {
		return () => {
			notebook.destroy();
		};
	});
</script>

<div
	bind:this={containerRef}
	class="flex h-full flex-col overflow-hidden bg-background"
	tabindex="-1"
>
	{#if isInitialized}
		<!-- Toolbar -->
		<NotebookToolbar
			{notebook}
			{isReadonly}
			onSave={handleSave}
			onAddCodeCell={handleAddCodeCell}
			onAddMarkdownCell={handleAddMarkdownCell}
			onRunCurrent={handleRunCurrent}
			onRunAll={handleRunAll}
			onStop={handleStop}
			onResetKernel={handleResetKernel}
		/>

		<!-- Readonly mode banner -->
		{#if isReadonly}
			<div class="border-b border-border bg-muted/50 px-4 py-3">
				<Alert class="border-primary/50 bg-primary/10">
					<Eye class="size-4 text-primary" />
					<div class="ml-2">
						<p class="text-sm font-medium text-foreground">Mode lecture seule</p>
						<p class="text-xs text-muted-foreground">
							Vous consultez ce notebook. Vous ne pouvez pas modifier ou exécuter les cellules.
						</p>
					</div>
				</Alert>
			</div>
		{/if}

		<!-- Cells container -->
		<div class="flex-1 overflow-y-auto">
			{#if notebook.cells.length === 0}
				<!-- Empty state -->
				<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
					<p class="text-lg font-medium text-muted-foreground">Notebook vide</p>
					<p class="text-sm text-muted-foreground">
						Commencez par ajouter une cellule de code ou markdown
					</p>
				</div>
			{:else}
				<!-- Render cells -->
				<div class="mx-auto max-w-6xl py-4">
					{#each notebook.cells as _, index (notebook.cells[index].id)}
						<NotebookCell
							bind:cell={notebook.cells[index]}
							isActive={notebook.activeCell === notebook.cells[index].id}
							{isReadonly}
							isFirst={index === 0}
							isLast={index === notebook.cells.length - 1}
							{notebook}
							onSelect={() => handleSelectCell(notebook.cells[index].id)}
							onDelete={() => handleDeleteCell(notebook.cells[index].id)}
							onMoveUp={() => handleMoveUp(notebook.cells[index].id)}
							onMoveDown={() => handleMoveDown(notebook.cells[index].id)}
							onExecute={() => handleExecuteCell(notebook.cells[index].id)}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Status bar -->
		<NotebookStatusBar {notebook} />
	{:else if notebook.isLoading}
		<!-- Loading state -->
		<div class="flex h-full flex-col items-center justify-center gap-4">
			<div
				class="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
			<p class="text-sm text-muted-foreground">Chargement du notebook...</p>
		</div>
	{:else if notebook.cloudError}
		<!-- Error state -->
		<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
			<p class="text-lg font-medium text-destructive">Erreur</p>
			<p class="text-sm text-muted-foreground">{notebook.cloudError}</p>
		</div>
	{/if}
</div>
