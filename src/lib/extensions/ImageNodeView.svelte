<!--
	ImageNodeView Component
	=======================

	Custom TipTap NodeView for images with interactive overlay.
	Provides edit/delete buttons on hover and opens ImageAttributePanel
	dialog for editing image properties.

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

	// UI State
	let isHovering = $state(false);
	let editDialogOpen = $state(false);
	let isUpdating = $state(false);

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
	 * Handle markdown insertion from ImageAttributePanel
	 * Parse the markdown to extract new attributes and update the node
	 */
	async function handleImageUpdate(markdown: string) {
		if (isUpdating) return;
		isUpdating = true;

		try {
			// Dynamically import the parser to avoid circular dependencies
			const { parseMarkdown } = await import('$lib/custom-markdown/parser');

			const ast = parseMarkdown(markdown);
			const imageNode = ast.children.find((n) => n.type === 'image');

			if (imageNode && imageNode.type === 'image') {
				// Validate with Zod before updating
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

				// Update all attributes
				updateAttributes(validation.data);
			}

			editDialogOpen = false;
		} catch (err) {
			console.error('Error parsing image markdown:', err);
			toaster.error("Impossible de mettre a jour l'image. Veuillez reessayer.");
			// Keep dialog open on error so user can retry
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
>
	<div
		class="image-container"
		onmouseenter={() => (isHovering = true)}
		onmouseleave={() => (isHovering = false)}
	>
		<!-- Overlay with action buttons -->
		{#if isHovering || selected}
			<div class="overlay-buttons">
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={handleEdit}
					title="Modifier l'image"
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
</NodeViewWrapper>

<!-- Edit Dialog -->
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
	.image-container {
		position: relative;
		width: 100%;
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
</style>
