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

// ============================================================================
// TYPES
// ============================================================================

/** Contenu du verso : texte (mode A / feedback) et/ou étapes générées (mode B). */
export interface CourseCardBackParts {
	text: string;
	generatedSteps?: NonNullable<ResolvedCorrection['_renderedSteps']>;
}

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

/**
 * Verso d'une carte, source UNIQUE pour tous les affichages (FlashCard,
 * CourseCardView) et pour la vérification.
 *
 * Même règle que `CorrectionCard` : des étapes écrites (mode A) priment sur les
 * étapes générées (mode B) ; le feedback « juste » accompagne les étapes générées.
 */
export function courseCardBackParts(
	correction: ResolvedCorrection | null | undefined
): CourseCardBackParts {
	if (!correction) return { text: '' };
	const hasWrittenSteps = (correction.steps ?? []).some((s) => String(s).trim().length > 0);
	const rendered = correction._renderedSteps;
	if (!hasWrittenSteps && rendered && rendered.length > 0) {
		const correct = correction.feedback?.correct;
		return {
			text: correct && String(correct).trim().length > 0 ? String(correct) : '',
			generatedSteps: rendered
		};
	}
	return { text: correctionText(correction) };
}

/** Verso d'une instance de carte, texte seul (mode A et feedback). */
export function courseCardBack(instance: Pick<QuestionInstance, 'correction'>): string {
	return courseCardBackParts(instance.correction).text;
}

/** Le verso d'une instance a-t-il un contenu (texte ou étapes générées) ? */
export function hasCourseCardBackContent(instance: Pick<QuestionInstance, 'correction'>): boolean {
	const parts = courseCardBackParts(instance.correction);
	return parts.text.trim().length > 0 || (parts.generatedSteps?.length ?? 0) > 0;
}

/**
 * Le verso d'un MODÈLE est-il déclaré ? Texte non vide, ou étapes générées
 * (`generatedSteps`, rendues à la génération — `checkTemplate` vérifie
 * ensuite, tirage par tirage, qu'elles le sont vraiment).
 */
export function hasCourseCardBackSource(
	correction: QuestionCorrection | null | undefined
): boolean {
	return correctionText(correction).trim().length > 0 || correction?.generatedSteps !== undefined;
}
