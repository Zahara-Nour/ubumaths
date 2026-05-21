<script lang="ts">
	/**
	 * Protractor - SVG protractor instrument for geometric constructions
	 *
	 * Ported from InstrumenPoche Rapporteur.js
	 * Original author: Yves Biton <yves.biton@sesamath.net>
	 * License: AGPL-3.0-or-later
	 *
	 * Renders a semi-circular protractor with outer and inner degree graduations,
	 * a center sight, and Sesamath branding.
	 */

	// Reference dimensions (math units = pixel value at default PPU = 40).
	const HEIGHT_FONT = 10; // External graduation font height (px, kept fixed)
	const HEIGHT_FONT_INT = 9; // Internal graduation font height (px, kept fixed)
	const BAR_WIDTH_MATH = 13 / 40; // Bottom bar width
	const RAY_MATH = 156 / 40; // External radius (≈ 3.9 math units)
	const RAY_INT_MATH = 89 / 40; // Internal radius
	const RAY_TRAIT_INT_MATH = 116 / 40; // Internal separation line radius
	const RAY_MIRE_MATH = 7 / 40; // Sight radius
	const MAJOR_TICK_MATH = 20 / 40; // Major external tick length
	const HALF_TICK_MATH = 10 / 40; // Half external tick length
	const MINOR_TICK_MATH = 5 / 40; // Minor external tick length
	const INT_TICK_MATH = 10 / 40; // Internal tick length
	const EXT_LABEL_OFFSET_MATH = 22 / 40; // External label radial offset
	const INT_LABEL_OFFSET_MATH = 14 / 40; // Internal label radial offset
	const SEP_DEP_OFFSET_MATH = 26 / 40; // Separation-arc dep offset

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		scale?: number;
		showExternalGraduations?: boolean;
		showInternalGraduations?: boolean;
		visible?: boolean;
		/**
		 * Screen pixels per math unit (matches the host canvas). Radii and
		 * graduation lengths scale by this factor so the protractor always
		 * covers `RAY_MATH` math units of radius regardless of canvas zoom.
		 */
		pixelsPerUnit?: number;
	}

	// Props with defaults
	let {
		x = 200,
		y = 400,
		rotation = 0,
		scale = 1,
		showExternalGraduations = true,
		showInternalGraduations = true,
		visible = true,
		pixelsPerUnit = 40
	}: Props = $props();

	// Dimensions in screen pixels (rescaled when zoom changes).
	let BAR_WIDTH = $derived(BAR_WIDTH_MATH * pixelsPerUnit);
	let RAY = $derived(RAY_MATH * pixelsPerUnit);
	let RAY_INT = $derived(RAY_INT_MATH * pixelsPerUnit);
	let RAY_TRAIT_INT = $derived(RAY_TRAIT_INT_MATH * pixelsPerUnit);
	let RAY_MIRE = $derived(RAY_MIRE_MATH * pixelsPerUnit);
	let majorTickPx = $derived(MAJOR_TICK_MATH * pixelsPerUnit);
	let halfTickPx = $derived(HALF_TICK_MATH * pixelsPerUnit);
	let minorTickPx = $derived(MINOR_TICK_MATH * pixelsPerUnit);
	let intTickPx = $derived(INT_TICK_MATH * pixelsPerUnit);
	let extLabelOffsetPx = $derived(EXT_LABEL_OFFSET_MATH * pixelsPerUnit);
	let intLabelOffsetPx = $derived(INT_LABEL_OFFSET_MATH * pixelsPerUnit);
	let sepDepOffsetPx = $derived(SEP_DEP_OFFSET_MATH * pixelsPerUnit);

	// Main group transform
	let mainTransform = $derived(
		`scale(${scale}) translate(${x / scale}, ${y / scale}) rotate(${rotation})`
	);

	// Main body path with inner cutout
	let bodyPath = $derived.by(() => {
		// Outer semicircle with bottom bar
		const outer =
			`M ${RAY} 0 A ${RAY} ${RAY} 0 0 0 ${-RAY} 0 ` +
			`L ${-RAY} ${BAR_WIDTH} L ${RAY} ${BAR_WIDTH} L ${RAY} 0`;
		// Inner cutout (traced opposite direction)
		const inner = `M 0 0 L ${-RAY_INT} 0 A ${RAY_INT} ${RAY_INT} 0 0 1 ${RAY_INT} 0 Z`;
		return outer + inner;
	});

	// Sight path
	let sightPath = $derived(
		`M ${RAY_MIRE} 0 A ${RAY_MIRE} ${RAY_MIRE} 0 0 0 ${-RAY_MIRE} 0 M 0 0 L 0 ${-RAY_MIRE}`
	);

	// Internal separation arc path
	let separationPath = $derived.by(() => {
		const dep = RAY - sepDepOffsetPx - HEIGHT_FONT;
		return (
			`M ${dep} 0 L ${RAY_TRAIT_INT} 0 ` +
			`A ${RAY_TRAIT_INT} ${RAY_TRAIT_INT} 0 0 0 ${-RAY_TRAIT_INT} 0 ` +
			`L ${-dep} 0`
		);
	});

	// Generate external graduation marks (0-180 degrees)
	let externalMarks = $derived.by(() => {
		const marks: Array<{
			angle: number;
			length: number;
			isMajor: boolean;
			label?: number;
		}> = [];

		for (let i = 0; i <= 180; i++) {
			const isMajor = i % 10 === 0;
			const isHalf = i % 5 === 0;
			const length = isMajor ? majorTickPx : isHalf ? halfTickPx : minorTickPx;

			marks.push({
				angle: i,
				length,
				isMajor,
				label: isMajor ? i : undefined
			});
		}

		return marks;
	});

	// Generate internal graduation marks (every 10 degrees, labeled 180-0)
	let internalMarks = $derived.by(() => {
		const marks: Array<{ angle: number; label: number }> = [];

		for (let i = 0; i <= 18; i++) {
			marks.push({
				angle: 10 * i,
				label: 180 - 10 * i
			});
		}

		return marks;
	});
</script>

{#if visible}
	<g transform={mainTransform} class="protractor-instrument">
		<!-- Main body -->
		<path d={bodyPath} stroke="#999999" stroke-width="1" fill="#c6cbe8" fill-opacity="0.5" />

		<!-- Sight (mire) -->
		<path d={sightPath} stroke="#666666" stroke-width="1" fill="none" />

		<!-- External graduation marks -->
		{#each externalMarks as mark (mark.angle)}
			<line
				x1={RAY}
				y1="0"
				x2={RAY - mark.length}
				y2="0"
				transform="rotate({-mark.angle})"
				stroke="#333333"
				stroke-width="0.7"
			/>
		{/each}

		<!-- External graduation numbers -->
		{#if showExternalGraduations}
			<g class="external-graduations">
				{#each externalMarks.filter((m) => m.label !== undefined) as mark (mark.angle)}
					<text
						pointer-events="none"
						x="0"
						y="0"
						style="font-family: arial; font-size: {HEIGHT_FONT}px; text-anchor: middle; fill: black;"
						transform="scale(-1) rotate({-mark.angle - 90}) translate(0, {-RAY +
							extLabelOffsetPx +
							HEIGHT_FONT})"
					>
						{mark.label}
					</text>
				{/each}
			</g>
		{/if}

		<!-- Internal separation arc -->
		<path d={separationPath} stroke="#666666" stroke-width="1" fill="none" />

		<!-- Internal graduation marks -->
		{#each internalMarks as mark (mark.angle)}
			<line
				x1={RAY_INT}
				y1="0"
				x2={RAY_INT + intTickPx}
				y2="0"
				transform="rotate({-mark.angle})"
				stroke="#333333"
				stroke-width="0.7"
			/>
		{/each}

		<!-- Internal graduation numbers -->
		{#if showInternalGraduations}
			<g class="internal-graduations">
				{#each internalMarks as mark (mark.angle)}
					<text
						pointer-events="none"
						x="0"
						y="0"
						style="font-family: arial; font-size: {HEIGHT_FONT_INT}px; text-anchor: middle; fill: black;"
						transform="scale(-1) rotate({-mark.angle - 90}) translate(0, {-RAY_INT -
							intLabelOffsetPx})"
					>
						{mark.label}
					</text>
				{/each}
			</g>
		{/if}

		<!-- Center point marker -->
		<circle cx="0" cy="0" r="2" stroke="black" stroke-width="1" fill="none" />

		<!-- Sesamath branding in bottom bar -->
		<text
			pointer-events="none"
			x="0"
			y={BAR_WIDTH - 2}
			style="font-family: sans-serif; font-size: 7pt; font-weight: bold; text-anchor: middle; fill: maroon;"
		>
			Sesamath
		</text>
	</g>
{/if}
