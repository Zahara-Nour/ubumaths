<!--
	Accueil des pages de dev (`/dev`, admin seul — garde : `reservedAreasHandle`).
	Chaque page déplacée sous `/dev` s'ajoute à `DEV_PAGES`.
-->
<script lang="ts">
	import PageIndex, { type IndexedPage } from '$lib/components/PageIndex.svelte';

	const DEV_PAGES: IndexedPage[] = [];
</script>

<svelte:head>
	<title>Pages de dev · Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<PageIndex
	title="Pages de dev"
	intro="Bancs d'essai et outils de mise au point, réservés à l'administration."
	pages={DEV_PAGES}
/>
