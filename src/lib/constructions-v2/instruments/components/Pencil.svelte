<script lang="ts">
	/**
	 * Pencil - SVG pencil instrument for geometric constructions
	 *
	 * Ported from InstrumenPoche Crayon.js
	 * Original author: Yves Biton <yves.biton@sesamath.net>
	 * License: AGPL-3.0-or-later
	 *
	 * Renders a detailed pencil with gradient fills for the body and tip,
	 * a black lead tip, and a blue end cap.
	 */

	// Constants from original Crayon.js
	const LON = 97; // Total length (without final semicircle)
	const LONG_POINTE = 15; // Lead tip length
	const DEMI_LARG = 4.5; // Half-width of pencil
	const LONG_MINE = 3; // Black lead length
	const DEMI_LARG_MINE = (LONG_MINE / LONG_POINTE) * DEMI_LARG; // Half-width of lead

	// Derived constants for path calculations
	const RX = DEMI_LARG / 3;
	const RY = (RX * 3) / 4;

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		scale?: number;
		visible?: boolean;
	}

	// Props with defaults (pencil defaults to -40 degree angle)
	let { x = 200, y = 400, rotation = -40, scale = 1, visible = true }: Props = $props();

	// Unique IDs for gradients (to avoid conflicts with multiple pencils)
	let gradientId = $derived(`pencil-grad-${x}-${y}`.replace(/\./g, '-'));
	let tipGradientId = $derived(`${gradientId}-tip`);
	let bodyGradientId = $derived(`${gradientId}-body`);

	// Main group transform
	let mainTransform = $derived(
		`scale(${scale}) translate(${x / scale}, ${y / scale}) rotate(${rotation})`
	);

	// Sharpened tip path (wood + lead taper)
	let tipPath = $derived.by(() => {
		// Arc segments to create the rounded taper
		const arcPart =
			`A${RX} ${RY} -90 0 0 ${LONG_POINTE} ${RX}` +
			`A${RX} ${RY} -90 0 1 ${LONG_POINTE} ${-RX}` +
			`A${RX} ${RY} -90 0 0 ${LONG_POINTE} ${-DEMI_LARG}`;

		return `M 0 0 L${LONG_POINTE} ${DEMI_LARG} ${arcPart} Z`;
	});

	// Black lead tip path
	let leadPath = $derived(
		`M 0 0 L ${LONG_MINE} ${DEMI_LARG_MINE} ${LONG_MINE} ${-DEMI_LARG_MINE} Z`
	);

	// Body path (main pencil shaft)
	let bodyPath = $derived.by(() => {
		// Arc segments matching tip join
		const arcPart =
			`A${RX} ${RY} -90 0 0 ${LONG_POINTE} ${RX}` +
			`A${RX} ${RY} -90 0 1 ${LONG_POINTE} ${-RX}` +
			`A${RX} ${RY} -90 0 0 ${LONG_POINTE} ${-DEMI_LARG}`;

		return `M ${LONG_POINTE} ${DEMI_LARG} ${arcPart} L ${LON} ${-DEMI_LARG} L ${LON} ${DEMI_LARG} Z`;
	});
</script>

{#if visible}
	<g transform={mainTransform} class="pencil-instrument">
		<!-- Gradient definitions -->
		<defs>
			<!-- Tip gradient (yellow-red wood sharpening) -->
			<linearGradient id={tipGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color: #f00000;" />
				<stop offset="50%" style="stop-color: #eeb444;" />
				<stop offset="100%" style="stop-color: #f00000;" />
			</linearGradient>

			<!-- Body gradient (dark red-orange wood) -->
			<linearGradient id={bodyGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color: #810216;" />
				<stop offset="25%" style="stop-color: #c64f00;" />
				<stop offset="50%" style="stop-color: #ab4a36;" />
				<stop offset="75%" style="stop-color: #c64f00;" />
				<stop offset="100%" style="stop-color: #810216;" />
			</linearGradient>
		</defs>

		<!-- Sharpened tip (wood part) -->
		<path
			d={tipPath}
			stroke="black"
			stroke-width="0.5"
			fill="url(#{tipGradientId})"
			fill-opacity="1"
		/>

		<!-- Black lead tip -->
		<path d={leadPath} stroke="black" stroke-width="0.5" fill="black" fill-opacity="1" />

		<!-- Main body -->
		<path
			d={bodyPath}
			stroke="black"
			stroke-width="0.5"
			fill="url(#{bodyGradientId})"
			fill-opacity="1"
		/>

		<!-- Blue end cap -->
		<circle cx={LON} cy="0" r={DEMI_LARG} stroke="blue" stroke-width="0.5" fill="blue" />
	</g>
{/if}
