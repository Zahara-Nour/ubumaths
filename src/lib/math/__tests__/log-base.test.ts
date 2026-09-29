/**
 * Logarithme de base quelconque `\log_{b}(a)` : sa valeur, son signe et son
 * type dépendent de `b`, pas seulement de `a`.
 *
 * Faux positif mesuré sur `main` (2026-09-29) : `|\log_{x}(2)| ≡ \log_{x}(2)`
 * rendait VRAI (en x = 1/2 : 1 contre −1). L'évaluateur numérique lisait
 * `\log_{x}(2)` comme `\log(2)` (base 10, base ignorée), donc « positif », et
 * la valeur absolue disparaissait.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '$lib/math';
import { parseLatex, simplify, toLatex } from '$lib/mathAST';
import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
import { inferType } from '$lib/mathAST/numtype/infer';
import { isNonNegativeType, isPositiveType } from '$lib/mathAST/numtype/predicates';
import { evaluateLimit } from '$lib/mathAST/limits/evaluate';
import { isInDomain } from '$lib/mathAST/domain/validate';
import { evaluateAtPoint } from '$lib/mathAST/pedagogical-limits/helpers';

describe('|log_b(a)| : la valeur absolue ne tombe que si le signe est connu', () => {
	it.each([
		['|\\log_{x}(2)|', '\\log_{x}(2)'],
		['|\\log_{x}(3)|', '\\log_{x}(3)'],
		['|\\log_{x+1}(2)|', '\\log_{x+1}(2)'],
		['|\\log_{1/2}(8)|', '\\log_{1/2}(8)'],
		['|\\log_{\\frac{1}{2}}(8)|', '\\log_{\\frac{1}{2}}(8)']
	])('%s ≢ %s', (a, b) => {
		expect(areEquivalent(a, b)).toBe(false);
	});

	it('|log_{1/2}(8)| ≡ 3', () => {
		expect(areEquivalent('|\\log_{\\frac{1}{2}}(8)|', '3')).toBe(true);
	});

	it('|log_2(8)| ≡ log_2(8) (les deux valent 3)', () => {
		expect(areEquivalent('|\\log_{2}(8)|', '\\log_{2}(8)')).toBe(true);
	});

	it('déjà justes : |log_2 x|, |ln x|, |log x| refusés', () => {
		expect(areEquivalent('|\\log_{2}(x)|', '\\log_{2}(x)')).toBe(false);
		expect(areEquivalent('|\\ln x|', '\\ln x')).toBe(false);
		expect(areEquivalent('|\\log x|', '\\log x')).toBe(false);
	});
});

describe('évaluation numérique : la base compte', () => {
	it('log_{1/2}(8) = −3, log_2(8) = 3', () => {
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\log_{\\frac{1}{2}}(8)'))).toBeCloseTo(-3);
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\log_{2}(8)'))).toBeCloseTo(3);
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\log(100)'))).toBeCloseTo(2);
	});

	it('base variable : non évaluable (plus de lecture en base 10)', () => {
		expect(() => evaluateNodeToApproximatedNumber(parseLatex('\\log_{x}(2)'))).toThrow();
	});

	it('base hors domaine (1, 0, négative) : non évaluable', () => {
		for (const s of ['\\log_{1}(5)', '\\log_{0}(5)', '\\log_{-2}(5)']) {
			expect(() => evaluateNodeToApproximatedNumber(parseLatex(s))).toThrow();
		}
	});
});

describe('numtype : signe de log_b(a)', () => {
	it('base variable : signe inconnu', () => {
		const node = parseLatex('\\log_{x}(2)');
		expect(inferType(node).sign).toBeUndefined();
		expect(isNonNegativeType(node)).toBe(false);
	});

	it('base dans ]0 ; 1[ : le signe s’inverse', () => {
		const node = parseLatex('\\log_{\\frac{1}{2}}(8)');
		expect(isPositiveType(node)).toBe(false);
		expect(inferType(node).sign).toBe('negative');
	});

	it('base > 1 : signe de l’argument par rapport à 1', () => {
		expect(isPositiveType(parseLatex('\\log_{2}(8)'))).toBe(true);
	});

	it('log_b(1) = 0 quelle que soit la base', () => {
		expect(inferType(parseLatex('\\log_{x}(1)')).sign).toBe('zero');
	});
});

describe('affichage : simplify garde la valeur absolue', () => {
	it('|log_x(2)| reste une valeur absolue', () => {
		const out = toLatex(simplify(parseLatex('|\\log_{x}(2)|')).result);
		expect(out).not.toBe(toLatex(parseLatex('\\log_{x}(2)')));
		expect(out).toMatch(/left\||\\vert|\|/);
	});
});

describe('limites : la base compte', () => {
	it('log_{1/2}(x) en 0⁺ tend vers +∞', () => {
		const r = evaluateLimit(parseLatex('\\log_{\\frac{1}{2}}(x)'), 'x', parseLatex('0'), 'right');
		expect(r.value ? toLatex(r.value) : null).toBe('+\\infty');
	});

	it('log_{1/2}(x) en 4 vaut −2', () => {
		const r = evaluateLimit(parseLatex('\\log_{\\frac{1}{2}}(x)'), 'x', parseLatex('4'), 'both');
		expect(r.status).toBe('exact');
		expect(r.value && evaluateNodeToApproximatedNumber(r.value)).toBeCloseTo(-2);
	});
});

describe('validation de domaine : valeur d’un log imbriqué', () => {
	it('√(log_{1/2}(x)) en x = 4 : log_{1/2}(4) = −2 < 0, hors domaine', () => {
		expect(isInDomain(parseLatex('\\sqrt{\\log_{\\frac{1}{2}}(x)}'), { x: 4 })).toBe(false);
	});

	it('√(log(x) − 0,5) en x = 2 : log(2) ≈ 0,301 (base 10), hors domaine', () => {
		expect(isInDomain(parseLatex('\\sqrt{\\log(x)-0.5}'), { x: 2 })).toBe(false);
	});
});

describe('limites pédagogiques : substitution directe', () => {
	it('log_{1/2}(x) en 4 vaut −2 ; log(x) en 100 vaut 2 (décimal, pas ln)', () => {
		expect(evaluateAtPoint(parseLatex('\\log_{\\frac{1}{2}}(x)'), 'x', 4)).toBeCloseTo(-2);
		expect(evaluateAtPoint(parseLatex('\\log(x)'), 'x', 100)).toBeCloseTo(2);
		expect(evaluateAtPoint(parseLatex('\\log_{x}(2)'), 'x', 1)).toBeNull();
	});
});

describe('changement de base (chemin de la comparaison seul)', () => {
	it.each([
		['\\log_{x}(2)', '\\frac{\\ln 2}{\\ln x}'],
		['\\log_{2}(8)', '3'],
		['\\log_{\\frac{1}{2}}(8)', '-3'],
		['\\log_{4}(x)', '\\frac{1}{2}\\log_{2}(x)'],
		['\\log_{10}(x)', '\\log(x)'],
		['\\log_{e}(x)', '\\ln x'],
		['\\log(100)', '2'],
		['\\log_{2.5}(2.5^{x})', 'x'],
		['\\log_{x}(y)', '\\frac{\\log y}{\\log x}'],
		['\\log_{2}(x) + \\log_{2}(y)', '\\log_{2}(xy)'],
		['\\log_{9}(x)', '\\log_{3}(\\sqrt{x})']
	])('%s ≡ %s', (a, b) => {
		expect(areEquivalent(a, b)).toBe(true);
	});

	// log_x(x) = 1 partout où log_x(x) existe (x > 0, x ≠ 1) : vrai par la
	// convention (même valeur là où les deux membres sont définis), comme x/x ≡ 1.
	it('log_x(x) ≡ 1 (convention : égales là où les deux existent)', () => {
		expect(areEquivalent('\\log_{x}(x)', '1')).toBe(true);
	});

	it.each([
		['\\log_{x}(2)', '\\log_{3}(2)'],
		['\\log_2 x', '\\log_3 x'],
		['\\log(x)', '\\ln(x)'],
		['\\log_{x}(2)', '\\log_{2}(x)'],
		['\\log_{2}(x)', '\\frac{\\ln 2}{\\ln x}'],
		['|\\log_{x}(2)|', '\\frac{\\ln 2}{\\ln x}']
	])('%s ≢ %s', (a, b) => {
		expect(areEquivalent(a, b)).toBe(false);
	});

	it('hypothèses : un log à base reste hors liste blanche (verdict sans hypothèse)', () => {
		expect(
			areEquivalent('|\\log_{x}(2)|', '\\log_{x}(2)', { assumptions: { x: 'positive' } })
		).toBe(false);
	});

	it('affichage inchangé : simplify garde log_2(x)', () => {
		expect(toLatex(simplify(parseLatex('\\log_{2}(x)')).result)).toContain('\\log');
		expect(toLatex(simplify(parseLatex('\\log_{2}(x)')).result)).not.toContain('\\ln');
	});
});

describe('régressions de la revue adverse (#524)', () => {
	it.each([
		['\\log^{2}(x)', '(\\log x)^{2}'],
		['\\log^{2}(x)', '\\log x\\cdot\\log x'],
		['\\log^{2}_{2}(x)', '(\\log_{2}x)^{2}'],
		['\\log^{2}_{2}(x)', '\\log_2 x\\cdot\\log_2 x'],
		['\\log^{3}_{4}(x)', '\\frac{1}{8}(\\log_{2}x)^{3}'],
		// log_x(x^a) = a partout où le membre de gauche existe (x > 0, x ≠ 1)
		['\\log_{x}(x^{a})', 'a'],
		['\\log_{x+1}((x+1)^{n})', 'n']
	])('%s ≡ %s', (a, b) => {
		expect(areEquivalent(a, b)).toBe(true);
	});

	it.each([
		['\\log^{2}_{2}(x)', '\\log_{2}(x)'],
		['\\log^{2}(x)', '\\log(x^{2})'],
		['\\log_{x}(x^{a})', '\\log_{x}(a)']
	])('%s ≢ %s', (a, b) => {
		expect(areEquivalent(a, b)).toBe(false);
	});

	it('limites finies : valeur exacte simplifiée', () => {
		const half = evaluateLimit(parseLatex('\\log_{\\frac{1}{2}}(x)'), 'x', parseLatex('4'), 'both');
		expect(half.value && toLatex(half.value)).toBe('-2');
		const two = evaluateLimit(parseLatex('\\log_{2}(x)'), 'x', parseLatex('8'), 'both');
		expect(two.value && toLatex(two.value)).toBe('3');
	});
});
