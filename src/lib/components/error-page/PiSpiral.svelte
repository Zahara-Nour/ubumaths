<!--
	Spirale des décimales de π, décor de la page d'erreur.

	SVG en `currentColor` : suit le thème clair ou sombre, contrairement à l'ancien
	PNG (chiffres noirs sur fond transparent). Les trois chiffres du code d'erreur
	sont colorés à leur vraie place. Rendue par le serveur (~1 660 nœuds `<text>`),
	elle tourne comme une seule couche déjà dessinée (`will-change`).
-->
<script lang="ts">
	import { PI_DECIMALS } from '$lib/error-page/pi-decimals';
	import { spiralGlyphs } from '$lib/error-page/pi-spiral';

	let { highlightPosition }: { highlightPosition: number | null } = $props();

	const glyphs = $derived(spiralGlyphs(PI_DECIMALS, highlightPosition));
</script>

<svg
	viewBox="-500 -500 1000 1000"
	class="pi-spiral text-foreground/85"
	aria-hidden="true"
	focusable="false"
>
	<g text-anchor="middle" fill="currentColor">
		{#each glyphs as glyph, i (i)}
			<text
				transform="rotate({glyph.rotate})"
				y={glyph.y}
				font-size={glyph.size}
				class={glyph.highlighted ? 'fill-amber-500 font-bold dark:fill-amber-400' : undefined}
				>{glyph.char}</text
			>
		{/each}
	</g>
</svg>

<style>
	.pi-spiral {
		width: 100%;
		height: 100%;
		font-variant-numeric: tabular-nums;
		animation: spin 20s linear infinite;
		/* Couche à part : le navigateur dessine les chiffres une fois et ne fait que tourner l'image */
		will-change: transform;
	}

	/* Mouvement réduit demandé par le système : la spirale reste immobile */
	@media (prefers-reduced-motion: reduce) {
		.pi-spiral {
			animation: none;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
