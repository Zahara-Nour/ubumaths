/**
 * Source d'une tentative : réponse validée ou auto-évaluation
 * ===========================================================
 *
 * Une carte de cours (#617) n'a pas de réponse à valider : l'élève retourne la
 * carte puis dit s'il savait. La tentative est enregistrée dans `skill_attempts`
 * avec la source `student_self` (auto-évaluation, cf. `SkillSource`).
 *
 * La nature « carte » est lue en BASE (`question_templates.options`), jamais
 * dans l'instance envoyée par le client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { isCourseCard } from '$lib/questions/types';

// ============================================================================
// TYPES
// ============================================================================

export type TemplateAttemptSource = 'auto' | 'student_self';

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Source d'une tentative sur un modèle dont on connaît les `options` (jsonb). */
export function attemptSourceForTemplate(template: { options?: unknown }): TemplateAttemptSource {
	return isCourseCard(template) ? 'student_self' : 'auto';
}

/**
 * Parmi `templateIds`, ceux qui sont des cartes de cours.
 *
 * En cas d'erreur de lecture, rend un ensemble vide ET le signale : la
 * tentative reste enregistrée (source `auto`), l'élève ne perd pas son travail.
 */
export async function fetchCourseCardTemplateIds(
	supabase: SupabaseClient<Database>,
	templateIds: string[]
): Promise<Set<string>> {
	const ids = new Set<string>();
	if (templateIds.length === 0) return ids;

	const { data, error } = await supabase
		.from('question_templates')
		.select('id, options')
		.in('id', templateIds);

	if (error) {
		console.error('[course-card] question_templates illisible :', error);
		return ids;
	}
	for (const row of data ?? []) {
		if (isCourseCard(row)) ids.add(row.id);
	}
	return ids;
}

// ============================================================================
// GARDE-FOU FSRS : une mise à jour de la fiche par carte et par jour
// ============================================================================

const SCHOOL_TIME_ZONE = 'Europe/Paris';

/** Jour civil (AAAA-MM-JJ) à Paris : le « jour » de l'élève, pas celui d'UTC. */
export function schoolDay(date: Date): string {
	// `en-CA` formate en AAAA-MM-JJ
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: SCHOOL_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date);
}

/** La fiche a-t-elle déjà été mise à jour le même jour que `now` ? */
export function reviewedToday(lastReview: string | null | undefined, now: Date): boolean {
	if (!lastReview) return false;
	const last = new Date(lastReview);
	if (Number.isNaN(last.getTime())) return false;
	return schoolDay(last) === schoolDay(now);
}
