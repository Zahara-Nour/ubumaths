<script lang="ts">
	/**
	 * Compass - SVG compass instrument for geometric constructions
	 *
	 * Ported from InstrumenPoche Compas.js
	 * Original author: Yves Biton <yves.biton@sesamath.net>
	 * License: AGPL-3.0-or-later
	 *
	 * Renders a detailed compass with articulated arms, pencil tip, rivets,
	 * and Sesamath logo. The arms open based on the ecart (opening) value.
	 */

	// Constants from original Compas.js
	const LON = 185; // Inner length of both compass branches
	const LONG_POINTE = 18; // Tip length
	const EP = 7; // Branch thickness
	const RET_B = 20; // Left button offset on branch
	const RAY_B = 6; // Button radius
	const EP_M = 3.5; // Lead thickness
	const DL_B = 3; // Half-width bottom of fixed part
	const DL_M = 12; // Half-width middle of fixed part
	const YL_M = 24; // Corresponding y-coordinate
	const YL_M2 = 35; // Upper middle y-coordinate
	const DL_H = 6; // Half-width top of fixed part
	const YL_H = 50; // Corresponding y-coordinate
	const DL_TOP = 3; // Half-width of top part
	const Y_TOP = 70; // Corresponding y-coordinate
	const DEC_BH = 30; // Downward offset of upper part

	// Types
	interface Props {
		x?: number;
		y?: number;
		rotation?: number;
		opening?: number; // ecart - distance between compass points
		scale?: number;
		flipped?: boolean; // bretourne
		visible?: boolean;
	}

	// Props with defaults
	let {
		x = 200,
		y = 400,
		rotation = 0,
		opening = 0, // ecart
		scale = 1,
		flipped = false,
		visible = true
	}: Props = $props();

	// Calculate the half-angle based on opening
	let halfAngle = $derived.by(() => {
		const d = LON + LONG_POINTE;
		const scaledOpening = opening / scale;
		let nb = scaledOpening / (2 * d);
		if (nb > 1) nb = 1; // Prevent unrealistic opening
		return (Math.asin(nb) / Math.PI) * 180;
	});

	// Calculate transforms for each part
	let leftBranchTransform = $derived(`rotate(${halfAngle})`);

	let rightBranchTransform = $derived(`translate(${opening / scale}, 0) rotate(${-halfAngle})`);

	let topPartTransform = $derived.by(() => {
		const d = LON + LONG_POINTE;
		const ang = (halfAngle / 180) * Math.PI;
		const transX = opening / 2 / scale;
		const transY = -d * Math.cos(ang) + DEC_BH;
		return `translate(${transX}, ${transY})`;
	});

	// Main group transform
	let mainTransform = $derived.by(() => {
		const scaleStr = flipped ? `scale(${scale}, ${-scale})` : `scale(${scale})`;
		return `${scaleStr} translate(${x / scale}, ${y / scale}) rotate(${rotation})`;
	});

	// Path data for left branch
	let leftBranchPath = $derived(
		`M0 ${-LONG_POINTE} L0 ${-LONG_POINTE - LON} ${-EP} ${-LONG_POINTE - LON} ${-EP} ${-LONG_POINTE} Z`
	);

	// Path data for right branch (mine/lead)
	let minePath = $derived(
		`M0 0 L0 ${-LONG_POINTE} ${EP_M} ${-LONG_POINTE - EP_M} ${EP_M} ${-EP_M - 3} Z`
	);

	// Path data for right branch body
	let rightBranchPath = $derived(
		`M0 ${-LONG_POINTE} L0 ${-LONG_POINTE - LON} ${EP} ${-LONG_POINTE - LON} ${EP} ${-LONG_POINTE} Z`
	);

	// Path data for small button on right side
	let rightButtonPath = $derived.by(() => {
		const rayx = (RAY_B / 4) * 3;
		const rayy = RAY_B / 2;
		return `M${EP} ${-LONG_POINTE - RET_B + rayx} A${rayx} ${rayy} -90 0 0 ${EP} ${-LONG_POINTE - RET_B - rayx} Z`;
	});

	// Path data for top fixed part
	let topPath = $derived.by(() => {
		return (
			`M0 0 L${DL_B} 0 ${DL_M} ${-YL_M} ${DL_M} ${-YL_M2}` +
			`A${YL_H - YL_M2} ${DL_M - DL_H} -90 0 1 ${DL_H} ${-YL_H}` +
			`L${DL_TOP} ${-Y_TOP} ${-DL_TOP} ${-Y_TOP}` +
			`L${-DL_H} ${-YL_H} A${YL_H - YL_M2} ${DL_M - DL_H} 90 0 1 ${-DL_M} ${-YL_M2}` +
			`L${-DL_M} ${-YL_M} ${-DL_B} 0 Z`
		);
	});
</script>

{#if visible}
	<g transform={mainTransform} class="compass-instrument">
		<!-- Left branch (with tip) -->
		<g transform={leftBranchTransform}>
			<!-- Metal tip line -->
			<line x1="0" y1="0" x2="0" y2={-LONG_POINTE} stroke="black" stroke-width="1.5" />
			<!-- Branch body -->
			<path d={leftBranchPath} stroke="black" stroke-width="0.75" fill="silver" fill-opacity="1" />
			<!-- Left button (circle with inner circle) -->
			<circle
				cx={-EP / 2}
				cy={-LONG_POINTE - RET_B}
				r={RAY_B}
				stroke="black"
				stroke-width="0.75"
				fill="silver"
				fill-opacity="1"
			/>
			<circle
				cx={-EP / 2}
				cy={-LONG_POINTE - RET_B}
				r="2"
				stroke="black"
				stroke-width="1"
				fill="silver"
				fill-opacity="1"
			/>
		</g>

		<!-- Right branch (with pencil lead) -->
		<g transform={rightBranchTransform}>
			<!-- Pencil lead (black tip) -->
			<path d={minePath} stroke="black" stroke-width="0.75" fill="black" fill-opacity="1" />
			<!-- Branch body -->
			<path d={rightBranchPath} stroke="black" stroke-width="0.75" fill="silver" fill-opacity="1" />
			<!-- Small button part on right -->
			<path d={rightButtonPath} stroke="black" stroke-width="1" fill="silver" fill-opacity="1" />
			<!-- Diagonal line on right branch -->
			<line x1="0" y1="-100" x2={EP} y2={-100 + EP} stroke="black" stroke-width="1" />
			<!-- Other lines on right branch -->
			<line x1="0" y1="-50" x2={EP} y2="-50" stroke="black" stroke-width="1" />
			<line x1={EP / 2} y1="-50" x2={EP / 2} y2="-73" stroke="black" stroke-width="1" />
			<!-- Side button (rectangle) -->
			<rect
				x={EP}
				y="-68"
				width="4"
				height="12"
				stroke="black"
				stroke-width="0.75"
				fill="silver"
				fill-opacity="1"
			/>
		</g>

		<!-- Top fixed part (handle) -->
		<g transform={topPartTransform}>
			<!-- Main body -->
			<path d={topPath} stroke="black" stroke-width="0.75" fill="#666666" fill-opacity="1" />
			<!-- Horizontal line -->
			<line x1={DL_H} y1={-YL_H} x2={-DL_H} y2={-YL_H} stroke="black" stroke-width="1" />
			<!-- Sesamath logo text -->
			<text
				pointer-events="none"
				x="0"
				y="0"
				style="font-family: Arial; font-size: 5pt; fill: white;"
				transform="rotate(-90) translate(4, 2.5)"
			>
				Sesamath
			</text>
			<!-- Left rivet -->
			<circle
				cx={-EP + 1}
				cy={-DEC_BH}
				r="3"
				stroke="black"
				stroke-width="1"
				fill="white"
				fill-opacity="1"
			/>
			<!-- Right rivet -->
			<circle
				cx={EP - 1}
				cy={-DEC_BH}
				r="3"
				stroke="black"
				stroke-width="1"
				fill="white"
				fill-opacity="1"
			/>
		</g>
	</g>
{/if}
