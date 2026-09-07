/**
 * Tests des intersections entre courbes.
 *
 * Le calcul délègue à `findRoots` de mathAST — exact d'abord, numérique
 * ensuite — au lieu de sa propre bissection : une tangence dont l'abscisse ne
 * tombe pas sur un point d'échantillonnage était totalement invisible.
 *
 * @module grapheur/__tests__/intersections
 */

import { describe, expect, it } from 'vitest';
import { findAllIntersections, deduplicateIntersections } from '../intersections';
import type { IntersectionResult } from '../intersections';
import { toAnalysisInputs } from '../analysis';
import { parseFunction } from '../evaluator';
import type { ExplicitFunction, Viewport } from '../types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function curve(latex: string, id = latex): ExplicitFunction {
	const parsed = parseFunction(latex);

	return {
		id,
		type: 'explicit',
		latex,
		ast: parsed.ast ?? undefined,
		parseError: parsed.error ?? undefined,
		variable: 'x',
		color: '#0000ff',
		visible: true,
		lineWidth: 2,
		lineStyle: 'solid'
	};
}

function intersectionsOf(...latexes: string[]) {
	return findAllIntersections(toAnalysisInputs(latexes.map((l) => curve(l))), viewport);
}

function abscissas(results: IntersectionResult[]): number[] {
	return results.map((r) => r.point.x).sort((a, b) => a - b);
}

describe('findAllIntersections', () => {
	it('trouve les deux intersections de x² et x', () => {
		const found = intersectionsOf('x^2', 'x');

		expect(abscissas(found)).toHaveLength(2);
		expect(abscissas(found)[0]).toBeCloseTo(0);
		expect(abscissas(found)[1]).toBeCloseTo(1);
	});

	it('renvoie aussi l’ordonnée du point', () => {
		const [first] = intersectionsOf('x^2', 'x').filter((r) => Math.abs(r.point.x - 1) < 1e-6);

		expect(first.point.y).toBeCloseTo(1);
	});

	it('nomme les deux courbes concernées', () => {
		const found = intersectionsOf('x^2', 'x');

		expect(found[0].functionIds).toEqual(['x^2', 'x']);
	});

	it('traite toutes les paires de trois courbes', () => {
		const found = intersectionsOf('x', '-x', 'x+2');

		// x ∩ -x en 0, x ∩ x+2 jamais, -x ∩ x+2 en -1.
		expect(abscissas(found)).toHaveLength(2);
	});

	it('trouve une tangence dont l’abscisse n’est pas échantillonnée', () => {
		// x² et 0,1x − 0,0025 sont tangentes en 0,05 : la bissection par
		// changement de signe ne voyait rien, faute de changement de signe, et
		// 0,05 ne tombe sur aucun des 200 points de balayage.
		const found = intersectionsOf('x^2', '0.1x-0.0025');

		expect(abscissas(found)).toHaveLength(1);
		expect(abscissas(found)[0]).toBeCloseTo(0.05, 6);
	});

	it('rend une abscisse exacte là où le numérique approchait', () => {
		const found = intersectionsOf('x^2', '2');

		expect(abscissas(found)[1]).toBeCloseTo(Math.SQRT2, 12);
	});

	it('ne renvoie rien pour deux courbes sans intersection', () => {
		expect(intersectionsOf('x^2', 'x^2+1')).toEqual([]);
	});

	it('ne renvoie rien pour une seule courbe', () => {
		expect(intersectionsOf('x^2')).toEqual([]);
	});

	it('exclut une intersection hors de la fenêtre en ordonnée', () => {
		// x² et 20 se croisent en ±√20 ≈ ±4,47, mais y = 20 sort de la fenêtre.
		expect(intersectionsOf('x^2', '20')).toEqual([]);
	});

	it('exclut une intersection hors de la fenêtre en abscisse', () => {
		// x et x−0 : confondues ; on prend plutôt un croisement lointain.
		const found = findAllIntersections(toAnalysisInputs([curve('x^2'), curve('225')]), viewport);

		expect(found).toEqual([]);
	});

	it('ignore une paire dont une expression est invalide', () => {
		const found = findAllIntersections(
			toAnalysisInputs([curve('x^2'), curve(')('), curve('x')]),
			viewport
		);

		expect(abscissas(found)).toHaveLength(2);
	});
});

describe('deduplicateIntersections', () => {
	const at = (x: number, y: number): IntersectionResult => ({
		point: { x, y },
		functionIds: ['a', 'b'] as const
	});

	it('fusionne deux points trop proches', () => {
		expect(deduplicateIntersections([at(1, 1), at(1.0001, 1.0001)])).toHaveLength(1);
	});

	it('garde deux points distincts', () => {
		expect(deduplicateIntersections([at(1, 1), at(2, 2)])).toHaveLength(2);
	});

	it('respecte une tolérance donnée', () => {
		expect(deduplicateIntersections([at(1, 1), at(1.05, 1.05)], 0.1)).toHaveLength(1);
	});

	it('conserve le premier de deux doublons', () => {
		const [kept] = deduplicateIntersections([at(1, 1), at(1.0001, 1.0001)]);

		expect(kept.point.x).toBe(1);
	});

	it('accepte un tableau vide', () => {
		expect(deduplicateIntersections([])).toEqual([]);
	});
});
