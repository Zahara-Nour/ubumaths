<script lang="ts">
	import ReplContainer from '$lib/components/cas/ReplContainer.svelte';
</script>

<svelte:head>
	<title>Calculatrice Symbolique | UbuMaths</title>
	<meta
		name="description"
		content="Calculatrice symbolique en ligne pour analyser et simplifier des expressions mathématiques."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl">
	<section class="mb-8 text-center">
		<h1 class="mb-2 text-3xl font-bold">Calculatrice Symbolique</h1>
		<p class="text-muted-foreground">
			Entrez des expressions mathématiques pour les analyser et simplifier
		</p>
	</section>

	<ReplContainer />
</div>
