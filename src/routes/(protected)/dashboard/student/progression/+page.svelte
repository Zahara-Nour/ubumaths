<script lang="ts">
	/**
	 * Ma progression — page élève à deux onglets.
	 *
	 * Remplace les deux pages « Mes objectifs » et « Mes compétences math », que
	 * rien ne distinguait à l'écran. Ici, chaque onglet porte une phrase qui dit
	 * de quel axe il parle — ce que deux tuiles côte à côte ne permettaient pas.
	 */

	import * as Tabs from '$lib/components/ui/tabs';
	import { TrendingUp } from '@lucide/svelte';
	import ObjectifsPanel from '$lib/components/progression/ObjectifsPanel.svelte';
	import CompetencesPanel from '$lib/components/progression/CompetencesPanel.svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * L'onglet courant vit dans l'URL, pas dans un état local : un élève qui
	 * partage ou recharge la page retombe où il était, et les anciennes URL
	 * `/objectifs` et `/competences` redirigent ici sur le bon onglet.
	 *
	 * ⚠️ Dérivé, pas `$state(data.activeTab)` — celui-ci n'aurait capturé que la
	 * valeur du premier rendu, et l'onglet ne suivrait plus une navigation.
	 */
	const activeTab = $derived(
		page.url.searchParams.get('onglet') === 'competences'
			? 'competences'
			: page.url.searchParams.get('onglet') === 'objectifs'
				? 'objectifs'
				: data.activeTab
	);

	function handleTabChange(value: string) {
		const url = new URL(page.url);
		url.searchParams.set('onglet', value);
		replaceState(url, page.state);
	}
</script>

<svelte:head>
	<title>Ma progression | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
	<div class="mb-6 flex items-center gap-3">
		<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
			<TrendingUp class="h-6 w-6 text-primary" />
		</div>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Ma progression</h1>
			<p class="text-muted-foreground">Deux façons de regarder où tu en es.</p>
		</div>
	</div>

	<Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="objectifs">Ce que je sais faire</Tabs.Trigger>
			<Tabs.Trigger value="competences">Ma façon de faire des maths</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="objectifs" class="mt-6">
			<ObjectifsPanel objectives={data.objectives} />
		</Tabs.Content>

		<Tabs.Content value="competences" class="mt-6">
			<CompetencesPanel competences={data.competences} />
		</Tabs.Content>
	</Tabs.Root>
</main>
