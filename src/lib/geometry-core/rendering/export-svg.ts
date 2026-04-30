/**
 * Export a Figure to a standalone SVG string.
 *
 * Produces a static SVG without interactive handlers or Svelte attributes.
 * Suitable for embedding in documents, saving to file, or converting to PNG.
 */

import type { Figure } from '../graph/figure';
import type { Viewport } from '../viewport/types';
import { createTransformer } from '../viewport/viewport';
import { isPointElement, isVector } from '../types/elements';
import { geoToNumber } from '../compute/to-number';
import {
	resolveStyle,
	pointToSVG,
	segmentToSVG,
	lineToSVG,
	rayToSVG,
	vectorToSVG,
	circleToSVG,
	arcToSVG,
	sectorToSVG,
	annulusToSVG,
	angleMarkToSVG,
	segmentMarkToSVG,
	textToSVG
} from './svg-primitives';
import { computeGridStep } from '../viewport/grid';
import rough from 'roughjs';
import type { RoughSVG } from 'roughjs/bin/svg';
import {
	shouldRenderRough,
	seedFromId,
	styleToRoughOptions,
	roughLine,
	roughCircle,
	roughArc,
	roughPolygon,
	roughAngleMark,
	roughSegmentMark,
	roughVectorHTML
} from './rough-geometry';

export interface SVGExportOptions {
	width?: number;
	height?: number;
	showGrid?: boolean;
	showAxes?: boolean;
	showLabels?: boolean;
	showMeasures?: boolean;
	/** Rendering mode for export: 'normal' (clean), 'rough' (hand-drawn), 'mixed' (per-element). */
	renderMode?: 'normal' | 'rough' | 'mixed';
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

	const renderMode = options?.renderMode ?? 'normal';

	const transformer = createTransformer(viewport, width, height);
	const dims = { width, height };
	const elements = figure.getAllElements();
	const lines: string[] = [];

	// Create rough.js instance if needed (requires DOM — client-side only)
	let rc: RoughSVG | null = null;
	if (renderMode !== 'normal' && typeof document !== 'undefined') {
		const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		rc = rough.svg(tempSvg);
	}

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
		const nX = Math.round((viewport.xMax - startX) / major);
		for (let i = 0; i <= nX; i++) {
			const x = startX + i * major;
			const sv = transformer.mathToSvg(x, 0);
			lines.push(
				`    <line x1="${r(sv.x)}" y1="0" x2="${r(sv.x)}" y2="${height}" stroke="#d1d5db" stroke-width="0.5" />`
			);
		}
		const nY = Math.round((viewport.yMax - startY) / major);
		for (let i = 0; i <= nY; i++) {
			const y = startY + i * major;
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

	// Helper: get rough options for an element
	function roughOpts(elId: string, sty: ReturnType<typeof resolveStyle>) {
		return styleToRoughOptions(sty, seedFromId(elId, sty.roughSeed), sty.roughness);
	}

	// Helper: check if element should render rough
	function useRough(sty: ReturnType<typeof resolveStyle>, elType: string): boolean {
		return rc !== null && shouldRenderRough(sty.render, elType, renderMode);
	}

	// Helper: wrap rough SVGGElement outerHTML with opacity
	function roughHTML(el: SVGGElement, opacity: number): string {
		if (opacity < 1) return `  <g opacity="${opacity}">${el.outerHTML}</g>`;
		return `  ${el.outerHTML}`;
	}

	// Pass 1: segments, lines, rays
	for (const el of elements) {
		if (!el.visible) continue;
		const sty = resolveStyle(el, figure.defaults);

		if (el.type === 'segment') {
			const svg = segmentToSVG(el.id, figure, transformer);
			if (!svg) continue;
			if (useRough(sty, el.type)) {
				lines.push(roughHTML(roughLine(rc!, svg, roughOpts(el.id, sty)), sty.opacity));
			} else {
				const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
				const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
				lines.push(
					`  <line x1="${r(svg.x1)}" y1="${r(svg.y1)}" x2="${r(svg.x2)}" y2="${r(svg.y2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} />`
				);
			}
		} else if (el.type === 'line') {
			const svg = lineToSVG(el.id, figure, transformer, dims);
			if (!svg) continue;
			if (useRough(sty, el.type)) {
				lines.push(roughHTML(roughLine(rc!, svg, roughOpts(el.id, sty)), sty.opacity));
			} else {
				const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
				const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
				lines.push(
					`  <line x1="${r(svg.x1)}" y1="${r(svg.y1)}" x2="${r(svg.x2)}" y2="${r(svg.y2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} />`
				);
			}
		} else if (el.type === 'ray') {
			const svg = rayToSVG(el.id, figure, transformer, dims);
			if (!svg) continue;
			if (useRough(sty, el.type)) {
				lines.push(roughHTML(roughLine(rc!, svg, roughOpts(el.id, sty)), sty.opacity));
			} else {
				const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
				const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
				lines.push(
					`  <line x1="${r(svg.x1)}" y1="${r(svg.y1)}" x2="${r(svg.x2)}" y2="${r(svg.y2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} />`
				);
			}
		} else if (isVector(el)) {
			const svg = vectorToSVG(el.id, figure, transformer);
			if (!svg) continue;
			if (useRough(sty, el.type)) {
				lines.push(roughVectorHTML(rc!, svg, roughOpts(el.id, sty), sty.color));
			} else {
				const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
				const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
				lines.push(
					`  <line x1="${r(svg.x1)}" y1="${r(svg.y1)}" x2="${r(svg.shaftX2)}" y2="${r(svg.shaftY2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} />`
				);
				lines.push(`  <polygon points="${svg.arrowPoints}" fill="${sty.color}"${opacityAttr} />`);
			}
		}
	}

	// Pass 2: circles
	for (const el of elements) {
		if (!el.visible) continue;
		if (
			el.type !== 'circleByRadius' &&
			el.type !== 'circleByPoint' &&
			el.type !== 'circleBy3Points'
		)
			continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = circleToSVG(el.id, figure, transformer);
		if (!svg) continue;
		if (useRough(sty, el.type)) {
			lines.push(roughHTML(roughCircle(rc!, svg, roughOpts(el.id, sty)), sty.opacity));
		} else {
			const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
			const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
			const fillAttr = sty.fillColor
				? `fill="${sty.fillColor}" fill-opacity="${sty.fillOpacity}"`
				: 'fill="none"';
			lines.push(
				`  <circle cx="${r(svg.cx)}" cy="${r(svg.cy)}" r="${r(svg.r)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} ${fillAttr} />`
			);
		}
	}

	// Pass 2a: arcs
	for (const el of elements) {
		if (!el.visible) continue;
		if (el.type !== 'arcByAngles' && el.type !== 'arcByPoints') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = arcToSVG(el.id, figure, transformer);
		if (!svg) continue;
		if (useRough(sty, el.type)) {
			lines.push(roughHTML(roughArc(rc!, svg.path, roughOpts(el.id, sty)), sty.opacity));
		} else {
			const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
			const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
			lines.push(
				`  <path d="${svg.path}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} fill="none" />`
			);
		}
	}

	// Pass 2b: polygons
	for (const el of elements) {
		if (!el.visible || el.type !== 'polygon') continue;
		const sty = resolveStyle(el, figure.defaults);
		const verts = el.dependsOn.map((id) => figure.getPosition(id));
		if (verts.some((p) => !p)) continue;
		if (useRough(sty, el.type)) {
			const points: [number, number][] = verts.map((p) => {
				const sv = transformer.mathToSvg(geoToNumber(p!.x), geoToNumber(p!.y));
				return [sv.x, sv.y];
			});
			lines.push(roughHTML(roughPolygon(rc!, points, roughOpts(el.id, sty)), sty.opacity));
		} else {
			const pts = verts
				.map((p) => {
					const sv = transformer.mathToSvg(geoToNumber(p!.x), geoToNumber(p!.y));
					return `${r(sv.x)},${r(sv.y)}`;
				})
				.join(' ');
			const dashAttr = sty.dashArray ? ` stroke-dasharray="${sty.dashArray}"` : '';
			const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
			const fillAttr = sty.fillColor
				? `fill="${sty.fillColor}" fill-opacity="${sty.fillOpacity}"`
				: 'fill="none"';
			lines.push(
				`  <polygon points="${pts}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${dashAttr}${opacityAttr} ${fillAttr} />`
			);
		}
	}

	// Pass 2c: sectors
	for (const el of elements) {
		if (!el.visible) continue;
		if (el.type !== 'sectorByPoints' && el.type !== 'sectorByAngles') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = sectorToSVG(el.id, figure, transformer);
		if (!svg) continue;
		const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
		const fillColor = sty.fillColor ?? sty.color;
		const fillOpacity = sty.fillOpacity ?? 0.3;
		lines.push(
			`  <path d="${svg.path}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${opacityAttr} fill="${fillColor}" fill-opacity="${fillOpacity}" />`
		);
	}

	// Pass 2d: annuli
	for (const el of elements) {
		if (!el.visible || el.type !== 'annulus') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = annulusToSVG(el.id, figure, transformer);
		if (!svg) continue;
		const opacityAttr = sty.opacity < 1 ? ` opacity="${sty.opacity}"` : '';
		const fillColor = sty.fillColor ?? sty.color;
		const fillOpacity = sty.fillOpacity ?? 0.3;
		lines.push(
			`  <path d="${svg.path}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}"${opacityAttr} fill="${fillColor}" fill-opacity="${fillOpacity}" fill-rule="evenodd" />`
		);
	}

	// Pass 3: angle marks
	for (const el of elements) {
		if (!el.visible || el.type !== 'angleMark') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = angleMarkToSVG(el.id, figure, transformer);
		if (!svg) continue;
		if (useRough(sty, el.type)) {
			lines.push(roughHTML(roughAngleMark(rc!, svg, roughOpts(el.id, sty)), sty.opacity));
		} else {
			for (const path of svg.paths) {
				lines.push(
					`  <path d="${path}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}" fill="none" />`
				);
			}
		}
	}

	// Pass 4: segment marks
	for (const el of elements) {
		if (!el.visible || el.type !== 'segmentMark') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = segmentMarkToSVG(el.id, figure, transformer);
		if (!svg) continue;
		if (useRough(sty, el.type)) {
			lines.push(roughHTML(roughSegmentMark(rc!, svg, roughOpts(el.id, sty)), sty.opacity));
		} else {
			for (const tick of svg.ticks) {
				lines.push(
					`  <line x1="${r(tick.x1)}" y1="${r(tick.y1)}" x2="${r(tick.x2)}" y2="${r(tick.y2)}" stroke="${sty.color}" stroke-width="${sty.strokeWidth}" />`
				);
			}
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
				`  <text x="${r(lx)}" y="${r(ly)}" fill="${sty.color}" stroke="white" stroke-width="3" paint-order="stroke" font-size="14" font-family="KaTeX_Main, serif">${escapeXml(el.label)}</text>`
			);
		}
	}

	// Pass 6: text elements
	if (showMeasures) {
		for (const el of elements) {
			if (!el.visible || (el.type !== 'text' && el.type !== 'mathText' && el.type !== 'richText'))
				continue;
			const svg = textToSVG(el.id, figure, transformer);
			if (!svg) continue;
			const sty = resolveStyle(el, figure.defaults);
			lines.push(
				`  <rect x="${r(svg.x - 4)}" y="${r(svg.y - 12)}" width="${svg.text.length * 8 + 8}" height="16" rx="3" fill="white" fill-opacity="0.85" />`
			);
			lines.push(
				`  <text x="${r(svg.x)}" y="${r(svg.y)}" fill="${sty.color}" font-size="12" font-family="KaTeX_Main, serif">${escapeXml(svg.text)}</text>`
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

/** Escape XML special characters for text content. */
function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
