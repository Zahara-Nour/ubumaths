<script lang="ts">
	/**
	 * Ruler - SVG ruler instrument for geometric constructions
	 *
	 * Ported from InstrumenPoche Regle.js
	 * Original author: Yves Biton <yves.biton@sesamath.net>
	 * License: AGPL-3.0-or-later
	 *
	 * Renders a semi-transparent ruler with graduations in centimeters,
	 * with millimeter and half-centimeter marks.
	 */

	// Constants from original Regle.js
	const PIXELS_PER_CM = 30; // 30 pixels per centimeter
	const HEIGHT_FONT = 9; // Font height for graduations
	const WIDTH = 57; // Ruler width
	const RAY = 6; // Corner radius

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		length?: number; // Length in cm (default 15)
		scale?: number;
		showGraduations?: boolean;
		visible?: boolean;
	}

	// Props with defaults
	let {
		x = 100,
		y = 400,
		rotation = 0,
		length = 15, // 15 cm by default
		scale = 1,
		showGraduations = true,
		visible = true
	}: Props = $props();

	// Calculate internal length in pixels
	let internalLength = $derived(length * PIXELS_PER_CM + 15);

	// Main group transform
	let mainTransform = $derived(
		`scale(${scale}) translate(${x / scale}, ${y / scale}) rotate(${rotation})`
	);

	// Generate graduation marks
	let graduations = $derived.by(() => {
		const marks: Array<{ x: number; height: number; isMajor: boolean; label?: string }> = [];
		const totalMarks = length * 10;

		for (let i = 0; i <= totalMarks; i++) {
			const xPos = 3 * i; // 3 pixels per mm
			const isCm = i % 10 === 0;
			const isHalfCm = i % 5 === 0;
			const height = isCm ? 12 : isHalfCm ? 9 : 6;

			marks.push({
				x: xPos,
				height,
				isMajor: isCm,
				label: isCm ? String(i / 10) : undefined
			});
		}

		return marks;
	});
</script>

{#if visible}
	<g transform={mainTransform} class="ruler-instrument">
		<!-- Main ruler body -->
		<rect
			x={-RAY - 1}
			y="0"
			width={internalLength + RAY + 1}
			height={WIDTH}
			rx={RAY}
			ry={RAY}
			stroke="#999999"
			stroke-width="2"
			fill="#c6cbe8"
			fill-opacity="0.5"
		/>

		<!-- Inner edge line -->
		<line x1={-RAY} y1="27" x2={internalLength} y2="27" stroke="#999999" stroke-width="2" />

		<!-- Graduations -->
		{#if showGraduations}
			<g class="graduations">
				{#each graduations as mark (mark.x)}
					<!-- Tick mark -->
					<line x1={mark.x} y1="0" x2={mark.x} y2={mark.height} stroke="black" stroke-width="0.7" />

					<!-- Label for major marks -->
					{#if mark.label !== undefined}
						<text
							pointer-events="none"
							x={mark.x}
							y={12 + HEIGHT_FONT}
							style="font-family: monospace; font-size: {HEIGHT_FONT}pt; text-anchor: middle;"
							fill="black"
						>
							{mark.label}
						</text>
					{/if}
				{/each}
			</g>
		{/if}

		<!-- Sesamath branding -->
		<text
			pointer-events="none"
			x={internalLength / 2 - RAY - 3}
			y={WIDTH - 5}
			style="font-family: Arial; font-size: 8pt; font-weight: bold; fill: maroon; text-anchor: middle;"
		>
			Sesamath
		</text>
	</g>
{/if}
