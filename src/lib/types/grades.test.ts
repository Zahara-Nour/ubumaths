import { describe, it, expect } from 'vitest';
import { getCycleForGrade, CYCLES, CYCLE_CODES, type GradeCode, GRADE_CODES } from './grades';

describe('Cycles pédagogiques', () => {
	describe('CYCLES constant', () => {
		it('should have 5 cycles defined', () => {
			expect(Object.keys(CYCLES)).toHaveLength(5);
		});

		it('should have all expected cycle codes', () => {
			expect(CYCLE_CODES).toContain('cycle_2');
			expect(CYCLE_CODES).toContain('cycle_3');
			expect(CYCLE_CODES).toContain('cycle_4');
			expect(CYCLE_CODES).toContain('seconde');
			expect(CYCLE_CODES).toContain('cycle_terminal');
		});

		it('should have correct grades for cycle_2 (apprentissages fondamentaux)', () => {
			expect(CYCLES.cycle_2.grades).toEqual(['CP', 'CE1', 'CE2']);
		});

		it('should have correct grades for cycle_3 (consolidation) - includes 6ème', () => {
			expect(CYCLES.cycle_3.grades).toEqual(['CM1', 'CM2', '6']);
		});

		it('should have correct grades for cycle_4 (approfondissements)', () => {
			expect(CYCLES.cycle_4.grades).toEqual(['5', '4', '3']);
		});

		it('should have correct grades for seconde (détermination)', () => {
			expect(CYCLES.seconde.grades).toEqual(['2']);
		});

		it('should have correct grades for cycle_terminal', () => {
			expect(CYCLES.cycle_terminal.grades).toEqual([
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

		it('should cover all grades across all cycles', () => {
			const allCycleGrades = Object.values(CYCLES).flatMap((c) => c.grades);
			// Verify all grades are covered
			for (const grade of GRADE_CODES) {
				expect(allCycleGrades).toContain(grade);
			}
		});
	});

	describe('getCycleForGrade', () => {
		describe('cas nominal - retourne le bon cycle pour chaque grade', () => {
			it.each([
				['CP', 'cycle_2'],
				['CE1', 'cycle_2'],
				['CE2', 'cycle_2']
			] as const)('returns cycle_2 for %s', (grade, expectedCycle) => {
				expect(getCycleForGrade(grade)).toBe(expectedCycle);
			});

			it.each([
				['CM1', 'cycle_3'],
				['CM2', 'cycle_3'],
				['6', 'cycle_3']
			] as const)('returns cycle_3 for %s', (grade, expectedCycle) => {
				expect(getCycleForGrade(grade)).toBe(expectedCycle);
			});

			it.each([
				['5', 'cycle_4'],
				['4', 'cycle_4'],
				['3', 'cycle_4']
			] as const)('returns cycle_4 for %s', (grade, expectedCycle) => {
				expect(getCycleForGrade(grade)).toBe(expectedCycle);
			});

			it('returns seconde for grade 2', () => {
				expect(getCycleForGrade('2')).toBe('seconde');
			});

			it.each([
				['1_GEN', 'cycle_terminal'],
				['T_GEN', 'cycle_terminal'],
				['1_SPE', 'cycle_terminal'],
				['T_SPE', 'cycle_terminal'],
				['T_EXP', 'cycle_terminal'],
				['T_COMP', 'cycle_terminal'],
				['1_STMG', 'cycle_terminal'],
				['T_STMG', 'cycle_terminal']
			] as const)('returns cycle_terminal for %s', (grade, expectedCycle) => {
				expect(getCycleForGrade(grade)).toBe(expectedCycle);
			});
		});

		describe('cas null/undefined - retourne null (pas de gidouilles)', () => {
			it('returns null for null input', () => {
				expect(getCycleForGrade(null)).toBeNull();
			});

			it('returns null for undefined input', () => {
				expect(getCycleForGrade(undefined)).toBeNull();
			});

			it('returns null for empty string', () => {
				expect(getCycleForGrade('')).toBeNull();
			});
		});

		describe('cas grade invalide - retourne null', () => {
			it('returns null for unknown grade string', () => {
				expect(getCycleForGrade('unknown')).toBeNull();
			});

			it('returns null for numeric string that is not a valid grade', () => {
				expect(getCycleForGrade('7')).toBeNull();
			});

			it('returns null for lowercase grade (not normalized)', () => {
				// Note: grades are case-sensitive, lowercase should not match
				expect(getCycleForGrade('cp')).toBeNull();
			});
		});

		describe('type safety', () => {
			it('accepts GradeCode type', () => {
				const grade: GradeCode = 'CM2';
				const result = getCycleForGrade(grade);
				expect(result).toBe('cycle_3');
			});

			it('accepts string type', () => {
				const grade: string = 'CM2';
				const result = getCycleForGrade(grade);
				expect(result).toBe('cycle_3');
			});
		});
	});
});
