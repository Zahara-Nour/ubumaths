<script lang="ts">
	/**
	 * MarkdownCell Component
	 *
	 * Displays and edits markdown cells of a Python notebook.
	 *
	 * Edit mode now uses the shared `MarkdownEditor` (same component the
	 * exercise editor is built on), so teachers get:
	 *   - markdown toolbar (bold/italic/headings/lists/tables/math)
	 *   - live preview with MathLive rendering
	 *   - both math syntaxes UbuMark supports — LaTeX `$...$`, `$$...$$`
	 *     and the simpler custom `~...~`, `~~...~~`
	 *
	 * View mode keeps the lightweight `MarkdownRenderer` (no editor chrome).
	 * Double-click to edit, Escape to return to view.
	 *
	 * V1 omits image upload (markdown `![alt](url)` with hosted images still
	 * works via the renderer) and the parameterization Variable system.
	 */

	import type { NotebookCell } from '$lib/types/notebook';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte';

	// Props
	let {
		cell = $bindable() as NotebookCell,
		isActive = false,
		isReadonly = false
	}: {
		cell: NotebookCell;
		isActive?: boolean;
		isReadonly?: boolean;
	} = $props();

	// State
	let isEditing = $state(false);
	let containerEl = $state<HTMLDivElement | null>(null);

	// Functions
	function handleDoubleClick(): void {
		if (!isReadonly) {
			isEditing = true;
		}
	}

	function handleEditorKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			isEditing = false;
		}
	}

	// Focus the editor's internal textarea when entering edit mode.
	$effect(() => {
		if (isEditing && containerEl) {
			// Defer to next tick so MarkdownEditor has mounted its textarea.
			queueMicrotask(() => {
				const ta = containerEl?.querySelector('textarea');
				ta?.focus();
			});
		}
	});
</script>

<div class="group relative w-full">
	{#if isEditing}
		<!-- Edit mode — split view with toolbar + live preview from the
		     same MarkdownEditor used by the exercise editor. Escape exits. -->
		<div
			bind:this={containerEl}
			class="rounded border-2 border-primary bg-background p-2"
			onkeydown={handleEditorKeydown}
			role="presentation"
		>
			<MarkdownEditor bind:value={cell.source} rows={6} showPreview={true} />
			<div class="mt-2 text-xs text-muted-foreground">
				Appuyez sur <kbd class="rounded bg-muted px-1">Échap</kbd> pour prévisualiser
			</div>
		</div>
	{:else}
		<!-- View mode -->
		<div
			class="cursor-text rounded p-4 transition-colors {isActive
				? 'bg-primary/5 ring-2 ring-primary/20'
				: 'hover:bg-muted/50'}"
			ondblclick={handleDoubleClick}
			role="button"
			tabindex={isReadonly ? -1 : 0}
			onkeydown={(e) => {
				if (e.key === 'Enter' && !isReadonly) {
					handleDoubleClick();
				}
			}}
		>
			{#if (cell.source ?? '').trim().length === 0}
				<p class="text-sm text-muted-foreground italic">
					Double-cliquez pour éditer le markdown...
				</p>
			{:else}
				<MarkdownRenderer content={cell.source} />
			{/if}
		</div>
	{/if}
</div>

<style>
	kbd {
		font-family: ui-monospace, monospace;
		font-size: 0.875em;
	}
</style>
