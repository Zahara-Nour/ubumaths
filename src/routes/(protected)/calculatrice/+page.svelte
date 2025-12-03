<script lang="ts">
	/**
	 * NumWorks Calculator Page
	 *
	 * Embeds the NumWorks graphing calculator simulator.
	 * Features:
	 * - Full calculator with touch/click interaction
	 * - Fullscreen mode with mirrored large screen (like numworks.com)
	 * - Screenshot functionality (built into the simulator)
	 *
	 * Access: Students and Teachers only
	 */

	let isFullscreen = $state(false);

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}
</script>

<svelte:head>
	<title>Calculatrice NumWorks | UbuMaths</title>
</svelte:head>

<div class="flex h-full flex-col">
	<!-- Header with title and controls -->
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Calculatrice NumWorks</h1>
		<button
			onclick={toggleFullscreen}
			class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
		>
			{isFullscreen ? 'Mode normal' : 'Mode plein écran'}
		</button>
	</div>

	<!-- Calculator container -->
	<div
		class="flex-1 overflow-hidden rounded-lg border border-border bg-card"
		class:fullscreen-mode={isFullscreen}
	>
		<iframe
			src="/numworks-simulator.html"
			title="Calculatrice NumWorks"
			class="h-full w-full border-0"
			allow="clipboard-write"
		></iframe>
	</div>

	<!-- Instructions -->
	<div class="mt-4 text-sm text-muted-foreground">
		<p>
			<strong>Astuce :</strong> Utilisez le bouton en haut à droite du simulateur pour prendre une capture
			d'écran. Le mode plein écran affiche un écran miroir agrandi.
		</p>
	</div>
</div>

<style>
	.fullscreen-mode {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 50;
		border-radius: 0;
		margin: 0;
	}
</style>
