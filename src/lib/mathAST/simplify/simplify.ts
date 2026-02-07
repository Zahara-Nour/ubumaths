/**
 * Simplify Pipeline
 *
 * Orchestrates the simplification engines (normalize, pattern rules,
 * identity transforms) with a cost function to produce the simplest form
 * of a mathematical expression.
 *
 * Algorithm:
 * 0. Pre-normalize: reduce infinity expressions (normalize fails on ∞)
 * 1. Normalize (polynomial canonical form) + denormalize
 * 2. Apply pattern rules (abs only — arithmetic/power are redundant with normalize)
 * 3. Apply identity transforms (trig, hyperbolic, algebraic)
 * 4. Post-normalize
 * 5. Compare costs, keep the cheapest form
 * 6. Repeat until fixpoint or maxIterations
 *
 * @module mathAST/simplify/simplify
 */

import type { MathNode } from '../types';
import type { SimplifyOptions, SimplifyResult } from './types';
import { computeCost } from './cost';
import { SimplifyStepRecorder } from './step-recorder';
import { getSimplifyRuleDescription } from './descriptions-fr';

// Pattern rules — only abs rules are used by the pipeline.
// Arithmetic/power rules are fully redundant with normalize's polynomial
// arithmetic (zero coefficients are dropped, identity elements eliminated,
// powers handled by powNormalForm).
import { simplifyRules } from '../pattern/rule-sets';
import { applyRules } from '../pattern/rule';
import { nodesEqual } from '../pattern/match';

// Normalize
import { preprocess } from '../normal/rules';
import { normalize, denormalize } from '../normal';

// Identity transforms
import { applyIdentityTransforms } from '../transform/identity-engine';
import { applyTrigIdentities } from '../transform/trig-identities';
import { applyHyperbolicIdentities } from '../transform/hyperbolic-identities';
import { applyAlgebraicIdentities } from '../transform/algebraic-identities';
import { infinityTransforms } from './infinity-transforms';

// Detection
import { findNodes } from '../transforms';
import { isFunction, isInfinity } from '../guards';

// =============================================================================
// Detection Helpers
// =============================================================================

const TRIG_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'arcsin', 'arccos', 'arctan']);
const HYP_FUNCTIONS = new Set(['sinh', 'cosh', 'tanh', 'arcsinh', 'arccosh', 'arctanh']);

function containsTrigFunctions(node: MathNode): boolean {
	return findNodes(node, (n) => isFunction(n) && TRIG_FUNCTIONS.has(n.name)).length > 0;
}

function containsHypFunctions(node: MathNode): boolean {
	return findNodes(node, (n) => isFunction(n) && HYP_FUNCTIONS.has(n.name)).length > 0;
}

function containsInfinity(node: MathNode): boolean {
	return findNodes(node, (n) => isInfinity(n)).length > 0;
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
		enableAbs = true,
		enableInfinity = true
	} = options ?? {};

	const recorder = new SimplifyStepRecorder();
	const isRecording = verbosity !== 'result';

	// Select rules based on options (only abs rules — see module doc)
	const rules = enableAbs ? simplifyRules : [];

	let current = node;
	let best = node;
	let bestCost = computeCost(node);

	for (let iter = 0; iter < maxIterations; iter++) {
		const beforeIteration = current;

		// Phase 0: Pre-normalize infinity reduction
		// Normalize converts expressions to polynomial NormalForm, but infinity
		// nodes cannot be represented as polynomials — normalize throws on them.
		// By reducing infinity expressions first (e.g., arctan(+∞) → π/2,
		// exp(-∞) → 0), we give normalize clean, finite expressions to work on.
		if (enableInfinity && containsInfinity(current)) {
			recorder.setPhase('identity');
			const infResult = applyIdentityTransforms(current, infinityTransforms);
			if (isRecording && infResult.changed) {
				recorder.recordStep(
					'infinity-transforms',
					getSimplifyRuleDescription('infinity-transforms'),
					current,
					infResult.result,
					'summarized'
				);
			}
			current = infResult.result;

			// Cost check: capture the post-infinity form before normalize
			// potentially rewrites it to a more expensive representation
			// (e.g., π/2 is cheaper than the (1/2)π normalize may produce).
			const infCost = computeCost(current);
			if (infCost < bestCost) {
				best = current;
				bestCost = infCost;
			}
		}

		// Phase A: Normalize (canonical polynomial form)
		// Handles arithmetic identities (x+0, x*1, x*0), like-term collection
		// (2x+3x → 5x), power simplification (x^0, x^1), fraction reduction,
		// radical simplification, and special function values (ln(e), sin(kπ)).
		recorder.setPhase('normalize');
		try {
			const preprocessed = preprocess(current);
			const normalForm = normalize(preprocessed);
			const afterNormalize = denormalize(normalForm);
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
			// Normalize can still fail on edge cases not caught by Phase 0
			// (e.g., remaining infinity in sub-expressions). Skip safely.
		}

		// Phase B: Pattern rules (abs rules only)
		// Arithmetic/power rules are NOT applied here — they are fully redundant
		// with normalize's polynomial arithmetic. Only abs rules add value because
		// normalize has limited support for absolute value simplification.
		if (rules.length > 0) {
			recorder.setPhase('rules');
			const afterRules = applyRules(rules, current, 100, ctx);
			if (isRecording && !nodesEqual(afterRules, current)) {
				recorder.recordStep(
					'pattern-rules',
					getSimplifyRuleDescription('pattern-rules'),
					current,
					afterRules,
					'summarized'
				);
			}
			current = afterRules;
		}

		// Phase C: Identity transforms (selective, no infinity — already done in Phase 0)
		// These transforms operate on the MathNode tree level, handling patterns
		// that normalize cannot: trig/hyperbolic identities (opaque to normalize),
		// and algebraic factoring (normalize expands but does not factor).
		recorder.setPhase('identity');

		if (enableTrig && containsTrigFunctions(current)) {
			const trigResult = applyTrigIdentities(current);
			if (isRecording && trigResult.changed) {
				recorder.recordStep(
					'trig-identities',
					getSimplifyRuleDescription('trig-identities'),
					current,
					trigResult.result,
					'summarized'
				);
			}
			current = trigResult.result;
		}

		if (enableHyperbolic && containsHypFunctions(current)) {
			const hypResult = applyHyperbolicIdentities(current);
			if (isRecording && hypResult.changed) {
				recorder.recordStep(
					'hyperbolic-identities',
					getSimplifyRuleDescription('hyperbolic-identities'),
					current,
					hypResult.result,
					'summarized'
				);
			}
			current = hypResult.result;
		}

		if (enableAlgebraic) {
			const algResult = applyAlgebraicIdentities(current);
			if (isRecording && algResult.changed) {
				recorder.recordStep(
					'algebraic-identities',
					getSimplifyRuleDescription('algebraic-identities'),
					current,
					algResult.result,
					'summarized'
				);
			}
			current = algResult.result;
		}

		// Cost check before post-normalize (identity transforms may produce cheaper forms)
		const preNormCost = computeCost(current);
		if (preNormCost < bestCost) {
			best = current;
			bestCost = preNormCost;
		}

		// Phase D: Post-normalize
		// Re-normalize after identity transforms, which may produce expressions
		// that benefit from canonical form (e.g., trig identity yields 1 + 3 → 4).
		recorder.setPhase('post-normalize');
		try {
			const preprocessed2 = preprocess(current);
			const normalForm2 = normalize(preprocessed2);
			const afterPostNorm = denormalize(normalForm2);
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

		// Phase E: Cost check (post-normalize may also produce cheaper forms)
		const currentCost = computeCost(current);
		if (currentCost < bestCost) {
			best = current;
			bestCost = currentCost;
		}

		// Phase F: Fixpoint check
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
