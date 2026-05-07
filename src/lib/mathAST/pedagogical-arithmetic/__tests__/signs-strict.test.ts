/**
 * Tests for `simplifyAddOpposite` (Track E — `signs: 'strict'`).
 *
 * Pattern: `add(x, opposite(y)) → subtract(x, y)`. Right opposite ONLY
 * (decision E-1) — `(-3) + 5` is left untouched (no commutativity-driven
 * reordering).
 *
 * Driven by `target.strictCosmetics.signs === 'strict'`. The strictCosmetics
 * pipeline is already wired (see `target-extractor.ts`); Track E only adds
 * the rule and the loader/pipeline plumbing.
 *
 * Coverage:
 *   - Right opposite fires (numeric, variables, nested left, double-opposite)
 *   - Left opposite stays (E-1 strict)
 *   - No fire without flag
 *   - Loader gating via needsSignsStrict
 *   - End-to-end pipeline via target.strictCosmetics.signs
 */

import { describe, expect, it } from 'vitest';
import { add, multiply, number, opposite, variable } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { simplifyAddOpposite } from '../pedagogical-rules/basic-operations';
import { loadPedagogicalRules } from '../pedagogical-rules';
import { generatePedagogicalArithmeticSteps } from '../pipeline';

describe('simplifyAddOpposite (Track E)', () => {
	describe('right-opposite fires', () => {
		it('5 + (-3) → 5 - 3 (numeric)', () => {
			const node = add(number('5'), opposite(number('3')));
			const result = applyRule(simplifyAddOpposite.rule, node);
			expect(result).not.toBeNull();
			expect(result!.type).toBe('subtraction');
		});

		it('2x + (-3x) → 2x - 3x (variables)', () => {
			const node = add(
				multiply(number('2'), variable('x'), 'implicit'),
				opposite(multiply(number('3'), variable('x'), 'implicit'))
			);
			const result = applyRule(simplifyAddOpposite.rule, node);
			expect(result).not.toBeNull();
			expect(result!.type).toBe('subtraction');
		});

		it('(a + b) + (-c) → (a + b) - c (left is composite)', () => {
			const inner = add(variable('a'), variable('b'));
			const node = add(inner, opposite(variable('c')));
			const result = applyRule(simplifyAddOpposite.rule, node);
			expect(result).not.toBeNull();
			expect(result!.type).toBe('subtraction');
			const sub = result as { left: { type: string }; right: { type: string } };
			expect(sub.left.type).toBe('addition');
			expect(sub.right.type).toBe('variable');
		});

		it('(-3) + (-5) → (-3) - 5 (Q1: left opposite intact, right opposite fires)', () => {
			const node = add(opposite(number('3')), opposite(number('5')));
			const result = applyRule(simplifyAddOpposite.rule, node);
			expect(result).not.toBeNull();
			expect(result!.type).toBe('subtraction');
			const sub = result as { left: { type: string }; right: { type: string } };
			// Left side stays opposite(3); right side is now 5 (no opposite).
			expect(sub.left.type).toBe('opposite');
			expect(sub.right.type).toBe('number');
		});
	});

	describe('does NOT fire — right side is not opposite', () => {
		it('5 + 3 does NOT fire', () => {
			const node = add(number('5'), number('3'));
			const result = applyRule(simplifyAddOpposite.rule, node);
			expect(result).toBeNull();
		});

		it('(-3) + 5 does NOT fire (E-1: only right opposite)', () => {
			const node = add(opposite(number('3')), number('5'));
			const result = applyRule(simplifyAddOpposite.rule, node);
			expect(result).toBeNull();
		});

		it('5 - 3 (subtraction, not addition) does NOT fire', () => {
			// subtraction is a different node type entirely.
			const result = applyRule(
				simplifyAddOpposite.rule,
				// emulate via factory
				{ type: 'subtraction', left: number('5'), right: number('3') } as never
			);
			expect(result).toBeNull();
		});
	});

	describe('Q2: nested opposite — fizzles to avoid producing pire-pire', () => {
		it('5 + (-(-3)) does NOT fire (avoid producing 5 - (-3))', () => {
			const node = add(number('5'), opposite(opposite(number('3'))));
			const result = applyRule(simplifyAddOpposite.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('rule metadata', () => {
		it('priority 25 (post-processing terminal)', () => {
			expect(simplifyAddOpposite.priority).toBe(25);
		});

		it('applicableLevels: all four levels', () => {
			expect(simplifyAddOpposite.applicableLevels).toEqual([
				'primaire',
				'college',
				'lycee',
				'superieur'
			]);
		});

		it('description primaire mentions remplace + (-y) by - y', () => {
			const desc = simplifyAddOpposite.descriptions.primaire?.({});
			expect(desc).toBeDefined();
			expect(desc!.length).toBeGreaterThan(0);
		});
	});

	describe('loader gating (decision E-1 wiring)', () => {
		it('not loaded without needsSignsStrict (default)', () => {
			const rules = loadPedagogicalRules({ schoolLevel: 'lycee' });
			expect(rules).not.toContain(simplifyAddOpposite);
		});

		it('not loaded with needsSignsStrict: false', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'lycee',
				needsSignsStrict: false
			});
			expect(rules).not.toContain(simplifyAddOpposite);
		});

		it('IS loaded with needsSignsStrict: true at lycee', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'lycee',
				needsSignsStrict: true
			});
			expect(rules).toContain(simplifyAddOpposite);
		});

		it('IS loaded with needsSignsStrict: true at primaire', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'primaire',
				needsSignsStrict: true
			});
			expect(rules).toContain(simplifyAddOpposite);
		});
	});

	describe('end-to-end pipeline via target.strictCosmetics.signs', () => {
		// Note: for purely numeric inputs like `5 + (-3)`, `evaluateBinaryAdd`
		// (priority 100) evaluates directly to `2`, short-circuiting
		// `simplifyAddOpposite` (priority 25). The cosmetic transform is
		// pedagogically useful when evaluation is impossible (variables) —
		// the test below covers that case.

		it('2x + (-3x) with signs strict → simplify-add-opposite fires (variables, no eval possible)', () => {
			const node = add(
				multiply(number('2'), variable('x'), 'implicit'),
				opposite(multiply(number('3'), variable('x'), 'implicit'))
			);
			const result = generatePedagogicalArithmeticSteps(node, {
				schoolLevel: 'lycee',
				target: {
					strictCosmetics: { signs: 'strict' }
				}
			});
			const stepNames = result.steps.map((s) => s.rule);
			expect(stepNames).toContain('simplify-add-opposite');
			// Final node is a subtraction (the rule's transformation is preserved).
			expect(result.finalNode.type).toBe('subtraction');
		});

		it('5 + (-3) with signs strict → numeric short-circuit (evaluates to 2, no simplifyAddOpposite step)', () => {
			// Contract pin (issue 4 from code review): purely numeric inputs
			// are short-circuited by `evaluateBinaryAdd` (priority 100) which
			// accepts `opposite(number)` as a numeric atom. The cosmetic
			// transform never fires here — the result is just `2`, NOT `5 - 3`.
			const node = add(number('5'), opposite(number('3')));
			const result = generatePedagogicalArithmeticSteps(node, {
				schoolLevel: 'lycee',
				target: {
					strictCosmetics: { signs: 'strict' }
				}
			});
			const stepNames = result.steps.map((s) => s.rule);
			// Cosmetic rule never reached:
			expect(stepNames).not.toContain('simplify-add-opposite');
			// Final form is the evaluated number 2:
			expect(result.finalNode.type).toBe('number');
			expect((result.finalNode as { value: string }).value).toBe('2');
		});

		it('2x + (-3x) WITHOUT signs strict → no simplify-add-opposite step', () => {
			const node = add(
				multiply(number('2'), variable('x'), 'implicit'),
				opposite(multiply(number('3'), variable('x'), 'implicit'))
			);
			const result = generatePedagogicalArithmeticSteps(node, {
				schoolLevel: 'lycee'
				// no target.strictCosmetics.signs — default behavior
			});
			const ranAddOpposite = result.steps.some((s) => s.rule === 'simplify-add-opposite');
			expect(ranAddOpposite).toBe(false);
		});
	});
});
