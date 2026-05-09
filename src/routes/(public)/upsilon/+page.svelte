<script lang="ts">
	import { Calculator, Maximize2, Minimize2, ExternalLink } from 'lucide-svelte';
	import { theme } from '$lib/stores/theme.svelte';

	let isLoaded = $state(false);
	let isFullscreen = $state(false);
	let iframeEl: HTMLIFrameElement | null = $state(null);

	function loadSimulator() {
		isLoaded = true;
	}

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isFullscreen) isFullscreen = false;
	}

	function syncIframeTheme() {
		iframeEl?.contentWindow?.postMessage(
			{ type: 'ubumaths-theme', dark: theme.dark },
			window.location.origin
		);
	}

	$effect(() => {
		document.body.classList.toggle('overflow-hidden', isFullscreen);
		return () => document.body.classList.remove('overflow-hidden');
	});

	$effect(() => {
		void theme.dark;
		syncIframeTheme();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Calculatrice graphique Upsilon | UbuMaths</title>
	<meta
		name="description"
		content="Simulateur de la calculatrice graphique Upsilon (fork d'Epsilon par NumWorks). Disponible directement dans le navigateur, accessible à tous."
	/>
</svelte:head>

<main class="container mx-auto p-4">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Calculatrice graphique Upsilon</h1>
		<p class="text-muted-foreground">
			Simulateur web complet de la calculatrice graphique Upsilon (fork d'Epsilon par NumWorks).
			Calcul, graphique, suite, statistiques, probabilités, équations, RPN, Python…
		</p>
	</div>

	{#if !isLoaded}
		<div
			class="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 text-center"
		>
			<img
				src="/upsilon-simulator/background.jpg"
				alt="Calculatrice Upsilon"
				class="max-h-96 w-auto rounded-md shadow-lg"
				loading="lazy"
			/>
			<button
				onclick={loadSimulator}
				class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
			>
				<Calculator class="h-5 w-5" />
				Lancer le simulateur
			</button>
			<p class="text-xs text-muted-foreground">
				Le simulateur charge environ 5 Mo. Premier chargement plus long, puis mis en cache par le
				navigateur.
			</p>
		</div>
	{:else}
		<div
			class="relative rounded-lg border border-border bg-card"
			class:fullscreen-mode={isFullscreen}
		>
			<button
				onclick={toggleFullscreen}
				class="absolute top-2 right-2 z-10 rounded-md bg-background/80 p-2 text-foreground shadow-md backdrop-blur transition-colors hover:bg-background"
				title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
				aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
			>
				{#if isFullscreen}
					<Minimize2 class="h-5 w-5" />
				{:else}
					<Maximize2 class="h-5 w-5" />
				{/if}
			</button>
			<iframe
				bind:this={iframeEl}
				src="/upsilon-simulator/simulator.html?v=2"
				title="Calculatrice graphique Upsilon"
				class="h-[85vh] w-full rounded-lg border-0"
				allow="clipboard-write"
				onload={syncIframeTheme}
			></iframe>
		</div>
	{/if}

	<footer class="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
		<p>
			Simulateur basé sur
			<a
				href="https://github.com/UpsilonNumworks/Upsilon"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 underline hover:text-foreground"
			>
				Upsilon
				<ExternalLink class="h-3 w-3" />
			</a>
			— fork de l'OS Epsilon par
			<a
				href="https://www.numworks.com"
				target="_blank"
				rel="noopener noreferrer"
				class="underline hover:text-foreground"
			>
				NumWorks
			</a>. Distribué sous licence
			<a
				href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
				target="_blank"
				rel="noopener noreferrer"
				class="underline hover:text-foreground"
			>
				CC BY-NC-SA 4.0
			</a>.
		</p>
	</footer>
</main>

<style>
	.fullscreen-mode {
		position: fixed;
		inset: 0;
		z-index: 50;
		border-radius: 0;
	}

	.fullscreen-mode iframe {
		height: 100vh;
		border-radius: 0;
	}
</style>
