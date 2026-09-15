/**
 * Asymptotes exactes, par division euclidienne.
 *
 * Quand l'expression est une fraction rationnelle, le quotient EST l'asymptote,
 * sans sondage : ni seuil, ni extrapolation, ni bruit. Le numérique reste le
 * repli pour tout le reste — √(x²+1), arctan, exp, la sigmoïde.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { compile } from '$lib/mathAST/eval/compile';
import type { MathNode } from '$lib/mathAST/types';
import { exactAsymptotes } from '../asymptotes-exactes';
import { analyzeFunction, buildAnalysisAST } from '../analysis';

function asymptotesOf(latex: string) {
	return exactAsymptotes(parseLatex(latex), 'f');
}

describe('exactAsymptotes', () => {
	it('rend une oblique exacte, coefficients et libellé', () => {
		const found = asymptotesOf('\\frac{x^2+3x}{x-2}');

		expect(found).not.toBeNull();
		expect(found?.oblique.length).toBe(1);
		expect(found?.oblique[0].m).toBe(1);
		expect(found?.oblique[0].b).toBe(5);
		expect(found?.oblique[0].exactLatex?.replaceAll(' ', '')).toBe('y=x+5');
	});

	it('va au degré que le numérique ne tient pas', () => {
		// (x⁴+1)/(x-1) = x³ + x² + x + 1 + 2/(x-1)
		const found = asymptotesOf('\\frac{x^4+1}{x-1}');

		expect(found?.polynomial.length).toBe(1);
		expect([...(found?.polynomial[0].coefficients ?? [])]).toEqual([1, 1, 1, 1]);
	});

	it('rend une horizontale quand les degrés sont égaux', () => {
		const found = asymptotesOf('\\frac{2x+1}{x-1}');

		expect(found?.horizontal.length).toBe(1);
		expect(found?.horizontal[0].y).toBe(2);
		expect(found?.horizontal[0].direction).toBe('both');
	});

	it('rend y = 0 quand le numérateur est de degré inférieur', () => {
		const found = asymptotesOf('\\frac{1}{x}');

		expect(found?.horizontal.length).toBe(1);
		expect(found?.horizontal[0].y).toBe(0);
	});

	it('garde les fractions exactes dans le libellé', () => {
		// (2x²+x)/(4x-2) : l'asymptote a des coefficients fractionnaires
		const found = asymptotesOf('\\frac{2x^2+x}{4x-2}');

		expect(found?.oblique.length).toBe(1);
		expect(found?.oblique[0].exactLatex).toContain('frac');
	});

	it("refuse une fraction dont le numérateur n'est pas polynomial en x", () => {
		// ⚠️ Le piège : la forme normale tient `e^x`, `ln(x)` et `sin(x)` pour des
		// « variables », et leur degré EN x vaut zéro. e^x/x passait donc pour la
		// fraction 0/x et recevait `y = 0` des DEUX côtés — alors que la courbe
		// part à 2,7e41 en x = 100. Le numérique, lui, disait « à gauche » et
		// avait raison : c'est à lui de répondre ici.
		expect(asymptotesOf('\\frac{e^x}{x}')).toBeNull();
		expect(asymptotesOf('\\frac{e^{-x}}{x}')).toBeNull();
		expect(asymptotesOf('\\frac{2e^x}{x}')).toBeNull();
		expect(asymptotesOf('\\frac{2^x}{x}')).toBeNull();
		expect(asymptotesOf('\\frac{\\ln(x)}{x}')).toBeNull();
		expect(asymptotesOf('\\frac{\\sin(x)}{x}')).toBeNull();
		expect(asymptotesOf('\\frac{x}{\\ln(x)}')).toBeNull();
	});

	it('refuse un dénominateur constant : la fonction est alors un polynôme', () => {
		expect(asymptotesOf('\\frac{x^2+1}{2}')).toBeNull();
		expect(asymptotesOf('\\frac{x^2+1}{\\pi}')).toBeNull();
	});

	it("ne pose pas d'asymptote sur la courbe elle-même", () => {
		// Le quotient est exact et le reste nul : l'« asymptote » serait la
		// courbe. La réduction par PGCD de la forme normale ramène ces
		// fractions à un polynôme, et un polynôme est refusé.
		expect(asymptotesOf('\\frac{x^2-1}{x-1}')).toBeNull();
		expect(asymptotesOf('\\frac{x^3+x}{x}')).toBeNull();
		expect(asymptotesOf('\\frac{x^2}{3x}')).toBeNull();
	});

	it('laisse la main au numérique hors des fractions rationnelles', () => {
		expect(asymptotesOf('\\sqrt{x^2+1}')).toBeNull();
		expect(asymptotesOf('\\arctan(x)')).toBeNull();
		expect(asymptotesOf('e^x')).toBeNull();
		expect(asymptotesOf('x^2+1')).toBeNull();
	});
});

describe('analyzeFunction, chemin symbolique', () => {
	const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

	function analyze(latex: string) {
		const expression = parseLatex(latex);
		const evaluator = evaluatorOf(expression);
		return analyzeFunction(evaluator, viewport, 'f', buildAnalysisAST(expression));
	}

	function evaluatorOf(expression: MathNode) {
		const compiled = compile(expression);
		return (x: number): number | null => {
			const y = compiled({ x });
			return Number.isFinite(y) ? y : null;
		};
	}

	it("prend l'asymptote exacte quand l'AST est une fraction rationnelle", () => {
		const analysis = analyze('\\frac{x^2+3x}{x-2}');

		expect(analysis.obliqueAsymptotes.length).toBe(1);
		expect(analysis.obliqueAsymptotes[0].m).toBe(1);
		expect(analysis.obliqueAsymptotes[0].b).toBe(5);
		expect(analysis.obliqueAsymptotes[0].exactLatex).toBeDefined();
	});

	it('trouve une asymptote courbe que le numérique laissait passer', () => {
		// Degré 3 : au-delà du plafond du sondage, qui ne lit plus l'unité sur
		// x³ = 4e12. La division euclidienne, elle, ne sonde rien.
		const analysis = analyze('\\frac{x^4+1}{x-1}');

		expect(analysis.polynomialAsymptotes.length).toBe(1);
		expect([...analysis.polynomialAsymptotes[0].coefficients]).toEqual([1, 1, 1, 1]);
	});

	it('se replie sur le numérique, sans bruit, hors des fractions rationnelles', () => {
		const analysis = analyze('\\arctan(x)');

		expect(analysis.horizontalAsymptotes.length).toBe(2);
		expect(analysis.horizontalAsymptotes.every((a) => a.exactLatex === undefined)).toBe(true);
		// ±π/2 à 7e-6 près : c'est la précision du sondage, et c'est exactement
		// ce que le chemin symbolique supprime quand il s'applique.
		const levels = analysis.horizontalAsymptotes.map((a) => a.y).sort((a, b) => a - b);
		expect(levels[0]).toBeCloseTo(-Math.PI / 2, 4);
		expect(levels[1]).toBeCloseTo(Math.PI / 2, 4);
	});

	it("laisse le numérique garder son asymptote d'un seul côté", () => {
		// e^x/x : à gauche la courbe colle à y = 0, à droite elle explose. Le
		// chemin symbolique doit s'effacer complètement — direction comprise.
		const analysis = analyze('\\frac{e^x}{x}');

		expect(analysis.horizontalAsymptotes.length).toBe(1);
		expect(analysis.horizontalAsymptotes[0].y).toBeCloseTo(0, 6);
		expect(analysis.horizontalAsymptotes[0].direction).toBe('left');
		expect(analysis.horizontalAsymptotes[0].exactLatex).toBeUndefined();
	});

	it("n'invente pas d'asymptote pour un polynôme", () => {
		const analysis = analyze('x^2+1');

		expect(analysis.horizontalAsymptotes).toEqual([]);
		expect(analysis.obliqueAsymptotes).toEqual([]);
		expect(analysis.polynomialAsymptotes).toEqual([]);
	});
});
