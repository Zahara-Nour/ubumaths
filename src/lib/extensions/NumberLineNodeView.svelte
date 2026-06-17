<!--
	NumberLineNodeView Component
	==============================

	Custom TipTap NodeView for number lines (droites graduées) with interactive editing.

	Two editing modes:
	1. OVERLAY (mouse): Hover → buttons → Dialog with textarea
	2. INLINE (keyboard): Focus/select → Edit markdown directly

	@see number-line-extension.ts for the TipTap extension
	@see NumberLine.svelte for the rendering component
-->
<script lang="ts">
	import { NodeViewWrapper } from 'svelte-tiptap';
	import type { Editor } from '@tiptap/core';

	interface NodeViewProps {
		editor: Editor;
		node: { attrs: Record<string, unknown>; nodeSize: number };
		updateAttributes: (attrs: Record<string, unknown>) => void;
		deleteNode: () => void;
		getPos: () => number | undefined;
		selected: boolean;
	}
	import { Pencil, Trash2, Check, X, AlertCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import NumberLine from '$lib/components/markdown/nodes/NumberLine.svelte';
	import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
	import { NUMBER_LINE_TEMPLATE } from './number-line-extension';

	let { node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps = $props();

	const content = $derived((node.attrs.content as string) || NUMBER_LINE_TEMPLATE);
	const hasError = $derived((node.attrs.hasError as boolean) || false);
	const errorMessage = $derived((node.attrs.errorMessage as string) || null);

	// UI State - Overlay mode (mouse)
	let isHovering = $state(false);
	let editDialogOpen = $state(false);
	let dialogContent = $state('');
	let dialogPreviewResult = $derived.by(() => parseNumberLineContent(dialogContent.split('\n')));

	// UI State - Inline markdown editing mode (keyboard)
	let isEditingMarkdown = $state(false);
	let markdownText = $state('');
	let markdownInputRef = $state<HTMLTextAreaElement | null>(null);
	let syntaxStatus = $state<'unknown' | 'valid' | 'invalid'>('unknown');
	let parseErrors = $state<string[]>([]);

	let wasSelected = $state(false);
	let hasAutoOpened = $state(false);

	// Parsed node for rendering
	let parsedNode = $derived.by(() => {
		const result = parseNumberLineContent(content.split('\n'));
		return result.node ?? null;
	});

	// Auto-open edit mode for newly created nodes
	$effect(() => {
		if (!hasAutoOpened && content === NUMBER_LINE_TEMPLATE) {
			hasAutoOpened = true;
			requestAnimationFrame(() => {
				enterEditMode();
			});
		}
	});

	// Enter edit mode when node becomes selected via keyboard
	$effect(() => {
		if (selected && !wasSelected && !isHovering && !editDialogOpen) {
			enterEditMode();
		}
		wasSelected = selected;
	});

	function enterEditMode() {
		if (isEditingMarkdown || editDialogOpen) return;
		markdownText = content;
		syntaxStatus = hasError ? 'invalid' : 'valid';
		parseErrors = hasError && errorMessage ? [errorMessage] : [];
		isEditingMarkdown = true;
		requestAnimationFrame(() => {
			if (markdownInputRef) {
				markdownInputRef.focus();
				const len = markdownText.length;
				markdownInputRef.setSelectionRange(len, len);
			}
		});
	}

	function exitEditMode(shouldSave: boolean) {
		if (!isEditingMarkdown) return;

		if (!shouldSave) {
			isEditingMarkdown = false;
			syntaxStatus = 'unknown';
			parseErrors = [];
			return;
		}

		const result = parseNumberLineContent(markdownText.split('\n'));

		if (result.node) {
			updateAttributes({
				content: markdownText,
				hasError: false,
				errorMessage: null
			});
			isEditingMarkdown = false;
			syntaxStatus = 'unknown';
			parseErrors = [];
		} else {
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

	function exitEditModeAndMoveCursor(direction: 'before' | 'after') {
		exitEditMode(true);

		if (editor && typeof getPos === 'function') {
			const pos = getPos();
			if (typeof pos === 'number') {
				const targetPos = direction === 'before' ? pos : pos + node.nodeSize;
				editor.commands.setTextSelection(targetPos);
				editor.commands.focus();
			}
		}
	}

	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			exitEditMode(false);
		} else if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault();
			exitEditMode(true);
		} else if (event.key === 'ArrowUp') {
			const textarea = event.target as HTMLTextAreaElement;
			const cursorPos = textarea.selectionStart;
			if (cursorPos === 0) {
				event.preventDefault();
				exitEditModeAndMoveCursor('before');
			}
		} else if (event.key === 'ArrowDown') {
			const textarea = event.target as HTMLTextAreaElement;
			const cursorPos = textarea.selectionStart;
			if (cursorPos === textarea.value.length) {
				event.preventDefault();
				exitEditModeAndMoveCursor('after');
			}
		}
	}

	function handleEditBlur() {
		setTimeout(() => {
			if (isEditingMarkdown) {
				exitEditMode(true);
			}
		}, 150);
	}

	let validateTimeout: ReturnType<typeof setTimeout> | null = null;

	// Cleanup timeout on destroy
	$effect(() => {
		return () => {
			if (validateTimeout) clearTimeout(validateTimeout);
		};
	});

	function validateLive() {
		if (validateTimeout) {
			clearTimeout(validateTimeout);
		}

		validateTimeout = setTimeout(() => {
			if (!markdownText.trim()) {
				syntaxStatus = 'unknown';
				parseErrors = [];
				return;
			}

			const result = parseNumberLineContent(markdownText.split('\n'));
			if (result.node) {
				syntaxStatus = 'valid';
				parseErrors = [];
			} else {
				syntaxStatus = 'invalid';
				parseErrors = result.errors.map((e) => e.message);
			}
		}, 200);
	}

	function handleEdit() {
		dialogContent = content;
		editDialogOpen = true;
	}

	function handleDelete() {
		deleteNode();
	}

	function handleDoubleClick() {
		enterEditMode();
	}

	function handleContainerFocus() {
		if (!isHovering) {
			enterEditMode();
		}
	}

	function handleDialogSave() {
		const result = parseNumberLineContent(dialogContent.split('\n'));

		if (result.node) {
			updateAttributes({
				content: dialogContent,
				hasError: false,
				errorMessage: null
			});
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

	function closeDialog() {
		editDialogOpen = false;
	}
</script>

<NodeViewWrapper
	as="div"
	class="number-line-node-view"
	data-selected={selected ? 'true' : undefined}
	data-editing={isEditingMarkdown ? 'true' : undefined}
	data-has-error={hasError ? 'true' : undefined}
>
	{#if isEditingMarkdown}
		<!-- Inline Markdown Edit Mode -->
		<div class="markdown-edit-container">
			<div class="status-row">
				<span class="status-label">Droite graduee (Markdown)</span>
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
				rows="8"
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
		<!-- Number Line Display Mode -->
		<div
			class="line-container"
			onmouseenter={() => (isHovering = true)}
			onmouseleave={() => (isHovering = false)}
			ondblclick={handleDoubleClick}
			onfocus={handleContainerFocus}
			role="button"
			tabindex="0"
		>
			{#if isHovering || selected}
				<div class="overlay-buttons">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onclick={handleEdit}
						title="Modifier la droite graduee"
						class="h-8 w-8 p-0"
					>
						<Pencil class="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onclick={handleDelete}
						title="Supprimer la droite graduee"
						class="h-8 w-8 p-0"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			{/if}

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
				<NumberLine node={parsedNode} />
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
			<Dialog.Title>Modifier la droite graduee</Dialog.Title>
			<Dialog.Description>Editez le code markdown de la droite graduee.</Dialog.Description>
		</Dialog.Header>

		<div class="dialog-content">
			<textarea
				bind:value={dialogContent}
				class="dialog-textarea"
				spellcheck="false"
				autocomplete="off"
				rows="10"
			></textarea>

			<div class="dialog-preview">
				<h4 class="preview-title">Apercu</h4>
				{#if dialogPreviewResult.node}
					<NumberLine node={dialogPreviewResult.node} />
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
	/* Line Display Mode    */
	/* ==================== */

	.line-container {
		position: relative;
		width: 100%;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.5rem;
		transition: background-color 0.15s ease;
	}

	.line-container:hover {
		background-color: hsl(var(--muted) / 0.3);
	}

	.line-container:focus {
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

	:global(.number-line-node-view[data-selected='true'] .line-container) {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
		border-radius: 0.5rem;
	}

	:global(.number-line-node-view[data-has-error='true'] .line-container) {
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
		min-height: 6rem;
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

	:global(.number-line-node-view[data-editing='true']) {
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
