<script lang="ts">
	import Trio from './Trio.svelte';
</script>

<svelte:head>
	<title>Trio - Jeu Mathématique | UbuMaths</title>
	<meta
		name="description"
		content="Trouvez trois nombres alignés qui satisfont une équation mathématique. Entraînez-vous au calcul mental tout en résolvant des puzzles !"
	/>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 text-center">
		<h1 class="mb-2 text-4xl font-bold text-foreground">Trio</h1>
	</div>

	<Trio />
</div>
