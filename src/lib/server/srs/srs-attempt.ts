/**
 * Trace d'une révision SRS dans `skill_attempts`
 * ==============================================
 *
 * Une révision d'un modèle (Programme, paquet calculé d'un chapitre) laisse la
 * même trace : origine « déclaré » (`student_self`), lieu `review`, note FSRS
 * conservée, réussite = note ≥ 2. Depuis les deux boutons « Pas réussi /
 * Réussi » (ADR 0038, chantier `formes-de-serie`), la note vaut 1 (Again) ou
 * 3 (Good) ; `srs` n'est plus écrit, les anciennes traces `srs` se lisent
 * « déclaré ». Le trigger de `skill_attempts` recalcule ensuite le suivi
 * des points du programme liés au modèle (ADR 0016 : les traces auto-évaluées
 * alimentent le référentiel ; Q169 a pour le chapitre).
 *
 * Toutes les traces sont gardées, même quand la planification FSRS ne retient
 * que le meilleur résultat du jour (ADR 0016).
 *
 * Non bloquant : la révision FSRS est déjà enregistrée ; l'échec est tracé et
 * rendu à l'appelant (le Programme n'ajoute alors pas la carte à son paquet).
 * Un INSERT refusé par la RLS lève une erreur (42501), il ne rend pas zéro ligne.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Grade } from '$lib/srs/types';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/srs/srs-attempt');

/** Insère la trace ; `false` si l'écriture a échoué (déjà tracé). */
export async function recordSrsReviewAttempt(
	supabase: SupabaseClient<Database>,
	studentId: string,
	templateId: string,
	grade: Grade
): Promise<boolean> {
	const { error } = await supabase.from('skill_attempts').insert({
		student_id: studentId,
		template_id: templateId,
		success: grade >= 2,
		grade,
		source: 'student_self',
		place: 'review',
		with_help: false
	});
	if (error) {
		logger.error('[srs] skill_attempts INSERT failed:', error);
		return false;
	}
	return true;
}
