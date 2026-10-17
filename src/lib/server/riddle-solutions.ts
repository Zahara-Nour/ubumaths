/**
 * Solutions des énigmes : réponse attendue et correction
 * =====================================================
 *
 * Elles vivent dans `riddle_solutions`, lisibles et modifiables par l'auteur de l'énigme
 * et l'admin seulement (RLS). L'élève n'y lit rien : quand une page élève ou la route de
 * soumission a besoin d'une solution, elle passe le client SERVICE, et seulement pour des
 * énigmes que la requête de l'élève a déjà rendues sous sa propre RLS.
 *
 * Ce module ne crée aucun client : l'appelant fournit celui de la session (prof) ou le
 * client service (élève), et c'est lui qui figure dans `ALLOWED_SERVICE_ROLE_PATHS`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/types/database';
import type { RiddleSolution } from '$lib/types/riddle';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;

export type SaveRiddleSolutionResult =
	{ ok: true } | { ok: false; reason: 'error'; error: unknown } | { ok: false; reason: 'no-row' };

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Lit les solutions d'une liste d'énigmes, rangées par identifiant.
 *
 * Une énigme absente de la Map n'a pas de solution lisible : l'appelant la traite
 * comme une validation manuelle sans correction (`toDbRiddle(row, null)`).
 */
export async function fetchRiddleSolutions(
	client: Client,
	riddleIds: readonly string[]
): Promise<{ solutions: Map<string, RiddleSolution>; error: unknown }> {
	const solutions = new Map<string, RiddleSolution>();
	const ids = [...new Set(riddleIds)];
	if (ids.length === 0) return { solutions, error: null };

	const { data, error } = await client
		.from('riddle_solutions')
		.select('riddle_id, answer, correction')
		.in('riddle_id', ids);

	if (error) return { solutions, error };

	for (const row of data ?? []) {
		solutions.set(row.riddle_id, { answer: row.answer, correction: row.correction });
	}
	return { solutions, error: null };
}

/**
 * Écrit (ou remplace) la solution d'une énigme.
 *
 * La RLS échoue en silence : une écriture refusée peut rendre zéro ligne sans erreur.
 * Seule une ligne rendue par `.select()` prouve l'écriture ; zéro ligne est un échec.
 */
export async function saveRiddleSolution(
	client: Client,
	riddleId: string,
	solution: { answer: Json | null; correction: string }
): Promise<SaveRiddleSolutionResult> {
	const { data, error } = await client
		.from('riddle_solutions')
		.upsert(
			{
				riddle_id: riddleId,
				answer: solution.answer,
				correction: solution.correction,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'riddle_id' }
		)
		.select('riddle_id');

	if (error) return { ok: false, reason: 'error', error };
	if (!data || data.length === 0) return { ok: false, reason: 'no-row' };
	return { ok: true };
}
