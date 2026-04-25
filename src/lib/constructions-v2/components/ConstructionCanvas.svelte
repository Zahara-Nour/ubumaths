<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { createTransformer } from '$lib/geometry-core/viewport/viewport';
	import { Ruler, Compass, Pencil, Protractor, SetSquare } from '../instruments/components/index';
	import type { Figure } from '$lib/geometry-core/graph/figure';
	import type { InstrumentState, DrawAnimationState } from '../types';
	import {
		partialSegmentSVG,
		partialArcSVGPath,
		partialCircleSVGPath,
		drawingTipPosition
	} from '../core/render-helpers';

	interface Props {
		figure: Figure;
		instrumentStates: Map<string, InstrumentState>;
		animation?: DrawAnimationState;
		figureVersion?: number;
		width?: number;
		height?: number;
		showGrid?: boolean;
		interactive?: boolean;
		class?: string;
	}

	let {
		figure,
		instrumentStates,
		animation,
		figureVersion = 0,
		width = 800,
		height = 600,
		showGrid = true,
		interactive = false,
		class: className = ''
	}: Props = $props();

	// Match GeometryCanvas viewport (center=0,0, pixelsPerUnit=40)
	const PPU = 40;
	let viewport = $derived({
		xMin: -width / (2 * PPU),
		xMax: width / (2 * PPU),
		yMin: -height / (2 * PPU),
		yMax: height / (2 * PPU)
	});
	let transformer = $derived(createTransformer(viewport, width, height));

	// IDs to hide from GeometryCanvas during animation
	let hiddenElementIds = $derived.by(() => {
		if (!animation || animation.animatingIds.size === 0 || animation.drawProgress >= 1) {
			return undefined;
		}
		return animation.animatingIds;
	});

	// Pencil tip override during drawing animation
	let pencilTip = $derived.by(() => {
		if (!animation || animation.animatingIds.size === 0 || animation.drawProgress >= 1) {
			return null;
		}
		return drawingTipPosition(animation.animatingIds, figure, transformer, animation.drawProgress);
	});

	// Is animation active (elements being drawn progressively)?
	let isAnimating = $derived(
		!!animation && animation.animatingIds.size > 0 && animation.drawProgress < 1
	);

	// Pre-compute array from Set (only recomputes when animatingIds set changes, not every frame)
	let animatingIdArray = $derived(animation ? [...animation.animatingIds] : ([] as string[]));

	// Recompute when figureVersion changes (Map reference is stable, $derived needs a hint)
	let visibleInstruments = $derived.by(() => {
		void figureVersion;
		return [...instrumentStates.values()].filter((s) => s.visible);
	});
</script>

<div class="construction-canvas {className}" style="position: relative; display: inline-block;">
	<!-- Geometry figure layer -->
	<GeometryCanvas
		{figure}
		{width}
		{height}
		{showGrid}
		{interactive}
		{hiddenElementIds}
		externalVersion={figureVersion}
	/>

	<!-- Animation overlay: partial elements being drawn -->
	{#if isAnimating && animation}
		<svg
			class="animation-overlay"
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			style="position: absolute; top: 0; left: 0; pointer-events: none;"
		>
			{#each animatingIdArray as id (id)}
				{@const el = figure.getElementById(id)}
				{#if el?.type === 'segment'}
					{@const seg = partialSegmentSVG(id, figure, transformer, animation.drawProgress)}
					{#if seg}
						<line
							x1={seg.x1}
							y1={seg.y1}
							x2={seg.x2}
							y2={seg.y2}
							stroke={seg.style.color}
							stroke-width={seg.style.strokeWidth}
							stroke-dasharray={seg.style.dashArray}
							stroke-linecap="round"
							fill="none"
						/>
					{/if}
				{:else if el?.type === 'arcByAngles' || el?.type === 'arcByPoints'}
					{@const arc = partialArcSVGPath(id, figure, transformer, animation.drawProgress)}
					{#if arc}
						<path
							d={arc.path}
							stroke={arc.style.color}
							stroke-width={arc.style.strokeWidth}
							stroke-dasharray={arc.style.dashArray}
							stroke-linecap="round"
							fill="none"
						/>
					{/if}
				{:else if el?.type === 'circleByRadius' || el?.type === 'circleByPoint'}
					{@const circle = partialCircleSVGPath(id, figure, transformer, animation.drawProgress)}
					{#if circle}
						<path
							d={circle.path}
							stroke={circle.style.color}
							stroke-width={circle.style.strokeWidth}
							stroke-dasharray={circle.style.dashArray}
							stroke-linecap="round"
							fill="none"
						/>
					{/if}
				{/if}
			{/each}
		</svg>
	{/if}

	<!-- Instruments overlay -->
	{#if visibleInstruments.length > 0}
		<svg
			class="instruments-overlay"
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			style="position: absolute; top: 0; left: 0; pointer-events: none;"
		>
			{#each visibleInstruments as state (state.type)}
				{@const isPencil = state.type === 'pencil'}
				{@const px = isPencil && pencilTip ? pencilTip.x : state.x}
				{@const py = isPencil && pencilTip ? pencilTip.y : state.y}
				<g transform="translate({px}, {py}) rotate({state.rotation})" opacity={state.opacity}>
					{#if state.type === 'ruler'}
						<Ruler x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					{:else if state.type === 'compass'}
						<Compass
							x={0}
							y={0}
							rotation={0}
							opening={state.compassRadius ?? 100}
							scale={state.scale}
							visible={true}
						/>
					{:else if state.type === 'pencil'}
						<Pencil x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					{:else if state.type === 'protractor'}
						<Protractor x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					{:else if state.type === 'setSquare'}
						<SetSquare x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					{/if}
				</g>
			{/each}
		</svg>
	{/if}
</div>

<style>
	.construction-canvas {
		overflow: hidden;
	}
</style>
