/**
 * Phase 1 — Intent dispatcher + rule categorization tests.
 *
 * Covers:
 *  - selectRulesForIntent: rule selection per intent + flag toggles
 *  - categorizeRule: pattern + normalize rule names → category map
 *
 * No real simplification is invoked; we only inspect the dispatcher contract.
 */

import { describe, it, expect } from 'vitest';
import {
	absSimplifyRules,
	algebraicFactoringRules,
	algebraicExpandingRules,
	hypSimplifyRules,
	logExpRules,
	powerRules,
	sqrtRules,
	trigSimplifyRules
} from '../../pattern/rule-sets';
import { categorizeRule, selectRulesForIntent } from '../intent-rules';
import type { SimplifyIntent } from '../types';

/**
 * Default V1 flag combination — trig + log/exp + abs ON, hyperbolic OFF.
 * Note: NOT "all flags on" despite a flat reading of the field names; V1
 * deliberately excludes hyperbolic identities (Phase 0 Q2).
 */
const DEFAULT_V1_FLAGS = {
	enableTrig: true,
	enableLogExp: true,
	enableAbs: true,
	enableHyperbolic: false
};

const ruleNamesOf = (rules: { readonly name: string }[]): Set<string> =>
	new Set(rules.map((r) => r.name));

describe('selectRulesForIntent — factoriser', () => {
	it('includes algebraic factoring rules and excludes expansion rules', () => {
		const { rules, useNormalize } = selectRulesForIntent('factoriser', DEFAULT_V1_FLAGS);
		const names = ruleNamesOf([...rules]);
		// factoring rules included
		expect(names.has('diff-squares-symbolic')).toBe(true);
		expect(names.has('diff-squares-numeric')).toBe(true);
		expect(names.has('perfect-square-trinomial')).toBe(true);
		// expansion rules excluded
		expect(names.has('expand-sum-squared')).toBe(false);
		expect(names.has('expand-diff-squared')).toBe(false);
		expect(names.has('product-to-diff-squares')).toBe(false);
		// normalize disabled (would undo the factoring)
		expect(useNormalize).toBe(false);
	});
});

describe('selectRulesForIntent — developper', () => {
	it('includes expansion rules and excludes factoring rules', () => {
		const { rules, useNormalize } = selectRulesForIntent('developper', DEFAULT_V1_FLAGS);
		const names = ruleNamesOf([...rules]);
		expect(names.has('expand-sum-squared')).toBe(true);
		expect(names.has('expand-diff-squared')).toBe(true);
		expect(names.has('product-to-diff-squares')).toBe(true);
		expect(names.has('diff-squares-symbolic')).toBe(false);
		expect(names.has('perfect-square-trinomial')).toBe(false);
		// normalize enabled (combine-like-terms after expansion)
		expect(useNormalize).toBe(true);
	});
});

describe('selectRulesForIntent — reduire', () => {
	it('excludes both factoring and expansion rules', () => {
		const { rules, useNormalize } = selectRulesForIntent('reduire', DEFAULT_V1_FLAGS);
		const names = ruleNamesOf([...rules]);
		expect(names.has('diff-squares-symbolic')).toBe(false);
		expect(names.has('expand-sum-squared')).toBe(false);
		expect(useNormalize).toBe(true);
	});

	it('includes pythagorean (always-true identity) when trig enabled', () => {
		const { rules } = selectRulesForIntent('reduire', DEFAULT_V1_FLAGS);
		expect(ruleNamesOf([...rules]).has('pythagorean')).toBe(true);
	});
});

describe('selectRulesForIntent — auto', () => {
	it('uses normalize and includes neither expansion rules nor numeric factoring (ambiguous)', () => {
		const { rules, useNormalize } = selectRulesForIntent('auto', DEFAULT_V1_FLAGS);
		const names = ruleNamesOf([...rules]);
		// Numeric factoring (e.g. x²-4 → (x+2)(x-2)) is ambiguous in 'auto' → excluded
		expect(names.has('diff-squares-numeric')).toBe(false);
		expect(names.has('sum-cubes-numeric')).toBe(false);
		expect(names.has('diff-cubes-numeric')).toBe(false);
		// Expansion rules also excluded (auto is "tidy up only")
		expect(names.has('expand-sum-squared')).toBe(false);
		// But pythagorean (unambiguous identity) is included
		expect(names.has('pythagorean')).toBe(true);
		expect(useNormalize).toBe(true);
	});
});

describe('selectRulesForIntent — flag toggles', () => {
	const intents: SimplifyIntent[] = ['factoriser', 'developper', 'reduire', 'auto'];

	it.each(intents)('enableTrig=false excludes all trig identity rules (intent=%s)', (intent) => {
		const { rules } = selectRulesForIntent(intent, { ...DEFAULT_V1_FLAGS, enableTrig: false });
		const names = ruleNamesOf([...rules]);
		const trigNames = ruleNamesOf([...trigSimplifyRules]);
		for (const trigName of trigNames) {
			expect(names.has(trigName)).toBe(false);
		}
	});

	it.each(intents)(
		'enableHyperbolic=true includes hyperbolic identity rules (intent=%s)',
		(intent) => {
			const { rules } = selectRulesForIntent(intent, {
				...DEFAULT_V1_FLAGS,
				enableHyperbolic: true
			});
			const names = ruleNamesOf([...rules]);
			const hypNames = ruleNamesOf([...hypSimplifyRules]);
			expect([...hypNames].some((n) => names.has(n))).toBe(true);
		}
	);

	it.each(intents)(
		'enableHyperbolic=false (V1 default) excludes hyperbolic rules (intent=%s)',
		(intent) => {
			const { rules } = selectRulesForIntent(intent, DEFAULT_V1_FLAGS);
			const names = ruleNamesOf([...rules]);
			const hypNames = ruleNamesOf([...hypSimplifyRules]);
			for (const hypName of hypNames) {
				expect(names.has(hypName)).toBe(false);
			}
		}
	);

	it.each(intents)('enableAbs=false excludes abs rules (intent=%s)', (intent) => {
		const { rules } = selectRulesForIntent(intent, { ...DEFAULT_V1_FLAGS, enableAbs: false });
		const names = ruleNamesOf([...rules]);
		const absNames = ruleNamesOf([...absSimplifyRules]);
		for (const absName of absNames) {
			expect(names.has(absName)).toBe(false);
		}
	});

	it.each(intents)('enableLogExp=false excludes log-exp rules (intent=%s)', (intent) => {
		const { rules } = selectRulesForIntent(intent, { ...DEFAULT_V1_FLAGS, enableLogExp: false });
		const names = ruleNamesOf([...rules]);
		const logExpNames = ruleNamesOf([...logExpRules]);
		for (const logExpName of logExpNames) {
			expect(names.has(logExpName)).toBe(false);
		}
	});

	it.each(intents)('returns rules without name duplicates (intent=%s)', (intent) => {
		const { rules } = selectRulesForIntent(intent, DEFAULT_V1_FLAGS);
		const names = [...rules].map((r) => r.name);
		expect(new Set(names).size).toBe(names.length);
	});
});

describe('categorizeRule — pattern rules', () => {
	const cases: Array<[string, string]> = [
		['abs-negation', 'valeur-absolue'],
		['abs-product', 'valeur-absolue'],
		['abs-positive', 'valeur-absolue'],
		['diff-squares-symbolic', 'factorisation'],
		['diff-squares-numeric', 'factorisation'],
		['perfect-square-trinomial', 'factorisation'],
		['sum-cubes-symbolic', 'factorisation'],
		['expand-sum-squared', 'distribution'],
		['expand-diff-squared', 'distribution'],
		['product-to-diff-squares', 'distribution'],
		['pythagorean', 'identites-trig'],
		['sin-negative', 'identites-trig'],
		['sin-period-2pi', 'identites-trig'],
		['sin-over-cos', 'identites-trig'],
		['cos-squared', 'identites-trig'],
		['ln-product', 'identites-log-exp'],
		['ln-quotient', 'identites-log-exp'],
		['ln-pow', 'identites-log-exp'],
		['ln-exp', 'identites-log-exp'],
		['exp-ln', 'identites-log-exp'],
		['ln-one', 'identites-log-exp'],
		['ln-e', 'identites-log-exp'],
		['same-base-mul', 'puissances'],
		['pow-of-pow', 'puissances'],
		['pow-of-quotient', 'puissances'],
		['pow-zero', 'puissances'],
		['pow-one', 'puissances'],
		['neg-base-pow-even', 'puissances'],
		['sqrt-product', 'radicaux'],
		['sqrt-quotient', 'radicaux'],
		['sqrt-square', 'radicaux'],
		['square-sqrt', 'radicaux'],
		['add-zero-left', 'combinaison-termes-semblables'],
		['mul-one-left', 'combinaison-termes-semblables'],
		['double-neg', 'combinaison-termes-semblables'],
		['sub-self', 'combinaison-termes-semblables']
	];

	it.each(cases)('categorizeRule(%s) === %s', (rule, expected) => {
		expect(categorizeRule(rule)).toBe(expected);
	});
});

describe('categorizeRule — normalize rules', () => {
	const cases: Array<[string, string]> = [
		['combine-like-terms', 'combinaison-termes-semblables'],
		['simplify-fraction', 'fractions'],
		['radical-simplify', 'radicaux'],
		['sqrt-extract-perfect-square', 'radicaux'],
		['sqrt-of-square', 'radicaux'],
		['sqrt-of-even-power', 'radicaux'],
		['expand-power', 'puissances'],
		['power-of-sqrt', 'puissances'],
		['power-zero', 'puissances'],
		['constant-power', 'puissances'],
		['abs-even-power', 'valeur-absolue'],
		['abs-function', 'valeur-absolue'],
		['exp-ln-inverse', 'identites-log-exp'],
		['ln-exp-inverse', 'identites-log-exp'],
		['log-simplify', 'identites-log-exp'],
		['exp-zero', 'identites-log-exp'],
		['trig-known-value', 'identites-trig'],
		['trig-pi-shift', 'identites-trig'],
		['inverse-trig-special-value', 'identites-trig'],
		['additive-identity-left', 'combinaison-termes-semblables'],
		['multiplicative-zero-left', 'combinaison-termes-semblables'],
		['constant-addition', 'combinaison-termes-semblables']
	];

	it.each(cases)('categorizeRule(%s) === %s', (rule, expected) => {
		expect(categorizeRule(rule)).toBe(expected);
	});
});

describe('categorizeRule — fallback', () => {
	it('returns "autre" for unknown rule names', () => {
		expect(categorizeRule('rule-fictive-inconnue')).toBe('autre');
		expect(categorizeRule('')).toBe('autre');
		expect(categorizeRule('foo-bar-baz')).toBe('autre');
	});

	it('returns "autre" for parity rules (cross-cutting)', () => {
		expect(categorizeRule('even-function-parity')).toBe('autre');
		expect(categorizeRule('odd-function-parity')).toBe('autre');
	});

	it('returns "autre" for complex-algebra rules (V2+)', () => {
		expect(categorizeRule('complex-cabs')).toBe('autre');
		expect(categorizeRule('complex-conj')).toBe('autre');
	});
});

describe('categorizeRule — exhaustivity over imported rule sets', () => {
	it('every rule in absSimplifyRules has a non-fallback category', () => {
		for (const r of absSimplifyRules) {
			expect(categorizeRule(r.name)).not.toBe('autre');
		}
	});

	it('every rule in algebraicFactoringRules has a non-fallback category', () => {
		for (const r of algebraicFactoringRules) {
			expect(categorizeRule(r.name)).not.toBe('autre');
		}
	});

	it('every rule in algebraicExpandingRules has a non-fallback category', () => {
		for (const r of algebraicExpandingRules) {
			expect(categorizeRule(r.name)).not.toBe('autre');
		}
	});

	it('every rule in trigSimplifyRules has a non-fallback category', () => {
		for (const r of trigSimplifyRules) {
			expect(categorizeRule(r.name)).not.toBe('autre');
		}
	});

	it('every rule in logExpRules has a non-fallback category', () => {
		for (const r of logExpRules) {
			expect(categorizeRule(r.name)).not.toBe('autre');
		}
	});

	it('every rule in powerRules has a non-fallback category', () => {
		for (const r of powerRules) {
			expect(categorizeRule(r.name)).not.toBe('autre');
		}
	});

	it('every rule in sqrtRules has a non-fallback category', () => {
		for (const r of sqrtRules) {
			expect(categorizeRule(r.name)).not.toBe('autre');
		}
	});

	// V1 excludes hyperbolic identities (Phase 0 Q2). The 5 hyp rules currently
	// fall through to 'autre' on purpose: when V2 adds an `'identites-hyp'`
	// category (or maps them to 'identites-trig'), this test will fail and
	// force an explicit decision.
	it('every rule in hypSimplifyRules currently maps to "autre" (V1 out-of-scope)', () => {
		expect(hypSimplifyRules.length).toBeGreaterThan(0);
		for (const r of hypSimplifyRules) {
			expect(categorizeRule(r.name)).toBe('autre');
		}
	});
});
