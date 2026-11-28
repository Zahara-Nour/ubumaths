/**
 * Admin Error Dashboard - Server Load
 * Load error logs and statistics for admin dashboard
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getErrorStats, getErrorOccurrences } from '#lib/server/errorMonitoring.ts';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { adminErrorsFiltersSchema } from '#lib/server/validation/errors.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Admin gate (admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

	// Filtres de l'adresse : vide = pas de filtre ; valeur inconnue = 400
	const parsed = adminErrorsFiltersSchema.safeParse({
		type: url.searchParams.get('type') || undefined,
		severity: url.searchParams.get('severity') || undefined,
		resolved: url.searchParams.get('resolved') || undefined,
		search: url.searchParams.get('search') || undefined
	});
	if (!parsed.success) {
		throw error(400, 'Filtres invalides');
	}
	const { type: error_type, severity, resolved, search } = parsed.data;

	const filters: Record<string, string | boolean | number> = {};
	if (error_type) filters.error_type = error_type;
	if (severity) filters.severity = severity;
	if (resolved !== undefined) filters.resolved = resolved === 'true';
	if (search) filters.search = search;

	filters.limit = 50;
	filters.offset = 0;

	// Load error statistics (last 24 hours)
	const statsResult = await getErrorStats(supabase, 24);

	// Load error occurrences (deduplicated errors)
	const occurrencesResult = await getErrorOccurrences(supabase, filters);

	return {
		stats: statsResult.success ? statsResult.data : null,
		occurrences: occurrencesResult.success ? occurrencesResult.data : [],
		count: occurrencesResult.count || 0,
		filters: {
			type: error_type ?? null,
			severity: severity ?? null,
			resolved: resolved === 'true' ? true : resolved === 'false' ? false : null,
			search: search ?? null
		}
	};
};
