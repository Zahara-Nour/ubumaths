/**
 * Unified Grade System for UbuMaths
 * Single source of truth for French educational grade levels
 */

// Canonical grade codes (stored in database)
export const GRADE_CODES = [
	// Primary school (ages 6-11)
	'CP',
	'CE1',
	'CE2',
	'CM1',
	'CM2',
	// Middle school (ages 11-15)
	'6',
	'5',
	'4',
	'3',
	// High school (ages 15-18)
	'2', // Seconde (common)
	'1_GEN', // 1ère générale
	'T_GEN', // Terminale générale
	'1_SPE', // 1ère spécialité maths
	'T_SPE', // Terminale spécialité maths
	'T_EXP', // Terminale maths expertes
	'T_COMP', // Terminale maths complémentaires
	'1_STMG', // 1ère STMG
	'T_STMG' // Terminale STMG
] as const;

export type GradeCode = (typeof GRADE_CODES)[number];

// School level categories
export type SchoolLevel = 'primary' | 'middle' | 'high';

// High school tracks (after 2nde)
export type HighSchoolTrack = 'general' | 'spe_maths' | 'stmg';

// Math intensity levels
export type MathsIntensity = 'basic' | 'standard' | 'advanced' | 'expert';

// Grade metadata interface
export interface GradeInfo {
	code: GradeCode;
	displayName: string; // French name with accents (e.g., "6ème")
	shortName: string; // Abbreviated (e.g., "6e")
	level: SchoolLevel;
	schoolYear: number; // 1-12 (CP=1, Terminale=12)
	track?: HighSchoolTrack; // Only for lycée after 2nde
	mathsIntensity: MathsIntensity;
	prerequisites: GradeCode[]; // Direct prerequisites only
}

// Complete grade information - this is the SINGLE SOURCE OF TRUTH
export const GRADES: Record<GradeCode, GradeInfo> = {
	// Primary school - linear progression
	CP: {
		code: 'CP',
		displayName: 'CP',
		shortName: 'CP',
		level: 'primary',
		schoolYear: 1,
		mathsIntensity: 'basic',
		prerequisites: [] // Entry point
	},
	CE1: {
		code: 'CE1',
		displayName: 'CE1',
		shortName: 'CE1',
		level: 'primary',
		schoolYear: 2,
		mathsIntensity: 'basic',
		prerequisites: ['CP']
	},
	CE2: {
		code: 'CE2',
		displayName: 'CE2',
		shortName: 'CE2',
		level: 'primary',
		schoolYear: 3,
		mathsIntensity: 'basic',
		prerequisites: ['CE1']
	},
	CM1: {
		code: 'CM1',
		displayName: 'CM1',
		shortName: 'CM1',
		level: 'primary',
		schoolYear: 4,
		mathsIntensity: 'basic',
		prerequisites: ['CE2']
	},
	CM2: {
		code: 'CM2',
		displayName: 'CM2',
		shortName: 'CM2',
		level: 'primary',
		schoolYear: 5,
		mathsIntensity: 'basic',
		prerequisites: ['CM1']
	},

	// Middle school - linear progression
	'6': {
		code: '6',
		displayName: '6ème',
		shortName: '6e',
		level: 'middle',
		schoolYear: 6,
		mathsIntensity: 'standard',
		prerequisites: ['CM2']
	},
	'5': {
		code: '5',
		displayName: '5ème',
		shortName: '5e',
		level: 'middle',
		schoolYear: 7,
		mathsIntensity: 'standard',
		prerequisites: ['6']
	},
	'4': {
		code: '4',
		displayName: '4ème',
		shortName: '4e',
		level: 'middle',
		schoolYear: 8,
		mathsIntensity: 'standard',
		prerequisites: ['5']
	},
	'3': {
		code: '3',
		displayName: '3ème',
		shortName: '3e',
		level: 'middle',
		schoolYear: 9,
		mathsIntensity: 'standard',
		prerequisites: ['4']
	},

	// High school - branching after 2nde
	'2': {
		code: '2',
		displayName: '2nde',
		shortName: '2nde',
		level: 'high',
		schoolYear: 10,
		mathsIntensity: 'standard',
		prerequisites: ['3']
	},

	// General track
	'1_GEN': {
		code: '1_GEN',
		displayName: '1ère générale',
		shortName: '1ère G',
		level: 'high',
		schoolYear: 11,
		track: 'general',
		mathsIntensity: 'standard',
		prerequisites: ['2']
	},
	T_GEN: {
		code: 'T_GEN',
		displayName: 'Terminale générale',
		shortName: 'Term G',
		level: 'high',
		schoolYear: 12,
		track: 'general',
		mathsIntensity: 'standard',
		prerequisites: ['1_GEN']
	},

	// Spé maths track
	'1_SPE': {
		code: '1_SPE',
		displayName: '1ère spécialité maths',
		shortName: '1ère Spé',
		level: 'high',
		schoolYear: 11,
		track: 'spe_maths',
		mathsIntensity: 'advanced',
		prerequisites: ['2']
	},
	T_SPE: {
		code: 'T_SPE',
		displayName: 'Terminale spécialité maths',
		shortName: 'Term Spé',
		level: 'high',
		schoolYear: 12,
		track: 'spe_maths',
		mathsIntensity: 'advanced',
		prerequisites: ['1_SPE']
	},

	// Maths expertes (requires spé maths background)
	T_EXP: {
		code: 'T_EXP',
		displayName: 'Terminale maths expertes',
		shortName: 'Term Exp',
		level: 'high',
		schoolYear: 12,
		track: 'spe_maths',
		mathsIntensity: 'expert',
		prerequisites: ['1_SPE'] // Students who took spé maths in 1ère
	},

	// Maths complémentaires (for students without spé maths)
	T_COMP: {
		code: 'T_COMP',
		displayName: 'Terminale maths complémentaires',
		shortName: 'Term Comp',
		level: 'high',
		schoolYear: 12,
		track: 'general',
		mathsIntensity: 'standard',
		prerequisites: ['1_GEN'] // Students who didn't take spé maths in 1ère
	},

	// STMG track
	'1_STMG': {
		code: '1_STMG',
		displayName: '1ère STMG',
		shortName: '1ère STMG',
		level: 'high',
		schoolYear: 11,
		track: 'stmg',
		mathsIntensity: 'basic',
		prerequisites: ['2']
	},
	T_STMG: {
		code: 'T_STMG',
		displayName: 'Terminale STMG',
		shortName: 'Term STMG',
		level: 'high',
		schoolYear: 12,
		track: 'stmg',
		mathsIntensity: 'basic',
		prerequisites: ['1_STMG']
	}
};

// Type guards
export function isGradeCode(value: unknown): value is GradeCode {
	return typeof value === 'string' && GRADE_CODES.includes(value as GradeCode);
}

export function hasHighSchoolTrack(
	grade: GradeInfo
): grade is GradeInfo & { track: HighSchoolTrack } {
	return grade.track !== undefined;
}

// Export for convenience
export const PRIMARY_GRADES: GradeCode[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];
export const MIDDLE_GRADES: GradeCode[] = ['6', '5', '4', '3'];
export const HIGH_GRADES: GradeCode[] = [
	'2',
	'1_GEN',
	'T_GEN',
	'1_SPE',
	'T_SPE',
	'T_EXP',
	'T_COMP',
	'1_STMG',
	'T_STMG'
];

// Grade options for UI selectors
export const GRADE_OPTIONS: Array<{ value: GradeCode; label: string }> = GRADE_CODES.map(
	(code) => ({
		value: code,
		label: GRADES[code].displayName
	})
);

// ============================================================================
// Pedagogical Cycles (French official system)
// ============================================================================
// Source: https://fr.wikipedia.org/wiki/Cycles_(système_éducatif_français)
// - Cycle 2: Apprentissages fondamentaux (CP, CE1, CE2)
// - Cycle 3: Consolidation (CM1, CM2, 6ème) - Note: 6ème is part of cycle 3!
// - Cycle 4: Approfondissements (5ème, 4ème, 3ème)
// - Seconde: Cycle de détermination (2nde)
// - Cycle terminal: 1ère and Terminale

// Define CycleCode first to avoid circular reference
export type CycleCode = 'cycle_2' | 'cycle_3' | 'cycle_4' | 'seconde' | 'cycle_terminal';

export interface CycleInfo {
	code: CycleCode;
	name: string;
	shortName: string;
	grades: readonly GradeCode[];
	ageRange: readonly [number, number];
}

export const CYCLES: Record<CycleCode, CycleInfo> = {
	cycle_2: {
		code: 'cycle_2',
		name: 'Cycle des apprentissages fondamentaux',
		shortName: 'Cycle 2',
		grades: ['CP', 'CE1', 'CE2'],
		ageRange: [6, 9]
	},
	cycle_3: {
		code: 'cycle_3',
		name: 'Cycle de consolidation',
		shortName: 'Cycle 3',
		grades: ['CM1', 'CM2', '6'],
		ageRange: [9, 12]
	},
	cycle_4: {
		code: 'cycle_4',
		name: 'Cycle des approfondissements',
		shortName: 'Cycle 4',
		grades: ['5', '4', '3'],
		ageRange: [12, 15]
	},
	seconde: {
		code: 'seconde',
		name: 'Cycle de détermination',
		shortName: 'Seconde',
		grades: ['2'],
		ageRange: [15, 16]
	},
	cycle_terminal: {
		code: 'cycle_terminal',
		name: 'Cycle terminal',
		shortName: 'Cycle terminal',
		grades: ['1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'],
		ageRange: [16, 18]
	}
};

export const CYCLE_CODES: readonly CycleCode[] = [
	'cycle_2',
	'cycle_3',
	'cycle_4',
	'seconde',
	'cycle_terminal'
];

/**
 * Get the pedagogical cycle for a given grade.
 * Returns null if grade is null/undefined/unknown (no gidouilles awarded in Minesweeper).
 *
 * @param grade - The grade code to look up
 * @returns The cycle code, or null if grade is invalid/missing
 */
export function getCycleForGrade(grade: GradeCode | string | null | undefined): CycleCode | null {
	if (!grade) return null;

	for (const [cycleCode, cycle] of Object.entries(CYCLES)) {
		if ((cycle.grades as readonly string[]).includes(grade)) {
			return cycleCode as CycleCode;
		}
	}

	return null;
}
