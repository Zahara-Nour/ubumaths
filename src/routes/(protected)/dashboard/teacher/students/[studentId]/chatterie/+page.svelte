<script lang="ts">
	/**
	 * La Chatterie d'un élève, vue par le professeur : les mêmes Mathoux que
	 * l'élève voit, sans « Réveiller » ni « Faire grandir » (actions de l'élève).
	 *
	 * Retour vers l'onglet Mathoux de la Gamification, seule page qui y mène.
	 *
	 * Phase 0 : docs/wip/mathoux-prof-progress.md · doc : docs/systeme/mathoux.md
	 */

	import { Cat } from '@lucide/svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import ChatterieRaces from '$lib/components/mathoux/ChatterieRaces.svelte';
	import { collectionCountsPhrase } from '$lib/mathoux/collection-logic';
	import type { PageData } from './$types';

	const BACK_HREF = '/dashboard/teacher/gamification/mathoux';

	let { data }: { data: PageData } = $props();

	const collection = $derived(data.collection);
	const isEmpty = $derived(collection.races.length === 0);
</script>

<svelte:head>
	<title>Chatterie de {data.student.fullName} | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-6">
	<BackLink href={BACK_HREF} label="Retour aux Mathoux" />

	<div class="mb-6 flex items-center gap-3">
		<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
			<Cat class="h-6 w-6 text-primary" aria-hidden="true" />
		</div>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Chatterie de {data.student.fullName}</h1>
			<p class="text-muted-foreground">
				Ce que l’élève voit dans sa Chatterie. Votre visite ne change rien de son côté.
			</p>
		</div>
	</div>

	{#if !data.hasGrade}
		<p class="rounded-lg border border-border bg-muted/40 p-4" role="status">
			Pas encore de niveau : pas de Chatterie.
		</p>
	{:else if data.unavailable}
		<p class="rounded-lg border border-border bg-muted/40 p-4" role="status">
			La Chatterie est fermée pour l’instant : réessayez dans un moment.
		</p>
	{:else if isEmpty}
		<p class="rounded-lg border border-border bg-muted/40 p-4" role="status">
			Aucune notion travaillable pour ce niveau pour l’instant.
		</p>
	{:else}
		<p class="mb-6 font-medium">{collectionCountsPhrase(collection.counts)}</p>

		<ChatterieRaces races={collection.races} readOnly />
	{/if}
</div>
