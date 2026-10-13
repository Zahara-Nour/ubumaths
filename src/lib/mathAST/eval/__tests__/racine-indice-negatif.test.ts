/**
 * Racine d'indice négatif ou nul — `\sqrt[-3]{27}`.
 *
 * Mesuré le 2026-10-13 (revue de #1304) : l'évaluateur tournait plus de 15 s
 * sur un indice négatif, la page qui l'affichait était figée. La cause :
 * `integerNthRoot` (méthode de Newton) ne prévoyait pas d'indice < 1.
 *
 * Convention gardée : ⁿ√a = a^{1/n}, donc ⁻³√27 = 27^{−1/3} = 1/3 ; l'indice 0
 * n'a pas de sens et est refusé (evaluate) ou rend NaN (compile).
 */

import { describe, it, expect } from 'vitest';
import { evaluateNodeToApproximatedNumber } from '../evaluate';
import { compile } from '../compile';
import { integerNthRoot } from '../../normal/radical';
import { parseLatex } from '../../parser';
import { func, number, variable } from '../../factory';
import { numericNode } from '../../common/numeric';

describe('racine d’indice négatif ou nul', () => {
	it('integerNthRoot rend null pour un indice < 1, sans boucler', () => {
		expect(integerNthRoot(27n, -3n)).toBeNull();
		expect(integerNthRoot(27n, 0n)).toBeNull();
		expect(integerNthRoot(-27n, -3n)).toBeNull();
	});

	it('⁻³√27 = 1/3 et ⁻³√−27 = −1/3, en un instant', () => {
		const start = Date.now();
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\sqrt[-3]{27}'))).toBeCloseTo(1 / 3, 12);
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\sqrt[-3]{-27}'))).toBeCloseTo(-1 / 3, 12);
		expect(
			evaluateNodeToApproximatedNumber(func('root', [numericNode(-27), numericNode(-3)]))
		).toBeCloseTo(-1 / 3, 12);
		expect(Date.now() - start).toBeLessThan(1000);
	});

	it('indice 0 : refusé par evaluate, NaN par compile', () => {
		expect(() =>
			evaluateNodeToApproximatedNumber(func('root', [number('8'), number('0')]))
		).toThrow();
		expect(compile(func('root', [variable('x'), number('0')]))({ x: 8 })).toBeNaN();
	});

	it('compile et evaluate concordent sur un indice négatif', () => {
		expect(compile(func('root', [variable('x'), numericNode(-3)]))({ x: -27 })).toBeCloseTo(
			-1 / 3,
			12
		);
	});
});
