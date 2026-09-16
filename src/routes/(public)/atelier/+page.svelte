<script lang="ts">
	/**
	 * L'atelier de recherche de l'élève.
	 *
	 * Public et sans compte : aucune donnée ne quitte le navigateur (décision
	 * figée n° 2 du cadrage). Cadrage : `docs/wip/atelier-recherche-eleve.md`.
	 */
	import AtelierContainer from '$lib/components/atelier/AtelierContainer.svelte';
</script>

<svelte:head>
	<title>Atelier | Chiphre</title>
	<meta
		name="description"
		content="Un atelier pour chercher : calculer, tracer et explorer des données au même endroit."
	/>
</svelte:head>

<div class="page">
	<AtelierContainer />
</div>

<style>
	.page {
		height: calc(100vh - 4rem);
	}
</style>
