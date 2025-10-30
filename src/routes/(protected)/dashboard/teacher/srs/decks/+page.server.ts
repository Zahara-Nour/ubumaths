/**
 * Teacher - SRS Decks List (Server)
 * ==================================
 *
 * Load teacher's SRS decks.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Check if user is teacher or admin
	const { data: profileData, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profileData) {
		throw error(403, 'Profil non trouvé');
	}

	if (profileData.role !== 'teacher' && profileData.role !== 'admin') {
		throw error(403, 'Forbidden. Only teachers can access this page.');
	}

	try {
		// Get teacher's decks
		const { data: decks, error: decksError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('owner_id', user.id)
			.order('created_at', { ascending: false });

		if (decksError) {
			console.error('Error fetching decks:', decksError);
			throw error(500, 'Failed to load decks');
		}

		if (!decks) {
			return {
				decks: []
			};
		}

		// Get stats for each deck and map to camelCase
		const decksWithStats = await Promise.all(
			decks.map(async (deck) => {
				const { data: stats, error: statsError } = await supabase.rpc('get_deck_stats', {
					p_user_id: user.id,
					p_deck_id: deck.id
				});

				if (statsError) {
					console.error(`Error fetching stats for deck ${deck.id}:`, statsError);
					// Return deck without stats on error
					return {
						id: deck.id,
						name: deck.name,
						description: deck.description,
						ownerId: deck.owner_id,
						deckType: deck.deck_type,
						isAssigned: deck.is_assigned,
						config: deck.config,
						createdAt: deck.created_at,
						updatedAt: deck.updated_at,
						stats: {
							total_cards: 0,
							due_count: 0,
							new_count: 0,
							learning_count: 0,
							review_count: 0
						}
					};
				}

				// RPC returns array with single row
				const deckStats = stats?.[0] || {
					total_cards: 0,
					due_count: 0,
					new_count: 0,
					learning_count: 0,
					review_count: 0
				};

				// Map snake_case to camelCase
				return {
					id: deck.id,
					name: deck.name,
					description: deck.description,
					ownerId: deck.owner_id,
					deckType: deck.deck_type,
					isAssigned: deck.is_assigned,
					config: deck.config,
					createdAt: deck.created_at,
					updatedAt: deck.updated_at,
					stats: deckStats
				};
			})
		);

		return {
			decks: decksWithStats
		};
	} catch (err) {
		console.error('Error in teacher decks page load:', err);
		throw error(500, 'Internal server error');
	}
};
