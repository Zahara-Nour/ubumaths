/**
 * Simplify Pipeline
 *
 * Orchestrates the simplification engines (normalize, pattern rules) with a
 * cost function to produce the simplest form of a mathematical expression.
 *
 * Algorithm (per iteration, executed by the rewrite engine):
 * 1. preProcess — preprocess + normalizeExtended + denormalizeExtended
 *    (handles ∞, signed zero, polynomial canonical form)
 * 2. apply pattern rules (abs + trig + hyp + algebraic — single bottom-up pass)
 * 3. cost check (intermediate, strict `<`)
 * 4. postProcess — same pipeline as preProcess
 * 5. cost check (final, `<=` so canonical form wins ties)
 * 6. fixpoint check
 *
 * The orchestrator is a thin wrapper around `rewrite()` from
 * `common/rewriting-engine.ts`. It builds the engine config and bridges step
 * events into a `SimplifyStepRecorder` (set Phase + description lookup).
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
import { absSimplifyRules } from '../pattern/rule-sets/abs';
import { trigSimplifyRules } from '../pattern/rule-sets/trig-identities';
import { hypSimplifyRules } from '../pattern/rule-sets/hyperbolic-identities';
import { algebraicSimplifyRules } from '../pattern/rule-sets/algebraic-identities';

// Normalize
import { preprocess } from '../normal/rules';
import { normalizeExtended, denormalizeExtended } from '../normal';

// Rewriting engine
import { rewrite, type RewriteStep } from '../common/rewriting-engine';

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
// Normalize Pass
// =============================================================================

/**
 * Single normalize pass: preprocess → normalizeExtended → denormalizeExtended.
 *
 * Used as both the preProcess and postProcess hooks of the rewrite engine.
 * `normalizeExtended` propagates infinity / signed-zero through arithmetic
 * (arctan(∞) → π/2, sinh(∞) → ∞, …) and then delegates to regular normalize
 * for polynomial canonical form (arithmetic identities, like-term collection,
 * power simplification, special function values).
 */
function normalizePass(node: MathNode): MathNode {
	const preprocessed = preprocess(node);
	const ext = normalizeExtended(preprocessed);
	return denormalizeExtended(ext);
}

// =============================================================================
// Step Bridge
// =============================================================================

/**
 * Bridge `RewriteStep` events from the engine into a `SimplifyStepRecorder`.
 * Maps engine step kinds to simplify pipeline phases and looks up French
 * descriptions for each rule.
 *
 * Note: phase is set only when an event fires (i.e. the engine produced a
 * non-trivial transformation). The recorder's phase tag has no observable
 * effect when no `recordStep` follows, so this lazy approach is equivalent
 * to the original eager `setPhase` calls that surrounded each pipeline phase.
 */
function makeStepBridge(recorder: SimplifyStepRecorder): (step: RewriteStep) => void {
	return (step) => {
		if (step.kind === 'preProcess') {
			recorder.setPhase('normalize');
			recorder.recordStep(
				'normalize',
				getSimplifyRuleDescription('normalize'),
				step.before,
				step.after,
				'detailed'
			);
		} else if (step.kind === 'postProcess') {
			recorder.setPhase('post-normalize');
			recorder.recordStep(
				'post-normalize',
				getSimplifyRuleDescription('normalize'),
				step.before,
				step.after,
				'detailed'
			);
		} else {
			recorder.setPhase('rules');
			recorder.recordStep(
				step.label,
				getSimplifyRuleDescription(step.label),
				step.before,
				step.after,
				'detailed'
			);
		}
	};
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
		signal,
		timeoutMs
	} = options ?? {};

	const recorder = new SimplifyStepRecorder();
	const isRecording = verbosity !== 'result';

	const rules = buildSimplifyRules({
		enableAbs,
		enableTrig,
		enableHyperbolic,
		enableAlgebraic
	});

	const engineResult = rewrite(node, {
		rules,
		preProcess: normalizePass,
		postProcess: normalizePass,
		strategy: { kind: 'cost-fixpoint', cost: computeCost },
		maxIterations,
		typeCtx: ctx,
		signal,
		timeoutMs,
		onStep: isRecording ? makeStepBridge(recorder) : undefined
	});

	return {
		result: engineResult.result,
		steps: recorder.getStepsFiltered(verbosity),
		cost: computeCost(engineResult.result),
		...(engineResult.aborted && { aborted: true })
	};
}
