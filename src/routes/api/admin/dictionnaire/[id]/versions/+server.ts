/**
 * GET /api/admin/dictionnaire/[id]/versions — les versions précédentes d'une
 * entrée (date, auteur de la modification), admin seulement (ADR 0022).
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import type { Database } from '#lib/types/database.ts';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { loadVersions } from '#lib/server/dictionary/admin.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const { supabase } = await requireAdmin(locals);
	if (!z.string().uuid().safeParse(params.id).success) throw error(400, 'Identifiant invalide');
	return Response.json(await loadVersions(supabase as SupabaseClient<Database>, params.id));
};
