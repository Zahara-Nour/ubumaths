<script lang="ts">
	/**
	 * ConstructionCanvas - SVG canvas for geometric construction display
	 *
	 * Renders geometric objects and instruments from the construction engine
	 * onto an SVG canvas with optional grid display.
	 */

	import type { ConstructionEngine } from '../core/engine.svelte';
	import type { ObjectState, PointDef } from '../types';
	import {
		segmentToSvgLine,
		circleToSvgPath,
		arcToSvgPath,
		polygonToSvgPath,
		partialSegmentPath,
		partialArcPath
	} from '../core/renderer';
	import {
		DEFAULT_GRID_SPACING,
		DEFAULT_COLORS,
		DEFAULT_POINT_RADIUS,
		DEFAULT_LINE_WIDTH,
		DEFAULT_ANGLE_MARK_RADIUS
	} from '../constants';

	// Types
	interface Props {
		engine: ConstructionEngine;
		width?: number;
		height?: number;
		showGrid?: boolean;
		gridSpacing?: number;
		gridColor?: string;
	}

	// Props
	let {
		engine,
		width = 800,
		height = 600,
		showGrid = true,
		gridSpacing = DEFAULT_GRID_SPACING,
		gridColor = DEFAULT_COLORS.grid
	}: Props = $props();

	// Derived state from engine
	let visibleObjects = $derived(engine.visibleObjects);
	let visibleInstruments = $derived(engine.instrumentsList.filter((i) => i.visible));

	// Grid lines generation
	let gridLines = $derived.by(() => {
		if (!showGrid) return { vertical: [], horizontal: [] };

		const vertical: number[] = [];
		const horizontal: number[] = [];

		for (let x = gridSpacing; x < width; x += gridSpacing) {
			vertical.push(x);
		}
		for (let y = gridSpacing; y < height; y += gridSpacing) {
			horizontal.push(y);
		}

		return { vertical, horizontal };
	});

	/**
	 * Get SVG path data for an object
	 */
	function getObjectPath(obj: ObjectState): string {
		const def = obj.def;
		const progress = obj.drawProgress ?? 1;

		switch (def.kind) {
			case 'point': {
				// Points are rendered as circles/markers, not paths
				return '';
			}

			case 'segment': {
				const from = resolvePoint(def.from);
				const to = resolvePoint(def.to);
				if (!from || !to) return '';

				if (progress < 1) {
					return partialSegmentPath(from.x, from.y, to.x, to.y, progress);
				}
				return segmentToSvgLine(from.x, from.y, to.x, to.y);
			}

			case 'circle': {
				const center = resolvePoint(def.center);
				if (!center) return '';

				const radius = typeof def.radius === 'number' ? def.radius : 100;
				if (progress < 1) {
					return partialArcPath(center.x, center.y, radius, 0, 360 * progress, 1);
				}
				return circleToSvgPath(center.x, center.y, radius);
			}

			case 'arc': {
				const center = resolvePoint(def.center);
				if (!center) return '';

				const radius = typeof def.radius === 'number' ? def.radius : 100;
				const startAngle = typeof def.startAngle === 'number' ? def.startAngle : 0;
				const endAngle = typeof def.endAngle === 'number' ? def.endAngle : 90;
				return arcToSvgPath(center.x, center.y, radius, startAngle, endAngle);
			}

			case 'polygon': {
				const points = def.vertices.map(resolvePoint).filter(Boolean) as { x: number; y: number }[];
				if (points.length < 2) return '';
				return polygonToSvgPath(points, true);
			}

			case 'line':
			case 'ray': {
				// For infinite lines and rays, we need to extend to canvas boundaries
				// This is a simplified implementation
				return '';
			}

			case 'angleMark': {
				const vertex = resolvePoint(def.vertex);
				const p1 = resolvePoint(def.point1);
				const p2 = resolvePoint(def.point2);
				if (!vertex || !p1 || !p2) return '';

				const radius = def.radius ?? DEFAULT_ANGLE_MARK_RADIUS;

				// Calculate angles
				const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x) * (180 / Math.PI);
				const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x) * (180 / Math.PI);

				return arcToSvgPath(vertex.x, vertex.y, radius, angle1, angle2);
			}

			default:
				return '';
		}
	}

	/**
	 * Resolve a point reference to coordinates
	 */
	function resolvePoint(
		ref: string | { x: number | string; y: number | string } | undefined
	): { x: number; y: number } | null {
		if (!ref) return null;

		if (typeof ref === 'string') {
			const objState = engine.getObject(ref);
			if (!objState?.position) return null;
			return objState.position;
		}

		// Inline coordinates - need to handle expression evaluation
		const x = typeof ref.x === 'number' ? ref.x : 0;
		const y = typeof ref.y === 'number' ? ref.y : 0;
		return { x, y };
	}

	/**
	 * Get stroke color for an object
	 */
	function getObjectColor(obj: ObjectState): string {
		return obj.style?.color ?? obj.def.style?.color ?? DEFAULT_COLORS.primary;
	}

	/**
	 * Get line width for an object
	 */
	function getObjectLineWidth(obj: ObjectState): number {
		return obj.style?.lineWidth ?? obj.def.style?.lineWidth ?? DEFAULT_LINE_WIDTH;
	}

	/**
	 * Get stroke dash array for line style
	 */
	function getStrokeDashArray(obj: ObjectState): string | undefined {
		const lineStyle = obj.style?.lineStyle ?? obj.def.style?.lineStyle ?? 'solid';
		switch (lineStyle) {
			case 'dashed':
				return '8,4';
			case 'dotted':
				return '2,4';
			default:
				return undefined;
		}
	}

	/**
	 * Check if object is a point
	 */
	function isPointObject(obj: ObjectState): boolean {
		return obj.def.kind === 'point';
	}

	/**
	 * Check if object is a filled shape
	 */
	function isFilledObject(obj: ObjectState): boolean {
		const def = obj.def;
		if (def.kind === 'polygon' && 'filled' in def) {
			return def.filled ?? false;
		}
		if (def.kind === 'circle' && 'filled' in def) {
			return def.filled ?? false;
		}
		return false;
	}

	/**
	 * Get fill color for a filled object
	 */
	function getFillColor(obj: ObjectState): string | undefined {
		const def = obj.def;
		if (def.kind === 'polygon' && 'fillColor' in def) {
			return def.fillColor;
		}
		if (def.kind === 'circle' && 'fillColor' in def) {
			return def.fillColor;
		}
		return undefined;
	}
</script>

<svg
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	class="construction-canvas rounded-lg border border-border bg-background"
	role="img"
	aria-label="Construction geometrique"
>
	<!-- Grid layer -->
	{#if showGrid}
		<g class="grid-layer" aria-hidden="true">
			{#each gridLines.vertical as x (x)}
				<line
					x1={x}
					y1="0"
					x2={x}
					y2={height}
					stroke={gridColor}
					stroke-width="0.5"
					opacity="0.5"
				/>
			{/each}
			{#each gridLines.horizontal as y (y)}
				<line x1="0" y1={y} x2={width} y2={y} stroke={gridColor} stroke-width="0.5" opacity="0.5" />
			{/each}
		</g>
	{/if}

	<!-- Objects layer - filled shapes first -->
	<g class="objects-layer-fills">
		{#each visibleObjects.filter(isFilledObject) as obj (obj.def.id)}
			{@const path = getObjectPath(obj)}
			{#if path}
				<path
					d={path}
					fill={getFillColor(obj) ?? getObjectColor(obj)}
					fill-opacity="0.2"
					stroke={getObjectColor(obj)}
					stroke-width={getObjectLineWidth(obj)}
					stroke-dasharray={getStrokeDashArray(obj)}
					opacity={obj.style?.opacity ?? obj.def.style?.opacity ?? 1}
				/>
			{/if}
		{/each}
	</g>

	<!-- Objects layer - strokes -->
	<g class="objects-layer-strokes">
		{#each visibleObjects.filter((o) => !isPointObject(o) && !isFilledObject(o)) as obj (obj.def.id)}
			{@const path = getObjectPath(obj)}
			{#if path}
				<path
					d={path}
					fill="none"
					stroke={getObjectColor(obj)}
					stroke-width={getObjectLineWidth(obj)}
					stroke-dasharray={getStrokeDashArray(obj)}
					opacity={obj.style?.opacity ?? obj.def.style?.opacity ?? 1}
				/>
			{/if}
		{/each}
	</g>

	<!-- Objects layer - points -->
	<g class="objects-layer-points">
		{#each visibleObjects.filter(isPointObject) as obj (obj.def.id)}
			{@const pos = obj.position}
			{@const pointDef = obj.def as PointDef}
			{#if pos}
				{@const pointStyle = pointDef.pointStyle ?? 'dot'}
				{@const radius = pointDef.radius ?? DEFAULT_POINT_RADIUS}
				{@const color = getObjectColor(obj)}

				{#if pointStyle === 'dot'}
					<circle
						cx={pos.x}
						cy={pos.y}
						r={radius}
						fill={color}
						opacity={obj.style?.opacity ?? obj.def.style?.opacity ?? 1}
					/>
				{:else if pointStyle === 'circle'}
					<circle
						cx={pos.x}
						cy={pos.y}
						r={radius}
						fill="none"
						stroke={color}
						stroke-width="2"
						opacity={obj.style?.opacity ?? obj.def.style?.opacity ?? 1}
					/>
				{:else if pointStyle === 'cross'}
					<path
						d="M {pos.x - radius} {pos.y} L {pos.x + radius} {pos.y} M {pos.x} {pos.y -
							radius} L {pos.x} {pos.y + radius}"
						fill="none"
						stroke={color}
						stroke-width="2"
						opacity={obj.style?.opacity ?? obj.def.style?.opacity ?? 1}
					/>
				{/if}

				<!-- Point label -->
				{#if pointDef.label}
					<text
						x={pos.x + radius + 4}
						y={pos.y - radius - 4}
						fill={DEFAULT_COLORS.text}
						font-size="14"
						font-family="system-ui, -apple-system, sans-serif"
					>
						{pointDef.label}
					</text>
				{/if}
			{/if}
		{/each}
	</g>

	<!-- Text objects layer -->
	<g class="objects-layer-text">
		{#each visibleObjects.filter((o) => o.def.kind === 'text') as obj (obj.def.id)}
			{@const def = obj.def}
			{#if def.kind === 'text'}
				{@const x = typeof def.x === 'number' ? def.x : 0}
				{@const y = typeof def.y === 'number' ? def.y : 0}
				<text
					{x}
					{y}
					fill={obj.style?.color ?? def.style?.color ?? DEFAULT_COLORS.text}
					font-size={def.fontSize ?? 14}
					font-family="system-ui, -apple-system, sans-serif"
					text-anchor={def.anchor ?? 'start'}
					dominant-baseline={def.baseline === 'top'
						? 'hanging'
						: def.baseline === 'bottom'
							? 'alphabetic'
							: 'middle'}
					opacity={obj.style?.opacity ?? def.style?.opacity ?? 1}
				>
					{def.content}
				</text>
			{/if}
		{/each}
	</g>

	<!-- Instruments layer -->
	<g class="instruments-layer">
		{#each visibleInstruments as instrument (instrument.type)}
			<!-- Ruler -->
			{#if instrument.type === 'ruler'}
				<g
					transform="translate({instrument.x}, {instrument.y}) rotate({instrument.rotation})"
					opacity="0.8"
				>
					<rect
						x="0"
						y="-20"
						width="500"
						height="40"
						fill="rgba(200, 200, 200, 0.8)"
						stroke={DEFAULT_COLORS.instrument}
						stroke-width="1"
						rx="2"
					/>
					<!-- Ruler markings -->
					{#each Array(51) as _, i (i)}
						<line
							x1={i * 10}
							y1="-20"
							x2={i * 10}
							y2={i % 5 === 0 ? -10 : -15}
							stroke={DEFAULT_COLORS.text}
							stroke-width="1"
						/>
						{#if i % 5 === 0}
							<text
								x={i * 10}
								y="-2"
								fill={DEFAULT_COLORS.text}
								font-size="10"
								text-anchor="middle"
							>
								{i}
							</text>
						{/if}
					{/each}
				</g>
			{/if}

			<!-- Compass -->
			{#if instrument.type === 'compass'}
				<g
					transform="translate({instrument.x}, {instrument.y}) rotate({instrument.rotation})"
					opacity="0.9"
				>
					<!-- Compass arms -->
					<line
						x1="0"
						y1="0"
						x2={-(instrument.compassRadius ?? 100) * 0.4}
						y2={(instrument.compassRadius ?? 100) * 0.8}
						stroke={DEFAULT_COLORS.instrument}
						stroke-width="3"
						stroke-linecap="round"
					/>
					<line
						x1="0"
						y1="0"
						x2={(instrument.compassRadius ?? 100) * 0.4}
						y2={(instrument.compassRadius ?? 100) * 0.8}
						stroke={DEFAULT_COLORS.instrument}
						stroke-width="3"
						stroke-linecap="round"
					/>
					<!-- Compass point -->
					<circle
						cx={-(instrument.compassRadius ?? 100) * 0.4}
						cy={(instrument.compassRadius ?? 100) * 0.8}
						r="3"
						fill={DEFAULT_COLORS.instrument}
					/>
					<!-- Compass pencil -->
					<circle
						cx={(instrument.compassRadius ?? 100) * 0.4}
						cy={(instrument.compassRadius ?? 100) * 0.8}
						r="4"
						fill={DEFAULT_COLORS.primary}
					/>
					<!-- Compass hinge -->
					<circle cx="0" cy="0" r="6" fill={DEFAULT_COLORS.instrument} />
				</g>
			{/if}

			<!-- Protractor -->
			{#if instrument.type === 'protractor'}
				<g
					transform="translate({instrument.x}, {instrument.y}) rotate({instrument.rotation})"
					opacity="0.8"
				>
					<!-- Semicircle -->
					<path
						d="M -150 0 A 150 150 0 0 1 150 0 L -150 0"
						fill="rgba(200, 200, 200, 0.6)"
						stroke={DEFAULT_COLORS.instrument}
						stroke-width="1"
					/>
					<!-- Center point -->
					<circle cx="0" cy="0" r="3" fill={DEFAULT_COLORS.instrument} />
					<!-- Angle markings would go here -->
				</g>
			{/if}

			<!-- Set Square -->
			{#if instrument.type === 'setSquare'}
				<g
					transform="translate({instrument.x}, {instrument.y}) rotate({instrument.rotation})"
					opacity="0.8"
				>
					<path
						d="M 0 0 L 200 0 L 0 -200 Z"
						fill="rgba(200, 200, 200, 0.6)"
						stroke={DEFAULT_COLORS.instrument}
						stroke-width="1"
					/>
				</g>
			{/if}
		{/each}
	</g>
</svg>

<style>
	.construction-canvas {
		display: block;
		max-width: 100%;
		height: auto;
	}
</style>
