<script lang="ts">
	/**
	 * SetSquare - SVG set square (equerre) instrument for geometric constructions
	 *
	 * Ported from InstrumenPoche Equerre.js
	 * Original author: Yves Biton <yves.biton@sesamath.net>
	 * License: AGPL-3.0-or-later
	 *
	 * Renders a semi-transparent triangular set square with a cutout,
	 * lighter border bands, and UbuMaths branding.
	 *
	 * Dimensions scale with `pixelsPerUnit` (math units → screen pixels)
	 * so the équerre's horizontal/vertical legs always span the same
	 * number of grid units regardless of canvas zoom — mirrors the
	 * `Ruler` component, whose length is also math-unit-based.
	 */

	// Reference dimensions (math units = pixel value at default PPU = 40).
	const LARGEUR_MATH = 131 / 40; // horizontal leg ≈ 3.275 math units
	const HAUTEUR_MATH = 223 / 40; // vertical leg ≈ 5.575 math units
	const LARGEUR_BAS_MATH = 31 / 40; // bottom bar height
	const LARGEUR_GAUCHE_MATH = 24 / 40; // left bar width
	const LARGEUR_INT_MATH = 61 / 40; // interior cutout width
	const LARGEUR_BANDE_MATH = 16 / 40; // lighter band width

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		scale?: number;
		visible?: boolean;
		/**
		 * Screen pixels per math unit (matches the host canvas). The leg
		 * lengths and cutouts scale by this factor so the equerre always
		 * covers `LARGEUR_MATH` × `HAUTEUR_MATH` math units regardless of
		 * zoom.
		 */
		pixelsPerUnit?: number;
	}

	// Props with defaults
	let {
		x = 200,
		y = 400,
		rotation = 0,
		scale = 1,
		visible = true,
		pixelsPerUnit = 40
	}: Props = $props();

	// Dimensions in screen pixels (rescaled when zoom changes).
	let LARGEUR = $derived(LARGEUR_MATH * pixelsPerUnit);
	let HAUTEUR = $derived(HAUTEUR_MATH * pixelsPerUnit);
	let LARGEUR_BAS = $derived(LARGEUR_BAS_MATH * pixelsPerUnit);
	let LARGEUR_GAUCHE = $derived(LARGEUR_GAUCHE_MATH * pixelsPerUnit);
	let LARGEUR_INT = $derived(LARGEUR_INT_MATH * pixelsPerUnit);
	let LARGEUR_BANDE = $derived(LARGEUR_BANDE_MATH * pixelsPerUnit);

	// Derived constants
	let HAUTEUR_INT = $derived((LARGEUR_INT * HAUTEUR) / LARGEUR);
	let H = $derived((HAUTEUR / LARGEUR) * (LARGEUR - LARGEUR_BANDE));
	let L = $derived((LARGEUR / HAUTEUR) * (HAUTEUR - LARGEUR_BANDE));

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

		<!-- UbuMaths branding in bottom bar -->
		<text
			pointer-events="none"
			x={LARGEUR_GAUCHE}
			y={-LARGEUR_BANDE / 2 - 5}
			style="font-family: Arial; font-size: 8pt; font-weight: bold; fill: maroon;"
		>
			UbuMaths
		</text>
	</g>
{/if}
