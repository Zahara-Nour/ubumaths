<script lang="ts">
	/**
	 * PageRenderer - Read-only rendering of a whiteboard Page
	 *
	 * Renders a complete Page without any interactivity.
	 * Used for slide presentations where the whiteboard content should be displayed
	 * but not edited.
	 *
	 * @module whiteboard/components/PageRenderer
	 */

	import { onMount } from 'svelte';
	import rough from 'roughjs';
	import type { RoughSVG } from 'roughjs/bin/svg';
	import type { Options as RoughOptions } from 'roughjs/bin/core';
	import { smoothStroke, getToolOptions, pointsToSvgPath } from '../core/stroke-smoothing';
	import { getPolygonVertices, getStarVertices } from '../core/shapes';
	import {
		buildElbowPathWithRoundedCorners,
		ELBOW_ARROW_CORNER_RADIUS
	} from '../core/rough-renderer';
	import { getAngleOnCurvedPath } from '../core/curved-path';
	import {
		getAdaptiveCornerRadius,
		getArrowPoints,
		getStartArrowhead,
		getEndArrowhead,
		type Page,
		type StrokeElement,
		type ShapeElement,
		type ArrowElement,
		type TextBlockElement,
		type ImageElement,
		type BackgroundStyle,
		type FillMode,
		type Arrowhead
	} from '../types/document';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** The page to render */
		page: Page;
		/** Scale factor for display */
		scale?: number;
		/** Additional CSS class */
		class?: string;
	}

	let { page, scale = 1, class: className = '' }: Props = $props();

	// ==========================================================================
	// Local State
	// ==========================================================================

	let svgRef: SVGSVGElement | null = $state(null);
	let roughShapesGroup: SVGGElement | null = $state(null);
	let mounted = $state(false);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let pageWidth = $derived(page?.width ?? 794);
	let pageHeight = $derived(page?.height ?? 1123);
	let elements = $derived(page?.elements ?? []);
	let background = $derived(page?.background);

	let strokeElements = $derived(elements.filter((el): el is StrokeElement => el.type === 'stroke'));
	let shapeElements = $derived(elements.filter((el): el is ShapeElement => el.type === 'shape'));
	let textBlockElements = $derived(
		elements.filter((el): el is TextBlockElement => el.type === 'textblock')
	);
	let imageElements = $derived(elements.filter((el): el is ImageElement => el.type === 'image'));

	let viewBox = $derived(`0 0 ${pageWidth} ${pageHeight}`);

	// ==========================================================================
	// Background Rendering
	// ==========================================================================

	function getBackgroundPatternId(style: BackgroundStyle): string {
		return `bg-pattern-${style}`;
	}

	function renderBackgroundPattern(style: BackgroundStyle, color: string): string {
		const spacing = background?.type === 'plain' ? (background.gridSpacing ?? 20) : 20;
		const opacity = background?.type === 'plain' ? (background.gridOpacity ?? 0.3) : 0.3;
		const lineColor = color === '#ffffff' ? '#cccccc' : color;

		switch (style) {
			case 'grid':
				return `
					<pattern id="${getBackgroundPatternId(style)}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
						<path d="M ${spacing} 0 L 0 0 0 ${spacing}" fill="none" stroke="${lineColor}" stroke-width="0.5" opacity="${opacity}"/>
					</pattern>
				`;
			case 'ruled':
				return `
					<pattern id="${getBackgroundPatternId(style)}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
						<line x1="0" y1="${spacing}" x2="${spacing}" y2="${spacing}" stroke="${lineColor}" stroke-width="0.5" opacity="${opacity}"/>
					</pattern>
				`;
			case 'dotted':
				return `
					<pattern id="${getBackgroundPatternId(style)}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
						<circle cx="${spacing / 2}" cy="${spacing / 2}" r="1" fill="${lineColor}" opacity="${opacity}"/>
					</pattern>
				`;
			default:
				return '';
		}
	}

	// ==========================================================================
	// Stroke Rendering
	// ==========================================================================

	function renderStroke(stroke: StrokeElement): string {
		if (stroke.points.length < 2) return '';
		const options = getToolOptions(stroke.toolType, stroke.width, stroke.color, stroke.opacity);
		const outline = smoothStroke([...stroke.points], options);
		return pointsToSvgPath(outline);
	}

	function getStrokeStyle(stroke: StrokeElement): string {
		const baseOpacity = stroke.opacity;
		if (stroke.toolType === 'highlighter') {
			return `fill: ${stroke.color}; opacity: ${baseOpacity}; mix-blend-mode: multiply;`;
		}
		return `fill: ${stroke.color}; opacity: ${baseOpacity};`;
	}

	// ==========================================================================
	// Roughjs Shape Rendering
	// ==========================================================================

	function mapFillStyle(fillMode: FillMode | undefined): string | undefined {
		switch (fillMode) {
			case 'none':
				return undefined;
			case 'solid':
				return 'solid';
			case 'hatched':
				return 'hachure';
			case 'hachure':
				return 'hachure';
			case 'crosshatch':
				return 'cross-hatch';
			case 'zigzag':
				return 'zigzag';
			default:
				return undefined;
		}
	}

	function getOrCreateSeed(seed: number | undefined, shapeId: string): number {
		if (seed !== undefined) return seed;
		let hash = 0;
		for (let i = 0; i < shapeId.length; i++) {
			const char = shapeId.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}
		return Math.abs(hash);
	}

	function getStrokeLineDash(
		strokeStyle: string | undefined,
		strokeWidth: number
	): number[] | undefined {
		switch (strokeStyle) {
			case 'dashed':
				return [8, 8 + strokeWidth];
			case 'dotted':
				return [1.5, 6 + strokeWidth];
			default:
				return undefined;
		}
	}

	function createRoughOptions(shape: ShapeElement, seed: number, roughness: number): RoughOptions {
		const hasFill = shape.fillMode && shape.fillMode !== 'none' && shape.fill;
		const strokeLineDash = getStrokeLineDash(shape.strokeStyle, shape.strokeWidth);
		const isNonSolid = shape.strokeStyle === 'dashed' || shape.strokeStyle === 'dotted';
		const effectiveStrokeWidth = isNonSolid ? shape.strokeWidth + 0.5 : shape.strokeWidth;

		return {
			seed,
			roughness,
			stroke: shape.color,
			strokeWidth: effectiveStrokeWidth,
			strokeLineDash,
			disableMultiStroke: isNonSolid,
			fill: hasFill ? shape.fill : undefined,
			fillStyle: hasFill ? mapFillStyle(shape.fillMode) : undefined,
			fillWeight: shape.strokeWidth * 0.5,
			hachureAngle: 45,
			hachureGap: shape.strokeWidth * 4
		};
	}

	function renderRoughRectangle(
		rc: RoughSVG,
		shape: ShapeElement,
		options: RoughOptions
	): SVGGElement {
		const x = Math.min(shape.start.x, shape.end.x);
		const y = Math.min(shape.start.y, shape.end.y);
		const w = Math.abs(shape.end.x - shape.start.x);
		const h = Math.abs(shape.end.y - shape.start.y);

		const hasRoundedCorners = (shape.cornerRadius ?? 0) > 0;
		const adaptiveRadius = getAdaptiveCornerRadius(w, h, hasRoundedCorners);

		if (adaptiveRadius > 0) {
			const maxRadius = Math.min(w, h) / 2;
			const radius = Math.min(adaptiveRadius, maxRadius);
			const path = `
				M ${x + radius} ${y}
				L ${x + w - radius} ${y}
				Q ${x + w} ${y}, ${x + w} ${y + radius}
				L ${x + w} ${y + h - radius}
				Q ${x + w} ${y + h}, ${x + w - radius} ${y + h}
				L ${x + radius} ${y + h}
				Q ${x} ${y + h}, ${x} ${y + h - radius}
				L ${x} ${y + radius}
				Q ${x} ${y}, ${x + radius} ${y}
			`;
			return rc.path(path, { ...options, preserveVertices: true });
		}

		return rc.rectangle(x, y, w, h, options);
	}

	function renderRoughEllipse(
		rc: RoughSVG,
		shape: ShapeElement,
		options: RoughOptions
	): SVGGElement {
		const cx = (shape.start.x + shape.end.x) / 2;
		const cy = (shape.start.y + shape.end.y) / 2;
		const w = Math.abs(shape.end.x - shape.start.x);
		const h = Math.abs(shape.end.y - shape.start.y);
		return rc.ellipse(cx, cy, w, h, options);
	}

	function renderRoughLine(rc: RoughSVG, shape: ShapeElement, options: RoughOptions): SVGGElement {
		return rc.line(shape.start.x, shape.start.y, shape.end.x, shape.end.y, options);
	}

	const ARROWHEAD_SIZE = 25;
	const ARROWHEAD_ANGLE_DEG = 20;
	const ARROWHEAD_ANGLE_RAD = (ARROWHEAD_ANGLE_DEG * Math.PI) / 180;

	function renderArrowhead(
		rc: RoughSVG,
		tipX: number,
		tipY: number,
		dx: number,
		dy: number,
		arrowheadType: Arrowhead | null,
		options: RoughOptions
	): SVGGElement | null {
		if (!arrowheadType || arrowheadType === 'none') return null;

		const arrowheadOptions: RoughOptions = {
			...options,
			fill: undefined,
			fillStyle: undefined,
			strokeLineDash: undefined,
			roughness: Math.min(1, options.roughness ?? 0)
		};

		const angle = Math.atan2(dy, dx);
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

		if (arrowheadType === 'arrow') {
			const x3 = tipX - ARROWHEAD_SIZE * Math.cos(angle - ARROWHEAD_ANGLE_RAD);
			const y3 = tipY - ARROWHEAD_SIZE * Math.sin(angle - ARROWHEAD_ANGLE_RAD);
			const x4 = tipX - ARROWHEAD_SIZE * Math.cos(angle + ARROWHEAD_ANGLE_RAD);
			const y4 = tipY - ARROWHEAD_SIZE * Math.sin(angle + ARROWHEAD_ANGLE_RAD);
			g.appendChild(rc.line(x3, y3, tipX, tipY, arrowheadOptions));
			g.appendChild(rc.line(x4, y4, tipX, tipY, arrowheadOptions));
		} else if (arrowheadType === 'triangle') {
			const x3 = tipX - ARROWHEAD_SIZE * Math.cos(angle - ARROWHEAD_ANGLE_RAD);
			const y3 = tipY - ARROWHEAD_SIZE * Math.sin(angle - ARROWHEAD_ANGLE_RAD);
			const x4 = tipX - ARROWHEAD_SIZE * Math.cos(angle + ARROWHEAD_ANGLE_RAD);
			const y4 = tipY - ARROWHEAD_SIZE * Math.sin(angle + ARROWHEAD_ANGLE_RAD);
			g.appendChild(
				rc.polygon(
					[
						[tipX, tipY],
						[x3, y3],
						[x4, y4]
					],
					{
						...arrowheadOptions,
						fill: options.stroke,
						fillStyle: 'solid'
					}
				)
			);
		} else if (arrowheadType === 'circle') {
			const circleRadius = ARROWHEAD_SIZE * 0.35;
			const cx = tipX - circleRadius * Math.cos(angle);
			const cy = tipY - circleRadius * Math.sin(angle);
			g.appendChild(
				rc.circle(cx, cy, circleRadius * 2, {
					...arrowheadOptions,
					fill: options.stroke,
					fillStyle: 'solid'
				})
			);
		} else if (arrowheadType === 'bar') {
			const barLength = ARROWHEAD_SIZE * 0.6;
			const perpAngle = angle + Math.PI / 2;
			const x1 = tipX + barLength * Math.cos(perpAngle);
			const y1 = tipY + barLength * Math.sin(perpAngle);
			const x2 = tipX - barLength * Math.cos(perpAngle);
			const y2 = tipY - barLength * Math.sin(perpAngle);
			g.appendChild(rc.line(x1, y1, x2, y2, arrowheadOptions));
		} else if (arrowheadType === 'diamond') {
			const diamondSize = ARROWHEAD_SIZE * 0.5;
			const cx = tipX - diamondSize * Math.cos(angle);
			const cy = tipY - diamondSize * Math.sin(angle);
			const perpAngle = angle + Math.PI / 2;
			const points: [number, number][] = [
				[tipX, tipY],
				[
					cx + diamondSize * 0.5 * Math.cos(perpAngle),
					cy + diamondSize * 0.5 * Math.sin(perpAngle)
				],
				[cx - diamondSize * Math.cos(angle), cy - diamondSize * Math.sin(angle)],
				[cx - diamondSize * 0.5 * Math.cos(perpAngle), cy - diamondSize * 0.5 * Math.sin(perpAngle)]
			];
			g.appendChild(
				rc.polygon(points, {
					...arrowheadOptions,
					fill: options.stroke,
					fillStyle: 'solid'
				})
			);
		}

		return g;
	}

	function renderRoughArrow(rc: RoughSVG, shape: ShapeElement, options: RoughOptions): SVGGElement {
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		const arrowShape = shape as ArrowElement;
		const effectiveArrowType = arrowShape.arrowType ?? (arrowShape.elbowed ? 'elbow' : 'sharp');
		const startArrowhead = getStartArrowhead(arrowShape);
		const endArrowhead = getEndArrowhead(arrowShape);
		const points = getArrowPoints(arrowShape);

		if (effectiveArrowType === 'curved') {
			const curvePoints: [number, number][] = points.map((p) => [p.x, p.y]);
			const curveOptions: RoughOptions = { ...options, preserveVertices: true };
			g.appendChild(rc.curve(curvePoints, curveOptions));

			if (startArrowhead && points.length >= 2) {
				const dx = points[0].x - points[1].x;
				const dy = points[0].y - points[1].y;
				const head = renderArrowhead(rc, points[0].x, points[0].y, dx, dy, startArrowhead, options);
				if (head) g.appendChild(head);
			}

			if (endArrowhead && points.length >= 2) {
				const waypoints = arrowShape.waypoints ?? [];
				const endAngle = getAngleOnCurvedPath(shape.start, shape.end, waypoints, 1);
				const angleRad = (endAngle * Math.PI) / 180;
				const dx = Math.cos(angleRad);
				const dy = Math.sin(angleRad);
				const endPoint = points[points.length - 1];
				const head = renderArrowhead(rc, endPoint.x, endPoint.y, dx, dy, endArrowhead, options);
				if (head) g.appendChild(head);
			}
		} else if (effectiveArrowType === 'elbow') {
			if (points.length >= 2) {
				const cornerRadius = shape.cornerRadius ?? ELBOW_ARROW_CORNER_RADIUS;
				let pathPoints: { x: number; y: number }[];

				if (points.length === 2) {
					const direction = arrowShape.elbowDirection ?? 'horizontal-first';
					const elbowX = direction === 'horizontal-first' ? shape.end.x : shape.start.x;
					const elbowY = direction === 'horizontal-first' ? shape.start.y : shape.end.y;
					pathPoints = [shape.start, { x: elbowX, y: elbowY }, shape.end];
				} else {
					pathPoints = [...points];
				}

				const pathString = buildElbowPathWithRoundedCorners(pathPoints, cornerRadius);
				g.appendChild(rc.path(pathString, { ...options, preserveVertices: true }));

				if (startArrowhead && pathPoints.length >= 2) {
					const dx = pathPoints[0].x - pathPoints[1].x;
					const dy = pathPoints[0].y - pathPoints[1].y;
					const head = renderArrowhead(
						rc,
						pathPoints[0].x,
						pathPoints[0].y,
						dx,
						dy,
						startArrowhead,
						options
					);
					if (head) g.appendChild(head);
				}

				if (endArrowhead && pathPoints.length >= 2) {
					const lastIdx = pathPoints.length - 1;
					const dx = pathPoints[lastIdx].x - pathPoints[lastIdx - 1].x;
					const dy = pathPoints[lastIdx].y - pathPoints[lastIdx - 1].y;
					const head = renderArrowhead(
						rc,
						pathPoints[lastIdx].x,
						pathPoints[lastIdx].y,
						dx,
						dy,
						endArrowhead,
						options
					);
					if (head) g.appendChild(head);
				}
			}
		} else {
			g.appendChild(rc.line(shape.start.x, shape.start.y, shape.end.x, shape.end.y, options));

			if (startArrowhead) {
				const dx = shape.start.x - shape.end.x;
				const dy = shape.start.y - shape.end.y;
				const head = renderArrowhead(
					rc,
					shape.start.x,
					shape.start.y,
					dx,
					dy,
					startArrowhead,
					options
				);
				if (head) g.appendChild(head);
			}

			if (endArrowhead) {
				const dx = shape.end.x - shape.start.x;
				const dy = shape.end.y - shape.start.y;
				const head = renderArrowhead(rc, shape.end.x, shape.end.y, dx, dy, endArrowhead, options);
				if (head) g.appendChild(head);
			}
		}

		return g;
	}

	function renderRoughPolygon(
		rc: RoughSVG,
		shape: ShapeElement,
		options: RoughOptions
	): SVGGElement {
		const cx = (shape.start.x + shape.end.x) / 2;
		const cy = (shape.start.y + shape.end.y) / 2;
		const rx = Math.abs(shape.end.x - shape.start.x) / 2;
		const ry = Math.abs(shape.end.y - shape.start.y) / 2;

		let vertices: Array<{ x: number; y: number }>;

		switch (shape.shapeType) {
			case 'pentagon':
				vertices = getPolygonVertices(cx, cy, rx, ry, 5);
				break;
			case 'hexagon':
				vertices = getPolygonVertices(cx, cy, rx, ry, 6);
				break;
			case 'star':
				vertices = getStarVertices(cx, cy, rx, ry, 0.4);
				break;
			default:
				return rc.line(shape.start.x, shape.start.y, shape.end.x, shape.end.y, options);
		}

		const points = vertices.map((p) => [p.x, p.y] as [number, number]);
		return rc.polygon(points, options);
	}

	function renderRoughShape(svg: SVGSVGElement, shape: ShapeElement): SVGGElement {
		const rc = rough.svg(svg);
		const seed = getOrCreateSeed(shape.roughSeed, shape.id);
		const roughness = shape.roughness ?? 1;
		const options = createRoughOptions(shape, seed, roughness);

		let element: SVGGElement;

		switch (shape.shapeType) {
			case 'rectangle':
				element = renderRoughRectangle(rc, shape, options);
				break;
			case 'circle':
				element = renderRoughEllipse(rc, shape, options);
				break;
			case 'line':
				element = renderRoughLine(rc, shape, options);
				break;
			case 'arrow':
				element = renderRoughArrow(rc, shape, options);
				break;
			case 'pentagon':
			case 'hexagon':
			case 'star':
				element = renderRoughPolygon(rc, shape, options);
				break;
			default:
				element = renderRoughLine(rc, shape, options);
		}

		if (shape.opacity !== undefined && shape.opacity < 1) {
			element.setAttribute('opacity', String(shape.opacity));
		}

		if (shape.rotation && shape.rotation !== 0) {
			const cx = (shape.start.x + shape.end.x) / 2;
			const cy = (shape.start.y + shape.end.y) / 2;
			element.setAttribute('transform', `rotate(${shape.rotation} ${cx} ${cy})`);
		}

		return element;
	}

	// ==========================================================================
	// Roughjs Rendering Effect
	// ==========================================================================

	$effect(() => {
		if (!roughShapesGroup || !svgRef || !mounted) return;

		roughShapesGroup.innerHTML = '';

		for (const shape of shapeElements) {
			const element = renderRoughShape(svgRef, shape);
			roughShapesGroup.appendChild(element);
		}
	});

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		mounted = true;
	});
</script>

<svg
	bind:this={svgRef}
	class="page-renderer {className}"
	{viewBox}
	width={pageWidth * scale}
	height={pageHeight * scale}
	role="img"
	aria-label="Whiteboard page content"
>
	<!-- Background -->
	{#if background}
		{#if background.type === 'plain'}
			<!-- Background color -->
			<rect x="0" y="0" width={pageWidth} height={pageHeight} fill={background.color} />
			<!-- Background pattern if not plain style -->
			{#if background.style !== 'plain'}
				{@html renderBackgroundPattern(background.style, background.color)}
				<rect
					x="0"
					y="0"
					width={pageWidth}
					height={pageHeight}
					fill="url(#{getBackgroundPatternId(background.style)})"
				/>
			{/if}
		{:else if background.type === 'image'}
			<image
				href={background.src}
				x="0"
				y="0"
				width={pageWidth}
				height={pageHeight}
				preserveAspectRatio="xMidYMid slice"
			/>
		{/if}
	{:else}
		<!-- Default white background -->
		<rect x="0" y="0" width={pageWidth} height={pageHeight} fill="#ffffff" />
	{/if}

	<!-- Images layer (below strokes and shapes) -->
	{#each imageElements as img (img.id)}
		{@const rotation = img.rotation ?? 0}
		{@const cx = img.position.x + img.width / 2}
		{@const cy = img.position.y + img.height / 2}
		<image
			href={img.src}
			x={img.position.x}
			y={img.position.y}
			width={img.width}
			height={img.height}
			preserveAspectRatio="none"
			transform={rotation !== 0 ? `rotate(${rotation}, ${cx}, ${cy})` : undefined}
		/>
	{/each}

	<!-- Strokes layer -->
	<g class="layer-strokes">
		{#each strokeElements as stroke (stroke.id)}
			{@const rotation = stroke.rotation ?? 0}
			{@const path = renderStroke(stroke)}
			{#if path}
				{@const points = stroke.points}
				{@const minX = Math.min(...points.map((p) => p.x))}
				{@const maxX = Math.max(...points.map((p) => p.x))}
				{@const minY = Math.min(...points.map((p) => p.y))}
				{@const maxY = Math.max(...points.map((p) => p.y))}
				{@const cx = (minX + maxX) / 2}
				{@const cy = (minY + maxY) / 2}
				<path
					d={path}
					style={getStrokeStyle(stroke)}
					stroke="none"
					transform={rotation !== 0 ? `rotate(${rotation}, ${cx}, ${cy})` : undefined}
				/>
			{/if}
		{/each}
	</g>

	<!-- Shapes layer (roughjs rendered) -->
	<g bind:this={roughShapesGroup} class="layer-shapes"></g>

	<!-- Text blocks layer -->
	{#each textBlockElements as textBlock (textBlock.id)}
		<foreignObject
			x={textBlock.position.x}
			y={textBlock.position.y}
			width={textBlock.width}
			height={textBlock.height}
		>
			<div
				class="text-block-content"
				style="font-family: {textBlock.fontFamily ?? 'inherit'}; width: 100%; height: 100%;"
			>
				{textBlock.markdownContent}
			</div>
		</foreignObject>
	{/each}
</svg>

<style>
	.page-renderer {
		pointer-events: none;
		user-select: none;
		display: block;
	}

	.text-block-content {
		padding: 4px;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow: hidden;
	}
</style>
