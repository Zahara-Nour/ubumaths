/**
 * Legacy Type Mapper
 * ==================
 *
 * Maps old 7-type QuestionType values to the new 3-type system.
 * Used during progressive migration — files consuming QuestionType
 * call mapLegacyType() until they are fully migrated.
 *
 * @module questions/legacy-type-mapper
 */

import type { QuestionType } from './types';

/** The old 7 question types that existed before the redesign */
export type LegacyQuestionType =
	| 'numerical_exact'
	| 'numerical_decimal'
	| 'numerical_rounded'
	| 'numerical_with_unit'
	| 'algebraic_transform'
	| 'fill_in_blanks'
	| 'multiple_choice'
	| 'open_answer'; // already new — pass through

/**
 * Map a legacy question type to the new 3-type system.
 *
 * Mapping rules:
 * - `numerical_exact` → `fill_in_blanks` (result/rewrite mode)
 * - `numerical_decimal` → `fill_in_blanks` (result/rewrite mode with decimal precision)
 * - `numerical_rounded` → `fill_in_blanks`
 * - `numerical_with_unit` → `fill_in_blanks`
 * - `algebraic_transform` → `fill_in_blanks` (with requiredForm)
 * - `fill_in_blanks` → `fill_in_blanks` (pass through)
 * - `multiple_choice` → `multiple_choice` (pass through)
 * - `open_answer` → `open_answer` (pass through)
 *
 * @param legacyType - The old question type string
 * @returns The new QuestionType
 * @throws Error if the type is completely unknown
 */
export function mapLegacyType(legacyType: string): QuestionType {
	switch (legacyType) {
		// Direct pass-through (already new types)
		case 'fill_in_blanks':
			return 'fill_in_blanks';
		case 'multiple_choice':
			return 'multiple_choice';
		case 'open_answer':
			return 'open_answer';

		// Legacy numerical types → fill_in_blanks
		case 'numerical_exact':
		case 'numerical_decimal':
		case 'numerical_rounded':
		case 'numerical_with_unit':
			return 'fill_in_blanks';

		// Legacy algebraic transform → fill_in_blanks (with requiredForm)
		case 'algebraic_transform':
			return 'fill_in_blanks';

		default:
			throw new Error(`Unknown question type: "${legacyType}"`);
	}
}

/**
 * Check if a type string is one of the legacy types that needs mapping.
 *
 * @param type - The type string to check
 * @returns true if the type is a legacy type that needs mapping
 */
export function isLegacyType(type: string): boolean {
	return [
		'numerical_exact',
		'numerical_decimal',
		'numerical_rounded',
		'numerical_with_unit',
		'algebraic_transform'
	].includes(type);
}
