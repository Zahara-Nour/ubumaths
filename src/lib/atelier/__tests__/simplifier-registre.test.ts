/**
 * `.simplifier` : les étapes de l'Atelier aboutissent à la réponse du registre
 * (chantier `registre-reference`, D1, D3 et R5).
 *
 * L'Atelier affiche la réponse du registre (`simplify.command`, qui garde le
 * domaine : `keep-domain.ts`) ; ses étapes viennent de `simplifySteps`. Si les
 * deux divergeaient, la dernière étape contredirait la ligne affichée.
 * Lignes : les `.simplifier` des tests de l'Atelier sans hypothèse (`avec`,
 * `dans` : étape H), relevées le 2026-11-03.
 */

import { describe, expect, it } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { displayUnitsInLatex } from '$lib/mathAST/units/display';
import { degreeSignWritten } from '$lib/mathAST/cli/core/degrees';
import { simplifySteps } from '../simplify-steps';

const LINES: readonly string[] = [
	// Le signe du produit tapé tel quel (input-detector-signe-produit)
	'2·x+3·x',
	'(1/2)^x·(1/2)',
	'x·x/x',
	'(1/2)^x*(1/2)',
	'(arccos(x)-π)/(arccos(x)-π)',
	'(arctan(x)-1)/(arctan(x)-1)',
	'(arctan(x)-2)/(arctan(x)-2)',
	'(ln(x))^2/ln(x)',
	'(x^2-1)/(x+1)',
	'(x^2-2)/(x-sqrt(2))',
	'(x^2-2)/(x^2-2)',
	'(x^2+x-1)/(x^2+x-1)',
	'(x^3-2)/(x^3-2)',
	'(x^4-5x^2+6)/(x^4-5x^2+6)',
	'(x+1)^2',
	'\\frac{2^x\\cdot 4}{2}',
	'\\frac{2e^x}{4e^{3x}}',
	'\\frac{3x^3}{x^2}',
	'\\frac{3xe^{x}}{e^{x}}',
	'\\frac{6}{8}+\\frac13',
	'\\frac{6\\cdot2^x}{2}',
	'\\frac{e^{2x}}{3e^x}',
	'\\frac{e^x e}{e^2}',
	'\\frac{xe^{2x}}{e^x}',
	'1/(1+x)',
	'1/(e^x-1)-1/(e^x-1)',
	'2(x+3)',
	'2*x*e^x*e',
	'2/(2x+2)',
	'2/2',
	'2/2^2',
	'2^{3/2}',
	'2^{3x}/2^x',
	'2^x*3*2',
	'2^x/2^{x+1}',
	'2A + A',
	'2ln(xy)-ln(xy)',
	'2sin(π/6)+x',
	'2x+1<7',
	'2x+3',
	'2x+3x',
	'3e^{2x}/e^x',
	'8^{1/2}',
	'a',
	'arcsin(x)/arcsin(x)',
	'cos(-60°)x',
	'cos(π/3)',
	'cos(π/3)/x',
	'cos(π/5)x',
	'cos(0)x',
	'cos(11π/5)x',
	'cos(420°)',
	'cos(7π/3)x',
	'cos(x+π/3)',
	'cot(x)/cot(x)',
	'd + 1',
	'e*e^{2x}',
	'e/e^x',
	'e^(-ln(x))',
	'e^(2ln(-3))',
	'e^(2ln(x))',
	'e^(2ln(x^2))',
	'e^(ln(-3))',
	'e^(ln(x))',
	'e^(ln(x^2))',
	'e^{2x}/e^{x-1}',
	'e^{2x}/e^x',
	'e^{3x}/e^{-x}',
	'e^x(x+1)e^{2x}',
	'e^x*e',
	'e^x*e^{-x}',
	'e^x*e^{2x}',
	'e^x*x*e',
	'e^x/e',
	'e^x/e^{2x+1}',
	'e^x/e^{x+1}',
	'e^x/e^x',
	'exp(ln(-3))',
	'f',
	'f(2x)',
	'f(x)^-1',
	'f(x)+1',
	'ln((x+y)z)',
	'ln(1-x^2)-ln(1-x^2)',
	'ln(1+x)',
	'ln(2x)-ln(2x)',
	'ln(2x)-ln(2x)+1',
	'ln(e^x)',
	'ln(x(x+1))-ln(x(x+1))',
	'ln(x(x+1))',
	'ln(x)-ln(x)',
	'ln(x)/ln(x)+ln(x/2)/ln(x/2)',
	'ln(x)/ln(x)+sqrt(-x)',
	'ln(x*y)',
	'ln(x/(x+1))',
	'ln(x/y)-ln(x/y)',
	'ln(x/y)',
	'ln(x^(-2))-ln(x^(-2))',
	'ln(x^2-1)-ln(x^2-1)',
	'ln(x^2-2)-ln(x^2-2)',
	'ln(x^2)-ln(x^2)',
	'ln(x^2)',
	'ln(x^2)*sqrt(-x)',
	'ln(x^2)+1/(x-1)',
	'ln(x^2)+ln(-x)',
	'ln(x^2)+ln(x)',
	'ln(x^3)-ln(x^3)',
	'ln(x^3)',
	'ln(xy)-ln(xy)',
	'ln(xy)',
	'sin(-π/6)x',
	'sin(π)x+1',
	'sin(π/12)x',
	'sin(π/4)x',
	'sin(π/6)+cos(π/3)',
	'sqrt(-x^2)-sqrt(-x^2)',
	'sqrt(8)',
	'sqrt(8)+x/2',
	'sqrt(x)^2',
	'sqrt(x)sqrt(x+1)',
	'sqrt(x/y)',
	'sqrt(x^2-3)-sqrt(x^2-3)',
	'tan(π/2)x',
	'tan(π/4)x',
	'tan(5π/2)',
	'tan(x)/tan(x)',
	'x cos(π/3)',
	'x cos(60°)',
	'x e^x e^2 e^3',
	'x*e^x*e',
	'x/x',
	'x/x^2',
	'x/x+ln(x)',
	'x^2-4',
	'x^2/x',
	'x^2/x+x',
	'x^2+2x+1',
	'x^3/x^2',
	'x+x'
];

/** La réponse du registre, habillée comme l'Atelier l'affiche (unités, degrés). */
function registreAnswer(expression: string): string | null {
	const result = new WebReplEngine().execute(`.simplify ${expression}`);
	if (!result.success || result.answer === undefined) return null;
	return degreeSignWritten(displayUnitsInLatex(result.answer));
}

/** Les lignes où les deux répondent (sans étapes : la réponse du registre seule). */
const PAIRS = LINES.flatMap((expression) => {
	const steps = simplifySteps(expression);
	const registre = registreAnswer(expression);
	return steps === null || registre === null ? [] : [[expression, steps.answer, registre] as const];
});

describe('.simplifier : la dernière étape est la réponse du registre', () => {
	it.each(PAIRS)('%s', (_expression, steps, registre) => {
		expect(steps).toBe(registre);
	});

	it('les lignes ont bien des étapes à comparer', () => {
		expect(PAIRS.length).toBeGreaterThan(80);
	});
});
