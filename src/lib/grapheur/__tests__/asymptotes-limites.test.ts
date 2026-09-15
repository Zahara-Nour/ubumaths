/**
 * Asymptotes horizontales, obliques et courbes.
 *
 * Trois défauts mesurés le 2026-09-15 :
 * - `estimateLimit` exigeait que les écarts rétrécissent STRICTEMENT, or une
 *   convergence exacte donne des écarts nuls et `0 >= 0 × 0,9` est vrai : une
 *   limite atteinte au flottant près était rejetée ;
 * - l'ordonnée à l'origine d'une oblique se calculait par `f(x) − m·x` avec un
 *   `m` estimé, dont l'erreur est multipliée par x (jusqu'à 100 000) ;
 * - les asymptotes courbes n'existaient pas.
 */

import { describe, it, expect } from 'vitest';
import {
	findHorizontalAsymptotes,
	findObliqueAsymptotes,
	findPolynomialAsymptotes
} from '../analysis';

describe('asymptotes horizontales', () => {
	it('trouve une limite atteinte exactement', () => {
		// exp(-x) vaut 0 au flottant près : les écarts entre sondes sont NULS.
		const found = findHorizontalAsymptotes((x) => Math.exp(x), 'f');

		expect(found.length).toBe(1);
		expect(found[0].y).toBeCloseTo(0, 6);
		expect(found[0].direction).toBe('left');
	});

	it("trouve les deux paliers d'une sigmoïde", () => {
		const found = findHorizontalAsymptotes((x) => 1 / (1 + Math.exp(-x)), 'f');
		const levels = found.map((a) => a.y).sort((a, b) => a - b);

		expect(found.length).toBe(2);
		expect(levels[0]).toBeCloseTo(0, 6);
		expect(levels[1]).toBeCloseTo(1, 6);
	});

	it('garde les cas qui marchaient déjà', () => {
		const inverse = findHorizontalAsymptotes((x) => (x === 0 ? null : 1 / x), 'f');
		expect(inverse.length).toBe(1);
		expect(inverse[0].y).toBeCloseTo(0, 6);
		expect(inverse[0].direction).toBe('both');

		const arctan = findHorizontalAsymptotes((x) => Math.atan(x), 'f');
		expect(arctan.length).toBe(2);
	});

	it('ne signale rien sur un polynôme', () => {
		expect(findHorizontalAsymptotes((x) => x * x, 'f')).toEqual([]);
		expect(findHorizontalAsymptotes((x) => Math.sin(x), 'f')).toEqual([]);
	});
});

describe('asymptotes obliques', () => {
	it("trouve une oblique dont l'ordonnée à l'origine n'est pas nulle", () => {
		const found = findObliqueAsymptotes((x) => (x === 2 ? null : (x * x + 3 * x) / (x - 2)), 'f');

		expect(found.length).toBe(1);
		expect(found[0].m).toBeCloseTo(1, 4);
		expect(found[0].b).toBeCloseTo(5, 3);
	});

	it("trouve une oblique de pente et d'ordonnée quelconques", () => {
		// (2x² - x + 1)/(x + 1) = 2x - 3 + 4/(x+1)
		const found = findObliqueAsymptotes(
			(x) => (x === -1 ? null : (2 * x * x - x + 1) / (x + 1)),
			'f'
		);

		expect(found.length).toBe(1);
		expect(found[0].m).toBeCloseTo(2, 4);
		expect(found[0].b).toBeCloseTo(-3, 3);
	});

	it('garde les cas qui marchaient déjà', () => {
		const simple = findObliqueAsymptotes((x) => (x === 0 ? null : x + 1 / x), 'f');
		expect(simple.length).toBe(1);
		expect(simple[0].m).toBeCloseTo(1, 4);
		expect(simple[0].b).toBeCloseTo(0, 4);

		// √(x²+1) : y = x à droite, y = -x à gauche
		const racine = findObliqueAsymptotes((x) => Math.sqrt(x * x + 1), 'f');
		expect(racine.length).toBe(2);
		expect(racine.map((a) => a.direction).sort()).toEqual(['left', 'right']);
	});

	it('ne confond pas une horizontale avec une oblique de pente nulle', () => {
		expect(findObliqueAsymptotes((x) => (x === 0 ? null : 1 / x), 'f')).toEqual([]);
	});
});

describe('asymptotes courbes', () => {
	it('trouve une parabole asymptote', () => {
		// (x³ + 1)/x = x² + 1/x
		const found = findPolynomialAsymptotes((x) => (x === 0 ? null : (x ** 3 + 1) / x), 'f');

		expect(found.length).toBe(1);
		expect(found[0].coefficients.length).toBe(3); // degré 2
		expect(found[0].coefficients[2]).toBeCloseTo(1, 3); // x²
		expect(found[0].coefficients[1]).toBeCloseTo(0, 3); // x
		expect(found[0].coefficients[0]).toBeCloseTo(0, 3); // constante
	});

	it('trouve une parabole décalée', () => {
		// (x³ + 2x² - x + 1)/(x - 1) = x² + 3x + 2 + 3/(x-1)
		const found = findPolynomialAsymptotes(
			(x) => (x === 1 ? null : (x ** 3 + 2 * x * x - x + 1) / (x - 1)),
			'f'
		);

		expect(found.length).toBe(1);
		expect(found[0].coefficients[2]).toBeCloseTo(1, 3);
		expect(found[0].coefficients[1]).toBeCloseTo(3, 2);
		expect(found[0].coefficients[0]).toBeCloseTo(2, 1);
	});

	it('ne signale rien quand la fonction EST le polynôme', () => {
		// Une parabole n'est pas asymptote d'elle-même : rien à tracer.
		expect(findPolynomialAsymptotes((x) => x * x, 'f')).toEqual([]);
	});

	it('ne signale rien pour une horizontale ou une oblique', () => {
		expect(findPolynomialAsymptotes((x) => (x === 0 ? null : 1 / x), 'f')).toEqual([]);
		expect(findPolynomialAsymptotes((x) => (x === 0 ? null : x + 1 / x), 'f')).toEqual([]);
	});

	it('ne signale rien au-delà du degré traité', () => {
		expect(findPolynomialAsymptotes((x) => Math.exp(x), 'f')).toEqual([]);
		expect(findPolynomialAsymptotes((x) => Math.sin(x), 'f')).toEqual([]);
	});
});
