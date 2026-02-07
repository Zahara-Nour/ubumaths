/**
 * Simplify Pipeline
 *
 * Orchestrates the three simplification engines (pattern rules, normalize,
 * identity transforms) with a cost function to produce the simplest form
 * of a mathematical expression.
 *
 * Algorithm:
 * 1. Apply pattern rules (arithmetic, power, abs)
 * 2. Normalize (polynomial canonical form) + denormalize
 * 3. Apply identity transforms (trig, hyperbolic, algebraic, infinity)
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

// Pattern rules
import { allRules } from '../pattern/rule-sets';
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

	// Select rules based on options
	const rules = enableAbs ? allRules : allRules.filter((r) => !r.name.startsWith('abs-'));

	let current = node;
	let best = node;
	let bestCost = computeCost(node);

	for (let iter = 0; iter < maxIterations; iter++) {
		const beforeIteration = current;

		// Phase A: Pattern rules
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

		// Phase B: Normalize
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
			// Normalize can fail on some expressions (e.g., infinity)
			// Skip normalization in that case
		}

		// Phase C: Identity transforms (selective)
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

		if (enableInfinity && containsInfinity(current)) {
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
		}

		// Cost check before post-normalize (identity transforms may produce cheaper forms)
		const preNormCost = computeCost(current);
		if (preNormCost < bestCost) {
			best = current;
			bestCost = preNormCost;
		}

		// Phase D: Post-normalize
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
