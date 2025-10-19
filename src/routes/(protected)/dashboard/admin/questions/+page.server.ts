/**
 * Admin Question Templates - Server
 * ==================================
 *
 * Loads question templates for the admin interface.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase }, parent, url }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { profile } = await parent();

	if (profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	// Parse query parameters for filters
	const typeFilter = url.searchParams.get('type');
	const gradesFilter = url.searchParams.get('grades');
	const searchFilter = url.searchParams.get('search');
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = 50; // Fixed limit per page
	const offset = (page - 1) * limit;

	try {
		// Build query
		let query = supabase
			.from('question_templates')
			.select('*', { count: 'exact' });

		// Apply filters
		if (typeFilter) {
			query = query.eq('type', typeFilter);
		}

		if (gradesFilter) {
			const grades = gradesFilter.split(',').map((g) => g.trim());
			query = query.overlaps('grades', grades);
		}

		// Note: Search filter would require full-text search or client-side filtering
		// For now, we'll fetch all and filter client-side

		// Apply pagination and ordering
		query = query
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: false });

		const { data: templates, error: queryError, count } = await query;

		if (queryError) {
			console.error('Error fetching templates:', queryError);
			throw error(500, 'Failed to load question templates');
		}

		return {
			templates: templates || [],
			total: count || 0,
			page,
			limit,
			filters: {
				type: typeFilter,
				grades: gradesFilter,
				search: searchFilter
			}
		};
	} catch (err) {
		console.error('Error in question templates load:', err);
		throw error(500, 'Failed to load question templates');
	}
};
