/**
 * Export a Figure to a standalone SVG string.
 *
 * Produces a static SVG without interactive handlers or Svelte attributes.
 * Suitable for embedding in documents, saving to file, or converting to PNG.
 */

import type { Figure } from '../graph/figure';
import type { Viewport } from '../viewport/types';
import { createTransformer } from '../viewport/viewport';
import { isPointElement } from '../types/elements';
import { geoToNumber } from '../compute/to-number';
import {
	resolveStyle,
	pointToSVG,
	segmentToSVG,
	lineToSVG,
	rayToSVG,
	circleToSVG,
	angleMarkToSVG,
	segmentMarkToSVG,
	measureToSVG
} from './svg-primitives';
import { computeGridStep } from '../viewport/grid';

export interface SVGExportOptions {
	width?: number;
	height?: number;
	showGrid?: boolean;
	showAxes?: boolean;
	showLabels?: boolean;
	showMeasures?: boolean;
}

export function exportToSVG(
	figure: Figure,
	viewport: Viewport,
	options?: SVGExportOptions
): string {
	const width = options?.width ?? 800;
	const height = options?.height ?? 600;
	const showGrid = options?.showGrid ?? false;
	const showAxes = options?.showAxes ?? false;
	const showLabels = options?.showLabels ?? true;
	const showMeasures = options?.showMeasures ?? true;

	const transformer = createTransformer(viewport, width, height);
	const dims = { width, height };
	const elements = figure.getAllElements();
	const lines: string[] = [];

	// SVG header
	lines.push(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
	);

	// Background
	lines.push(`  <rect width="${width}" height="${height}" fill="white" />`);

	// Grid
	if (showGrid) {
		const { major } = computeGridStep(width / (viewport.xMax - viewport.xMin));
		lines.push('  <g class="grid">');
		const startX = Math.ceil(viewport.xMin / major) * major;
		const startY = Math.ceil(viewport.yMin / major) * major;
		for (let x = startX; x <= viewport.xMax; x += major) {
			const sv = transformer.mathToSvg(x, 0);
			lines.push(
				`    <line x1="${r(sv.x)}" y1="0" x2="${r(sv.x)}" y2="${height}" stroke="#d1d5db" stroke-width="0.5" />`
			);
		}
		for (let y = startY; y <= viewport.yMax; y += major) {
			const sv = transformer.mathToSvg(0, y);
			lines.push(
				`    <line x1="0" y1="${r(sv.y)}" x2="${width}" y2="${r(sv.y)}" stroke="#d1d5db" stroke-width="0.5" />`
			);
		}
		lines.push('  </g>');
	}

	// Axes
	if (showAxes) {
		const ox = transformer.mathToSvg(0, 0);
		lines.push(
			`  <line x1="0" y1="${r(ox.y)}" x2="${width}" y2="${r(ox.y)}" stroke="#6b7280" stroke-width="1.5" class="axis" />`
		);
		lines.push(
			`  <line x1="${r(ox.x)}" y1="0" x2="${r(ox.x)}" y2="${height}" stroke="#6b7280" stroke-width="1.5" class="axis" />`
		);
	}

	// Pass 1: segments, lines, rays
	for (const el of elements) {
		if (!el.visible) continue;
		const sty = resolveStyle(el, figure.defaults);
		const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
		const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';

		if (el.type === 'segment') {
			const svg = segmentToSVG(el.id, figure, transformer);
			if (!svg) continue;
			lines.push(
				`  <line x1="${r(svg.x1)}" y1="${r(svg.y1)}" x2="${r(svg.x2)}" y2="${r(svg.y2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} />`
			);
		} else if (el.type === 'line') {
			const svg = lineToSVG(el.id, figure, transformer, dims);
			if (!svg) continue;
			lines.push(
				`  <line x1="${r(svg.x1)}" y1="${r(svg.y1)}" x2="${r(svg.x2)}" y2="${r(svg.y2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} />`
			);
		} else if (el.type === 'ray') {
			const svg = rayToSVG(el.id, figure, transformer, dims);
			if (!svg) continue;
			lines.push(
				`  <line x1="${r(svg.x1)}" y1="${r(svg.y1)}" x2="${r(svg.x2)}" y2="${r(svg.y2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} />`
			);
		}
	}

	// Pass 2: circles
	for (const el of elements) {
		if (!el.visible) continue;
		if (el.type !== 'circleByRadius' && el.type !== 'circleByPoint') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = circleToSVG(el.id, figure, transformer);
		if (!svg) continue;
		const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
		const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
		const fillAttr = sty.fillColor
			? `fill="${sty.fillColor}" fill-opacity="${sty.fillOpacity}"`
			: 'fill="none"';
		lines.push(
			`  <circle cx="${r(svg.cx)}" cy="${r(svg.cy)}" r="${r(svg.r)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} ${fillAttr} />`
		);
	}

	// Pass 2b: polygons
	for (const el of elements) {
		if (!el.visible || el.type !== 'polygon') continue;
		const sty = resolveStyle(el, figure.defaults);
		const verts = el.dependsOn.map((id) => figure.getPosition(id));
		if (verts.some((p) => !p)) continue;
		const pts = verts
			.map((p) => {
				const sv = transformer.mathToSvg(geoToNumber(p!.x), geoToNumber(p!.y));
				return `${r(sv.x)},${r(sv.y)}`;
			})
			.join(' ');
		const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
		const fillAttr = sty.fillColor
			? `fill="${sty.fillColor}" fill-opacity="${sty.fillOpacity}"`
			: 'fill="none"';
		lines.push(
			`  <polygon points="${pts}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr} ${fillAttr} />`
		);
	}

	// Pass 3: angle marks
	for (const el of elements) {
		if (!el.visible || el.type !== 'angleMark') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = angleMarkToSVG(el.id, figure, transformer);
		if (!svg) continue;
		for (const path of svg.paths) {
			lines.push(
				`  <path d="${path}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}" fill="none" />`
			);
		}
	}

	// Pass 4: segment marks
	for (const el of elements) {
		if (!el.visible || el.type !== 'segmentMark') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = segmentMarkToSVG(el.id, figure, transformer);
		if (!svg) continue;
		for (const tick of svg.ticks) {
			lines.push(
				`  <line x1="${r(tick.x1)}" y1="${r(tick.y1)}" x2="${r(tick.x2)}" y2="${r(tick.y2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}" />`
			);
		}
	}

	// Pass 5: points
	for (const el of elements) {
		if (!el.visible || !isPointElement(el)) continue;
		const svg = pointToSVG(el.id, figure, transformer);
		if (!svg) continue;
		const sty = resolveStyle(el, figure.defaults);
		const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';

		if (sty.pointShape === 'dot') {
			lines.push(
				`  <circle cx="${r(svg.cx)}" cy="${r(svg.cy)}" r="${sty.pointSize}" fill="${sty.color}"${opacityAttr} />`
			);
		} else if (sty.pointShape === 'circle') {
			lines.push(
				`  <circle cx="${r(svg.cx)}" cy="${r(svg.cy)}" r="${sty.pointSize}" fill="none" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${opacityAttr} />`
			);
		} else if (sty.pointShape === 'cross') {
			const s = sty.pointSize;
			lines.push(
				`  <line x1="${r(svg.cx - s)}" y1="${r(svg.cy - s)}" x2="${r(svg.cx + s)}" y2="${r(svg.cy + s)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${opacityAttr} />`
			);
			lines.push(
				`  <line x1="${r(svg.cx + s)}" y1="${r(svg.cy - s)}" x2="${r(svg.cx - s)}" y2="${r(svg.cy + s)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${opacityAttr} />`
			);
		} else if (sty.pointShape === 'square') {
			const s = sty.pointSize;
			lines.push(
				`  <rect x="${r(svg.cx - s)}" y="${r(svg.cy - s)}" width="${s * 2}" height="${s * 2}" fill="${sty.color}"${opacityAttr} />`
			);
		}

		if (showLabels && el.label) {
			const lx = svg.cx + (el.labelOffset?.dx ?? sty.pointSize + 4);
			const ly = svg.cy + (el.labelOffset?.dy ?? -(sty.pointSize + 2));
			lines.push(
				`  <text x="${r(lx)}" y="${r(ly)}" fill="${sty.color}" stroke="white" stroke-width="3" paint-order="stroke" font-size="14" font-family="KaTeX_Main, serif">${el.label}</text>`
			);
		}
	}

	// Pass 6: measures
	if (showMeasures) {
		for (const el of elements) {
			if (!el.visible || el.type !== 'measure') continue;
			const svg = measureToSVG(el.id, figure, transformer);
			if (!svg) continue;
			const sty = resolveStyle(el, figure.defaults);
			// Background
			lines.push(
				`  <rect x="${r(svg.x - 4)}" y="${r(svg.y - 12)}" width="${svg.text.length * 8 + 8}" height="16" rx="3" fill="white" fill-opacity="0.85" />`
			);
			lines.push(
				`  <text x="${r(svg.x)}" y="${r(svg.y)}" fill="${sty.color}" font-size="12" font-family="KaTeX_Main, serif">${svg.text}</text>`
			);
		}
	}

	lines.push('</svg>');
	return lines.join('\n');
}

/** Round to 2 decimal places for SVG output. */
function r(n: number): string {
	return String(Math.round(n * 100) / 100);
}
