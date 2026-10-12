/**
 * Guides calculatrices : les niveaux, leur adresse et leur filiation.
 *
 * Décisions de David (2026-10-12) : guides à partir de la 6e ; CP-CE2 sans guide (le BO
 * du cycle 2 exclut la calculatrice) ; CM reporté ; niveaux en noms lisibles dans
 * l'adresse.
 */

import type { GradeCode } from '$lib/types/grades';

// ===== Types =====

/** Les niveaux qui ont un guide */
export type GuideGrade = Exclude<GradeCode, 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | 'T_GEN'>;

/** Les niveaux sans guide, et pourquoi (phase 0, point 11) */
export type GradeWithoutGuide = Exclude<GradeCode, GuideGrade>;

// ===== Constantes =====

/** Ordre d'affichage des niveaux */
export const GUIDE_GRADES = [
	'6',
	'5',
	'4',
	'3',
	'2',
	'1_GEN',
	'1_SPE',
	'1_TECHNO',
	'T_SPE',
	'T_EXP',
	'T_COMP',
	'T_TECHNO'
] as const satisfies readonly GuideGrade[];

/** Segment d'adresse de chaque niveau : /calculatrices/<modele>/<niveau> */
export const GRADE_SLUGS: Readonly<Record<GradeCode, string>> = {
	CP: 'cp',
	CE1: 'ce1',
	CE2: 'ce2',
	CM1: 'cm1',
	CM2: 'cm2',
	'6': '6e',
	'5': '5e',
	'4': '4e',
	'3': '3e',
	'2': 'seconde',
	'1_GEN': 'premiere-enseignement-scientifique',
	T_GEN: 'terminale-generale',
	'1_SPE': 'premiere-specialite',
	T_SPE: 'terminale-specialite',
	T_EXP: 'maths-expertes',
	T_COMP: 'maths-complementaires',
	'1_TECHNO': 'premiere-techno',
	T_TECHNO: 'terminale-techno'
};

/** Libellé du niveau dans les guides */
export const GRADE_LABELS: Readonly<Record<GradeCode, string>> = {
	CP: 'CP',
	CE1: 'CE1',
	CE2: 'CE2',
	CM1: 'CM1',
	CM2: 'CM2',
	'6': '6e',
	'5': '5e',
	'4': '4e',
	'3': '3e',
	'2': 'Seconde',
	'1_GEN': 'Première (enseignement scientifique)',
	T_GEN: 'Terminale générale',
	'1_SPE': 'Première spécialité',
	T_SPE: 'Terminale spécialité',
	T_EXP: 'Maths expertes',
	T_COMP: 'Maths complémentaires',
	'1_TECHNO': 'Première technologique',
	T_TECHNO: 'Terminale technologique'
};

/** Pourquoi un niveau n'a pas de guide */
export const NO_GUIDE_REASONS: Readonly<Record<GradeWithoutGuide, string>> = {
	CP: 'La calculatrice n’est pas utilisée au cycle 2, sauf pour des élèves à besoins particuliers (programme du cycle 2).',
	CE1: 'La calculatrice n’est pas utilisée au cycle 2, sauf pour des élèves à besoins particuliers (programme du cycle 2).',
	CE2: 'La calculatrice n’est pas utilisée au cycle 2, sauf pour des élèves à besoins particuliers (programme du cycle 2).',
	CM1: 'Au cours moyen, les élèves n’ont pas de calculatrice personnelle : le guide du CM n’est pas encore écrit.',
	CM2: 'Au cours moyen, les élèves n’ont pas de calculatrice personnelle : le guide du CM n’est pas encore écrit.',
	T_GEN: 'Il n’y a pas de mathématiques dans le tronc commun de terminale générale.'
};

/**
 * Le niveau précédent de chaque niveau à guide : copie de la table `grade_predecessors`
 * (migration 20261007230000_schema_cible_points.sql), arrêtée à la 6e puisque le CM
 * n'a pas de guide. Seul écart : les maths expertes se suivent EN MÊME TEMPS que la
 * Tle spécialité (en base : T_EXP ← 1_SPE) ; on les rattache à la Tle spécialité, qui
 * mène à la 1re : les rappels vont ainsi du plus proche au plus lointain.
 */
const PREVIOUS_GRADES: Readonly<Record<GuideGrade, readonly GuideGrade[]>> = {
	'6': [],
	'5': ['6'],
	'4': ['5'],
	'3': ['4'],
	'2': ['3'],
	'1_GEN': ['2'],
	'1_SPE': ['2'],
	'1_TECHNO': ['2'],
	T_SPE: ['1_SPE'],
	T_EXP: ['T_SPE'],
	T_COMP: ['1_SPE'],
	T_TECHNO: ['1_TECHNO']
};

// ===== Fonctions =====

export function isGuideGrade(grade: GradeCode): grade is GuideGrade {
	return (GUIDE_GRADES as readonly GradeCode[]).includes(grade);
}

/** Le niveau dont l'adresse est `slug`, ou `undefined` */
export function gradeFromSlug(slug: string): GradeCode | undefined {
	const entry = Object.entries(GRADE_SLUGS).find(([, value]) => value === slug);
	return entry?.[0] as GradeCode | undefined;
}

/** Tous les niveaux dont `grade` hérite, du plus proche au plus lointain, sans doublon */
export function ancestorsOf(grade: GuideGrade): GuideGrade[] {
	const result: GuideGrade[] = [];
	const queue = [...PREVIOUS_GRADES[grade]];
	while (queue.length > 0) {
		const next = queue.shift() as GuideGrade;
		if (result.includes(next)) continue;
		result.push(next);
		queue.push(...PREVIOUS_GRADES[next]);
	}
	return result;
}
