/**
 * SRS Revisions - Deck List (Server)
 * ===================================
 *
 * Load user's SRS decks for the revisions page.
 *
 * Élève : aussi une entrée par chapitre visible ayant au moins une série
 * publiée, avec le nombre à revoir (paquet CALCULÉ du chapitre, Q167 b).
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { summarizeChapterDecks, type ChapterDeckSummary } from '$lib/server/srs/chapter-deck';

/**
 * Paquets de chapitre de l'élève. Une panne ne doit pas se lire « aucun
 * chapitre » : elle est tracée et signalée (`chapterDecksUnavailable`).
 */
async function loadChapterDecks(
	supabase: App.Locals['supabase'],
	userId: string,
	isStudent: boolean
): Promise<{ chapterDecks: ChapterDeckSummary[]; chapterDecksUnavailable: boolean }> {
	if (!isStudent) return { chapterDecks: [], chapterDecksUnavailable: false };
	try {
		return {
			chapterDecks: await summarizeChapterDecks(supabase, userId),
			chapterDecksUnavailable: false
		};
	} catch (err) {
		console.error('Paquets de chapitre illisibles :', err);
		return { chapterDecks: [], chapterDecksUnavailable: true };
	}
}

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession, profile } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Les chapitres sont lus aux droits de l'appelant : réservé à l'élève (un
	// professeur verrait tous les siens).
	const chapterDecksPromise = loadChapterDecks(supabase, user.id, profile?.role === 'student');

	try {
		// Get user's decks
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
				decks: [],
				...(await chapterDecksPromise)
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
						isAutoManaged: deck.is_auto_managed,
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
			decks: decksWithStats,
			...(await chapterDecksPromise)
		};
	} catch (err) {
		console.error('Error in revisions page load:', err);
		throw error(500, 'Internal server error');
	}
};
