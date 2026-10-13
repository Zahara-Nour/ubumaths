/**
 * `root(a, n)` — la racine n-ième telle que le SOLVEUR et `denormalize` la
 * construisent (`solve/solvers/polynomial.ts`), quand le parseur range
 * l'indice dans `base` d'un `sqrt`. L'évaluateur répondait « Unknown
 * function: root » (revue de #1304) : `x^4 = y` résolue, mais sa solution
 * ne s'évaluait pas.
 */

import { describe, it, expect } from 'vitest';
import { evaluateNodeToApproximatedNumber } from '../evaluate';
import { compile } from '../compile';
import { func, number, variable } from '../../factory';
import { numericNode } from '../../common/numeric';

describe('root(a, n) — évaluation et compilation', () => {
	it('root(16, 4) = 2, root(10, 4) ≈ 1,778', () => {
		expect(evaluateNodeToApproximatedNumber(func('root', [number('16'), number('4')]))).toBe(2);
		expect(evaluateNodeToApproximatedNumber(func('root', [number('10'), number('4')]))).toBeCloseTo(
			Math.pow(10, 0.25),
			12
		);
	});

	it('indice impair : root(−32, 5) = −2 ; indice pair : root(−16, 4) refusée', () => {
		expect(evaluateNodeToApproximatedNumber(func('root', [numericNode(-32), number('5')]))).toBe(
			-2
		);
		expect(() =>
			evaluateNodeToApproximatedNumber(func('root', [numericNode(-16), number('4')]))
		).toThrow();
	});

	it('compile : root(x, 4) en 81 vaut 3, root(x, 5) en −32 vaut −2', () => {
		expect(compile(func('root', [variable('x'), number('4')]))({ x: 81 })).toBeCloseTo(3, 12);
		expect(compile(func('root', [variable('x'), number('5')]))({ x: -32 })).toBeCloseTo(-2, 12);
	});
});
