/**
 * Hypothèses de l'énoncé (ADR 0012) : « Soit x > 0 », « n entier ».
 *
 * Le décideur compare sur l'intersection des domaines ∩ le domaine DÉCLARÉ.
 * Sans hypothèse, rien ne change (convention du 2026-09-20). Les numéros
 * renvoient à la spécification validée (`docs/wip/hypotheses-enonce-progress.md`,
 * sections C et D).
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import type { AnswerAssumptions } from '../../assumptions';

const eq = (a: string, b: string, assumptions?: AnswerAssumptions) =>
	areEquivalent(parseLatex(a), parseLatex(b), assumptions ? { assumptions } : undefined);

const X_POSITIVE: AnswerAssumptions = { x: 'positive' };
const X_NONNEGATIVE: AnswerAssumptions = { x: 'nonnegative' };
const X_NONZERO: AnswerAssumptions = { x: 'nonzero' };
const N_INTEGER: AnswerAssumptions = { n: 'integer' };
const N_NATURAL: AnswerAssumptions = { n: 'natural' };

// Les paires que les hypothèses rendent justes (section C).
const POSITIVE_PAIRS: [string, string][] = [
	['x^{a}\\times x^{b}', 'x^{a+b}'],
	['x^{a+2}', 'x^{2}\\times x^{a}'],
	['x\\times x^{a}', 'x^{a+1}'],
	['\\frac{x^{a}}{x^{b}}', 'x^{a-b}'],
	['\\left(x^{a}\\right)^{b}', 'x^{ab}'],
	['2^{x}\\times x^{x}', '(2x)^{x}'],
	['\\sqrt{x^{2}}', 'x'],
	['|x|', 'x']
];
const NONNEGATIVE_PAIRS: [string, string][] = [
	['\\sqrt{x^{2}}', 'x'],
	['|x|', 'x'],
	['\\sqrt{4x^{2}}', '2x']
];
const INTEGER_PAIRS: [string, string][] = [
	['(-2)^{2n}', '4^{n}'],
	['(-1)^{2n}', '1'],
	['(-1)^{n}\\times(-1)^{n}', '1'],
	['\\left((-2)^{n}\\right)^{2}', '4^{n}'],
	['(-2)^{2n+1}', '-2\\times 4^{n}'],
	['3\\times(-1)^{2n}', '3']
];

describe('sans hypothèse, les verdicts actuels (13)', () => {
	it.each([...POSITIVE_PAIRS, ...NONNEGATIVE_PAIRS, ...INTEGER_PAIRS])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('un objet vide ne change rien', () => {
		expect(eq('x^{a}\\times x^{b}', 'x^{a+b}', {})).toBe(false);
		expect(eq('(-2)^{2n}', '4^{n}', {})).toBe(false);
	});

	it('ce qui était juste le reste', () => {
		expect(eq('2^{x+1}', '2\\times 2^{x}')).toBe(true);
		expect(eq('\\sqrt{x^{2}}', '|x|')).toBe(true);
		expect(eq('5\\times(-2)^{n}', '-10\\times(-2)^{n-1}')).toBe(true);
	});
});

describe('x > 0 (8)', () => {
	it.each(POSITIVE_PAIRS)('%s ≡ %s', (a, b) => {
		expect(eq(a, b, X_POSITIVE)).toBe(true);
	});

	it('ce qui était juste le reste', () => {
		expect(eq('2^{x+1}', '2\\times 2^{x}', X_POSITIVE)).toBe(true);
		expect(eq('\\sqrt{x^{2}}', '|x|', X_POSITIVE)).toBe(true);
		expect(eq('x^{2}\\times x^{3}', 'x^{5}', X_POSITIVE)).toBe(true);
	});
});

describe('x ≥ 0 (9)', () => {
	it.each(NONNEGATIVE_PAIRS)('%s ≡ %s', (a, b) => {
		expect(eq(a, b, X_NONNEGATIVE)).toBe(true);
	});

	it('PAS x^a·x^b ≡ x^{a+b} (0^a indéfini ou nul selon a)', () => {
		expect(eq('x^{a}\\times x^{b}', 'x^{a+b}', X_NONNEGATIVE)).toBe(false);
		expect(eq('x^{a+2}', 'x^{2}\\times x^{a}', X_NONNEGATIVE)).toBe(false);
	});
});

describe('x ≠ 0 (10) : aucun gain attendu, garde', () => {
	it('ce qui était juste le reste', () => {
		expect(eq('x^{0}', '1', X_NONZERO)).toBe(true);
		expect(eq('\\frac{x^{3}}{x^{3}}', '1', X_NONZERO)).toBe(true);
	});

	it('rien de nouveau', () => {
		expect(eq('x^{a}\\times x^{b}', 'x^{a+b}', X_NONZERO)).toBe(false);
		expect(eq('|x|', 'x', X_NONZERO)).toBe(false);
		expect(eq('\\sqrt{x^{2}}', 'x', X_NONZERO)).toBe(false);
	});
});

describe('n entier (11) et n entier naturel (12)', () => {
	it.each(INTEGER_PAIRS)('n ∈ ℤ : %s ≡ %s', (a, b) => {
		expect(eq(a, b, N_INTEGER)).toBe(true);
	});

	it.each(INTEGER_PAIRS)('n ∈ ℕ : %s ≡ %s', (a, b) => {
		expect(eq(a, b, N_NATURAL)).toBe(true);
	});
});

describe('gardes anti faux positif (14-17)', () => {
	it('14. une hypothèse sur une AUTRE variable ne change rien', () => {
		expect(eq('x^{a}\\times x^{b}', 'x^{a+b}', { y: 'positive' })).toBe(false);
		expect(eq('|x|', 'x', { y: 'nonnegative' })).toBe(false);
		expect(eq('(-2)^{2n}', '4^{n}', { m: 'integer' })).toBe(false);
		expect(eq('(-2)^{2n}', '4^{n}', { x: 'positive' })).toBe(false);
	});

	it('15. x > 0 ne donne pas x^a ≡ x^b', () => {
		expect(eq('x^{a}', 'x^{b}', X_POSITIVE)).toBe(false);
		expect(eq('x^{a}\\times x^{b}', 'x^{ab}', X_POSITIVE)).toBe(false);
	});

	it('15. x > 0 ne donne pas (−x)^a·(−x)^b ≡ (−x)^{a+b}', () => {
		expect(eq('(-x)^{a}\\times(-x)^{b}', '(-x)^{a+b}', X_POSITIVE)).toBe(false);
	});

	it('15. l’exposant n’est pas concerné : x > 0 ne dit rien de a', () => {
		expect(eq('a^{x}\\times a^{y}', 'a^{x+y}', X_POSITIVE)).toBe(false);
		expect(eq('|a|', 'a', X_POSITIVE)).toBe(false);
	});

	it('16. n entier ne donne pas 2^n ≡ 3^n, ni (−2)^n ≡ 2^n', () => {
		expect(eq('2^{n}', '3^{n}', N_INTEGER)).toBe(false);
		expect(eq('(-2)^{n}', '2^{n}', N_INTEGER)).toBe(false);
		expect(eq('(-2)^{3n}', '8^{n}', N_INTEGER)).toBe(false);
		expect(eq('(-1)^{n}', '1', N_INTEGER)).toBe(false);
		expect(eq('(-2)^{n}\\times(-2)^{n}', '(-4)^{n}', N_NATURAL)).toBe(false);
	});

	it('16. n entier ne dit rien d’un exposant non entier', () => {
		expect(eq('(-2)^{n}', '4^{\\frac{n}{2}}', N_INTEGER)).toBe(false);
		expect(eq('(-2)^{2x}', '4^{x}', N_INTEGER)).toBe(false);
	});

	it('un signe moins sous la valeur absolue ne fait rien perdre', () => {
		expect(eq('|-x|', '|x|', X_POSITIVE)).toBe(true);
		expect(eq('|-x|', 'x', X_POSITIVE)).toBe(true);
		expect(eq('|-x|', 'x', X_NONNEGATIVE)).toBe(true);
		expect(eq('|-x|', '-x', X_POSITIVE)).toBe(false);
		expect(eq('4\\left|-x\\right|', '4\\sqrt{x^{2}}', X_POSITIVE)).toBe(true);
	});

	it('17. x > 0 déclaré : |x| pour x juste, −x pour x faux', () => {
		expect(eq('|x|', 'x', X_POSITIVE)).toBe(true);
		expect(eq('-x', 'x', X_POSITIVE)).toBe(false);
		expect(eq('|x-1|', 'x-1', X_POSITIVE)).toBe(false);
	});
});

describe('les options existantes cohabitent', () => {
	it('un budget épuisé reste prudent, hypothèses ou non', () => {
		const controller = new AbortController();
		controller.abort();
		expect(
			areEquivalent(parseLatex('x^{a}\\times x^{b}'), parseLatex('x^{a+b}'), {
				signal: controller.signal,
				assumptions: X_POSITIVE
			})
		).toBe(false);
	});
});

// Une variable indicée (x₁, u_n) est une AUTRE variable que sa base : « Soit x > 0 »
// ne dit rien des racines x₁, x₂. Faux positif trouvé en revue adverse (#522).
describe('Hypothèses : les variables indicées n’héritent pas de leur base', () => {
	it.each<[string, string, AnswerAssumptions]>([
		['|x_{1}|', 'x_{1}', X_POSITIVE],
		['|x_1|', 'x_1', X_POSITIVE],
		['|x_{1}|^{a}', 'x_{1}^{a}', X_POSITIVE],
		['|x_{n+1}|', 'x_{n+1}', X_NONNEGATIVE],
		['\\sqrt{x_{1}^{2}}', 'x_{1}', X_NONNEGATIVE],
		['x_{1}^{a}\\times x_{1}^{b}', 'x_{1}^{a+b}', X_POSITIVE],
		['|x\\times x_{1}|', 'x\\times x_{1}', X_POSITIVE],
		['(-1)^{2u_{n}}', '1', { u: 'integer' }]
	])('%s ≢ %s', (a, b, assumptions) => {
		expect(eq(a, b, assumptions)).toBe(false);
	});

	it('la base elle-même garde son hypothèse : |x| ≡ x avec x > 0', () => {
		expect(eq('|x|', 'x', X_POSITIVE)).toBe(true);
	});
});

// Une fonction que l'énoncé ne définit pas (f, g, u, f′) ne transmet pas l'hypothèse de
// son argument : n entier ne dit rien de f(n) (f(n) = n/2). Faux positif trouvé en revue (#522).
describe('Hypothèses : une fonction inconnue n’hérite pas du type de son argument', () => {
	it.each<[string, string, AnswerAssumptions]>([
		['(-1)^{2f(n)}', '1', N_INTEGER],
		['(-1)^{2g(n)}', '1', N_NATURAL],
		['(-1)^{2u(n)}', '1', N_INTEGER],
		["(-1)^{2f'(n)}", '1', N_INTEGER],
		['(-2)^{2f(x)}', '4^{f(x)}', { x: 'integer' }],
		['(-1)^{2n+2f(n)}', '1', N_INTEGER]
	])('%s ≢ %s', (a, b, assumptions) => {
		expect(eq(a, b, assumptions)).toBe(false);
	});

	it.each<[string, string, AnswerAssumptions]>([
		['(-1)^{2n}', '1', N_INTEGER],
		['(-1)^{2\\lfloor x \\rfloor}', '1', { x: 'integer' }],
		['|\\sqrt{x}|', '\\sqrt{x}', X_POSITIVE]
	])('fonctions connues toujours comprises : %s ≡ %s', (a, b, assumptions) => {
		expect(eq(a, b, assumptions)).toBe(true);
	});
});

// Liste blanche : une hypothèse ne vaut que pour une comparaison entièrement faite de
// nœuds algébriques simples. Une limite lie sa variable (x muet dans lim_{x→−1} x) :
// « x > 0 » ne dit rien de lui. Faux positifs trouvés en revue (#522), y compris à
// l'intérieur de la limite (lim |x| contre lim x).
describe('Hypothèses : ignorées dès qu’une expression sort de l’algèbre simple', () => {
	it.each<[string, string, AnswerAssumptions]>([
		['\\left|\\lim_{x\\to -1} x\\right|', '\\lim_{x\\to -1} x', X_POSITIVE],
		['\\left|\\lim_{x\\to -1} x\\right|', '\\lim_{x\\to -1} x', X_NONNEGATIVE],
		['\\left|\\lim_{t\\to -1} t\\right|', '\\lim_{t\\to -1} t', { t: 'positive' }],
		['\\left|x\\lim_{x\\to -1} x\\right|', 'x\\lim_{x\\to -1} x', X_POSITIVE],
		['\\lim_{x\\to -1} |x|', '\\lim_{x\\to -1} x', X_POSITIVE],
		[
			'\\left(\\lim_{x\\to -1} x\\right)^{a}\\left(\\lim_{x\\to -1} x\\right)^{b}',
			'\\left(\\lim_{x\\to -1} x\\right)^{a+b}',
			X_POSITIVE
		]
	])('%s ≢ %s', (a, b, assumptions) => {
		expect(eq(a, b, assumptions)).toBe(false);
	});
});
