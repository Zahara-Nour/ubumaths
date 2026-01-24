<script lang="ts">
	import { Deck, Slide, type SlideChangedEvent } from '$lib/slides';

	let currentSlide = $state({ h: 0, v: 0 });

	function handleSlideChanged(event: SlideChangedEvent) {
		currentSlide = { h: event.indexh, v: event.indexv };
	}
</script>

<svelte:head>
	<title>UbuSlides Demo</title>
</svelte:head>

<div class="deck-container">
	<Deck onslidechanged={handleSlideChanged}>
		<!-- Slide 1: Title -->
		<Slide background="#1a1a2e">
			<h1>UbuSlides</h1>
			<p>Systeme de presentation pour UbuMaths</p>
			<p class="fragment">Construit sur reveal.js</p>
		</Slide>

		<!-- Slide 2: Features -->
		<Slide transition="fade">
			<h2>Fonctionnalites</h2>
			<ul>
				<li class="fragment">Navigation clavier et tactile</li>
				<li class="fragment">Transitions fluides</li>
				<li class="fragment">Fragments pour reveler le contenu</li>
				<li class="fragment">Support formules mathematiques</li>
			</ul>
		</Slide>

		<!-- Slide 3: Vertical slides -->
		<Slide background="#16213e">
			{#snippet vertical()}
				<Slide>
					<h2>Slides verticaux</h2>
					<p>Descendez pour voir plus</p>
				</Slide>
				<Slide>
					<h3>Sous-slide 1</h3>
					<p>Contenu organise hierarchiquement</p>
				</Slide>
				<Slide>
					<h3>Sous-slide 2</h3>
					<p>Parfait pour les details</p>
				</Slide>
			{/snippet}
			<h2>Navigation 2D</h2>
			<p>Horizontal et vertical</p>
		</Slide>

		<!-- Slide 4: Math placeholder -->
		<Slide background="#0f3460">
			<h2>Mathematiques</h2>
			<p>Bientot : formules UbuMark</p>
			<div class="math-placeholder">
				<code>$\int_0^1 x^2 dx = \frac 1 3$</code>
			</div>
		</Slide>

		<!-- Slide 5: End -->
		<Slide transition="zoom" background="#e94560">
			<h2>Fin de la demo</h2>
			<p>Slide {currentSlide.h + 1}</p>
		</Slide>
	</Deck>
</div>

<style>
	.deck-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #000;
		/* Base font-size pour reveal.js (peut être reset par Tailwind) */
		font-size: 42px;
	}

	/* Les styles doivent être globaux pour atteindre le contenu dans reveal.js */
	.deck-container :global(h1) {
		font-size: 2.5em !important;
		margin-bottom: 0.5em;
	}

	.deck-container :global(h2) {
		font-size: 1.8em !important;
		margin-bottom: 0.5em;
	}

	.deck-container :global(h3) {
		font-size: 1.4em !important;
	}

	.deck-container :global(p) {
		font-size: 1em !important;
	}

	.deck-container :global(ul) {
		text-align: left;
		display: inline-block;
	}

	.deck-container :global(li) {
		margin: 0.5em 0;
		font-size: 0.9em !important;
	}

	.deck-container :global(.math-placeholder) {
		margin-top: 1em;
		padding: 1em;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}

	.deck-container :global(code) {
		font-size: 1.2em;
		color: #ffd700;
	}
</style>
