<script lang="ts">
	import PythonPlayground from '$lib/components/python/PythonPlayground.svelte';
</script>

<svelte:head>
	<title>Python Playground - UbuMaths</title>
	<meta
		name="description"
		content="Environnement Python interactif avec NumPy et Matplotlib pour les mathématiques"
	/>
</svelte:head>

<main class="container mx-auto p-4">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Python Playground</h1>
		<p class="text-muted-foreground">Environnement Python interactif avec NumPy et Matplotlib</p>
	</div>
	<PythonPlayground />
</main>
