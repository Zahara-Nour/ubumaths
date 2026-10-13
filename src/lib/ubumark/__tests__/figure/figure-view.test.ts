/**
 * Fenêtre ↔ vue de la toile interactive (figures stockées, futur bloc
 * ```figure interactif) : mêmes mesures que le rendu statique (largeur selon
 * la taille, repère isotrope, marge des axes), bornée par le conteneur.
 */
import { describe, it, expect } from 'vitest';
import {
	FIGURE_DEFAULT_PIXELS_PER_UNIT,
	figureViewFromWindow,
	formatFigureWindow,
	windowFromCanvasView
} from '../../utils/figure-view';
import { FIGURE_AXES_MARGIN_PX, FIGURE_PIXEL_WIDTH, FIGURE_SIZES } from '../../types/figure';
import { parseFigureContent } from '../../parser/figure-parser';

const WINDOW = { xMin: -1, xMax: 9, yMin: -2, yMax: 3 };

/** Vue de la toile (centre, échelle, taille) en coordonnées mathématiques */
function viewportOf(view: ReturnType<typeof figureViewFromWindow>) {
	const halfW = view.width / (2 * view.pixelsPerUnit);
	const halfH = view.height / (2 * view.pixelsPerUnit);
	return {
		xMin: view.center.x - halfW,
		xMax: view.center.x + halfW,
		yMin: view.center.y - halfH,
		yMax: view.center.y + halfH
	};
}

describe('figureViewFromWindow', () => {
	it.each(FIGURE_SIZES)('taille %s : largeur de la taille, hauteur isotrope, centre', (size) => {
		const view = figureViewFromWindow(WINDOW, size, { axes: false });
		const width = FIGURE_PIXEL_WIDTH[size];
		expect(view.width).toBe(width);
		expect(view.height).toBe(Math.round(width / 2));
		expect(view.pixelsPerUnit).toBeCloseTo(width / 10);
		expect(view.center).toEqual({ x: 4, y: 0.5 });
		expect(view.margin).toBe(0);
	});

	it('valeurs exactes : petite 280, moyenne 400, grande 560 px', () => {
		expect(FIGURE_SIZES.map((s) => figureViewFromWindow(WINDOW, s, { axes: false }).width)).toEqual(
			[280, 400, 560]
		);
	});

	it('axes : la marge s’ajoute autour, la fenêtre garde sa largeur', () => {
		const view = figureViewFromWindow(WINDOW, 'moyenne', { axes: true });
		expect(view.margin).toBe(FIGURE_AXES_MARGIN_PX);
		expect(view.width).toBe(400 + 2 * FIGURE_AXES_MARGIN_PX);
		expect(view.height).toBe(200 + 2 * FIGURE_AXES_MARGIN_PX);
		expect(view.pixelsPerUnit).toBeCloseTo(40);
	});

	it('conteneur plus étroit (téléphone) : la toile tient, même fenêtre', () => {
		const view = figureViewFromWindow(WINDOW, 'grande', { axes: true, maxWidth: 300 });
		expect(view.width).toBeLessThanOrEqual(300);
		const inner = view.width - 2 * view.margin;
		expect(view.pixelsPerUnit).toBeCloseTo(inner / 10);
		expect(view.center).toEqual({ x: 4, y: 0.5 });
	});

	it('conteneur plus large : la taille ne grandit pas', () => {
		expect(figureViewFromWindow(WINDOW, 'petite', { axes: false, maxWidth: 2000 }).width).toBe(280);
	});

	it('sans fenêtre : origine au centre, 40 px par unité, toile carrée', () => {
		const view = figureViewFromWindow(null, 'moyenne', { axes: false });
		expect(view).toEqual({
			center: { x: 0, y: 0 },
			pixelsPerUnit: FIGURE_DEFAULT_PIXELS_PER_UNIT,
			width: 400,
			height: 400,
			margin: 0
		});
	});
});

describe('windowFromCanvasView', () => {
	it.each(FIGURE_SIZES)('aller-retour fenêtre → vue → fenêtre (taille %s, axes)', (size) => {
		const view = figureViewFromWindow(WINDOW, size, { axes: true });
		expect(windowFromCanvasView(viewportOf(view), view.pixelsPerUnit, view.margin)).toEqual(WINDOW);
	});

	it('arrondi à 3 chiffres significatifs de l’étendue', () => {
		expect(
			windowFromCanvasView({ xMin: -1.23456, xMax: 10.98765, yMin: -3.14159, yMax: 2.71828 }, 40, 0)
		).toEqual({ xMin: -1.2, xMax: 11, yMin: -3.1, yMax: 2.7 });
		expect(
			windowFromCanvasView({ xMin: 0.123456, xMax: 1.234567, yMin: 0, yMax: 1.0004 }, 400, 0)
		).toEqual({ xMin: 0.12, xMax: 1.23, yMin: 0, yMax: 1 });
	});

	it('la fenêtre écrite est relue par le parseur sans erreur', () => {
		const view = figureViewFromWindow(WINDOW, 'moyenne', { axes: false });
		const vp = viewportOf(view);
		// Vue déplacée et zoomée à la main
		const moved = {
			xMin: vp.xMin + 0.37,
			xMax: vp.xMax - 1.11,
			yMin: vp.yMin + 0.4,
			yMax: vp.yMax - 0.15
		};
		const text = `fenetre: ${formatFigureWindow(windowFromCanvasView(moved, 47.3, 0))}\n---\n`;
		expect(parseFigureContent(text, { interactive: true }).errors).toEqual([]);
	});

	it('pas de -0', () => {
		const w = windowFromCanvasView({ xMin: -0.0001, xMax: 10, yMin: -5, yMax: 5 }, 40, 0);
		expect(Object.is(w.xMin, -0)).toBe(false);
		expect(formatFigureWindow(w)).toBe('0 ; 10 ; -5 ; 5');
	});
});
