<script lang="ts">
	/**
	 * Notebook presentation route — see `NotebookPresentation`.
	 *
	 * `{#key}` on the notebook id: SvelteKit reuses this page component when
	 * navigating between two notebooks, so without it the store (and its
	 * execution lock, decision of 2026-10-04) would leak from one notebook to
	 * the next.
	 */
	import NotebookPresentation from '$lib/components/notebook/presentation/NotebookPresentation.svelte';

	let { data } = $props();
</script>

{#key data.notebook.id}
	<NotebookPresentation
		notebookId={data.notebook.id}
		title={data.notebook.title}
		foreignStudentNotebook={data.foreignStudentNotebook}
	/>
{/key}
