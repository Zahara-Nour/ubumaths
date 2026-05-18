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
	const HEIGHT_FONT = 9; // Font height for graduations
	const WIDTH = 57; // Ruler width
	const RAY = 6; // Corner radius

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		length?: number; // Length in math units (each major tick = 1 unit)
		scale?: number;
		showGraduations?: boolean;
		visible?: boolean;
		/**
		 * Screen pixels per math unit. Major ticks (with label) appear every unit,
		 * minor ticks every tenth. Must match the host canvas PPU so that placing
		 * the ruler against a segment of length L reads L on the ruler.
		 */
		pixelsPerUnit?: number;
	}

	// Props with defaults
	let {
		x = 100,
		y = 400,
		rotation = 0,
		length = 15, // 15 units by default
		scale = 1,
		showGraduations = true,
		visible = true,
		pixelsPerUnit = 40
	}: Props = $props();

	// Calculate internal length in pixels
	let internalLength = $derived(length * pixelsPerUnit + 15);

	// Main group transform
	let mainTransform = $derived(
		`scale(${scale}) translate(${x / scale}, ${y / scale}) rotate(${rotation})`
	);

	// Generate graduation marks
	// Each major tick = 1 math unit (with label).
	// 10 subdivisions per unit; the 5th is a half-tick.
	let graduations = $derived.by(() => {
		const marks: Array<{ x: number; height: number; isMajor: boolean; label?: string }> = [];
		const totalMarks = length * 10;
		const stepPx = pixelsPerUnit / 10;

		for (let i = 0; i <= totalMarks; i++) {
			const xPos = stepPx * i;
			const isMajor = i % 10 === 0;
			const isHalf = i % 5 === 0;
			const height = isMajor ? 12 : isHalf ? 9 : 6;

			marks.push({
				x: xPos,
				height,
				isMajor,
				label: isMajor ? String(i / 10) : undefined
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

		<!-- UbuMaths branding -->
		<text
			pointer-events="none"
			x={internalLength / 2 - RAY - 3}
			y={WIDTH - 5}
			style="font-family: Arial; font-size: 8pt; font-weight: bold; fill: maroon; text-anchor: middle;"
		>
			Ubumaths
		</text>
	</g>
{/if}
