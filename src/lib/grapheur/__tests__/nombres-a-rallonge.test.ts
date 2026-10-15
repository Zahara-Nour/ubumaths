/**
 * Un nombre à rallonge (`0.3333333333333333`, `1.4700000000000002`) fait
 * exploser l'arithmétique exacte de mathAST : 7 s pour les singularités d'une
 * fraction rationnelle, 0,4 s pour ses zéros — et l'analyse tourne dans
 * l'interface. Au-delà de 10 chiffres significatifs, l'analyse reste numérique.
 */

import { describe, it, expect } from 'vitest';
import { analyzeFunction, buildAnalysisAST, cachedEvaluator } from '../analysis';
import { parseFunction } from '../evaluator';

const analyze = (latex: string) => {
	const parsed = parseFunction(latex);
	if (!parsed.ast) throw new Error(`illisible : ${latex}`);
	return analyzeFunction(
		cachedEvaluator(parsed.ast),
		{ xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
		'f',
		buildAnalysisAST(parsed.ast)
	);
};

describe('nombres à rallonge', () => {
	it('analyse (x/3 + 1)/(x² − 1/3) écrit en flottants en moins d’une demi-seconde', () => {
		const third = '0.3333333333333333';
		const start = performance.now();
		const analysis = analyze(`\\frac{${third}x+1}{x^{2}-${third}}`);
		expect(performance.now() - start).toBeLessThan(500);

		// Le numérique trouve encore les deux pôles ±1/√3 et le zéro −3.
		const poles = analysis.verticalAsymptotes.map((a) => a.x).sort((a, b) => a - b);
		expect(poles.length).toBe(2);
		expect(poles[0]).toBeCloseTo(-1 / Math.sqrt(3), 6);
		expect(poles[1]).toBeCloseTo(1 / Math.sqrt(3), 6);
		expect(analysis.roots.map((r) => r.x)).toEqual([expect.closeTo(-3, 6)]);
	});

	it('garde l’analyse exacte pour un décimal ordinaire', () => {
		const analysis = analyze('\\frac{1}{x-1.47}');
		expect(analysis.verticalAsymptotes.map((a) => a.x)).toEqual([1.47]);
	});
});
