<!--
	Accueil du catalogue des blocs (`/aide-ecriture/blocs`, professeur seul) :
	une carte par bloc spécial d'ubumark. Fiches : `$lib/block-catalog`.
-->
<script lang="ts">
	import PageIndex, { type IndexedPage } from '$lib/components/PageIndex.svelte';
	import { BLOCK_CATALOG } from '$lib/block-catalog';

	const BLOCK_PAGES: IndexedPage[] = BLOCK_CATALOG.map((entry) => ({
		href: entry.href ?? `/aide-ecriture/blocs/${entry.slug}`,
		title: entry.title,
		description: entry.summary
	}));
</script>

<svelte:head>
	<title>Blocs · Aide à l'écriture · Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<PageIndex
	title="Blocs spéciaux"
	intro="Tableaux, arbres, courbes, horloges, opérations posées… Chaque bloc s’écrit en quelques lignes et se dessine à l’écran comme sur la fiche PDF."
	pages={BLOCK_PAGES}
/>
