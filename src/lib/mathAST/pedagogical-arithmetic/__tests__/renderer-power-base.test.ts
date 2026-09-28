/**
 * Le renderer à surlignage réécrit `superscript` à la main : sans parenthèses de base,
 * `(-2)^3` construit sans délimiteur s'affichait `-2^{3}`, qui se lit −(2³).
 */

import { describe, it, expect } from 'vitest';
import { PedagogicalArithmeticRenderer } from '../renderer';
import * as MathAST from '../../factory';
import type { MathNode } from '../../types';
import type { PedagogicalArithmeticStep } from '../types';

/** Étape dont l'expression globale contient `base^exposant` + 1, le `1` surligné */
function renderedBefore(power: MathNode): string {
	const one = MathAST.number('1');
	const global = MathAST.add(power, one);
	const step: PedagogicalArithmeticStep = {
		id: 1,
		rule: 'test',
		description: 'test',
		before: one,
		after: one,
		globalBefore: global,
		globalAfter: global,
		verbosityLevel: 'summarized'
	};
	const rendered = new PedagogicalArithmeticRenderer().render(step, {
		schoolLevel: 'college',
		verbosity: 'summarized'
	});
	return rendered.expressionLatex;
}

describe('renderWithHighlights - base de puissance à parenthéser', () => {
	it('(-2)^3 garde ses parenthèses', () => {
		const latex = renderedBefore(
			MathAST.power(MathAST.opposite(MathAST.number('2')), MathAST.number('3'))
		);
		expect(latex).toContain('\\left(-2\\right)^{3}');
	});

	it('(2^3)^2 garde ses parenthèses', () => {
		const latex = renderedBefore(
			MathAST.power(MathAST.power(MathAST.number('2'), MathAST.number('3')), MathAST.number('2'))
		);
		expect(latex).toContain('\\left(2^{3}\\right)^{2}');
	});

	it('2^3 reste 2^{3}', () => {
		const latex = renderedBefore(MathAST.power(MathAST.number('2'), MathAST.number('3')));
		expect(latex).toContain(' 2^{3} +');
	});
});
