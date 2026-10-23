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
import { finalDerivativeOf } from '../../pedagogical-differentiation/final-form';

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
		// Exponentielle : l'expression entière
		['x^2e^{-x}', String.raw`x \left( 2 - x \right) \exponentialE^{-x}`],
		['x^3e^x', String.raw`x^2 \left( x + 3 \right) \exponentialE^x`],
		['(x^2-3)e^x', String.raw`\left( x - 1 \right) \left( x + 3 \right) \exponentialE^x`],
		// Polynôme : racines irrationnelles comprises
		[
			String.raw`\frac{x^3}{3}-2x`,
			String.raw`\left( x - \sqrt{2} \right) \left( x + \sqrt{2} \right)`
		],
		['x^3-3x', String.raw`3 \left( x - 1 \right) \left( x + 1 \right)`],
		// Un nombre devant un polynôme de degré ≥ 2 : forme de classe (§ 49)
		[
			String.raw`\frac{2x}{x^2-9}`,
			String.raw`-\dfrac{2 \left( x^2 + 9 \right)}{\left( x^2 - 9 \right)^2}`
		]
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
		['x^2-3x+1', '2 x - 3'],
		// Revue 5b : un nombre devant une somme n'aide pas à lire le signe
		['2x^2-8x', '4 x - 8'],
		[String.raw`e^{2x}-4e^x`, String.raw`2 \exponentialE^{2 x} - 4 \exponentialE^x`],
		[String.raw`2\sin(x)+\cos(2x)`, String.raw`2 \cos\left( x \right) - 2 \sin\left( 2 x \right)`],
		// Revue 5b : l'exposant d'une exponentielle reste tel qu'écrit
		[String.raw`e^{x^2-1}`, String.raw`2 x \exponentialE^{x^2 - 1}`],
		[String.raw`xe^{x^2-4}`, String.raw`\left( 2 x^2 + 1 \right) \exponentialE^{x^2 - 4}`],
		// Décimaux qui ne se factorisent pas
		[String.raw`x^3-0{,}75x`, '3 x^2 - 0.75'],
		[String.raw`1{,}2x^3-0{,}6x`, '3.6 x^2 - 0.6']
	])('%s : la forme de 5a reste, %s', (f, expected) => {
		expect(forms(f)).toEqual({ final: expected, factored: expected });
	});

	// Revue 5b : hors de l'exponentielle seulement ; un décimal tapé reste décimal (S1)
	it.each([
		[
			String.raw`e^{x^2-2x}`,
			String.raw`\left( 2 x - 2 \right) \exponentialE^{x^2 - 2 x}`,
			String.raw`2 \left( x - 1 \right) \exponentialE^{x^2 - 2 x}`
		],
		[String.raw`x^3-2{,}4x^2`, '3 x^2 - 4.8 x', String.raw`x \left( 3 x - 4.8 \right)`]
	])('%s : %s → %s', (f, final, factored) => {
		expect(forms(f)).toEqual({ final, factored });
	});

	// Revue 5b (hérité de 5a) : −(u/v) gardait un numérateur non réduit,
	// `(x² − 2x(x + 2))/(x + 2)²`, aussi dans `.dériver`
	it('−x²/(x+2) : numérateur réduit, puis factorisé', () => {
		const f = String.raw`-\frac{x^2}{x+2}`;
		expect(forms(f)).toEqual({
			final: String.raw`-\dfrac{x^2 + 4 x}{\left( x + 2 \right)^2}`,
			factored: String.raw`-\dfrac{x \left( x + 4 \right)}{\left( x + 2 \right)^2}`
		});
		const derived = finalDerivativeOf(parseLatex(f));
		expect(derived && toLatex(derived)).toBe(
			String.raw`-\dfrac{x^2 + 4 x}{\left( x + 2 \right)^2}`
		);
	});

	// Racines avec fraction (David, 2026-10-24 : « je te suis ») : la forme de 5a,
	// plus lisible que `−2(x − √2/2)(x + √2/2)e^{−x²}`
	it.each([
		[String.raw`xe^{-x^2}`],
		[String.raw`\frac{x^2-3x+2}{x^2+1}`],
		[String.raw`\frac{x^3}{3}-\frac{x}{2}`]
	])('%s : racines avec fraction, pas de factorisation', (f) => {
		const { final, factored } = forms(f);
		expect(factored).toBe(final);
	});

	it.each([
		[String.raw`\frac{x^3}{x^2-4}`, String.raw`2 \sqrt{3}`],
		[String.raw`\frac{x^3}{3}-2x`, String.raw`\sqrt{2}`]
	])('%s : racines sans fraction, factorisée', (f, root) => {
		const { final, factored } = forms(f);
		expect(factored).not.toBe(final);
		expect(factored).toContain(root);
	});

	it('reducedDerivative (CLI) rend la forme factorisée', () => {
		const result = computeVariations(parseLatex(String.raw`\frac{x^2}{x+1}`), { variable: 'x' });
		expect(toLatex(reducedDerivative(result.derivative, result.expression))).toBe(
			String.raw`\dfrac{x \left( x + 2 \right)}{\left( x + 1 \right)^2}`
		);
	});
});
