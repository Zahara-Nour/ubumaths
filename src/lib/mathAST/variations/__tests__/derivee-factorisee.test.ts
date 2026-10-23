/**
 * La dérivée au-dessus d'un tableau de variations : écrite pour qu'on y LISE
 * LE SIGNE (décision D2, lot 5b du chantier simplify-carte, 2026-10-23).
 *
 * Avant : `tidyTerms`, numérateur d'un quotient réduit — `x²/(x+1)` donnait
 * `(x² + 2x)/(x + 1)²`, `x³/3 − 2x` donnait `x² − 2` : l'élève devait encore
 * factoriser pour lire le signe. Désormais : la forme finale de `.dériver`
 * (lot 5a), puis la politique `factoriser` (numérateur seul pour un quotient,
 * l'expression entière sinon). Rien ne se factorise (Δ < 0) : la forme de 5a.
 */

import { describe, it, expect } from 'vitest';
import { computeVariations } from '../compute';
import { displayedDerivatives, reducedDerivative } from '../display';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';

function forms(latex: string): { final: string; factored: string } {
	const result = computeVariations(parseLatex(latex), { variable: 'x' });
	const { final, factored } = displayedDerivatives(result.derivative, result.expression);
	return { final: toLatex(final), factored: toLatex(factored) };
}

describe('f′ factorisée pour lire son signe', () => {
	it.each([
		// Quotient : numérateur seul factorisé, dénominateur tel quel
		[
			String.raw`\frac{x^2}{x+1}`,
			String.raw`\dfrac{x \left( x + 2 \right)}{\left( x + 1 \right)^2}`
		],
		[
			String.raw`\frac{x^2+3}{x-1}`,
			String.raw`\dfrac{\left( x + 1 \right) \left( x - 3 \right)}{\left( x - 1 \right)^2}`
		],
		[
			String.raw`\frac{x}{x^2+1}`,
			String.raw`\dfrac{\left( 1 - x \right) \left( 1 + x \right)}{\left( x^2 + 1 \right)^2}`
		],
		// Un − devant reste : le signe se lit encore
		[
			String.raw`\frac{2x}{x^2-9}`,
			String.raw`-\dfrac{2 \left( x^2 + 9 \right)}{\left( x^2 - 9 \right)^2}`
		],
		// Exponentielle : l'expression entière
		['x^2e^{-x}', String.raw`x \left( 2 - x \right) \exponentialE^{-x}`],
		['x^3e^x', String.raw`x^2 \left( x + 3 \right) \exponentialE^x`],
		['(x^2-3)e^x', String.raw`\left( x - 1 \right) \left( x + 3 \right) \exponentialE^x`],
		// Polynôme : racines irrationnelles comprises
		[
			String.raw`\frac{x^3}{3}-2x`,
			String.raw`\left( x - \sqrt{2} \right) \left( x + \sqrt{2} \right)`
		],
		['x^3-3x', String.raw`3 \left( x - 1 \right) \left( x + 1 \right)`]
	])('%s → %s', (f, expected) => {
		expect(forms(f).factored).toBe(expected);
		expect(forms(f).final).not.toBe(expected);
	});

	it.each([
		// Déjà factorisée par 5a
		[String.raw`\frac{e^x}{x}`, String.raw`\dfrac{\left( x - 1 \right) \exponentialE^x}{x^2}`],
		['xe^x', String.raw`\left( x + 1 \right) \exponentialE^x`],
		// Q18 (5a) : le facteur commun déjà divisé
		[String.raw`\frac{\ln x}{x^2}`, String.raw`\dfrac{1 - 2 \ln\left( x \right)}{x^3}`],
		[String.raw`\frac{x-1}{x^2}`, String.raw`\dfrac{2 - x}{x^3}`],
		[String.raw`\frac{x+1}{x-2}`, String.raw`-\dfrac{3}{\left( x - 2 \right)^2}`],
		// Δ < 0 : rien à factoriser
		[String.raw`\frac{x^3}{3}+x`, 'x^2 + 1'],
		[String.raw`\frac{x^3}{3}-x^2+5x`, 'x^2 - 2 x + 5'],
		// Degré 1 : inchangée
		['x^2-3x+1', '2 x - 3']
	])('%s : la forme de 5a reste, %s', (f, expected) => {
		expect(forms(f)).toEqual({ final: expected, factored: expected });
	});

	it('reducedDerivative (CLI) rend la forme factorisée', () => {
		const result = computeVariations(parseLatex(String.raw`\frac{x^2}{x+1}`), { variable: 'x' });
		expect(toLatex(reducedDerivative(result.derivative, result.expression))).toBe(
			String.raw`\dfrac{x \left( x + 2 \right)}{\left( x + 1 \right)^2}`
		);
	});
});
