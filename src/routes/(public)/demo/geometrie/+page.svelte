<!--
	Vitrine : des figures de géométrie (`/demo/geometrie`)
	======================================================

	Dix figures manipulables rangées par public (collège, lycée, pour le plaisir),
	chacune avec son script replié. La référence du langage reste sur
	`/aide-ecriture/geometrie` (chantier demo-debug, PR 6f).
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import DemoFigureCard from './DemoFigureCard.svelte';
	import { DEMO_FIGURES, DEMO_SECTIONS } from './figures';
</script>

<SeoHead {...demoSeo('/demo/geometrie')} />

<div class="mx-auto max-w-6xl space-y-8 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Figures de géométrie</h1>
		<div class="text-muted-foreground">
			Dans les cours et les exercices de Chiphre, les figures s'écrivent en quelques lignes et se
			manipulent : déplacez les points, faites glisser les curseurs.
		</div>
	</header>

	{#each DEMO_SECTIONS as section (section.id)}
		<section class="space-y-4">
			<h2 class="text-xl font-bold">{section.title}</h2>
			<div class="grid gap-6 lg:grid-cols-2">
				{#each DEMO_FIGURES.filter((f) => f.section === section.id) as figure (figure.title)}
					<DemoFigureCard {figure} />
				{/each}
			</div>
		</section>
	{/each}
</div>
