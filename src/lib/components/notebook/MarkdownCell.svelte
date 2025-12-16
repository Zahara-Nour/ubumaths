<script lang="ts">
	/**
	 * MarkdownCell Component
	 *
	 * Displays and edits markdown cells
	 * Features:
	 * - View mode: renders markdown with MarkdownRenderer
	 * - Edit mode: shows textarea for editing
	 * - Double-click to edit, Escape to preview
	 */

	import type { NotebookCell } from '$lib/types/notebook';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';

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

	// Functions
	function handleDoubleClick(): void {
		if (!isReadonly) {
			isEditing = true;
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			isEditing = false;
		}
	}

	function handleBlur(): void {
		// Don't auto-exit edit mode on blur - user must press Escape or click outside
		// This allows clicking inside the textarea without losing focus
	}

	// Focus textarea when entering edit mode
	$effect(() => {
		if (isEditing) {
			const textarea = document.getElementById(`markdown-${cell.id}`);
			if (textarea) {
				(textarea as HTMLTextAreaElement).focus();
			}
		}
	});
</script>

<div class="group relative w-full">
	{#if isEditing}
		<!-- Edit mode -->
		<div class="rounded border-2 border-primary bg-background p-2">
			<textarea
				id="markdown-{cell.id}"
				bind:value={cell.source}
				onkeydown={handleKeydown}
				onblur={handleBlur}
				class="min-h-[100px] w-full resize-y bg-transparent font-mono text-sm text-foreground focus:outline-none"
				placeholder="# Écrivez votre markdown ici...

**Gras**, *italique*, [lien](url)

- Liste
- À puces"
				spellcheck="false"
				disabled={isReadonly}
			></textarea>
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
			{#if cell.source.trim().length === 0}
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
