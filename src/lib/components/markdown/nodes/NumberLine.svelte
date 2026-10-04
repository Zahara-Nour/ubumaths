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
	- Thème clair / sombre : tokens d'app.css ; couleurs d'auteur de la palette
	  commune (`resolveNumberLineColors`, partagée avec le PDF)
	- Avertissements d'auteur (couleur inconnue, hex peu lisible en sombre),
	  visibles du prof seulement (`showErrors`, ou contexte d'édition)
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
		computeLineExtents,
		resolveNumberLineColors
	} from '$lib/ubumark/utils/number-line-render';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: NumberLineNode;
		/** Montrer les avertissements d'auteur (par défaut : contexte d'édition) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

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

	/** Couleurs sûres (variable du thème ou hex validé) et avertissements */
	let colors = $derived(resolveNumberLineColors(node));

	// =========================================================================
	// POINTS
	// =========================================================================

	let renderedPoints = $derived(
		node.points.map((p: NumberLinePoint, i: number) => ({
			x: valueToX(numVal(p.value), startNum, endNum, scale),
			y: LINE_Y + POINT_Y_OFFSET,
			label: p.label,
			latex: valLatex(p.value),
			color: colors.points[i].screen
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
			color: colors.segments[i].screen
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
			class="nl-axis"
			x1={lineStartX}
			y1={LINE_Y}
			x2={lineEndX}
			y2={LINE_Y}
			stroke-width="1.5"
		/>

		<!-- Arrows -->
		{#if node.config.arrows}
			<!-- Left arrow -->
			<path
				class="nl-arrow"
				d="M {lineStartX} {LINE_Y} L {lineStartX + ARROW_SIZE} {LINE_Y -
					ARROW_SIZE / 2} L {lineStartX + ARROW_SIZE} {LINE_Y + ARROW_SIZE / 2} Z"
			/>
			<!-- Right arrow -->
			<path
				class="nl-arrow"
				d="M {lineEndX} {LINE_Y} L {lineEndX - ARROW_SIZE} {LINE_Y - ARROW_SIZE / 2} L {lineEndX -
					ARROW_SIZE} {LINE_Y + ARROW_SIZE / 2} Z"
			/>
		{/if}

		<!-- Graduations -->
		{#each graduations as grad (grad.x)}
			{@const tickH = grad.isMajor ? MAJOR_TICK_HEIGHT : MINOR_TICK_HEIGHT}
			<line
				class="nl-tick"
				x1={grad.x}
				y1={LINE_Y - tickH / 2}
				x2={grad.x}
				y2={LINE_Y + tickH / 2}
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
			<line
				class="nl-segment"
				x1={seg.x1}
				y1={seg.y}
				x2={seg.x2}
				y2={seg.y}
				style:stroke={seg.color}
				stroke-width="3"
			/>
			<!-- Extrémités : un point ouvert prend la couleur du fond (classe), un fermé celle du segment -->
			{#each [{ x: seg.x1, open: seg.startOpen }, { x: seg.x2, open: seg.endOpen }] as end, k (k)}
				<circle
					class="nl-endpoint"
					class:nl-endpoint-open={end.open}
					cx={end.x}
					cy={seg.y}
					r="4"
					style:fill={end.open ? undefined : seg.color}
					style:stroke={seg.color}
					stroke-width="2"
				/>
			{/each}
		{/each}

		<!-- Points -->
		{#each renderedPoints as point (point.label)}
			<!-- Point circle -->
			<circle
				class="nl-point"
				cx={point.x}
				cy={point.y}
				r={POINT_RADIUS}
				style:fill={point.color}
				stroke-width="1.5"
			/>
			<!-- Point label -->
			<foreignObject x={point.x - 25} y={point.y + POINT_LABEL_Y_OFFSET + 5} width="50" height="20">
				<div class="point-label" style:color={point.color}>
					{point.label}
				</div>
			</foreignObject>
		{/each}
	</svg>
</div>

{#if errorsVisible && colors.warnings.length > 0}
	<ul class="nl-warnings mt-1 text-xs text-warning">
		{#each colors.warnings as message, i (i)}
			<li>Droite graduée — {message}</li>
		{/each}
	</ul>
{/if}

<style>
	.number-line-container {
		width: 100%;
		max-width: 700px;
		margin: 0.5rem auto;
	}

	.number-line-svg {
		overflow: visible;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) */
	.nl-axis,
	.nl-tick {
		stroke: var(--color-foreground);
	}

	.nl-arrow {
		fill: var(--color-foreground);
	}

	/* Point ouvert et halo des points : la couleur du fond */
	.nl-endpoint-open {
		fill: var(--color-background);
	}

	.nl-point {
		stroke: var(--color-background);
	}

	.number-line-label {
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-foreground);
		line-height: 1;
	}

	.hidden-mark {
		font-weight: bold;
		color: var(--color-fig-rouge);
		font-size: 0.85rem;
	}

	.point-label {
		text-align: center;
		font-weight: 600;
		font-size: 0.8rem;
		line-height: 1;
	}
</style>
