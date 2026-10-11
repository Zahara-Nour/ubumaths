/**
 * PATCH /api/admin/dictionnaire/[id] — modifier une entrée, la masquer ou la
 * réafficher (ADR 0022). Pas de suppression : une entrée se masque.
 *
 * Refus de cohérence → 400 avec les messages en français, rien n'est écrit.
 * Admin seulement (élévation ou compte admin) : `requireAdmin`.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import type { Database } from '$lib/types/database';
import { requireAdmin } from '$lib/server/middleware/auth';
import { dictionaryEntryInputSchema } from '$lib/dictionary/entry-schema';
import { inputProblem, updateEntry } from '$lib/server/dictionary/admin';

const patchSchema = z
	.object({ entry: dictionaryEntryInputSchema.optional(), hidden: z.boolean().optional() })
	.strict()
	.refine((body) => body.entry !== undefined || body.hidden !== undefined, 'Rien à modifier');

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { supabase } = await requireAdmin(locals);
	if (!z.string().uuid().safeParse(params.id).success) throw error(400, 'Identifiant invalide');
	const parsed = patchSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, inputProblem(parsed.error));

	const result = await updateEntry(supabase as SupabaseClient<Database>, params.id, parsed.data);
	if (!result.ok) {
		return json(
			{ message: result.problems.join('\n'), problems: result.problems },
			{ status: result.status }
		);
	}
	return json(result.row);
};
