/**
 * Un facteur sous deux barres ne perd pas le domaine en silence (chantier
 * tidy-conditions, § 4.3, David 2026-10-26).
 *
 * `1/(1/x)` : le `x` du dénominateur du dénominateur arrivait avec l'exposant
 * +1, comme s'il n'était jamais passé sous une barre — `tidy` rendait `x`,
 * défini en 0, et `tidyWithConditions` ne disait aucune condition. `tidy`
 * garde maintenant l'écriture (Q4 : B, pas `x²/x`) ; `tidyWithConditions`
 * simplifie et dit `x ≠ 0`.
 */

import { describe, it, expect } from 'vitest';
import { tidy, tidyWithConditions, describeConditions } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';
import { stripUnnecessaryBrackets } from '../../transforms';
import type { TypeContext } from '../../numtype';

const t = (s: string, typeCtx?: TypeContext) => toCustom(tidy(parseCustom(s), { typeCtx }));
const written = (s: string) => toCustom(parseCustom(s));
/** L'écriture tapée, sans ses parenthèses inutiles : `1/(1/x)` s'écrit `1/{1/x}`. */
const kept = (s: string) => toCustom(stripUnnecessaryBrackets(parseCustom(s)));

function run(input: string) {
	const { result, conditions } = tidyWithConditions(parseCustom(input));
	return {
		result: toCustom(result),
		conditions: describeConditions(conditions).map((c) => c.text)
	};
}

const nonZero: TypeContext = { assumptions: new Map([['x', { sign: 'nonzero' as const }]]) };

const DOUBLE_BAR = [
	['1/(1/x)', 'x', ['x ≠ 0']],
	['2/(1/x)', '2x', ['x ≠ 0']],
	['x/(1/x)', 'x^2', ['x ≠ 0']],
	['1/x^(-1)', 'x', ['x ≠ 0']],
	['(x^(-1))^(-1)', 'x', ['x ≠ 0']],
	['1/(1/(x+1))', 'x+1', ['x ≠ −1']]
] as const;

describe('tidy garde l’écriture d’un facteur sous deux barres', () => {
	it.each(DOUBLE_BAR.map(([input]) => input))('%s reste écrit', (input) => {
		expect(t(input)).toBe(kept(input));
	});

	it('idempotente', () => {
		for (const [input] of DOUBLE_BAR) {
			const once = tidy(parseCustom(input));
			expect(toCustom(tidy(once))).toBe(toCustom(once));
		}
	});

	it('une hypothèse déclarée lève la garde', () => {
		expect(t('1/(1/x)', nonZero)).toBe('x');
	});

	it.each([
		['1/(1/2)', '2'],
		['1/(1/e^x)', 'e^x'],
		['1/(1/(x^2+1))', 'x^2+1'],
		['1/(1/(1/x))', '1/x']
	])('rien ne s’annule, ou la base reste dessous : %s → %s', (input, result) => {
		expect(t(input)).toBe(written(result));
	});
});

describe('tidyWithConditions simplifie et dit la condition', () => {
	it.each(DOUBLE_BAR)('%s → %s, pour %j', (input, result, conditions) => {
		const got = run(input);
		expect(got.result).toBe(written(result));
		expect(got.conditions).toEqual(conditions);
	});

	it('la valeur est gardée là où l’entrée est définie', () => {
		// `areEquivalent` ne lit pas `(x⁻¹)⁻¹ ≡ x` (il lit `1/x⁻¹ ≡ x`) : hors de `tidy`
		for (const [input] of DOUBLE_BAR.filter(([i]) => i !== '(x^(-1))^(-1)')) {
			const { result } = tidyWithConditions(parseCustom(input));
			expect(areEquivalent(result, parseCustom(input))).toBe(true);
		}
	});
});
