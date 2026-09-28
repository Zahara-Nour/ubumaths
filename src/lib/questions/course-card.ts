/**
 * Cartes de cours (#617)
 * ======================
 *
 * Une carte de cours est une question sans case ni choix : recto = énoncé,
 * verso = correction. L'élève retourne la carte puis s'auto-évalue.
 *
 * - marqueur explicite `options.courseCard === true` (cf. `isCourseCard`) ;
 * - exclue des tests et évaluations notés (`excludeCourseCards`) ;
 * - pas de spec de test : la vérification se limite à la génération et à un
 *   recto / verso non vides.
 *
 * @module questions/course-card
 */

import { isCourseCard } from './types';
import type { QuestionCorrection, QuestionInstance, ResolvedCorrection } from './types';

export { isCourseCard };

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Retire les cartes de cours d'une liste de modèles (tests et évaluations notés). */
export function excludeCourseCards<T extends { options?: unknown }>(templates: T[]): T[] {
	return templates.filter((template) => !isCourseCard(template));
}

/**
 * Le verso d'une carte : les étapes de correction, puis le feedback « juste »
 * s'il existe. Rend la chaîne vide si rien n'est écrit.
 */
export function correctionText(
	correction: QuestionCorrection | ResolvedCorrection | null | undefined
): string {
	if (!correction) return '';
	const parts: string[] = [];
	for (const step of correction.steps ?? []) {
		if (String(step).trim().length > 0) parts.push(String(step));
	}
	const correct = correction.feedback?.correct;
	if (correct && String(correct).trim().length > 0) parts.push(String(correct));
	return parts.join('\n\n');
}

/** Recto d'une instance de carte : l'énoncé résolu. */
export function courseCardFront(instance: Pick<QuestionInstance, 'statement'>): string {
	return String(instance.statement ?? '');
}

/** Verso d'une instance de carte : la correction résolue. */
export function courseCardBack(instance: Pick<QuestionInstance, 'correction'>): string {
	return correctionText(instance.correction);
}
