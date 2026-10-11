/**
 * Page d'admin du dictionnaire (ADR 0022, comportements 5 à 9) : toutes les
 * entrées, masquées comprises. Les enregistrements passent par
 * `/api/admin/dictionnaire`, qui vérifie les règles de cohérence.
 */

import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageServerLoad } from './$types';
import type { Database } from '$lib/types/database';
import { requireAdmin } from '$lib/server/middleware/auth';
import { loadAdminDictionary } from '$lib/server/dictionary/admin';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = await requireAdmin(locals);
	try {
		return { rows: await loadAdminDictionary(supabase as SupabaseClient<Database>) };
	} catch (cause) {
		console.error('[dictionnaire] lecture admin impossible', cause);
		throw error(503, 'Dictionnaire indisponible');
	}
};
