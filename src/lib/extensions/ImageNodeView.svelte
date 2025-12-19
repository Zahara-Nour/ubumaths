<!--
	ImageNodeView Component
	=======================

	Custom TipTap NodeView for images with interactive overlay.

	Two editing modes:
	1. OVERLAY (mouse): Hover → buttons → Dialog with ImageAttributePanel
	2. INLINE (keyboard): Focus/double-click → Edit markdown directly

	@see image-extension.ts for the TipTap extension
	@see ImageAttributePanel.svelte for the editing UI
-->
<script lang="ts">
	import { z } from 'zod';
	import { NodeViewWrapper, type NodeViewProps } from 'svelte-tiptap';
	import { Pencil, Trash2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import ImageAttributePanel from '$lib/components/exercises/ImageAttributePanel.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { SIZE_CLASS_STYLES, SIZE_CLASSES, ALIGNMENTS } from './image-constants';
	import type { ImageSizeClass, ImageAlignment } from '$lib/custom-markdown';

	// NodeView props from TipTap
	let { node, updateAttributes, deleteNode, selected }: NodeViewProps = $props();

	// Extract attributes from node
	const src = $derived(node.attrs.src as string);
	const alt = $derived((node.attrs.alt as string) || '');
	const title = $derived((node.attrs.title as string) || '');
	const sizeClass = $derived((node.attrs.sizeClass as ImageSizeClass) || null);
	const widthPercent = $derived((node.attrs.widthPercent as number) || null);
	const alignment = $derived((node.attrs.alignment as ImageAlignment) || null);
	const caption = $derived((node.attrs.caption as string) || '');

	// UI State - Overlay mode (mouse)
	let isHovering = $state(false);
	let editDialogOpen = $state(false);
	let isUpdating = $state(false);

	// UI State - Inline markdown editing mode (keyboard)
	let isEditingMarkdown = $state(false);
	let markdownText = $state('');
	let markdownInputRef = $state<HTMLInputElement | null>(null);
	let hasParseError = $state(false);

	// Zod schema for image attributes validation
	const imageAttributesSchema = z.object({
		src: z.string().min(1, 'URL requise'),
		alt: z.string().default(''),
		title: z.string().nullable().default(null),
		sizeClass: z.enum(SIZE_CLASSES).nullable().default(null),
		widthPercent: z.number().int().min(1).max(100).nullable().default(null),
		alignment: z.enum(ALIGNMENTS).nullable().default(null),
		caption: z.string().nullable().default(null)
	});

	// Compute wrapper styles
	const wrapperStyle = $derived.by(() => {
		const styles: string[] = ['margin-top: 0.5rem', 'margin-bottom: 0.5rem', 'position: relative'];

		// Determine width
		if (sizeClass && SIZE_CLASS_STYLES[sizeClass]) {
			styles.push(`width: ${SIZE_CLASS_STYLES[sizeClass].width}`);
			styles.push(`max-width: ${SIZE_CLASS_STYLES[sizeClass].maxWidth}`);
		} else if (widthPercent !== null) {
			styles.push(`width: ${widthPercent}%`);
		} else {
			styles.push('width: fit-content', 'max-width: 100%');
		}

		// Alignment via margins
		if (alignment === 'center') {
			styles.push('margin-left: auto', 'margin-right: auto');
		} else if (alignment === 'right') {
			styles.push('margin-left: auto', 'margin-right: 0');
		} else {
			styles.push('margin-left: 0', 'margin-right: auto');
		}

		return styles.join('; ');
	});

	/**
	 * Generate markdown string from current image attributes
	 */
	function generateImageMarkdown(): string {
		const altText = alt || 'image';
		let md = `![${altText}](${src})`;

		// Build attributes block
		const attrs: string[] = [];

		if (widthPercent !== null) {
			attrs.push(`width=${widthPercent}%`);
		} else if (sizeClass) {
			attrs.push(`size=${sizeClass}`);
		}

		if (alignment && alignment !== 'center') {
			attrs.push(`align=${alignment}`);
		}

		if (caption) {
			// Escape quotes in caption
			const escapedCaption = caption.replace(/"/g, '\\"');
			attrs.push(`caption="${escapedCaption}"`);
		}

		if (attrs.length > 0) {
			md += `{${attrs.join(' ')}}`;
		}

		return md;
	}

	/**
	 * Enter inline markdown editing mode
	 */
	function enterEditMode() {
		if (isEditingMarkdown || editDialogOpen) return;
		markdownText = generateImageMarkdown();
		hasParseError = false;
		isEditingMarkdown = true;
		// Focus input after render
		requestAnimationFrame(() => {
			markdownInputRef?.focus();
			markdownInputRef?.select();
		});
	}

	/**
	 * Exit inline editing mode and validate
	 * @param shouldSave - true to save changes, false to cancel
	 */
	async function exitEditMode(shouldSave: boolean) {
		if (!isEditingMarkdown) return;

		if (!shouldSave || !markdownText.trim()) {
			// Cancel: restore original state
			isEditingMarkdown = false;
			hasParseError = false;
			return;
		}

		// Try to parse and validate the markdown
		try {
			const { parseMarkdown } = await import('$lib/custom-markdown/parser');
			const ast = parseMarkdown(markdownText);
			const imageNode = ast.children.find((n) => n.type === 'image');

			if (!imageNode || imageNode.type !== 'image') {
				toaster.error('Syntaxe markdown invalide');
				// Restore original state
				isEditingMarkdown = false;
				hasParseError = false;
				return;
			}

			// Validate with Zod
			const validation = imageAttributesSchema.safeParse({
				src: imageNode.src,
				alt: imageNode.alt || '',
				title: imageNode.title || null,
				sizeClass: imageNode.sizeClass || null,
				widthPercent: imageNode.widthPercent || null,
				alignment: imageNode.alignment || null,
				caption: imageNode.caption || null
			});

			if (!validation.success) {
				toaster.error("Attributs d'image invalides");
				// Restore original state
				isEditingMarkdown = false;
				hasParseError = false;
				return;
			}

			// Success: update attributes
			updateAttributes(validation.data);
			isEditingMarkdown = false;
			hasParseError = false;
		} catch (err) {
			console.error('Error parsing image markdown:', err);
			toaster.error('Syntaxe markdown invalide');
			// Restore original state
			isEditingMarkdown = false;
			hasParseError = false;
		}
	}

	/**
	 * Handle keyboard events in inline edit mode
	 */
	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			exitEditMode(true);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			exitEditMode(false);
		}
		// Tab: let it blur naturally, which triggers save
	}

	/**
	 * Handle blur on inline edit input
	 */
	function handleEditBlur() {
		// Small delay to allow Tab to work properly
		setTimeout(() => {
			if (isEditingMarkdown) {
				exitEditMode(true);
			}
		}, 100);
	}

	/**
	 * Live validation while typing (optional visual feedback)
	 */
	async function validateLive() {
		if (!markdownText.trim()) {
			hasParseError = false;
			return;
		}
		try {
			const { parseMarkdown } = await import('$lib/custom-markdown/parser');
			const ast = parseMarkdown(markdownText);
			const imageNode = ast.children.find((n) => n.type === 'image');
			hasParseError = !imageNode || imageNode.type !== 'image';
		} catch {
			hasParseError = true;
		}
	}

	/**
	 * Handle edit button click - open dialog
	 */
	function handleEdit() {
		editDialogOpen = true;
	}

	/**
	 * Handle delete button click
	 */
	function handleDelete() {
		deleteNode();
	}

	/**
	 * Handle double-click on image - enter inline edit mode
	 */
	function handleDoubleClick() {
		enterEditMode();
	}

	/**
	 * Handle focus on image container - enter inline edit mode
	 */
	function handleContainerFocus() {
		// Only enter edit mode on keyboard focus (Tab navigation)
		// Not on click focus (which should use overlay)
		if (!isHovering) {
			enterEditMode();
		}
	}

	/**
	 * Handle markdown insertion from ImageAttributePanel (dialog mode)
	 */
	async function handleImageUpdate(markdown: string) {
		if (isUpdating) return;
		isUpdating = true;

		try {
			const { parseMarkdown } = await import('$lib/custom-markdown/parser');
			const ast = parseMarkdown(markdown);
			const imageNode = ast.children.find((n) => n.type === 'image');

			if (imageNode && imageNode.type === 'image') {
				const validation = imageAttributesSchema.safeParse({
					src: imageNode.src,
					alt: imageNode.alt || '',
					title: imageNode.title || null,
					sizeClass: imageNode.sizeClass || null,
					widthPercent: imageNode.widthPercent || null,
					alignment: imageNode.alignment || null,
					caption: imageNode.caption || null
				});

				if (!validation.success) {
					console.error('Image validation failed:', validation.error);
					toaster.error("Attributs d'image invalides");
					return;
				}

				updateAttributes(validation.data);
			}

			editDialogOpen = false;
		} catch (err) {
			console.error('Error parsing image markdown:', err);
			toaster.error("Impossible de mettre a jour l'image. Veuillez reessayer.");
		} finally {
			isUpdating = false;
		}
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
	class="image-node-view"
	style={wrapperStyle}
	data-selected={selected ? 'true' : undefined}
	data-editing={isEditingMarkdown ? 'true' : undefined}
>
	{#if isEditingMarkdown}
		<!-- Inline Markdown Edit Mode -->
		<div class="markdown-edit-container">
			<input
				bind:this={markdownInputRef}
				type="text"
				bind:value={markdownText}
				oninput={validateLive}
				onkeydown={handleEditKeydown}
				onblur={handleEditBlur}
				class="markdown-input"
				class:has-error={hasParseError}
				spellcheck="false"
				autocomplete="off"
			/>
			<div class="markdown-hint">
				<span><kbd>Enter</kbd> valider</span>
				<span><kbd>Esc</kbd> annuler</span>
				<span><kbd>Tab</kbd> suivant</span>
			</div>
		</div>
	{:else}
		<!-- Image Display Mode -->
		<div
			class="image-container"
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
						title="Modifier l'image (dialog)"
						class="h-8 w-8 p-0"
						disabled={isUpdating}
					>
						<Pencil class="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onclick={handleDelete}
						title="Supprimer l'image"
						class="h-8 w-8 p-0"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			{/if}

			<!-- Image -->
			<img {src} alt={alt || "Image de l'exercice"} {title} class="node-image" />

			<!-- Caption -->
			{#if caption}
				<figcaption class="image-caption">{caption}</figcaption>
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
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Modifier l'image</Dialog.Title>
			<Dialog.Description>Ajustez les parametres d'affichage de votre image.</Dialog.Description>
		</Dialog.Header>

		<ImageAttributePanel
			initialUrl={src}
			initialAlt={alt}
			initialSizeClass={sizeClass || undefined}
			initialWidthPercent={widthPercent || undefined}
			initialAlignment={alignment || undefined}
			initialCaption={caption}
			onInsert={handleImageUpdate}
		/>
	</Dialog.Content>
</Dialog.Root>

<style>
	/* ==================== */
	/* Image Display Mode   */
	/* ==================== */

	.image-container {
		position: relative;
		width: 100%;
		cursor: pointer;
	}

	.image-container:focus {
		outline: none;
	}

	.node-image {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.375rem;
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

	.image-caption {
		font-size: 0.875rem;
		text-align: center;
		margin-top: 0.25rem;
		font-style: italic;
		color: hsl(var(--muted-foreground));
	}

	/* Selected state */
	:global(.image-node-view[data-selected='true'] .image-container) {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
		border-radius: 0.375rem;
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
		font-size: 0.875rem;
		line-height: 1.5;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 0.25rem;
		color: hsl(var(--foreground));
	}

	.markdown-input:focus {
		outline: none;
		border-color: hsl(var(--ring));
		box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
	}

	.markdown-input.has-error {
		border-color: hsl(var(--destructive));
		box-shadow: 0 0 0 2px hsl(var(--destructive) / 0.2);
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
	:global(.image-node-view[data-editing='true']) {
		width: 100% !important;
		max-width: 100% !important;
	}
</style>
