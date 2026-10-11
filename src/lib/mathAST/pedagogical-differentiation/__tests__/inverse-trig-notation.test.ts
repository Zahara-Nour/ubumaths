/**
 * `\cos^{-1}`, `\sin^{-1}`, `\tan^{-1}` sont les RÉCIPROQUES (arccos, arcsin,
 * arctan), comme partout ailleurs dans le dépôt depuis #884 — pas une puissance
 * −1. Le module pédagogique les lisait comme `1/cos x` (oracle : trig-26/27/28).
 *
 * On asserte la VALEUR (différence finie de la référence JavaScript), de la
 * dérivée finale comme de chaque étape, et la règle annoncée à l'élève.
 */

import { describe, expect, it } from 'vitest';
import { generatePedagogicalDifferentiationSteps } from '../pipeline';
import type { PedagogicalDifferentiationStep } from '../types';
import { parseLatex } from '../../parser';
import { compile } from '../../eval';
import type { MathNode } from '../../types';

const lyceeOpts = { variable: 'x', schoolLevel: 'lycee' as const };

/** Différence finie centrée à 5 points. */
function finiteDiff(f: (x: number) => number, x: number): number {
	const h = 1e-4;
	return (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);
}

function valueAt(node: MathNode, x: number): number {
	return compile(node)({ x });
}

function allSteps(
	steps: readonly PedagogicalDifferentiationStep[]
): PedagogicalDifferentiationStep[] {
	return steps.flatMap((s) => [s, ...allSteps(s.subSteps ?? [])]);
}

function rulesOf(steps: readonly PedagogicalDifferentiationStep[]): string[] {
	return allSteps(steps).map((s) => s.rule);
}

/** Valeur de la dérivée finale ET de chaque étape `before → after`. */
function expectDerivativeValues(
	latex: string,
	reference: (x: number) => number,
	points: readonly number[]
): readonly PedagogicalDifferentiationStep[] {
	const result = generatePedagogicalDifferentiationSteps(parseLatex(latex), lyceeOpts);
	for (const x of points) {
		expect(valueAt(result.derivative, x)).toBeCloseTo(finiteDiff(reference, x), 5);
		for (const step of allSteps(result.steps)) {
			const before = (t: number) => valueAt(step.before, t);
			expect(valueAt(step.after, x)).toBeCloseTo(finiteDiff(before, x), 4);
		}
	}
	return result.steps;
}

describe('notation de la réciproque f^{-1} — dérivée pédagogique', () => {
	it("(\\cos^{-1}(2x))' = -2/√(1-4x²) — règle arccos", () => {
		const steps = expectDerivativeValues(
			'\\cos^{-1}(2x)',
			(x) => Math.acos(2 * x),
			[-0.3, 0.1, 0.4]
		);
		expect(steps[0].rule).toBe('arccos');
	});

	it("(\\sin^{-1}(x^2))' = 2x/√(1-x⁴) — règle arcsin", () => {
		const steps = expectDerivativeValues(
			'\\sin^{-1}(x^2)',
			(x) => Math.asin(x * x),
			[-0.7, 0.2, 0.6]
		);
		expect(steps[0].rule).toBe('arcsin');
	});

	it("(3\\tan^{-1}(x))' = 3/(1+x²) — règle arctan sous le facteur constant", () => {
		const steps = expectDerivativeValues(
			'3\\tan^{-1}(x)',
			(x) => 3 * Math.atan(x),
			[-2.3, 0.5, 1.7]
		);
		expect(rulesOf(steps)).toContain('arctan');
	});

	it('non-régression : \\cos^{2}x reste une puissance de cos', () => {
		const steps = expectDerivativeValues('\\cos^{2}x', (x) => Math.cos(x) ** 2, [-1.1, 0.3, 2]);
		expect(steps[0].rule).toBe('power-constant-exp');
		expect(rulesOf(steps)).not.toContain('arccos');
	});

	it('non-régression : (\\cos x)^{-1} = 1/cos x, PAS arccos', () => {
		const steps = expectDerivativeValues(
			'(\\cos x)^{-1}',
			(x) => 1 / Math.cos(x),
			[-0.85, 0.3, 1.2]
		);
		expect(rulesOf(steps)).not.toContain('arccos');
	});
});
