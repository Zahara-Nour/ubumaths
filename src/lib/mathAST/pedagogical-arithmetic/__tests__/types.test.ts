/**
 * Type isolation test for pedagogical-arithmetic types.
 *
 * Verifies that:
 * - The `PedagogicalArithmeticStep` is compatible with `BaseStep` and is
 *   accepted by `GenericTechnicalRenderer`.
 * - The `PedagogicalArithmeticRule` shape compiles against actual `Rule`
 *   instances from `pattern/rule`.
 * - The `PedagogicalArithmeticResult` produces a usable shape with all
 *   optional fields populated.
 *
 * No business logic is exercised here — these are purely compile-time
 * checks coupled to a small runtime smoke test.
 */

import { describe, expect, it } from 'vitest';
import { GenericTechnicalRenderer } from '../../common/technical-renderer';
import type { Rule } from '../../pattern/types';
import { number } from '../../factory';
import { P } from '../../pattern/builder';
import { createRule } from '../../pattern/rule';
import type {
	PedagogicalArithmeticOptions,
	PedagogicalArithmeticResult,
	PedagogicalArithmeticRule,
	PedagogicalArithmeticStep
} from '../types';

describe('pedagogical-arithmetic types', () => {
	it('PedagogicalArithmeticStep is renderable by GenericTechnicalRenderer', () => {
		const step: PedagogicalArithmeticStep = {
			id: 1,
			rule: 'evaluate-binary-add',
			description: 'On additionne 2 et 3',
			before: number('2'),
			after: number('5'),
			verbosityLevel: 'summarized',
			bindings: { a: number('2'), b: number('3') }
		};

		const renderer = new GenericTechnicalRenderer<PedagogicalArithmeticStep>();
		const rendered = renderer.render(step, { verbosity: 'detailed' });

		expect(rendered.id).toBe(1);
		expect(rendered.rule).toBe('evaluate-binary-add');
		expect(rendered.title).toBe('On additionne 2 et 3');
		expect(rendered.expressionLatex).toContain('Rightarrow');
	});

	it('PedagogicalArithmeticRule can be built with a real Rule instance', () => {
		const pattern = P.parse('a:number + b:number');
		const rule: Rule = createRule(pattern, () => number('0'), { name: 'test-rule' });

		const pedagogicalRule: PedagogicalArithmeticRule = {
			name: 'test-rule',
			rule,
			applicableLevels: ['college', 'lycee', 'superieur'],
			priority: 100,
			descriptions: {
				primaire: ({ a, b }) => `On additionne ${a?.type} et ${b?.type}`,
				college: () => 'Addition',
				lycee: () => '+',
				superieur: () => '+'
			},
			explanations: {
				college: () => 'On commence toujours par les multiplications.'
			}
		};

		expect(pedagogicalRule.applicableLevels).toContain('college');
		expect(pedagogicalRule.descriptions.college?.({})).toBe('Addition');
	});

	it('PedagogicalArithmeticResult shape with all optional fields', () => {
		const result: PedagogicalArithmeticResult = {
			finalNode: number('5'),
			steps: [],
			target: { structure: 'fraction' },
			answerFragment: { latex: '6', placeholderPath: ['superscript'] }
		};

		expect(result.finalNode.type).toBe('number');
		expect(result.target?.structure).toBe('fraction');
		expect(result.answerFragment?.latex).toBe('6');
	});

	it('PedagogicalArithmeticOptions accepts schoolLevel + target overrides', () => {
		const options: PedagogicalArithmeticOptions = {
			schoolLevel: 'college',
			target: {
				structure: 'reduced-fraction',
				strictCosmetics: { reducedFractions: 'strict' }
			},
			verbosity: 'detailed'
		};

		expect(options.schoolLevel).toBe('college');
		expect(options.target?.structure).toBe('reduced-fraction');
	});
});
