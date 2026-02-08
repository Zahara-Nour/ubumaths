/**
 * Simplify Pipeline
 *
 * Orchestrates the simplification engines (normalize, pattern rules)
 * with a cost function to produce the simplest form of a mathematical expression.
 *
 * Algorithm:
 * 1. Normalize (normalizeExtended handles ∞ natively, then polynomial canonical form)
 * 2. Apply pattern rules (abs + trig + hyp + algebraic — single bottom-up pass)
 * 3. Post-normalize
 * 4. Compare costs, keep the cheapest form
 * 5. Repeat until fixpoint or maxIterations
 *
 * @module mathAST/simplify/simplify
 */

import type { MathNode } from '../types';
import type { Rule } from '../pattern/types';
import type { SimplifyOptions, SimplifyResult } from './types';
import { computeCost } from './cost';
import { SimplifyStepRecorder } from './step-recorder';
import { getSimplifyRuleDescription } from './descriptions-fr';

// Pattern rules
import { absSimplifyRules } from '../pattern/rule-sets';
import { trigSimplifyRules } from '../pattern/rule-sets/trig-identities';
import { hypSimplifyRules } from '../pattern/rule-sets/hyperbolic-identities';
import { algebraicSimplifyRules } from '../pattern/rule-sets/algebraic-identities';
import { applyRulesDeepOnceTracked } from '../pattern/rule';
import { nodesEqual } from '../pattern/match';

// Normalize
import { preprocess } from '../normal/rules';
import { normalizeExtended, denormalizeExtended } from '../normal';

// =============================================================================
// Rule Set Builder
// =============================================================================

/**
 * Builds the combined rule set based on simplification options.
 * Called once before the iteration loop.
 */
function buildSimplifyRules(options: {
	enableAbs?: boolean;
	enableTrig?: boolean;
	enableHyperbolic?: boolean;
	enableAlgebraic?: boolean;
}): readonly Rule[] {
	const rules: Rule[] = [];
	if (options.enableAbs !== false) rules.push(...absSimplifyRules);
	if (options.enableTrig !== false) rules.push(...trigSimplifyRules);
	if (options.enableHyperbolic !== false) rules.push(...hypSimplifyRules);
	if (options.enableAlgebraic !== false) rules.push(...algebraicSimplifyRules);
	return rules;
}

// =============================================================================
// Main Simplify Function
// =============================================================================

/**
 * Simplifies a mathematical expression using all available engines.
 *
 * @param node - The expression to simplify
 * @param options - Simplification options
 * @returns The simplified result with cost and steps
 */
export function simplify(node: MathNode, options?: SimplifyOptions): SimplifyResult {
	const {
		ctx,
		verbosity = 'result',
		maxIterations = 10,
		enableTrig = true,
		enableHyperbolic = true,
		enableAlgebraic = true,
		enableAbs = true
	} = options ?? {};

	const recorder = new SimplifyStepRecorder();
	const isRecording = verbosity !== 'result';

	// Build rule set once (abs + trig + hyp + algebraic based on options)
	const rules = buildSimplifyRules({ enableAbs, enableTrig, enableHyperbolic, enableAlgebraic });

	let current = node;
	let best = node;
	let bestCost = computeCost(node);

	for (let iter = 0; iter < maxIterations; iter++) {
		const beforeIteration = current;

		// Phase A: Normalize (extended — handles ∞ natively)
		// normalizeExtended propagates infinity/signed-zero through arithmetic
		// and functions (arctan(∞)→π/2, sinh(∞)→∞, etc.), then delegates to
		// regular normalize for polynomial canonical form (arithmetic identities,
		// like-term collection, power simplification, special function values).
		recorder.setPhase('normalize');
		try {
			const preprocessed = preprocess(current);
			const extResult = normalizeExtended(preprocessed);
			const afterNormalize = denormalizeExtended(extResult);
			if (isRecording && !nodesEqual(afterNormalize, current)) {
				recorder.recordStep(
					'normalize',
					getSimplifyRuleDescription('normalize'),
					current,
					afterNormalize,
					'detailed'
				);
			}
			current = afterNormalize;
		} catch {
			// normalizeExtended can fail on edge cases (indeterminate forms,
			// complex domain errors). Skip safely and continue.
		}

		// Phase B: Pattern rules (single bottom-up pass)
		// Applies all enabled rules in one traversal: abs, trig identities,
		// hyperbolic identities, and algebraic factoring. Arithmetic/power rules
		// are NOT included — they are fully redundant with normalize's polynomial
		// arithmetic.
		if (rules.length > 0) {
			recorder.setPhase('rules');
			const { result: afterRules, steps: ruleSteps } = applyRulesDeepOnceTracked(
				rules,
				current,
				ctx
			);
			if (isRecording) {
				for (const step of ruleSteps) {
					recorder.recordStep(
						step.ruleName,
						getSimplifyRuleDescription(step.ruleName),
						step.before,
						step.after,
						'detailed'
					);
				}
			}
			current = afterRules;
		}

		// Cost check before post-normalize (rules may produce cheaper forms)
		const preNormCost = computeCost(current);
		if (preNormCost < bestCost) {
			best = current;
			bestCost = preNormCost;
		}

		// Phase C: Post-normalize
		// Re-normalize after pattern rules, which may produce expressions
		// that benefit from canonical form (e.g., trig identity yields 1 + 3 → 4).
		recorder.setPhase('post-normalize');
		try {
			const preprocessed2 = preprocess(current);
			const extResult2 = normalizeExtended(preprocessed2);
			const afterPostNorm = denormalizeExtended(extResult2);
			if (isRecording && !nodesEqual(afterPostNorm, current)) {
				recorder.recordStep(
					'post-normalize',
					getSimplifyRuleDescription('normalize'),
					current,
					afterPostNorm,
					'detailed'
				);
			}
			current = afterPostNorm;
		} catch {
			// Skip normalization on failure
		}

		// Phase D: Cost check (post-normalize may also produce cheaper forms)
		const currentCost = computeCost(current);
		if (currentCost < bestCost) {
			best = current;
			bestCost = currentCost;
		}

		// Phase E: Fixpoint check
		if (nodesEqual(current, beforeIteration)) {
			break;
		}
	}

	return {
		result: best,
		steps: recorder.getStepsFiltered(verbosity),
		cost: bestCost
	};
}
