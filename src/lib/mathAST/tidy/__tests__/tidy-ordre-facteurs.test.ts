/**
 * L'ordre canonique des FACTEURS d'un produit (Q13, lot 4c-bis du chantier
 * simplify-carte, comportements validés par David le 2026-10-23, journal § 42).
 *
 * Catégories, dans cet ordre : constantes (`e`, `i`, `π`) ; lettres et leurs
 * puissances ; parenthèses (sommes) ; fonctions ; exponentielles ; le reste.
 * Entre deux parenthèses, l'ordre écrit reste. Dans le groupe des fonctions,
 * l'ordre alphabétique (Q14). Les deux modes d'ordre des termes (`canonical`,
 * `kept`) partagent cet ordre.
 *
 * Q30 (David, 2026-10-24) : une fonction usuelle en un nombre (`√2`, `ln 2`,
 * `sin 1`, `|−3|`) est une valeur, rangée comme un coefficient, devant les
 * lettres : `2√2 x`, pas `2x√2`.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';

const canonical = (s: string) => toCustom(tidy(parseCustom(s)));
const kept = (s: string) => toCustom(tidy(parseCustom(s), { order: 'kept' }));

const CASES: readonly (readonly [string, string])[] = [
	// La parenthèse avant la fonction ou l'exponentielle
	['(x+1)e^x', '(x+1)e^x'],
	['e^x(x+1)', '(x+1)e^x'],
	['e^{2x}(2x-1)', '(2x-1)e^{2x}'],
	['e^{-x}(x+1)', '(x+1)e^{-x}'],
	['ln(x)(x+1)', '(x+1)ln(x)'],
	['sqrt(x)(x+1)', '(x+1)sqrt(x)'],
	['|x|(x+1)', '(x+1)|x|'],
	['2^x(x+1)', '(x+1)*2^x'],
	['x(x+1)e^x', 'x(x+1)e^x'],
	['(x-1)(x+2)e^x', '(x-1)(x+2)e^x'],
	['(x+1)(2x-1)e^{2x}', '(x+1)(2x-1)e^{2x}'],
	['3(x+1)e^x-2e^x(x+1)', '(x+1)e^x'],
	// Les lettres et leurs puissances avant la parenthèse
	['(x+1)x', 'x(x+1)'],
	['(x+1)x^2', 'x^2(x+1)'],
	['(x+1)x^n', 'x^n(x+1)'],
	['(x+1)π x', '\\pi x(x+1)'],
	['sqrt(x) x', 'xsqrt(x)'],
	// Entre deux parenthèses : l'ordre écrit
	['(x-1)(x+2)', '(x-1)(x+2)'],
	['(x+2)(x-1)', '(x+2)(x-1)'],
	['(x-1)(x+1)^2', '(x-1)(x+1)^2'],
	['(x-1)(x+1)^n', '(x-1)(x+1)^n'],
	['(x+1)(x-1)(x+1)', '(x+1)^2(x-1)'],
	// Fonctions d'abord, exponentielles ensuite (Q14)
	['e^x ln(x)', 'ln(x)e^x'],
	['e^x sin(x)', 'sin(x)e^x'],
	['2^x*ln(2)', 'ln(2)*2^x'],
	['(1/2)^x(x+1)', '(x+1)(1/2)^x'],
	['(1/2)^x*ln(x)*x', 'xln(x)(1/2)^x'],
	['sin(x)cos(x)', 'cos(x)sin(x)'],
	// Une fonction en un nombre : une valeur, devant les lettres (Q30)
	['sqrt(8)x', '2sqrt(2)x'],
	['x*sqrt(2)', 'sqrt(2)x'],
	['x*sqrt(3)/2', '{sqrt(3)x}/2'],
	['x*sqrt(2)^3', '2sqrt(2)x'],
	['(x+1)sqrt(2)', 'sqrt(2)(x+1)'],
	['x ln(2)', 'ln(2)x'],
	['sin(1)x', 'sin(1)x'],
	['x|2-sqrt(5)|', '|2-sqrt(5)|x'],
	['sqrt(2)ln(2)x', 'ln(2)sqrt(2)x'],
	['x*e^2', 'e^2x'],
	// Une fonction de l'énoncé en un nombre reste une inconnue
	['f(2)x', 'xf(2)']
];

describe('ordre des facteurs (Q13) — défaut', () => {
	it.each(CASES)('%s → %s', (input, expected) => {
		expect(canonical(input)).toBe(expected);
	});
});

describe("ordre des facteurs (Q13) — order: 'kept'", () => {
	it.each(CASES)('%s → %s', (input, expected) => {
		expect(kept(input)).toBe(expected);
	});
});

describe('ordre des facteurs (Q13) — idempotent', () => {
	it.each(CASES)('%s', (input) => {
		const once = canonical(input);
		expect(canonical(once)).toBe(once);
		const onceKept = kept(input);
		expect(kept(onceKept)).toBe(onceKept);
	});
});

describe('ordre des facteurs (Q13) — une base des deux côtés de la barre (S3)', () => {
	it.each([
		['(x+1)(x-1)(2x+2)/(4(x+1))', '{(x+1)^2(x-1)}/{2(x+1)}'],
		['(x-1)(x+1)(2x+2)/(4(x+1))', '{(x-1)(x+1)^2}/{2(x+1)}']
	])('%s → %s, idempotent', (input, expected) => {
		expect(canonical(input)).toBe(expected);
		expect(canonical(expected)).toBe(expected);
	});
});

describe('ordre des facteurs (Q13) — les termes semblables se regroupent', () => {
	it.each([
		['(x+1)(x-1)+(x-1)(x+1)', '2(x+1)(x-1)'],
		['(x+1)(x-1)-(x-1)(x+1)', '0'],
		['2(x-1)(x+1)+3(x+1)(x-1)', '5(x-1)(x+1)'],
		['(x+1)e^x+e^x(x+1)', '2(x+1)e^x'],
		['e^x(1+x)-e^x(x+1)', '0']
	])('%s → %s', (input, expected) => {
		expect(canonical(input)).toBe(expected);
	});
});

describe('ordre des facteurs (Q15) — le LaTeX se relit', () => {
	it.each([
		['2x*ln(2)*2^(x^2)', '2 \\ln\\left( 2 \\right) x \\times 2^{x^2}'],
		['sqrt(8)x', '2 \\sqrt{2} x'],
		['x*3^x', 'x \\times 3^x'],
		['(x+1)*2^x', '\\left( x + 1 \\right) \\times 2^x']
	])('%s s’écrit %s', (input, expected) => {
		const latex = toLatex(tidy(parseCustom(input)));
		expect(latex).toBe(expected);
		expect(() => parseLatex(latex)).not.toThrow();
	});
});
