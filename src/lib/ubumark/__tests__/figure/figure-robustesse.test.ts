/**
 * Bloc ```figure — entrées hostiles (Q56 : rendu dans le chat élève et le
 * tableau blanc). Toute la chaîne (analyse + scène) a un budget borné : aucune
 * entrée ne doit figer l'onglet. Seuil : 200 ms par bloc.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { FIGURE_LIMITS } from '../../types/figure';

const HEADER = 'fenetre: -10 ; 10 ; -10 ; 10\n---\n';

function timed(body: string) {
	const start = performance.now();
	const result = buildFigureScene(parseFigureContent(HEADER + body));
	return { result, ms: performance.now() - start };
}

const HOSTILE: Array<[string, string]> = [
	[
		'trois boucles imbriquées (10^9 tours)',
		'pour i de 1 a 1000:\n    pour j de 1 a 1000:\n        pour k de 1 a 1000:\n            x = 1'
	],
	[
		'boucles imbriquées qui créent des points',
		'pour i de 1 a 1000:\n    pour j de 1 a 1000:\n        point(i, j)'
	],
	['polygone régulier à 10^7 sommets', 'O = point(0, 0)\np = polygone_regulier(O, 1, 10000000)'],
	['étoile à 10^7 branches', 'O = point(0, 0)\np = etoile(O, 1, 10000000)'],
	[
		'macro récursive en arbre',
		'macro f(n):\n    si n > 0:\n        f(n - 1)\n        f(n - 1)\n    retourne n\nf(30)'
	],
	[
		'codage à 10^8 traits',
		'A = point(0, 0)\nB = point(1, 0)\nmarque_segment(A, B, traits=100000000)'
	],
	['script démesuré', 'A = point(0, 0)\n'.repeat(5000)],
	['ligne démesurée', `x = ${'1+'.repeat(100000)}1`]
];

describe('figure — budget borné (entrées hostiles)', () => {
	it.each(HOSTILE)('%s : refusé en moins de 200 ms, message pour le prof', (_label, body) => {
		const { result, ms } = timed(body);
		expect(ms).toBeLessThan(200);
		expect(result.scene).toBeNull();
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('les plafonds sont raisonnables pour une figure de classe', () => {
		expect(FIGURE_LIMITS.elements).toBeGreaterThanOrEqual(200);
		expect(FIGURE_LIMITS.steps).toBeGreaterThanOrEqual(2000);
	});

	it('une figure riche mais légitime passe sous les plafonds', () => {
		const body = [
			'O = point(0, 0)',
			'pour i de 1 a 12:',
			'    P[i] = point(5*cos(30*i), 5*sin(30*i))',
			'p = polygone_regulier(O, 3, 12)',
			'c = cercle(O, rayon=5)'
		].join('\n');
		const { result, ms } = timed(body);
		expect(result.errors).toEqual([]);
		expect(ms).toBeLessThan(200);
	});
});
