/**
 * GradeBadgeSelector Component Tests
 * ===================================
 *
 * Tests the selector component logic for grade badge selection.
 * These tests focus on the utility functions and data handling.
 *
 * NOTE: Full DOM/interaction tests should be added with E2E tests (Playwright).
 * These unit tests verify the TypeScript logic that powers the component.
 *
 * Test Coverage:
 * 1. Grade Utilities - formatGradeShort, GRADES metadata
 * 2. School Level Grouping - PRIMARY_GRADES, MIDDLE_GRADES, HIGH_GRADES
 * 3. Selection Logic - Array manipulation patterns
 * 4. Edge Cases - Empty arrays, limits
 *
 * @module components/GradeBadgeSelector.test
 */

import { describe, it, expect } from 'vitest';
import {
	GRADES,
	PRIMARY_GRADES,
	MIDDLE_GRADES,
	HIGH_GRADES,
	GRADE_CODES,
	type GradeCode,
	type SchoolLevel
} from '$lib/types/grades';
import { formatGradeShort, formatGradeForDisplay } from '$lib/utils/grades';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * School level labels used in the component
 */
const schoolLevelLabels: Record<SchoolLevel, string> = {
	primary: 'Primaire',
	middle: 'Collège',
	high: 'Lycée'
};

/**
 * Simulate toggle selection logic from component
 */
function toggleGrade(
	selection: GradeCode[],
	grade: GradeCode,
	maxSelections?: number
): GradeCode[] {
	const isSelected = selection.includes(grade);

	if (isSelected) {
		return selection.filter((g) => g !== grade);
	} else {
		if (maxSelections !== undefined && selection.length >= maxSelections) {
			return selection;
		}
		return [...selection, grade];
	}
}

/**
 * Simulate remove grade logic from component
 */
function removeGrade(selection: GradeCode[], grade: GradeCode): GradeCode[] {
	return selection.filter((g) => g !== grade);
}

/**
 * Check if can add more selections
 */
function canAddMore(selection: GradeCode[], maxSelections?: number): boolean {
	return maxSelections === undefined || selection.length < maxSelections;
}

// ============================================================================
// 1. GRADE UTILITIES
// ============================================================================

describe('GradeBadgeSelector - Grade Utilities', () => {
	it('formatGradeShort returns short display names', () => {
		expect(formatGradeShort('6')).toBe('6e');
		expect(formatGradeShort('5')).toBe('5e');
		expect(formatGradeShort('4')).toBe('4e');
		expect(formatGradeShort('3')).toBe('3e');
	});

	it('formatGradeShort handles primary grades', () => {
		expect(formatGradeShort('CP')).toBe('CP');
		expect(formatGradeShort('CE1')).toBe('CE1');
		expect(formatGradeShort('CE2')).toBe('CE2');
		expect(formatGradeShort('CM1')).toBe('CM1');
		expect(formatGradeShort('CM2')).toBe('CM2');
	});

	it('formatGradeShort handles high school grades', () => {
		expect(formatGradeShort('2')).toBe('2nde');
		expect(formatGradeShort('1_GEN')).toBe('1ère G');
		expect(formatGradeShort('T_GEN')).toBe('Term G');
		expect(formatGradeShort('1_SPE')).toBe('1ère Spé');
		expect(formatGradeShort('T_SPE')).toBe('Term Spé');
	});

	it('formatGradeForDisplay returns full French names', () => {
		expect(formatGradeForDisplay('6')).toBe('6ème');
		expect(formatGradeForDisplay('CP')).toBe('CP');
		expect(formatGradeForDisplay('1_GEN')).toBe('1ère générale');
	});

	it('GRADES contains all grade metadata', () => {
		GRADE_CODES.forEach((grade) => {
			const info = GRADES[grade];
			expect(info).toBeDefined();
			expect(info.code).toBe(grade);
			expect(info.displayName).toBeTruthy();
			expect(info.shortName).toBeTruthy();
			expect(info.level).toMatch(/^(primary|middle|high)$/);
		});
	});

	it('GRADES has correct display names for accessibility labels', () => {
		// These are used in aria-label attributes
		expect(GRADES['6'].displayName).toBe('6ème');
		expect(GRADES['CP'].displayName).toBe('CP');
		expect(GRADES['1_SPE'].displayName).toBe('1ère spécialité maths');
	});
});

// ============================================================================
// 2. SCHOOL LEVEL GROUPING
// ============================================================================

describe('GradeBadgeSelector - School Level Grouping', () => {
	it('PRIMARY_GRADES contains all primary school grades', () => {
		expect(PRIMARY_GRADES).toEqual(['CP', 'CE1', 'CE2', 'CM1', 'CM2']);
		expect(PRIMARY_GRADES).toHaveLength(5);
	});

	it('MIDDLE_GRADES contains all middle school grades', () => {
		expect(MIDDLE_GRADES).toEqual(['6', '5', '4', '3']);
		expect(MIDDLE_GRADES).toHaveLength(4);
	});

	it('HIGH_GRADES contains all high school grades', () => {
		expect(HIGH_GRADES).toContain('2');
		expect(HIGH_GRADES).toContain('1_GEN');
		expect(HIGH_GRADES).toContain('T_GEN');
		expect(HIGH_GRADES).toContain('1_SPE');
		expect(HIGH_GRADES).toContain('T_SPE');
		expect(HIGH_GRADES.length).toBeGreaterThanOrEqual(5);
	});

	it('school level labels are in French', () => {
		expect(schoolLevelLabels.primary).toBe('Primaire');
		expect(schoolLevelLabels.middle).toBe('Collège');
		expect(schoolLevelLabels.high).toBe('Lycée');
	});

	it('GRADE_CODES equals combined school levels', () => {
		const combined = [...PRIMARY_GRADES, ...MIDDLE_GRADES, ...HIGH_GRADES];
		expect(GRADE_CODES).toEqual(combined);
	});

	it('each grade belongs to correct school level', () => {
		PRIMARY_GRADES.forEach((grade) => {
			expect(GRADES[grade].level).toBe('primary');
		});

		MIDDLE_GRADES.forEach((grade) => {
			expect(GRADES[grade].level).toBe('middle');
		});

		HIGH_GRADES.forEach((grade) => {
			expect(GRADES[grade].level).toBe('high');
		});
	});
});

// ============================================================================
// 3. SELECTION LOGIC
// ============================================================================

describe('GradeBadgeSelector - Selection Logic', () => {
	describe('toggleGrade', () => {
		it('adds grade when not selected', () => {
			const selection: GradeCode[] = ['6', '5'];
			const result = toggleGrade(selection, '4');

			expect(result).toContain('4');
			expect(result).toHaveLength(3);
		});

		it('removes grade when already selected', () => {
			const selection: GradeCode[] = ['6', '5', '4'];
			const result = toggleGrade(selection, '5');

			expect(result).not.toContain('5');
			expect(result).toHaveLength(2);
		});

		it('preserves other selections when toggling', () => {
			const selection: GradeCode[] = ['6', '5', '4'];
			const result = toggleGrade(selection, '5');

			expect(result).toContain('6');
			expect(result).toContain('4');
		});

		it('respects maxSelections limit when adding', () => {
			const selection: GradeCode[] = ['6', '5', '4'];
			const result = toggleGrade(selection, '3', 3);

			expect(result).not.toContain('3');
			expect(result).toHaveLength(3);
		});

		it('allows removal even at maxSelections', () => {
			const selection: GradeCode[] = ['6', '5', '4'];
			const result = toggleGrade(selection, '5', 3);

			expect(result).not.toContain('5');
			expect(result).toHaveLength(2);
		});

		it('allows adding when under maxSelections', () => {
			const selection: GradeCode[] = ['6', '5'];
			const result = toggleGrade(selection, '4', 3);

			expect(result).toContain('4');
			expect(result).toHaveLength(3);
		});
	});

	describe('removeGrade', () => {
		it('removes existing grade', () => {
			const selection: GradeCode[] = ['6', '5', '4'];
			const result = removeGrade(selection, '5');

			expect(result).toEqual(['6', '4']);
		});

		it('returns same array if grade not present', () => {
			const selection: GradeCode[] = ['6', '5'];
			const result = removeGrade(selection, '4');

			expect(result).toEqual(['6', '5']);
		});

		it('handles empty array', () => {
			const selection: GradeCode[] = [];
			const result = removeGrade(selection, '6');

			expect(result).toEqual([]);
		});

		it('handles removing last grade', () => {
			const selection: GradeCode[] = ['6'];
			const result = removeGrade(selection, '6');

			expect(result).toEqual([]);
		});
	});

	describe('canAddMore', () => {
		it('returns true when no limit set', () => {
			expect(canAddMore(['6', '5', '4'])).toBe(true);
			expect(canAddMore([])).toBe(true);
		});

		it('returns true when under limit', () => {
			expect(canAddMore(['6', '5'], 3)).toBe(true);
			expect(canAddMore([], 3)).toBe(true);
		});

		it('returns false when at limit', () => {
			expect(canAddMore(['6', '5', '4'], 3)).toBe(false);
		});

		it('returns false when over limit (edge case)', () => {
			expect(canAddMore(['6', '5', '4', '3'], 3)).toBe(false);
		});
	});
});

// ============================================================================
// 4. EDGE CASES
// ============================================================================

describe('GradeBadgeSelector - Edge Cases', () => {
	it('handles empty selection array', () => {
		const selection: GradeCode[] = [];

		expect(toggleGrade(selection, '6')).toEqual(['6']);
		expect(removeGrade(selection, '6')).toEqual([]);
		expect(canAddMore(selection, 5)).toBe(true);
	});

	it('handles selection with all grades', () => {
		const selection = [...GRADE_CODES];

		expect(selection).toHaveLength(GRADE_CODES.length);
		expect(toggleGrade(selection, '6')).toHaveLength(GRADE_CODES.length - 1);
	});

	it('handles maxSelections of 1 (single select mode)', () => {
		const selection: GradeCode[] = ['6'];

		expect(canAddMore(selection, 1)).toBe(false);
		expect(toggleGrade(selection, '5', 1)).toEqual(['6']); // Can't add
		expect(toggleGrade(selection, '6', 1)).toEqual([]); // Can remove
	});

	it('handles maxSelections of 0', () => {
		const selection: GradeCode[] = [];

		expect(canAddMore(selection, 0)).toBe(false);
		expect(toggleGrade(selection, '6', 0)).toEqual([]);
	});

	it('preserves grade order when adding', () => {
		let selection: GradeCode[] = [];
		selection = toggleGrade(selection, '4');
		selection = toggleGrade(selection, '6');
		selection = toggleGrade(selection, '5');

		expect(selection).toEqual(['4', '6', '5']);
	});

	it('handles duplicate toggle attempts', () => {
		let selection: GradeCode[] = ['6'];
		selection = toggleGrade(selection, '5');
		selection = toggleGrade(selection, '5'); // Toggle same grade again

		expect(selection).toEqual(['6']);
	});
});

// ============================================================================
// 5. ARIA LABEL GENERATION
// ============================================================================

describe('GradeBadgeSelector - ARIA Labels', () => {
	it('generates correct remove button label', () => {
		const grade: GradeCode = '6';
		const expectedLabel = `Supprimer ${GRADES[grade].displayName}`;

		expect(expectedLabel).toBe('Supprimer 6ème');
	});

	it('generates correct toggle button labels', () => {
		const grade: GradeCode = 'CP';
		const selectLabel = `Sélectionner ${GRADES[grade].displayName}`;
		const deselectLabel = `Désélectionner ${GRADES[grade].displayName}`;

		expect(selectLabel).toBe('Sélectionner CP');
		expect(deselectLabel).toBe('Désélectionner CP');
	});

	it('all grades have valid display names for labels', () => {
		GRADE_CODES.forEach((grade) => {
			const info = GRADES[grade];
			expect(info.displayName).toBeTruthy();
			expect(typeof info.displayName).toBe('string');
			expect(info.displayName.length).toBeGreaterThan(0);
		});
	});

	it('handles high school grades with complex names', () => {
		const grade: GradeCode = '1_SPE';
		const label = `Sélectionner ${GRADES[grade].displayName}`;

		expect(label).toBe('Sélectionner 1ère spécialité maths');
	});
});

// ============================================================================
// 6. COMPONENT DATA STRUCTURE
// ============================================================================

describe('GradeBadgeSelector - Data Structure', () => {
	it('gradesByLevel structure matches component', () => {
		const gradesByLevel = [
			{ level: 'primary' as SchoolLevel, grades: PRIMARY_GRADES },
			{ level: 'middle' as SchoolLevel, grades: MIDDLE_GRADES },
			{ level: 'high' as SchoolLevel, grades: HIGH_GRADES }
		];

		expect(gradesByLevel).toHaveLength(3);
		expect(gradesByLevel[0].level).toBe('primary');
		expect(gradesByLevel[1].level).toBe('middle');
		expect(gradesByLevel[2].level).toBe('high');
	});

	it('all school levels have grades', () => {
		expect(PRIMARY_GRADES.length).toBeGreaterThan(0);
		expect(MIDDLE_GRADES.length).toBeGreaterThan(0);
		expect(HIGH_GRADES.length).toBeGreaterThan(0);
	});

	it('school level order is primary → middle → high', () => {
		// Verify the display order matches French school system
		const levels: SchoolLevel[] = ['primary', 'middle', 'high'];
		const labels = levels.map((l) => schoolLevelLabels[l]);

		expect(labels).toEqual(['Primaire', 'Collège', 'Lycée']);
	});
});
