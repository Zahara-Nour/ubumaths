import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkAndAutoSelectToday } from '$lib/server/riddle-auto-select';

/**
 * API endpoint to trigger auto-selection of riddle of the day
 *
 * Can be called by:
 * - Cron job (Vercel Cron, GitHub Actions, etc.)
 * - Admin manually
 * - Scheduled task
 *
 * Security: Should be protected by API key or admin authentication
 */
export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	// Optional: Add API key authentication
	const authHeader = request.headers.get('authorization');
	const apiKey = import.meta.env.VITE_RIDDLE_AUTO_SELECT_API_KEY;

	// If API key is configured, verify it
	if (apiKey && authHeader !== `Bearer ${apiKey}`) {
		throw error(401, 'Non autorisé');
	}

	try {
		const result = await checkAndAutoSelectToday(supabase);

		if (result.success) {
			return json({
				success: true,
				message: result.message
			});
		} else {
			return json(
				{
					success: false,
					message: result.message
				},
				{ status: 500 }
			);
		}
	} catch (err) {
		console.error('Error in auto-select endpoint:', err);
		return json(
			{
				success: false,
				message: 'Erreur serveur'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET endpoint to check status
 */
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	const today = new Date().toISOString().split('T')[0];

	const { data: existing } = await supabase
		.from('riddle_of_the_day')
		.select(
			`
			*,
			riddle:riddles(riddle_number, title, difficulty)
		`
		)
		.eq('assignment_date', today)
		.single();

	return json({
		date: today,
		hasRiddle: !!existing,
		riddle: existing
			? {
					riddleNumber: existing.riddle.riddle_number,
					title: existing.riddle.title,
					difficulty: existing.riddle.difficulty
				}
			: null
	});
};
