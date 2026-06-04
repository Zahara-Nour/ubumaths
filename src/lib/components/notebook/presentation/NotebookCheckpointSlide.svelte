<!--
	NotebookCheckpointSlide — Checkpoint cell as a presentation slide.

	Thin wrapper around the existing `CheckpointCell` component. The cell
	reads the presentation-scoped store for run state, so re-running a
	checkpoint live during class works end-to-end (Pyodide context, run
	counter, hint reveal threshold, etc.).

	The `hideElement` background trick used elsewhere doesn't apply here —
	we want the cell fully visible, just sized to fit the slide.
-->
<script lang="ts">
	import type { CheckpointCell as CheckpointCellType } from '$lib/types/notebook';
	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import CheckpointCell from '$lib/components/notebook/CheckpointCell.svelte';

	interface Props {
		cell: CheckpointCellType;
		notebook: NotebookStore;
	}

	let { cell, notebook }: Props = $props();
</script>

<div class="flex h-full w-full items-start justify-center overflow-auto p-8">
	<div class="w-full max-w-4xl">
		<CheckpointCell {cell} {notebook} />
	</div>
</div>
