/**
 * V61 (2026-10-14) : intégrales à paramètre, ce que le moteur rend.
 *
 * 1. `1/(x^2+a^2)` tapé avec des parenthèses : le dénominateur est un
 *    `delimiter` — la règle arctan ne le voyait pas, la primitive n'était pas
 *    trouvée ;
 * 2. `x^a` de 1 à 2 : `1^{a+1}` restait dans la valeur ;
 * 3. les refus des intégrateurs, en français (« Unable to factor denominator »).
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../cli/core/pipeline';
import { integrate, integrateDefinite } from '../integrate';
import { compile } from '../../eval/compile';
import { number } from '../../factory';
import { toCustom } from '../../custom-generator';
import { adaptiveSimpson } from '../numeric';
import type { MathNode } from '../../types';

/** L'arbre d'une saisie en notation maison, comme la lit la console. */
function typed(input: string): MathNode {
	const ast = parse(input).ast;
	if (ast === undefined) throw new Error(`illisible : ${input}`);
	return ast;
}

describe('1/(x^2+a^2), dénominateur entre parenthèses', () => {
	it('la primitive arctan(x/a)/a est trouvée', () => {
		const result = integrate(typed('1/(x^2+a^2)'), { variable: 'x' });
		expect(result.status).toBe('exact');
		expect(toCustom(result.antiderivative ?? number('0'))).toBe('arctan(x/a)/a');
	});

	it.each([0.5, 2, -3])('de 1 à 2, la valeur juste pour a = %s', (a) => {
		const result = integrateDefinite(typed('1/(x^2+a^2)'), number('1'), number('2'), {
			variable: 'x'
		});
		expect(result.value).not.toBeNull();
		const exact = compile(result.value ?? number('0'))({ a });
		const numeric = adaptiveSimpson((x) => 1 / (x * x + a * a), 1, 2, 1e-10, 30);
		expect(exact).toBeCloseTo(numeric, 8);
	});
});

describe('valeurs gardées par l’atelier (revue de V61), vérifiées en nombres', () => {
	const cases: readonly (readonly [string, (x: number, a: number) => number])[] = [
		['1/(x+a^2)', (x, a) => 1 / (x + a * a)],
		['x/(x^2+a^2)', (x, a) => x / (x * x + a * a)],
		['3x^a', (x, a) => 3 * x ** a],
		['\\ln(x+a^2)', (x, a) => Math.log(x + a * a)]
	];
	it.each(cases.flatMap(([input, f]) => [0.5, 2, -3].map((a) => [input, a, f] as const)))(
		'%s de 1 à 2, a = %s',
		(input, a, f) => {
			const result = integrateDefinite(typed(input), number('1'), number('2'), {
				variable: 'x'
			});
			expect(result.value).not.toBeNull();
			const exact = compile(result.value ?? number('0'))({ a });
			const numeric = adaptiveSimpson((x) => f(x, a), 1, 2, 1e-10, 30);
			expect(exact).toBeCloseTo(numeric, 8);
		}
	);
});

describe('x^a de 1 à 2 : 1^{a+1} réduit', () => {
	it('(2^{a+1} − 1)/(a + 1)', () => {
		const result = integrateDefinite(typed('x^a'), number('1'), number('2'), { variable: 'x' });
		const value = toCustom(result.value ?? number('0'));
		expect(value).not.toContain('1^');
		expect(compile(result.value ?? number('0'))({ a: 2 })).toBeCloseTo(7 / 3, 10);
	});
});

describe('les refus des intégrateurs, en français', () => {
	it.each(['1/(x^2+a^2+1)', '3/(x^2+a^2)', '1/(x^3+a)'])('%s', (input) => {
		const result = integrate(typed(input), { variable: 'x' });
		expect(result.status).toBe('unsupported');
		expect(result.error ?? '').not.toMatch(/\b(Unable|Not a|not yet|pattern|integrator)\b/);
	});
});
