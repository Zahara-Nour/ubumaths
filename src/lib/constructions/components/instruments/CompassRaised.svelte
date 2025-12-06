<script lang="ts">
	/**
	 * CompassRaised - SVG raised compass (top view) for geometric constructions
	 *
	 * Ported from InstrumenPoche CompasLeve.js
	 * Original author: Yves Biton <yves.biton@sesamath.net>
	 * License: AGPL-3.0-or-later
	 *
	 * Renders a compass viewed from above (horizontal), used when drawing arcs.
	 * The compass appears as a horizontal bar with the needle tip on one end
	 * and the pencil tip on the other.
	 */

	// Constants from original CompasLeve.js
	const EP = 7; // Branch thickness (same as Compass)
	const LONG_POINTE = 8; // Tip length

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		opening?: number; // ecart - distance between compass points
		scale?: number;
		visible?: boolean;
	}

	// Props with defaults
	let {
		x = 200,
		y = 400,
		rotation = 0,
		opening = 100,
		scale = 1,
		visible = true
	}: Props = $props();

	// Main group transform
	let mainTransform = $derived(
		`scale(${scale}) translate(${x / scale}, ${y / scale}) rotate(${rotation})`
	);

	// Derived measurements
	let d = $derived(Math.max(0, opening - 2 * LONG_POINTE));
	let dl = 12; // Half-width of central grey part
	let dh = 4; // Half-height of central grey part

	// Path for metal tip (left side)
	let tipPath = $derived(`M0 0 L${LONG_POINTE} 1 ${LONG_POINTE} -1Z`);

	// Path for pencil tip (right side)
	let pencilPath = $derived(
		`M${opening} 0 L${opening - LONG_POINTE} 1.5 ${opening - LONG_POINTE} -1.5Z`
	);

	// Path for central handle (elliptical shape)
	let handlePath = $derived.by(() => {
		const centerX = opening / 2;
		return (
			`M${centerX + dl} ${-dh} ` +
			`A ${dl} 2 180 0 0 ${centerX - dl} ${-dh}` +
			`A${dh} 2 90 0 1 ${centerX - dl} ${dh}` +
			`A${dl} 2 0 0 0 ${centerX + dl} ${dh}` +
			`A${dh} 2 -90 0 1 ${centerX + dl} ${-dh}`
		);
	});
</script>

{#if visible}
	<g transform={mainTransform} class="compass-raised-instrument">
		<!-- Central bar (only if opening > 2 * LONG_POINTE) -->
		{#if opening > 2 * LONG_POINTE}
			<rect
				x={LONG_POINTE}
				y={-EP / 2}
				width={opening - 2 * LONG_POINTE}
				height={EP}
				rx="1"
				ry="1"
				stroke="black"
				stroke-width="0.5"
				fill="silver"
				fill-opacity="1"
			/>
		{/if}

		<!-- Metal tip (left - needle) -->
		<path d={tipPath} stroke="black" stroke-width="0.5" fill="black" fill-opacity="1" />

		<!-- Left tip line -->
		<line
			x1={LONG_POINTE}
			y1="0"
			x2={LONG_POINTE + d / 8}
			y2="0"
			stroke="black"
			stroke-width="0.5"
		/>

		<!-- Pencil tip (right) -->
		<path d={pencilPath} stroke="black" stroke-width="0.5" fill="black" fill-opacity="1" />

		<!-- Right tip line -->
		<line
			x1={opening - LONG_POINTE}
			y1="0"
			x2={opening - LONG_POINTE - d / 8}
			y2="0"
			stroke="black"
			stroke-width="0.5"
		/>

		<!-- Right side vertical lines -->
		<line
			x1={opening - LONG_POINTE - d / 8 - 2}
			y1={-EP / 2}
			x2={opening - LONG_POINTE - d / 8 - 2}
			y2={EP / 2}
			stroke="black"
			stroke-width="0.5"
		/>
		<line
			x1={opening - LONG_POINTE - d / 3 - 2}
			y1={-EP / 2}
			x2={opening - LONG_POINTE - d / 3 - 2}
			y2={EP / 2}
			stroke="black"
			stroke-width="0.5"
		/>

		<!-- Left button (perspective view) -->
		<rect
			x={LONG_POINTE + d / 8 - 5}
			y={-EP}
			width="7"
			height="3"
			stroke="black"
			stroke-width="0.75"
			fill="silver"
			fill-opacity="1"
		/>

		<!-- Right button (perspective view) -->
		<rect
			x={opening - LONG_POINTE - d / 8 - 4}
			y={-EP}
			width="7"
			height="3"
			stroke="black"
			stroke-width="0.75"
			fill="silver"
			fill-opacity="1"
		/>

		<!-- Central handle -->
		<path d={handlePath} stroke="black" stroke-width="0.75" fill="#666666" fill-opacity="1" />

		<!-- Cross lines on handle -->
		<line
			x1={opening / 2 + dl}
			y1={-EP / 2}
			x2={opening / 2 - dl}
			y2={EP / 2}
			stroke="black"
			stroke-width="0.5"
		/>
		<line
			x1={opening / 2 - dl}
			y1={-EP / 2}
			x2={opening / 2 + dl}
			y2={EP / 2}
			stroke="black"
			stroke-width="0.5"
		/>

		<!-- Central circle on handle -->
		<circle
			cx={opening / 2}
			cy="0"
			r="5"
			stroke="black"
			stroke-width="0.75"
			fill="#666666"
			fill-opacity="1"
		/>
	</g>
{/if}
