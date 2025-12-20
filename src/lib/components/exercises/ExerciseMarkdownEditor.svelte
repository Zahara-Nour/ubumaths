<!--
	ExerciseMarkdownEditor Component
	==================================

	Specialized markdown editor for exercises, built on top of the generic MarkdownEditor.
	Adds exercise-specific features like image attribute configuration dialog.

	FEATURES (inherited from MarkdownEditor):
	- Raw markdown editing with syntax highlighting
	- Toolbar with markdown shortcuts
	- Live preview with MathLive rendering
	- Support for math ($...$, $$...$$), lists, tables, images
	- Split view: editor + preview
	- Variable editor for parameterized exercises
	- Syntax helper buttons for parameterization

	EXERCISE-SPECIFIC FEATURES:
	- Image upload with Supabase storage
	- ImageAttributePanel for configuring image size, alignment, caption
	- Edit existing images at cursor position
	- Exercise-specific preview via ExerciseMarkdownPreview

	@see MarkdownEditor.svelte for the base component
	@see src/lib/exercises/parser/markdown-parser.ts
	@see src/lib/shared/parameterization for variable system
-->
<script lang="ts">
	import { MarkdownEditor } from '$lib/components/markdown';
	import ImageAttributePanel from './ImageAttributePanel.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { uploadExerciseImage } from '$lib/exercises/services/image-upload';
	import {
		replaceImageMarkdown,
		type ExtractedImage
	} from '$lib/exercises/services/image-markdown-editor';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Variable, ImageSizeClass, ImageAlignment } from '$lib/ubumark';
	import type { DistributionMode } from '$lib/exercises/types';

	// Props
	interface Props {
		/** Markdown content (bindable) */
		value?: string;
		/** Placeholder text for empty editor */
		placeholder?: string;
		/** Show/hide preview panel initially */
		showPreview?: boolean;
		/** Supabase client for image uploads */
		supabase?: SupabaseClient;
		/** User ID for image organization */
		userId?: string;
		/** Variables for parameterization (bindable) */
		variables?: Variable[];
		/** Distribution mode for the exercise (bindable) */
		distributionMode?: DistributionMode;
		/** Custom function identifiers for math parsing (e.g., ['P', 'Q']) */
		genericFunctions?: string[];
	}

	let {
		value = $bindable(''),
		placeholder = 'Ecrivez votre exercice en markdown...',
		showPreview = true,
		supabase,
		userId,
		variables = $bindable([]),
		distributionMode = $bindable('on_demand'),
		genericFunctions
	}: Props = $props();

	// Image configuration dialog state
	let imageDialogOpen = $state(false);
	let uploadedImageUrl = $state('');
	let uploadedImageAlt = $state('');

	// Edit mode state (for editing existing images)
	let editingImage = $state<ExtractedImage | null>(null);
	let editImageSizeClass = $state<ImageSizeClass | undefined>(undefined);
	let editImageWidthPercent = $state<number | undefined>(undefined);
	let editImageAlignment = $state<ImageAlignment | undefined>(undefined);
	let editImageCaption = $state<string | undefined>(undefined);

	// Image upload configuration for MarkdownEditor
	const imageUploadConfig = $derived(
		supabase && userId
			? {
					supabase,
					userId,
					bucket: 'exercise-images',
					uploadFn: async (
						client: SupabaseClient,
						file: File,
						uid: string
					): Promise<{ success: boolean; url?: string; error?: string }> => {
						const result = await uploadExerciseImage(client, file, uid);
						if (result.success && result.url) {
							// Store URL and alt text, then show configuration dialog
							const imageName = file.name.replace(/\.[^/.]+$/, '');
							uploadedImageUrl = result.url;
							uploadedImageAlt = imageName.replace(/[-_]/g, ' ');
							imageDialogOpen = true;
							toaster.success('Image telechargee - Configurez les options');
							// Return success but indicate the markdown will be inserted via dialog
							return { success: true, url: '' }; // Empty URL to prevent auto-insertion
						}
						return result;
					}
				}
			: undefined
	);

	/**
	 * Handle markdown insertion from ImageAttributePanel
	 */
	function handleImageInsert(markdown: string) {
		if (editingImage) {
			// Edit mode: replace existing image
			value = replaceImageMarkdown(value, editingImage, markdown);
			toaster.success('Image mise a jour');
		} else {
			// Insert mode: add new image by appending to value
			// We append to the end since we don't have direct cursor access
			value = value + '\n' + markdown;
			toaster.success("Image inseree dans l'editeur");
		}
		closeImageDialog();
	}

	/**
	 * Close image dialog and reset state
	 */
	function closeImageDialog() {
		imageDialogOpen = false;
		uploadedImageUrl = '';
		uploadedImageAlt = '';
		editingImage = null;
		editImageSizeClass = undefined;
		editImageWidthPercent = undefined;
		editImageAlignment = undefined;
		editImageCaption = undefined;
	}

	/**
	 * Custom image insert handler that checks for editing existing images
	 * The _markdown parameter is not used here as we handle insertion via the dialog
	 */
	function handleImageButtonClick(_markdown: string) {
		// This is called by the generic editor when an image is inserted
		// For exercises, we intercept to show the attribute panel via uploadFn
	}
</script>

<!-- Use the generic MarkdownEditor with exercise-specific customizations -->
<div class="flex h-full flex-col">
	<MarkdownEditor
		bind:value
		{placeholder}
		{showPreview}
		showParameterization={variables && variables.length > 0}
		imageUpload={imageUploadConfig}
		{variables}
		{genericFunctions}
		onImageInsert={handleImageButtonClick}
	>
		<!-- Custom preview slot would go here if MarkdownEditor supported slots -->
	</MarkdownEditor>
</div>

<!-- Image Configuration Dialog (exercise-specific) -->
<Dialog.Root
	bind:open={imageDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			closeImageDialog();
		}
	}}
>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{editingImage ? "Modifier l'image" : "Configurer l'image"}</Dialog.Title>
			<Dialog.Description>
				{editingImage
					? "Modifiez les parametres d'affichage de cette image."
					: "Ajustez les parametres d'affichage de votre image avant de l'inserer."}
			</Dialog.Description>
		</Dialog.Header>

		<ImageAttributePanel
			initialUrl={uploadedImageUrl}
			initialAlt={uploadedImageAlt}
			initialSizeClass={editImageSizeClass}
			initialWidthPercent={editImageWidthPercent}
			initialAlignment={editImageAlignment}
			initialCaption={editImageCaption}
			onInsert={handleImageInsert}
		/>
	</Dialog.Content>
</Dialog.Root>
