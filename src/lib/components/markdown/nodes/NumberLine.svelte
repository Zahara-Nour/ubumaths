<!--
	NumberLine Component
	====================

	Renders a number line (droite graduée) as SVG.

	Features:
	- Horizontal line with minor/major graduations
	- Labels under major graduations via foreignObject + math-span
	- Hidden labels shown as "?"
	- Named points above the line (colored circles + labels)
	- Colored segments with open/closed endpoints
	- Optional arrows at line endpoints
	- Linear or logarithmic scale
	- Dark mode support via CSS variables
	- Responsive width via viewBox

	@module components/markdown/nodes/NumberLine
-->
<script lang="ts">
	import 'mathlive';
	import type {
		NumberLineNode,
		NumberLinePoint,
		NumberLineSegment
	} from '$lib/ubumark/types/number-line';
	import {
		NL_LAYOUT,
		numVal,
		valLatex,
		valueToX,
		computeGraduations,
		computeLineExtents
	} from '$lib/ubumark/utils/number-line-render';

	interface Props {
		node: NumberLineNode;
		class?: string;
	}

	let { node, class: className = '' }: Props = $props();

	const {
		SVG_WIDTH,
		LINE_Y,
		MINOR_TICK_HEIGHT,
		MAJOR_TICK_HEIGHT,
		LABEL_Y_OFFSET,
		POINT_RADIUS,
		POINT_Y_OFFSET,
		POINT_LABEL_Y_OFFSET,
		SEGMENT_Y_OFFSET,
		ARROW_SIZE
	} = NL_LAYOUT;

	const SVG_HEIGHT = 120;

	// =========================================================================
	// COMPUTED VALUES
	// =========================================================================

	let startNum = $derived(numVal(node.config.start));
	let endNum = $derived(numVal(node.config.end));
	let scale = $derived(node.config.scale ?? 'linear');

	let graduations = $derived(computeGraduations(node.config));

	// =========================================================================
	// POINTS
	// =========================================================================

	let renderedPoints = $derived(
		node.points.map((p: NumberLinePoint) => ({
			x: valueToX(numVal(p.value), startNum, endNum, scale),
			y: LINE_Y + POINT_Y_OFFSET,
			label: p.label,
			latex: valLatex(p.value),
			color: p.color || 'var(--number-line-point, #e74c3c)'
		}))
	);

	// =========================================================================
	// SEGMENTS
	// =========================================================================

	let renderedSegments = $derived(
		node.segments.map((s: NumberLineSegment, i: number) => ({
			x1: valueToX(numVal(s.start), startNum, endNum, scale),
			x2: valueToX(numVal(s.end), startNum, endNum, scale),
			y: LINE_Y + SEGMENT_Y_OFFSET + i * 10,
			startOpen: s.startOpen,
			endOpen: s.endOpen,
			color: s.color || 'var(--number-line-segment, #3498db)'
		}))
	);

	// =========================================================================
	// ARROWS & HEIGHT
	// =========================================================================

	let { lineStartX, lineEndX } = $derived(computeLineExtents(node.config.arrows));

	let svgHeight = $derived.by(() => {
		let h = SVG_HEIGHT;
		if (node.segments.length > 0) {
			h += node.segments.length * 10;
		}
		return h;
	});
</script>

<div class="number-line-container {className}" role="img" aria-label="Droite graduée">
	<svg
		viewBox="0 0 {SVG_WIDTH} {svgHeight}"
		width="100%"
		preserveAspectRatio="xMidYMid meet"
		class="number-line-svg"
	>
		<!-- Main horizontal line -->
		<line
			x1={lineStartX}
			y1={LINE_Y}
			x2={lineEndX}
			y2={LINE_Y}
			stroke="var(--number-line-axis, currentColor)"
			stroke-width="1.5"
		/>

		<!-- Arrows -->
		{#if node.config.arrows}
			<!-- Left arrow -->
			<path
				d="M {lineStartX} {LINE_Y} L {lineStartX + ARROW_SIZE} {LINE_Y -
					ARROW_SIZE / 2} L {lineStartX + ARROW_SIZE} {LINE_Y + ARROW_SIZE / 2} Z"
				fill="var(--number-line-axis, currentColor)"
			/>
			<!-- Right arrow -->
			<path
				d="M {lineEndX} {LINE_Y} L {lineEndX - ARROW_SIZE} {LINE_Y - ARROW_SIZE / 2} L {lineEndX -
					ARROW_SIZE} {LINE_Y + ARROW_SIZE / 2} Z"
				fill="var(--number-line-axis, currentColor)"
			/>
		{/if}

		<!-- Graduations -->
		{#each graduations as grad (grad.x)}
			{@const tickH = grad.isMajor ? MAJOR_TICK_HEIGHT : MINOR_TICK_HEIGHT}
			<line
				x1={grad.x}
				y1={LINE_Y - tickH / 2}
				x2={grad.x}
				y2={LINE_Y + tickH / 2}
				stroke="var(--number-line-tick, currentColor)"
				stroke-width={grad.isMajor ? 1.5 : 1}
			/>

			<!-- Labels -->
			{#if grad.label !== null}
				<foreignObject x={grad.x - 30} y={LINE_Y + LABEL_Y_OFFSET - 5} width="60" height="30">
					<div class="number-line-label" class:hidden-label={grad.hidden}>
						{#if grad.hidden}
							<span class="hidden-mark">?</span>
						{:else}
							<math-field
								read-only
								style="font-size: 0.75rem; display: inline-block; border: none; background: transparent; min-width: 0; padding: 0;"
							>
								{grad.label}
							</math-field>
						{/if}
					</div>
				</foreignObject>
			{/if}
		{/each}

		<!-- Segments -->
		{#each renderedSegments as seg, i (i)}
			<line x1={seg.x1} y1={seg.y} x2={seg.x2} y2={seg.y} stroke={seg.color} stroke-width="3" />
			<!-- Start endpoint -->
			<circle
				cx={seg.x1}
				cy={seg.y}
				r="4"
				fill={seg.startOpen ? 'var(--number-line-bg, white)' : seg.color}
				stroke={seg.color}
				stroke-width="2"
			/>
			<!-- End endpoint -->
			<circle
				cx={seg.x2}
				cy={seg.y}
				r="4"
				fill={seg.endOpen ? 'var(--number-line-bg, white)' : seg.color}
				stroke={seg.color}
				stroke-width="2"
			/>
		{/each}

		<!-- Points -->
		{#each renderedPoints as point (point.label)}
			<!-- Point circle -->
			<circle
				cx={point.x}
				cy={point.y}
				r={POINT_RADIUS}
				fill={point.color}
				stroke="var(--number-line-bg, white)"
				stroke-width="1.5"
			/>
			<!-- Point label -->
			<foreignObject x={point.x - 25} y={point.y + POINT_LABEL_Y_OFFSET + 5} width="50" height="20">
				<div class="point-label" style="color: {point.color}">
					{point.label}
				</div>
			</foreignObject>
		{/each}
	</svg>
</div>

<style>
	.number-line-container {
		width: 100%;
		max-width: 700px;
		margin: 0.5rem auto;
	}

	.number-line-svg {
		overflow: visible;
	}

	.number-line-label {
		text-align: center;
		font-size: 0.75rem;
		color: var(--number-line-text, currentColor);
		line-height: 1;
	}

	.hidden-mark {
		font-weight: bold;
		color: var(--number-line-hidden, #e74c3c);
		font-size: 0.85rem;
	}

	.point-label {
		text-align: center;
		font-weight: 600;
		font-size: 0.8rem;
		line-height: 1;
	}

	/* Dark mode */
	:global(.dark) .number-line-container {
		--number-line-bg: hsl(var(--background));
		--number-line-axis: hsl(var(--foreground));
		--number-line-tick: hsl(var(--foreground));
		--number-line-text: hsl(var(--foreground));
	}
</style>
