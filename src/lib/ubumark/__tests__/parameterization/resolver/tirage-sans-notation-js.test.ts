/**
 * Un tirage minuscule ou énorme ne s'insère jamais en notation JS : `String(3e-7)` =
 * '3e-7' s'afficherait tel quel et se relirait 3e − 7 en LaTeX (e = constante d'Euler).
 */

import { describe, it, expect } from 'vitest';
import { resolveExpression } from '../../../parameterization/resolver/variable-resolver';
import { createRandomSource } from '$lib/utils/random';
import { parseLatex } from '$lib/mathAST/parser';
import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';

const JS_NOTATION = /\d[eE][+-]?\d/;

describe('tirage décimal à pas minuscule', () => {
	it('{{random:0.0000001..0.0000009:0.0000001}} : écriture décimale, relue à sa valeur', () => {
		for (let seed = 1; seed <= 20; seed++) {
			const out = resolveExpression(
				'{{random:0.0000001..0.0000009:0.0000001}}',
				[],
				createRandomSource(seed)
			);
			expect(out).not.toMatch(JS_NOTATION);
			const value = evaluateNodeToApproximatedNumber(parseLatex(out));
			expect(value).toBeGreaterThan(0);
			expect(value).toBeLessThan(1e-6);
		}
	});
});

describe('borne de tirage venant d’une variable ;sci', () => {
	it('{{random:98..{{m}}}} avec m = 10^{2} : borne lue 100, pas 10', () => {
		const resolved = [{ name: 'm', value: '10^{2}' }];
		const draws = new Set<number>();
		for (let seed = 1; seed <= 60; seed++) {
			draws.add(
				Number(resolveExpression('{{random:98..{{m}}}}', resolved, createRandomSource(seed)))
			);
		}
		expect([...draws].sort()).toEqual([100, 98, 99].sort());
	});
});
