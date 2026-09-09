import { describe, expect, it } from 'vitest';
import { analyzeAllFunctions, toAnalysisInputs } from '../analysis';
import { createEvaluator, parseFunction } from '../evaluator';
import type { ExplicitFunction, Plottable, SequencePlottable, Viewport } from '../types';
import { parseSequence } from '../sequence';
import { toLatex } from '$lib/mathAST/latex-generator';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function explicit(latex: string, overrides: Partial<ExplicitFunction> = {}): ExplicitFunction {
	const parsed = parseFunction(latex);

	return {
		id: `f-${latex}`,
		type: 'explicit',
		latex,
		ast: parsed.ast ?? undefined,
		parseError: parsed.error ?? undefined,
		variable: 'x',
		color: '#0000ff',
		visible: true,
		lineWidth: 2,
		lineStyle: 'solid',
		...overrides
	};
}

function sequence(): SequencePlottable {
	const parsed = parseSequence('3n+2', 'explicit', 'u');

	return {
		id: 'u',
		type: 'sequence',
		name: 'u',
		mode: 'explicit',
		latex: '3n+2',
		ast: parsed.ast ?? undefined,
		parseError: parsed.error ?? undefined,
		usesIndex: parsed.usesIndex,
		firstIndex: 0,
		firstTerm: null,
		representation: 'ranks',
		cobwebSteps: 10,
		color: '#ff0000',
		visible: true,
		lineWidth: 2,
		lineStyle: 'solid'
	};
}

/**
 * `analyzeFunction()` sait passer par l'analyse exacte de mathAST, mais
 * seulement si on lui donne l'AST. Les trois composants qui l'appellent ne le
 * faisaient pas : le grapheur retombait toujours sur le numérique. Ce
 * constructeur est le point de passage unique qui rend l'oubli impossible.
 */
describe('toAnalysisInputs', () => {
	it('fournit l’AST, sa dérivée et les deux closures compilées', () => {
		const inputs = toAnalysisInputs([explicit('x^2-2')]);

		expect(inputs).toHaveLength(1);
		expect(inputs[0].ast).toBeDefined();
		expect(inputs[0].ast?.expression).toBeDefined();
		expect(inputs[0].ast?.derivative).toBeDefined();
		expect(inputs[0].ast?.compiledFn({ x: 3 })).toBeCloseTo(7);
		expect(inputs[0].ast?.compiledDerivative?.({ x: 3 })).toBeCloseTo(6);
	});

	it('ignore les suites, les courbes masquées et les expressions invalides', () => {
		const plottables: Plottable[] = [
			sequence(),
			explicit('x^2', { visible: false }),
			explicit(')('),
			explicit('x^3')
		];

		expect(toAnalysisInputs(plottables).map((i) => i.id)).toEqual(['f-x^3']);
	});

	it('mémoïse par AST — un pan ne recompile pas la dérivée', () => {
		const fn = explicit('x^2-2');

		expect(toAnalysisInputs([fn])[0].ast).toBe(toAnalysisInputs([fn])[0].ast);
	});

	it('donne le minimum de x²−2, que le chemin numérique manque', () => {
		const fn = explicit('x^2-2');

		// Sans AST : la dérivée numérique vaut exactement 0 au point échantillonné,
		// donc aucun changement de signe n'est détecté et le sommet est perdu.
		const sansAst = analyzeAllFunctions(
			[{ id: fn.id, evaluator: createEvaluator(fn.ast!) }],
			viewport
		);
		expect(sansAst[0].extrema).toHaveLength(0);

		const avecAst = analyzeAllFunctions(toAnalysisInputs([fn]), viewport);
		expect(avecAst[0].extrema).toHaveLength(1);
		expect(avecAst[0].extrema[0].type).toBe('min');
		expect(avecAst[0].extrema[0].x).toBeCloseTo(0);
		expect(avecAst[0].extrema[0].confidence).toBe(1);
	});

	it('n’invente pas de zéro pour (x-1)²', () => {
		const analyses = analyzeAllFunctions(toAnalysisInputs([explicit('(x-1)^2')]), viewport);

		expect(analyses[0].roots).toHaveLength(1);
		expect(analyses[0].roots[0].x).toBeCloseTo(1);
	});
});

/**
 * Les zéros et les extrema trouvés symboliquement portent leur valeur exacte
 * jusqu'à l'affichage : `√2` plutôt que `1,414`. `findCriticalZeros` la connaît
 * déjà, le grapheur la jetait à la conversion.
 */
describe('valeurs exactes', () => {
	function analyse(latex: string) {
		return analyzeAllFunctions(toAnalysisInputs([explicit(latex)]), viewport)[0];
	}

	it('donne l’abscisse symbolique des zéros de x²−2', () => {
		const roots = analyse('x^2-2').roots;

		expect(roots).toHaveLength(2);
		expect(roots.map((r) => toLatex(r.exactX!)).sort()).toEqual(['-\\sqrt{2}', '\\sqrt{2}']);
	});

	it('donne la racine cubique exacte de x³−2', () => {
		const [root] = analyse('x^3-2').roots;

		expect(toLatex(root.exactX!)).toBe('\\sqrt[3]{2}');
	});

	it('donne les deux racines doubles de (x²−2)²', () => {
		const roots = analyse('(x^2-2)^2').roots;

		expect(roots).toHaveLength(2);
		expect(roots.map((r) => toLatex(r.exactX!)).sort()).toEqual(['-\\sqrt{2}', '\\sqrt{2}']);
	});

	it('simplifie l’ordonnée d’un extremum', () => {
		const [extremum] = analyse('x^2-2').extrema;

		// Sans simplification, findCriticalExtrema rend « 0^2 - 2 ».
		expect(toLatex(extremum.exactY!)).toBe('-2');
		expect(toLatex(extremum.exactX!)).toBe('0');
	});

	it('n’invente pas de valeur exacte quand seul le numérique a trouvé', () => {
		// exp(x) - x - 2 : zéros non résolubles algébriquement.
		const roots = analyse('e^x-x-2').roots;

		expect(roots.length).toBeGreaterThan(0);
		expect(roots.every((r) => r.exactX === undefined)).toBe(true);
	});
});
