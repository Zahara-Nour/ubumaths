/**
 * gradeLevelToSchoolLevel Tests
 * ==============================
 *
 * Maps GradeCode (database/template-side) to SchoolLevel (mathAST pedagogical
 * pipelines). Used by generateCorrection() to resolve `schoolLevel: 'auto'`.
 */

import { describe, it, expect } from 'vitest';
import { gradeLevelToSchoolLevel } from '../grade-level-to-school-level';

describe('gradeLevelToSchoolLevel', () => {
	describe('single grade input', () => {
		it('maps primary grades to primaire', () => {
			expect(gradeLevelToSchoolLevel(['CP'])).toBe('primaire');
			expect(gradeLevelToSchoolLevel(['CE1'])).toBe('primaire');
			expect(gradeLevelToSchoolLevel(['CE2'])).toBe('primaire');
			expect(gradeLevelToSchoolLevel(['CM1'])).toBe('primaire');
			expect(gradeLevelToSchoolLevel(['CM2'])).toBe('primaire');
		});

		it('maps middle school grades to college', () => {
			expect(gradeLevelToSchoolLevel(['6'])).toBe('college');
			expect(gradeLevelToSchoolLevel(['5'])).toBe('college');
			expect(gradeLevelToSchoolLevel(['4'])).toBe('college');
			expect(gradeLevelToSchoolLevel(['3'])).toBe('college');
		});

		it('maps high school grades to lycee', () => {
			expect(gradeLevelToSchoolLevel(['2'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['1_GEN'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['T_GEN'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['1_SPE'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['T_SPE'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['T_EXP'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['T_COMP'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['1_STMG'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['T_STMG'])).toBe('lycee');
		});
	});

	describe('multi-grade input — picks the highest level', () => {
		it('returns lycee when grades span middle and high', () => {
			expect(gradeLevelToSchoolLevel(['3', '2'])).toBe('lycee');
			expect(gradeLevelToSchoolLevel(['4', '3', '2'])).toBe('lycee');
		});

		it('returns college when grades span primary and middle', () => {
			expect(gradeLevelToSchoolLevel(['CM2', '6'])).toBe('college');
			expect(gradeLevelToSchoolLevel(['CM1', 'CM2', '6'])).toBe('college');
		});

		it('returns lycee when grades span all three levels', () => {
			expect(gradeLevelToSchoolLevel(['CM2', '6', '2'])).toBe('lycee');
		});

		it('handles grades in any order', () => {
			expect(gradeLevelToSchoolLevel(['2', 'CM2', '6'])).toBe('lycee');
		});

		it('returns primaire when all grades are primary', () => {
			expect(gradeLevelToSchoolLevel(['CP', 'CM2'])).toBe('primaire');
		});
	});

	describe('edge cases', () => {
		it('returns lycee fallback for empty array', () => {
			expect(gradeLevelToSchoolLevel([])).toBe('lycee');
		});

		it('returns lycee fallback when grades is undefined', () => {
			expect(gradeLevelToSchoolLevel(undefined)).toBe('lycee');
		});

		it('ignores unknown grade codes (treated as no signal)', () => {
			// @ts-expect-error — testing runtime defensiveness with invalid grade
			expect(gradeLevelToSchoolLevel(['UNKNOWN'])).toBe('lycee');
		});

		it('uses the highest known grade when mixed with unknown', () => {
			// @ts-expect-error — testing runtime defensiveness with invalid grade
			expect(gradeLevelToSchoolLevel(['UNKNOWN', 'CM2'])).toBe('primaire');
		});
	});
});
