/**
 * Grade Level → School Level Mapping
 *
 * Bridges the question template's `GradeCode[]` (database identity for French
 * grades CP–T_STMG) to the mathAST pipelines' `SchoolLevel`
 * (`'primaire' | 'college' | 'lycee' | 'superieur'`).
 *
 * Used by `generateCorrection()` when an author leaves the
 * `generatedSteps.options.schoolLevel` at `'auto'` : the mapping is derived
 * from the grades attached to the question template.
 *
 * Multi-grade inputs (a single template can target several grades, e.g.
 * `['CM2', '6']`) resolve to the **highest** level present, so the rendered
 * vocabulary matches the most advanced audience the question may reach.
 *
 * Unknown / empty inputs fall back to `'lycee'` — picks the most permissive
 * pedagogical setting (the `lycee` rule-set is the broadest, covering the
 * widest set of operations).
 *
 * @module questions/grade-level-to-school-level
 */

import { GRADES, type GradeCode } from '$lib/types/grades';
import type { SchoolLevel } from '$lib/mathAST/common/step-renderer-base';

// =============================================================================
// Mapping
// =============================================================================

const PRIORITY: Record<SchoolLevel, number> = {
	primaire: 0,
	college: 1,
	lycee: 2,
	superieur: 3
};

/**
 * Map a `GRADES[code].level` (`'primary' | 'middle' | 'high'`) to the
 * corresponding `SchoolLevel`. The `superieur` mathAST level has no current
 * counterpart in `GradeCode` — reserved for post-bac extensions.
 */
function levelOfGrade(grade: GradeCode): SchoolLevel | null {
	const info = GRADES[grade];
	if (!info) return null;
	switch (info.level) {
		case 'primary':
			return 'primaire';
		case 'middle':
			return 'college';
		case 'high':
			return 'lycee';
		default:
			return null;
	}
}

/**
 * Resolve a list of grades to a single `SchoolLevel`.
 *
 * - Empty / undefined → `'lycee'` (permissive fallback).
 * - Single known grade → corresponding level.
 * - Multiple known grades → the **highest** level by `PRIORITY` (lycee > college
 *   > primaire). Unknown grade codes are silently ignored.
 * - All grades unknown → `'lycee'` fallback.
 *
 * @param grades The `grades` array from a `QuestionTemplate` / `QuestionInstance`.
 * @returns The school level to feed to a pedagogical pipeline.
 */
export function gradeLevelToSchoolLevel(grades: readonly GradeCode[] | undefined): SchoolLevel {
	if (!grades || grades.length === 0) return 'lycee';

	let best: SchoolLevel | null = null;
	for (const g of grades) {
		const lvl = levelOfGrade(g);
		if (lvl === null) continue;
		if (best === null || PRIORITY[lvl] > PRIORITY[best]) {
			best = lvl;
		}
	}

	return best ?? 'lycee';
}
