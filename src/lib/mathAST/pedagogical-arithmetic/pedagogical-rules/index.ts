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
import { RADICAL_RULES } from './radicals';
import { POWER_RULES } from './powers';
import { SCIENTIFIC_NOTATION_RULES, toScientificNotation } from './scientific-notation';

// =============================================================================
// Re-exports
// =============================================================================

export { BASIC_OPERATION_RULES } from './basic-operations';
export { FRACTION_RULES } from './fractions';
export { RADICAL_RULES } from './radicals';
export { POWER_RULES } from './powers';
export { SCIENTIFIC_NOTATION_RULES } from './scientific-notation';
export type { PedagogicalArithmeticRule } from '../types';

/**
 * Lookup map of every rule across all families, keyed by `rule.name`. The
 * pipeline emits steps that carry only the rule name; the renderer uses
 * this map to recover the rule's metadata (per-level descriptions and
 * explanations).
 */
export const ALL_RULES_BY_NAME: ReadonlyMap<string, PedagogicalArithmeticRule> = new Map(
	[
		...BASIC_OPERATION_RULES,
		...FRACTION_RULES,
		...RADICAL_RULES,
		...POWER_RULES,
		...SCIENTIFIC_NOTATION_RULES
	].map((rule) => [rule.name, rule])
);

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
		...FRACTION_RULES,
		...RADICAL_RULES,
		...POWER_RULES
		// scientific-notation rules are added only when the target asks for it
		// (otherwise they would fire on plain integers — undesired in basic
		// arithmetic contexts)
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
	// Phase 6 — when target is scientific notation, include the family
	// (multiplyScientific, addScientificSamePower, toScientificNotation).
	if (options.targetForm === 'scientific' || options.needsScientificFinal) {
		// Filter by school level the same way as core families
		for (const rule of SCIENTIFIC_NOTATION_RULES) {
			if (rule.applicableLevels.includes(options.schoolLevel) && !filtered.includes(rule)) {
				terminals.push(rule);
			}
		}
		// `toScientificNotation` is the terminal converter ; ensure it's added
		// even outside its applicable levels when explicitly required.
		if (!terminals.includes(toScientificNotation) && !filtered.includes(toScientificNotation)) {
			terminals.push(toScientificNotation);
		}
	}
	// Phase 8 — pattern-driven post-processing per `targetForm`.

	return [...filtered, ...terminals];
}
