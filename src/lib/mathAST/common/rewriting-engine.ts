/**
 * Rewriting Engine
 *
 * Parameterized fixpoint loop shared by simplification, normalization, and
 * future pedagogical pipelines. Encapsulates the iterate-until-stable pattern:
 *
 * 1. preProcess (optional)
 * 2. apply rules deep-once (with optional step tracking via `onStep`)
 * 3. cost check (cost-fixpoint strategy only — strict `<`)
 * 4. postProcess (optional)
 * 5. cost check (cost-fixpoint strategy only — `<=` so canonical form wins ties)
 * 6. fixpoint check — break if no change
 *
 * Cooperative interruption via `AbortSignal` / `timeoutMs`, reusing
 * `common/abort.ts`. The active checker is installed for the dynamic extent of
 * the loop so deep pattern-matching can short-circuit through
 * `getActiveAbortChecker()`.
 *
 * Design note (vs. prompt): the engine emits `RewriteStep` events through an
 * `onStep` callback rather than coupling to a `BaseStepRecorder`. The recorder
 * has domain-specific semantics (`setPhase`, description lookup) that the
 * engine cannot infer; the wrapper (e.g. `simplify`) bridges callback → recorder.
 *
 * @module mathAST/common/rewriting-engine
 */

import type { MathNode } from '../types';
import type { Rule } from '../pattern/types';
import type { TypeContext } from '../numtype/types';
import { applyRulesDeepOnceTracked } from '../pattern/rule';
import { nodesEqual } from '../pattern/match';
import { type AbortChecker, AbortError, makeAbortChecker, withActiveAbortChecker } from './abort';

// =============================================================================
// Strategy
// =============================================================================

/**
 * Termination strategy for the rewrite loop.
 *
 * - `cost-fixpoint`: track the lowest-cost form encountered; loop exits via
 *   fixpoint check (no change in an iteration). Returns the best-cost form
 *   ever seen, even if a later iteration regressed.
 * - `deterministic`: returns whatever `current` is at loop exit (no cost
 *   tracking). Fixpoint check still terminates the loop.
 */
export type RewriteStrategy =
	| { readonly kind: 'cost-fixpoint'; readonly cost: (node: MathNode) => number }
	| { readonly kind: 'deterministic' };

// =============================================================================
// Step events
// =============================================================================

/**
 * Source of a transformation observed during a rewrite iteration.
 */
export type RewriteStepKind = 'preProcess' | 'postProcess' | 'rule';

/**
 * A transformation event emitted by the engine via `EngineConfig.onStep`.
 *
 * The wrapper is free to record it (into a domain-specific recorder), log it,
 * or ignore it. The engine itself never persists steps.
 */
export interface RewriteStep {
	readonly kind: RewriteStepKind;
	/**
	 * - When `kind === 'rule'`: the value of `Rule.name` (e.g. `'abs-negation'`).
	 * - When `kind === 'preProcess'`: the literal string `'preProcess'`.
	 * - When `kind === 'postProcess'`: the literal string `'postProcess'`.
	 */
	readonly label: string;
	readonly before: MathNode;
	readonly after: MathNode;
}

// =============================================================================
// Engine config & result
// =============================================================================

export interface EngineConfig {
	/** Pattern rules applied deep-once each iteration */
	readonly rules: readonly Rule[];

	/** Optional pre-processor — called at the start of each iteration */
	readonly preProcess?: (node: MathNode) => MathNode;

	/** Optional post-processor — called after rules each iteration */
	readonly postProcess?: (node: MathNode) => MathNode;

	/** Termination strategy: cost-fixpoint or deterministic */
	readonly strategy: RewriteStrategy;

	/** Maximum loop iterations (safety bound) */
	readonly maxIterations: number;

	/** Optional type context for conditional pattern rules */
	readonly typeCtx?: TypeContext;

	/** External AbortSignal — abort returns best-so-far with `aborted: true` */
	readonly signal?: AbortSignal;

	/** Wall-clock budget in ms (combined with `signal` if both provided) */
	readonly timeoutMs?: number;

	/** Step observer — invoked for each non-trivial transformation */
	readonly onStep?: (step: RewriteStep) => void;
}

export interface EngineResult {
	/** Best (cost-fixpoint) or last (deterministic) form found */
	readonly result: MathNode;

	/** True if the loop exited due to abort or timeout */
	readonly aborted: boolean;

	/**
	 * Number of iterations entered (0..maxIterations). An iteration that
	 * aborts before completing still counts as entered. With `maxIterations: 0`
	 * the loop is never entered and this returns 0.
	 */
	readonly iterations: number;
}

// =============================================================================
// Engine
// =============================================================================

/**
 * Run the rewrite loop until fixpoint, abort, or `maxIterations`.
 *
 * @example
 * ```typescript
 * const out = rewrite(node, {
 *   rules: simplifyRules,
 *   preProcess: (n) => denormalizeExtended(normalizeExtended(preprocess(n))),
 *   postProcess: (n) => denormalizeExtended(normalizeExtended(preprocess(n))),
 *   strategy: { kind: 'cost-fixpoint', cost: computeCost },
 *   maxIterations: 10
 * });
 * ```
 */
export function rewrite(node: MathNode, config: EngineConfig): EngineResult {
	const {
		rules,
		preProcess,
		postProcess,
		strategy,
		maxIterations,
		typeCtx,
		signal,
		timeoutMs,
		onStep
	} = config;

	const abortChecker: AbortChecker | undefined = makeAbortChecker(signal, timeoutMs);

	let current = node;
	let best = node;
	// `bestCost` is only consulted under the `cost-fixpoint` branch below; the
	// `0` sentinel for the deterministic branch is never read.
	let bestCost = strategy.kind === 'cost-fixpoint' ? strategy.cost(node) : 0;
	let aborted = false;
	let iterations = 0;

	withActiveAbortChecker(abortChecker, () => {
		for (let iter = 0; iter < maxIterations; iter++) {
			iterations = iter + 1;
			if (abortChecker?.()) {
				aborted = true;
				break;
			}
			const beforeIteration = current;

			// Phase A — preProcess (no cost check; canonical form may temporarily
			// inflate cost before rules collapse it).
			//
			// Always assign `current = after` even when structurally equal:
			// `nodesEqual` ignores metadata (e.g. displayStyle), so a normalized
			// node can be structurally equal yet semantically richer. Gate the
			// `onStep` event on structural change.
			if (preProcess) {
				try {
					const after = preProcess(current);
					if (!nodesEqual(after, current)) {
						onStep?.({ kind: 'preProcess', label: 'preProcess', before: current, after });
					}
					current = after;
				} catch (e) {
					if (e instanceof AbortError) {
						aborted = true;
						break;
					}
					// Other errors (e.g. normalize edge cases) are skipped silently
					// to match existing simplify behavior.
				}
			}

			if (abortChecker?.()) {
				aborted = true;
				break;
			}

			// Phase B — rules
			if (rules.length > 0) {
				try {
					const { result: afterRules, steps: ruleSteps } = applyRulesDeepOnceTracked(
						rules,
						current,
						typeCtx
					);
					for (const rs of ruleSteps) {
						onStep?.({ kind: 'rule', label: rs.ruleName, before: rs.before, after: rs.after });
					}
					current = afterRules;
				} catch (e) {
					if (e instanceof AbortError) {
						aborted = true;
						break;
					}
					throw e;
				}
			}

			// Cost check (intermediate, strict `<` — rules may produce cheaper forms)
			if (strategy.kind === 'cost-fixpoint') {
				const cost = strategy.cost(current);
				if (cost < bestCost) {
					best = current;
					bestCost = cost;
				}
			}

			if (abortChecker?.()) {
				aborted = true;
				break;
			}

			// Phase C — postProcess (always assign; gate event on structural change,
			// see preProcess comment above)
			if (postProcess) {
				try {
					const after = postProcess(current);
					if (!nodesEqual(after, current)) {
						onStep?.({
							kind: 'postProcess',
							label: 'postProcess',
							before: current,
							after
						});
					}
					current = after;
				} catch (e) {
					if (e instanceof AbortError) {
						aborted = true;
						break;
					}
					// Other errors — skip silently
				}
			}

			// Cost check (final, `<=` so canonical form wins on equal cost)
			if (strategy.kind === 'cost-fixpoint') {
				const cost = strategy.cost(current);
				if (cost <= bestCost) {
					best = current;
					bestCost = cost;
				}
			} else {
				best = current;
			}

			// Fixpoint
			if (nodesEqual(current, beforeIteration)) {
				break;
			}
		}
	});

	return {
		result: best,
		aborted,
		iterations
	};
}
