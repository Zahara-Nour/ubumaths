/**
 * Les parenthèses des coefficients substitués : seulement quand elles servent.
 *
 * Dit par David en regardant l'écran : « le top ça serait de ne pas avoir de
 * parenthèses inutiles comme par exemple avec (1) ».
 *
 * ⚠️ Elles ne sont pas toutes inutiles. Sans elles, `(-3)^2` devient `-3^2`
 * (soit −9), `4 × (-6)` devient `4 × -6`, et `-(-3)` devient `--3`. La règle
 * est donc : un entier positif se pose nu, tout le reste garde ses parenthèses.
 */

import { describe, it, expect } from 'vitest';
import { generateEquationSteps, QuadraticEquationRenderer } from '../index';
import { parseCustomSafe } from '../../parser/custom';

const ast = (s: string) => (parseCustomSafe(s) as { ast: never }).ast;

function latexOf(source: string, rule: string): string {
	const steps = generateEquationSteps(ast(source), { level: 'lycee' });
	const rendered = new QuadraticEquationRenderer().renderAll(steps, {
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	const step = rendered.find((s) => s.rule === rule);
	if (step === undefined) throw new Error(`étape ${rule} absente pour ${source}`);
	return step.expressionLatex ?? '';
}

describe('un coefficient positif se pose nu', () => {
	it('le discriminant : 4 × 1 × 2, pas 4 × (1) × (2)', () => {
		const latex = latexOf('x^2-3x+2=0', 'compute-discriminant');

		expect(latex).toContain('4 \\times 1 \\times 2');
		expect(latex).not.toContain('\\left(1\\right)');
		expect(latex).not.toContain('\\left(2\\right)');
	});

	it('le dénominateur : 2 × 1', () => {
		const latex = latexOf('x^2-3x+2=0', 'apply-quadratic-formula');

		expect(latex).toContain('2 \\times 1');
		expect(latex).not.toContain('2 \\times \\left(1\\right)');
	});

	it('un b positif : −5, pas −(5)', () => {
		const latex = latexOf('x^2+5x+6=0', 'apply-quadratic-formula');

		expect(latex).toContain('-5 -');
		expect(latex).not.toContain('-\\left(5\\right)');
	});
});

describe('un coefficient négatif garde les siennes', () => {
	/**
	 * ⚠️ Ce sont ces trois cas qui interdisent de retirer les parenthèses
	 * partout : chacun change la VALEUR de l'expression, pas son allure.
	 */
	it('un carré : (−3)², jamais −3²', () => {
		const latex = latexOf('x^2-3x+2=0', 'compute-discriminant');

		// −3² vaudrait −9 au lieu de 9.
		expect(latex).toContain('\\left(-3\\right)^2');
	});

	it('un produit : 4 × (−6), jamais 4 × −6', () => {
		const latex = latexOf('x^2-x-6=0', 'compute-discriminant');

		expect(latex).toContain('\\times \\left(-6\\right)');
	});

	it('un opposé : −(−3), jamais −−3', () => {
		const latex = latexOf('x^2-3x+2=0', 'apply-quadratic-formula');

		expect(latex).toContain('-\\left(-3\\right)');
	});
});
