import { GRADES, GRADE_CODES, type GradeCode, type SchoolLevel } from '$lib/types/grades';

// Cache for computed hierarchies
const accessibleCache = new Map<GradeCode, GradeCode[]>();
const reachableCache = new Map<GradeCode, GradeCode[]>();

/**
 * Get all grades accessible from a given grade (prerequisites + self)
 * A student in grade X can access content from X and all lower grades.
 * Uses BFS to traverse prerequisites backward.
 */
export function getAccessibleGrades(grade: GradeCode): GradeCode[] {
	// Check cache first
	const cached = accessibleCache.get(grade);
	if (cached) {
		return cached;
	}

	const accessible = new Set<GradeCode>();
	const queue: GradeCode[] = [grade];

	// BFS through prerequisites (traverse backward to lower grades)
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) continue;

		if (accessible.has(current)) continue;
		accessible.add(current);

		// Add all prerequisites of the current grade
		const currentInfo = GRADES[current];
		for (const prereq of currentInfo.prerequisites) {
			if (!accessible.has(prereq)) {
				queue.push(prereq);
			}
		}
	}

	// Sort by schoolYear descending (higher grades first)
	const sorted = Array.from(accessible).sort((a, b) => {
		return GRADES[b].schoolYear - GRADES[a].schoolYear;
	});

	// Cache and return
	accessibleCache.set(grade, sorted);
	return sorted;
}

/**
 * Get all grades reachable from a given grade (successors + self)
 * This shows what grades a student can progress to.
 * Uses BFS to traverse forward through the dependency tree.
 */
export function getReachableGrades(grade: GradeCode): GradeCode[] {
	// Check cache first
	const cached = reachableCache.get(grade);
	if (cached) {
		return cached;
	}

	const reachable = new Set<GradeCode>();
	const queue: GradeCode[] = [grade];

	// BFS through successors (traverse forward to higher grades)
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) continue;

		if (reachable.has(current)) continue;
		reachable.add(current);

		// Add all grades that have current as a prerequisite
		for (const candidateCode of GRADE_CODES) {
			const candidateInfo = GRADES[candidateCode];
			if (candidateInfo.prerequisites.includes(current) && !reachable.has(candidateCode)) {
				queue.push(candidateCode);
			}
		}
	}

	// Sort by schoolYear descending (higher grades first)
	const sorted = Array.from(reachable).sort((a, b) => {
		return GRADES[b].schoolYear - GRADES[a].schoolYear;
	});

	// Cache and return
	reachableCache.set(grade, sorted);
	return sorted;
}

/**
 * Format grade code for display (with French accents)
 */
export function formatGradeForDisplay(grade: GradeCode): string {
	return GRADES[grade]?.displayName ?? grade;
}

/**
 * Get short display name
 */
export function formatGradeShort(grade: GradeCode): string {
	return GRADES[grade]?.shortName ?? grade;
}

/**
 * Parse various input formats to canonical GradeCode
 * Handles: '6ème', '6eme', '6e', '6', 'sixième', etc.
 */
export function parseGradeCode(input: string): GradeCode | null {
	if (!input || typeof input !== 'string') {
		return null;
	}

	// Normalize input
	const normalized = input.trim().toLowerCase();

	// Direct match with canonical codes (case insensitive)
	const directMatch = GRADE_CODES.find((code) => code.toLowerCase() === normalized);
	if (directMatch) {
		return directMatch;
	}

	// Handle primary codes (already canonical)
	if (['cp', 'ce1', 'ce2', 'cm1', 'cm2'].includes(normalized)) {
		return normalized.toUpperCase() as GradeCode;
	}

	// Handle middle school variations
	const middleSchoolMap: Record<string, GradeCode> = {
		// Numeric only
		'6': '6',
		'5': '5',
		'4': '4',
		'3': '3',
		// With 'ème' or 'eme'
		'6ème': '6',
		'6eme': '6',
		'6e': '6',
		sixième: '6',
		sixieme: '6',
		'5ème': '5',
		'5eme': '5',
		'5e': '5',
		cinquième: '5',
		cinquieme: '5',
		'4ème': '4',
		'4eme': '4',
		'4e': '4',
		quatrième: '4',
		quatrieme: '4',
		'3ème': '3',
		'3eme': '3',
		'3e': '3',
		troisième: '3',
		troisieme: '3'
	};

	if (normalized in middleSchoolMap) {
		return middleSchoolMap[normalized];
	}

	// Handle high school variations
	const highSchoolMap: Record<string, GradeCode> = {
		// Seconde
		'2': '2',
		'2nde': '2',
		'2de': '2',
		seconde: '2',
		// 1ère variations
		'1_gen': '1_GEN',
		'1gen': '1_GEN',
		'1ère générale': '1_GEN',
		'1ere generale': '1_GEN',
		'1ère g': '1_GEN',
		'première générale': '1_GEN',
		'premiere generale': '1_GEN',
		'1_spe': '1_SPE',
		'1spe': '1_SPE',
		'1ère spé': '1_SPE',
		'1ere spe': '1_SPE',
		'1ère spécialité': '1_SPE',
		'1ere specialite': '1_SPE',
		'première spécialité maths': '1_SPE',
		'premiere specialite maths': '1_SPE',
		'1_stmg': '1_STMG',
		'1stmg': '1_STMG',
		'1ère stmg': '1_STMG',
		'1ere stmg': '1_STMG',
		'première stmg': '1_STMG',
		'premiere stmg': '1_STMG',
		// Terminale variations
		t_gen: 'T_GEN',
		tgen: 'T_GEN',
		'terminale générale': 'T_GEN',
		'terminale generale': 'T_GEN',
		'term g': 'T_GEN',
		'tle générale': 'T_GEN',
		'tle generale': 'T_GEN',
		t_spe: 'T_SPE',
		tspe: 'T_SPE',
		'terminale spé': 'T_SPE',
		'terminale spe': 'T_SPE',
		'terminale spécialité': 'T_SPE',
		'terminale specialite': 'T_SPE',
		'term spé': 'T_SPE',
		'term spe': 'T_SPE',
		t_exp: 'T_EXP',
		texp: 'T_EXP',
		'terminale expertes': 'T_EXP',
		'terminale maths expertes': 'T_EXP',
		'term exp': 'T_EXP',
		t_comp: 'T_COMP',
		tcomp: 'T_COMP',
		'terminale comp': 'T_COMP',
		'terminale complémentaires': 'T_COMP',
		'terminale complementaires': 'T_COMP',
		'terminale maths complémentaires': 'T_COMP',
		'terminale maths complementaires': 'T_COMP',
		'term comp': 'T_COMP',
		t_stmg: 'T_STMG',
		tstmg: 'T_STMG',
		'terminale stmg': 'T_STMG',
		'term stmg': 'T_STMG',
		'tle stmg': 'T_STMG'
	};

	if (normalized in highSchoolMap) {
		return highSchoolMap[normalized];
	}

	// No match found
	return null;
}

/**
 * Check if a grade code is valid
 */
export function isValidGradeCode(code: string): code is GradeCode {
	return GRADE_CODES.includes(code as GradeCode);
}

/**
 * Get grades filtered by school level
 */
export function getGradesByLevel(level: SchoolLevel): GradeCode[] {
	return GRADE_CODES.filter((code) => GRADES[code].level === level);
}

/**
 * Check if user grade has access to content grade
 */
export function hasAccessToGrade(userGrade: GradeCode, contentGrade: GradeCode): boolean {
	return getAccessibleGrades(userGrade).includes(contentGrade);
}

/**
 * Get grade items for UI selects (value/label pairs)
 */
export function getGradeSelectItems(): Array<{ value: GradeCode; label: string }> {
	return GRADE_CODES.map((code) => ({
		value: code,
		label: GRADES[code].displayName
	}));
}

/**
 * Get grade items filtered by school level
 */
export function getGradeSelectItemsByLevel(
	level: SchoolLevel
): Array<{ value: GradeCode; label: string }> {
	return getGradesByLevel(level).map((code) => ({
		value: code,
		label: GRADES[code].displayName
	}));
}

/**
 * Get grade items for a specific high school track
 */
export function getGradeSelectItemsByTrack(
	track: 'general' | 'spe_maths' | 'stmg'
): Array<{ value: GradeCode; label: string }> {
	const grades = GRADE_CODES.filter((code) => {
		const info = GRADES[code];
		return info.level === 'high' && (info.track === track || code === '2'); // Include 2nde for all tracks
	});

	return grades.map((code) => ({
		value: code,
		label: GRADES[code].displayName
	}));
}

/**
 * Get the next grade in the progression (if any)
 */
export function getNextGrade(grade: GradeCode): GradeCode | null {
	// Find grades that have this grade as a prerequisite
	for (const candidateCode of GRADE_CODES) {
		const candidateInfo = GRADES[candidateCode];
		if (candidateInfo.prerequisites.includes(grade)) {
			// For 2nde, we can't determine a single next grade (branches)
			if (grade === '2') {
				return null; // Multiple paths possible
			}
			return candidateCode;
		}
	}
	return null;
}

/**
 * Get the previous grade in the progression (if any)
 */
export function getPreviousGrade(grade: GradeCode): GradeCode | null {
	const info = GRADES[grade];
	if (info.prerequisites.length === 0) {
		return null; // No previous grade
	}
	// Return the first prerequisite (there's typically only one)
	return info.prerequisites[0];
}

/**
 * Get grades grouped by school level for hierarchical display
 */
export function getGradesGroupedByLevel(): Record<
	SchoolLevel,
	Array<{ value: GradeCode; label: string }>
> {
	return {
		primary: getGradeSelectItemsByLevel('primary'),
		middle: getGradeSelectItemsByLevel('middle'),
		high: getGradeSelectItemsByLevel('high')
	};
}

/**
 * Compare two grades by school year
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
export function compareGrades(a: GradeCode, b: GradeCode): number {
	return GRADES[a].schoolYear - GRADES[b].schoolYear;
}

/**
 * Get the range of grades between two grades (inclusive)
 */
export function getGradeRange(from: GradeCode, to: GradeCode): GradeCode[] {
	const fromYear = GRADES[from].schoolYear;
	const toYear = GRADES[to].schoolYear;
	const minYear = Math.min(fromYear, toYear);
	const maxYear = Math.max(fromYear, toYear);

	return GRADE_CODES.filter((code) => {
		const year = GRADES[code].schoolYear;
		return year >= minYear && year <= maxYear;
	});
}

/**
 * Clear the hierarchy caches (useful for testing)
 */
export function clearGradeCache(): void {
	accessibleCache.clear();
	reachableCache.clear();
}
