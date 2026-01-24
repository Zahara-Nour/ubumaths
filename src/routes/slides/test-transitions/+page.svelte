<script lang="ts">
	import { Deck, Slide } from '$lib/slides';

	let currentSlide = $state({ h: 0, v: 0 });

	function handleSlideChanged(event: { h: number; v: number }) {
		currentSlide = { h: event.h, v: event.v };
		console.log('Slide changed to:', event.h, event.v);
	}
</script>

<svelte:head>
	<title>Test Transitions - UbuSlides</title>
</svelte:head>

<div class="test-container">
	<Deck onslidechanged={handleSlideChanged} config={{ slideNumber: true }}>
		<!-- Slide 1 - Default (slide) transition -->
		<Slide background="#ff6b6b">
			<h1>Slide 1</h1>
			<p>Default transition (slide)</p>
			<p class="instruction">Appuyez sur → pour voir la transition</p>
		</Slide>

		<!-- Slide 2 - Fade transition -->
		<Slide transition="fade" background="#4ecdc4">
			<h1>Slide 2</h1>
			<p>Fade transition</p>
			<p class="instruction">Appuyez sur → pour continuer</p>
		</Slide>

		<!-- Slide 3 - Zoom transition -->
		<Slide transition="zoom" background="#45b7d1">
			<h1>Slide 3</h1>
			<p>Zoom transition</p>
			<p class="instruction">Appuyez sur → pour continuer</p>
		</Slide>

		<!-- Slide 4 - Convex transition -->
		<Slide transition="convex" background="#96ceb4">
			<h1>Slide 4</h1>
			<p>Convex transition</p>
			<p class="instruction">Appuyez sur → pour continuer</p>
		</Slide>

		<!-- Slide 5 - Concave transition -->
		<Slide transition="concave" background="#ffeaa7">
			<h1>Slide 5</h1>
			<p>Concave transition</p>
			<p class="instruction">Appuyez sur ← pour revenir</p>
		</Slide>
	</Deck>

	<!-- Debug info -->
	<div class="debug-info">
		Current slide: {currentSlide.h + 1}
	</div>
</div>

<style>
	.test-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #000;
		font-size: 42px;
	}

	.test-container :global(h1) {
		font-size: 3em !important;
		margin-bottom: 0.5em;
		color: white;
	}

	.test-container :global(p) {
		font-size: 1.2em !important;
		color: rgba(255, 255, 255, 0.9);
		margin: 0.3em 0;
	}

	.test-container :global(.instruction) {
		margin-top: 2em;
		font-size: 0.8em !important;
		color: rgba(255, 255, 255, 0.6);
		font-style: italic;
	}

	.debug-info {
		position: fixed;
		top: 10px;
		left: 10px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 10px 15px;
		font-size: 14px;
		border-radius: 5px;
		font-family: monospace;
		z-index: 1000;
	}
</style>
