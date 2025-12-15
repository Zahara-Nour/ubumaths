<!--
	ExerciseRichTextEditor Component
	=================================

	Wrapper around RichTextEditor for editing exercises.
	Provides exercise-specific image upload configuration.

	FEATURES:
	- WYSIWYG editing with markdown storage
	- Image upload to Supabase exercise-images bucket
	- Full toolbar with math formulas and templates
	- Preview mode

	USAGE:
	<script>
		import ExerciseRichTextEditor from './ExerciseRichTextEditor.svelte';
		let content = $state('');
	</script>

	<ExerciseRichTextEditor bind:value={content} {supabase} {userId} />
-->
<script lang="ts">
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import { uploadExerciseImage } from '$lib/exercises/services/image-upload';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { ImageUploadConfig } from '$lib/components/rich-text/types';

	interface Props {
		/** Markdown content (bindable) */
		value?: string;
		/** Supabase client for image uploads */
		supabase?: SupabaseClient;
		/** User ID for image organization */
		userId?: string;
	}

	let { value = $bindable(''), supabase, userId }: Props = $props();

	// Create image upload config if supabase and userId are provided
	const imageUploadConfig: ImageUploadConfig | undefined = $derived(
		supabase && userId
			? {
					uploadFn: async (file: File) => uploadExerciseImage(supabase, file, userId)
				}
			: undefined
	);
</script>

<RichTextEditor
	bind:markdownValue={value}
	preset="full"
	imageUpload={imageUploadConfig}
	toolbar={{ preview: true }}
/>
