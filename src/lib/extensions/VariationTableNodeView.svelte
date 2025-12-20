<!--
	VariationTableNodeView Component
	=================================

	Custom TipTap NodeView for variation tables with interactive editing.

	Two editing modes:
	1. OVERLAY (mouse): Hover → buttons → Dialog with textarea
	2. INLINE (keyboard): Focus/select → Edit markdown directly

	@see variation-table-extension.ts for the TipTap extension
	@see VariationTable.svelte for the rendering component
-->
<script lang="ts">
	import { NodeViewWrapper, type NodeViewProps } from 'svelte-tiptap';
	import { Pencil, Trash2, Check, X, AlertCircle } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import VariationTable from '$lib/components/markdown/nodes/VariationTable.svelte';
	import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';
	import type { VariationTableNode } from '$lib/ubumark/types/variation-table';
	import { VARIATION_TABLE_TEMPLATE } from './variation-table-extension';

	// NodeView props from TipTap
	let { node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps = $props();

	// Extract attributes from node
	const content = $derived((node.attrs.content as string) || VARIATION_TABLE_TEMPLATE);
	const hasError = $derived((node.attrs.hasError as boolean) || false);
	const errorMessage = $derived((node.attrs.errorMessage as string) || null);

	// UI State - Overlay mode (mouse)
	let isHovering = $state(false);
	let editDialogOpen = $state(false);
	let dialogContent = $state('');
	let dialogPreviewResult = $derived.by(() =>
		parseVariationTableContent(dialogContent.split('\n'))
	);

	// UI State - Inline markdown editing mode (keyboard)
	let isEditingMarkdown = $state(false);
	let markdownText = $state('');
	let markdownInputRef = $state<HTMLTextAreaElement | null>(null);
	let syntaxStatus = $state<'unknown' | 'valid' | 'invalid'>('unknown');
	let parseErrors = $state<string[]>([]);

	// Track previous selected state to detect keyboard navigation
	let wasSelected = $state(false);

	// Parsed node for rendering
	let parsedNode = $state<VariationTableNode | null>(null);

	// Parse content on mount and when content changes
	$effect(() => {
		const result = parseVariationTableContent(content.split('\n'));
		if (result.node) {
			parsedNode = result.node;
		} else {
			parsedNode = null;
		}
	});

	// Enter edit mode when node becomes selected via keyboard (arrow keys)
	$effect(() => {
		if (selected && !wasSelected && !isHovering && !editDialogOpen) {
			// Node just became selected, likely via keyboard navigation
			enterEditMode();
		}
		wasSelected = selected;
	});

	/**
	 * Enter inline markdown editing mode
	 */
	function enterEditMode() {
		if (isEditingMarkdown || editDialogOpen) return;
		markdownText = content;
		syntaxStatus = hasError ? 'invalid' : 'valid';
		parseErrors = hasError && errorMessage ? [errorMessage] : [];
		isEditingMarkdown = true;
		// Focus input after render and place cursor at end
		requestAnimationFrame(() => {
			if (markdownInputRef) {
				markdownInputRef.focus();
				// Place cursor at end
				const len = markdownText.length;
				markdownInputRef.setSelectionRange(len, len);
			}
		});
	}

	/**
	 * Exit inline editing mode and validate
	 * @param shouldSave - true to save changes, false to cancel
	 */
	function exitEditMode(shouldSave: boolean) {
		if (!isEditingMarkdown) return;

		if (!shouldSave) {
			// Cancel: restore original state
			isEditingMarkdown = false;
			syntaxStatus = 'unknown';
			parseErrors = [];
			return;
		}

		// Validate and save
		const result = parseVariationTableContent(markdownText.split('\n'));

		if (result.node) {
			// Valid: update content and clear error state
			updateAttributes({
				content: markdownText,
				hasError: false,
				errorMessage: null
			});
			parsedNode = result.node;
			isEditingMarkdown = false;
			syntaxStatus = 'unknown';
			parseErrors = [];
		} else {
			// Invalid: keep content but mark as error
			const errorMsg = result.errors.map((e) => e.message).join('; ') || 'Syntaxe invalide';
			updateAttributes({
				content: markdownText,
				hasError: true,
				errorMessage: errorMsg
			});
			isEditingMarkdown = false;
			syntaxStatus = 'unknown';
			parseErrors = [];
		}
	}

	/**
	 * Exit edit mode and move cursor to before/after the table
	 * @param direction - 'before' or 'after' the table
	 */
	function exitEditModeAndMoveCursor(direction: 'before' | 'after') {
		// First validate and save
		exitEditMode(true);

		// Then move cursor using TipTap editor
		if (editor && typeof getPos === 'function') {
			const pos = getPos();
			if (typeof pos === 'number') {
				const targetPos = direction === 'before' ? pos : pos + node.nodeSize;
				editor.commands.setTextSelection(targetPos);
				editor.commands.focus();
			}
		}
	}

	/**
	 * Handle keyboard events in inline edit mode
	 */
	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			exitEditMode(false);
		} else if (event.key === 'Enter' && event.ctrlKey) {
			// Ctrl+Enter to save (regular Enter adds newlines)
			event.preventDefault();
			exitEditMode(true);
		} else if (event.key === 'ArrowUp') {
			// If cursor at first line start, exit and move before
			const textarea = event.target as HTMLTextAreaElement;
			const cursorPos = textarea.selectionStart;
			const firstLineEnd = textarea.value.indexOf('\n');
			if (cursorPos <= (firstLineEnd === -1 ? textarea.value.length : firstLineEnd)) {
				// Check if we're at the very start
				if (cursorPos === 0) {
					event.preventDefault();
					exitEditModeAndMoveCursor('before');
				}
			}
		} else if (event.key === 'ArrowDown') {
			// If cursor at last line, exit and move after
			const textarea = event.target as HTMLTextAreaElement;
			const cursorPos = textarea.selectionStart;
			const lastLineStart = textarea.value.lastIndexOf('\n') + 1;
			if (cursorPos >= lastLineStart) {
				// Check if we're at the very end
				if (cursorPos === textarea.value.length) {
					event.preventDefault();
					exitEditModeAndMoveCursor('after');
				}
			}
		}
	}

	/**
	 * Handle blur on inline edit input
	 */
	function handleEditBlur() {
		// Small delay to allow other actions
		setTimeout(() => {
			if (isEditingMarkdown) {
				exitEditMode(true);
			}
		}, 150);
	}

	// Debounce timer for live validation
	let validateTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Live validation while typing (visual feedback)
	 */
	function validateLive() {
		// Clear previous timeout
		if (validateTimeout) {
			clearTimeout(validateTimeout);
		}

		// Debounce validation
		validateTimeout = setTimeout(() => {
			if (!markdownText.trim()) {
				syntaxStatus = 'unknown';
				parseErrors = [];
				return;
			}

			const result = parseVariationTableContent(markdownText.split('\n'));
			if (result.node) {
				syntaxStatus = 'valid';
				parseErrors = [];
			} else {
				syntaxStatus = 'invalid';
				parseErrors = result.errors.map((e) => e.message);
			}
		}, 200);
	}

	/**
	 * Handle edit button click - open dialog
	 */
	function handleEdit() {
		dialogContent = content;
		editDialogOpen = true;
	}

	/**
	 * Handle delete button click
	 */
	function handleDelete() {
		deleteNode();
	}

	/**
	 * Handle double-click on table - enter inline edit mode
	 */
	function handleDoubleClick() {
		enterEditMode();
	}

	/**
	 * Handle focus on container - enter inline edit mode
	 */
	function handleContainerFocus() {
		if (!isHovering) {
			enterEditMode();
		}
	}

	/**
	 * Save from dialog
	 */
	function handleDialogSave() {
		const result = parseVariationTableContent(dialogContent.split('\n'));

		if (result.node) {
			updateAttributes({
				content: dialogContent,
				hasError: false,
				errorMessage: null
			});
			parsedNode = result.node;
		} else {
			const errorMsg = result.errors.map((e) => e.message).join('; ') || 'Syntaxe invalide';
			updateAttributes({
				content: dialogContent,
				hasError: true,
				errorMessage: errorMsg
			});
		}

		editDialogOpen = false;
	}

	/**
	 * Close dialog without saving
	 */
	function closeDialog() {
		editDialogOpen = false;
	}
</script>

<NodeViewWrapper
	as="div"
	class="variation-table-node-view"
	data-selected={selected ? 'true' : undefined}
	data-editing={isEditingMarkdown ? 'true' : undefined}
	data-has-error={hasError ? 'true' : undefined}
>
	{#if isEditingMarkdown}
		<!-- Inline Markdown Edit Mode -->
		<div class="markdown-edit-container">
			<!-- Status indicator above textarea -->
			<div class="status-row">
				<span class="status-label">Tableau de variation (Markdown)</span>
				{#if syntaxStatus === 'valid'}
					<div class="status-icon valid"><Check class="h-4 w-4" /></div>
				{:else if syntaxStatus === 'invalid'}
					<div class="status-icon invalid"><X class="h-4 w-4" /></div>
				{/if}
			</div>
			<textarea
				bind:this={markdownInputRef}
				bind:value={markdownText}
				oninput={validateLive}
				onkeydown={handleEditKeydown}
				onblur={handleEditBlur}
				class="markdown-input"
				class:is-valid={syntaxStatus === 'valid'}
				class:is-invalid={syntaxStatus === 'invalid'}
				spellcheck="false"
				autocomplete="off"
				rows="12"
			></textarea>
			{#if parseErrors.length > 0}
				<div class="error-messages">
					{#each parseErrors as error, i (i)}
						<span class="error-message"><AlertCircle class="h-3 w-3" /> {error}</span>
					{/each}
				</div>
			{/if}
			<div class="markdown-hint">
				<span><kbd>Ctrl+Enter</kbd> valider</span>
				<span><kbd>Esc</kbd> annuler</span>
			</div>
		</div>
	{:else}
		<!-- Table Display Mode -->
		<div
			class="table-container"
			onmouseenter={() => (isHovering = true)}
			onmouseleave={() => (isHovering = false)}
			ondblclick={handleDoubleClick}
			onfocus={handleContainerFocus}
			role="button"
			tabindex="0"
		>
			<!-- Overlay with action buttons -->
			{#if isHovering || selected}
				<div class="overlay-buttons">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onclick={handleEdit}
						title="Modifier le tableau"
						class="h-8 w-8 p-0"
					>
						<Pencil class="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onclick={handleDelete}
						title="Supprimer le tableau"
						class="h-8 w-8 p-0"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			{/if}

			<!-- Table content -->
			{#if hasError}
				<div class="error-display">
					<div class="error-header">
						<AlertCircle class="h-5 w-5" />
						<span>Erreur de syntaxe</span>
					</div>
					<pre class="error-code">{content}</pre>
					{#if errorMessage}
						<p class="error-detail">{errorMessage}</p>
					{/if}
				</div>
			{:else if parsedNode}
				<VariationTable node={parsedNode} />
			{:else}
				<div class="loading">Chargement...</div>
			{/if}
		</div>
	{/if}
</NodeViewWrapper>

<!-- Edit Dialog (for overlay mode) -->
<Dialog.Root
	bind:open={editDialogOpen}
	onOpenChange={(open) => {
		if (!open) closeDialog();
	}}
>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Modifier le tableau de variation</Dialog.Title>
			<Dialog.Description>Editez le code markdown du tableau de variation.</Dialog.Description>
		</Dialog.Header>

		<div class="dialog-content">
			<textarea
				bind:value={dialogContent}
				class="dialog-textarea"
				spellcheck="false"
				autocomplete="off"
				rows="15"
			></textarea>

			<div class="dialog-preview">
				<h4 class="preview-title">Apercu</h4>
				{#if dialogPreviewResult.node}
					<VariationTable node={dialogPreviewResult.node} />
				{:else}
					<div class="preview-error">
						<AlertCircle class="h-4 w-4" />
						<span>Syntaxe invalide</span>
						{#each dialogPreviewResult.errors as error, i (i)}
							<p class="preview-error-detail">{error.message}</p>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={closeDialog}>Annuler</Button>
			<Button onclick={handleDialogSave}>Enregistrer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	/* ==================== */
	/* Table Display Mode   */
	/* ==================== */

	.table-container {
		position: relative;
		width: 100%;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.5rem;
		transition: background-color 0.15s ease;
	}

	.table-container:hover {
		background-color: hsl(var(--muted) / 0.3);
	}

	.table-container:focus {
		outline: none;
	}

	.overlay-buttons {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		gap: 0.25rem;
		z-index: 10;
		background: hsl(var(--background) / 0.95);
		backdrop-filter: blur(4px);
		padding: 0.25rem;
		border-radius: 0.375rem;
		box-shadow: 0 2px 8px hsl(var(--foreground) / 0.1);
		border: 1px solid hsl(var(--border));
	}

	/* Selected state */
	:global(.variation-table-node-view[data-selected='true'] .table-container) {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
		border-radius: 0.5rem;
	}

	/* Error state */
	:global(.variation-table-node-view[data-has-error='true'] .table-container) {
		border: 2px solid hsl(0 84% 60%);
		border-radius: 0.5rem;
	}

	.error-display {
		padding: 1rem;
		background: hsl(0 84% 60% / 0.1);
		border-radius: 0.375rem;
	}

	.error-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: hsl(0 84% 60%);
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.error-code {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.75rem;
		background: hsl(var(--muted));
		padding: 0.75rem;
		border-radius: 0.25rem;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.error-detail {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: hsl(0 84% 60%);
	}

	.loading {
		padding: 2rem;
		text-align: center;
		color: hsl(var(--muted-foreground));
	}

	/* ==================== */
	/* Markdown Edit Mode   */
	/* ==================== */

	.markdown-edit-container {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		background: hsl(var(--muted) / 0.5);
		border: 2px solid hsl(var(--ring));
		border-radius: 0.375rem;
	}

	.markdown-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 0.25rem;
		color: hsl(var(--foreground));
		resize: vertical;
		min-height: 10rem;
	}

	.markdown-input:focus {
		outline: none;
		border-color: hsl(var(--ring));
		box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
	}

	.markdown-input.is-valid,
	.markdown-input.is-valid:focus {
		border-color: hsl(142 76% 36%) !important;
		box-shadow: 0 0 0 2px hsl(142 76% 36% / 0.2) !important;
	}

	.markdown-input.is-invalid,
	.markdown-input.is-invalid:focus {
		border-color: hsl(0 84% 60%) !important;
		box-shadow: 0 0 0 2px hsl(0 84% 60% / 0.2) !important;
	}

	.status-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.25rem;
	}

	.status-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
	}

	.status-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
	}

	.status-icon.valid {
		background: hsl(142 76% 36% / 0.15);
		color: hsl(142 76% 36%);
	}

	.status-icon.invalid {
		background: hsl(0 84% 60% / 0.15);
		color: hsl(0 84% 60%);
	}

	.error-messages {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		background: hsl(0 84% 60% / 0.1);
		border-radius: 0.25rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: hsl(0 84% 60%);
	}

	.markdown-hint {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
	}

	.markdown-hint kbd {
		display: inline-block;
		padding: 0.125rem 0.375rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.6875rem;
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 0.25rem;
		box-shadow: 0 1px 0 hsl(var(--border));
	}

	/* Editing state - expand to full width */
	:global(.variation-table-node-view[data-editing='true']) {
		width: 100% !important;
		max-width: 100% !important;
	}

	/* ==================== */
	/* Dialog Styles        */
	/* ==================== */

	.dialog-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.dialog-textarea {
		width: 100%;
		padding: 0.75rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 0.375rem;
		color: hsl(var(--foreground));
		resize: vertical;
	}

	.dialog-textarea:focus {
		outline: none;
		border-color: hsl(var(--ring));
		box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
	}

	.dialog-preview {
		padding: 1rem;
		background: hsl(var(--muted) / 0.3);
		border-radius: 0.375rem;
		overflow-x: auto;
	}

	.preview-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		margin-bottom: 0.75rem;
	}

	.preview-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		color: hsl(0 84% 60%);
		text-align: center;
	}

	.preview-error-detail {
		font-size: 0.75rem;
		margin: 0;
	}
</style>
