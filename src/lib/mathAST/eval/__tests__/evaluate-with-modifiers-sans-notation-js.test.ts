/**
 * `{{eval:…}}` n'écrit JAMAIS la notation JS (`3e-7`, `1e+22`) — décisions de David du
 * 2026-10-11 :
 * - `;d` : écriture décimale DÉVELOPPÉE, toujours (`0.0000003`) ;
 * - `;sci` : notation scientifique, toujours (`3 \times 10^{-7}`, mantisse 1 → `10^{-7}`) ;
 * - sans modificateur : développé dans les bornes (10⁻⁶ ≤ |x|, entier < 10¹⁵) ; hors bornes,
 *   notation scientifique si le modèle est de 4e ou plus (`scientificOutOfRange`), sinon
 *   développé.
 * Le séparateur décimal reste le point : la virgule `{,}` est posée au rendu
 * (`toFrenchDecimal`), comme pour tout résultat de `{{eval:…}}`.
 *
 * Chaque chaîne produite se relit (parseLatex, puis évaluation) à la même valeur.
 */

import { describe, it, expect } from 'vitest';
import { evaluateAstWithModifiers } from '../evaluate-with-modifiers';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { parseLatex } from '$lib/mathAST/parser';
import { evaluateNodeToApproximatedNumber } from '../evaluate';
import { areEquivalent } from '$lib/math';
import type { EvalModifiers } from '$lib/ubumark/types';

const JS_NOTATION = /\d[eE][+-]?\d/;

function run(
	expression: string,
	modifiers: EvalModifiers = {},
	scientificOutOfRange = false
): string {
	return evaluateAstWithModifiers(parseCustom(expression), modifiers, new Set(), {
		scientificOutOfRange
	});
}

function expectReadsBack(output: string, value: number): void {
	expect(output).not.toMatch(JS_NOTATION);
	const back = evaluateNodeToApproximatedNumber(parseLatex(output));
	expect(Math.abs(back - value)).toBeLessThanOrEqual(Math.abs(value) * 1e-12);
}

describe('sans modificateur', () => {
	it('0.0000001*3 sous la 4e : décimal développé', () => {
		const out = run('0.0000001*3');
		expect(out).toBe('0.0000003');
		expectReadsBack(out, 3e-7);
	});

	it('0.0000001*3 en 4e et plus : notation scientifique', () => {
		const out = run('0.0000001*3', {}, true);
		expect(out).toBe('3 \\times 10^{-7}');
		expectReadsBack(out, 3e-7);
	});

	it('10^22 en 4e et plus : 10^{22}', () => {
		const out = run('10^22', {}, true);
		expect(out).toBe('10^{22}');
		expectReadsBack(out, 1e22);
	});

	it('10^22 sous la 4e : tous les chiffres, jamais 1e+22', () => {
		const out = run('10^22');
		expect(out).toBe('10000000000000000000000');
		expectReadsBack(out, 1e22);
	});

	it('2^80 en 4e et plus : mantisse à 15 chiffres significatifs', () => {
		const out = run('2^80', {}, true);
		expect(out).toBe('1.20892581961463 \\times 10^{24}');
	});

	it('un entier de 12 chiffres s’écrit en entier, même en 4e et plus', () => {
		expect(run('123456789012', {}, true)).toBe('123456789012');
		expect(run('123456789012')).toBe('123456789012');
	});

	it('1 000 000 reste 1000000 (pas de détection de puissance simple)', () => {
		expect(run('10^6', {}, true)).toBe('1000000');
	});

	it('dans les bornes, rien ne change : 0.000001 et 0.5', () => {
		expect(run('0.000001', {}, true)).toBe('0.000001');
		expect(run('0.5', {}, true)).toBe('0.5');
	});

	it('une fraction exacte reste une fraction', () => {
		expect(run('1/10000000', {}, true)).toBe('\\dfrac{1}{10000000}');
	});

	it('négatif hors bornes en 4e : -3 \\times 10^{-7}', () => {
		const out = run('-0.0000003', {}, true);
		expect(out).toBe('-3 \\times 10^{-7}');
		expectReadsBack(out, -3e-7);
	});
});

describe(';d : toujours développé', () => {
	it.each([false, true])('0.0000001*3 (scientificOutOfRange = %s)', (level) => {
		const out = run('0.0000001*3', { decimal: true }, level);
		expect(out).toBe('0.0000003');
		expectReadsBack(out, 3e-7);
	});

	it('1/10000000 ;d → 0.0000001', () => {
		expect(run('1/10000000', { decimal: true }, true)).toBe('0.0000001');
	});
});

describe(';sci : toujours la notation scientifique', () => {
	it.each([
		['320000', '3.2 \\times 10^{5}', 320000],
		['0.0000003', '3 \\times 10^{-7}', 3e-7],
		['0.0000001', '10^{-7}', 1e-7],
		['-45000', '-4.5 \\times 10^{4}', -45000],
		['1/8', '1.25 \\times 10^{-1}', 0.125]
	])('%s → %s', (expression, expected, value) => {
		const out = run(expression, { scientific: true });
		expect(out).toBe(expected);
		expectReadsBack(out, value);
	});

	it('se combine avec + et ()', () => {
		expect(run('320000', { scientific: true, addPositive: true })).toBe('+3.2 \\times 10^{5}');
		expect(run('-320000', { scientific: true, bracketNegative: true })).toBe(
			'(-3.2 \\times 10^{5})'
		);
	});
});

describe('équivalence avec ce que tape l’élève', () => {
	it.each([
		['0.0000001*3', {}, false],
		['0.0000001*3', {}, true],
		['0.0000003', { scientific: true }, false],
		['0.0000003', { decimal: true }, true]
	] as Array<[string, EvalModifiers, boolean]>)(
		'%s %o (4e : %s)',
		(expression, modifiers, level) => {
			const out = run(expression, modifiers, level);
			expect(areEquivalent(out, '3\\times10^{-7}')).toBe(true);
			expect(areEquivalent(out, '0{,}0000003')).toBe(true);
		}
	);
});
