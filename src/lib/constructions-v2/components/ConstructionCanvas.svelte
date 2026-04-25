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
	import { easeInOut, easeWithFixedRamp } from '../core/animator';
	import { pointToSVG, resolveStyle } from '$lib/geometry-core/rendering/svg-primitives';

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

	// IDs to hide from GeometryCanvas during animation (drawables + points being animated)
	let hiddenElementIds = $derived.by(() => {
		if (!animation || animation.drawProgress >= 1) return undefined;
		const drawableHidden = animation.animatingIds.size > 0;
		const pointsHidden = animation.animatingPointIds.size > 0;
		if (!drawableHidden && !pointsHidden) return undefined;
		const ids = new Set<string>();
		for (const id of animation.animatingIds) ids.add(id);
		for (const id of animation.animatingPointIds) ids.add(id);
		return ids;
	});

	// Pencil tip override during drawing animation (SVG coords)
	// Uses adjusted drawProgress (0 during instrument move phase)
	let pencilTip = $derived.by(() => {
		if (!animation || animation.animatingIds.size === 0 || animation.drawProgress >= 1) {
			return null;
		}
		if (drawProgress <= 0) return null; // Still in instrument move phase
		return drawingTipPosition(animation.animatingIds, figure, transformer, drawProgress);
	});

	// Pencil rotation: +45° from drawing direction for natural pen-holding angle
	let pencilRotation = $derived.by(() => {
		if (!animation || animation.animatingIds.size === 0 || drawProgress <= 0) return 0;
		for (const id of animation.animatingIds) {
			const seg = partialSegmentSVG(id, figure, transformer, 1);
			if (seg) {
				const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1) * (180 / Math.PI);
				return angle - 45;
			}
		}
		return 0;
	});

	// Is animation active (elements being drawn progressively)?
	let isAnimating = $derived(
		!!animation && animation.animatingIds.size > 0 && animation.drawProgress < 1
	);

	// Phase ratios from animation state
	let moveEnd = $derived(animation?.movePhaseEnd ?? 0);
	let pauseStart = $derived(animation?.pausePhaseStart ?? 1);

	// Adjusted draw progress: 0 during move phase, 0→1 during draw phase, 1 during pause phase.
	// Eased for smooth acceleration/deceleration.
	let drawProgress = $derived.by(() => {
		if (!animation) return 0;
		const p = animation.drawProgress;
		if (moveEnd > 0 && p < moveEnd) return 0;
		if (p >= pauseStart) return 1;
		const drawRange = pauseStart - moveEnd;
		if (drawRange <= 0) return p >= moveEnd ? 1 : 0;
		const raw = (p - moveEnd) / drawRange;
		return easeInOut(Math.max(0, Math.min(1, raw)));
	});

	// Instrument move progress: 0→1 during the move phase, eased with fixed ramp.
	let instrumentMoveProgress = $derived.by(() => {
		if (!animation || animation.instrumentMoves.size === 0 || moveEnd <= 0) return 1;
		const p = animation.drawProgress;
		if (p >= moveEnd) return 1;
		const t = p / moveEnd;
		const moveDurMs = animation.moveDurationMs;
		if (moveDurMs <= 0) return easeInOut(t);
		const rampRatio = Math.min(0.5, 300 / moveDurMs);
		return easeWithFixedRamp(t, rampRatio);
	});

	// Interpolated instrument positions in SVG coords (reactive — updates every frame)
	let instrumentPositions = $derived.by(() => {
		const positions: Record<string, { x: number; y: number; rotation: number }> = {};
		for (const state of visibleInstruments) {
			const move = animation?.instrumentMoves.get(state.type);
			if (move && instrumentMoveProgress < 1) {
				const t = instrumentMoveProgress;
				const x = move.fromX + (move.toX - move.fromX) * t;
				const y = move.fromY + (move.toY - move.fromY) * t;
				const rot = move.fromRotation + (move.toRotation - move.fromRotation) * t;
				const svgPos = transformer.mathToSvg(x, y);
				positions[state.type] = { x: svgPos.x, y: svgPos.y, rotation: -rot };
			} else {
				const svgPos = transformer.mathToSvg(state.x, state.y);
				positions[state.type] = { x: svgPos.x, y: svgPos.y, rotation: -state.rotation };
			}
		}
		return positions;
	});

	// Pre-compute arrays from Sets (only recompute when sets change, not every frame)
	let animatingIdArray = $derived(animation ? [...animation.animatingIds] : ([] as string[]));
	let animatingPointIdArray = $derived(
		animation ? [...animation.animatingPointIds] : ([] as string[])
	);

	// Point animation: fade-in + bump (scale 0 → 1.3 → 1)
	let pointAnimProgress = $derived.by(() => {
		if (!animation || animation.animatingPointIds.size === 0) return 1;
		return easeInOut(animation.drawProgress);
	});
	// Bump: overshoot to 1.3 at progress 0.5, settle to 1.0 at progress 1.0
	let pointScale = $derived.by(() => {
		const t = pointAnimProgress;
		if (t <= 0.5) return t * 2 * 1.3; // 0 → 1.3
		return 1.3 - (t - 0.5) * 2 * 0.3; // 1.3 → 1.0
	});

	// Recompute when figureVersion changes (Map reference is stable, $derived needs a hint)
	let visibleInstruments = $derived.by(() => {
		void figureVersion;
		const all = [...instrumentStates.values()].filter((s) => s.visible);
		if (!animation) return all;
		// Hide auto-instruments when animation is complete
		if (animation.autoInstruments.size > 0 && animation.drawProgress >= 1) {
			return all.filter((s) => !animation.autoInstruments.has(s.type));
		}
		// Hide pencil during instrument move phase (pencil appears only when drawing starts)
		if (drawProgress <= 0 && animation.autoInstruments.has('pencil')) {
			return all.filter((s) => s.type !== 'pencil');
		}
		return all;
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
					{@const seg = partialSegmentSVG(id, figure, transformer, drawProgress)}
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
					{@const arc = partialArcSVGPath(id, figure, transformer, drawProgress)}
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
					{@const circle = partialCircleSVGPath(id, figure, transformer, drawProgress)}
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

	<!-- Point animation overlay: fade-in + bump with labels -->
	{#if animation && animation.animatingPointIds.size > 0 && animation.drawProgress < 1}
		<svg
			class="points-overlay"
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			style="position: absolute; top: 0; left: 0; pointer-events: none;"
		>
			{#each animatingPointIdArray as id (id)}
				{@const pt = pointToSVG(id, figure, transformer)}
				{@const el = figure.getElementById(id)}
				{@const sty = el ? resolveStyle(el, figure.defaults) : null}
				{#if pt && sty}
					{@const s = pointScale}
					{@const op = pointAnimProgress}
					<g transform="translate({pt.cx}, {pt.cy}) scale({s})" opacity={op}>
						{#if sty.pointShape === 'dot'}
							<circle r={sty.pointSize} fill={sty.color} />
						{:else if sty.pointShape === 'circle'}
							<circle
								r={sty.pointSize}
								fill="none"
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
							/>
						{:else if sty.pointShape === 'cross'}
							<line
								x1={-sty.pointSize}
								y1={-sty.pointSize}
								x2={sty.pointSize}
								y2={sty.pointSize}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
							/>
							<line
								x1={sty.pointSize}
								y1={-sty.pointSize}
								x2={-sty.pointSize}
								y2={sty.pointSize}
								stroke={sty.color}
								stroke-width={sty.strokeWidth}
							/>
						{:else if sty.pointShape === 'square'}
							<rect
								x={-sty.pointSize}
								y={-sty.pointSize}
								width={sty.pointSize * 2}
								height={sty.pointSize * 2}
								fill={sty.color}
							/>
						{/if}
						{#if el.label}
							<text
								x={el.labelOffset?.dx ?? sty.pointSize + 4}
								y={el.labelOffset?.dy ?? -(sty.pointSize + 2)}
								fill={sty.color}
								stroke="white"
								stroke-width="3"
								paint-order="stroke"
								font-size="14"
								font-family="KaTeX_Main, serif">{el.label}</text
							>
						{/if}
					</g>
				{/if}
			{/each}
		</svg>
	{/if}

	<!-- Instruments overlay — uses instrumentPositions (reactive Record) for animated positions -->
	{#if visibleInstruments.length > 0}
		<svg
			class="instruments-overlay"
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			style="position: absolute; top: 0; left: 0; pointer-events: none;"
		>
			{#each visibleInstruments as state (state.type)}
				{#if state.type === 'pencil'}
					{@const tip = pencilTip}
					{@const ipos = instrumentPositions['pencil']}
					<g
						transform="translate({tip?.x ?? ipos?.x ?? 0}, {tip?.y ??
							ipos?.y ??
							0}) rotate({isAnimating ? pencilRotation : (ipos?.rotation ?? 0)})"
						opacity={state.opacity}
					>
						<Pencil x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					</g>
				{:else if state.type === 'ruler'}
					{@const rpos = instrumentPositions['ruler']}
					<g
						transform="translate({rpos?.x ?? 0}, {rpos?.y ?? 0}) rotate({rpos?.rotation ?? 0})"
						opacity={state.opacity}
					>
						<Ruler x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					</g>
				{:else if state.type === 'compass'}
					{@const cpos = instrumentPositions['compass']}
					<g
						transform="translate({cpos?.x ?? 0}, {cpos?.y ?? 0}) rotate({cpos?.rotation ?? 0})"
						opacity={state.opacity}
					>
						<Compass
							x={0}
							y={0}
							rotation={0}
							opening={(state.compassRadius ?? 100) * PPU}
							scale={state.scale}
							visible={true}
						/>
					</g>
				{:else if state.type === 'protractor'}
					{@const ppos = instrumentPositions['protractor']}
					<g
						transform="translate({ppos?.x ?? 0}, {ppos?.y ?? 0}) rotate({ppos?.rotation ?? 0})"
						opacity={state.opacity}
					>
						<Protractor x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					</g>
				{:else if state.type === 'setSquare'}
					{@const spos = instrumentPositions['setSquare']}
					<g
						transform="translate({spos?.x ?? 0}, {spos?.y ?? 0}) rotate({spos?.rotation ?? 0})"
						opacity={state.opacity}
					>
						<SetSquare x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					</g>
				{/if}
			{/each}
		</svg>
	{/if}
</div>

<style>
	.construction-canvas {
		overflow: hidden;
	}
</style>
