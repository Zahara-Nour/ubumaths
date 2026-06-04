<script lang="ts">
	/**
	 * Notebook presentation route.
	 *
	 * Renders the notebook as a full-screen cell-by-cell slideshow built on
	 * UbuSlides (`$lib/slides`). Approach A: `scaleContent: false` so each
	 * slide fills the container with natural CSS sizing and scrolls on
	 * overflow — matches the "live coding fits any output" need over the
	 * "cinema cabaret" aesthetic.
	 *
	 * Each notebook cell becomes one slide:
	 *   - markdown → `<UbuMarkSlide content={cell.source} />` (math + tables
	 *     + variation tables for free via UbuMark)
	 *   - code     → `<NotebookCodeSlide cell notebook />` (read-only editor
	 *     view + ▶ button bound to the presentation-scoped store)
	 *   - checkpoint → `<NotebookCheckpointSlide cell notebook />`
	 *
	 * A fresh `NotebookStore` is mounted here so the presentation tab gets
	 * its own Pyodide context (the editor tab is unaffected if the teacher
	 * has it open in parallel).
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Deck, Slide, UbuMarkSlide } from '$lib/slides';
	import { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Loader2 } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import NotebookCodeSlide from '$lib/components/notebook/presentation/NotebookCodeSlide.svelte';
	import NotebookCheckpointSlide from '$lib/components/notebook/presentation/NotebookCheckpointSlide.svelte';
	import type { CheckpointCell } from '$lib/types/notebook';

	let { data } = $props();

	const notebook = new NotebookStore();
	// Presentation mode is a viewing surface — never persist checkpoint runs
	// from here. A teacher running cells live in class shouldn't pollute the
	// dashboard with their own attempts (and the RLS policy would refuse the
	// POST anyway since they're not a student of their own notebook). A
	// student reviewing the notebook in presentation also follows the same
	// rule for consistency. Recording is the editor route's job.
	notebook.previewMode = true;
	let notebookLoaded = $state(false);

	// Cells the Deck iterates over. Derived from the store so re-runs that
	// update outputs propagate to the slide content.
	let cells = $derived(notebook.cells);

	onMount(async () => {
		const loaded = await notebook.loadNotebook(data.notebook.id);
		if (!loaded) {
			toaster.error('Échec du chargement du notebook');
			return;
		}
		notebook.initPyodide();
		// IMPORTANT: set `notebookLoaded` AFTER `initPyodide()` so the
		// template's `$derived` reads of `notebook.isReady` and friends
		// happen for the first time once `_executor` already exists.
		// The store keeps `_executor` as a plain class field (not `$state`),
		// so a derived that first evaluates with `_executor === null` would
		// subscribe to nothing and never re-fire when the executor is set.
		notebookLoaded = true;
	});

	function exitPresentation(): void {
		// Esc / button → back to the editor route in the same tab.
		void goto(`/python-notebook/${data.notebook.id}`);
	}

	function handleKeydown(e: KeyboardEvent): void {
		// Esc closes the presentation. Skip when the event was already
		// handled (UbuSlides' Deck consumes Escape to exit overview mode,
		// calls preventDefault — we don't want to nuke the presentation
		// after the user simply exited overview).
		if (e.key !== 'Escape' || e.defaultPrevented) return;
		exitPresentation();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{data.notebook.title} — Présentation</title>
</svelte:head>

<div class="fixed inset-0 z-50 flex flex-col bg-background">
	<!-- Top bar: exit button + title + cell counter (counter wired by Deck's
	     own Progress component below; we keep this header minimal). -->
	<div class="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
		<Button variant="ghost" size="sm" onclick={exitPresentation} class="gap-1.5">
			<ArrowLeft class="size-4" />
			<span>Quitter (Échap)</span>
		</Button>
		<h1 class="truncate text-sm font-medium">{data.notebook.title}</h1>
		<div class="min-w-48 text-right text-xs text-muted-foreground">
			{#if !notebookLoaded}
				<span class="inline-flex items-center gap-1">
					<Loader2 class="size-3 animate-spin" />
					Chargement notebook…
				</span>
			{:else if notebook.hasError}
				<span class="text-destructive">Erreur Pyodide</span>
			{:else if !notebook.isReady}
				<span class="inline-flex items-center gap-1">
					<Loader2 class="size-3 animate-spin" />
					{notebook.loadingStage || 'Chargement Pyodide…'}
					{#if notebook.loadingProgress > 0 && notebook.loadingProgress < 100}
						({notebook.loadingProgress}%)
					{/if}
				</span>
			{:else}
				Pyodide prêt
			{/if}
		</div>
	</div>

	<!-- Deck takes the rest of the viewport. `scaleContent: false` is the
	     default but we set it explicitly so the intent is visible. -->
	<div class="relative flex-1 overflow-hidden">
		{#if notebookLoaded && cells.length > 0}
			<Deck
				config={{
					scaleContent: false,
					controls: true,
					progress: true,
					slideNumber: true,
					hash: true,
					hashOneBasedIndex: true,
					transition: 'fade',
					transitionSpeed: 'fast',
					keyboard: true,
					touch: true
				}}
			>
				{#each cells as cell (cell.id)}
					{#if cell.type === 'markdown'}
						<UbuMarkSlide content={cell.source} />
					{:else if cell.type === 'code'}
						<Slide>
							<NotebookCodeSlide {cell} {notebook} />
						</Slide>
					{:else if cell.type === 'checkpoint'}
						<Slide>
							<NotebookCheckpointSlide cell={cell as CheckpointCell} {notebook} />
						</Slide>
					{/if}
				{/each}
			</Deck>
		{:else if notebookLoaded && cells.length === 0}
			<div class="flex h-full items-center justify-center text-center">
				<div class="space-y-2">
					<p class="text-lg font-medium">Aucune cellule à présenter</p>
					<p class="text-sm text-muted-foreground">
						Ce notebook ne contient encore aucune cellule. Ajoute du contenu depuis l'éditeur.
					</p>
				</div>
			</div>
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="flex items-center gap-2 text-muted-foreground">
					<Loader2 class="size-5 animate-spin" />
					<span>Chargement du notebook…</span>
				</div>
			</div>
		{/if}
	</div>
</div>
