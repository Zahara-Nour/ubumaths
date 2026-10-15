/**
 * Le type de fiche décide de l'en-tête du PDF (ADR 0030)
 * =====================================================
 *
 * Une seule règle, lue par le PDF du prof (`worksheet-generator.ts`, depuis la
 * config de la fiche) et par celui de l'élève (depuis sa vue, qui porte les
 * mêmes options) : jamais recopiée ailleurs.
 *
 * | Le PDF imprime     | Fiche d'exercices | Évaluation écrite | Devoir maison | Examen blanc |
 * | ------------------ | ----------------- | ----------------- | ------------- | ------------ |
 * | Titre              | ✓                 | ✓                 | ✓             | ✓            |
 * | Nom                | option            | ✓                 | ✓             | ✓            |
 * | Classe             |                   | ✓                 | ✓             | ✓            |
 * | Date               |                   | à remplir         | date de rendu | à remplir    |
 * | Points et total    |                   | option            |               | toujours     |
 * | Calculatrice       |                   | option            |               | option       |
 * | Durée              |                   |                   |               | ✓            |
 * | Réponses sur sujet |                   | option            |               | option       |
 *
 * Nom sur la fiche d'exercices : option (amendement de David, 2026-10-15),
 * pour les groupes de niveaux — donner la bonne fiche à la bonne personne.
 *
 * Une option d'un autre type (reste d'un changement de type) est ignorée.
 *
 * @module worksheets/worksheet-header
 */

import {
	WORKSHEET_TYPES,
	type CalculatorRule,
	type WorksheetConfig,
	type WorksheetType
} from '$lib/types/worksheets';

/** Les options qu'un type propose, dans `worksheets.config` */
export type TypeOptionKey =
	'show_student_name' | 'show_points' | 'calculator' | 'answers_on_sheet' | 'due_date';

/** Ce que l'interface propose pour chaque type ; le titre, toujours imprimé, n'en est pas une */
export const TYPE_OPTION_KEYS: Record<WorksheetType, readonly TypeOptionKey[]> = {
	worksheet: ['show_student_name'],
	assessment: ['show_points', 'calculator', 'answers_on_sheet'],
	homework: ['due_date'],
	exam: ['calculator', 'answers_on_sheet']
};

/** Les options du type, telles que la config (prof) ou la vue (élève) les porte */
export type TypeOptions = Pick<
	WorksheetConfig,
	'show_student_name' | 'show_points' | 'calculator' | 'answers_on_sheet' | 'due_date'
>;

/** Ce que l'en-tête imprime, en plus du titre (toujours imprimé) */
export interface WorksheetHeader {
	/** Ligne « Nom » */
	studentName: boolean;
	/** Ligne « Classe » */
	className: boolean;
	/** Ligne « Date » à remplir par l'élève */
	dateLine: boolean;
	/** « À rendre pour le » : la date de rendu, ou une ligne si elle manque */
	dueDate: boolean;
	/** Points par exercice et total */
	points: boolean;
	/** Calculatrice autorisée ou interdite ; `null` : rien d'imprimé */
	calculator: CalculatorRule | null;
	/** Durée de l'épreuve (si la fiche en a une) */
	duration: boolean;
	/** L'élève répond sur le sujet : cadres de réponse */
	answersOnSheet: boolean;
}

export function worksheetHeader(rawType: WorksheetType, options: TypeOptions): WorksheetHeader {
	// Type inconnu ou absent (ligne abîmée) : une fiche d'exercices, qui doit
	// quand même s'imprimer
	const type: WorksheetType = WORKSHEET_TYPES.find((known) => known === rawType) ?? 'worksheet';
	const offers = (key: TypeOptionKey) => TYPE_OPTION_KEYS[type].includes(key);
	const identity = type !== 'worksheet';
	return {
		studentName: identity || (offers('show_student_name') && options.show_student_name === true),
		className: identity,
		dateLine: type === 'assessment' || type === 'exam',
		dueDate: type === 'homework',
		// L'examen blanc imprime toujours ses points (comme au bac)
		points: type === 'exam' || (offers('show_points') && options.show_points === true),
		calculator: offers('calculator') ? (options.calculator ?? null) : null,
		duration: type === 'exam',
		answersOnSheet: offers('answers_on_sheet') && options.answers_on_sheet === true
	};
}

/**
 * Les options du type seulement, plus « mélanger les exercices » : ce que la
 * création d'une fiche enregistre (une option d'un autre type, cochée avant de
 * changer de type, ne part pas).
 */
export function configForType(type: WorksheetType, config: WorksheetConfig): WorksheetConfig {
	const result: WorksheetConfig = { shuffle_exercises: config.shuffle_exercises === true };
	for (const key of TYPE_OPTION_KEYS[type] ?? []) {
		if (key === 'calculator') {
			if (config.calculator) result.calculator = config.calculator;
		} else if (key === 'due_date') {
			if (config.due_date) result.due_date = config.due_date;
		} else if (config[key] !== undefined) {
			result[key] = config[key];
		}
	}
	return result;
}
