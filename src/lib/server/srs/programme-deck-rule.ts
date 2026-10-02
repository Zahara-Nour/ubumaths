/**
 * Paquet « Programme » : quels modèles peuvent y entrer ? (Q113)
 * ==============================================================
 *
 * Règle UNIQUE, partagée par les trois endroits qui alimentent le paquet :
 * `/api/skill-attempts`, `recordSeriesReviews` (séries, évaluations) et
 * `/api/srs/review/submit`.
 *
 * - Le modèle doit être lu (ligne présente) et publié : un brouillon y serait une
 *   carte fantôme, la révision le relit avec les droits de l'élève.
 * - Une question de cours (`options.courseQuestion`, ou carte de cours) n'y
 *   entre jamais : elle se révise dans le paquet de son chapitre (Q112).
 *
 * Module séparé de `programme-deck.ts` : les tests des routes simulent ce
 * dernier, la règle doit rester la vraie.
 */

import { isCourseQuestion } from '$lib/questions/types';

// Types
/** Ce que la règle lit d'un modèle (`question_templates`). */
export interface ProgrammeDeckCandidate {
	options?: unknown;
	status?: string | null;
}

// Functions
/** Le modèle peut-il être ajouté au paquet Programme de l'élève ? */
export function entersProgrammeDeck(template: ProgrammeDeckCandidate | null | undefined): boolean {
	if (!template) return false;
	if (template.status !== 'published') return false;
	return !isCourseQuestion(template);
}
