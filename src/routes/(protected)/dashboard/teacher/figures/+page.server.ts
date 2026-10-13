/**
 * Figures géométriques stockées (ADR 0027) : liste filtrable du prof.
 * Les filtres vivent dans l'adresse (`?grade=…&tag=…&q=…&scope=…`).
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { parseFigureListFilters } from '$lib/server/validation/geometry-figures';
import {
	FIGURE_LIST_LIMIT,
	GeometryFigureError,
	listGeometryFigures,
	listGeometryFigureTagNames
} from '$lib/server/geometry-figures';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	const filters = parseFigureListFilters(url.searchParams);
	if (!filters.success) throw error(400, filters.error.issues[0].message);

	try {
		const [figures, tagNames] = await Promise.all([
			listGeometryFigures(locals.supabase, user.id, filters.data),
			listGeometryFigureTagNames(locals.supabase)
		]);
		return {
			figures,
			tagNames,
			filters: filters.data,
			userId: user.id,
			limit: FIGURE_LIST_LIMIT
		};
	} catch (e) {
		if (e instanceof GeometryFigureError) throw error(e.status, e.message);
		throw e;
	}
};
