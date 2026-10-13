<!--
	Page publique d'une figure (ADR 0027). Aucune page parente (pas de liste
	publique des figures) : pas de bouton retour (CLAUDE.md, règle 7).
	`noindex` : la figure se partage par lien, elle ne se cherche pas sur le web.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { Badge } from '$lib/components/ui/badge';
	import StoredFigurePreview from '$lib/components/geometry/StoredFigurePreview.svelte';
	import { evaluateStoredFigure } from '$lib/utils/geometry-figure-script';
	import { GRADES, type GradeCode } from '$lib/types/grades';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Exécuté dans le navigateur seulement : un gros script ne pèse pas sur le serveur
	const result = $derived(browser ? evaluateStoredFigure(data.figure.dsl_script) : null);

	function gradeLabel(code: string): string {
		return GRADES[code as GradeCode]?.displayName ?? code;
	}
</script>

<svelte:head>
	<title>{data.figure.title} | Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="container mx-auto max-w-5xl space-y-4 px-4 py-8">
	<div class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">{data.figure.title}</h1>
		{#if data.figure.grades.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each data.figure.grades as code (code)}
					<Badge variant="outline">{gradeLabel(code)}</Badge>
				{/each}
			</div>
		{/if}
		{#if data.figure.description}
			<p class="whitespace-pre-line text-muted-foreground">{data.figure.description}</p>
		{/if}
	</div>

	<StoredFigurePreview {result} width={640} height={560} />
</div>
