/**
 * Trace d'une révision SRS dans `skill_attempts`
 * ==============================================
 *
 * Une révision d'un modèle (Programme, paquet calculé d'un chapitre) laisse la
 * même trace : source `srs`, note brute conservée, réussite = « Difficile » ou
 * mieux (note ≥ 2). Le trigger de `skill_attempts` recalcule ensuite le suivi
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
		source: 'srs',
		with_help: false
	});
	if (error) {
		console.error('[srs] skill_attempts INSERT failed:', error);
		return false;
	}
	return true;
}
