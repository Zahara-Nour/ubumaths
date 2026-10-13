/**
 * La copie d'un élève (ADR 0023)
 * ==============================
 *
 * Une fiche affectée donne à chaque élève une copie : pour chaque exercice, une
 * VERSION (son niveau de guidage) et, s'il a des variables, des VALEURS tirées.
 * Tous les chemins (écran et PDF de l'élève, aperçu d'affectation, aperçu et
 * lot ZIP du prof, corrigé du prof) passent par ces deux fonctions : une même
 * affectation montre la même copie partout.
 *
 * - Version : choisie par le niveau de guidage de l'affectation, JAMAIS tirée
 *   au hasard. Niveau absent de l'exercice : le plus proche du côté le plus
 *   guidé (un élève ne reçoit jamais moins d'aide que demandé).
 * - Valeurs : graine de l'affectation (de la fiche hors affectation), de
 *   l'élève si l'affectation est individualisée, et de l'exercice de la fiche
 *   (son identifiant, pas sa position : réordonner la fiche ne change rien).
 * - Ordre (option « mélanger les exercices » de la fiche) : même portée que
 *   les valeurs, graine dédiée par section (`copyOrderSeed`).
 *
 * @module worksheets/student-copy
 */

import type { ContentLocale } from '$lib/types/locale';
import type { Exercise, ExerciseHint, GuidanceLabel } from '$lib/exercises/types';
import { getExerciseContentSafe } from '$lib/exercises/types';
import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Niveau de guidage d'une affectation (`worksheet_assignments.guidance_level`) :
 * les étiquettes des versions d'un exercice (`GuidanceLabel`).
 */
export type GuidanceLevel = GuidanceLabel;

export interface CopyExerciseOptions {
	level: GuidanceLevel;
	seed: number;
	locale?: ContentLocale;
	/** Version imposée par la fiche (`worksheet_exercises.variation_index`) : prime sur le niveau */
	forcedVariationIndex?: number | null;
}

/** Un exercice de la copie : la version donnée, ses valeurs tirées */
export interface CopyExercise {
	statement: string;
	solution: string;
	/** Réponses seules (PDF « Réponses ») ; chaîne vide si l'exercice n'en a pas */
	answers: string;
	hints?: ExerciseHint[];
	variationIndex: number;
}

export interface CopySeedParts {
	/** Absent : copie hors affectation (page de la fiche, cahier public) */
	assignmentId?: string | null;
	worksheetId: string;
	/** `worksheet_exercises.id` */
	worksheetExerciseId: string;
	studentId?: string | null;
	/** Case « exercices individualisés » de l'affectation */
	individualized: boolean;
}

/** La portée de la copie et la section dont on tire l'ordre */
export interface CopyOrderSeedParts extends Omit<CopySeedParts, 'worksheetExerciseId'> {
	/** `null` : les exercices hors section */
	sectionId: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Du plus guidé au moins guidé */
export const GUIDANCE_LEVELS: readonly GuidanceLevel[] = ['guided', 'intermediate', 'autonomous'];

export const DEFAULT_GUIDANCE_LEVEL: GuidanceLevel = 'guided';

// ============================================================================
// FUNCTIONS
// ============================================================================

export function isGuidanceLevel(value: unknown): value is GuidanceLevel {
	return GUIDANCE_LEVELS.includes(value as GuidanceLevel);
}

/**
 * Index de la version d'un exercice pour le niveau demandé, d'après les
 * étiquettes de ses versions (`variations[].label`). Une seule version, ou
 * aucune étiquette de niveau : la première.
 */
export function guidanceVariationIndex(
	labels: readonly (string | null | undefined)[],
	level: GuidanceLevel
): number {
	if (labels.length <= 1) return 0;
	const indexOf = (rank: number) => labels.indexOf(GUIDANCE_LEVELS[rank]);
	const wanted = GUIDANCE_LEVELS.indexOf(level);
	// Le niveau demandé, puis de plus en plus guidé, puis de moins en moins guidé
	for (let rank = wanted; rank >= 0; rank--) {
		if (indexOf(rank) !== -1) return indexOf(rank);
	}
	for (let rank = wanted + 1; rank < GUIDANCE_LEVELS.length; rank++) {
		if (indexOf(rank) !== -1) return indexOf(rank);
	}
	return 0;
}

/**
 * Empreinte (FNV-1a) d'une chaîne, bornée à 31 bits : entier positif qui tient
 * dans un `integer` Postgres (`worksheet_error_reports.seed`).
 */
function hash31(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0) & 0x7fffffff;
}

/**
 * La portée d'une copie, en texte : l'affectation (la fiche hors affectation),
 * et l'élève si l'affectation est individualisée.
 */
function copyScopeKey(parts: Omit<CopySeedParts, 'worksheetExerciseId'>): string {
	const scope = parts.assignmentId
		? `affectation:${parts.assignmentId}`
		: `fiche:${parts.worksheetId}`;
	const student = parts.individualized && parts.studentId ? `:eleve:${parts.studentId}` : '';
	return `${scope}${student}`;
}

/** Graine des valeurs tirées d'un exercice de la copie */
export function copySeed(parts: CopySeedParts): number {
	return hash31(`${copyScopeKey(parts)}:exercice:${parts.worksheetExerciseId}`);
}

/**
 * Graine de l'ordre des exercices d'une section de la copie (option
 * « mélanger les exercices »). Même portée que les valeurs, mais une graine
 * DÉDIÉE (`:ordre:` au lieu de `:exercice:`) : l'ordre et les valeurs ne se
 * corrèlent pas, et mélanger ne change aucune valeur. Une graine par section
 * (`null` : les exercices hors section) : ajouter un exercice à une section
 * ne rebat pas les autres.
 */
export function copyOrderSeed(parts: CopyOrderSeedParts): number {
	return hash31(`${copyScopeKey(parts)}:ordre:${parts.sectionId ?? 'hors-section'}`);
}

/**
 * Un exercice de la copie : la version d'après le niveau (ou celle qu'impose
 * la fiche), ses variables tirées avec la graine. Génération en échec : le
 * texte brut de LA MÊME version, jamais une autre.
 */
export function resolveCopyExercise(
	exercise: Exercise,
	options: CopyExerciseOptions
): CopyExercise {
	const labels = (exercise.variations ?? []).map((variation) => variation.label);
	const variationIndex =
		options.forcedVariationIndex ?? guidanceVariationIndex(labels, options.level);
	const result = generateExerciseInstance(exercise, {
		seed: options.seed,
		parseAST: false,
		variationIndex,
		locale: options.locale
	});
	if (result.success && result.instance) {
		return {
			statement: result.instance.statement_md,
			solution: result.instance.solution_md ?? '',
			answers: result.instance.answers_md ?? '',
			hints: result.instance.resolvedHints,
			variationIndex
		};
	}
	const content = getExerciseContentSafe(exercise, variationIndex, options.locale ?? 'fr');
	return {
		statement: content.statement_md,
		solution: content.solution_md,
		answers: content.answers_md,
		hints: content.hints,
		variationIndex
	};
}
