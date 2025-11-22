/**
 * Tests for grade utilities
 * Covers: hierarchy traversal, parsing, formatting, validation, and caching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	getAccessibleGrades,
	getReachableGrades,
	formatGradeForDisplay,
	formatGradeShort,
	parseGradeCode,
	isValidGradeCode,
	getGradesByLevel,
	hasAccessToGrade,
	getGradeSelectItems,
	getGradeSelectItemsByLevel,
	getGradeSelectItemsByTrack,
	getNextGrade,
	getPreviousGrade,
	getGradesGroupedByLevel,
	compareGrades,
	getGradeRange,
	clearGradeCache
} from './grades';
import { GRADE_CODES, GRADES, type GradeCode } from '$lib/types/grades';

// ============================================================================
// TEST SETUP
// ============================================================================

beforeEach(() => {
	// Clear cache before each test to ensure isolation
	clearGradeCache();
});

// ============================================================================
// getAccessibleGrades
// ============================================================================

describe('getAccessibleGrades', () => {
	describe('primary school progression (linear)', () => {
		it('should return only CP for CP grade (entry point, no prerequisites)', () => {
			const result = getAccessibleGrades('CP');
			expect(result).toEqual(['CP']);
		});

		it('should return CE1 and CP for CE1 grade', () => {
			const result = getAccessibleGrades('CE1');
			expect(result).toEqual(['CE1', 'CP']);
		});

		it('should return all primary grades from CE2 down', () => {
			const result = getAccessibleGrades('CE2');
			expect(result).toEqual(['CE2', 'CE1', 'CP']);
		});

		it('should return all primary grades for CM1', () => {
			const result = getAccessibleGrades('CM1');
			expect(result).toEqual(['CM1', 'CE2', 'CE1', 'CP']);
		});

		it('should return all primary grades for CM2', () => {
			const result = getAccessibleGrades('CM2');
			expect(result).toEqual(['CM2', 'CM1', 'CE2', 'CE1', 'CP']);
		});
	});

	describe('middle school progression (linear from CM2)', () => {
		it('should return 6eme and all primary grades', () => {
			const result = getAccessibleGrades('6');
			expect(result).toEqual(['6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']);
		});

		it('should return 5eme and all lower grades', () => {
			const result = getAccessibleGrades('5');
			expect(result).toEqual(['5', '6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']);
		});

		it('should return 4eme and all lower grades', () => {
			const result = getAccessibleGrades('4');
			expect(result).toEqual(['4', '5', '6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']);
		});

		it('should return 3eme and all lower grades (full middle + primary)', () => {
			const result = getAccessibleGrades('3');
			expect(result).toEqual(['3', '4', '5', '6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']);
		});
	});

	describe('high school general track', () => {
		it('should return 2nde and all college/primary grades', () => {
			const result = getAccessibleGrades('2');
			expect(result).toHaveLength(10);
			expect(result[0]).toBe('2');
			expect(result).toContain('3');
			expect(result).toContain('CP');
		});

		it('should return 1ere generale and all lower grades', () => {
			const result = getAccessibleGrades('1_GEN');
			expect(result).toHaveLength(11);
			expect(result[0]).toBe('1_GEN');
			expect(result).toContain('2');
			expect(result).toContain('CP');
		});

		it('should return Terminale generale and all lower grades', () => {
			const result = getAccessibleGrades('T_GEN');
			expect(result).toHaveLength(12);
			expect(result[0]).toBe('T_GEN');
			expect(result).toContain('1_GEN');
			expect(result).toContain('CP');
		});

		it('should return T_COMP with general track prerequisites', () => {
			const result = getAccessibleGrades('T_COMP');
			expect(result).toHaveLength(12);
			expect(result[0]).toBe('T_COMP');
			expect(result).toContain('1_GEN');
			expect(result).toContain('2');
			// Should NOT contain SPE track grades
			expect(result).not.toContain('1_SPE');
			expect(result).not.toContain('T_SPE');
		});
	});

	describe('high school speciality maths track', () => {
		it('should return 1ere SPE and all lower grades', () => {
			const result = getAccessibleGrades('1_SPE');
			expect(result).toHaveLength(11);
			expect(result[0]).toBe('1_SPE');
			expect(result).toContain('2');
			expect(result).toContain('CP');
		});

		it('should return T_SPE and all lower grades up SPE track', () => {
			const result = getAccessibleGrades('T_SPE');
			expect(result).toHaveLength(12);
			expect(result[0]).toBe('T_SPE');
			expect(result).toContain('1_SPE');
			expect(result).toContain('2');
			// Should NOT contain GEN track grades
			expect(result).not.toContain('1_GEN');
			expect(result).not.toContain('T_GEN');
		});

		it('should return T_EXP with SPE maths prerequisites', () => {
			const result = getAccessibleGrades('T_EXP');
			expect(result).toHaveLength(12);
			expect(result[0]).toBe('T_EXP');
			expect(result).toContain('1_SPE');
			expect(result).toContain('2');
		});
	});

	describe('high school STMG track', () => {
		it('should return 1ere STMG and all lower grades', () => {
			const result = getAccessibleGrades('1_STMG');
			expect(result).toHaveLength(11);
			expect(result[0]).toBe('1_STMG');
			expect(result).toContain('2');
			expect(result).toContain('CP');
		});

		it('should return T_STMG and all lower grades through STMG track', () => {
			const result = getAccessibleGrades('T_STMG');
			expect(result).toHaveLength(12);
			expect(result[0]).toBe('T_STMG');
			expect(result).toContain('1_STMG');
			expect(result).toContain('2');
		});
	});

	describe('caching behavior', () => {
		it('should return the same reference when called twice (cache hit)', () => {
			const result1 = getAccessibleGrades('3');
			const result2 = getAccessibleGrades('3');
			expect(result1).toBe(result2); // Same reference
		});

		it('should return fresh results after cache clear', () => {
			const result1 = getAccessibleGrades('3');
			clearGradeCache();
			const result2 = getAccessibleGrades('3');
			expect(result1).not.toBe(result2); // Different reference
			expect(result1).toEqual(result2); // Same content
		});
	});

	describe('sorting', () => {
		it('should sort grades by schoolYear descending (higher grades first)', () => {
			const result = getAccessibleGrades('T_SPE');
			// T_SPE (year 12) should be first, CP (year 1) should be last
			expect(result[0]).toBe('T_SPE');
			expect(result[result.length - 1]).toBe('CP');
		});
	});
});

// ============================================================================
// getReachableGrades
// ============================================================================

describe('getReachableGrades', () => {
	it('should return CP and all grades reachable from it', () => {
		const result = getReachableGrades('CP');
		// CP leads to CE1, which leads to CE2, etc.
		expect(result).toContain('CP');
		expect(result).toContain('CE1');
		expect(result).toContain('CE2');
		expect(result).toContain('T_SPE');
		expect(result).toContain('T_GEN');
		// Should include all 18 grades
		expect(result.length).toBe(18);
	});

	it('should return limited grades from Terminale (endpoint)', () => {
		const result = getReachableGrades('T_SPE');
		// T_SPE is an endpoint, only returns itself
		expect(result).toEqual(['T_SPE']);
	});

	it('should show multiple paths from 2nde (branching point)', () => {
		const result = getReachableGrades('2');
		// From 2nde, all high school tracks are reachable
		expect(result).toContain('2');
		expect(result).toContain('1_GEN');
		expect(result).toContain('1_SPE');
		expect(result).toContain('1_STMG');
		expect(result).toContain('T_GEN');
		expect(result).toContain('T_SPE');
		expect(result).toContain('T_EXP');
		expect(result).toContain('T_COMP');
		expect(result).toContain('T_STMG');
	});

	it('should use caching', () => {
		const result1 = getReachableGrades('CP');
		const result2 = getReachableGrades('CP');
		expect(result1).toBe(result2); // Same reference
	});
});

// ============================================================================
// formatGradeForDisplay
// ============================================================================

describe('formatGradeForDisplay', () => {
	describe('primary school grades', () => {
		it('should return CP unchanged', () => {
			expect(formatGradeForDisplay('CP')).toBe('CP');
		});

		it('should return CE1 unchanged', () => {
			expect(formatGradeForDisplay('CE1')).toBe('CE1');
		});

		it('should return CE2 unchanged', () => {
			expect(formatGradeForDisplay('CE2')).toBe('CE2');
		});

		it('should return CM1 unchanged', () => {
			expect(formatGradeForDisplay('CM1')).toBe('CM1');
		});

		it('should return CM2 unchanged', () => {
			expect(formatGradeForDisplay('CM2')).toBe('CM2');
		});
	});

	describe('middle school grades', () => {
		it('should convert 6 to 6eme', () => {
			expect(formatGradeForDisplay('6')).toBe('6ème');
		});

		it('should convert 5 to 5eme', () => {
			expect(formatGradeForDisplay('5')).toBe('5ème');
		});

		it('should convert 4 to 4eme', () => {
			expect(formatGradeForDisplay('4')).toBe('4ème');
		});

		it('should convert 3 to 3eme', () => {
			expect(formatGradeForDisplay('3')).toBe('3ème');
		});
	});

	describe('high school grades', () => {
		it('should convert 2 to 2nde', () => {
			expect(formatGradeForDisplay('2')).toBe('2nde');
		});

		it('should return 1ere generale for 1_GEN', () => {
			expect(formatGradeForDisplay('1_GEN')).toBe('1ère générale');
		});

		it('should return Terminale generale for T_GEN', () => {
			expect(formatGradeForDisplay('T_GEN')).toBe('Terminale générale');
		});

		it('should return 1ere specialite maths for 1_SPE', () => {
			expect(formatGradeForDisplay('1_SPE')).toBe('1ère spécialité maths');
		});

		it('should return Terminale specialite maths for T_SPE', () => {
			expect(formatGradeForDisplay('T_SPE')).toBe('Terminale spécialité maths');
		});

		it('should return Terminale maths expertes for T_EXP', () => {
			expect(formatGradeForDisplay('T_EXP')).toBe('Terminale maths expertes');
		});

		it('should return Terminale maths complementaires for T_COMP', () => {
			expect(formatGradeForDisplay('T_COMP')).toBe('Terminale maths complémentaires');
		});

		it('should return 1ere STMG for 1_STMG', () => {
			expect(formatGradeForDisplay('1_STMG')).toBe('1ère STMG');
		});

		it('should return Terminale STMG for T_STMG', () => {
			expect(formatGradeForDisplay('T_STMG')).toBe('Terminale STMG');
		});
	});

	describe('edge cases', () => {
		it('should return input unchanged for unknown grades', () => {
			// @ts-expect-error - testing invalid input
			const result = formatGradeForDisplay('unknown_grade');
			expect(result).toBe('unknown_grade');
		});
	});
});

// ============================================================================
// formatGradeShort
// ============================================================================

describe('formatGradeShort', () => {
	it('should return short names for primary grades', () => {
		expect(formatGradeShort('CP')).toBe('CP');
		expect(formatGradeShort('CM2')).toBe('CM2');
	});

	it('should return short names for middle school', () => {
		expect(formatGradeShort('6')).toBe('6e');
		expect(formatGradeShort('3')).toBe('3e');
	});

	it('should return short names for high school', () => {
		expect(formatGradeShort('2')).toBe('2nde');
		expect(formatGradeShort('1_GEN')).toBe('1ère G');
		expect(formatGradeShort('T_SPE')).toBe('Term Spé');
		expect(formatGradeShort('T_STMG')).toBe('Term STMG');
	});
});

// ============================================================================
// parseGradeCode
// ============================================================================

describe('parseGradeCode', () => {
	describe('canonical codes (direct match)', () => {
		it('should return canonical code for exact match', () => {
			GRADE_CODES.forEach((code) => {
				expect(parseGradeCode(code)).toBe(code);
			});
		});

		it('should be case insensitive for canonical codes', () => {
			expect(parseGradeCode('cp')).toBe('CP');
			expect(parseGradeCode('Ce1')).toBe('CE1');
			expect(parseGradeCode('t_spe')).toBe('T_SPE');
			expect(parseGradeCode('T_SPE')).toBe('T_SPE');
		});
	});

	describe('primary school variations', () => {
		it('should accept lowercase primary codes', () => {
			expect(parseGradeCode('cp')).toBe('CP');
			expect(parseGradeCode('ce1')).toBe('CE1');
			expect(parseGradeCode('ce2')).toBe('CE2');
			expect(parseGradeCode('cm1')).toBe('CM1');
			expect(parseGradeCode('cm2')).toBe('CM2');
		});
	});

	describe('middle school variations', () => {
		it('should parse numeric-only inputs', () => {
			expect(parseGradeCode('6')).toBe('6');
			expect(parseGradeCode('5')).toBe('5');
			expect(parseGradeCode('4')).toBe('4');
			expect(parseGradeCode('3')).toBe('3');
		});

		it('should parse with accents (eme)', () => {
			expect(parseGradeCode('6ème')).toBe('6');
			expect(parseGradeCode('5ème')).toBe('5');
			expect(parseGradeCode('4ème')).toBe('4');
			expect(parseGradeCode('3ème')).toBe('3');
		});

		it('should parse without accents (eme)', () => {
			expect(parseGradeCode('6eme')).toBe('6');
			expect(parseGradeCode('5eme')).toBe('5');
			expect(parseGradeCode('4eme')).toBe('4');
			expect(parseGradeCode('3eme')).toBe('3');
		});

		it('should parse short form (e)', () => {
			expect(parseGradeCode('6e')).toBe('6');
			expect(parseGradeCode('5e')).toBe('5');
			expect(parseGradeCode('4e')).toBe('4');
			expect(parseGradeCode('3e')).toBe('3');
		});

		it('should parse long form (written word with accents)', () => {
			expect(parseGradeCode('sixième')).toBe('6');
			expect(parseGradeCode('cinquième')).toBe('5');
			expect(parseGradeCode('quatrième')).toBe('4');
			expect(parseGradeCode('troisième')).toBe('3');
		});

		it('should parse long form (written word without accents)', () => {
			expect(parseGradeCode('sixieme')).toBe('6');
			expect(parseGradeCode('cinquieme')).toBe('5');
			expect(parseGradeCode('quatrieme')).toBe('4');
			expect(parseGradeCode('troisieme')).toBe('3');
		});
	});

	describe('high school seconde variations', () => {
		it('should parse 2', () => {
			expect(parseGradeCode('2')).toBe('2');
		});

		it('should parse 2nde', () => {
			expect(parseGradeCode('2nde')).toBe('2');
		});

		it('should parse 2de', () => {
			expect(parseGradeCode('2de')).toBe('2');
		});

		it('should parse seconde', () => {
			expect(parseGradeCode('seconde')).toBe('2');
		});
	});

	describe('high school premiere variations', () => {
		it('should parse 1ere generale variations', () => {
			expect(parseGradeCode('1_gen')).toBe('1_GEN');
			expect(parseGradeCode('1gen')).toBe('1_GEN');
			expect(parseGradeCode('1ère générale')).toBe('1_GEN');
			expect(parseGradeCode('1ere generale')).toBe('1_GEN');
			expect(parseGradeCode('1ère g')).toBe('1_GEN');
			expect(parseGradeCode('première générale')).toBe('1_GEN');
			expect(parseGradeCode('premiere generale')).toBe('1_GEN');
		});

		it('should parse 1ere specialite variations', () => {
			expect(parseGradeCode('1_spe')).toBe('1_SPE');
			expect(parseGradeCode('1spe')).toBe('1_SPE');
			expect(parseGradeCode('1ère spé')).toBe('1_SPE');
			expect(parseGradeCode('1ere spe')).toBe('1_SPE');
			expect(parseGradeCode('1ère spécialité')).toBe('1_SPE');
			expect(parseGradeCode('1ere specialite')).toBe('1_SPE');
			expect(parseGradeCode('première spécialité maths')).toBe('1_SPE');
			expect(parseGradeCode('premiere specialite maths')).toBe('1_SPE');
		});

		it('should parse 1ere STMG variations', () => {
			expect(parseGradeCode('1_stmg')).toBe('1_STMG');
			expect(parseGradeCode('1stmg')).toBe('1_STMG');
			expect(parseGradeCode('1ère stmg')).toBe('1_STMG');
			expect(parseGradeCode('1ere stmg')).toBe('1_STMG');
			expect(parseGradeCode('première stmg')).toBe('1_STMG');
			expect(parseGradeCode('premiere stmg')).toBe('1_STMG');
		});
	});

	describe('high school terminale variations', () => {
		it('should parse terminale generale variations', () => {
			expect(parseGradeCode('t_gen')).toBe('T_GEN');
			expect(parseGradeCode('tgen')).toBe('T_GEN');
			expect(parseGradeCode('terminale générale')).toBe('T_GEN');
			expect(parseGradeCode('terminale generale')).toBe('T_GEN');
			expect(parseGradeCode('term g')).toBe('T_GEN');
			expect(parseGradeCode('tle générale')).toBe('T_GEN');
			expect(parseGradeCode('tle generale')).toBe('T_GEN');
		});

		it('should parse terminale specialite variations', () => {
			expect(parseGradeCode('t_spe')).toBe('T_SPE');
			expect(parseGradeCode('tspe')).toBe('T_SPE');
			expect(parseGradeCode('terminale spé')).toBe('T_SPE');
			expect(parseGradeCode('terminale spe')).toBe('T_SPE');
			expect(parseGradeCode('terminale spécialité')).toBe('T_SPE');
			expect(parseGradeCode('terminale specialite')).toBe('T_SPE');
			expect(parseGradeCode('term spé')).toBe('T_SPE');
			expect(parseGradeCode('term spe')).toBe('T_SPE');
		});

		it('should parse terminale expertes variations', () => {
			expect(parseGradeCode('t_exp')).toBe('T_EXP');
			expect(parseGradeCode('texp')).toBe('T_EXP');
			expect(parseGradeCode('terminale expertes')).toBe('T_EXP');
			expect(parseGradeCode('terminale maths expertes')).toBe('T_EXP');
			expect(parseGradeCode('term exp')).toBe('T_EXP');
		});

		it('should parse terminale complementaires variations', () => {
			expect(parseGradeCode('t_comp')).toBe('T_COMP');
			expect(parseGradeCode('tcomp')).toBe('T_COMP');
			expect(parseGradeCode('terminale comp')).toBe('T_COMP');
			expect(parseGradeCode('terminale complémentaires')).toBe('T_COMP');
			expect(parseGradeCode('terminale complementaires')).toBe('T_COMP');
			expect(parseGradeCode('terminale maths complémentaires')).toBe('T_COMP');
			expect(parseGradeCode('terminale maths complementaires')).toBe('T_COMP');
			expect(parseGradeCode('term comp')).toBe('T_COMP');
		});

		it('should parse terminale STMG variations', () => {
			expect(parseGradeCode('t_stmg')).toBe('T_STMG');
			expect(parseGradeCode('tstmg')).toBe('T_STMG');
			expect(parseGradeCode('terminale stmg')).toBe('T_STMG');
			expect(parseGradeCode('term stmg')).toBe('T_STMG');
			expect(parseGradeCode('tle stmg')).toBe('T_STMG');
		});
	});

	describe('invalid inputs', () => {
		it('should return null for invalid grade strings', () => {
			expect(parseGradeCode('invalid')).toBe(null);
			expect(parseGradeCode('6th grade')).toBe(null);
			expect(parseGradeCode('seventh')).toBe(null);
			expect(parseGradeCode('10')).toBe(null);
			expect(parseGradeCode('primaire')).toBe(null);
		});

		it('should return null for empty string', () => {
			expect(parseGradeCode('')).toBe(null);
		});

		it('should return null for whitespace-only string', () => {
			expect(parseGradeCode('   ')).toBe(null);
		});

		it('should return null for non-string inputs', () => {
			// @ts-expect-error - testing runtime behavior
			expect(parseGradeCode(null)).toBe(null);
			// @ts-expect-error - testing runtime behavior
			expect(parseGradeCode(undefined)).toBe(null);
			// @ts-expect-error - testing runtime behavior
			expect(parseGradeCode(6)).toBe(null);
		});
	});

	describe('case insensitivity', () => {
		it('should be case insensitive for all variations', () => {
			expect(parseGradeCode('CP')).toBe('CP');
			expect(parseGradeCode('cp')).toBe('CP');
			expect(parseGradeCode('Cp')).toBe('CP');
			expect(parseGradeCode('SIXIÈME')).toBe('6');
			expect(parseGradeCode('Sixième')).toBe('6');
			expect(parseGradeCode('TERMINALE SPÉ')).toBe('T_SPE');
		});
	});

	describe('whitespace handling', () => {
		it('should trim whitespace from input', () => {
			expect(parseGradeCode('  CP  ')).toBe('CP');
			expect(parseGradeCode('  6ème  ')).toBe('6');
			expect(parseGradeCode('\t1ère spé\n')).toBe('1_SPE');
		});
	});
});

// ============================================================================
// isValidGradeCode
// ============================================================================

describe('isValidGradeCode', () => {
	describe('valid codes', () => {
		it('should return true for all canonical grade codes', () => {
			GRADE_CODES.forEach((code) => {
				expect(isValidGradeCode(code)).toBe(true);
			});
		});
	});

	describe('invalid codes', () => {
		it('should return false for invalid strings', () => {
			expect(isValidGradeCode('invalid')).toBe(false);
			expect(isValidGradeCode('6ème')).toBe(false); // Variation, not canonical
			expect(isValidGradeCode('sixieme')).toBe(false);
			expect(isValidGradeCode('')).toBe(false);
			expect(isValidGradeCode('10')).toBe(false);
		});

		it('should return false for lowercase canonical codes', () => {
			// isValidGradeCode checks exact match, not parsed
			expect(isValidGradeCode('cp')).toBe(false);
			expect(isValidGradeCode('t_spe')).toBe(false);
		});
	});

	describe('type guard behavior', () => {
		it('should narrow type correctly', () => {
			const input = '6';
			if (isValidGradeCode(input)) {
				// TypeScript should know input is GradeCode here
				const gradeInfo = GRADES[input];
				expect(gradeInfo.code).toBe('6');
			}
		});
	});
});

// ============================================================================
// hasAccessToGrade
// ============================================================================

describe('hasAccessToGrade', () => {
	describe('same grade access', () => {
		it('should allow access to same grade', () => {
			expect(hasAccessToGrade('6', '6')).toBe(true);
			expect(hasAccessToGrade('CP', 'CP')).toBe(true);
			expect(hasAccessToGrade('T_SPE', 'T_SPE')).toBe(true);
		});
	});

	describe('higher grade accessing lower grade content', () => {
		it('should allow 3eme to access 4eme, 5eme, 6eme content', () => {
			expect(hasAccessToGrade('3', '4')).toBe(true);
			expect(hasAccessToGrade('3', '5')).toBe(true);
			expect(hasAccessToGrade('3', '6')).toBe(true);
		});

		it('should allow 3eme to access primary school content', () => {
			expect(hasAccessToGrade('3', 'CM2')).toBe(true);
			expect(hasAccessToGrade('3', 'CP')).toBe(true);
		});

		it('should allow T_SPE to access all SPE track prerequisites', () => {
			expect(hasAccessToGrade('T_SPE', '1_SPE')).toBe(true);
			expect(hasAccessToGrade('T_SPE', '2')).toBe(true);
			expect(hasAccessToGrade('T_SPE', '3')).toBe(true);
		});
	});

	describe('lower grade cannot access higher grade content', () => {
		it('should deny 6eme access to 5eme content', () => {
			expect(hasAccessToGrade('6', '5')).toBe(false);
		});

		it('should deny CP access to any other grade', () => {
			expect(hasAccessToGrade('CP', 'CE1')).toBe(false);
			expect(hasAccessToGrade('CP', '6')).toBe(false);
		});

		it('should deny cross-track access in lycee', () => {
			// T_GEN cannot access T_SPE content
			expect(hasAccessToGrade('T_GEN', 'T_SPE')).toBe(false);
			// T_SPE cannot access T_GEN content
			expect(hasAccessToGrade('T_SPE', 'T_GEN')).toBe(false);
		});
	});
});

// ============================================================================
// getGradesByLevel
// ============================================================================

describe('getGradesByLevel', () => {
	it('should return all primary school grades', () => {
		const result = getGradesByLevel('primary');
		expect(result).toEqual(['CP', 'CE1', 'CE2', 'CM1', 'CM2']);
	});

	it('should return all middle school grades', () => {
		const result = getGradesByLevel('middle');
		expect(result).toEqual(['6', '5', '4', '3']);
	});

	it('should return all high school grades', () => {
		const result = getGradesByLevel('high');
		expect(result).toEqual([
			'2',
			'1_GEN',
			'T_GEN',
			'1_SPE',
			'T_SPE',
			'T_EXP',
			'T_COMP',
			'1_STMG',
			'T_STMG'
		]);
	});

	it('should return grades in GRADE_CODES order', () => {
		const primary = getGradesByLevel('primary');
		const middle = getGradesByLevel('middle');
		const high = getGradesByLevel('high');

		// Combined should match GRADE_CODES order
		expect([...primary, ...middle, ...high]).toEqual([...GRADE_CODES]);
	});
});

// ============================================================================
// getGradeSelectItems
// ============================================================================

describe('getGradeSelectItems', () => {
	it('should return all grades as select items', () => {
		const result = getGradeSelectItems();
		expect(result).toHaveLength(18);
	});

	it('should have value/label structure', () => {
		const result = getGradeSelectItems();
		result.forEach((item) => {
			expect(item).toHaveProperty('value');
			expect(item).toHaveProperty('label');
			expect(typeof item.value).toBe('string');
			expect(typeof item.label).toBe('string');
		});
	});

	it('should use displayName for labels', () => {
		const result = getGradeSelectItems();
		const sixieme = result.find((item) => item.value === '6');
		expect(sixieme?.label).toBe('6ème');

		const tSpe = result.find((item) => item.value === 'T_SPE');
		expect(tSpe?.label).toBe('Terminale spécialité maths');
	});
});

// ============================================================================
// getGradeSelectItemsByLevel
// ============================================================================

describe('getGradeSelectItemsByLevel', () => {
	it('should return primary grades with labels', () => {
		const result = getGradeSelectItemsByLevel('primary');
		expect(result).toHaveLength(5);
		expect(result[0]).toEqual({ value: 'CP', label: 'CP' });
	});

	it('should return middle grades with labels', () => {
		const result = getGradeSelectItemsByLevel('middle');
		expect(result).toHaveLength(4);
		expect(result[0]).toEqual({ value: '6', label: '6ème' });
	});

	it('should return high school grades with labels', () => {
		const result = getGradeSelectItemsByLevel('high');
		expect(result).toHaveLength(9);
		expect(result[0]).toEqual({ value: '2', label: '2nde' });
	});
});

// ============================================================================
// getGradeSelectItemsByTrack
// ============================================================================

describe('getGradeSelectItemsByTrack', () => {
	it('should return general track grades (including 2nde)', () => {
		const result = getGradeSelectItemsByTrack('general');
		const values = result.map((item) => item.value);
		expect(values).toContain('2');
		expect(values).toContain('1_GEN');
		expect(values).toContain('T_GEN');
		expect(values).toContain('T_COMP'); // T_COMP is general track
		expect(values).not.toContain('1_SPE');
		expect(values).not.toContain('T_SPE');
	});

	it('should return spe_maths track grades (including 2nde)', () => {
		const result = getGradeSelectItemsByTrack('spe_maths');
		const values = result.map((item) => item.value);
		expect(values).toContain('2');
		expect(values).toContain('1_SPE');
		expect(values).toContain('T_SPE');
		expect(values).toContain('T_EXP');
		expect(values).not.toContain('1_GEN');
		expect(values).not.toContain('T_GEN');
	});

	it('should return STMG track grades (including 2nde)', () => {
		const result = getGradeSelectItemsByTrack('stmg');
		const values = result.map((item) => item.value);
		expect(values).toContain('2');
		expect(values).toContain('1_STMG');
		expect(values).toContain('T_STMG');
		expect(values).not.toContain('1_SPE');
		expect(values).not.toContain('1_GEN');
	});
});

// ============================================================================
// getNextGrade
// ============================================================================

describe('getNextGrade', () => {
	describe('linear progression', () => {
		it('should return CE1 for CP', () => {
			expect(getNextGrade('CP')).toBe('CE1');
		});

		it('should return 6eme for CM2', () => {
			expect(getNextGrade('CM2')).toBe('6');
		});

		it('should return 2nde for 3eme', () => {
			expect(getNextGrade('3')).toBe('2');
		});
	});

	describe('branching point (2nde)', () => {
		it('should return null for 2nde (multiple possible paths)', () => {
			expect(getNextGrade('2')).toBe(null);
		});
	});

	describe('terminale grades (endpoints)', () => {
		it('should return null for T_SPE', () => {
			expect(getNextGrade('T_SPE')).toBe(null);
		});

		it('should return null for T_GEN', () => {
			expect(getNextGrade('T_GEN')).toBe(null);
		});

		it('should return null for T_EXP', () => {
			expect(getNextGrade('T_EXP')).toBe(null);
		});

		it('should return null for T_COMP', () => {
			expect(getNextGrade('T_COMP')).toBe(null);
		});

		it('should return null for T_STMG', () => {
			expect(getNextGrade('T_STMG')).toBe(null);
		});
	});

	describe('high school tracks', () => {
		it('should return T_GEN for 1_GEN', () => {
			expect(getNextGrade('1_GEN')).toBe('T_GEN');
		});

		it('should return T_SPE for 1_SPE', () => {
			expect(getNextGrade('1_SPE')).toBe('T_SPE');
		});

		it('should return T_STMG for 1_STMG', () => {
			expect(getNextGrade('1_STMG')).toBe('T_STMG');
		});
	});
});

// ============================================================================
// getPreviousGrade
// ============================================================================

describe('getPreviousGrade', () => {
	describe('entry point', () => {
		it('should return null for CP (no prerequisites)', () => {
			expect(getPreviousGrade('CP')).toBe(null);
		});
	});

	describe('linear progression', () => {
		it('should return CP for CE1', () => {
			expect(getPreviousGrade('CE1')).toBe('CP');
		});

		it('should return CM2 for 6eme', () => {
			expect(getPreviousGrade('6')).toBe('CM2');
		});

		it('should return 3eme for 2nde', () => {
			expect(getPreviousGrade('2')).toBe('3');
		});
	});

	describe('high school tracks', () => {
		it('should return 2nde for 1_GEN', () => {
			expect(getPreviousGrade('1_GEN')).toBe('2');
		});

		it('should return 2nde for 1_SPE', () => {
			expect(getPreviousGrade('1_SPE')).toBe('2');
		});

		it('should return 2nde for 1_STMG', () => {
			expect(getPreviousGrade('1_STMG')).toBe('2');
		});

		it('should return 1_GEN for T_GEN', () => {
			expect(getPreviousGrade('T_GEN')).toBe('1_GEN');
		});

		it('should return 1_SPE for T_SPE', () => {
			expect(getPreviousGrade('T_SPE')).toBe('1_SPE');
		});

		it('should return 1_SPE for T_EXP', () => {
			expect(getPreviousGrade('T_EXP')).toBe('1_SPE');
		});

		it('should return 1_GEN for T_COMP', () => {
			expect(getPreviousGrade('T_COMP')).toBe('1_GEN');
		});
	});
});

// ============================================================================
// getGradesGroupedByLevel
// ============================================================================

describe('getGradesGroupedByLevel', () => {
	it('should return all three levels', () => {
		const result = getGradesGroupedByLevel();
		expect(result).toHaveProperty('primary');
		expect(result).toHaveProperty('middle');
		expect(result).toHaveProperty('high');
	});

	it('should have correct count for each level', () => {
		const result = getGradesGroupedByLevel();
		expect(result.primary).toHaveLength(5);
		expect(result.middle).toHaveLength(4);
		expect(result.high).toHaveLength(9);
	});

	it('should have value/label structure for each item', () => {
		const result = getGradesGroupedByLevel();
		Object.values(result)
			.flat()
			.forEach((item) => {
				expect(item).toHaveProperty('value');
				expect(item).toHaveProperty('label');
			});
	});
});

// ============================================================================
// compareGrades
// ============================================================================

describe('compareGrades', () => {
	it('should return negative when first grade is lower', () => {
		expect(compareGrades('CP', 'CE1')).toBeLessThan(0);
		expect(compareGrades('6', '5')).toBeLessThan(0);
		expect(compareGrades('2', 'T_SPE')).toBeLessThan(0);
	});

	it('should return positive when first grade is higher', () => {
		expect(compareGrades('CE1', 'CP')).toBeGreaterThan(0);
		expect(compareGrades('5', '6')).toBeGreaterThan(0);
		expect(compareGrades('T_SPE', '2')).toBeGreaterThan(0);
	});

	it('should return 0 when grades are equal', () => {
		expect(compareGrades('6', '6')).toBe(0);
		expect(compareGrades('CP', 'CP')).toBe(0);
		expect(compareGrades('T_SPE', 'T_SPE')).toBe(0);
	});

	it('should return 0 for grades at same schoolYear level', () => {
		// All terminale grades have schoolYear 12
		expect(compareGrades('T_GEN', 'T_SPE')).toBe(0);
		expect(compareGrades('T_SPE', 'T_EXP')).toBe(0);
		expect(compareGrades('T_COMP', 'T_STMG')).toBe(0);
	});

	it('should be usable for sorting', () => {
		const grades: GradeCode[] = ['T_SPE', 'CP', '6', 'CM2', '3'];
		const sorted = [...grades].sort(compareGrades);
		expect(sorted).toEqual(['CP', 'CM2', '6', '3', 'T_SPE']);
	});
});

// ============================================================================
// getGradeRange
// ============================================================================

describe('getGradeRange', () => {
	it('should return grades between two grades (inclusive)', () => {
		const result = getGradeRange('CE1', 'CM1');
		expect(result).toContain('CE1');
		expect(result).toContain('CE2');
		expect(result).toContain('CM1');
		expect(result).not.toContain('CP');
		expect(result).not.toContain('CM2');
	});

	it('should work regardless of argument order', () => {
		const result1 = getGradeRange('CE1', 'CM1');
		const result2 = getGradeRange('CM1', 'CE1');
		expect(result1).toEqual(result2);
	});

	it('should return single grade when from equals to', () => {
		const result = getGradeRange('6', '6');
		expect(result).toEqual(['6']);
	});

	it('should include all grades at same schoolYear', () => {
		// Range from 1ere to terminale includes all grades at those years
		const result = getGradeRange('1_GEN', 'T_GEN');
		// Year 11: 1_GEN, 1_SPE, 1_STMG
		// Year 12: T_GEN, T_SPE, T_EXP, T_COMP, T_STMG
		expect(result).toContain('1_GEN');
		expect(result).toContain('1_SPE');
		expect(result).toContain('1_STMG');
		expect(result).toContain('T_GEN');
		expect(result).toContain('T_SPE');
	});

	it('should return full range from CP to T_SPE', () => {
		const result = getGradeRange('CP', 'T_SPE');
		expect(result.length).toBe(18); // All grades
	});
});

// ============================================================================
// clearGradeCache
// ============================================================================

describe('clearGradeCache', () => {
	it('should clear the cache successfully', () => {
		// Populate cache
		getAccessibleGrades('6');
		getReachableGrades('6');

		// Clear should not throw
		expect(() => clearGradeCache()).not.toThrow();

		// After clear, a new call should create fresh data
		const result = getAccessibleGrades('6');
		expect(result).toBeDefined();
	});

	it('should allow tests to run in isolation', () => {
		// First call populates cache
		const result1 = getAccessibleGrades('CM2');

		// Clear cache
		clearGradeCache();

		// Second call creates new cache entry
		const result2 = getAccessibleGrades('CM2');

		// Results should be equal but not same reference
		expect(result1).toEqual(result2);
		expect(result1).not.toBe(result2);
	});
});

// ============================================================================
// Integration tests
// ============================================================================

describe('integration tests', () => {
	it('should correctly map all 18 grades', () => {
		expect(GRADE_CODES).toHaveLength(18);
		expect(Object.keys(GRADES)).toHaveLength(18);
	});

	it('should have consistent data between GRADES and functions', () => {
		GRADE_CODES.forEach((code) => {
			const info = GRADES[code];
			expect(formatGradeForDisplay(code)).toBe(info.displayName);
			expect(formatGradeShort(code)).toBe(info.shortName);
			expect(isValidGradeCode(code)).toBe(true);
		});
	});

	it('should have all grades accessible from at least one terminus grade', () => {
		const terminalGrades: GradeCode[] = ['T_GEN', 'T_SPE', 'T_EXP', 'T_COMP', 'T_STMG'];
		const allAccessible = new Set<GradeCode>();

		terminalGrades.forEach((grade) => {
			getAccessibleGrades(grade).forEach((g) => allAccessible.add(g));
		});

		// All 18 grades should be accessible from at least one terminal grade
		expect(allAccessible.size).toBe(18);
	});

	it('should have all grades reachable from CP', () => {
		const reachable = getReachableGrades('CP');
		expect(reachable).toHaveLength(18);
	});
});
