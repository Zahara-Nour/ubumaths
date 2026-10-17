<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import DslDemo from '../../DslDemo.svelte';
	import { buildKochDsl } from './koch-dsl';

	const dsl = buildKochDsl(4);
</script>

<svelte:head>
	<title>Flocon de Von Koch — Sliders</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<div>
		<BackLink href="/geometry-demo/sliders" label="Retour aux sliders" />
		<h1 class="mt-2 text-2xl font-bold">Flocon de Von Koch</h1>
		<p class="text-muted-foreground">
			Le curseur n choisit l'étape (0 à 4). À chaque étape, chaque côté est coupé en trois et une
			pointe équilatérale pousse sur le tiers du milieu. Le DSL ne boucle qu'au chargement : le
			script construit d'avance les 4 étapes (768 sommets) et chaque pointe de l'étape k a une
			hauteur multipliée par t<sub>k</sub>, qui vaut 0 si n &lt; k et 1 si n ≥ k.
		</p>
	</div>

	<DslDemo {dsl} pixelsPerUnit={60} width={500} height={500} />
</div>
