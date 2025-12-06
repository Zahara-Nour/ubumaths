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

	// Constants from original Rapporteur.js
	const HEIGHT_FONT = 10; // External graduation font height
	const HEIGHT_FONT_INT = 9; // Internal graduation font height
	const BAR_WIDTH = 13; // Bottom bar width
	const RAY = 156; // External radius
	const RAY_INT = 89; // Internal radius
	const RAY_TRAIT_INT = 116; // Internal separation line radius
	const RAY_MIRE = 7; // Sight radius

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		scale?: number;
		showExternalGraduations?: boolean;
		showInternalGraduations?: boolean;
		visible?: boolean;
	}

	// Props with defaults
	let {
		x = 200,
		y = 400,
		rotation = 0,
		scale = 1,
		showExternalGraduations = true,
		showInternalGraduations = true,
		visible = true
	}: Props = $props();

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
		const dep = RAY - 26 - HEIGHT_FONT;
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
			const length = isMajor ? 20 : isHalf ? 10 : 5;

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
						transform="scale(-1) rotate({-mark.angle - 90}) translate(0, {-RAY + 22 + HEIGHT_FONT})"
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
				x2={RAY_INT + 10}
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
						transform="scale(-1) rotate({-mark.angle - 90}) translate(0, {-RAY_INT - 14})"
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
