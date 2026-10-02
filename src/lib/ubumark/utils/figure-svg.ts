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
	  })
	| (ShapeBase & { kind: 'path'; d: string; width: number; dash: string; fill: string | null })
	| (ShapeBase & {
			kind: 'polygon';
			points: string;
			width: number;
			dash: string;
			fill: string | null;
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

export interface FigureSvg {
	width: number;
	height: number;
	shapes: FigureShape[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Largeur à l'écran par taille, en px (comme ```courbe) ; la hauteur suit (isotrope). */
export const FIGURE_PIXEL_WIDTH: Record<FigureSize, number> = {
	petite: 280,
	moyenne: 400,
	grande: 560
};

/**
 * Taille des noms et textes à l'écran, en px : DOIT valoir le `font-size` de
 * `.figure-etiquette` (`FigureBlockView.svelte`) — le placement en dépend.
 */
export const FIGURE_LABEL_FONT_PX = 13;

/** Couleur par défaut des objets (noire au PDF) : couleur du texte à l'écran, claire ou sombre. */
const SCREEN_DEFAULT_COLOR = 'var(--color-foreground)';

// ============================================================================
// FORMES
// ============================================================================

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
				shapes.push({ ...base, ...stroke, kind: 'circle', ...svg, fill: fillOf(sty.fillColor) });
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
			shapes.push({ ...base, ...stroke, kind: 'polygon', points, fill: fillOf(sty.fillColor) });
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

	return { width, height, shapes };
}
