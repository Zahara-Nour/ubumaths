/**
 * Admin Question Templates - Server
 * ==================================
 *
 * Server-side data loading and filtering for question templates.
 *
 * Features:
 * - Query parameter parsing (type, grades, search, sort, order, page)
 * - Server-side sorting with SQL injection prevention
 * - Full-text search using PostgreSQL's textSearch (French config)
 * - Grade filtering using JSONB array containment
 * - Pagination with 50 items per page
 *
 * Security:
 * - Validates sort field against whitelist (prevents SQL injection)
 * - Admin-only access (role check)
 * - Uses Supabase RLS policies for data access control
 *
 * Performance:
 * - All filtering done server-side (no client-side processing)
 * - Uses database indexes for fast filtering/sorting
 * - Returns paginated results (50 per page)
 * - Includes total count for pagination
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	locals: { safeGetSession, supabase },
	parent,
	url
}) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { profile } = await parent();

	if (profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	/**
	 * Parse query parameters for filters
	 *
	 * All filters are optional and come from URL query string.
	 * This enables shareable/bookmarkable filtered views.
	 */
	const typeFilter = url.searchParams.get('type'); // Question type ('numerical_exact', etc.)
	const gradesFilter = url.searchParams.get('grades'); // Comma-separated grades ('6,5,4')
	const themeFilter = url.searchParams.get('theme'); // Theme category
	const domainFilter = url.searchParams.get('domain'); // Domain category
	const subdomainFilter = url.searchParams.get('subdomain'); // Subdomain category
	const minLevelFilter = url.searchParams.get('minLevel'); // Minimum difficulty level
	const maxLevelFilter = url.searchParams.get('maxLevel'); // Maximum difficulty level
	const searchFilter = url.searchParams.get('search'); // Full-text search term
	const sortField = url.searchParams.get('sort') || 'created_at'; // Sort column
	const sortOrder = url.searchParams.get('order') || 'desc'; // Sort direction
	const page = parseInt(url.searchParams.get('page') || '1'); // Current page number
	const limit = 50; // Fixed limit per page
	const offset = (page - 1) * limit;

	/**
	 * Validate sort field (CRITICAL SECURITY)
	 *
	 * Only allow whitelisted fields to prevent SQL injection attacks.
	 * Never trust user input for column names in queries!
	 *
	 * Whitelist: created_at, updated_at, type
	 * Fallback: created_at (safe default)
	 */
	const validSortFields = ['created_at', 'updated_at', 'type'];
	const actualSortField = validSortFields.includes(sortField) ? sortField : 'created_at';
	const actualSortOrder = sortOrder === 'asc' ? true : false; // Convert to boolean

	try {
		/**
		 * Load all draft templates separately (always visible, no filters)
		 *
		 * Drafts are shown in their own tab, sorted by last modification date.
		 * They are not affected by any filters.
		 */
		const { data: drafts, error: draftsError } = await supabase
			.from('question_templates')
			.select('*')
			.eq('status', 'draft')
			.order('updated_at', { ascending: false });

		if (draftsError) {
			console.error('Error fetching draft templates:', draftsError);
			throw error(500, 'Failed to load draft templates');
		}

		/**
		 * Build Supabase query for published templates with filters
		 *
		 * Query builder pattern allows chaining multiple filters.
		 * count: 'exact' calculates total matching rows for pagination.
		 * Only published templates are affected by filters.
		 */
		let query = supabase
			.from('question_templates')
			.select('*', { count: 'exact' })
			.eq('status', 'published');

		/**
		 * Apply type filter (exact match)
		 *
		 * Filters by question type (numerical_exact, algebraic_transform, etc.)
		 * Uses .eq() for exact match on 'type' column.
		 */
		if (typeFilter) {
			query = query.eq('type', typeFilter);
		}

		/**
		 * Apply grades filter (JSONB array containment)
		 *
		 * Filters templates that apply to ANY of the selected grades.
		 * Uses .overlaps() for JSONB array matching.
		 *
		 * Example:
		 * - Template grades: ['6', '5', '4']
		 * - Selected grades: ['6', '3']
		 * - Match: Yes (contains '6')
		 */
		if (gradesFilter) {
			const grades = gradesFilter.split(',').map((g) => g.trim());
			query = query.overlaps('grades', grades);
		}

		/**
		 * Apply category filters (exact match)
		 */
		if (themeFilter) {
			query = query.eq('theme', themeFilter);
		}

		if (domainFilter) {
			query = query.eq('domain', domainFilter);
		}

		if (subdomainFilter) {
			query = query.eq('subdomain', subdomainFilter);
		}

		/**
		 * Apply level range filters
		 */
		if (minLevelFilter) {
			const minLevel = parseInt(minLevelFilter);
			if (!isNaN(minLevel)) {
				query = query.gte('level', minLevel);
			}
		}

		if (maxLevelFilter) {
			const maxLevel = parseInt(maxLevelFilter);
			if (!isNaN(maxLevel)) {
				query = query.lte('level', maxLevel);
			}
		}

		/**
		 * Server-side full-text search (PostgreSQL)
		 *
		 * NOTE: Text search is temporarily disabled pending creation of proper
		 * tsvector index on variations JSONB column. Current implementation uses
		 * client-side filtering as a fallback.
		 *
		 * TODO: Create migration with:
		 * - Generated column for text content extraction from variations
		 * - GIN index on tsvector for fast full-text search
		 * - French language configuration for stemming
		 * - Include 'title' field in search (has dedicated GIN index: idx_question_templates_title_search)
		 */
		// Temporarily disabled - will be re-enabled after proper index is added
		// if (searchFilter) {
		// 	query = query.textSearch('variations', searchFilter, {
		// 		type: 'websearch',
		// 		config: 'french'
		// 	});
		// }

		/**
		 * Apply pagination and ordering
		 *
		 * - range(offset, offset + limit - 1): Paginate results (50 per page)
		 * - order(field, {ascending}): Sort by validated field
		 *
		 * Example for page 2 (limit 50):
		 * - offset = (2-1) * 50 = 50
		 * - range = 50 to 99 (rows 51-100)
		 */
		query = query
			.range(offset, offset + limit - 1)
			.order(actualSortField, { ascending: actualSortOrder });

		const { data: templates, error: queryError, count } = await query;

		if (queryError) {
			console.error('Error fetching templates:', queryError);
			throw error(500, 'Failed to load question templates');
		}

		/**
		 * Extract unique categories from all templates
		 *
		 * This is used to populate the filter dropdowns dynamically.
		 * We fetch all templates (no filters except count) to get all possible categories.
		 */
		const { data: allTemplates } = await supabase
			.from('question_templates')
			.select('theme, domain, subdomain');

		const themes = new Set<string>();
		const domains = new Set<string>();
		const subdomains = new Set<string>();

		if (allTemplates) {
			for (const template of allTemplates) {
				if (template.theme) themes.add(template.theme);
				if (template.domain) domains.add(template.domain);
				if (template.subdomain) subdomains.add(template.subdomain);
			}
		}

		return {
			drafts: drafts || [],
			templates: templates || [],
			total: count || 0,
			page,
			limit,
			sort: actualSortField,
			order: sortOrder,
			filters: {
				type: typeFilter,
				grades: gradesFilter,
				theme: themeFilter,
				domain: domainFilter,
				subdomain: subdomainFilter,
				minLevel: minLevelFilter,
				maxLevel: maxLevelFilter,
				search: searchFilter
			},
			categories: {
				themes: Array.from(themes).sort(),
				domains: Array.from(domains).sort(),
				subdomains: Array.from(subdomains).sort()
			}
		};
	} catch (err) {
		console.error('Error in question templates load:', err);
		throw error(500, 'Failed to load question templates');
	}
};
