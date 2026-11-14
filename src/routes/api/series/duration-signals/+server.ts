/**
 * Durées trop courtes des modèles d'un panier (chantier `durees-trop-courtes`,
 * PR 2). Prof et admin. Lecture seule, sous la RLS du professeur ; mode test
 * respecté. Rend des comptes, jamais un nom.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { getDurationSignals } from '$lib/server/stats/duration-signals';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { DURATION_SIGNALS_MAX_TEMPLATES } from '$lib/types/duration-signals';

// Constantes
/** UUID (36) + virgule : l'adresse reste bornée avant le découpage */
const MAX_QUERY_LENGTH = DURATION_SIGNALS_MAX_TEMPLATES * 37;

const querySchema = z
	.string()
	.min(1)
	.max(MAX_QUERY_LENGTH)
	.transform((value) => value.split(','))
	.pipe(z.array(z.string().uuid()).min(1).max(DURATION_SIGNALS_MAX_TEMPLATES));

export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	const query = querySchema.safeParse(url.searchParams.get('templates') ?? '');
	if (!query.success) throw error(400, 'Modèles invalides');

	const isTestMode = await getTeacherTestMode(user.id, locals.supabase);
	const result = await getDurationSignals(locals.supabase, query.data, isTestMode);
	if (result.status === 'error') throw error(500, result.message);
	return json(result.signals);
};
