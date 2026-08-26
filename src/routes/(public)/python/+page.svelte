<script lang="ts">
	import PythonPlayground from '$lib/components/python/PythonPlayground.svelte';
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// Props from page server
	let { data } = $props();

	// Deep-link support: open a specific cloud file (e.g. from the student work
	// inbox, `/python?file=<uuid>`). Fetches the file RLS-scoped and loads it into
	// the editor. Silent no-op on failure (unauthenticated / not assigned / gone).
	async function openFileFromUrl(fileId: string): Promise<void> {
		try {
			const res = await fetch(`/api/python-files/${fileId}`);
			if (res.ok) {
				const { file } = await res.json();
				if (file) pythonStore.loadCloudFile(file);
			}
		} catch {
			// Non-fatal: leave the playground on its default draft.
		} finally {
			// Keep the URL clean whether or not the load succeeded.
			window.history.replaceState({}, '', window.location.pathname);
		}
	}

	// Load code / file from URL on mount
	onMount(() => {
		// Register Service Worker for CDN caching (Pyodide, packages, Plotly)
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js');
		}

		if (!browser) return;

		const url = new URL(window.location.href);
		const codeParam = url.searchParams.get('code');
		const fileParam = url.searchParams.get('file');

		// `?code=` — shared snippet (LZString-compressed); `?file=` — cloud file.
		if (codeParam) {
			const loaded = pythonStore.loadFromUrl(url);
			if (loaded) window.history.replaceState({}, '', window.location.pathname);
		} else if (fileParam) {
			void openFileFromUrl(fileParam);
		}
	});
</script>

<svelte:head>
	<title>Python Playground - Chiphre</title>
	<meta
		name="description"
		content="Environnement Python interactif avec NumPy et Matplotlib pour les mathématiques"
	/>
</svelte:head>

<main class="container mx-auto p-4">
	<div class="mb-6 overflow-hidden rounded-xl">
		<img
			src="/images/banner-python.webp"
			alt="Le Serpentarium - Python Playground"
			class="h-40 w-full object-cover sm:h-52 md:h-64"
		/>
	</div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Python Playground</h1>
		<p class="text-muted-foreground">Environnement Python interactif avec NumPy et Matplotlib</p>
	</div>
	<PythonPlayground user={data.user} profile={data.profile} />
</main>
