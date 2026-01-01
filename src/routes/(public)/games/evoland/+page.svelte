<script lang="ts">
	/**
	 * Evoland - Page principale du jeu
	 * Port du jeu Haxe original vers TypeScript/Svelte 5
	 */

	import EvolandGame from '$lib/games/evoland/components/EvolandGame.svelte';
</script>

<svelte:head>
	<title>Evoland | UbuMaths</title>
	<meta name="description" content="Evoland - Un jeu d'aventure rétro éducatif" />
	<!-- Press Start 2P font for pixel-art aesthetic -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<main class="evoland-page">
	<EvolandGame />
</main>

<style>
	.evoland-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #000;
	}

	/* Ensure the game canvas is focused and receives keyboard events */
	:global(.evoland-page:focus-within) {
		outline: none;
	}
</style>
