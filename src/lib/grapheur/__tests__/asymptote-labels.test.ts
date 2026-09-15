/**
 * Placement des étiquettes d'asymptotes.
 *
 * Extrait du composant pour être testable : le défaut qui a motivé ce fichier
 * — aucune étiquette visible dans le viewport par défaut — était invisible
 * depuis les tests, et je ne l'avais pas vu en vérifiant à la main parce que
 * j'avais choisi mes propres cadrages.
 */

import { describe, it, expect } from 'vitest';
import { placeAsymptoteLabels } from '../asymptote-labels';
import type { FunctionAnalysis } from '../types';
import { DEFAULT_VIEWPORT, createTransformer } from '$lib/geometry-core/viewport';

const SIZE = { width: 600, height: 600 };
const transformer = createTransformer(DEFAULT_VIEWPORT, SIZE.width, SIZE.height);

function analysisOf(partial: Partial<FunctionAnalysis>): FunctionAnalysis {
	return {
		functionId: 'f',
		roots: [],
		extrema: [],
		verticalAsymptotes: [],
		horizontalAsymptotes: [],
		obliqueAsymptotes: [],
		polynomialAsymptotes: [],
		...partial
	};
}

describe('placeAsymptoteLabels', () => {
	it('place une étiquette pour chaque asymptote courbe du viewport par défaut', () => {
		// Les cinq cas que les tests de détection figent. Avec un ancrage fixe
		// aux deux tiers de la branche, TOUS tombaient hors cadre.
		// Seules les asymptotes qui TRAVERSENT le cadre méritent une étiquette :
		// y = x² + 20x + 400 vaut au minimum 300, elle est hors champ et ne doit
		// rien afficher — c'est testé plus bas.
		const courbes = [
			[0, 0, 1], // y = x²
			[2, 3, 1] // y = x² + 3x + 2
		];

		for (const coefficients of courbes) {
			const labels = placeAsymptoteLabels(
				analysisOf({
					polynomialAsymptotes: [{ coefficients, functionId: 'f', direction: 'both' }]
				}),
				transformer,
				SIZE
			);
			expect(labels.length, `y = [${coefficients}]`).toBe(1);
			expect(labels[0].y).toBeGreaterThanOrEqual(0);
			expect(labels[0].y).toBeLessThanOrEqual(SIZE.height);
		}
	});

	it('place une étiquette pour une oblique raide', () => {
		for (const [m, b] of [
			[1, 5],
			[5, 0]
		]) {
			const labels = placeAsymptoteLabels(
				analysisOf({ obliqueAsymptotes: [{ m, b, functionId: 'f', direction: 'both' }] }),
				transformer,
				SIZE
			);
			expect(labels.length, `y = ${m}x + ${b}`).toBe(1);
		}
	});

	it('ne superpose pas les étiquettes de pôles voisins', () => {
		// tan(x) a un pôle tous les π. Une ordonnée d'ancrage constante les
		// empilait en escalier dans le coin, loin de leurs pôles.
		const labels = placeAsymptoteLabels(
			analysisOf({
				verticalAsymptotes: [-7.85, -4.71, -1.57, 1.57, 4.71, 7.85].map((x) => ({
					x,
					functionId: 'f',
					behavior: 'both' as const
				}))
			}),
			transformer,
			SIZE
		);

		expect(labels.length).toBe(6);

		// Les pôles éloignés ne s'empilent plus : seuls ceux qui se recouvrent
		// vraiment (94 px d'écart pour des boîtes de 120) se décalent. Avant, la
		// bande ignorait l'abscisse et les six descendaient en escalier depuis
		// le coin, quelle que soit leur distance.
		const rows = labels.map((label) => Math.round(label.y / 22));
		expect(new Set(rows).size).toBeLessThanOrEqual(3);
		expect(Math.max(...rows) - Math.min(...rows)).toBeLessThan(5);
	});

	it('sépare les étiquettes de deux fonctions qui partagent une asymptote', () => {
		// 1/x et 2/x ont toutes deux y = 0 : les boîtes se posaient l'une sur
		// l'autre, chaque analyse repartant d'un placement vierge.
		const shared = (id: string): FunctionAnalysis =>
			analysisOf({
				functionId: id,
				horizontalAsymptotes: [{ y: 0, functionId: id, direction: 'both' }]
			});

		const labels = placeAsymptoteLabels([shared('f'), shared('g')], transformer, SIZE);
		expect(labels.length).toBe(2);
		expect(labels[0].y).not.toBe(labels[1].y);
	});
});

describe('asymptote hors du cadre', () => {
	it("n'étiquette pas ce qui ne se voit pas", () => {
		// y = x² + 20x + 400 a pour minimum 300 : invisible dans le viewport
		// par défaut. Une étiquette y serait un libellé sans trait.
		const labels = placeAsymptoteLabels(
			analysisOf({
				polynomialAsymptotes: [{ coefficients: [400, 20, 1], functionId: 'f', direction: 'both' }]
			}),
			transformer,
			SIZE
		);
		expect(labels).toEqual([]);
	});
});
