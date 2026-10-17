<!--
@component
Une tâche d'un guide calculatrice : titre, application à ouvrir, étapes.

Phase 0 : une tâche « vérifier » porte un bandeau (point 4) ; une tâche sans fonction
dédiée dit d'abord qu'il faut contourner (point 7) ; une fonction récente dit à partir
de quelle version (point 9) ; en local, une séquence non relue sur machine est signalée.
-->
<script lang="ts">
	import type { GuideEntry } from '$lib/calculatrices/guide';
	import { Badge } from '$lib/components/ui/badge';
	import GuideStep from './GuideStep.svelte';

	let {
		entry,
		keys,
		modelName
	}: { entry: GuideEntry; keys: Readonly<Record<string, string>>; modelName: string } = $props();

	const task = $derived(entry.task);
	const sequence = $derived(entry.sequence);
</script>

<article class="rounded-lg border bg-card p-4" aria-labelledby="tache-{task.id}">
	<div class="mb-2 flex flex-wrap items-center gap-2">
		<h3 id="tache-{task.id}" class="text-lg font-semibold">{task.title}</h3>
		{#if sequence.app}
			<Badge variant="secondary">Application {sequence.app}</Badge>
		{/if}
		{#if !sequence.verifiedOnDevice}
			<Badge variant="outline" class="border-amber-500 text-amber-700 dark:text-amber-400"
				>Non relu sur la machine</Badge
			>
		{/if}
	</div>

	{#if task.status === 'verifier'}
		<p
			class="mb-2 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100"
		>
			Pour contrôler ton résultat, pas pour le remplacer : le programme attend que tu saches le
			faire sans la calculatrice.
		</p>
	{/if}

	{#if sequence.noDedicatedFunction}
		<p class="mb-2 text-sm font-medium">
			Pas de fonction dédiée sur la {modelName} : voici comment faire autrement.
		</p>
	{/if}

	{#if sequence.sinceVersion}
		<p class="mb-2 text-sm text-muted-foreground">
			À partir de la version {sequence.sinceVersion} du système : mets ta calculatrice à jour si tu ne
			trouves pas.
		</p>
	{/if}

	<ol class="list-decimal space-y-1.5 pl-6 leading-8">
		{#each sequence.steps as step, index (index)}
			<li><GuideStep {step} {keys} /></li>
		{/each}
	</ol>

	{#if sequence.note}
		<p class="mt-2 text-sm text-muted-foreground">{sequence.note}</p>
	{/if}
</article>
