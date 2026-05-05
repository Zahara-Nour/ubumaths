/**
 * Pedagogical Rules — Aggregator
 *
 * Single entry point for the pipeline orchestrator (Phase 8) that combines
 * all rule families and filters them by `SchoolLevel` and `TargetForm`.
 *
 * Currently exports rule sets shipped in Phase 3 (basic operations). Rule
 * families added by later phases (fractions, radicals, powers,
 * scientific-notation) will register here without changing the public API.
 *
 * @module mathAST/pedagogical-arithmetic/pedagogical-rules
 */

import type { SchoolLevel } from '../../common/step-renderer-base';
import type { TargetForm } from '../../pedagogical-evaluate/types';
import type { PedagogicalArithmeticRule } from '../types';
import { BASIC_OPERATION_RULES } from './basic-operations';
import { FRACTION_RULES, reduceFraction } from './fractions';

// =============================================================================
// Re-exports
// =============================================================================

export { BASIC_OPERATION_RULES } from './basic-operations';
export { FRACTION_RULES } from './fractions';
export type { PedagogicalArithmeticRule } from '../types';

// =============================================================================
// Loader
// =============================================================================

export interface LoadRulesOptions {
	/** Target school level — drives `applicableLevels` filter */
	readonly schoolLevel: SchoolLevel;

	/** Optional structural target — adds terminal rules (Phase 4+) */
	readonly targetForm?: TargetForm;

	/** Force a final fraction-reduction even if the value is already reduced */
	readonly needsReducedFractions?: boolean;

	/** Force a final scientific-notation conversion */
	readonly needsScientificFinal?: boolean;
}

/**
 * Aggregate all rules applicable to the requested context.
 *
 * Order of operations :
 *   1. Concatenate every rule family currently registered.
 *   2. Filter by `applicableLevels` (a rule absent from the school level is
 *      removed entirely).
 *   3. Append target-form-specific terminal rules (Phase 4+ — currently
 *      empty since fractions/radicals/scientific-notation rules are not yet
 *      implemented).
 *
 * @returns Read-only ordered list of rules (priority is enforced by the
 *          rewriting engine, not by this loader's order).
 */
export function loadPedagogicalRules(
	options: LoadRulesOptions
): readonly PedagogicalArithmeticRule[] {
	const allFamilies: readonly PedagogicalArithmeticRule[] = [
		...BASIC_OPERATION_RULES,
		...FRACTION_RULES
	];

	const filtered = allFamilies.filter((rule) =>
		rule.applicableLevels.includes(options.schoolLevel)
	);

	const terminals: PedagogicalArithmeticRule[] = [];
	// Phase 4 — when `target.structure === 'reduced-fraction'` or strict
	// `reducedFractions: 'strict'`, we re-include `reduceFraction` even when
	// the school level normally excludes it (e.g. primaire). This guarantees
	// the final form respects the question's strict cosmetic constraint.
	if (
		(options.targetForm === 'reduced-fraction' || options.needsReducedFractions) &&
		!filtered.includes(reduceFraction)
	) {
		terminals.push(reduceFraction);
	}
	// Phase 6 — `toScientificNotationForce` when needsScientificFinal.
	// Phase 8 — pattern-driven post-processing per `targetForm`.

	return [...filtered, ...terminals];
}
