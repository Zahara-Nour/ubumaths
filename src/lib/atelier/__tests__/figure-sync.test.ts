/**
 * Le pont `syncFigure` : l'atelier → une `Figure` de `geometry-core`, à sens
 * unique, idempotent (géométrie v2, lot 1, PR 2 — F2, F4, F5, S1, S2, S4 de
 * `docs/archive/wip/atelier-geometrie-phase0.md`).
 *
 * On asserte le DESSIN (ce que rendent les primitives SVG de la toile), pas
 * seulement les objets posés : un objet posé qui ne se dessine pas est le
 * défaut que `plot-drawable.svelte.test.ts` a déjà payé côté grapheur.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { AtelierFigure, syncFigure } from '../figure-sync';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';
import { isExplicitFunction } from '$lib/grapheur/types';
import type { Figure } from '$lib/geometry-core/graph/figure';
import type { GeoElement } from '$lib/geometry-core/types/elements';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { createTransformer } from '$lib/geometry-core/viewport/viewport';
import {
	functionToSVG,
	implicitCurveToSVG,
	lineToSVG,
	pointToSVG,
	quadraticCurveToSVG
} from '$lib/geometry-core/rendering/svg-primitives';

// =============================================================================
// Décor
// =============================================================================

const DIMS = { width: 400, height: 400 };
const TRANSFORMER = createTransformer({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, 400, 400);

type Entry = [kind: 'value' | 'function' | 'point' | 'curve', name: string, definition: string];

function atelierOf(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}

/** Les éléments VISIBLES de la figure, par nom (le nom de l'objet de l'atelier). */
function shown(figure: Figure, name: string): GeoElement | undefined {
	return figure.getAllElements().find((el) => el.visible && el.label === name);
}

/** Ce que la toile dessine pour un élément : un texte comparable, ou `null` (rien). */
function drawing(figure: Figure, el: GeoElement | undefined): string | null {
	if (el === undefined) return null;
	const svg =
		el.type === 'freePoint' || el.type === 'computedPoint'
			? pointToSVG(el.id, figure, TRANSFORMER)
			: el.type === 'line'
				? lineToSVG(el.id, figure, TRANSFORMER, DIMS)
				: el.type === 'function'
					? functionToSVG(el.id, figure, TRANSFORMER, DIMS)
					: el.type === 'quadraticCurve'
						? quadraticCurveToSVG(el.id, figure, TRANSFORMER, DIMS)
						: el.type === 'implicitCurve'
							? implicitCurveToSVG(el.id, figure, TRANSFORMER, DIMS)
							: null;
	return svg === null ? null : JSON.stringify(svg);
}

/**
 * Le dessin d'un objet (tous ses éléments visibles nommés `name`) passe-t-il
 * à `tolerance` pixels du point (x ; y) ? Lu sur les coordonnées SVG rendues.
 */
function passesNear(figure: Figure, name: string, x: number, y: number, tolerance = 2): boolean {
	const target = TRANSFORMER.mathToSvg(x, y);
	return figure
		.getAllElements()
		.filter((el) => el.visible && el.label === name)
		.some((el) => {
			const text = drawing(figure, el);
			if (text === null) return false;
			const svg: unknown = JSON.parse(text);
			if (svg !== null && typeof svg === 'object' && 'cx' in svg && 'cy' in svg) {
				return Math.hypot(Number(svg.cx) - target.x, Number(svg.cy) - target.y) <= tolerance;
			}
			const pairs = [...text.matchAll(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g)];
			return pairs.some(
				([, px, py]) => Math.hypot(Number(px) - target.x, Number(py) - target.y) <= tolerance
			);
		});
}

/** Tous les éléments visibles de la figure nommés `name` dessinent-ils quelque chose ? */
function drawnAtAll(figure: Figure, name: string): boolean {
	return figure
		.getAllElements()
		.some((el) => el.visible && el.label === name && drawing(figure, el) !== null);
}

/** Les coordonnées NUMÉRIQUES d'un point de la figure. */
function coordinates(figure: Figure, el: GeoElement | undefined): [number, number] | null {
	if (el === undefined) return null;
	const position = figure.getPosition(el.id);
	return position ? [geoToNumber(position.x), geoToNumber(position.y)] : null;
}

/** La droite de la figure passe-t-elle par (x ; y) ? */
function lineThrough(figure: Figure, el: GeoElement | undefined, x: number, y: number): boolean {
	if (el === undefined || el.type !== 'line') return false;
	const p = figure.getPosition(el.point1Id);
	const q = figure.getPosition(el.point2Id);
	if (!p || !q) return false;
	const [px, py, qx, qy] = [p.x, p.y, q.x, q.y].map(geoToNumber);
	return Math.abs((qx - px) * (y - py) - (qy - py) * (x - px)) < 1e-9;
}

function synced(atelier: Atelier): AtelierFigure {
	const target = new AtelierFigure();
	syncFigure(atelier, target);
	return target;
}

// =============================================================================
// Points
// =============================================================================

describe('syncFigure — les points', () => {
	it('P1 : A = (1 ; 2) est un point nommé A, dessiné, aux coordonnées exactes', () => {
		const { figure } = synced(atelierOf([['point', 'A', '(1 ; 2)']]));

		const point = shown(figure, 'A');
		expect(drawing(figure, point)).not.toBeNull();
		const position = figure.getPosition(point!.id)!;
		// Exact d'abord (geometry-core/CLAUDE.md, règle 10)
		expect(position.x.kind).toBe('exact');
		expect(coordinates(figure, point)).toEqual([1, 2]);
	});

	it('P3 : virgule décimale et fraction restent exactes', () => {
		const { figure } = synced(atelierOf([['point', 'B', '(1,5 ; 2/3)']]));

		const point = shown(figure, 'B');
		const position = figure.getPosition(point!.id)!;
		expect(position.y.kind).toBe('exact');
		const [x, y] = coordinates(figure, point)!;
		expect(x).toBe(1.5);
		expect(y).toBeCloseTo(2 / 3, 12);
	});

	it('F4 : un point de la figure ne se glisse pas', () => {
		const { figure } = synced(atelierOf([['point', 'A', '(1 ; 2)']]));

		const point = shown(figure, 'A');
		expect(point && 'draggable' in point && point.draggable).toBe(false);
	});
});

// =============================================================================
// Courbes
// =============================================================================

describe('syncFigure — les courbes', () => {
	it('C1 : d : y = 3x − 2 est une droite dessinée, par (0 ; −2) et (1 ; 1)', () => {
		const { figure } = synced(atelierOf([['curve', 'd', 'y = 3x - 2']]));

		const line = shown(figure, 'd');
		expect(line?.type).toBe('line');
		expect(drawing(figure, line)).not.toBeNull();
		expect(lineThrough(figure, line, 0, -2)).toBe(true);
		expect(lineThrough(figure, line, 1, 1)).toBe(true);
	});

	it('C7 : d : 2y = 6x − 4 donne le même tracé que C1', () => {
		const first = synced(atelierOf([['curve', 'd', 'y = 3x - 2']]));
		const second = synced(atelierOf([['curve', 'd', '2y = 6x - 4']]));

		expect(drawing(second.figure, shown(second.figure, 'd'))).toBe(
			drawing(first.figure, shown(first.figure, 'd'))
		);
	});

	it('C3 : v : x = 2 est une droite verticale', () => {
		const { figure } = synced(atelierOf([['curve', 'v', 'x = 2']]));

		const line = shown(figure, 'v');
		expect(lineThrough(figure, line, 2, 0)).toBe(true);
		expect(lineThrough(figure, line, 2, 7)).toBe(true);
	});

	it('C2 : C : x² + y² = 1 est un cercle de rayon 1, dessiné', () => {
		const { figure } = synced(atelierOf([['curve', 'C', 'x^2 + y^2 = 1']]));

		const circle = shown(figure, 'C');
		expect(circle?.type === 'quadraticCurve' && circle.conic.type).toBe('circle');
		expect(circle?.type === 'quadraticCurve' && circle.conic.a).toBeCloseTo(1, 12);
		expect(drawing(figure, circle)).not.toBeNull();
	});

	it('un cercle écrit avec son centre est dessiné comme un cercle', () => {
		const { figure } = synced(atelierOf([['curve', 'C', '(x - 1)^2 + (y - 2)^2 = 4']]));

		const circle = shown(figure, 'C');
		expect(circle?.type === 'quadraticCurve' && circle.conic.type).toBe('circle');
	});

	it('une courbe implicite (y² = x³ − x) est dessinée', () => {
		const { figure } = synced(atelierOf([['curve', 'K', 'y^2 = x^3 - x']]));

		const curve = shown(figure, 'K');
		expect(curve?.type).toBe('implicitCurve');
		expect(drawing(figure, curve)).not.toBeNull();
	});

	it('y = sin(x) est une courbe y = f(x), dessinée', () => {
		const { figure } = synced(atelierOf([['curve', 's', 'y = sin(x)']]));

		const curve = shown(figure, 's');
		expect(curve?.type).toBe('function');
		expect(drawing(figure, curve)).not.toBeNull();
	});

	it('x² = 4 (deux droites) est dessinée', () => {
		const { figure } = synced(atelierOf([['curve', 'D', 'x^2 = 4']]));

		expect(drawing(figure, shown(figure, 'D'))).not.toBeNull();
	});

	it('C6 : une courbe vide (x² + y² = −1) ne dessine rien, sans erreur', () => {
		const { figure } = synced(atelierOf([['curve', 'C', 'x^2 + y^2 = -1']]));

		expect(drawing(figure, shown(figure, 'C'))).toBeNull();
	});

	it('C5 : la tangente T : y = f′(2)(x − 2) + f(2) suit f', () => {
		const atelier = atelierOf([
			['function', 'f', 'x^2'],
			['curve', 'T', "y = f'(2)(x - 2) + f(2)"]
		]);
		const target = synced(atelier);
		expect(lineThrough(target.figure, shown(target.figure, 'T'), 2, 4)).toBe(true);
		expect(lineThrough(target.figure, shown(target.figure, 'T'), 3, 8)).toBe(true);

		atelier.update('f', 'x^3', 'text');
		syncFigure(atelier, target);

		expect(lineThrough(target.figure, shown(target.figure, 'T'), 2, 8)).toBe(true);
		expect(lineThrough(target.figure, shown(target.figure, 'T'), 3, 20)).toBe(true);
	});
});

// =============================================================================
// F5 : erreur, attente
// =============================================================================

describe('syncFigure — F5 : un objet qui ne peut rien produire n’est pas dessiné', () => {
	it('une courbe en attente de b n’est pas dessinée ; b créé, elle apparaît', () => {
		const atelier = atelierOf([['curve', 'C', 'x^2 + y^2 = b^2']]);
		expect(atelier.get('C')?.status).toBe('pending');
		const target = synced(atelier);
		expect(shown(target.figure, 'C')).toBeUndefined();

		atelier.create({ kind: 'value', name: 'b', definition: '2' }, 'text');
		syncFigure(atelier, target);

		expect(drawing(target.figure, shown(target.figure, 'C'))).not.toBeNull();
	});

	it('une courbe en erreur n’est pas dessinée', () => {
		const atelier = atelierOf([['curve', 'd', 'y = 3x +']]);
		expect(atelier.get('d')?.status).toBe('error');

		const { figure } = synced(atelier);

		expect(shown(figure, 'd')).toBeUndefined();
	});

	it('un point en attente n’est pas dessiné', () => {
		const atelier = atelierOf([['point', 'M', '(k ; 1)']]);
		expect(atelier.get('M')?.status).toBe('pending');

		const { figure } = synced(atelier);

		expect(shown(figure, 'M')).toBeUndefined();
	});

	it('les autres objets de l’atelier (valeur, fonction) ne vont pas dans la figure', () => {
		const { figure } = synced(
			atelierOf([
				['value', 'a', '2'],
				['function', 'f', 'x^2']
			])
		);

		expect(figure.getAllElements().filter((el) => el.visible)).toEqual([]);
	});
});

// =============================================================================
// Idempotence, sens unique
// =============================================================================

describe('syncFigure — idempotent, à sens unique', () => {
	it('deux synchronisations sans changement : la seconde ne fait rien', () => {
		const atelier = atelierOf([
			['point', 'A', '(1 ; 2)'],
			['curve', 'd', 'y = 3x - 2']
		]);
		const target = new AtelierFigure();

		expect(syncFigure(atelier, target)).toBe('rebuilt');
		const figure = target.figure;
		expect(syncFigure(atelier, target)).toBe('unchanged');
		expect(target.figure).toBe(figure);
	});

	it('une définition changée refait la figure', () => {
		const atelier = atelierOf([['curve', 'd', 'y = 3x - 2']]);
		const target = synced(atelier);

		atelier.update('d', 'y = -x', 'text');

		expect(syncFigure(atelier, target)).toBe('rebuilt');
		expect(lineThrough(target.figure, shown(target.figure, 'd'), 1, -1)).toBe(true);
	});

	it('F4 : rien ne remonte vers l’atelier', () => {
		const atelier = atelierOf([
			['value', 'a', '2'],
			['point', 'M', '(a ; 1)']
		]);
		const before = atelier.revision;
		const target = synced(atelier);
		target.figure.moveSlider(target.sliderOf('a')!, 5);
		target.figure.recompute();
		syncFigure(atelier, target);

		expect(atelier.revision).toBe(before);
		expect(atelier.get('a')?.definition).toBe('2');
	});
});

// =============================================================================
// Curseurs partagés (S1, S2, S4)
// =============================================================================

describe('syncFigure — les curseurs partagés', () => {
	it('S4 : une valeur citée devient un curseur CACHÉ, aux bornes de sa carte', () => {
		const atelier = atelierOf([
			['value', 'a', '2'],
			['point', 'M', '(a ; 2a)']
		]);
		atelier.setSlider('a', { min: 0, max: 5 });
		const target = synced(atelier);

		const id = target.sliderOf('a');
		const slider = id === undefined ? undefined : target.figure.getElementById(id);
		expect(slider?.type).toBe('slider');
		expect(slider?.visible).toBe(false);
		expect(slider?.type === 'slider' && [slider.min, slider.max, slider.value]).toEqual([0, 5, 2]);
	});

	it('S2 : glisser a ne reconstruit pas la figure ; seuls les descendants de a bougent', () => {
		const atelier = atelierOf([
			['value', 'a', '2'],
			['curve', 'C', 'x^2 + y^2 = a^2'],
			['point', 'M', '(a ; 2a)'],
			['point', 'A', '(1 ; 1)']
		]);
		const target = synced(atelier);
		const figure = target.figure;
		const circleBefore = drawing(figure, shown(figure, 'C'));
		const positionOfA = figure.getPosition(shown(figure, 'A')!.id);

		atelier.slideTo('a', 3);

		expect(syncFigure(atelier, target)).toBe('moved');
		expect(target.figure).toBe(figure);
		expect(coordinates(figure, shown(figure, 'M'))).toEqual([3, 6]);
		const circle = shown(figure, 'C');
		expect(circle?.type === 'quadraticCurve' && circle.conic.a).toBeCloseTo(3, 12);
		expect(drawing(figure, circle)).not.toBe(circleBefore);
		// A ne dépend pas de a : sa position n'a pas été recalculée (même objet)
		expect(figure.getPosition(shown(figure, 'A')!.id)).toBe(positionOfA);
	});

	it('S2 : une valeur calculée (b = 2a) suit a, sans reconstruire', () => {
		const atelier = atelierOf([
			['value', 'a', '2'],
			['value', 'b', '2a'],
			['point', 'M', '(b ; 0)']
		]);
		const target = synced(atelier);

		atelier.slideTo('a', 3);

		expect(syncFigure(atelier, target)).toBe('moved');
		expect(coordinates(target.figure, shown(target.figure, 'M'))).toEqual([6, 0]);
	});

	it('une droite, une courbe y = f(x) et une courbe implicite suivent le curseur', () => {
		const atelier = atelierOf([
			['value', 'a', '2'],
			['curve', 'd', 'y = a x + 1'],
			['curve', 'P', 'y = a x^2'],
			['curve', 'K', 'y^2 = x^3 - a x']
		]);
		const target = synced(atelier);
		const { figure } = target;
		const before = ['P', 'K'].map((name) => drawing(figure, shown(figure, name)));
		expect(before.every((d) => d !== null)).toBe(true);
		expect(lineThrough(figure, shown(figure, 'd'), 1, 3)).toBe(true);

		atelier.slideTo('a', 3);
		expect(syncFigure(atelier, target)).toBe('moved');

		expect(lineThrough(figure, shown(figure, 'd'), 1, 4)).toBe(true);
		// Le tracé est JUSTE pour a = 3 : y = 3x² passe par (1 ; 3) ; y² = x³ − 3x par (2 ; √2)
		expect(passesNear(figure, 'P', 1, 3)).toBe(true);
		expect(passesNear(figure, 'P', 1, 2)).toBe(false);
		expect(passesNear(figure, 'K', 2, Math.SQRT2)).toBe(true);
		expect(passesNear(figure, 'K', 2, 0, 4)).toBe(false);
	});

	it('S1 : glisser a change en même temps la parabole du Graphe et le cercle de la Figure', () => {
		const atelier = atelierOf([
			['value', 'a', '2'],
			['function', 'f', 'a x^2'],
			['curve', 'C', 'x^2 + y^2 = a^2']
		]);
		atelier.setPlotted('f', true);
		const graph = new GrapheurStore(null);
		const target = new AtelierFigure();
		syncPlots(atelier, graph);
		syncFigure(atelier, target);

		atelier.slideTo('a', 3);
		syncPlots(atelier, graph);
		syncFigure(atelier, target);

		const parabola = graph.functions[0];
		expect(isExplicitFunction(parabola) && parabola.latex).toContain('3');
		const circle = shown(target.figure, 'C');
		expect(circle?.type === 'quadraticCurve' && circle.conic.a).toBeCloseTo(3, 12);
	});

	it('changer les bornes du curseur refait la figure à ces bornes (S4)', () => {
		const atelier = atelierOf([
			['value', 'a', '2'],
			['point', 'M', '(a ; 0)']
		]);
		const target = synced(atelier);

		atelier.setSlider('a', { max: 50 });

		expect(syncFigure(atelier, target)).toBe('rebuilt');
		const slider = target.figure.getElementById(target.sliderOf('a')!);
		expect(slider?.type === 'slider' && slider.max).toBe(50);
	});
});

// =============================================================================
// Le repère (G4, F3) : un réglage de l'atelier, hors sauvegarde
// =============================================================================

describe('le réglage « Repère »', () => {
	it('F3 : affiché par défaut, se masque, et ne se range pas', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		expect(atelier.figureFrame).toBe(true);

		const stored = JSON.stringify(atelier.serialize());
		atelier.setFigureFrame(false);

		expect(atelier.figureFrame).toBe(false);
		expect(JSON.stringify(atelier.serialize())).toBe(stored);
	});
});

// =============================================================================
// Revue de la PR 2
// =============================================================================

describe('syncFigure — retours de revue', () => {
	it('une conique à curseur reclassée en deux droites se dessine : x² = a, a = 4', () => {
		const target = synced(
			atelierOf([
				['value', 'a', '4'],
				['curve', 'K', 'x^2 = a']
			])
		);

		expect(passesNear(target.figure, 'K', 2, 0)).toBe(true);
		expect(passesNear(target.figure, 'K', -2, 3)).toBe(true);
	});

	it('x² − y² = a glissé à 0 dessine les deux droites y = ±x', () => {
		const atelier = atelierOf([
			['value', 'a', '1'],
			['curve', 'H', 'x^2 - y^2 = a']
		]);
		const target = synced(atelier);
		expect(drawnAtAll(target.figure, 'H')).toBe(true);

		atelier.slideTo('a', 0);
		syncFigure(atelier, target);

		expect(passesNear(target.figure, 'H', 3, 3)).toBe(true);
		expect(passesNear(target.figure, 'H', 3, -3)).toBe(true);
	});

	it('y = 1/x, y = (x + 1)/(x − 1), y = 1/x + a restent des courbes y = f(x), comme dans courbe()', () => {
		const target = synced(
			atelierOf([
				['value', 'a', '1'],
				['curve', 'f', 'y = 1/x'],
				['curve', 'g', 'y = (x+1)/(x-1)'],
				['curve', 'h', 'y = 1/x + a']
			])
		);

		for (const name of ['f', 'g', 'h']) expect(shown(target.figure, name)?.type).toBe('function');
		expect(passesNear(target.figure, 'f', 2, 0.5)).toBe(true);
		expect(passesNear(target.figure, 'h', 2, 1.5)).toBe(true);
	});

	it('la tangente développée reste une droite (C5 : y = 4(x − 2) + 4)', () => {
		const target = synced(atelierOf([['curve', 'T', 'y = 4(x - 2) + 4']]));

		expect(shown(target.figure, 'T')?.type).toBe('line');
	});

	it('point isolé : x² + y² = 0 dessine le point (0 ; 0)', () => {
		const target = synced(atelierOf([['curve', 'C', 'x^2 + y^2 = 0']]));

		expect(passesNear(target.figure, 'C', 0, 0)).toBe(true);
		expect(passesNear(target.figure, 'C', 1, 0)).toBe(false);
	});

	it('droite double : x² + 2xy + y² = 0 et x² = 0 dessinent leur droite', () => {
		const target = synced(
			atelierOf([
				['curve', 'D', 'x^2 + 2x y + y^2 = 0'],
				['curve', 'E', 'x^2 = 0']
			])
		);

		expect(lineThrough(target.figure, shown(target.figure, 'D'), 1, -1)).toBe(true);
		expect(lineThrough(target.figure, shown(target.figure, 'D'), -3, 3)).toBe(true);
		expect(lineThrough(target.figure, shown(target.figure, 'E'), 0, 5)).toBe(true);
	});

	it('x² + y² = a² glissé à 0 dessine le point (0 ; 0), puis le cercle à a = 2', () => {
		const atelier = atelierOf([
			['value', 'a', '1'],
			['curve', 'C', 'x^2 + y^2 = a^2']
		]);
		const target = synced(atelier);

		atelier.slideTo('a', 0);
		syncFigure(atelier, target);
		expect(passesNear(target.figure, 'C', 0, 0)).toBe(true);

		atelier.slideTo('a', 2);
		syncFigure(atelier, target);
		expect(passesNear(target.figure, 'C', 0, 0)).toBe(false);
		expect(passesNear(target.figure, 'C', 2, 0)).toBe(true);
	});

	it('une valeur hors des bornes de son curseur (a = 10¹⁰) : rien de dessiné, et pas de boucle', () => {
		const atelier = atelierOf([
			['value', 'a', '10000000000'],
			['point', 'M', '(a ; 0)']
		]);
		const target = new AtelierFigure();
		syncFigure(atelier, target);

		expect(shown(target.figure, 'M')).toBeUndefined();
		expect(syncFigure(atelier, target)).toBe('unchanged');
	});

	it('une pose qui échoue à mi-chemin ne laisse aucune aide cachée dans la figure', () => {
		const atelier = atelierOf([
			['value', 'a', '2'],
			['point', 'M', '(2a ; a!)']
		]);
		const target = synced(atelier);

		expect(target.elementOf('M')).toBeUndefined();
		// Seul reste le curseur caché de a
		expect(target.figure.getAllElements().map((el) => el.type)).toEqual(['slider']);
	});
});
