/**
 * Notation `f^{-1}` sur une fonction nommée : `\cos^{-1}(x)`.
 *
 * Les parseurs la représentent par un nœud `function` dont `power` vaut `-1`
 * (`opposite(1)`). En mathématiques, `\cos^{-1}` est la RÉCIPROQUE (arccos),
 * pas `1/\cos` — convention déjà annoncée par `normalizeFunction`. Avant ce
 * correctif, trois consommateurs donnaient trois réponses fausses et
 * différentes : `evaluate` rendait cos(0,5), `compile` 1/cos(0,5), la dérivée
 * de `\cos^{-1}(x)` valait −sin(x).
 *
 * Témoin : `\sin(x)^{-1}` (exposant APRÈS la parenthèse) reste 1/sin(x).
 *
 * Même module : `\sin^2(x)` dans `analyzeSign` (exposant ignoré → 0 zéro).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../parser';
import { differentiate } from '../differentiation';
import { compile, evaluate, substitute, integrate, analyzeSign, areEquivalent } from '../index';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { evaluateLimit } from '../limits';
import { number } from '../factory';
import { parseFunction, evaluateAt } from '../../grapheur/evaluator';
import { expandFunctionPowers, isInverseNotation } from '../common/function-power';
import type { MathNode } from '../types';

/** Valeur numérique d'une expression en x. */
function valueAt(node: MathNode, x: number): number {
	return compile(node)({ x });
}

/** Valeur décimale rendue par `evaluate` après substitution de x. */
function evaluateAtX(latex: string, x: string): number {
	const result = evaluate(substitute(parseLatex(latex), { x: number(x) }), { mode: 'decimal' });
	if (result.status !== 'value' || typeof result.value !== 'number') {
		throw new Error(`evaluate n'a pas rendu de nombre pour ${latex}`);
	}
	return result.value;
}

const INTERIOR_POINTS = [-0.7, -0.2, 0.3, 0.6];

describe('\\cos^{-1}, \\sin^{-1}, \\tan^{-1} = réciproques (arccos, arcsin, arctan)', () => {
	it('evaluate : \\cos^{-1}(0,5) = π/3', () => {
		expect(evaluateAtX('\\cos^{-1}(x)', '0.5')).toBeCloseTo(Math.PI / 3, 10);
	});

	it('évaluation approchée : \\sin^{-1}(0,5) = π/6', () => {
		const node = substitute(parseLatex('\\sin^{-1}(x)'), { x: number('0.5') });
		expect(evaluateNodeToApproximatedNumber(node)).toBeCloseTo(Math.PI / 6, 10);
	});

	it('compile : \\cos^{-1}(0,5) = π/3, \\sin^{-1}(0,5) = π/6, \\tan^{-1}(1) = π/4', () => {
		expect(valueAt(parseLatex('\\cos^{-1}(x)'), 0.5)).toBeCloseTo(Math.PI / 3, 12);
		expect(valueAt(parseLatex('\\sin^{-1}(x)'), 0.5)).toBeCloseTo(Math.PI / 6, 12);
		expect(valueAt(parseLatex('\\tan^{-1}(x)'), 1)).toBeCloseTo(Math.PI / 4, 12);
	});

	// [écriture, dérivée attendue en x]
	const derivatives: ReadonlyArray<readonly [string, (x: number) => number]> = [
		['\\cos^{-1}(x)', (x) => -1 / Math.sqrt(1 - x * x)],
		['\\sin^{-1}(x)', (x) => 1 / Math.sqrt(1 - x * x)],
		['\\tan^{-1}(x)', (x) => 1 / (1 + x * x)],
		// Coefficient ≠ 1 : la règle de la chaîne doit apparaître.
		['3\\sin^{-1}(2x)', (x) => 6 / Math.sqrt(1 - 4 * x * x)]
	];

	for (const [source, expected] of derivatives) {
		it(`dérivée de ${source}`, () => {
			const derivative = differentiate(parseLatex(source), { variable: 'x', simplify: true });
			for (const x of INTERIOR_POINTS) {
				if (source.includes('2x') && Math.abs(x) >= 0.5) continue;
				expect(valueAt(derivative, x)).toBeCloseTo(expected(x), 10);
			}
		});
	}

	it('grapheur : \\cos^{-1}(x) en 0 vaut π/2', () => {
		const parsed = parseFunction('\\cos^{-1}(x)');
		expect(parsed.success).toBe(true);
		expect(evaluateAt(parsed.ast as MathNode, 0)).toBeCloseTo(Math.PI / 2, 12);
	});

	it('limite : lim_{x→0} \\cos^{-1}(x) = π/2', () => {
		const result = evaluateLimit(parseLatex('\\cos^{-1}(x)'), 'x', number('0'));
		expect(result.value).toBeDefined();
		expect(valueAt(result.value as MathNode, 0)).toBeCloseTo(Math.PI / 2, 12);
	});

	it('intégrale : ne rend pas sin(x) (primitive de cos) ; juste ou non résolue', () => {
		const result = integrate(parseLatex('\\cos^{-1}(x)'));
		if (result.status === 'exact' && result.antiderivative) {
			const derivative = differentiate(result.antiderivative, { variable: 'x' });
			for (const x of INTERIOR_POINTS) {
				expect(valueAt(derivative, x)).toBeCloseTo(Math.acos(x), 10);
			}
		} else {
			expect(result.status).not.toBe('exact');
		}
	});

	it('signe : \\cos^{-1}(x) a le signe de \\arccos(x)', () => {
		const inverse = analyzeSign(parseLatex('\\cos^{-1}(x)'), { variable: 'x' });
		const arc = analyzeSign(parseLatex('\\arccos(x)'), { variable: 'x' });
		expect(inverse.domain).toEqual(arc.domain);
		expect(inverse.zeros.map((z) => z.value)).toEqual(arc.zeros.map((z) => z.value));
		expect(inverse.signedIntervals.map((i) => i.sign)).toEqual(
			arc.signedIntervals.map((i) => i.sign)
		);
	});

	it('normalize : \\cos^{-1}(x) équivaut à \\arccos(x), pas à 1/\\cos(x)', () => {
		const inverse = parseLatex('\\cos^{-1}(x)');
		expect(areEquivalent(inverse, parseLatex('\\arccos(x)'))).toBe(true);
		expect(areEquivalent(inverse, parseLatex('\\frac{1}{\\cos(x)}'))).toBe(false);
	});
});

describe('témoins inchangés', () => {
	it('\\sin(x)^{-1} (exposant après la parenthèse) = 1/sin(x)', () => {
		expect(valueAt(parseLatex('\\sin(x)^{-1}'), 0.5)).toBeCloseTo(1 / Math.sin(0.5), 12);
		expect(evaluateAtX('\\sin(x)^{-1}', '0.5')).toBeCloseTo(1 / Math.sin(0.5), 10);
	});

	it('\\sin^2(x) et \\cos^3(x) restent des puissances', () => {
		expect(valueAt(parseLatex('\\sin^2(x)'), 0.5)).toBeCloseTo(Math.sin(0.5) ** 2, 12);
		expect(evaluateAtX('\\cos^3(x)', '0.5')).toBeCloseTo(Math.cos(0.5) ** 3, 10);
	});
});

describe('\\ln^{-1}, \\exp^{-1} : normalize les laisse opaques → refusés, pas de valeur fausse', () => {
	for (const source of ['\\ln^{-1}(x)', '\\exp^{-1}(x)']) {
		it(`${source} : ni evaluate ni compile ne rendent f(x) ou 1/f(x)`, () => {
			const result = evaluate(substitute(parseLatex(source), { x: number('0.5') }), {
				mode: 'decimal'
			});
			expect(result.status).not.toBe('value');
			expect(() => compile(parseLatex(source))).toThrow();
		});
	}
});

describe('signe de \\sin^2(x)', () => {
	it('même tableau que \\sin(x)^2', () => {
		const power = analyzeSign(parseLatex('\\sin^2(x)'), { variable: 'x' });
		const witness = analyzeSign(parseLatex('\\sin(x)^2'), { variable: 'x' });
		expect(witness.zeros.length).toBeGreaterThan(0);
		expect(power.zeros.map((z) => z.value)).toEqual(witness.zeros.map((z) => z.value));
		expect(power.signedIntervals.map((i) => i.sign)).toEqual(
			witness.signedIntervals.map((i) => i.sign)
		);
	});

	it("l'expression rendue est celle de l'appelant", () => {
		const node = parseLatex('\\sin^2(x)');
		expect(analyzeSign(node, { variable: 'x' }).expression).toBe(node);
	});
});

describe('isInverseNotation / expandFunctionPowers', () => {
	it('reconnaît -1 écrit opposite(1)', () => {
		expect(isInverseNotation({ type: 'opposite', operand: number('1') })).toBe(true);
		expect(isInverseNotation(number('2'))).toBe(false);
	});

	it('rend la MÊME référence quand rien ne change', () => {
		for (const source of ['x+1', '\\sin(x)^2', '\\frac{\\cos(x)}{x}']) {
			const node = parseLatex(source);
			expect(expandFunctionPowers(node)).toBe(node);
		}
	});

	it('réécrit \\cos^{-1}(x) en arccos(x)', () => {
		const expanded = expandFunctionPowers(parseLatex('\\cos^{-1}(x)'));
		expect(expanded).toMatchObject({ type: 'function', name: 'arccos' });
		expect(expanded).not.toHaveProperty('power');
	});
});
