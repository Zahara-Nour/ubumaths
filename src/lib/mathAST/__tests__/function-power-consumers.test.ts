/**
 * Puissance d'une fonction écrite « à l'exposant du nom » : `sin^2(x)`, `\cos^3(x)`.
 *
 * Les deux parseurs (custom et LaTeX) la représentent par un nœud `function`
 * dont le champ `power` porte l'exposant : `{ name: 'sin', args: [x], power: 2 }`.
 * Plusieurs consommateurs lisaient le nom et les arguments en ignorant `power` :
 * `.diff sin^2(x)` répondait `cos(x)`, l'évaluation approchée de sin²(1) rendait
 * sin(1), le grapheur traçait sin, l'intégrale rendait −cos(x)…
 *
 * Chaque test compare l'écriture `f^n(x)` à son témoin `f(x)^n`, qui était juste.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../cli/core/pipeline';
import { parseLatex } from '../parser';
import { differentiate } from '../differentiation';
import { compile, substitute, integrate } from '../index';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { evaluateLimit } from '../limits';
import { WebReplEngine } from '../cli/web/web-repl-engine';
import { number } from '../factory';
import { parseFunction, evaluateAt } from '../../grapheur/evaluator';
import type { MathNode } from '../types';

function ast(source: string): MathNode {
	const result = parse(source);
	if (!result.ast) throw new Error(`parse échoue : ${source}`);
	return result.ast;
}

/** Valeur numérique d'une expression en x (via `compile`, qui lisait déjà `power`). */
function valueAt(node: MathNode, x: number): number {
	return compile(node)({ x });
}

/** Sortie texte de `.diff` : la partie après « = » de la première ligne. */
function diffOutput(source: string): string {
	const result = new WebReplEngine().execute(`.diff ${source}`);
	expect(result.success).toBe(true);
	const firstLine = result.output.split('\n')[0];
	return firstLine.slice(firstLine.indexOf(' = ') + 3);
}

const SAMPLE_POINTS = [-1.3, 0.4, 0.7, 2.1];

describe('dérivée d’une puissance de fonction f^n(x)', () => {
	// [écriture f^n(x), dérivée attendue (vraie valeur, écrite sans la notation f^n)]
	const cases: ReadonlyArray<readonly [string, string]> = [
		['sin^2(x)', '2*sin(x)*cos(x)'],
		['\\sin^2(x)', '2*sin(x)*cos(x)'],
		['cos^3(x)', '-3*cos(x)^2*sin(x)'],
		['tan^2(x)', '2*tan(x)*(1+tan(x)^2)'],
		['sin^2(2*x)', '4*sin(2*x)*cos(2*x)'],
		['ln^2(x)', '2*ln(x)/x'],
		['3*sin^2(x)', '6*sin(x)*cos(x)']
	];

	for (const [source, expected] of cases) {
		it(`d/dx ${source} = ${expected}`, () => {
			const derivative = differentiate(ast(source), { variable: 'x', simplify: true });
			const reference = ast(expected);
			for (const x of SAMPLE_POINTS) {
				if (source.includes('ln') && x <= 0) continue;
				expect(valueAt(derivative, x)).toBeCloseTo(valueAt(reference, x), 10);
			}
		});
	}

	it('.diff sin^2(x) donne exactement la sortie de .diff sin(x)^2', () => {
		expect(diffOutput('sin^2(x)')).toBe('2cos(x)sin(x)');
		expect(diffOutput('sin^2(x)')).toBe(diffOutput('sin(x)^2'));
	});

	it('.diff \\sin^2(x) donne la même sortie que .diff sin(x)^2', () => {
		expect(diffOutput('\\sin^2(x)')).toBe(diffOutput('sin(x)^2'));
	});

	it('.diff cos^3(x) donne la même sortie que .diff cos(x)^3', () => {
		expect(diffOutput('cos^3(x)')).toBe(diffOutput('cos(x)^3'));
	});

	it('témoins inchangés : sin(x)^2, sin(x), sin(x^2)', () => {
		expect(diffOutput('sin(x)^2')).toBe('2cos(x)sin(x)');
		expect(diffOutput('sin(x)')).toBe('cos(x)');
		expect(diffOutput('sin(x^2)')).toBe('2xcos(x^2)');
	});
});

describe('évaluation numérique de sin^2(x)', () => {
	it('approchée : sin²(1) = sin(1)², pas sin(1)', () => {
		const value = evaluateNodeToApproximatedNumber(substitute(ast('sin^2(x)'), { x: number('1') }));
		expect(value).toBeCloseTo(Math.sin(1) ** 2, 12);
	});

	it('compile : sin²(1) = sin(1)²', () => {
		expect(valueAt(ast('sin^2(x)'), 1)).toBeCloseTo(Math.sin(1) ** 2, 12);
	});

	it('grapheur : \\sin^2(x) en x = 1 vaut sin(1)²', () => {
		const parsed = parseFunction('\\sin^2(x)');
		expect(parsed.success).toBe(true);
		expect(evaluateAt(parsed.ast as MathNode, 1)).toBeCloseTo(Math.sin(1) ** 2, 12);
	});

	it('grapheur : \\cos^3(x) en x = 0,5 vaut cos(0,5)³', () => {
		const parsed = parseFunction('\\cos^3(x)');
		expect(evaluateAt(parsed.ast as MathNode, 0.5)).toBeCloseTo(Math.cos(0.5) ** 3, 12);
	});
});

describe('limites avec sin^2(x)', () => {
	it('lim_{x→0} sin²(x)/x² = 1 (comme sin(x)²/x²)', () => {
		const result = evaluateLimit(parseLatex('\\frac{\\sin^2(x)}{x^2}'), 'x', number('0'));
		expect(result.value).toEqual(number('1'));
	});

	it('lim_{x→0} sin²(x)/x = 0 (comme sin(x)²/x)', () => {
		const result = evaluateLimit(parseLatex('\\frac{\\sin^2(x)}{x}'), 'x', number('0'));
		expect(result.value).toEqual(number('0'));
	});
});

describe('intégration de sin^2(x)', () => {
	it('ne répond pas −cos(x) : soit une primitive juste, soit « non résolu »', () => {
		const result = integrate(ast('sin^2(x)'));
		if (result.status === 'exact' && result.antiderivative) {
			const derivative = differentiate(result.antiderivative, { variable: 'x' });
			for (const x of SAMPLE_POINTS) {
				expect(valueAt(derivative, x)).toBeCloseTo(Math.sin(x) ** 2, 10);
			}
		} else {
			expect(result.status).not.toBe('exact');
		}
	});
});
