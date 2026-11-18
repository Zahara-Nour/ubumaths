/**
 * La Descente de la Vistule — modèles jouables en combat
 * ======================================================
 *
 * En combat, seulement des questions courtes : un QCM ou une seule case (phase 0
 * de la v1, question 5), avec une exclusion manuelle possible. Une Bête ne naît
 * que d'un point qui a au moins un modèle publié jouable (phase 0 de l'étape 2).
 *
 * C'est un FILTRE PRÉALABLE, lu sur la première variation du modèle seulement
 * (lire toutes les variations de tous les modèles d'un parcours à chaque
 * apparition coûterait plusieurs mégaoctets) : environ 7 % des modèles à une case
 * ont une autre variation qui en compte plus. Le combat (étape 3) vérifie à
 * nouveau la question tirée (`isCombatInstance`) et en tire une autre si elle
 * n'est pas courte.
 *
 * Règle prudente : un bloc du sujet n'est admis que s'il est un QCM (`choix`) ou
 * un affichage sans geste de réponse ; tout autre bloc (gestes de réponse comme
 * `ranger`, `figure-a-completer`, ou bloc encore inconnu ici) écarte le modèle.
 */

import { isCourseCard } from '#lib/questions/course-card.ts';
import type { QuestionInstance } from '#lib/questions/types.ts';

/** Blocs admis dans un sujet de combat : le QCM, et des affichages sans geste. */
const ALLOWED_FENCES: ReadonlySet<string> = new Set([
	'choix',
	'courbe',
	'figure',
	'python',
	'solide'
]);

/**
 * Exclusion manuelle : identifiants de modèles publiés qui ne conviennent pas au
 * combat (trop longs à lire, malgré une seule case). Vide au départ.
 */
export const COMBAT_EXCLUDED_TEMPLATE_IDS: ReadonlySet<string> = new Set<string>();

/** Première variation d'un modèle, telle que lue par `variations->0->…`. */
export interface FirstVariation {
	id: string;
	blanks: unknown;
	statement: unknown;
}

/** Noms des blocs ouverts par ``` dans un sujet (`choix`, `figure`…). */
function fencesOf(statement: string): string[] {
	const names: string[] = [];
	for (const match of statement.matchAll(/^\s*```+\s*([a-zA-Z][\w-]*)/gm)) {
		names.push(match[1].toLowerCase());
	}
	return names;
}

/** Le modèle est-il jouable en combat (filtre préalable) ? */
export function isCombatTemplate(template: FirstVariation): boolean {
	if (COMBAT_EXCLUDED_TEMPLATE_IDS.has(template.id)) return false;
	if (typeof template.statement !== 'string') return false;

	const blankCount = Array.isArray(template.blanks) ? template.blanks.length : 0;
	const fences = fencesOf(template.statement);
	if (fences.some((name) => !ALLOWED_FENCES.has(name))) return false;

	// QCM : le choix se fait dans le bloc, au plus une case
	if (fences.includes('choix')) return blankCount <= 1;
	// Une seule case
	return blankCount === 1;
}

/**
 * La question tirée est-elle courte (étape 3) ? Une seule case, tapée ou un QCM,
 * sans geste à faire (point à placer, étiquettes à ranger, figure, cellule de
 * tableau, opération posée), ni carte de cours. Les blocs restés dans le sujet
 * suivent la même règle prudente que le filtre préalable.
 */
export function isCombatInstance(instance: QuestionInstance): boolean {
	if (COMBAT_EXCLUDED_TEMPLATE_IDS.has(instance.templateId)) return false;
	if (isCourseCard(instance)) return false;
	if (typeof instance.statement !== 'string') return false;
	if (fencesOf(instance.statement).some((name) => !ALLOWED_FENCES.has(name))) return false;

	const blanks = instance.blanks ?? [];
	if (blanks.length !== 1) return false;
	const [blank] = blanks;
	if (blank.type === 'graphical') return false;
	return (
		blank.construire === undefined &&
		blank.cellule === undefined &&
		blank.operation === undefined &&
		blank.construction === undefined
	);
}
