<script lang="ts">
	/**
	 * SetSquare - SVG set square (equerre) instrument for geometric constructions
	 *
	 * Ported from InstrumenPoche Equerre.js
	 * Original author: Yves Biton <yves.biton@sesamath.net>
	 * License: AGPL-3.0-or-later
	 *
	 * Renders a semi-transparent triangular set square with a cutout,
	 * lighter border bands, and Sesamath branding.
	 */

	// Constants from original Equerre.js
	const LARGEUR = 131; // Width
	const HAUTEUR = 223; // Height
	const LARGEUR_BAS = 31; // Bottom bar height
	const LARGEUR_GAUCHE = 24; // Left bar width
	const LARGEUR_INT = 61; // Interior cutout width
	const LARGEUR_BANDE = 16; // Lighter band width

	// Derived constants
	const HAUTEUR_INT = (LARGEUR_INT * HAUTEUR) / LARGEUR; // Interior cutout height
	const H = (HAUTEUR / LARGEUR) * (LARGEUR - LARGEUR_BANDE); // Height of lighter part
	const L = (LARGEUR / HAUTEUR) * (HAUTEUR - LARGEUR_BANDE); // Width of lighter part

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		scale?: number;
		visible?: boolean;
	}

	// Props with defaults
	let { x = 200, y = 400, rotation = 0, scale = 1, visible = true }: Props = $props();

	// Main group transform
	let mainTransform = $derived(
		`scale(${scale}) translate(${x / scale}, ${y / scale}) rotate(${rotation})`
	);

	// Outer path with interior cutout (traced in opposite direction for fill)
	let outerPath = $derived.by(() => {
		// Outer triangle
		const outer = `M 0 0 L ${LARGEUR} 0 L 0 ${-HAUTEUR} Z`;
		// Inner cutout (traced counterclockwise)
		const inner =
			`M ${LARGEUR_GAUCHE} ${-LARGEUR_BAS} ` +
			`L ${LARGEUR_GAUCHE} ${-LARGEUR_BAS - HAUTEUR_INT} ` +
			`L ${LARGEUR_GAUCHE + LARGEUR_INT} ${-LARGEUR_BAS} Z`;
		return outer + inner;
	});

	// Inner lighter area path (overlapping the darker border)
	let innerPath = $derived.by(() => {
		// Inner lighter triangle
		const inner =
			`M ${LARGEUR_BANDE} ${-LARGEUR_BANDE} ` +
			`L ${L} ${-LARGEUR_BANDE} ` +
			`L ${LARGEUR_BANDE} ${-H} Z`;
		// Interior cutout (traced counterclockwise)
		const cutout =
			`M ${LARGEUR_GAUCHE} ${-LARGEUR_BAS} ` +
			`L ${LARGEUR_GAUCHE} ${-LARGEUR_BAS - HAUTEUR_INT} ` +
			`L ${LARGEUR_GAUCHE + LARGEUR_INT} ${-LARGEUR_BAS} Z`;
		return inner + cutout;
	});
</script>

{#if visible}
	<g transform={mainTransform} class="set-square-instrument">
		<!-- Main body with cutout -->
		<path d={outerPath} stroke="black" stroke-width="0.75" fill="#c6cbe8" fill-opacity="0.5" />

		<!-- Inner lighter area (double layer for transparency effect) -->
		<path d={innerPath} stroke-width="0" fill="#c6cbe8" fill-opacity="0.5" />

		<!-- Sesamath branding in bottom bar -->
		<text
			pointer-events="none"
			x={LARGEUR_GAUCHE}
			y={-LARGEUR_BANDE / 2 - 5}
			style="font-family: Arial; font-size: 8pt; font-weight: bold; fill: maroon;"
		>
			Sesamath
		</text>
	</g>
{/if}
