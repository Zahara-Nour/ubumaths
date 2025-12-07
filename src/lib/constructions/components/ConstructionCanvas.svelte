<script lang="ts">
	/**
	 * ConstructionCanvas - SVG canvas for geometric construction display
	 *
	 * Renders geometric objects and instruments from the construction engine
	 * onto an SVG canvas with optional grid display.
	 *
	 * Uses detailed instrument components ported from InstrumenPoche.
	 */

	import type { ConstructionEngine } from '../core/engine.svelte';
	import type { ObjectState, PointStep, LineStep, TextStep, CircleStep } from '../types';
	import {
		segmentToSvgLine,
		circleToSvgPath,
		partialSegmentPath,
		partialArcPath,
		arrowheadPath,
		calculateAngle
	} from '../core/renderer';
	import {
		DEFAULT_GRID_SPACING,
		DEFAULT_COLORS,
		DEFAULT_POINT_RADIUS,
		DEFAULT_LINE_WIDTH,
		DEFAULT_ANGLE_MARK_RADIUS
	} from '../constants';

	// Detailed instrument components ported from InstrumenPoche
	import { Compass, CompassRaised, Ruler, SetSquare, Protractor, Pencil } from './instruments';

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
		const progress = obj.drawProgress ?? 1;

		switch (obj.type) {
			case 'point': {
				// Points are rendered as circles/markers, not paths
				return '';
			}

			case 'line': {
				const computed = obj.computed;
				if (!computed?.fromX || !computed?.fromY || !computed?.toX || !computed?.toY) return '';

				if (progress < 1) {
					return partialSegmentPath(
						computed.fromX,
						computed.fromY,
						computed.toX,
						computed.toY,
						progress
					);
				}
				return segmentToSvgLine(computed.fromX, computed.fromY, computed.toX, computed.toY);
			}

			case 'circle': {
				const computed = obj.computed;
				if (!computed?.centerX || !computed?.centerY || !computed?.radius) return '';

				if (progress < 1) {
					return partialArcPath(
						computed.centerX,
						computed.centerY,
						computed.radius,
						0,
						360 * progress,
						1
					);
				}
				return circleToSvgPath(computed.centerX, computed.centerY, computed.radius);
			}

			case 'arc': {
				const computed = obj.computed;
				if (!computed?.centerX || !computed?.centerY || !computed?.radius) return '';

				const startAngle = computed.startAngle ?? 0;
				const endAngle = computed.endAngle ?? 90;

				// Always use partialArcPath for consistency (handles progress=1 correctly)
				return partialArcPath(
					computed.centerX,
					computed.centerY,
					computed.radius,
					startAngle,
					endAngle,
					progress
				);
			}

			case 'mark': {
				// Angle marks are rendered as arcs
				const computed = obj.computed;
				if (!computed?.centerX || !computed?.centerY) return '';

				const radius = computed.radius ?? DEFAULT_ANGLE_MARK_RADIUS;
				const startAngle = computed.startAngle ?? 0;
				const endAngle = computed.endAngle ?? 90;

				return partialArcPath(computed.centerX, computed.centerY, radius, startAngle, endAngle, 1);
			}

			case 'text':
			default:
				return '';
		}
	}

	/**
	 * Get stroke color for an object
	 */
	function getObjectColor(obj: ObjectState): string {
		return obj.style?.color ?? DEFAULT_COLORS.primary;
	}

	/**
	 * Get line width for an object
	 */
	function getObjectLineWidth(obj: ObjectState): number {
		return obj.style?.lineWidth ?? DEFAULT_LINE_WIDTH;
	}

	/**
	 * Get stroke dash array for line style
	 */
	function getStrokeDashArray(obj: ObjectState): string | undefined {
		const lineStyle = obj.style?.lineStyle ?? 'solid';
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
		return obj.type === 'point';
	}

	/**
	 * Check if object is a line with arrowhead
	 */
	function isLineWithArrowhead(obj: ObjectState): boolean {
		if (obj.type !== 'line') return false;
		const step = obj.step as LineStep;
		return !!step.arrow;
	}

	/**
	 * Get arrowhead paths for a line
	 */
	function getArrowheadPaths(obj: ObjectState): { endArrow?: string; startArrow?: string } {
		if (obj.type !== 'line') return {};
		const step = obj.step as LineStep;
		if (!step.arrow) return {};

		const computed = obj.computed;
		if (!computed?.fromX || !computed?.fromY || !computed?.toX || !computed?.toY) return {};

		const progress = obj.drawProgress ?? 1;
		if (progress <= 0) return {};

		const angle = calculateAngle(computed.fromX, computed.fromY, computed.toX, computed.toY);
		const lineWidth = obj.style?.lineWidth ?? DEFAULT_LINE_WIDTH;
		const arrowSize = lineWidth * 5 + 5;

		const result: { endArrow?: string; startArrow?: string } = {};

		// End arrowhead (at current progress position)
		if (step.arrow === 'end' || step.arrow === 'both') {
			const currentX = computed.fromX + (computed.toX - computed.fromX) * progress;
			const currentY = computed.fromY + (computed.toY - computed.fromY) * progress;
			result.endArrow = arrowheadPath(currentX, currentY, angle, arrowSize);
		}

		// Start arrowhead (at from position, pointing backward)
		if (step.arrow === 'start' || step.arrow === 'both') {
			result.startArrow = arrowheadPath(computed.fromX, computed.fromY, angle + Math.PI, arrowSize);
		}

		return result;
	}

	/**
	 * Check if object is a filled shape
	 */
	function isFilledObject(obj: ObjectState): boolean {
		if (obj.type === 'circle') {
			const step = obj.step as CircleStep;
			return step.filled ?? false;
		}
		return false;
	}

	/**
	 * Get fill color for a filled object
	 */
	function getFillColor(obj: ObjectState): string | undefined {
		if (obj.type === 'circle') {
			const step = obj.step as CircleStep;
			return step.fillColor;
		}
		return undefined;
	}

	/**
	 * Check if object is text
	 */
	function isTextObject(obj: ObjectState): boolean {
		return obj.type === 'text';
	}
</script>

<svg
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	class="construction-canvas rounded-lg border border-border"
	role="img"
	aria-label="Construction geometrique"
>
	<!-- White background -->
	<rect x="0" y="0" {width} {height} fill="white" />

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
		{#each visibleObjects.filter(isFilledObject) as obj (obj.id)}
			{@const path = getObjectPath(obj)}
			{#if path}
				<path
					d={path}
					fill={getFillColor(obj) ?? getObjectColor(obj)}
					fill-opacity="0.2"
					stroke={getObjectColor(obj)}
					stroke-width={getObjectLineWidth(obj)}
					stroke-dasharray={getStrokeDashArray(obj)}
					opacity={obj.style?.opacity ?? 1}
				/>
			{/if}
		{/each}
	</g>

	<!-- Objects layer - strokes -->
	<g class="objects-layer-strokes">
		{#each visibleObjects.filter((o) => !isPointObject(o) && !isFilledObject(o) && !isTextObject(o)) as obj (obj.id)}
			{@const path = getObjectPath(obj)}
			{@const arrows = isLineWithArrowhead(obj) ? getArrowheadPaths(obj) : {}}
			{#if path}
				<!-- Main path -->
				<path
					d={path}
					fill="none"
					stroke={getObjectColor(obj)}
					stroke-width={getObjectLineWidth(obj)}
					stroke-dasharray={getStrokeDashArray(obj)}
					opacity={obj.style?.opacity ?? 1}
				/>
				<!-- End arrowhead -->
				{#if arrows.endArrow}
					<path
						d={arrows.endArrow}
						fill="none"
						stroke={getObjectColor(obj)}
						stroke-width={getObjectLineWidth(obj)}
						opacity={obj.style?.opacity ?? 1}
					/>
				{/if}
				<!-- Start arrowhead -->
				{#if arrows.startArrow}
					<path
						d={arrows.startArrow}
						fill="none"
						stroke={getObjectColor(obj)}
						stroke-width={getObjectLineWidth(obj)}
						opacity={obj.style?.opacity ?? 1}
					/>
				{/if}
			{/if}
		{/each}
	</g>

	<!-- Objects layer - points -->
	<g class="objects-layer-points">
		{#each visibleObjects.filter(isPointObject) as obj (obj.id)}
			{@const pos = obj.position}
			{@const pointStep = obj.step as PointStep}
			{#if pos}
				{@const pointStyle = pointStep.style ?? 'dot'}
				{@const radius = pointStep.radius ?? DEFAULT_POINT_RADIUS}
				{@const color = getObjectColor(obj)}

				{#if pointStyle === 'dot'}
					<circle cx={pos.x} cy={pos.y} r={radius} fill={color} opacity={obj.style?.opacity ?? 1} />
				{:else if pointStyle === 'circle'}
					<circle
						cx={pos.x}
						cy={pos.y}
						r={radius}
						fill="none"
						stroke={color}
						stroke-width="2"
						opacity={obj.style?.opacity ?? 1}
					/>
				{:else if pointStyle === 'cross'}
					<path
						d="M {pos.x - radius} {pos.y} L {pos.x + radius} {pos.y} M {pos.x} {pos.y -
							radius} L {pos.x} {pos.y + radius}"
						fill="none"
						stroke={color}
						stroke-width="2"
						opacity={obj.style?.opacity ?? 1}
					/>
				{/if}

				<!-- Point label -->
				{#if obj.label}
					<text
						x={pos.x + radius + 4}
						y={pos.y - radius - 4}
						fill={DEFAULT_COLORS.text}
						font-size="14"
						font-family="system-ui, -apple-system, sans-serif"
					>
						{obj.label}
					</text>
				{/if}
			{/if}
		{/each}
	</g>

	<!-- Text objects layer -->
	<g class="objects-layer-text">
		{#each visibleObjects.filter(isTextObject) as obj (obj.id)}
			{@const textStep = obj.step as TextStep}
			{@const pos = obj.position}
			{#if pos}
				<text
					x={pos.x}
					y={pos.y}
					fill={obj.style?.color ?? DEFAULT_COLORS.text}
					font-size={textStep.size ?? 14}
					font-family="system-ui, -apple-system, sans-serif"
					text-anchor={textStep.anchor ?? 'start'}
					dominant-baseline={textStep.baseline === 'top'
						? 'hanging'
						: textStep.baseline === 'bottom'
							? 'alphabetic'
							: 'middle'}
					opacity={obj.style?.opacity ?? 1}
				>
					{textStep.content}
				</text>
			{/if}
		{/each}
	</g>

	<!-- Instruments layer - Using detailed components ported from InstrumenPoche -->
	<g class="instruments-layer" style="perspective: 800px;">
		{#each visibleInstruments as instrument (instrument.type)}
			{@const opacity = instrument.opacity ?? 1}
			<g style:opacity>
				{#if instrument.type === 'ruler'}
					<Ruler
						x={instrument.x}
						y={instrument.y}
						rotation={instrument.rotation}
						scale={instrument.scale}
						visible={instrument.visible}
					/>
				{:else if instrument.type === 'compass'}
					<!-- 3D wrapper for raise/lower animation -->
					<g
						style:transform="rotateX({instrument.rotateX ?? 0}deg)"
						style:transform-origin="{instrument.x}px {instrument.y}px"
						style:transform-style="preserve-3d"
					>
						<Compass
							x={instrument.x}
							y={instrument.y}
							rotation={instrument.rotation}
							opening={instrument.compassRadius ?? 0}
							scale={instrument.scale}
							visible={instrument.visible}
						/>
					</g>
				{:else if instrument.type === 'compassRaised'}
					<CompassRaised
						x={instrument.x}
						y={instrument.y}
						rotation={instrument.rotation}
						opening={instrument.compassRadius ?? 0}
						scale={instrument.scale}
						visible={instrument.visible}
					/>
				{:else if instrument.type === 'protractor'}
					<Protractor
						x={instrument.x}
						y={instrument.y}
						rotation={instrument.rotation}
						scale={instrument.scale}
						visible={instrument.visible}
					/>
				{:else if instrument.type === 'setSquare'}
					<SetSquare
						x={instrument.x}
						y={instrument.y}
						rotation={instrument.rotation}
						scale={instrument.scale}
						visible={instrument.visible}
					/>
				{:else if instrument.type === 'pencil'}
					<Pencil
						x={instrument.x}
						y={instrument.y}
						rotation={instrument.rotation}
						scale={instrument.scale}
						visible={instrument.visible}
					/>
				{/if}
			</g>
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
