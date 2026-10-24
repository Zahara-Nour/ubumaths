<!--
	Accueil de l'aide à l'écriture (`/aide-ecriture`, professeur seul — garde :
	`reservedAreasHandle`). Chaque page déplacée sous `/aide-ecriture` s'ajoute à
	`AIDE_PAGES`.
-->
<script lang="ts">
	import PageIndex, { type IndexedPage } from '$lib/components/PageIndex.svelte';

	const AIDE_PAGES: IndexedPage[] = [
		{
			href: '/aide-ecriture/geometrie',
			title: 'Géométrie',
			description: 'Figures interactives du langage de figures, thème par thème, script compris.'
		},
		{
			href: '/aide-ecriture/cercle-trigo',
			title: 'Cercle trigonométrique',
			description:
				'Tous les réglages du bloc `trig` : préréglages, tableau, équations, inéquations.'
		}
	];
</script>

<svelte:head>
	<title>Aide à l'écriture · Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<PageIndex
	title="Aide à l'écriture"
	intro="Pages pour essayer et apprendre à écrire scripts, blocs et figures."
	pages={AIDE_PAGES}
/>
