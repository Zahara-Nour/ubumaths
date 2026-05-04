import { describe, it, expect } from 'vitest';
import { rewrite, type RewriteStep } from '../rewriting-engine';
import type { MathNode } from '../../types';
import { number, variable, opposite, func, add } from '../../factory';
import { absRules } from '../../pattern/rule-sets/abs';
import { toLatex } from '../../latex-generator';

// =============================================================================
// Test helpers
// =============================================================================

const intCost = (n: MathNode): number =>
	n.type === 'number' ? Math.abs(parseInt(n.value, 10)) : 999;

/** number(n) → number(n+1) up to 5; identity at/above 5 */
const incTo5 = (n: MathNode): MathNode => {
	if (n.type === 'number') {
		const v = parseInt(n.value, 10);
		if (v < 5) return number(String(v + 1));
	}
	return n;
};

// =============================================================================
// Tests
// =============================================================================

describe('rewrite engine', () => {
	describe('empty configuration', () => {
		it('returns input unchanged with empty rules and no hooks', () => {
			const node = number('42');
			const out = rewrite(node, {
				rules: [],
				strategy: { kind: 'deterministic' },
				maxIterations: 10
			});
			expect(out.result).toBe(node);
			expect(out.aborted).toBe(false);
		});

		it('iterations is 1 when nothing changes (fixpoint hits immediately)', () => {
			const out = rewrite(number('42'), {
				rules: [],
				strategy: { kind: 'deterministic' },
				maxIterations: 10
			});
			expect(out.iterations).toBe(1);
		});

		it('iterations is 0 when maxIterations is 0', () => {
			const out = rewrite(number('42'), {
				rules: [],
				strategy: { kind: 'deterministic' },
				maxIterations: 0
			});
			expect(out.iterations).toBe(0);
		});
	});

	describe('preProcess hook', () => {
		it('iterates while preProcess transforms; stops at fixpoint', () => {
			const out = rewrite(number('1'), {
				rules: [],
				preProcess: incTo5,
				strategy: { kind: 'deterministic' },
				maxIterations: 100
			});
			expect(out.result).toEqual(number('5'));
			expect(out.aborted).toBe(false);
		});

		it('terminates after one iteration when preProcess is identity', () => {
			let calls = 0;
			rewrite(number('1'), {
				rules: [],
				preProcess: (n) => {
					calls++;
					return n;
				},
				strategy: { kind: 'deterministic' },
				maxIterations: 100
			});
			expect(calls).toBe(1);
		});
	});

	describe('postProcess hook', () => {
		it('applies postProcess each iteration', () => {
			const out = rewrite(number('1'), {
				rules: [],
				postProcess: incTo5,
				strategy: { kind: 'deterministic' },
				maxIterations: 100
			});
			expect(out.result).toEqual(number('5'));
		});
	});

	describe('cost-fixpoint vs deterministic', () => {
		it('cost-fixpoint returns the lowest-cost form (input wins when cost only grows)', () => {
			const out = rewrite(number('1'), {
				rules: [],
				preProcess: incTo5,
				strategy: { kind: 'cost-fixpoint', cost: intCost },
				maxIterations: 100
			});
			expect(out.result).toEqual(number('1'));
		});

		it('deterministic returns the last form regardless of cost', () => {
			const out = rewrite(number('1'), {
				rules: [],
				preProcess: incTo5,
				strategy: { kind: 'deterministic' },
				maxIterations: 100
			});
			expect(out.result).toEqual(number('5'));
		});

		it('cost-fixpoint final cost check uses <= so post-process wins on tie', () => {
			// preProcess: replace `2` with a fresh literal of value `2` (same cost).
			// The intermediate cost check uses strict `<` and would NOT swap.
			// The final cost check uses `<=` and SHOULD swap, so `best` becomes the
			// output of preProcess (a different reference).
			const original = number('2');
			let postProcessOutput: MathNode | null = null;
			const out = rewrite(original, {
				rules: [],
				postProcess: (n) => {
					if (n.type === 'number' && n.value === '2') {
						const replacement = number('2'); // same cost, fresh reference
						postProcessOutput = replacement;
						return replacement;
					}
					return n;
				},
				strategy: { kind: 'cost-fixpoint', cost: intCost },
				maxIterations: 5
			});
			// Result has same cost as original; <= tie-break gives us the post-process form.
			expect(out.result).toBe(postProcessOutput);
			expect(out.result).not.toBe(original);
		});
	});

	describe('rule application', () => {
		it('fires real rules and reaches fixpoint (|-x| → |x|)', () => {
			const input = func('abs', [opposite(variable('x'))]);
			const out = rewrite(input, {
				rules: absRules,
				strategy: { kind: 'deterministic' },
				maxIterations: 10
			});
			const latex = toLatex(out.result);
			expect(latex).toContain('x');
			expect(latex).not.toContain('-');
		});
	});

	describe('AbortSignal', () => {
		it('returns aborted=true when signal is already aborted', () => {
			const controller = new AbortController();
			controller.abort();
			const out = rewrite(number('1'), {
				rules: [],
				preProcess: incTo5,
				strategy: { kind: 'deterministic' },
				maxIterations: 100,
				signal: controller.signal
			});
			expect(out.aborted).toBe(true);
		});
	});

	describe('timeoutMs', () => {
		it('returns aborted=true when timeout is exceeded mid-iteration', () => {
			const out = rewrite(number('1'), {
				rules: [],
				preProcess: (n) => {
					const start = performance.now();
					while (performance.now() - start < 5) {
						/* spin to exceed deadline */
					}
					return incTo5(n);
				},
				strategy: { kind: 'deterministic' },
				maxIterations: 100,
				timeoutMs: 1
			});
			expect(out.aborted).toBe(true);
		});
	});

	describe('onStep callback', () => {
		it('emits a preProcess step when preProcess transforms', () => {
			const events: RewriteStep[] = [];
			rewrite(number('1'), {
				rules: [],
				preProcess: (n) => (n.type === 'number' && parseInt(n.value, 10) === 1 ? number('2') : n),
				strategy: { kind: 'deterministic' },
				maxIterations: 5,
				onStep: (s) => events.push(s)
			});
			const preSteps = events.filter((e) => e.kind === 'preProcess');
			expect(preSteps.length).toBeGreaterThanOrEqual(1);
			expect(preSteps[0].label).toBe('preProcess');
			expect(toLatex(preSteps[0].before)).toBe('1');
			expect(toLatex(preSteps[0].after)).toBe('2');
		});

		it('emits a postProcess step when postProcess transforms', () => {
			const events: RewriteStep[] = [];
			rewrite(number('1'), {
				rules: [],
				postProcess: (n) => (n.type === 'number' && parseInt(n.value, 10) === 1 ? number('2') : n),
				strategy: { kind: 'deterministic' },
				maxIterations: 5,
				onStep: (s) => events.push(s)
			});
			const postSteps = events.filter((e) => e.kind === 'postProcess');
			expect(postSteps.length).toBeGreaterThanOrEqual(1);
			expect(postSteps[0].label).toBe('postProcess');
		});

		it('emits a rule step for each rule application (label = rule name)', () => {
			const events: RewriteStep[] = [];
			const input = func('abs', [opposite(variable('x'))]);
			rewrite(input, {
				rules: absRules,
				strategy: { kind: 'deterministic' },
				maxIterations: 10,
				onStep: (s) => events.push(s)
			});
			const ruleSteps = events.filter((e) => e.kind === 'rule');
			expect(ruleSteps.length).toBeGreaterThan(0);
			expect(ruleSteps[0].label).toBe('abs-negation');
		});

		it('does not emit when transformation is the identity', () => {
			const events: RewriteStep[] = [];
			rewrite(number('42'), {
				rules: [],
				preProcess: (n) => n,
				postProcess: (n) => n,
				strategy: { kind: 'deterministic' },
				maxIterations: 5,
				onStep: (s) => events.push(s)
			});
			expect(events).toHaveLength(0);
		});

		it('emits preProcess events before rule events within an iteration', () => {
			// Input: |-x|. preProcess wraps the inner x as `x + 0` (structural change
			// that does not break the abs-negation pattern). Rules then fire absNegation.
			const events: RewriteStep[] = [];
			const input = func('abs', [opposite(variable('x'))]);
			rewrite(input, {
				rules: absRules,
				preProcess: (n) => {
					if (
						n.type === 'function' &&
						n.name === 'abs' &&
						n.args.length === 1 &&
						n.args[0].type === 'opposite' &&
						n.args[0].operand.type === 'variable' &&
						n.args[0].operand.name === 'x'
					) {
						// Add `+ 0` once to force a structural change without breaking absNegation.
						return func('abs', [opposite(add(variable('x'), number('0')))]);
					}
					return n;
				},
				strategy: { kind: 'deterministic' },
				maxIterations: 3,
				onStep: (s) => events.push(s)
			});
			const firstPreIdx = events.findIndex((e) => e.kind === 'preProcess');
			const firstRuleIdx = events.findIndex((e) => e.kind === 'rule');
			expect(firstPreIdx).toBeGreaterThanOrEqual(0);
			expect(firstRuleIdx).toBeGreaterThan(firstPreIdx);
		});
	});

	describe('maxIterations', () => {
		it('respects the limit when transformation never converges', () => {
			let calls = 0;
			const out = rewrite(number('0'), {
				rules: [],
				preProcess: (n) => {
					calls++;
					if (n.type === 'number') return number(String(parseInt(n.value, 10) + 1));
					return n;
				},
				strategy: { kind: 'deterministic' },
				maxIterations: 3
			});
			expect(calls).toBe(3);
			expect(out.iterations).toBe(3);
		});
	});

	describe('error handling', () => {
		it('catches preProcess errors and continues to postProcess', () => {
			const events: RewriteStep[] = [];
			const out = rewrite(number('1'), {
				rules: [],
				preProcess: () => {
					throw new Error('boom');
				},
				postProcess: (n) => (n.type === 'number' && parseInt(n.value, 10) === 1 ? number('2') : n),
				strategy: { kind: 'deterministic' },
				maxIterations: 5,
				onStep: (s) => events.push(s)
			});
			expect(out.result).toEqual(number('2'));
			expect(events.some((e) => e.kind === 'postProcess')).toBe(true);
		});

		it('catches postProcess errors silently', () => {
			const out = rewrite(number('1'), {
				rules: [],
				postProcess: () => {
					throw new Error('boom');
				},
				strategy: { kind: 'deterministic' },
				maxIterations: 5
			});
			expect(out.result).toEqual(number('1'));
			expect(out.aborted).toBe(false);
		});
	});
});
