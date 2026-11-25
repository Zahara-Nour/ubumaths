/**
 * Garde des routes de versions : l'appelant est l'auteur de l'exercice
 * =====================================================================
 *
 * La RLS d'`exercise_versions` refuse déjà toute écriture d'un autre compte ; la garde donne un
 * refus lisible (404 / 403) avant d'écrire, comme la page d'édition.
 *
 * @module server/exercise-versions-access
 */

import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';

/** 404 si l'exercice ne se lit pas, 403 si l'appelant n'en est pas l'auteur. */
export async function requireExerciseAuthor(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	userId: string
): Promise<void> {
	const { data, error: readError } = await supabase
		.from('exercises')
		.select('created_by')
		.eq('id', exerciseId)
		.maybeSingle();
	if (readError) throw error(500, 'Impossible de lire l’exercice');
	if (!data) throw error(404, 'Exercice introuvable');
	if (data.created_by !== userId) throw error(403, 'Seul l’auteur de l’exercice peut le modifier');
}
