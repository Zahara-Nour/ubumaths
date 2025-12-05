<script lang="ts">
	import PythonPlayground from '$lib/components/python/PythonPlayground.svelte';
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// Load code from URL on mount
	onMount(() => {
		// Register Service Worker for CDN caching (Pyodide, packages, Plotly)
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js');
		}

		if (browser && window.location.search.includes('code=')) {
			const url = new URL(window.location.href);
			const loaded = pythonStore.loadFromUrl(url);

			// Clear the URL parameter after loading to keep URL clean
			if (loaded) {
				window.history.replaceState({}, '', window.location.pathname);
			}
		}
	});
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
