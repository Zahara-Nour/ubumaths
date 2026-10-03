/**
 * Bloc ```figure — formes SVG de l'écran
 * ======================================
 *
 * Traduit une scène (`buildFigureScene`) en formes SVG simples, à partir des
 * PRIMITIVES SVG de geometry-core (`svg-primitives.ts`) — pas de
 * `GeometryCanvas` (mathlive + roughjs), pas d'`exportToSVG` (roughjs).
 *
 * Mêmes passes et même liste blanche que `exportToTypst` : chaque forme porte
 * l'id de l'élément dessiné, ce qui permet de vérifier que l'écran et le PDF
 * montrent les mêmes objets.
 *
 * @module ubumark/utils/figure-svg
 */

import type { FigureSize } from '../types/figure';
import { FIGURE_AXES_MARGIN_PX, FIGURE_LABEL_FONT_PX, FIGURE_PIXEL_WIDTH } from '../types/figure';
import { FIGURE_DEFAULT_COLOR, FIGURE_HEX_COLOR, type FigureScene } from './figure-scene';
import { createTransformer } from '$lib/geometry-core/viewport/viewport';
import {
	angleToSVG,
	arcToSVG,
	circleToSVG,
	lineToSVG,
	pointToSVG,
	rayToSVG,
	resolveStyle,
	segmentMarkToSVG,
	segmentToSVG,
	textToSVG,
	vectorToSVG
} from '$lib/geometry-core/rendering/svg-primitives';
import { isPointElement, isText, isVector } from '$lib/geometry-core/types/elements';
import {
	labelDirection,
	labelOffset,
	svgTextPlacement,
	textAnchorDirection
} from '$lib/geometry-core/rendering/label-placement';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';

// ============================================================================
// TYPES
// ============================================================================

interface ShapeBase {
	/** Id de l'élément geometry-core dessiné */
	elementId: string;
	/** Couleur de trait / de remplissage (hex, ou token pour la couleur par défaut) */
	color: string;
}

export type FigureShape =
	| (ShapeBase & {
			kind: 'line';
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			width: number;
			dash: string;
	  })
	| (ShapeBase & {
			kind: 'circle';
			cx: number;
			cy: number;
			r: number;
			width: number;
			dash: string;
			fill: string | null;
			fillOpacity: number;
	  })
	| (ShapeBase & { kind: 'path'; d: string; width: number; dash: string; fill: string | null })
	| (ShapeBase & {
			kind: 'polygon';
			points: string;
			width: number;
			dash: string;
			fill: string | null;
			fillOpacity: number;
	  })
	| (ShapeBase & { kind: 'arrowhead'; points: string })
	| (ShapeBase & { kind: 'dot'; cx: number; cy: number; r: number })
	| (ShapeBase & {
			kind: 'label';
			x: number;
			y: number;
			text: string;
			anchor: 'start' | 'middle' | 'end';
			/** `alphabetic` : `y` = ligne de base ; `middle` : `y` = milieu (étiquettes d'angle) */
			baseline: 'alphabetic' | 'middle';
			/** Nom de point : en italique */
			italic: boolean;
	  });

/** Trait du repère, en px de la fenêtre (origine en haut à gauche de la fenêtre) */
export interface FrameSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

/**
 * Repère à l'écran (mêmes mesures que ```courbe), en px de la FENÊTRE : les
 * flèches et les étiquettes peuvent sortir de [0 ; width] × [0 ; height], dans
 * la marge.
 */
export interface FigureFrameSvg {
	gridLines: FrameSegment[];
	axisLines: FrameSegment[];
	/** Pointes de flèche (attribut `points` d'un polygone) */
	arrowheads: string[];
	tickLines: FrameSegment[];
	/** Étiquettes de graduation et « O » ; `middle` sous l'axe des abscisses, `end` à gauche */
	tickLabels: { x: number; y: number; text: string; anchor: 'middle' | 'end' }[];
}

export interface FigureSvg {
	/** Taille de la fenêtre, en px */
	width: number;
	height: number;
	shapes: FigureShape[];
	/** Marge autour de la fenêtre (axes) ; absente sans repère */
	margin?: number;
	/** Axes et grille ; absent sans repère (rendu historique inchangé) */
	frame?: FigureFrameSvg;
}

// ============================================================================
// CONSTANTES
// ============================================================================

export { FIGURE_LABEL_FONT_PX, FIGURE_PIXEL_WIDTH };

/** Couleur par défaut des objets (noire au PDF) : couleur du texte à l'écran, claire ou sombre. */
const SCREEN_DEFAULT_COLOR = 'var(--color-foreground)';

/** Mesures du repère à l'écran, en px : celles de `Courbe.svelte` */
const AXIS_OVERSHOOT_PX = 8;
const ARROW_TIP_PX = 12;
const ARROW_BASE_PX = 5;
const ARROW_HALF_WIDTH_PX = 3.5;
const TICK_HALF_PX = 3;
const X_TICK_LABEL_DY_PX = 13;
const Y_TICK_LABEL_DX_PX = 5;
const Y_TICK_LABEL_DY_PX = 3.5;

// ============================================================================
// FORMES
// ============================================================================

/** Repère (grille, axes, graduations) en px de la fenêtre. */
function frameToSvg(
	frame: NonNullable<FigureScene['frame']>,
	toPx: (x: number, y: number) => { x: number; y: number },
	width: number,
	height: number
): FigureFrameSvg {
	const out: FigureFrameSvg = {
		gridLines: [],
		axisLines: [],
		arrowheads: [],
		tickLines: [],
		tickLabels: []
	};
	const r = (n: number) => Math.round(n * 100) / 100;
	if (frame.grid) {
		for (const x of frame.grid.xs) {
			const px = r(toPx(x, 0).x);
			out.gridLines.push({ x1: px, y1: 0, x2: px, y2: height });
		}
		for (const y of frame.grid.ys) {
			const py = r(toPx(0, y).y);
			out.gridLines.push({ x1: 0, y1: py, x2: width, y2: py });
		}
	}
	const axes = frame.axes;
	if (!axes) return out;
	const ax = r(toPx(0, axes.xAxisY).y);
	const ay = r(toPx(axes.yAxisX, 0).x);
	out.axisLines.push({ x1: 0, y1: ax, x2: width + AXIS_OVERSHOOT_PX, y2: ax });
	out.axisLines.push({ x1: ay, y1: height, x2: ay, y2: -AXIS_OVERSHOOT_PX });
	out.arrowheads.push(
		`${width + ARROW_TIP_PX},${ax} ${width + ARROW_BASE_PX},${ax - ARROW_HALF_WIDTH_PX} ${width + ARROW_BASE_PX},${ax + ARROW_HALF_WIDTH_PX}`,
		`${ay},${-ARROW_TIP_PX} ${ay - ARROW_HALF_WIDTH_PX},${-ARROW_BASE_PX} ${ay + ARROW_HALF_WIDTH_PX},${-ARROW_BASE_PX}`
	);
	for (const t of axes.ticks.x) {
		const x = r(toPx(t.value, 0).x);
		out.tickLines.push({ x1: x, y1: ax - TICK_HALF_PX, x2: x, y2: ax + TICK_HALF_PX });
		if (t.label !== null) {
			out.tickLabels.push({ x, y: ax + X_TICK_LABEL_DY_PX, text: t.label, anchor: 'middle' });
		}
	}
	for (const t of axes.ticks.y) {
		const y = r(toPx(0, t.value).y);
		out.tickLines.push({ x1: ay - TICK_HALF_PX, y1: y, x2: ay + TICK_HALF_PX, y2: y });
		if (t.label !== null) {
			out.tickLabels.push({
				x: ay - Y_TICK_LABEL_DX_PX,
				y: y + Y_TICK_LABEL_DY_PX,
				text: t.label,
				anchor: 'end'
			});
		}
	}
	if (axes.originLabel) {
		out.tickLabels.push({
			x: ay - Y_TICK_LABEL_DX_PX,
			y: ax + X_TICK_LABEL_DY_PX,
			text: 'O',
			anchor: 'end'
		});
	}
	return out;
}

/**
 * Couleur posée dans `style:` : Svelte la concatène dans `cssText` SANS
 * échapper. La scène a déjà validé les couleurs ; défense en profondeur :
 * tout ce qui n'est pas hexadécimal devient la couleur par défaut (sinon
 * `red;mask-image:url(…)` injecterait du CSS, dans le chat élève compris).
 */
function screenColor(hex: string): string {
	if (hex.toLowerCase() === FIGURE_DEFAULT_COLOR) return SCREEN_DEFAULT_COLOR;
	return FIGURE_HEX_COLOR.test(hex) ? hex : SCREEN_DEFAULT_COLOR;
}

export function figureToSvg(scene: FigureScene, size: FigureSize): FigureSvg {
	const { figure, viewport, elements } = scene;
	const width = FIGURE_PIXEL_WIDTH[size];
	const height = Math.round(
		(width * (viewport.yMax - viewport.yMin)) / (viewport.xMax - viewport.xMin)
	);
	const transformer = createTransformer(viewport, width, height);
	const dims = { width, height };
	const shapes: FigureShape[] = [];

	const fillOf = (fill: string | undefined): string | null => (fill ? screenColor(fill) : null);

	// Passe 1 : segments, droites, demi-droites, vecteurs
	for (const el of elements) {
		const sty = resolveStyle(el, figure.defaults);
		const base = { elementId: el.id, color: screenColor(sty.color) };
		const stroke = { width: sty.strokeWidth, dash: sty.dashArray };
		if (el.type === 'segment' || el.type === 'line' || el.type === 'ray') {
			const svg =
				el.type === 'segment'
					? segmentToSVG(el.id, figure, transformer)
					: el.type === 'line'
						? lineToSVG(el.id, figure, transformer, dims)
						: rayToSVG(el.id, figure, transformer, dims);
			if (svg) shapes.push({ ...base, ...stroke, kind: 'line', ...svg });
		} else if (isVector(el)) {
			const svg = vectorToSVG(el.id, figure, transformer);
			if (!svg) continue;
			shapes.push({
				...base,
				...stroke,
				kind: 'line',
				x1: svg.x1,
				y1: svg.y1,
				x2: svg.shaftX2,
				y2: svg.shaftY2
			});
			shapes.push({ ...base, kind: 'arrowhead', points: svg.arrowPoints });
		}
	}

	// Passe 2 : cercles, arcs, polygones
	for (const el of elements) {
		const sty = resolveStyle(el, figure.defaults);
		const base = { elementId: el.id, color: screenColor(sty.color) };
		const stroke = { width: sty.strokeWidth, dash: sty.dashArray };
		if (
			el.type === 'circleByRadius' ||
			el.type === 'circleByPoint' ||
			el.type === 'circleBy3Points'
		) {
			const svg = circleToSVG(el.id, figure, transformer);
			if (svg)
				shapes.push({
					...base,
					...stroke,
					kind: 'circle',
					...svg,
					fill: fillOf(sty.fillColor),
					fillOpacity: sty.fillOpacity
				});
		} else if (el.type === 'arcByAngles' || el.type === 'arcByPoints') {
			const svg = arcToSVG(el.id, figure, transformer);
			if (svg) shapes.push({ ...base, ...stroke, kind: 'path', d: svg.path, fill: null });
		} else if (el.type === 'polygon') {
			const verts = el.dependsOn.map((id) => figure.getPosition(id));
			if (verts.some((p) => !p)) continue;
			const points = verts
				.map((p) => {
					const sv = transformer.mathToSvg(geoToNumber(p!.x), geoToNumber(p!.y));
					return `${sv.x.toFixed(2)},${sv.y.toFixed(2)}`;
				})
				.join(' ');
			shapes.push({
				...base,
				...stroke,
				kind: 'polygon',
				points,
				fill: fillOf(sty.fillColor),
				fillOpacity: sty.fillOpacity
			});
		}
	}

	// Passe 3 : angles (arcs ou carré, étiquette)
	for (const el of elements) {
		if (el.type !== 'angle') continue;
		const sty = resolveStyle(el, figure.defaults);
		const base = { elementId: el.id, color: screenColor(sty.color) };
		const svg = angleToSVG(el.id, figure, transformer);
		if (!svg) continue;
		for (const d of svg.paths) {
			shapes.push({ ...base, kind: 'path', d, width: 1.2, dash: '', fill: null });
		}
		if (svg.label) {
			shapes.push({
				...base,
				kind: 'label',
				x: svg.labelX,
				y: svg.labelY,
				text: svg.label,
				anchor: 'middle',
				baseline: 'middle',
				italic: false
			});
		}
	}

	// Passe 4 : codages de segments
	for (const el of elements) {
		if (el.type !== 'segmentMark') continue;
		const sty = resolveStyle(el, figure.defaults);
		const svg = segmentMarkToSVG(el.id, figure, transformer);
		if (!svg) continue;
		for (const tick of svg.ticks) {
			shapes.push({
				elementId: el.id,
				color: screenColor(sty.color),
				kind: 'line',
				...tick,
				width: sty.strokeWidth,
				dash: ''
			});
		}
	}

	// Passe 5 : points et leurs noms
	for (const el of elements) {
		if (!isPointElement(el)) continue;
		const svg = pointToSVG(el.id, figure, transformer);
		if (!svg) continue;
		const sty = resolveStyle(el, figure.defaults);
		const color = screenColor(sty.color);
		shapes.push({ elementId: el.id, color, kind: 'dot', cx: svg.cx, cy: svg.cy, r: sty.pointSize });
		if (el.label && !el.labelHidden) {
			// Même table que l'export Typst (`label-placement.ts`) : même côté, même ancrage
			const dir = labelDirection(el.labelPosition);
			const off = el.labelOffset
				? { dx: el.labelOffset.dx, dy: -el.labelOffset.dy }
				: labelOffset(dir, sty.pointSize + 3, sty.pointSize + 2);
			const placed = svgTextPlacement(svg.cx + off.dx, svg.cy - off.dy, dir, FIGURE_LABEL_FONT_PX);
			shapes.push({
				elementId: el.id,
				color,
				kind: 'label',
				x: placed.x,
				y: placed.y,
				text: el.label,
				anchor: placed.anchor,
				baseline: 'alphabetic',
				italic: true
			});
		}
	}

	// Passe 6 : textes
	// Centrés par défaut, comme au PDF (`content` de cetz) ; `ancre=` choisit le point posé
	for (const el of elements) {
		if (!isText(el)) continue;
		const svg = textToSVG(el.id, figure, transformer);
		if (!svg) continue;
		const sty = resolveStyle(el, figure.defaults);
		const placed = svgTextPlacement(
			svg.x,
			svg.y,
			textAnchorDirection(el.textAnchor),
			FIGURE_LABEL_FONT_PX
		);
		shapes.push({
			elementId: el.id,
			color: screenColor(sty.color),
			kind: 'label',
			x: placed.x,
			y: placed.y,
			text: svg.text,
			anchor: placed.anchor,
			baseline: 'alphabetic',
			italic: false
		});
	}

	if (!scene.frame) return { width, height, shapes };
	return {
		width,
		height,
		shapes,
		margin: scene.frame.axes ? FIGURE_AXES_MARGIN_PX : 0,
		frame: frameToSvg(scene.frame, (x, y) => transformer.mathToSvg(x, y), width, height)
	};
}
