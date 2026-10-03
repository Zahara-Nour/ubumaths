/**
 * Export a Figure to Typst (cetz) code.
 *
 * Produces a #cetz.canvas({...}) block using the cetz drawing library.
 */

import type { Figure } from '../graph/figure';
import { conicPointFromParam } from '../graph/conic-helpers';
import type { Viewport } from '../viewport/types';
import type { ConicParams } from '../types/elements';
import { isPointElement, isVector, type GeoImage } from '../types/elements';
import { geoToNumber } from '../compute/to-number';
import { circumcircle } from '../geometry/circumcircle';
import { resolveStyle } from './svg-primitives';
import { computeAngleGeometry, projectAngleEndpoints } from './angle-geometry-shared';
import { extendLineToViewport, extendRayToViewport } from './viewport-clipping';
import {
	cetzAnchor,
	labelDirection,
	labelOffset,
	textAnchorDirection,
	type Direction
} from './label-placement';

export interface TypstExportOptions {
	scale?: number;
	showGrid?: boolean;
	showAxes?: boolean;
	showLabels?: boolean;
	showMeasures?: boolean;
	/** Émettre `#import "@preview/cetz:…"` (défaut : oui ; non quand le document l'a déjà) */
	includeImport?: boolean;
	/** Commentaire `// element <id>` avant les primitives de chaque élément dessiné */
	annotate?: boolean;
	/** Cadre invisible aux bornes du viewport : la toile couvre toute la fenêtre */
	includeViewportBounds?: boolean;
	/**
	 * Facteur des tailles FIXES (points, codages, angles, décalages d'étiquettes),
	 * exprimées en unités du repère. Avec `scale` < 1, `markScale = 1 / scale`
	 * leur garde leur taille sur la page.
	 */
	markScale?: number;
	/**
	 * Lignes cetz dessinées SOUS les objets (après le cadre de la fenêtre), en
	 * unités du repère : repère et grille d'un bloc ```figure. Vide par défaut.
	 */
	underlay?: readonly string[];
}

const MARK_RADIUS = 0.4;
const MARK_SPACING = 0.12;
const RIGHT_ANGLE_SIZE = 0.3;
const TICK_HALF = 0.15;
const TICK_SPACING = 0.08;

/** Écart point ↔ boîte du nom (unités du repère, × `markScale`) : ≈ 6 px / 5 px à l'écran */
const LABEL_GAP = 0.15;
const LABEL_GAP_DIAGONAL_Y = 0.125;

/** `, anchor: "…"` de `content` ; rien pour le centre (défaut de cetz) */
function anchorArg(dir: Direction): string {
	const anchor = cetzAnchor(dir);
	return anchor ? `, anchor: "${anchor}"` : '';
}

function c(x: number, y: number): string {
	const rx = Math.round(x * 1000) / 1000;
	const ry = Math.round(y * 1000) / 1000;
	return `(${rx}, ${ry})`;
}

/**
 * Chaîne Typst littérale. Un nom ou un texte d'auteur n'entre JAMAIS en mode
 * math (`$AB$` = variable inconnue) ni en markup (`#`, `$`, `*`, `_`…) : une
 * seule erreur fait échouer tout le document.
 */
function typstString(text: string): string {
	return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

/** Couleurs que `rgb("…")` de Typst accepte (3, 4, 6 ou 8 chiffres hexadécimaux). */
const TYPST_HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Défense en profondeur : une couleur non hexadécimale (`red`, une chaîne
 * avec `"`) ferait échouer tout le document, ou sortirait de la chaîne. Elle
 * devient noire ; l'appelant est censé l'avoir validée avant.
 */
function hexToTypstColor(hex: string): string {
	return TYPST_HEX_COLOR.test(hex) ? `rgb("${hex}")` : 'black';
}

/**
 * Remplissage Typst d'un style : aucun, plein, ou translucide (`opacite_fond`,
 * ou l'opacité par défaut de la figure). Le même calcul que l'écran.
 */
function fillExpr(sty: { fillColor?: string; fillOpacity: number }): string {
	if (!sty.fillColor || sty.fillOpacity <= 0) return 'none';
	const color = hexToTypstColor(sty.fillColor);
	if (sty.fillOpacity >= 1) return color;
	return `${color}.transparentize(${Math.round((1 - sty.fillOpacity) * 100)}%)`;
}

/**
 * Ligne qui contient un nombre non fini HORS chaîne : `NaN`, `Infinity`
 * écrits dans une coordonnée font échouer tout le document.
 */
function hasNonFiniteNumber(line: string): boolean {
	return /NaN|Infinity/.test(line.replace(/"(?:[^"\\]|\\.)*"/g, '""'));
}

function strokeExpr(hex: string, rawWidth: number, dash?: string): string {
	const color = hexToTypstColor(hex);
	const width = Number.isFinite(rawWidth) ? rawWidth : 1;
	let s = `${color} + ${width}pt`;
	if (dash === 'dashed') s = `(paint: ${color}, thickness: ${width}pt, dash: "dashed")`;
	else if (dash === 'dotted') s = `(paint: ${color}, thickness: ${width}pt, dash: "dotted")`;
	return s;
}

export function exportToTypst(
	figure: Figure,
	viewport: Viewport,
	options?: TypstExportOptions
): string {
	const scale = options?.scale ?? 1;
	const showGrid = options?.showGrid ?? false;
	const showAxes = options?.showAxes ?? false;
	const showLabels = options?.showLabels ?? true;
	const showMeasures = options?.showMeasures ?? true;
	const annotate = options?.annotate ?? false;
	/** Tailles fixes (en unités du repère), multipliées par `markScale` */
	const k = options?.markScale ?? 1;
	const markRadius = MARK_RADIUS * k;
	const markSpacing = MARK_SPACING * k;
	const rightAngleSize = RIGHT_ANGLE_SIZE * k;
	const tickHalf = TICK_HALF * k;
	const tickSpacing = TICK_SPACING * k;
	const size = (n: number) => Math.round(n * k * 1000) / 1000;

	const lines: string[] = [];
	const elements = figure.getAllElements();
	/** Repère de l'élément dessiné (tests : mêmes objets à l'écran et au PDF) */
	const tag = (id: string) => {
		if (annotate) lines.push(`  // element ${id}`);
	};

	// Header (cetz 0.3.0 : même version que les autres blocs du PDF)
	if (options?.includeImport ?? true) {
		lines.push('#import "@preview/cetz:0.3.0"');
		lines.push('');
	}
	lines.push(`#cetz.canvas({`);
	lines.push(`  import cetz.draw: *`);
	if (scale !== 1) {
		lines.push(`  scale(x: ${scale}, y: ${scale})`);
	}
	if (options?.includeViewportBounds) {
		lines.push(
			`  rect(${c(viewport.xMin, viewport.yMin)}, ${c(viewport.xMax, viewport.yMax)}, stroke: none)`
		);
	}

	if (options?.underlay) lines.push(...options.underlay);

	// Grid
	if (showGrid) {
		lines.push(
			`  grid(${c(viewport.xMin, viewport.yMin)}, ${c(viewport.xMax, viewport.yMax)}, step: 1, stroke: gray + 0.3pt)`
		);
	}

	// Axes
	if (showAxes) {
		lines.push(
			`  line(${c(viewport.xMin, 0)}, ${c(viewport.xMax, 0)}, stroke: gray + 1pt, mark: (end: ">"))`
		);
		lines.push(
			`  line(${c(0, viewport.yMin)}, ${c(0, viewport.yMax)}, stroke: gray + 1pt, mark: (end: ">"))`
		);
	}

	// Pass 0: background images (couche="fond")
	for (const el of elements) {
		if (!el.visible || el.type !== 'image' || el.layer !== 'fond') continue;
		const typst = imageToTypst(el, figure);
		if (typst) lines.push(typst);
	}

	// Pass 1: segments, lines, rays
	for (const el of elements) {
		if (!el.visible) continue;
		const sty = resolveStyle(el, figure.defaults);
		const stroke = strokeExpr(
			sty.color,
			sty.strokeWidth,
			sty.dash !== 'solid' ? sty.dash : undefined
		);

		if (el.type === 'segment') {
			const p1 = figure.getPosition(el.startId);
			const p2 = figure.getPosition(el.endId);
			if (!p1 || !p2) continue;
			tag(el.id);
			lines.push(
				`  line(${c(geoToNumber(p1.x), geoToNumber(p1.y))}, ${c(geoToNumber(p2.x), geoToNumber(p2.y))}, stroke: ${stroke})`
			);
		} else if (el.type === 'line') {
			const p1 = figure.getPosition(el.point1Id);
			const p2 = figure.getPosition(el.point2Id);
			if (!p1 || !p2) continue;
			const ext = extendLineToViewport(
				geoToNumber(p1.x),
				geoToNumber(p1.y),
				geoToNumber(p2.x),
				geoToNumber(p2.y),
				viewport
			);
			if (!ext) continue;
			tag(el.id);
			lines.push(`  line(${c(ext.x1, ext.y1)}, ${c(ext.x2, ext.y2)}, stroke: ${stroke})`);
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
			tag(el.id);
			lines.push(`  line(${c(ox, oy)}, ${c(ext.x, ext.y)}, stroke: ${stroke})`);
		} else if (isVector(el)) {
			const comp = figure.getVectorComponents(el.id);
			if (!comp) continue;
			let startX: number, startY: number;
			if (el.type === 'vectorByPoints') {
				const p1 = figure.getPosition(el.startId);
				if (!p1) continue;
				startX = geoToNumber(p1.x);
				startY = geoToNumber(p1.y);
			} else {
				const pos = figure.getPosition(el.id);
				startX = pos ? geoToNumber(pos.x) : 0;
				startY = pos ? geoToNumber(pos.y) : 0;
			}
			const endX = startX + geoToNumber(comp.dx);
			const endY = startY + geoToNumber(comp.dy);
			tag(el.id);
			lines.push(
				`  line(${c(startX, startY)}, ${c(endX, endY)}, stroke: ${stroke}, mark: (end: "stealth", fill: ${hexToTypstColor(sty.color)}))`
			);
		}
	}

	// Pass 2: circles
	for (const el of elements) {
		if (!el.visible) continue;
		const sty = resolveStyle(el, figure.defaults);
		const stroke = strokeExpr(
			sty.color,
			sty.strokeWidth,
			sty.dash !== 'solid' ? sty.dash : undefined
		);

		if (el.type === 'circleByRadius') {
			const center = figure.getPosition(el.centerId);
			if (!center) continue;
			const r = figure.resolveParam(el.radius);
			tag(el.id);
			lines.push(
				`  circle(${c(geoToNumber(center.x), geoToNumber(center.y))}, radius: ${Math.round(r * 1000) / 1000}, stroke: ${stroke}, fill: none)`
			);
		} else if (el.type === 'circleByPoint') {
			const center = figure.getPosition(el.centerId);
			const edge = figure.getPosition(el.edgePointId);
			if (!center || !edge) continue;
			const cx = geoToNumber(center.x);
			const cy = geoToNumber(center.y);
			const r = Math.sqrt((geoToNumber(edge.x) - cx) ** 2 + (geoToNumber(edge.y) - cy) ** 2);
			tag(el.id);
			lines.push(
				`  circle(${c(cx, cy)}, radius: ${Math.round(r * 1000) / 1000}, stroke: ${stroke}, fill: none)`
			);
		} else if (el.type === 'circleBy3Points') {
			const p1 = figure.getPosition(el.point1Id);
			const p2 = figure.getPosition(el.point2Id);
			const p3 = figure.getPosition(el.point3Id);
			if (!p1 || !p2 || !p3) continue;
			const cc = circumcircle(
				geoToNumber(p1.x),
				geoToNumber(p1.y),
				geoToNumber(p2.x),
				geoToNumber(p2.y),
				geoToNumber(p3.x),
				geoToNumber(p3.y)
			);
			if (!cc) continue;
			tag(el.id);
			lines.push(
				`  circle(${c(cc.ux, cc.uy)}, radius: ${Math.round(cc.r * 1000) / 1000}, stroke: ${stroke}, fill: none)`
			);
		} else if (el.type === 'osculatingCircle') {
			const centre = figure.getPosition(el.id);
			const radius = figure.getOsculatingCircleRadius(el.id);
			if (!centre || radius === null || !Number.isFinite(radius)) continue;
			lines.push(
				`  circle(${c(geoToNumber(centre.x), geoToNumber(centre.y))}, radius: ${Math.round(radius * 1000) / 1000}, stroke: ${stroke}, fill: none)`
			);
		}
	}

	// Pass 2a: arcs
	for (const el of elements) {
		if (!el.visible) continue;
		if (el.type !== 'arcByAngles' && el.type !== 'arcByPoints') continue;
		const sty = resolveStyle(el, figure.defaults);
		const stroke = strokeExpr(
			sty.color,
			sty.strokeWidth,
			sty.dash !== 'solid' ? sty.dash : undefined
		);

		let cx: number, cy: number, r: number, startDeg: number, endDeg: number;

		if (el.type === 'arcByAngles') {
			const center = figure.getPosition(el.centerId);
			if (!center) continue;
			cx = geoToNumber(center.x);
			cy = geoToNumber(center.y);
			r = figure.resolveParam(el.radius);
			startDeg = (figure.resolveParam(el.startAngle) * 180) / Math.PI;
			endDeg = (figure.resolveParam(el.endAngle) * 180) / Math.PI;
		} else {
			const startPos = figure.getPosition(el.startId);
			const centerPos = figure.getPosition(el.centerId);
			const endPos = figure.getPosition(el.endId);
			if (!startPos || !centerPos || !endPos) continue;
			cx = geoToNumber(centerPos.x);
			cy = geoToNumber(centerPos.y);
			const sx = geoToNumber(startPos.x);
			const sy = geoToNumber(startPos.y);
			r = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
			startDeg = (Math.atan2(sy - cy, sx - cx) * 180) / Math.PI;
			endDeg = (Math.atan2(geoToNumber(endPos.y) - cy, geoToNumber(endPos.x) - cx) * 180) / Math.PI;
		}

		let sweep = endDeg - startDeg;
		while (sweep < 0) sweep += 360;
		while (sweep >= 360) sweep -= 360;
		const start = Math.round(startDeg * 100) / 100;
		const stop = Math.round((startDeg + sweep) * 100) / 100;

		tag(el.id);
		lines.push(
			`  arc(${c(cx, cy)}, start: ${start}deg, stop: ${stop}deg, radius: ${Math.round(r * 1000) / 1000}, anchor: "origin", stroke: ${stroke})`
		);
	}

	// Pass 2b: polygons
	for (const el of elements) {
		if (!el.visible || el.type !== 'polygon') continue;
		const sty = resolveStyle(el, figure.defaults);
		const stroke = strokeExpr(
			sty.color,
			sty.strokeWidth,
			sty.dash !== 'solid' ? sty.dash : undefined
		);
		const verts = el.dependsOn.map((id) => figure.getPosition(id));
		if (verts.some((p) => !p)) continue;
		const pts = verts.map((p) => c(geoToNumber(p!.x), geoToNumber(p!.y)));
		const fillPart = `, fill: ${fillExpr(sty)}`;
		tag(el.id);
		lines.push(`  line(${pts.join(', ')}, close: true, stroke: ${stroke}${fillPart})`);
	}

	// Pass 2c: quadratic curves (conics)
	for (const el of elements) {
		if (!el.visible || el.type !== 'quadraticCurve') continue;
		const sty = resolveStyle(el, figure.defaults);
		const stroke = strokeExpr(
			sty.color,
			sty.strokeWidth,
			sty.dash !== 'solid' ? sty.dash : undefined
		);
		const conic = el.conic;
		if (conic.type === 'degenerate') continue;

		const conicPaths = sampleConicPathsTypst(conic, viewport);
		for (const pts of conicPaths) {
			const coords = pts.map((p) => c(p.x, p.y));
			lines.push(`  line(${coords.join(', ')}, stroke: ${stroke}, fill: none)`);
		}
	}

	// Pass 2e: parametric curves
	for (const el of elements) {
		if (!el.visible || el.type !== 'parametricCurve') continue;
		const sty = resolveStyle(el, figure.defaults);
		const stroke = strokeExpr(
			sty.color,
			sty.strokeWidth,
			sty.dash !== 'solid' ? sty.dash : undefined
		);

		const result = figure.computeParametricCurveSampling(el.id, viewport);
		if (!result || result.points.length < 2) continue;

		// Split at discontinuity indices into sub-paths
		const subPaths: { x: number; y: number }[][] = [];
		let segStart = 0;
		for (const discIdx of result.discontinuityIndices) {
			if (discIdx > segStart) {
				subPaths.push(Array.from(result.points.slice(segStart, discIdx)));
			}
			segStart = discIdx;
		}
		if (segStart < result.points.length) {
			subPaths.push(Array.from(result.points.slice(segStart)));
		}

		const isLastSeg = (idx: number) => idx === subPaths.length - 1;

		for (let i = 0; i < subPaths.length; i++) {
			const pts = subPaths[i];
			if (pts.length < 2) continue;
			const coords = pts.map((p) => c(p.x, p.y));
			const closedPart =
				result.closed && result.discontinuityIndices.length === 0 && isLastSeg(i)
					? ', closed: true'
					: '';
			const fillPart = `, fill: ${fillExpr(sty)}`;
			lines.push(`  line(${coords.join(', ')}, stroke: ${stroke}${fillPart}${closedPart})`);
		}
	}

	// Pass 2d: tangents to quadratic curves
	for (const el of elements) {
		if (!el.visible || el.type !== 'tangentToQuadratic') continue;
		const sty = resolveStyle(el, figure.defaults);
		const stroke = strokeExpr(
			sty.color,
			sty.strokeWidth,
			sty.dash !== 'solid' ? sty.dash : undefined
		);
		const curveEl = figure.getElementById(el.curveId);
		if (!curveEl || curveEl.type !== 'quadraticCurve') continue;

		let x0: number, y0: number;
		if (el.pointOnCurveId) {
			const pos = figure.getPosition(el.pointOnCurveId);
			if (!pos) continue;
			x0 = geoToNumber(pos.x);
			y0 = geoToNumber(pos.y);
		} else if (el.t !== undefined) {
			const pt = conicPointFromParam(curveEl.conic, el.t);
			if (!pt) continue;
			x0 = pt.x;
			y0 = pt.y;
		} else {
			continue;
		}

		const [A, B, C, D, E] = curveEl.coefficients;
		const dFx = 2 * A * x0 + B * y0 + D;
		const dFy = B * x0 + 2 * C * y0 + E;
		if (Math.abs(dFx) < 1e-12 && Math.abs(dFy) < 1e-12) continue;

		const tDir = { x: -dFy, y: dFx };
		const len = Math.sqrt(tDir.x ** 2 + tDir.y ** 2);
		const diag = Math.sqrt(
			(viewport.xMax - viewport.xMin) ** 2 + (viewport.yMax - viewport.yMin) ** 2
		);
		const sc = diag / len;
		lines.push(
			`  line(${c(x0 - tDir.x * sc, y0 - tDir.y * sc)}, ${c(x0 + tDir.x * sc, y0 + tDir.y * sc)}, stroke: ${stroke})`
		);
	}

	// Pass 3: angles (first-class GeoAngle)
	for (const el of elements) {
		if (!el.visible || el.type !== 'angle') continue;

		// Project endpoints to math coords (identity for Typst).
		const projected = projectAngleEndpoints(el, figure, (mx, my) => ({ x: mx, y: my }));
		if (!projected) continue;

		const baseR = el.arcRadiusPx ? (el.arcRadiusPx / 25) * markRadius : markRadius;
		const arcSpacing = el.arcSpacingPx ? (el.arcSpacingPx / 6) * markSpacing : markSpacing;

		const geom = computeAngleGeometry(el, projected, {
			arcRadius: baseR,
			arcSpacing,
			rightAngleSize,
			labelOffset: size(0.2)
		});
		if (!geom) continue;
		tag(el.id);

		const { vertexX: vx, vertexY: vy, marque } = geom;
		const color = hexToTypstColor(resolveStyle(el, figure.defaults).color);

		if (marque === 'aucune') {
			// Label-only.
		} else if (marque === 'carre' && geom.rightAngle) {
			const r = geom.rightAngle;
			lines.push(
				`  line(${c(r.startX, r.startY)}, ${c(r.cornerX, r.cornerY)}, ${c(r.endX, r.endY)}, stroke: ${color} + 1pt)`
			);
		} else {
			const angle1Deg = (geom.angle1 * 180) / Math.PI;
			const sweepDeg = (geom.sweepRad * 180) / Math.PI;
			const start = Math.round(angle1Deg * 100) / 100;
			const stop = Math.round((angle1Deg + sweepDeg) * 100) / 100;

			// Optional sector fill (rendered before arc strokes). Uses OUTER
			// radius so the fill covers the full visible arc extent.
			const sty = resolveStyle(el, figure.defaults);
			if (sty.fillColor) {
				const fillCol = hexToTypstColor(sty.fillColor);
				const outerR = geom.outerRadius;
				lines.push(
					`  arc(${c(vx, vy)}, start: ${start}deg, stop: ${stop}deg, radius: ${Math.round(outerR * 1000) / 1000}, anchor: "origin", mode: "PIE", fill: ${fillCol}.transparentize(${Math.round((1 - sty.fillOpacity) * 100)}%), stroke: none)`
				);
			}

			for (const arc of geom.arcs) {
				lines.push(
					`  arc(${c(vx, vy)}, start: ${start}deg, stop: ${stop}deg, radius: ${Math.round(arc.radius * 1000) / 1000}, anchor: "origin", stroke: ${color} + 1pt)`
				);
			}
		}

		if (showLabels && geom.label) {
			lines.push(
				`  content(${c(geom.labelX, geom.labelY)}, text(size: 9pt, fill: ${color}, ${typstString(geom.label)}))`
			);
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

		const color = hexToTypstColor(resolveStyle(el, figure.defaults).color);
		const totalWidth = (el.markCount - 1) * tickSpacing;
		const startOffset = -totalWidth / 2;

		tag(el.id);
		for (let i = 0; i < el.markCount; i++) {
			const offset = startOffset + i * tickSpacing;
			const cx = mx + ux * offset;
			const cy = my + uy * offset;
			lines.push(
				`  line(${c(cx + px * tickHalf, cy + py * tickHalf)}, ${c(cx - px * tickHalf, cy - py * tickHalf)}, stroke: ${color} + 1.5pt)`
			);
		}
	}

	// Pass 5: points
	for (const el of elements) {
		if (!el.visible || !isPointElement(el)) continue;
		const pos = figure.getPosition(el.id);
		if (!pos) continue;

		const x = geoToNumber(pos.x);
		const y = geoToNumber(pos.y);
		const sty = resolveStyle(el, figure.defaults);
		const color = hexToTypstColor(sty.color);

		tag(el.id);
		if (sty.pointShape === 'dot') {
			lines.push(`  circle(${c(x, y)}, radius: ${size(0.08)}, fill: ${color}, stroke: none)`);
		} else if (sty.pointShape === 'circle') {
			lines.push(
				`  circle(${c(x, y)}, radius: ${size(0.08)}, fill: none, stroke: ${color} + 1.5pt)`
			);
		} else if (sty.pointShape === 'cross') {
			const s = size(0.1);
			lines.push(`  line(${c(x - s, y - s)}, ${c(x + s, y + s)}, stroke: ${color} + 1.5pt)`);
			lines.push(`  line(${c(x + s, y - s)}, ${c(x - s, y + s)}, stroke: ${color} + 1.5pt)`);
		} else if (sty.pointShape === 'square') {
			const s = size(0.07);
			lines.push(`  rect(${c(x - s, y - s)}, ${c(x + s, y + s)}, fill: ${color}, stroke: none)`);
		}

		if (showLabels && el.label && !el.labelHidden) {
			// Même table que l'écran du bloc figure (`label-placement.ts`) : le nom
			// s'écrit du côté choisi, sa boîte posée contre le point par l'ancre cetz.
			// Nom en TEXTE italique, jamais en mode math (`$AB$` : variable inconnue).
			const dir = labelDirection(el.labelPosition);
			const off = labelOffset(dir, size(LABEL_GAP), size(LABEL_GAP_DIAGONAL_Y));
			lines.push(
				`  content(${c(x + off.dx, y + off.dy)}${anchorArg(dir)}, text(style: "italic", ${typstString(el.label)}))`
			);
		}
	}

	// Pass 6: text elements
	if (showMeasures) {
		for (const el of elements) {
			if (!el.visible || (el.type !== 'text' && el.type !== 'mathText' && el.type !== 'richText'))
				continue;
			const text = figure.resolveTemplate(el.id);
			if (text === undefined) continue;

			const color = hexToTypstColor(resolveStyle(el, figure.defaults).color);
			let mx: number | undefined;
			let my: number | undefined;

			if (el.autoPosition && el.autoTargetIds) {
				const positions = el.autoTargetIds.map((tid) => figure.getPosition(tid));
				if (positions.some((p) => !p)) continue;

				if (el.autoPosition === 'midpoint') {
					const [a, b] = positions;
					mx = (geoToNumber(a!.x) + geoToNumber(b!.x)) / 2;
					my = (geoToNumber(a!.y) + geoToNumber(b!.y)) / 2;
					const dx = geoToNumber(b!.x) - geoToNumber(a!.x);
					const dy = geoToNumber(b!.y) - geoToNumber(a!.y);
					const len = Math.sqrt(dx * dx + dy * dy);
					if (len > 1e-10) {
						mx += (-dy / len) * size(0.4);
						my += (dx / len) * size(0.4);
					}
				} else if (el.autoPosition === 'bisector') {
					const vp = positions[1]!;
					mx = geoToNumber(vp.x);
					my = geoToNumber(vp.y);
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
							mx += (bx / bl) * size(0.8);
							my += (by / bl) * size(0.8);
						}
					}
				} else {
					let sx = 0;
					let sy = 0;
					for (const p of positions) {
						sx += geoToNumber(p!.x);
						sy += geoToNumber(p!.y);
					}
					mx = sx / positions.length;
					my = sy / positions.length;
				}
			} else if (el.anchorId) {
				const anchorPos = figure.getPosition(el.anchorId);
				if (!anchorPos) continue;
				mx = geoToNumber(anchorPos.x) + (el.anchorOffset?.dx ?? 0.5);
				my = geoToNumber(anchorPos.y) + (el.anchorOffset?.dy ?? 0.5);
			} else if (el.position) {
				mx = el.position.x;
				my = el.position.y;
			}

			if (mx === undefined || my === undefined) continue;
			tag(el.id);
			// Centré par défaut ; `ancre=` (textes simples) pose un autre point de la boîte
			const dir = textAnchorDirection(el.type === 'text' ? el.textAnchor : undefined);
			lines.push(
				`  content(${c(mx, my)}${anchorArg(dir)}, text(size: 9pt, fill: ${color}, ${typstString(text)}))`
			);
		}
	}

	// Pass 7: foreground images (layer !== 'fond')
	for (const el of elements) {
		if (!el.visible || el.type !== 'image' || el.layer === 'fond') continue;
		const typst = imageToTypst(el, figure);
		if (typst) lines.push(typst);
	}

	lines.push('})');
	// Défense en profondeur : une primitive avec un nombre non fini est omise
	return lines.filter((line) => !hasNonFiniteNumber(line)).join('\n');
}

/** Convert a GeoImage to a Typst cetz content() call. */
function imageToTypst(el: GeoImage, figure: Figure): string | null {
	let mx: number | undefined;
	let my: number | undefined;
	let w: number;
	let h: number | undefined;

	if (el.point1Id && el.point2Id) {
		const p1 = figure.getPosition(el.point1Id);
		const p2 = figure.getPosition(el.point2Id);
		if (!p1 || !p2) return null;
		mx = Math.min(geoToNumber(p1.x), geoToNumber(p2.x));
		my = Math.max(geoToNumber(p1.y), geoToNumber(p2.y));
		w = Math.abs(geoToNumber(p2.x) - geoToNumber(p1.x));
		h = Math.abs(geoToNumber(p2.y) - geoToNumber(p1.y));
	} else if (el.anchorId) {
		const pos = figure.getPosition(el.anchorId);
		if (!pos) return null;
		mx = geoToNumber(pos.x) + (el.anchorOffset?.dx ?? 0);
		my = geoToNumber(pos.y) + (el.anchorOffset?.dy ?? 0);
		w = el.width;
		h = el.height;
	} else if (el.position) {
		mx = el.position.x;
		my = el.position.y;
		w = el.width;
		h = el.height;
	} else {
		return null;
	}

	const rn = (n: number) => Math.round(n * 1000) / 1000;
	const heightPart = h !== undefined ? `, height: ${rn(h)}cm` : '';
	const rotDeg = ((el.rotation ?? 0) * 180) / Math.PI;
	let imgExpr = `image("${el.url}")`;
	if (el.flipped) {
		imgExpr = `scale(x: -100%, ${imgExpr})`;
	}
	if (Math.abs(rotDeg) > 0.01) {
		imgExpr = `rotate(${Math.round(rotDeg * 100) / 100}deg, ${imgExpr})`;
	}
	// Note: URL must be replaced with a local file path for Typst compilation
	return `  content(${c(mx!, my!)}, box(width: ${rn(w)}cm${heightPart}, ${imgExpr}))`;
}

// ─── Helpers ────────────────────────────────────────────────

/** Sample conic curve as array of point arrays (one per branch). */
function sampleConicPathsTypst(
	conic: ConicParams,
	viewport: Viewport
): { x: number; y: number }[][] {
	const n = 100;
	const diag = Math.sqrt(
		(viewport.xMax - viewport.xMin) ** 2 + (viewport.yMax - viewport.yMin) ** 2
	);
	const paths: { x: number; y: number }[][] = [];

	const sample = (tMin: number, tMax: number): { x: number; y: number }[] => {
		const pts: { x: number; y: number }[] = [];
		for (let i = 0; i <= n; i++) {
			const t = tMin + ((tMax - tMin) * i) / n;
			const pt = conicPointFromParam(conic, t);
			if (pt) pts.push(pt);
		}
		return pts;
	};

	switch (conic.type) {
		case 'circle':
		case 'ellipse':
			paths.push(sample(0, 2 * Math.PI));
			break;
		case 'hyperbola': {
			const tMax = Math.acosh(Math.max(2, diag / conic.a + 1));
			paths.push(sample(-tMax, tMax));
			const branch2: { x: number; y: number }[] = [];
			const cx = conic.center?.x ?? 0;
			const cy = conic.center?.y ?? 0;
			for (const pt of paths[0]) {
				branch2.push({ x: 2 * cx - pt.x, y: 2 * cy - pt.y });
			}
			paths.push(branch2);
			break;
		}
		case 'parabola': {
			const p = conic.p ?? conic.a;
			const tMax = Math.sqrt(diag * 2 * p);
			paths.push(sample(-tMax, tMax));
			break;
		}
	}

	return paths;
}
