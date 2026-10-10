/**
 * /api/admin/dictionnaire — le dictionnaire vu par l'admin (ADR 0022)
 *
 * - GET : toutes les entrées, masquées comprises.
 * - POST : ajouter une entrée. Refus de cohérence → 400 avec les messages en
 *   français, rien n'est écrit.
 *
 * Admin seulement (élévation ou compte admin) : `requireAdmin`.
 */

import { error, json } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import type { Database } from '$lib/types/database';
import { requireAdmin } from '$lib/server/middleware/auth';
import { dictionaryEntryInputSchema } from '$lib/dictionary/entry-schema';
import { createEntry, inputProblem, loadAdminDictionary } from '$lib/server/dictionary/admin';

export const GET: RequestHandler = async ({ locals }) => {
	const { supabase } = await requireAdmin(locals);
	return json(await loadAdminDictionary(supabase as SupabaseClient<Database>));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { supabase } = await requireAdmin(locals);
	const parsed = dictionaryEntryInputSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, inputProblem(parsed.error));

	const result = await createEntry(supabase as SupabaseClient<Database>, parsed.data);
	if (!result.ok) {
		return json(
			{ message: result.problems.join('\n'), problems: result.problems },
			{ status: result.status }
		);
	}
	return json(result.row, { status: 201 });
};
