<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { createTransformer } from '$lib/geometry-core/viewport/viewport';
	import type { Viewport } from '$lib/geometry-core/viewport/types';
	import {
		Ruler,
		Compass,
		CompassRaised,
		Pencil,
		Protractor,
		SetSquare
	} from '../instruments/components/index';
	import type { Figure } from '$lib/geometry-core/graph/figure';
	import type { InstrumentState, DrawAnimationState } from '../types';
	import {
		partialSegmentSVG,
		partialArcSVGPath,
		partialCircleSVGPath,
		drawingTipPosition,
		compassDrawAngle
	} from '../core/render-helpers';
	import { easeInOut, easeWithFixedRamp } from '../core/animator';
	import {
		pointToSVG,
		resolveStyle,
		lineToSVG,
		rayToSVG
	} from '$lib/geometry-core/rendering/svg-primitives';
	import { geoToNumber } from '$lib/geometry-core/compute/to-number';
	import { isFreePoint } from '$lib/geometry-core/types/elements';

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

	// Viewport synced from GeometryCanvas via onViewportChange callback below.
	// Default matches GeometryCanvas's defaults (center=0,0, pixelsPerUnit=40) so
	// instruments/overlay are positioned correctly on first paint, before the
	// callback fires.
	const INITIAL_PPU = 40;
	// svelte-ignore state_referenced_locally
	let viewport = $state<Viewport>({
		xMin: -width / (2 * INITIAL_PPU),
		xMax: width / (2 * INITIAL_PPU),
		yMin: -height / (2 * INITIAL_PPU),
		yMax: height / (2 * INITIAL_PPU)
	});
	let pixelsPerUnit = $state(INITIAL_PPU);
	let transformer = $derived(createTransformer(viewport, width, height));

	function handleViewportChange(v: Viewport, ppu: number) {
		viewport = v;
		pixelsPerUnit = ppu;
	}

	// IDs to hide from GeometryCanvas during animation (drawables + points + lines being animated)
	// Drawables are unhidden once drawing is complete (raw progress >= drawPhaseEnd),
	// even if the compass lower phase is still running.
	let hiddenElementIds = $derived.by(() => {
		if (!animation || animation.drawProgress >= 1) return undefined;
		const p = animation.drawProgress;
		const dEnd = animation.drawPhaseEnd;
		const drawableHidden = animation.animatingIds.size > 0 && p < dEnd;
		const pointsHidden = animation.animatingPointIds.size > 0;
		const linesHidden = animation.animatingLineIds.size > 0;
		if (!drawableHidden && !pointsHidden && !linesHidden) return undefined;
		const ids = new Set<string>();
		if (drawableHidden) {
			for (const id of animation.animatingIds) ids.add(id);
		}
		for (const id of animation.animatingPointIds) ids.add(id);
		for (const id of animation.animatingLineIds) ids.add(id);
		return ids;
	});

	// Line fade-in : opacity 0 → 1 quickly (by t=0.4), then stays at 1 so the
	// bump (next derived value) is fully visible and not muted by translucency.
	let lineFadeOpacity = $derived.by(() => {
		if (!animation || animation.animatingLineIds.size === 0) return 1;
		const t = animation.drawProgress;
		if (t >= 0.4) return 1;
		return easeInOut(t / 0.4);
	});
	// Line stroke-width bump : 0 → 3x → 1x. 3x on a 2px default = 6px at apex,
	// matching the visual punch of the point scale bump (1.3x on a 5-8px radius).
	// Overshoot at t=0.5 then settles to normal width.
	let lineStrokeWidthMultiplier = $derived.by(() => {
		if (!animation || animation.animatingLineIds.size === 0) return 1;
		const t = easeInOut(animation.drawProgress);
		if (t <= 0.5) return t * 2 * 3; // 0 → 3
		return 3 - (t - 0.5) * 2 * 2; // 3 → 1.0
	});
	// Line label scale bump : exact same curve as `pointScale` for the points.
	// 0 → 1.3x → 1x. Applied to the label via a `scale()` transform so the text
	// grows in and settles, matching the visual feel of point labels.
	let lineLabelScale = $derived.by(() => {
		if (!animation || animation.animatingLineIds.size === 0) return 1;
		const t = easeInOut(animation.drawProgress);
		if (t <= 0.5) return t * 2 * 1.3; // 0 → 1.3
		return 1.3 - (t - 0.5) * 2 * 0.3; // 1.3 → 1.0
	});
	let animatingLineIdArray = $derived(
		animation ? [...animation.animatingLineIds] : ([] as string[])
	);

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
	let drawStart = $derived(animation?.drawPhaseStart ?? 0);
	let drawEnd = $derived(animation?.drawPhaseEnd ?? 1);
	let pauseStart = $derived(animation?.pausePhaseStart ?? 1);

	// Adjusted draw progress: 0 before draw phase, 0→1 during draw phase, 1 after.
	// Eased for smooth acceleration/deceleration.
	let drawProgress = $derived.by(() => {
		if (!animation) return 0;
		const p = animation.drawProgress;
		if (p < drawStart) return 0;
		if (p >= drawEnd) return 1;
		const drawRange = drawEnd - drawStart;
		if (drawRange <= 0) return p >= drawStart ? 1 : 0;
		const raw = (p - drawStart) / drawRange;
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
				// Shortest path rotation interpolation
				let delta = move.toRotation - move.fromRotation;
				while (delta > 180) delta -= 360;
				while (delta < -180) delta += 360;
				const rot = move.fromRotation + delta * t;
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

	// Compass rotation during draw phase (follows arc/circle trace)
	let compassRotation = $derived.by(() => {
		if (!animation || !animation.autoInstruments.has('compass') || drawProgress <= 0) return 0;
		return compassDrawAngle(animation.animatingIds, figure, drawProgress);
	});

	// Compass raise/lower animation (from v1 engine)
	// Raise phase: moveEnd → drawStart (tilt rotateX 0→-75°, crossfade to CompassRaised)
	// Draw phase: drawStart → drawEnd (CompassRaised rotates with trace)
	// Lower phase: drawEnd → pauseStart (tilt rotateX -75°→0, crossfade back)
	const COMPASS_MAX_TILT = -75;
	const COMPASS_FADE_PORTION = 0.3;

	let compassAnim = $derived.by(() => {
		const defaultResult = { tilt: 0, compassOpacity: 1, raisedOpacity: 0 };

		if (!animation || !animation.autoInstruments.has('compass')) return defaultResult;
		const p = animation.drawProgress;
		if (p <= moveEnd || p >= pauseStart) return defaultResult;

		const raiseRange = drawStart - moveEnd;
		const lowerRange = pauseStart - drawEnd;

		if (raiseRange > 0 && p < drawStart) {
			// Raise phase: tilt only (opening already done during move)
			const rp = (p - moveEnd) / raiseRange;
			const tilt = rp * COMPASS_MAX_TILT;
			const fadeThreshold = 1 - COMPASS_FADE_PORTION;
			let co = 1,
				ro = 0;
			if (rp >= fadeThreshold) {
				const fp = (rp - fadeThreshold) / COMPASS_FADE_PORTION;
				co = 1 - fp;
				ro = fp;
			}
			return { tilt, compassOpacity: co, raisedOpacity: ro };
		}

		if (lowerRange > 0 && p >= drawEnd) {
			// Lower phase
			const lp = (p - drawEnd) / lowerRange;
			const tilt = COMPASS_MAX_TILT * (1 - lp);
			let co = 1,
				ro = 0;
			if (lp <= COMPASS_FADE_PORTION) {
				const fp = lp / COMPASS_FADE_PORTION;
				co = fp;
				ro = 1 - fp;
			}
			return { tilt, compassOpacity: co, raisedOpacity: ro };
		}

		// Draw phase
		return { tilt: COMPASS_MAX_TILT, compassOpacity: 0, raisedOpacity: 1 };
	});

	// Compass opening in pixels — interpolates during the move phase
	let compassOpeningPx = $derived.by(() => {
		if (!animation || !animation.autoInstruments.has('compass')) {
			return (animation?.compassCurRadius ?? 0) * pixelsPerUnit;
		}
		const curPx = animation.compassCurRadius * pixelsPerUnit;
		const prevPx = animation.compassPrevRadius * pixelsPerUnit;
		if (prevPx === 0 || instrumentMoveProgress >= 1) return curPx;
		return prevPx + (curPx - prevPx) * instrumentMoveProgress;
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
		onViewportChange={handleViewportChange}
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
					{#if el && isFreePoint(el)}
						{@const origin = transformer.mathToSvg(0, 0)}
						{@const xMath = geoToNumber(el.position.x)}
						{@const yMath = geoToNumber(el.position.y)}
						{@const xLabel = Number.isInteger(xMath) ? String(xMath) : xMath.toFixed(2)}
						{@const yLabel = Number.isInteger(yMath) ? String(yMath) : yMath.toFixed(2)}
						<!-- Projection segments on the axes (only for new freePoints) -->
						{#if Math.abs(yMath) > 1e-9}
							<line
								x1={pt.cx}
								y1={pt.cy}
								x2={pt.cx}
								y2={origin.y}
								stroke="#3b82f6"
								stroke-width="1.5"
								stroke-dasharray="6 4"
								opacity={op}
							/>
							<text
								x={pt.cx}
								y={origin.y + (yMath > 0 ? 16 : -6)}
								fill="#1e40af"
								stroke="white"
								stroke-width="3"
								paint-order="stroke"
								font-size="13"
								font-weight="500"
								font-family="KaTeX_Main, serif"
								text-anchor="middle"
								opacity={op}>{xLabel}</text
							>
						{/if}
						{#if Math.abs(xMath) > 1e-9}
							<line
								x1={pt.cx}
								y1={pt.cy}
								x2={origin.x}
								y2={pt.cy}
								stroke="#3b82f6"
								stroke-width="1.5"
								stroke-dasharray="6 4"
								opacity={op}
							/>
							<text
								x={origin.x + (xMath > 0 ? -8 : 8)}
								y={pt.cy + 4}
								fill="#1e40af"
								stroke="white"
								stroke-width="3"
								paint-order="stroke"
								font-size="13"
								font-weight="500"
								font-family="KaTeX_Main, serif"
								text-anchor={xMath > 0 ? 'end' : 'start'}
								opacity={op}>{yLabel}</text
							>
						{/if}
					{/if}
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

	<!-- Line/ray fade-in overlay — opacity 0 → 1 since lines are infinite and
	     don't admit a progressive trace from a start point. -->
	{#if animation && animation.animatingLineIds.size > 0 && animation.drawProgress < 1}
		<svg
			class="lines-overlay"
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			style="position: absolute; top: 0; left: 0; pointer-events: none;"
		>
			{#each animatingLineIdArray as id (id)}
				{@const el = figure.getElementById(id)}
				{@const sty = el ? resolveStyle(el, figure.defaults) : null}
				{@const seg =
					el?.type === 'line'
						? lineToSVG(id, figure, transformer, { width, height })
						: el?.type === 'ray'
							? rayToSVG(id, figure, transformer, { width, height })
							: null}
				{#if seg && sty}
					<line
						x1={seg.x1}
						y1={seg.y1}
						x2={seg.x2}
						y2={seg.y2}
						stroke={sty.color}
						stroke-width={sty.strokeWidth * lineStrokeWidthMultiplier}
						stroke-dasharray={sty.dash === 'dashed'
							? '8 4'
							: sty.dash === 'dotted'
								? '2 4'
								: undefined}
						opacity={lineFadeOpacity}
					/>
					{#if el?.label}
						{@const t = el.type === 'line' ? 0.9 : 0.5}
						{@const mx = seg.x1 + t * (seg.x2 - seg.x1)}
						{@const my = seg.y1 + t * (seg.y2 - seg.y1)}
						{@const ldx = seg.x2 - seg.x1}
						{@const ldy = seg.y2 - seg.y1}
						{@const llen = Math.sqrt(ldx * ldx + ldy * ldy) || 1}
						{@const nx = -ldy / llen}
						{@const ny = ldx / llen}
						{@const sign = ny > 0 ? -1 : 1}
						{@const offset = 10 + 5 * Math.abs(nx)}
						{@const lx = mx + (el.labelOffset?.dx ?? sign * nx * offset)}
						{@const ly = my + (el.labelOffset?.dy ?? sign * ny * offset)}
						<g transform="translate({lx}, {ly}) scale({lineLabelScale})">
							<text
								x={0}
								y={0}
								fill={sty.color}
								stroke="white"
								stroke-width="3"
								paint-order="stroke"
								opacity={lineFadeOpacity}>{el.label}</text
							>
						</g>
					{/if}
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
						<Ruler x={0} y={0} rotation={0} scale={state.scale} {pixelsPerUnit} visible={true} />
					</g>
				{:else if state.type === 'compass'}
					{@const cpos = instrumentPositions['compass']}
					{@const ca = compassAnim}
					<g
						transform="translate({cpos?.x ?? 0}, {cpos?.y ?? 0}) rotate({(cpos?.rotation ?? 0) +
							compassRotation})"
						style="perspective: 800px;"
					>
						{#if ca.compassOpacity > 0}
							<g
								opacity={ca.compassOpacity * state.opacity}
								style:transform="rotateX({ca.tilt}deg)"
								style:transform-origin="0 0"
								style:transform-style="preserve-3d"
							>
								<Compass
									x={0}
									y={0}
									rotation={0}
									opening={compassOpeningPx}
									scale={state.scale}
									visible={true}
								/>
							</g>
						{/if}
						{#if ca.raisedOpacity > 0}
							<g opacity={ca.raisedOpacity * state.opacity}>
								<CompassRaised
									x={0}
									y={0}
									rotation={0}
									opening={compassOpeningPx}
									scale={state.scale}
									visible={true}
								/>
							</g>
						{/if}
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
						<SetSquare
							x={0}
							y={0}
							rotation={0}
							scale={state.scale}
							{pixelsPerUnit}
							visible={true}
						/>
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
