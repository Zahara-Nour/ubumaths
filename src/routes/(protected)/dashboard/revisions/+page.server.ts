/**
 * SRS Revisions - Deck List (Server)
 * ===================================
 *
 * Load user's SRS decks for the revisions page.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Fetch user's decks from API
		const response = await fetch(`${process.env.ORIGIN || 'http://localhost:5173'}/api/srs/decks`, {
			headers: {
				cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`
			}
		});

		if (!response.ok) {
			console.error('Failed to fetch decks:', await response.text());
			throw error(500, 'Failed to load decks');
		}

		const data = await response.json();

		return {
			decks: data.decks || []
		};
	} catch (err) {
		console.error('Error in revisions page load:', err);
		throw error(500, 'Internal server error');
	}
};
