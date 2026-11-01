/**
 * Cases notées d'une question
 * ===========================
 *
 * Une figure de travail (bloc ```figure-de-travail) occupe une case — son tracé
 * est gardé dans la réponse, enregistré en évaluation — mais n'est JAMAIS notée.
 * Ce module la retire, avec sa valeur, avant toute notation : la notation du
 * serveur (`grading.ts`) et celle de l'élève (`answer-validator.ts`) l'appellent
 * EN PREMIER, et aucune autre règle (cases vides, appariement libre, « figure
 * vide → 0 », « Tu n'as pas tout complété ») ne voit la figure de travail
 * (décision de David, 2026-10-26, `docs/archive/wip/figure-et-choix-progress.md` § 2.9).
 *
 * @module questions/graded-part
 */
import type { InstanceBlank, QuestionInstance } from './types';

// Types
export interface GradedPart {
	/** L'instance sans ses figures de travail (la même si elle n'en a pas) */
	instance: QuestionInstance;
	values: string[];
	latex: string[] | undefined;
	/** Rang, dans l'instance d'origine, de chaque case notée */
	gradedIndexes: number[];
	/**
	 * Une liste « par case notée » (statuts, messages…) remise à la taille de
	 * l'instance d'origine : chaque entrée à sa case, `fill` aux figures de travail
	 */
	spread: <T>(graded: readonly T[], fill: T) => T[];
}

// Functions
/** Case d'une figure de travail : jamais notée */
export function isWorkFigureBlank(blank: InstanceBlank | undefined): boolean {
	return blank?.construction?.work === true;
}

/**
 * Les cases notées et leurs valeurs. Nombre de valeurs différent du nombre de
 * cases (réponse fabriquée ou périmée) : rien n'est retiré, l'appelant refuse.
 */
export function gradedPart(
	instance: QuestionInstance,
	values: string[],
	latex?: string[]
): GradedPart {
	const blanks = instance.blanks ?? [];
	const all = blanks.map((_, index) => index);
	if (!blanks.some(isWorkFigureBlank) || values.length !== blanks.length) {
		return { instance, values, latex, gradedIndexes: all, spread: (graded) => [...graded] };
	}
	const gradedIndexes = all.filter((index) => !isWorkFigureBlank(blanks[index]));
	return {
		instance: { ...instance, blanks: gradedIndexes.map((index) => blanks[index]) },
		values: gradedIndexes.map((index) => values[index]),
		latex: latex && gradedIndexes.map((index) => latex[index] ?? ''),
		gradedIndexes,
		spread: <T>(graded: readonly T[], fill: T): T[] => {
			const full = blanks.map((): T => fill);
			gradedIndexes.forEach((index, rank) => {
				if (rank < graded.length) full[index] = graded[rank];
			});
			return full;
		}
	};
}
