/**
 * Garde-fou : le champ `approximate` d'une solution doit être la valeur
 * numérique de `value`.
 *
 * `approximate` sert au tri, à la déduplication (deux solutions distinctes à
 * `approximate` égal fusionnent), au rejet des valeurs interdites, aux tableaux
 * de signes. Le 2026-10-08, le solveur linéaire ne lisait que la partie
 * rationnelle du coefficient : x = √2 portait `approximate: 1`, et
 * (x − √2)(x − 1) = 0 perdait la solution 1.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { solve } from '../solve';
import { compile } from '../../eval/compile';
import { getVariables } from '../../eval/substitute';
import { analyzeSign } from '../../sign';
import { toLatex } from '../../latex-generator';
import type { RelationNode } from '../../types';
import { normalize, normalFormsEquivalent } from '../../normal';

function solveX(latex: string) {
	return solve(parseLatex(latex) as RelationNode, { variable: 'x' });
}

function sortedValues(latex: string): number[] {
	return solveX(latex)
		.solutions.map((s) => compile(s.value)({}))
		.sort((a, b) => a - b);
}

const CONSTANT_CORPUS = [
	// Linéaires à coefficients irrationnels
	'x=\\sqrt{2}',
	'\\sqrt{2}x=1',
	'\\sqrt{3}x=\\pi',
	'\\pi x=1',
	'2\\sqrt{2}x+\\sqrt{3}=0',
	'\\frac{x}{\\sqrt{5}}=\\sqrt{2}',
	// Produits nuls
	'(x-\\sqrt{2})(x-1)=0',
	'(\\sqrt{2}x-1)(2x-1)=0',
	// Second degré
	'2x^2=1',
	'x^2-\\sqrt{2}x-1=0',
	// Puissances et cubiques
	'2\\sqrt{2}x^3=1',
	'2x^3=3',
	'x^5=\\sqrt{2}',
	'\\sqrt{2}x^4=1',
	'x^3+\\sqrt{2}x=1',
	'x^3-3x^2+3x=3',
	'x^3+3x^2+3x=1',
	'x^3-6x^2+12x=10',
	'x^3+x=1',
	'\\sqrt{2}x^3+x=1',
	'x^3-\\sqrt{2}x^2+x=1',
	'x^4=17+12\\sqrt{2}',
	'x^3=2\\sqrt{2}+1',
	'ex^3=1',
	'\\pi x^3=1',
	// Radicaux
	'\\sqrt{x}=\\sqrt{2}',
	'\\sqrt{2x+1}=3',
	// Rationnelles
	'\\frac{x-\\sqrt{2}}{x-1}=0',
	'\\frac{\\sqrt{2}x-1}{2x-1}=0',
	'\\frac{1}{x}=\\sqrt{3}',
	// Transcendantes
	'e^x=\\sqrt{2}',
	'\\sqrt{2}e^x=3',
	'\\ln(\\sqrt{2}x)=1'
];

describe('solve : approximate = valeur numérique de value', () => {
	it.each(CONSTANT_CORPUS)('%s', (latex) => {
		const result = solveX(latex);
		expect(result.solutions.length).toBeGreaterThan(0);
		for (const s of result.solutions) {
			const label = `${latex} → ${toLatex(s.value)}`;
			// La lettre e seule est la constante d'Euler (convention de compile)
			expect(
				[...getVariables(s.value)].filter((v) => v !== 'e'),
				label
			).toEqual([]);
			const reference = compile(s.value)({});
			expect(Number.isFinite(reference), label).toBe(true);
			expect(s.approximate, label).toBeDefined();
			expect(Math.abs((s.approximate ?? Number.NaN) - reference), label).toBeLessThan(1e-9);
		}
	});

	it.each(['\\sin(x)=\\frac{\\sqrt{2}}{2}', '\\cos(2x)=\\frac{1}{2}', '\\tan(x)=\\sqrt{3}'])(
		'trigonométrique %s : chaque représentant est cohérent',
		(latex) => {
			const result = solveX(latex);
			expect(result.solutions.length).toBeGreaterThan(0);
			for (const s of result.solutions) {
				if (getVariables(s.value).size > 0) {
					// Famille paramétrée (k ∈ ℤ) : pas de valeur numérique unique
					expect(s.approximate).toBeUndefined();
					continue;
				}
				const reference = compile(s.value)({});
				expect(Math.abs((s.approximate ?? Number.NaN) - reference)).toBeLessThan(1e-9);
			}
		}
	);

	it('paramétrique a x = 1 : solution symbolique sans approximate', () => {
		const result = solve(parseLatex('ax=1') as RelationNode, { variable: 'x' });
		for (const s of result.solutions) {
			expect(s.approximate).toBeUndefined();
		}
	});
});

describe('conséquences visibles d’un approximate faux', () => {
	it('(x − √2)(x − 1) = 0 : deux solutions, la déduplication ne fusionne pas √2 et 1', () => {
		const values = sortedValues('(x-\\sqrt{2})(x-1)=0');
		expect(values).toHaveLength(2);
		expect(values[0]).toBeCloseTo(1, 12);
		expect(values[1]).toBeCloseTo(Math.SQRT2, 12);
	});

	it('(√2 x − 1)(2x − 1) = 0 : deux solutions, 1/2 et √2/2', () => {
		const values = sortedValues('(\\sqrt{2}x-1)(2x-1)=0');
		expect(values).toHaveLength(2);
		expect(values[0]).toBeCloseTo(0.5, 12);
		expect(values[1]).toBeCloseTo(Math.SQRT1_2, 12);
	});

	it('(x − √2)/(x − 1) = 0 : x = √2 n’est pas confondu avec la valeur interdite 1', () => {
		const result = solveX('\\frac{x-\\sqrt{2}}{x-1}=0');
		expect(result.solutions).toHaveLength(1);
		expect(result.solutions[0].approximate).toBeCloseTo(Math.SQRT2, 12);
	});

	it('tableau de signes de (√2 x − 1)(2x − 1) : deux zéros, 1/2 puis √2/2', () => {
		const sign = analyzeSign(parseLatex('(\\sqrt{2}x-1)(2x-1)'));
		const zeros = sign.zeros.map((z) => compile(z.value)({}));
		expect(zeros).toHaveLength(2);
		expect(zeros[0]).toBeCloseTo(0.5, 12);
		expect(zeros[1]).toBeCloseTo(Math.SQRT1_2, 12);
	});
});

describe('x^n = c avec coefficient : chemin de la racine n-ième, pas Cardano', () => {
	it('2√2 x³ = 1 → x = √2/2, sans ∛0', () => {
		const result = solveX('2\\sqrt{2}x^3=1');
		expect(result.solutions).toHaveLength(1);
		const latex = toLatex(result.solutions[0].value);
		expect(latex).not.toContain('\\sqrt[3]{0}');
		expect(latex).not.toContain('+');
		expect(compile(result.solutions[0].value)({})).toBeCloseTo(Math.SQRT1_2, 12);
		// (√2/2)³ = √2/4 : la racine cubique se simplifie
		expect(latex).not.toContain('\\sqrt[3]');
		expect(
			normalFormsEquivalent(
				normalize(result.solutions[0].value),
				normalize(parseLatex('\\frac{\\sqrt{2}}{2}'))
			)
		).toBe(true);
	});

	it.each([
		['27x^3=8', '\\frac{2}{3}'],
		['4x^4=1', '\\frac{\\sqrt{2}}{2}'],
		['\\sqrt{2}x^5=8', '\\sqrt{2}']
	])('%s : racine simplifiée en %s', (latex, expected) => {
		const values = solveX(latex).solutions.map((s) => s.value);
		const target = normalize(parseLatex(expected));
		expect(
			values.some((v) => normalFormsEquivalent(normalize(v), target)),
			values.map((v) => toLatex(v)).join(' ; ')
		).toBe(true);
	});

	it('2x³ = 3 → une seule racine cubique', () => {
		const latex = toLatex(solveX('2x^3=3').solutions[0].value);
		expect(latex).not.toContain('+');
		expect(latex.match(/\\sqrt\[3\]/g)).toHaveLength(1);
	});

	it('√2 x⁴ = 1 → ±racine exacte, pas une fraction décimale', () => {
		const result = solveX('\\sqrt{2}x^4=1');
		expect(result.solutions).toHaveLength(2);
		for (const s of result.solutions) {
			expect(toLatex(s.value)).toContain('\\sqrt');
			expect(Math.abs(compile(s.value)({}))).toBeCloseTo(Math.pow(2, -1 / 8), 12);
		}
	});

	it('x³ − 3x² + 3x = 3 (p = 0 après décalage) : pas de ∛0', () => {
		const result = solveX('x^3-3x^2+3x=3');
		expect(result.solutions).toHaveLength(1);
		expect(toLatex(result.solutions[0].value)).not.toContain('\\sqrt[3]{0}');
		expect(compile(result.solutions[0].value)({})).toBeCloseTo(1 + Math.cbrt(2), 12);
	});

	it('x⁴ = 17 + 12√2 : deux constantes ne font pas refuser x^n = k ; racine exacte, pas une fraction décimale', () => {
		const result = solveX('x^4=17+12\\sqrt{2}');
		expect(result.solutions).toHaveLength(2);
		for (const s of result.solutions) {
			expect(toLatex(s.value)).not.toMatch(/\d{6,}/);
			expect(Math.abs(compile(s.value)({}))).toBeCloseTo(1 + Math.SQRT2, 12);
		}
	});

	it('x³ = 2√2 + 1 : une seule racine cubique, pas Cardano', () => {
		const latex = toLatex(solveX('x^3=2\\sqrt{2}+1').solutions[0].value);
		expect(latex.match(/\\sqrt\[3\]/g)).toHaveLength(1);
	});

	it('e x³ = 1 : e est la constante d’Euler, même chemin que π x³ = 1', () => {
		const result = solveX('ex^3=1');
		expect(result.solutions).toHaveLength(1);
		const latex = toLatex(result.solutions[0].value);
		expect(latex.match(/\\sqrt\[3\]/g)).toHaveLength(1);
		expect(compile(result.solutions[0].value)({})).toBeCloseTo(Math.cbrt(1 / Math.E), 12);
	});
});
