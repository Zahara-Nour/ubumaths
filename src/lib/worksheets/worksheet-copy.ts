/**
 * La copie d'une fiche, exercice par exercice (ADR 0023)
 * =====================================================
 *
 * Le pont entre les lignes lues en base (affectation, `worksheet_exercises` et
 * leur exercice) et le cœur `student-copy.ts`. Tous les chemins qui montrent
 * une copie passent ici : écran et PDF de l'élève, aperçu d'affectation,
 * corrigé du prof, aperçu et lot ZIP de la page de la fiche. Une même
 * affectation, un même élève : la même copie partout.
 *
 * @module worksheets/worksheet-copy
 */

import type { ContentLocale } from '$lib/types/locale';
import type { Exercise, ExerciseVariation, SharedExerciseDefaults } from '$lib/exercises/types';
import { exerciseCapitalPairs } from '$lib/questions/capital-pairs';
import {
	localizedText,
	type InstanceData,
	type InstanceSection,
	type WorksheetWithRelations
} from '$lib/types/worksheets';
import {
	copySeed,
	resolveCopyExercise,
	isGuidanceLevel,
	DEFAULT_GUIDANCE_LEVEL,
	GUIDANCE_LEVELS,
	type CopyExercise,
	type GuidanceLevel
} from './student-copy';

// ============================================================================
// TYPES
// ============================================================================

/** Ce qu'il faut savoir pour calculer une copie, hors exercice */
export interface CopyScope {
	/** `null` : copie hors affectation (page de la fiche, cahier public) */
	assignmentId: string | null;
	worksheetId: string;
	level: GuidanceLevel;
	/** Case « exercices individualisés » de l'affectation */
	individualized: boolean;
	/** Absent : la copie « de la classe » (aperçu ou corrigé du prof) */
	studentId?: string | null;
	locale?: ContentLocale;
}

/** Les colonnes de l'affectation dont dépend la copie */
export interface AssignmentCopyColumns {
	id: string;
	worksheet_id: string;
	guidance_level: string | null;
	individualized: boolean | null;
}

/** Le contenu d'un exercice tel que les routes le lisent en base */
export interface ExerciseContentRow {
	id: string;
	title?: string | null;
	shared?: SharedExerciseDefaults | null;
	variations?: ExerciseVariation[] | null;
	/** Thème : décide du sens de `AB` (longueur ou produit, Q-J) */
	topic?: string | null;
}

/** Un exercice de la fiche (`worksheet_exercises`) et son contenu */
export interface WorksheetExerciseCopyRow {
	/** `worksheet_exercises.id` : il entre dans la graine */
	id: string;
	/** Version imposée par la fiche : prime sur le niveau */
	variation_index: number | null;
	exercise: ExerciseContentRow;
}

/**
 * Une fiche et ses exercices, sous l'un ou l'autre nom : `exercises` (fiche
 * composée par l'API) ou `worksheet_exercises` (jointure PostgREST brute).
 */
export type WorksheetForCopy = WorksheetWithRelations & {
	worksheet_exercises?: WorksheetWithRelations['exercises'];
	worksheet_sections?: WorksheetWithRelations['sections'];
};

// ============================================================================
// CONSTANTS
// ============================================================================

/** Libellés des niveaux de guidage, pour le prof (formulaire, aperçu) */
export const GUIDANCE_LEVEL_LABELS: Record<GuidanceLevel, string> = {
	guided: 'Guidé',
	intermediate: 'Intermédiaire',
	autonomous: 'Autonome'
};

/** Options d'un `MySelect` de niveau, du plus guidé au moins guidé */
export const GUIDANCE_LEVEL_ITEMS: { value: GuidanceLevel; label: string }[] = GUIDANCE_LEVELS.map(
	(level) => ({ value: level, label: GUIDANCE_LEVEL_LABELS[level] })
);

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Le niveau de guidage lu en base. Valeur inconnue ou absente : guidé (le
 * niveau par défaut, jamais moins d'aide que prévu).
 */
export function readGuidanceLevel(value: unknown): GuidanceLevel {
	return isGuidanceLevel(value) ? value : DEFAULT_GUIDANCE_LEVEL;
}

/**
 * La portée d'une copie d'affectation. `individualized` absent (`NULL`) :
 * vrai, comme le défaut de la colonne et du formulaire.
 */
export function assignmentCopyScope(
	assignment: AssignmentCopyColumns,
	options: { studentId?: string | null; locale?: ContentLocale } = {}
): CopyScope {
	return {
		assignmentId: assignment.id,
		worksheetId: assignment.worksheet_id,
		level: readGuidanceLevel(assignment.guidance_level),
		individualized: assignment.individualized ?? true,
		studentId: options.studentId ?? null,
		locale: options.locale
	};
}

/** Le gabarit `Exercise` que le générateur attend, depuis une ligne lue en base */
export function toExerciseTemplate(row: ExerciseContentRow): Exercise {
	return {
		id: row.id,
		title: row.title ?? undefined,
		shared: row.shared ?? undefined,
		variations: row.variations ?? undefined,
		distribution_mode: 'on_demand',
		category: 'application',
		tags: [],
		// Champs d'audit : inutiles au générateur, exigés par le type
		created_at: '',
		updated_at: '',
		created_by: 'system'
	};
}

/** L'exercice tire-t-il des valeurs (variables partagées ou d'une version) ? */
export function hasDrawnValues(row: ExerciseContentRow): boolean {
	if ((row.shared?.variables?.length ?? 0) > 0) return true;
	return (row.variations ?? []).some((variation) => (variation.variables?.length ?? 0) > 0);
}

/** Un exercice de la copie : version d'après le niveau, valeurs d'après la graine */
export function resolveWorksheetExerciseCopy(
	row: WorksheetExerciseCopyRow,
	scope: CopyScope
): CopyExercise {
	return resolveCopyExercise(toExerciseTemplate(row.exercise), {
		level: scope.level,
		seed: worksheetExerciseSeed(row.id, scope),
		locale: scope.locale,
		forcedVariationIndex: row.variation_index
	});
}

/** La graine des valeurs d'un exercice de la copie (`worksheet_exercises.id`) */
export function worksheetExerciseSeed(worksheetExerciseId: string, scope: CopyScope): number {
	return copySeed({
		assignmentId: scope.assignmentId,
		worksheetId: scope.worksheetId,
		worksheetExerciseId,
		studentId: scope.studentId,
		individualized: scope.individualized
	});
}

/** Les exercices de la fiche, dans l'ordre */
function sortedWorksheetExercises(worksheet: WorksheetForCopy) {
	const exercises = worksheet.exercises ?? worksheet.worksheet_exercises ?? [];
	return [...exercises].sort((a, b) => a.position - b.position);
}

/**
 * La copie entière d'une fiche, prête pour le PDF (`generateWorksheetTypst`) :
 * chaque exercice par `resolveWorksheetExerciseCopy`, avec son titre, ses
 * points, sa section et la consigne du prof, et les sections de la fiche.
 */
export function buildWorksheetCopy(worksheet: WorksheetForCopy, scope: CopyScope): InstanceData {
	const locale = scope.locale ?? 'fr';

	const exercises = sortedWorksheetExercises(worksheet).map((we) => {
		const copy = we.exercise
			? resolveWorksheetExerciseCopy(
					{ id: we.id, variation_index: we.variation_index ?? null, exercise: we.exercise },
					scope
				)
			: { statement: '', solution: '', hints: undefined, variationIndex: 0 };
		return {
			exercise_id: we.exercise_id,
			title: we.exercise?.title ?? null,
			position: we.position,
			points: we.points,
			section_id: we.section_id ?? null,
			custom_instructions: localizedText(
				we.custom_instructions,
				we.translations,
				'custom_instructions',
				locale
			),
			parameters: {},
			statement: copy.statement,
			solution: copy.solution,
			hints: copy.hints,
			selectedVariationIndex: copy.variationIndex,
			// Fonctions déclarées : sans elles, `C'(x)` s'imprime en erreur dans le PDF.
			generic_functions: we.exercise?.generic_functions,
			// Sens de `AB` (longueur ou produit) : le thème de l'exercice décide (Q-J)
			capital_pairs: exerciseCapitalPairs(we.exercise?.topic)
		};
	});

	// Les sections, pour que le PDF groupe les exercices comme la fiche
	const sections: InstanceSection[] = (worksheet.sections ?? worksheet.worksheet_sections ?? [])
		.slice()
		.sort((a, b) => a.position - b.position)
		.map((section) => ({
			id: section.id,
			title: localizedText(section.title, section.translations, 'title', locale) ?? section.title,
			instructions: localizedText(
				section.instructions,
				section.translations,
				'instructions',
				locale
			),
			position: section.position
		}));

	return { exercises, sections: sections.length > 0 ? sections : undefined };
}

/**
 * Les valeurs tirées changent-elles d'un élève à l'autre ? Oui si
 * l'affectation est individualisée ET qu'un exercice tire des valeurs : un
 * corrigé « de la classe » ne vaut alors pour personne en particulier.
 */
export function hasPerStudentValues(worksheet: WorksheetForCopy, scope: CopyScope): boolean {
	if (!scope.individualized || !scope.assignmentId) return false;
	return sortedWorksheetExercises(worksheet).some(
		// `!= null` : la jointure PostgREST rend `null` pour un exercice orphelin
		(we) => we.exercise != null && hasDrawnValues(we.exercise)
	);
}
