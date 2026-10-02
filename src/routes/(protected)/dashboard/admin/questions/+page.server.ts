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
 * - Pagination with 50 items per page (published tab)
 * - Same filters applied to drafts (no pagination) for bulk publication
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

import { COURSE_QUESTION_FILTER } from '$lib/questions/course-question';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';

// ============================================================================
// TYPES
// ============================================================================

/** Filtres de la page, communs aux onglets Brouillons et Publiés */
interface TemplateFilters {
	type: string | null;
	grades: string | null;
	theme: string | null;
	domain: string | null;
	subdomain: string | null;
	minLevel: string | null;
	maxLevel: string | null;
	/** Questions de cours seulement (`?courseQuestion=1`, Q110 b) */
	courseQuestion: boolean;
}

/** Ce que `applyTemplateFilters` utilise d'une requête PostgREST */
interface FilterableQuery {
	eq(column: string, value: string): this;
	overlaps(column: string, value: string[]): this;
	gte(column: string, value: number): this;
	lte(column: string, value: number): this;
	or(filters: string): this;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Plafond de lignes par requête côté PostgREST */
const ID_PAGE_SIZE = 1000;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Applique les filtres de la page à une requête, quel que soit l'onglet.
 *
 * Niveaux scolaires : chevauchement de tableaux JSONB (un modèle 6e/5e sort
 * pour le filtre « 6e, 3e »). Thème, domaine, sous-domaine : égalité exacte.
 */
function applyTemplateFilters<Q extends FilterableQuery>(query: Q, filters: TemplateFilters): Q {
	let filtered = query;
	if (filters.type) filtered = filtered.eq('type', filters.type);
	if (filters.grades) {
		filtered = filtered.overlaps(
			'grades',
			filters.grades.split(',').map((grade) => grade.trim())
		);
	}
	if (filters.theme) filtered = filtered.eq('theme', filters.theme);
	if (filters.domain) filtered = filtered.eq('domain', filters.domain);
	if (filters.subdomain) filtered = filtered.eq('subdomain', filters.subdomain);
	const minLevel = filters.minLevel ? parseInt(filters.minLevel) : NaN;
	if (!isNaN(minLevel)) filtered = filtered.gte('level', minLevel);
	const maxLevel = filters.maxLevel ? parseInt(filters.maxLevel) : NaN;
	if (!isNaN(maxLevel)) filtered = filtered.lte('level', maxLevel);
	if (filters.courseQuestion) filtered = filtered.or(COURSE_QUESTION_FILTER);
	return filtered;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	// Admin only (real admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

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
	// Questions de cours seulement : seule la valeur « 1 » active le filtre
	const courseQuestionFilter = url.searchParams.get('courseQuestion') === '1';
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

	const filters: TemplateFilters = {
		type: typeFilter,
		grades: gradesFilter,
		theme: themeFilter,
		domain: domainFilter,
		subdomain: subdomainFilter,
		minLevel: minLevelFilter,
		maxLevel: maxLevelFilter,
		courseQuestion: courseQuestionFilter
	};
	// Recherche plein texte (`searchFilter`) toujours désactivée : elle attend un index
	// tsvector sur `variations` (migration à écrire, GIN + config 'french').

	try {
		/**
		 * Brouillons : mêmes filtres et même tri que les publiés, sans pagination
		 * (la publication par lot doit pouvoir cocher tout ce qui est filtré).
		 */
		const { data: drafts, error: draftsError } = await applyTemplateFilters(
			supabase.from('question_templates').select('*').eq('status', 'draft'),
			filters
		)
			.order(actualSortField, { ascending: actualSortOrder })
			// Départage : des modèles importés en lot partagent le même created_at
			.order('id');

		if (draftsError) {
			console.error('Error fetching draft templates:', draftsError);
			throw error(500, 'Failed to load draft templates');
		}

		/**
		 * Publiés : page courante (50 lignes), total pour la pagination
		 */
		const {
			data: templates,
			error: queryError,
			count
		} = await applyTemplateFilters(
			supabase.from('question_templates').select('*', { count: 'exact' }).eq('status', 'published'),
			filters
		)
			.range(offset, offset + limit - 1)
			.order(actualSortField, { ascending: actualSortOrder })
			// Départage : des modèles importés en lot partagent le même created_at
			.order('id');

		if (queryError) {
			console.error('Error fetching templates:', queryError);
			throw error(500, 'Failed to load question templates');
		}

		/**
		 * Identifiants de TOUS les publiés filtrés, toutes pages confondues :
		 * « Tout cocher (filtrés) » ne se limite pas à la page affichée.
		 * PostgREST plafonne à 1000 lignes par requête : on pagine.
		 */
		const publishedIds: string[] = [];
		for (let from = 0; ; from += ID_PAGE_SIZE) {
			const idsQuery = supabase
				.from('question_templates')
				.select('id')
				.eq('status', 'published')
				.order('id')
				.range(from, from + ID_PAGE_SIZE - 1);
			const { data: idRows, error: idsError } = await applyTemplateFilters(idsQuery, filters);

			if (idsError) {
				console.error('Error fetching published template ids:', idsError);
				throw error(500, 'Failed to load question templates');
			}
			publishedIds.push(...idRows.map((row) => row.id));
			if (idRows.length < ID_PAGE_SIZE) break;
		}

		/**
		 * Extract unique categories from all templates
		 *
		 * This is used to populate the filter dropdowns dynamically.
		 * We fetch all templates (no filters except count) to get all possible categories.
		 */
		const { data: allTemplates, error: allTemplatesError } = await supabase
			.from('question_templates')
			.select('theme, domain, subdomain');

		if (allTemplatesError) {
			console.error('Lecture impossible :', allTemplatesError);
			throw error(500, 'Impossible de charger les données');
		}

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
			publishedIds,
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
				courseQuestion: courseQuestionFilter,
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
