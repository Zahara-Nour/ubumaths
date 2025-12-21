<!--
	ExerciseRichTextEditor Component
	=================================

	Wrapper around RichTextEditor for editing exercises.
	Provides exercise-specific image upload configuration.

	FEATURES:
	- WYSIWYG editing with markdown storage
	- Image upload to Supabase exercise-images bucket
	- Custom image naming with slug: {slug}-{number}.{ext}
	- Full toolbar with math formulas and templates
	- Preview mode

	USAGE:
	<script>
		import ExerciseRichTextEditor from './ExerciseRichTextEditor.svelte';
		let content = $state('');
		let imageCounter = $state(1);
	</script>

	<ExerciseRichTextEditor
		bind:value={content}
		{supabase}
		{userId}
		imageSlug="pythagore"
		getNextImageNumber={() => imageCounter++}
	/>
-->
<script lang="ts">
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import { uploadExerciseImage, listExerciseImages } from '$lib/exercises/services/image-upload';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { ImageUploadConfig, GalleryImageInfo } from '$lib/components/rich-text/types';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

	interface Props {
		/** Markdown content (bindable) */
		value?: string;
		/** Supabase client for image uploads */
		supabase?: SupabaseClient;
		/** User ID for image organization */
		userId?: string;
		/** Generic function names for math parsing (e.g., ['C', 'P']) */
		genericFunctions?: string[];
		/** Exercise slug for image naming (e.g., 'pythagore') */
		imageSlug?: string;
		/** Function to get the next image number for this exercise */
		getNextImageNumber?: () => number;
		/** Function to ensure slug exists (generates via API if needed) */
		ensureSlugExists?: () => Promise<string | undefined>;
		/** Callback called when content changes */
		onchange?: () => void;
	}

	let {
		value = $bindable(''),
		supabase,
		userId,
		genericFunctions,
		imageSlug,
		getNextImageNumber,
		ensureSlugExists,
		onchange
	}: Props = $props();

	/**
	 * Get the current slug, generating one if needed
	 */
	async function getSlug(): Promise<string | undefined> {
		if (imageSlug) return imageSlug;
		if (ensureSlugExists) return ensureSlugExists();
		return undefined;
	}

	// Convert string array to GenericFunctionConfig
	const genericFunctionsConfig = $derived.by<GenericFunctionConfig | undefined>(() => {
		if (!genericFunctions || genericFunctions.length === 0) {
			return undefined;
		}
		return {
			names: genericFunctions,
			allowDerivatives: true,
			allowInverse: true
		};
	});

	// Create image upload config if supabase and userId are provided
	const imageUploadConfig: ImageUploadConfig | undefined = $derived(
		supabase && userId
			? {
					uploadFn: async (file: File) => {
						// Get or generate slug for naming
						const slug = await getSlug();
						const namingOptions =
							slug && getNextImageNumber ? { slug, imageNumber: getNextImageNumber() } : undefined;
						return uploadExerciseImage(supabase, file, userId, namingOptions);
					},
					// Always enable gallery listing - will get/generate slug when called
					listExistingImages: async (): Promise<GalleryImageInfo[]> => {
						const slug = await getSlug();
						if (!slug) return [];

						const result = await listExerciseImages(supabase, userId, slug);
						if (!result.success || !result.images) {
							return [];
						}
						return result.images.map((img) => ({
							name: img.name,
							url: img.url,
							imageNumber: img.imageNumber
						}));
					}
				}
			: undefined
	);
</script>

<RichTextEditor
	bind:markdownValue={value}
	preset="full"
	imageUpload={imageUploadConfig}
	toolbar={{ preview: true }}
	genericFunctions={genericFunctionsConfig}
	{onchange}
/>
