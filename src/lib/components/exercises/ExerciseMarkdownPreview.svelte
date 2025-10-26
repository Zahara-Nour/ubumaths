<!--
	ExerciseMarkdownPreview Component
	==================================

	Lightweight wrapper around ExerciseDisplay for previewing raw markdown.
	Used by ExerciseMarkdownEditor to show live preview without requiring
	a full Exercise object.

	This component creates a minimal Exercise object from markdown content
	for preview purposes only.

	@see ExerciseDisplay.svelte for the main display component
	@see ExerciseMarkdownEditor.svelte for usage
-->
<script lang="ts">
	import ExerciseDisplay from './ExerciseDisplay.svelte';
	import type { Exercise } from '$lib/exercises/types';

	interface Props {
		markdown: string;
	}

	let { markdown }: Props = $props();

	// Create minimal Exercise object for preview
	// This is a temporary object used only for rendering the preview
	const previewExercise = $derived<Exercise>({
		id: 'preview-temp',
		statement_md: markdown,
		solution_md: '',
		distribution_mode: 'on_demand' as const,
		difficulty: 1 as const,
		tags: [],
		created_by: 'preview',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	});
</script>

<!-- Display as static preview (no solution, no interactions) -->
<ExerciseDisplay exercise={previewExercise} mode="instance" />
