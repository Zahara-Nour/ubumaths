/**
 * API Endpoint: /api/messages/templates/search
 *
 * Advanced template search with full-text search
 *
 * GET - Search templates
 * Query params:
 *   - q: Search query (full-text)
 *   - tags: Comma-separated tags
 *   - trigger_type: Filter by trigger type
 *   - scope: Filter by scope
 *   - favorites_only: 'true' to show only favorites
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const { supabase, user } = locals;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	const searchQuery = url.searchParams.get('q');
	const tagsParam = url.searchParams.get('tags');
	const triggerType = url.searchParams.get('trigger_type');
	const scope = url.searchParams.get('scope');
	const favoritesOnly = url.searchParams.get('favorites_only') === 'true';

	let query = supabase.from('message_templates').select(
		`
      *,
      classes:class_id (name),
      user_favorite_templates!left(user_id)
    `
	);

	// Apply RLS by default
	query = query.eq('is_active', true).eq('approval_status', 'approved');

	// Full-text search
	if (searchQuery && searchQuery.trim()) {
		query = query.textSearch('search_vector', searchQuery, {
			type: 'websearch',
			config: 'french'
		});
	}

	// Filter by tags
	if (tagsParam) {
		const tags = tagsParam.split(',').map((t) => t.trim());
		query = query.contains('tags', tags);
	}

	// Filter by trigger type
	if (triggerType) {
		query = query.eq('trigger_type', triggerType);
	}

	// Filter by scope
	if (scope) {
		query = query.eq('scope', scope);
	}

	// Favorites only
	if (favoritesOnly) {
		const { data: favoriteIds } = await supabase
			.from('user_favorite_templates')
			.select('template_id')
			.eq('user_id', user.id);

		if (favoriteIds && favoriteIds.length > 0) {
			query = query.in(
				'id',
				favoriteIds.map((f) => f.template_id)
			);
		} else {
			// No favorites, return empty
			return json({ results: [], count: 0 });
		}
	}

	// Execute query
	const { data: results, error: searchError } = await query.order('created_at', {
		ascending: false
	});

	if (searchError) {
		console.error('Error searching templates:', searchError);
		return error(500, 'Erreur lors de la recherche');
	}

	// Format results
	const formattedResults = results?.map((r: any) => ({
		...r,
		class_name: r.classes?.name || null,
		is_favorited: r.user_favorite_templates?.some((f: any) => f.user_id === user.id) || false
	}));

	return json({
		results: formattedResults || [],
		count: formattedResults?.length || 0,
		query: searchQuery || null,
		filters: {
			tags: tagsParam?.split(',') || [],
			trigger_type: triggerType,
			scope,
			favorites_only: favoritesOnly
		}
	});
};
