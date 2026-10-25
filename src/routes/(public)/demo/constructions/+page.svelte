<!--
	Vitrine : des constructions animées (`/demo/constructions`)
	===========================================================

	Trois constructions à la règle et au compas, jouées pas à pas, chacune avec son
	script replié. L'éditeur reste au prof, sur `/constructions/essais` (chantier
	demo-debug, phase 8).
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import DemoConstructionCard from './DemoConstructionCard.svelte';
	import { DEMO_CONSTRUCTIONS } from './constructions';
</script>

<SeoHead {...demoSeo('/demo/constructions')} />

<div class="mx-auto max-w-3xl space-y-8 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Constructions à la règle et au compas</h1>
		<div class="text-muted-foreground">
			Dans Chiphre, une construction se regarde comme une vidéo : la règle, l'équerre et le compas
			bougent à l'écran, chaque étape a sa consigne. Lancez la lecture, ralentissez, revenez en
			arrière.
		</div>
	</header>

	{#each DEMO_CONSTRUCTIONS as construction (construction.title)}
		<DemoConstructionCard {construction} />
	{/each}
</div>
