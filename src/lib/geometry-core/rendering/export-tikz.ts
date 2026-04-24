/**
 * Export a Figure to TikZ (LaTeX) code.
 *
 * Produces a self-contained \begin{tikzpicture}...\end{tikzpicture} block.
 * Coordinates are in math units (not pixels).
 */

import type { Figure } from '../graph/figure';
import type { Viewport } from '../viewport/types';
import type { GeoElement } from '../types/elements';
import { isPointElement } from '../types/elements';
import { geoToNumber } from '../compute/to-number';
import { resolveStyle } from './svg-primitives';

export interface TikZExportOptions {
	scale?: number;
	showGrid?: boolean;
	showAxes?: boolean;
	showLabels?: boolean;
	showMeasures?: boolean;
}

const MARK_RADIUS = 0.4; // math units for angle arc radius
const MARK_SPACING = 0.12; // spacing between multiple arcs
const RIGHT_ANGLE_SIZE = 0.3; // math units
const TICK_HALF = 0.15; // half-length of segment tick
const TICK_SPACING = 0.08; // spacing between ticks

function coord(x: number, y: number): string {
	const rx = Math.round(x * 1000) / 1000;
	const ry = Math.round(y * 1000) / 1000;
	return `(${rx}, ${ry})`;
}

function hexToTikZColor(hex: string): { name: string; def: string } {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const name = `c${hex.slice(1)}`;
	const def = `\\definecolor{${name}}{RGB}{${r},${g},${b}}`;
	return { name, def };
}

function styleOptions(el: GeoElement, defaults?: Parameters<typeof resolveStyle>[1]): string {
	const sty = resolveStyle(el, defaults);
	const opts: string[] = [];

	const { name } = hexToTikZColor(sty.color);
	opts.push(name);

	if (sty.strokeWidth >= 2.5) opts.push('very thick');
	else if (sty.strokeWidth >= 1.5) opts.push('thick');
	else if (sty.strokeWidth <= 0.5) opts.push('very thin');
	else if (sty.strokeWidth <= 0.8) opts.push('thin');

	if (sty.dash === 'dashed') opts.push('dashed');
	if (sty.dash === 'dotted') opts.push('dotted');

	if (sty.opacity < 1) opts.push(`opacity=${sty.opacity}`);

	return opts.join(', ');
}

export function exportToTikZ(
	figure: Figure,
	viewport: Viewport,
	options?: TikZExportOptions
): string {
	const scale = options?.scale ?? 1;
	const showGrid = options?.showGrid ?? false;
	const showAxes = options?.showAxes ?? false;
	const showLabels = options?.showLabels ?? true;
	const showMeasures = options?.showMeasures ?? true;

	const lines: string[] = [];
	const colorDefs = new Set<string>();
	const elements = figure.getAllElements();

	// Collect all colors used
	for (const el of elements) {
		if (!el.visible) continue;
		const sty = resolveStyle(el, figure.defaults);
		const { def } = hexToTikZColor(sty.color);
		colorDefs.add(def);
	}

	// Header
	const scaleOpt = scale !== 1 ? `[scale=${scale}]` : '';
	lines.push(`\\begin{tikzpicture}${scaleOpt}`);

	// Color definitions
	for (const def of colorDefs) {
		lines.push(`  ${def}`);
	}

	// Grid
	if (showGrid) {
		lines.push(
			`  \\draw[gray!30, very thin, step=1] ${coord(viewport.xMin, viewport.yMin)} grid ${coord(viewport.xMax, viewport.yMax)};`
		);
	}

	// Axes
	if (showAxes) {
		lines.push(`  \\draw[gray, ->] ${coord(viewport.xMin, 0)} -- ${coord(viewport.xMax, 0)};`);
		lines.push(`  \\draw[gray, ->] ${coord(0, viewport.yMin)} -- ${coord(0, viewport.yMax)};`);
	}

	// Render elements by type: lines first, then circles, then marks, then points on top
	// Pass 1: segments, lines, rays
	for (const el of elements) {
		if (!el.visible) continue;
		const opts = styleOptions(el, figure.defaults);

		if (el.type === 'segment') {
			const p1 = figure.getPosition(el.startId);
			const p2 = figure.getPosition(el.endId);
			if (!p1 || !p2) continue;
			const c1 = coord(geoToNumber(p1.x), geoToNumber(p1.y));
			const c2 = coord(geoToNumber(p2.x), geoToNumber(p2.y));
			lines.push(`  \\draw[${opts}] ${c1} -- ${c2};`);
		} else if (el.type === 'line') {
			const p1 = figure.getPosition(el.point1Id);
			const p2 = figure.getPosition(el.point2Id);
			if (!p1 || !p2) continue;
			// Extend to viewport bounds
			const extended = extendLineToViewport(
				geoToNumber(p1.x),
				geoToNumber(p1.y),
				geoToNumber(p2.x),
				geoToNumber(p2.y),
				viewport
			);
			if (!extended) continue;
			lines.push(
				`  \\draw[${opts}] ${coord(extended.x1, extended.y1)} -- ${coord(extended.x2, extended.y2)};`
			);
		} else if (el.type === 'ray') {
			const origin = figure.getPosition(el.originId);
			const through = figure.getPosition(el.throughId);
			if (!origin || !through) continue;
			const ox = geoToNumber(origin.x);
			const oy = geoToNumber(origin.y);
			const ext = extendRayToViewport(
				ox,
				oy,
				geoToNumber(through.x),
				geoToNumber(through.y),
				viewport
			);
			if (!ext) continue;
			lines.push(`  \\draw[${opts}] ${coord(ox, oy)} -- ${coord(ext.x, ext.y)};`);
		}
	}

	// Pass 2: circles
	for (const el of elements) {
		if (!el.visible) continue;
		const opts = styleOptions(el, figure.defaults);

		if (el.type === 'circleByRadius') {
			const center = figure.getPosition(el.centerId);
			if (!center) continue;
			const r = geoToNumber(el.radius);
			lines.push(
				`  \\draw[${opts}] ${coord(geoToNumber(center.x), geoToNumber(center.y))} circle (${Math.round(r * 1000) / 1000});`
			);
		} else if (el.type === 'circleByPoint') {
			const center = figure.getPosition(el.centerId);
			const edge = figure.getPosition(el.edgePointId);
			if (!center || !edge) continue;
			const cx = geoToNumber(center.x);
			const cy = geoToNumber(center.y);
			const dx = geoToNumber(edge.x) - cx;
			const dy = geoToNumber(edge.y) - cy;
			const r = Math.sqrt(dx * dx + dy * dy);
			lines.push(`  \\draw[${opts}] ${coord(cx, cy)} circle (${Math.round(r * 1000) / 1000});`);
		}
	}

	// Pass 2b: polygons
	for (const el of elements) {
		if (!el.visible || el.type !== 'polygon') continue;
		const opts = styleOptions(el, figure.defaults);
		const verts = el.dependsOn.map((id) => figure.getPosition(id));
		if (verts.some((p) => !p)) continue;
		const pts = verts.map((p) => coord(geoToNumber(p!.x), geoToNumber(p!.y)));
		const sty = resolveStyle(el, figure.defaults);
		const fillPart = sty.fillColor
			? `, fill=${hexToTikZColor(sty.fillColor).name}, fill opacity=${sty.fillOpacity}`
			: '';
		lines.push(`  \\draw[${opts}${fillPart}] ${pts.join(' -- ')} -- cycle;`);
	}

	// Pass 3: angle marks
	for (const el of elements) {
		if (!el.visible || el.type !== 'angleMark') continue;
		const p1 = figure.getPosition(el.p1Id);
		const v = figure.getPosition(el.vertexId);
		const p2 = figure.getPosition(el.p2Id);
		if (!p1 || !v || !p2) continue;

		const vx = geoToNumber(v.x);
		const vy = geoToNumber(v.y);
		const d1x = geoToNumber(p1.x) - vx;
		const d1y = geoToNumber(p1.y) - vy;
		const d2x = geoToNumber(p2.x) - vx;
		const d2y = geoToNumber(p2.y) - vy;

		const angle1 = (Math.atan2(d1y, d1x) * 180) / Math.PI;
		const angle2 = (Math.atan2(d2y, d2x) * 180) / Math.PI;

		const { name } = hexToTikZColor(resolveStyle(el, figure.defaults).color);

		if (el.rightAngle) {
			// Right angle square
			const len1 = Math.sqrt(d1x * d1x + d1y * d1y);
			const len2 = Math.sqrt(d2x * d2x + d2y * d2y);
			if (len1 < 1e-10 || len2 < 1e-10) continue;
			const u1x = (d1x / len1) * RIGHT_ANGLE_SIZE;
			const u1y = (d1y / len1) * RIGHT_ANGLE_SIZE;
			const u2x = (d2x / len2) * RIGHT_ANGLE_SIZE;
			const u2y = (d2y / len2) * RIGHT_ANGLE_SIZE;
			lines.push(`  % Right angle at ${coord(vx, vy)}`);
			lines.push(
				`  \\draw[${name}] ${coord(vx + u1x, vy + u1y)} -- ${coord(vx + u1x + u2x, vy + u1y + u2y)} -- ${coord(vx + u2x, vy + u2y)};`
			);
		} else {
			// Arc(s)
			let sweep = angle2 - angle1;
			while (sweep > 180) sweep -= 360;
			while (sweep < -180) sweep += 360;
			const startAngle = Math.round(angle1 * 100) / 100;
			const endAngle = Math.round((angle1 + sweep) * 100) / 100;

			for (let i = 0; i < el.arcCount; i++) {
				const r = MARK_RADIUS + i * MARK_SPACING;
				const startX = vx + r * Math.cos((startAngle * Math.PI) / 180);
				const startY = vy + r * Math.sin((startAngle * Math.PI) / 180);
				lines.push(
					`  \\draw[${name}] ${coord(startX, startY)} arc (${startAngle}:${endAngle}:${Math.round(r * 1000) / 1000});`
				);
			}
		}
	}

	// Pass 4: segment marks
	for (const el of elements) {
		if (!el.visible || el.type !== 'segmentMark') continue;
		const p1 = figure.getPosition(el.startId);
		const p2 = figure.getPosition(el.endId);
		if (!p1 || !p2) continue;

		const x1 = geoToNumber(p1.x);
		const y1 = geoToNumber(p1.y);
		const x2 = geoToNumber(p2.x);
		const y2 = geoToNumber(p2.y);
		const mx = (x1 + x2) / 2;
		const my = (y1 + y2) / 2;

		const dx = x2 - x1;
		const dy = y2 - y1;
		const len = Math.sqrt(dx * dx + dy * dy);
		if (len < 1e-10) continue;
		const ux = dx / len;
		const uy = dy / len;
		const px = -uy;
		const py = ux;

		const { name } = hexToTikZColor(resolveStyle(el, figure.defaults).color);
		const totalWidth = (el.markCount - 1) * TICK_SPACING;
		const startOffset = -totalWidth / 2;

		lines.push(`  % Segment mark`);
		for (let i = 0; i < el.markCount; i++) {
			const offset = startOffset + i * TICK_SPACING;
			const cx = mx + ux * offset;
			const cy = my + uy * offset;
			lines.push(
				`  \\draw[${name}] ${coord(cx + px * TICK_HALF, cy + py * TICK_HALF)} -- ${coord(cx - px * TICK_HALF, cy - py * TICK_HALF)}; % Tick ${i + 1}`
			);
		}
	}

	// Pass 5: points (on top)
	for (const el of elements) {
		if (!el.visible || !isPointElement(el)) continue;
		const pos = figure.getPosition(el.id);
		if (!pos) continue;

		const x = geoToNumber(pos.x);
		const y = geoToNumber(pos.y);
		const sty = resolveStyle(el, figure.defaults);
		const { name } = hexToTikZColor(sty.color);
		const c = coord(x, y);

		const labelPart =
			showLabels && el.label ? ` node[above right, font=\\small] {$${el.label}$}` : '';

		if (sty.pointShape === 'dot') {
			lines.push(`  \\fill[${name}] ${c} circle (2pt)${labelPart};`);
		} else if (sty.pointShape === 'circle') {
			lines.push(`  \\draw[${name}] ${c} circle (2pt)${labelPart};`);
		} else if (sty.pointShape === 'cross') {
			lines.push(`  \\node[${name}, cross out, draw, inner sep=2pt] at ${c} {};`);
			if (showLabels && el.label) {
				lines.push(`  \\node[${name}, above right, font=\\small] at ${c} {$${el.label}$};`);
			}
		} else if (sty.pointShape === 'square') {
			const s = 0.06;
			lines.push(
				`  \\fill[${name}] ${coord(x - s, y - s)} rectangle ${coord(x + s, y + s)}${labelPart};`
			);
		}
	}

	// Pass 6: measures
	if (showMeasures) {
		for (const el of elements) {
			if (!el.visible || el.type !== 'measure') continue;
			const value = figure.getMeasureValue(el.id);
			if (value === undefined) continue;

			const positions = el.targetIds.map((tid) => figure.getPosition(tid));
			if (positions.some((p) => !p)) continue;

			const { name } = hexToTikZColor(resolveStyle(el, figure.defaults).color);

			let text: string;
			if (el.format === 'degrees') {
				text = `${Math.round(value * 10) / 10}^{\\circ}`;
			} else {
				text = `${Math.round(value * 100) / 100}`;
			}

			let mx: number;
			let my: number;

			if (el.measureType === 'distance') {
				const [a, b] = positions;
				mx = (geoToNumber(a!.x) + geoToNumber(b!.x)) / 2;
				my = (geoToNumber(a!.y) + geoToNumber(b!.y)) / 2;
				// Offset perpendicular
				const dx = geoToNumber(b!.x) - geoToNumber(a!.x);
				const dy = geoToNumber(b!.y) - geoToNumber(a!.y);
				const len = Math.sqrt(dx * dx + dy * dy);
				if (len > 1e-10) {
					mx += (-dy / len) * 0.4;
					my += (dx / len) * 0.4;
				}
			} else if (el.measureType === 'angle') {
				const v = positions[1]!;
				mx = geoToNumber(v.x);
				my = geoToNumber(v.y);
				// Offset along bisector
				const d1x = geoToNumber(positions[0]!.x) - mx;
				const d1y = geoToNumber(positions[0]!.y) - my;
				const d2x = geoToNumber(positions[2]!.x) - mx;
				const d2y = geoToNumber(positions[2]!.y) - my;
				const l1 = Math.sqrt(d1x * d1x + d1y * d1y);
				const l2 = Math.sqrt(d2x * d2x + d2y * d2y);
				if (l1 > 1e-10 && l2 > 1e-10) {
					const bx = d1x / l1 + d2x / l2;
					const by = d1y / l1 + d2y / l2;
					const bl = Math.sqrt(bx * bx + by * by);
					if (bl > 1e-10) {
						mx += (bx / bl) * 0.8;
						my += (by / bl) * 0.8;
					}
				}
			} else {
				// Area: centroid
				let sx = 0;
				let sy = 0;
				for (const p of positions) {
					sx += geoToNumber(p!.x);
					sy += geoToNumber(p!.y);
				}
				mx = sx / positions.length;
				my = sy / positions.length;
			}

			lines.push(`  \\node[${name}, font=\\small] at ${coord(mx, my)} {$${text}$};`);
		}
	}

	lines.push('\\end{tikzpicture}');
	return lines.join('\n');
}

// ─── Helpers: clip lines/rays to viewport ───────────────────

function extendLineToViewport(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	vp: Viewport
): { x1: number; y1: number; x2: number; y2: number } | null {
	const dx = x2 - x1;
	const dy = y2 - y1;
	if (Math.abs(dx) < 1e-15 && Math.abs(dy) < 1e-15) return null;

	const tValues: number[] = [];
	if (Math.abs(dx) > 1e-15) {
		tValues.push((vp.xMin - x1) / dx);
		tValues.push((vp.xMax - x1) / dx);
	}
	if (Math.abs(dy) > 1e-15) {
		tValues.push((vp.yMin - y1) / dy);
		tValues.push((vp.yMax - y1) / dy);
	}

	const validTs = tValues.filter((t) => {
		const px = x1 + t * dx;
		const py = y1 + t * dy;
		return (
			px >= vp.xMin - 0.01 && px <= vp.xMax + 0.01 && py >= vp.yMin - 0.01 && py <= vp.yMax + 0.01
		);
	});

	if (validTs.length < 2) return null;
	const tMin = Math.min(...validTs);
	const tMax = Math.max(...validTs);
	return {
		x1: x1 + tMin * dx,
		y1: y1 + tMin * dy,
		x2: x1 + tMax * dx,
		y2: y1 + tMax * dy
	};
}

function extendRayToViewport(
	ox: number,
	oy: number,
	tx: number,
	ty: number,
	vp: Viewport
): { x: number; y: number } | null {
	const dx = tx - ox;
	const dy = ty - oy;
	if (Math.abs(dx) < 1e-15 && Math.abs(dy) < 1e-15) return null;

	const tValues: number[] = [];
	if (Math.abs(dx) > 1e-15) {
		tValues.push((vp.xMin - ox) / dx);
		tValues.push((vp.xMax - ox) / dx);
	}
	if (Math.abs(dy) > 1e-15) {
		tValues.push((vp.yMin - oy) / dy);
		tValues.push((vp.yMax - oy) / dy);
	}

	const validTs = tValues.filter((t) => {
		if (t <= 0) return false;
		const px = ox + t * dx;
		const py = oy + t * dy;
		return (
			px >= vp.xMin - 0.01 && px <= vp.xMax + 0.01 && py >= vp.yMin - 0.01 && py <= vp.yMax + 0.01
		);
	});

	if (validTs.length === 0) return null;
	const tMax = Math.max(...validTs);
	return { x: ox + tMax * dx, y: oy + tMax * dy };
}
