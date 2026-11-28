/**
 * Page d'admin du dictionnaire (ADR 0022, comportements 5 à 9) : toutes les
 * entrées, masquées comprises. Les enregistrements passent par
 * `/api/admin/dictionnaire`, qui vérifie les règles de cohérence.
 */

import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageServerLoad } from './$types';
import type { Database } from '#lib/types/database.ts';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { loadAdminDictionary } from '#lib/server/dictionary/admin.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('(protected)/dashboard/admin/dictionnaire/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = await requireAdmin(locals);
	try {
		return { rows: await loadAdminDictionary(supabase as SupabaseClient<Database>) };
	} catch (cause) {
		logger.error('[dictionnaire] lecture admin impossible', cause);
		throw error(503, 'Dictionnaire indisponible');
	}
};
