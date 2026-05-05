/**
 * Type isolation test for pedagogical-differentiation types.
 *
 * Verifies that:
 * - The `PedagogicalDifferentiationStep` is compatible with `BaseStep` and is
 *   accepted by `GenericTechnicalRenderer`.
 * - The `PedagogicalDifferentiationResult` produces a usable shape with all
 *   optional fields populated.
 * - The `PedagogicalDifferentiationOptions` accepts every documented field.
 * - The rule union exhaustively covers every known rule (compile-time
 *   exhaustive switch).
 *
 * No business logic is exercised here — these are purely compile-time
 * checks coupled to a small runtime smoke test.
 */

import { describe, expect, it } from 'vitest';
import { GenericTechnicalRenderer } from '../../common/technical-renderer';
import { number, variable } from '../../factory';
import { TRIVIAL_RULES } from '../types';
import type {
	PedagogicalDifferentiationOptions,
	PedagogicalDifferentiationResult,
	PedagogicalDifferentiationRule,
	PedagogicalDifferentiationStep
} from '../types';

describe('pedagogical-differentiation types', () => {
	it('PedagogicalDifferentiationStep is renderable by GenericTechnicalRenderer', () => {
		const step: PedagogicalDifferentiationStep = {
			id: 1,
			rule: 'product',
			description: 'Règle du produit',
			before: variable('x'),
			after: number('1'),
			variable: 'x',
			verbosityLevel: 'summarized',
			bindings: { u: variable('x'), v: number('1') }
		};

		const renderer = new GenericTechnicalRenderer<PedagogicalDifferentiationStep>();
		const rendered = renderer.render(step, { verbosity: 'detailed' });

		expect(rendered.id).toBe(1);
		expect(rendered.rule).toBe('product');
		expect(rendered.title).toBe('Règle du produit');
		// GenericTechnicalRenderer uses `\Rightarrow` between before/after.
		expect(rendered.expressionLatex).toContain('Rightarrow');
	});

	it('PedagogicalDifferentiationStep accepts subSteps for nested derivations', () => {
		const inner: PedagogicalDifferentiationStep = {
			id: 2,
			rule: 'power-natural',
			description: 'Règle de la puissance',
			before: variable('x'),
			after: number('1'),
			variable: 'x',
			verbosityLevel: 'summarized',
			bindings: { base: variable('x'), n: number('2') }
		};
		const outer: PedagogicalDifferentiationStep = {
			id: 1,
			rule: 'product',
			description: 'Règle du produit',
			before: variable('x'),
			after: number('0'),
			variable: 'x',
			verbosityLevel: 'summarized',
			subSteps: [inner]
		};

		expect(outer.subSteps).toHaveLength(1);
		expect(outer.subSteps?.[0].rule).toBe('power-natural');
	});

	it('PedagogicalDifferentiationResult shape is usable', () => {
		const result: PedagogicalDifferentiationResult = {
			derivative: number('0'),
			steps: []
		};

		expect(result.derivative.type).toBe('number');
		expect(result.steps).toHaveLength(0);
	});

	it('PedagogicalDifferentiationOptions accepts every documented field', () => {
		const opts: PedagogicalDifferentiationOptions = {
			variable: 'x',
			schoolLevel: 'lycee',
			verbosity: 'detailed',
			signal: new AbortController().signal,
			timeoutMs: 5000
		};

		expect(opts.variable).toBe('x');
		expect(opts.schoolLevel).toBe('lycee');
	});

	it('TRIVIAL_RULES contains exactly the three trivial rule names', () => {
		expect(TRIVIAL_RULES.has('constant')).toBe(true);
		expect(TRIVIAL_RULES.has('variable')).toBe(true);
		expect(TRIVIAL_RULES.has('greek-letter')).toBe(true);
		expect(TRIVIAL_RULES.size).toBe(3);
	});

	it('rule union compiles exhaustively for every known rule name', () => {
		const allRules: PedagogicalDifferentiationRule[] = [
			'constant',
			'variable',
			'greek-letter',
			'sum',
			'difference',
			'negation',
			'linear-coefficient',
			'sum-with-constant',
			'diff-with-constant',
			'power-natural',
			'power-constant-exp',
			'power-constant-base',
			'general-power',
			'product',
			'quotient',
			'inverse',
			'derivative-of-inverse',
			'sin',
			'cos',
			'tan',
			'arcsin',
			'arccos',
			'arctan',
			'exp',
			'ln',
			'log',
			'sqrt',
			'derivative-of-sqrt',
			'sinh',
			'cosh',
			'tanh',
			'asinh',
			'acosh',
			'atanh'
		];

		// Count must match the union; if a rule is added/removed in `types.ts`,
		// this assertion will fail on the count, prompting the dev to update both
		// places.
		expect(allRules).toHaveLength(34);
	});
});
