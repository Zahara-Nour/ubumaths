/**
 * Admin Question Templates - Server
 * ==================================
 *
 * Server-side data loading and filtering for question templates.
 *
 * Features:
 * - Query parameter parsing (type, grades, search, sort, order, page)
 * - Server-side sorting with SQL injection prevention
 * - Recherche par titre (ILIKE) ou par début d'identifiant (plage d'UUID)
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
import { readAllRows } from '$lib/server/read-all-rows';
import { loadActiveNodes } from '$lib/server/classification-nodes';
import { z } from 'zod';
import { filterNodeIds, type TreeNode } from '$lib/questions/classification-tree';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/admin/questions/+page.server');

// ============================================================================
// TYPES
// ============================================================================

/** Filtres de la page, communs aux onglets Brouillons et Publiés */
interface TemplateFilters {
	type: string | null;
	grades: string | null;
	/** Modèles rangés sous ces nœuds (notion + sous-notions, ou toute une branche) ; `null` : pas de filtre */
	nodeIds: string[] | null;
	/** Modèles non rangés (`classification_node_id is null`) */
	unranked: boolean;
	minLevel: string | null;
	maxLevel: string | null;
	/** Questions de cours seulement (`?courseQuestion=1`, Q110 b) */
	courseQuestion: boolean;
	/** Terme cherché dans le titre ou au début de l'identifiant ; `null` : pas de recherche */
	search: string | null;
}

/** Ce que `applyTemplateFilters` utilise d'une requête PostgREST */
interface FilterableQuery {
	eq(column: string, value: string): this;
	in(column: string, values: string[]): this;
	is(column: string, value: null): this;
	overlaps(column: string, value: string[]): this;
	gte(column: string, value: number): this;
	lte(column: string, value: number): this;
	ilike(column: string, pattern: string): this;
	or(filters: string): this;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Plafond de lignes par requête côté PostgREST */
const ID_PAGE_SIZE = 1000;

/** Identifiant qu'aucun nœud ne porte : un filtre sur un nœud inconnu ne rend rien */
const NO_NODE_ID = '00000000-0000-0000-0000-000000000000';

const uuidSchema = z.string().uuid();

/** Terme de recherche : espaces autour retirés, vide = pas de recherche */
const searchSchema = z.string().trim().max(100);

/**
 * Longueur minimale d'un début d'identifiant : les 8 caractères affichés par la liste.
 * Plus court, « 2024 » ou « face » ramèneraient des modèles sans rapport (David, 2026-11-09).
 */
const MIN_ID_PREFIX = 8;

/** Forme d'un UUID : chaque `-` du début d'identifiant doit tomber à sa place */
const UUID_SHAPE = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

/** Terme qui peut être un début d'identifiant : chiffres hexadécimaux et tirets */
const ID_PREFIX_PATTERN = /^[0-9a-f-]+$/i;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Échappe les jokers de LIKE (`%`, `_`) et le caractère d'échappement (`\\`). PostgREST
 * lit `*` comme `%` et ne sait pas l'échapper : il devient `_` (un caractère quelconque).
 */
function escapeLike(term: string): string {
	return term.replace(/[\\%_]/g, (char) => `\\${char}`).replaceAll('*', '_');
}

/** 32 chiffres hexadécimaux → UUID avec ses tirets (8-4-4-4-12) */
function toUuid(hex: string): string {
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Plage d'UUID qui commencent par ce début d'identifiant ; `null` si le terme n'en est
 * pas un. PostgREST ne sait pas convertir `id` en texte : on compare des UUID (ordre des
 * octets = ordre des chiffres hexadécimaux), ce qui passe par l'index de la clé primaire.
 */
function idPrefixRange(term: string): { low: string; high: string } | null {
	if (!ID_PREFIX_PATTERN.test(term)) return null;
	// Tirets aux places d'un UUID (identifiant copié entier), ou aucun tiret
	if (term.includes('-')) {
		if (term.length > UUID_SHAPE.length) return null;
		if ([...term].some((char, index) => (char === '-') !== (UUID_SHAPE[index] === '-'))) {
			return null;
		}
	}
	const hex = term.replaceAll('-', '').toLowerCase();
	if (hex.length < MIN_ID_PREFIX || hex.length > 32) return null;
	return { low: toUuid(hex.padEnd(32, '0')), high: toUuid(hex.padEnd(32, 'f')) };
}

/**
 * Applique les filtres de la page à une requête, quel que soit l'onglet.
 *
 * Niveaux scolaires : chevauchement de tableaux JSONB (un modèle 6e/5e sort
 * pour le filtre « 6e, 3e »). Arbre des notions : « Non rangés » l'emporte, sinon les
 * nœuds retenus (une notion inclut ses sous-notions).
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
	if (filters.unranked) {
		filtered = filtered.is('classification_node_id', null);
	} else if (filters.nodeIds) {
		filtered = filtered.in(
			'classification_node_id',
			filters.nodeIds.length > 0 ? filters.nodeIds : [NO_NODE_ID]
		);
	}
	const minLevel = filters.minLevel ? parseInt(filters.minLevel) : NaN;
	if (!isNaN(minLevel)) filtered = filtered.gte('level', minLevel);
	const maxLevel = filters.maxLevel ? parseInt(filters.maxLevel) : NaN;
	if (!isNaN(maxLevel)) filtered = filtered.lte('level', maxLevel);
	if (filters.courseQuestion) filtered = filtered.or(COURSE_QUESTION_FILTER);
	if (filters.search) {
		const range = idPrefixRange(filters.search);
		// Terme hexadécimal : sans caractère spécial, il peut entrer tel quel dans `or()`
		filtered = range
			? filtered.or(`title.ilike.*${filters.search}*,and(id.gte.${range.low},id.lte.${range.high})`)
			: filtered.ilike('title', `%${escapeLike(filters.search)}%`);
	}
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
	// Arbre des notions : identifiants mal formés ignorés. Les anciens paramètres
	// d'adresse (thème, domaine, sous-domaine) ne sont plus lus.
	const branchParam = url.searchParams.get('branche');
	const notionParam = url.searchParams.get('notion');
	const branchFilter = uuidSchema.safeParse(branchParam).success ? branchParam : null;
	const notionFilter = uuidSchema.safeParse(notionParam).success ? notionParam : null;
	const unrankedFilter = url.searchParams.get('nonRanges') === '1';
	const minLevelFilter = url.searchParams.get('minLevel'); // Minimum difficulty level
	const maxLevelFilter = url.searchParams.get('maxLevel'); // Maximum difficulty level
	// Recherche par titre ou début d'identifiant
	const searchParsed = searchSchema.safeParse(url.searchParams.get('search') ?? '');
	if (!searchParsed.success) throw error(400, 'Recherche trop longue (100 caractères au plus)');
	const searchFilter = searchParsed.data || null;
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

	// Les nœuds non archivés : filtres de la page et chemins des étiquettes
	let nodes: TreeNode[];
	try {
		nodes = await loadActiveNodes(supabase);
	} catch (nodesError) {
		logger.error("Lecture de l'arbre impossible :", nodesError);
		throw error(500, 'Impossible de charger les données');
	}

	const filters: TemplateFilters = {
		type: typeFilter,
		grades: gradesFilter,
		nodeIds: filterNodeIds(nodes, { branchId: branchFilter, notionId: notionFilter }),
		unranked: unrankedFilter,
		minLevel: minLevelFilter,
		maxLevel: maxLevelFilter,
		courseQuestion: courseQuestionFilter,
		search: searchFilter
	};

	try {
		/**
		 * Brouillons : mêmes filtres et même tri que les publiés, sans pagination
		 * (la publication par lot doit pouvoir cocher tout ce qui est filtré).
		 * Lus page par page : PostgREST tronque à 1000 lignes.
		 */
		let drafts;
		try {
			drafts = await readAllRows(
				(from, to) =>
					applyTemplateFilters(
						supabase
							.from('question_templates')
							.select('*')
							.eq('status', 'draft')
							.order(actualSortField, { ascending: actualSortOrder })
							// Départage : des modèles importés en lot partagent le même created_at
							.order('id')
							.range(from, to),
						filters
					),
				'des brouillons'
			);
		} catch (draftsError) {
			logger.error('Error fetching draft templates:', draftsError);
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
			logger.error('Error fetching templates:', queryError);
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
				logger.error('Error fetching published template ids:', idsError);
				throw error(500, 'Failed to load question templates');
			}
			publishedIds.push(...idRows.map((row) => row.id));
			if (idRows.length < ID_PAGE_SIZE) break;
		}

		return {
			drafts,
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
				branche: branchFilter,
				notion: notionFilter,
				nonRanges: unrankedFilter,
				minLevel: minLevelFilter,
				maxLevel: maxLevelFilter,
				courseQuestion: courseQuestionFilter,
				search: searchFilter
			},
			nodes
		};
	} catch (err) {
		logger.error('Error in question templates load:', err);
		throw error(500, 'Failed to load question templates');
	}
};
