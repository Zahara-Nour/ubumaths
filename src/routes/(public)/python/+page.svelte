<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import PythonPlayground from '$lib/components/python/PythonPlayground.svelte';
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';

	// Props from page server
	let { data } = $props();

	/** Un code reçu par l'adresse, en attente de l'accord de l'élève (Q1, 2026-10-24). */
	let received = $state<URL | null>(null);
	let confirmReceived = $state(false);

	function clearAddress() {
		window.history.replaceState({}, '', window.location.pathname);
	}

	function loadReceived() {
		if (received !== null) pythonStore.loadFromUrl(received);
		received = null;
		clearAddress();
	}

	function keepOwnCode() {
		received = null;
		clearAddress();
	}

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
		// L'élève a du code à lui : on lui demande avant de le remplacer
		if (codeParam && pythonStore.hasOwnCode()) {
			received = url;
			confirmReceived = true;
		} else if (codeParam) {
			const loaded = pythonStore.loadFromUrl(url);
			if (loaded) clearAddress();
		} else if (fileParam) {
			void openFileFromUrl(fileParam);
		}
	});
</script>

<SeoHead
	title="Python Playground - Chiphre"
	description="Environnement Python interactif avec NumPy et Matplotlib pour les mathématiques"
/>

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

<ConfirmDialog
	bind:open={confirmReceived}
	title="Remplacer ton code ?"
	description="Tu ouvres du code venu de l’atelier. Il remplacera ce que tu as écrit dans l’éditeur."
	confirmLabel="Remplacer"
	cancelLabel="Garder mon code"
	onConfirm={loadReceived}
	onCancel={keepOwnCode}
/>
