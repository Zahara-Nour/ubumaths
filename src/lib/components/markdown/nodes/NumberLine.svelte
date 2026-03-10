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
		NumberLineValue,
		NumberLinePoint,
		NumberLineSegment
	} from '$lib/ubumark/types/number-line';
	import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import { compareNumericNodes } from '$lib/mathAST/eval/compare-numeric';

	interface Props {
		node: NumberLineNode;
		class?: string;
	}

	let { node, class: className = '' }: Props = $props();

	// =========================================================================
	// LAYOUT CONSTANTS
	// =========================================================================

	const MARGIN_LEFT = 40;
	const MARGIN_RIGHT = 40;
	const SVG_WIDTH = 600;
	const SVG_HEIGHT = 120;
	const LINE_Y = 50;
	const MINOR_TICK_HEIGHT = 6;
	const MAJOR_TICK_HEIGHT = 12;
	const LABEL_Y_OFFSET = 20;
	const POINT_RADIUS = 5;
	const POINT_Y_OFFSET = -18;
	const POINT_LABEL_Y_OFFSET = -30;
	const SEGMENT_Y_OFFSET = 12;
	const ARROW_SIZE = 8;
	const LINE_WIDTH = SVG_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

	// =========================================================================
	// COMPUTED VALUES
	// =========================================================================

	function numVal(v: NumberLineValue): number {
		return evaluateNodeToApproximatedNumber(v.ast);
	}

	function valLatex(v: NumberLineValue): string {
		return toLatex(v.ast);
	}

	function isHidden(v: NumberLineValue): boolean {
		return node.config.hidden.some((h) => compareNumericNodes(h.ast, v.ast) === 0);
	}

	let startNum = $derived(numVal(node.config.start));
	let endNum = $derived(numVal(node.config.end));
	let stepNum = $derived(numVal(node.config.step));

	/**
	 * Map a numeric value to SVG x coordinate
	 */
	function valueToX(val: number): number {
		if (node.config.scale === 'log') {
			const logStart = Math.log10(startNum);
			const logEnd = Math.log10(endNum);
			const logVal = Math.log10(val);
			return MARGIN_LEFT + ((logVal - logStart) / (logEnd - logStart)) * LINE_WIDTH;
		}
		return MARGIN_LEFT + ((val - startNum) / (endNum - startNum)) * LINE_WIDTH;
	}

	// =========================================================================
	// GRADUATIONS
	// =========================================================================

	interface Graduation {
		x: number;
		value: number;
		isMajor: boolean;
		label: string | null;
		hidden: boolean;
		lineValue: NumberLineValue | null;
	}

	let graduations = $derived.by(() => {
		const grads: Graduation[] = [];
		const major = node.config.major;
		const hasExplicitLabels = node.config.labels.length > 0;
		const tolerance = stepNum * 0.001;

		let tickIndex = 0;
		for (let val = startNum; val <= endNum + tolerance; val += stepNum) {
			const isMajor = tickIndex % major === 0;
			const x = valueToX(val);

			// Find matching NumberLineValue from labels if explicit
			let lineValue: NumberLineValue | null = null;
			let label: string | null = null;
			let hidden = false;

			if (hasExplicitLabels) {
				// Check if this graduation matches an explicit label
				const matchingLabel = node.config.labels.find((lv) => {
					return Math.abs(numVal(lv) - val) < tolerance;
				});
				if (matchingLabel) {
					lineValue = matchingLabel;
					hidden = isHidden(matchingLabel);
					label = hidden ? '?' : valLatex(matchingLabel);
				}
			} else if (isMajor) {
				// Auto-label major graduations
				// Try to find a matching value from step increments
				// Build a NumberLineValue on-the-fly for display
				label = formatAutoLabel(val);

				// Check if hidden
				const matchingHidden = node.config.hidden.find((hv) => {
					return Math.abs(numVal(hv) - val) < tolerance;
				});
				if (matchingHidden) {
					hidden = true;
					label = '?';
				}
			}

			grads.push({ x, value: val, isMajor, label, hidden, lineValue });
			tickIndex++;
		}

		return grads;
	});

	/**
	 * Format an auto-generated label for a graduation value
	 */
	function formatAutoLabel(val: number): string {
		// Clean up floating point: if very close to an integer or simple fraction
		if (Math.abs(val - Math.round(val)) < 1e-9) {
			return String(Math.round(val));
		}
		// Try common fractions
		for (const denom of [2, 3, 4, 5, 6, 8, 10]) {
			const numer = val * denom;
			if (Math.abs(numer - Math.round(numer)) < 1e-9) {
				return `\\frac{${Math.round(numer)}}{${denom}}`;
			}
		}
		// Fall back to decimal
		return val.toFixed(2).replace(/\.?0+$/, '');
	}

	// =========================================================================
	// POINTS
	// =========================================================================

	let renderedPoints = $derived(
		node.points.map((p: NumberLinePoint) => ({
			x: valueToX(numVal(p.value)),
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
			x1: valueToX(numVal(s.start)),
			x2: valueToX(numVal(s.end)),
			y: LINE_Y + SEGMENT_Y_OFFSET + i * 10,
			startOpen: s.startOpen,
			endOpen: s.endOpen,
			color: s.color || 'var(--number-line-segment, #3498db)'
		}))
	);

	// =========================================================================
	// ARROWS
	// =========================================================================

	let lineStartX = $derived(MARGIN_LEFT - (node.config.arrows ? ARROW_SIZE + 2 : 0));
	let lineEndX = $derived(MARGIN_LEFT + LINE_WIDTH + (node.config.arrows ? ARROW_SIZE + 2 : 0));

	// Dynamic height based on content
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
