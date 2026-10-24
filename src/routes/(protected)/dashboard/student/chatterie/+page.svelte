<script lang="ts">
	/**
	 * La Chatterie de Faustroll — les Mathoux de l'élève, rangés par race
	 * (`ChatterieRaces`, partagé avec la vue du professeur).
	 *
	 * Page de la navigation élève : pas de bouton retour (règle 7). Mots du lore
	 * uniquement (chaton, matou, sieste…), jamais XP, niveau ni score
	 * (Compendium § IX).
	 *
	 * « Décorer » (lot B des accessoires) : la fenêtre `ChatterieDecorer` suit le
	 * Mathou par sa notion, pour se remettre à jour après chaque achat ou pose.
	 *
	 * Spec : docs/wip/mathoux-conception.md § 9 · doc : docs/systeme/mathoux.md
	 */

	import { Cat } from '@lucide/svelte';
	import ChatterieRaces from '$lib/components/mathoux/ChatterieRaces.svelte';
	import ChatterieDecorer from '$lib/components/mathoux/ChatterieDecorer.svelte';
	import { collectionCountsPhrase } from '$lib/mathoux/collection-logic';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const collection = $derived(data.collection);
	const isEmpty = $derived(collection.races.length === 0);
	const mathoux = $derived(collection.races.flatMap((race) => race.mathoux));

	let decoratingId = $state<string | null>(null);
	const decorating = $derived(mathoux.find((m) => m.notionId === decoratingId) ?? null);
</script>

<svelte:head>
	<title>La Chatterie de Faustroll | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-6">
	<div class="mb-6 flex items-center gap-3">
		<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
			<Cat class="h-6 w-6 text-primary" aria-hidden="true" />
		</div>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">La Chatterie de Faustroll</h1>
			<p class="text-muted-foreground">
				Chaque notion que tu travailles fait naître un Mathou. Il grandit quand tu la maîtrises, et
				fait la sieste quand il est temps de la revoir.
			</p>
		</div>
	</div>

	{#if data.unavailable}
		<p class="rounded-lg border border-border bg-muted/40 p-4" role="status">
			La Chatterie est fermée pour l’instant : réessaie dans un moment.
		</p>
	{:else if isEmpty}
		<p class="rounded-lg border border-border bg-muted/40 p-4" role="status">
			Aucune notion travaillable pour ta classe pour l’instant. Les Mathoux arriveront avec les
			prochaines questions.
		</p>
	{:else}
		<p class="mb-6 font-medium">{collectionCountsPhrase(collection.counts)}</p>

		<ChatterieRaces
			races={collection.races}
			ondecorate={data.ownedDecorations ? (mathou) => (decoratingId = mathou.notionId) : undefined}
		/>

		{#if data.ownedDecorations}
			<ChatterieDecorer
				mathou={decorating}
				{mathoux}
				owned={data.ownedDecorations}
				balance={data.balance}
				onclose={() => (decoratingId = null)}
			/>
		{/if}
	{/if}
</div>
