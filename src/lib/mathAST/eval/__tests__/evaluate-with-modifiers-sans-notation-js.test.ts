/**
 * `{{eval:…}}` n'écrit JAMAIS la notation JS (`3e-7`, `1e+22`) ni un chiffre faux —
 * décisions de David du 2026-10-11 (règle par l'exactitude) :
 * - un entier EXACT s'écrit toujours en entier, quelle que soit sa taille, avec ou sans `;d` ;
 * - un résultat APPROCHÉ ≥ 10¹⁵ passe en notation scientifique (ses chiffres au-delà
 *   seraient inventés) ; un petit nombre (|x| < 10⁻⁶) est toujours développé ;
 * - `;sci` : notation scientifique, toujours (mantisse 1 → `10^{-7}`).
 * Le séparateur décimal reste le point : la virgule `{,}` est posée au rendu
 * (`toFrenchDecimal`), comme pour tout résultat de `{{eval:…}}`.
 *
 * Chaque chaîne produite se relit (parseLatex, puis évaluation) à la même valeur.
 */

import { describe, it, expect } from 'vitest';
import { evaluateAstWithModifiers, evalResultToNumber } from '../evaluate-with-modifiers';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { parseLatex } from '$lib/mathAST/parser';
import { evaluateNodeToApproximatedNumber } from '../evaluate';
import { areEquivalent } from '$lib/math';
import type { EvalModifiers } from '$lib/ubumark/types';

const JS_NOTATION = /\d[eE][+-]?\d/;

function run(expression: string, modifiers: EvalModifiers = {}): string {
	return evaluateAstWithModifiers(parseCustom(expression), modifiers);
}

function expectReadsBack(output: string, value: number): void {
	expect(output).not.toMatch(JS_NOTATION);
	const back = evaluateNodeToApproximatedNumber(parseLatex(output));
	expect(Math.abs(back - value)).toBeLessThanOrEqual(Math.abs(value) * 1e-12);
}

describe('sans modificateur', () => {
	it('0.0000001*3 : décimal développé', () => {
		const out = run('0.0000001*3');
		expect(out).toBe('0.0000003');
		expectReadsBack(out, 3e-7);
	});

	it('10^22 (entier exact) : tous les chiffres', () => {
		const out = run('10^22');
		expect(out).toBe('10000000000000000000000');
		expectReadsBack(out, 1e22);
	});

	it('2^80 (entier exact) : tous les chiffres, vrais', () => {
		expect(run('2^80')).toBe((2n ** 80n).toString());
	});

	it('factorial(18) (entier exact) : 6402373705728000', () => {
		expect(run('factorial(18)')).toBe('6402373705728000');
	});

	it('10^22/3 (approché, ≥ 10^15) : notation scientifique', () => {
		const out = run('10^22/3');
		expect(out).toBe('3.33333333333333 \\times 10^{21}');
		expectReadsBack(out, 1e22 / 3);
	});

	it('0.5*10^20 (décimal écrit, entier exact) : tous les chiffres', () => {
		expect(run('0.5*10^20')).toBe('50000000000000000000');
	});

	it('un entier de 12 chiffres s’écrit en entier', () => {
		expect(run('123456789012')).toBe('123456789012');
	});

	it('1 000 000 reste 1000000 (pas de détection de puissance simple)', () => {
		expect(run('10^6')).toBe('1000000');
	});

	it('dans les bornes, rien ne change : 0.000001 et 0.5', () => {
		expect(run('0.000001')).toBe('0.000001');
		expect(run('0.5')).toBe('0.5');
	});

	it('une fraction exacte reste une fraction', () => {
		expect(run('1/10000000')).toBe('\\dfrac{1}{10000000}');
	});

	it('négatif minuscule : développé', () => {
		const out = run('-0.0000003');
		expect(out).toBe('-0.0000003');
		expectReadsBack(out, -3e-7);
	});

	it('négatif énorme exact : tous les chiffres', () => {
		const out = run('-10^22');
		expect(out).toBe('-10000000000000000000000');
		expectReadsBack(out, -1e22);
	});
});

describe(';d : développé ; approché au-delà de 10^15 → scientifique', () => {
	it('0.0000001*3 → 0.0000003', () => {
		const out = run('0.0000001*3', { decimal: true });
		expect(out).toBe('0.0000003');
		expectReadsBack(out, 3e-7);
	});

	it('1/10000000 → 0.0000001', () => {
		expect(run('1/10000000', { decimal: true })).toBe('0.0000001');
	});

	it('10^22 (entier exact) → tous les chiffres', () => {
		const out = run('10^22', { decimal: true });
		expect(out).toBe('10000000000000000000000');
		expectReadsBack(out, 1e22);
	});

	it('2^80 (entier exact) → tous les chiffres, vrais', () => {
		expect(run('2^80', { decimal: true })).toBe((2n ** 80n).toString());
	});

	it('10^22/3 (pas un entier) → notation scientifique', () => {
		const out = run('10^22/3', { decimal: true });
		expect(out).toBe('3.33333333333333 \\times 10^{21}');
	});

	it('1.5*10^20 avec un décimal écrit, entier exact → tous les chiffres', () => {
		expect(run('1.5*10^20', { decimal: true })).toBe('150000000000000000000');
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
		['0.0000001*3', {}],
		['0.0000003', { scientific: true }],
		['0.0000003', { decimal: true }]
	] as Array<[string, EvalModifiers]>)('%s %o', (expression, modifiers) => {
		const out = run(expression, modifiers);
		expect(areEquivalent(out, '3\\times10^{-7}')).toBe(true);
		expect(areEquivalent(out, '0{,}0000003')).toBe(true);
	});
});

describe('tableau de la doc (docs/systeme/ubumark.md)', () => {
	it.each([
		['10^22/3', {}, '3.33333333333333 \\times 10^{21}'],
		['10^22/3', { scientific: true }, '3.33333333333333 \\times 10^{21}'],
		['10^22', { scientific: true }, '10^{22}'],
		['0.0000001*3', { scientific: true }, '3 \\times 10^{-7}']
	] as Array<[string, EvalModifiers, string]>)('%s %o → %s', (expression, modifiers, expected) => {
		expect(run(expression, modifiers)).toBe(expected);
	});
});

describe('résultat non fini : erreur explicite', () => {
	it.each([
		['10^400/3', {}],
		['10^400', { decimal: true }],
		['10^400', { scientific: true }]
	] as Array<[string, EvalModifiers]>)('%s %o', (expression, modifiers) => {
		expect(() => run(expression, modifiers)).toThrow(/non fini/);
	});
});

describe('evalResultToNumber relit une puissance de 10', () => {
	it.each([
		['10^{-7}', 1e-7],
		['3.2 \\times 10^{5}', 320000],
		['-3 \\times 10^{-7}', -3e-7],
		['\\dfrac{9}{2}', 4.5],
		['2.5', 2.5]
	])('%s → %s', (value, expected) => {
		expect(evalResultToNumber(value)).toBeCloseTo(expected, 20);
	});

	it('une valeur illisible rend NaN', () => {
		expect(evalResultToNumber('abc')).toBeNaN();
	});
});

describe(';sci avec une grandeur, ;hms ou un résultat littéral', () => {
	it('0.0000001[m];sci → 10^{-7}[m], relu à la même grandeur', () => {
		const out = run('0.0000001[m]', { scientific: true });
		expect(out).toBe('10^{-7}[m]');
		expect(run(out, { unit: 'nm' })).toBe('100[nm]');
	});

	it('0.0000003[m];sci → 3*10^{-7}[m]', () => {
		const out = run('0.0000003[m]', { scientific: true });
		expect(out).toBe('3*10^{-7}[m]');
		expect(run(out, { unit: 'nm' })).toBe('300[nm]');
	});

	it(';[unité] et ;sci : 320[km] en m → 3.2*10^{5}[m]', () => {
		expect(run('320[km]', { unit: 'm', scientific: true })).toBe('3.2*10^{5}[m]');
	});

	it(';hms et ;sci : erreur d’auteur', () => {
		expect(() => run('135[min]', { hms: true, scientific: true })).toThrow(/^;sci : /);
	});

	it('résultat littéral et ;sci : erreur d’auteur', () => {
		expect(() =>
			evaluateAstWithModifiers(parseCustom('0.0000001*a'), { scientific: true }, new Set(['a']))
		).toThrow(/^;sci : /);
	});
});
