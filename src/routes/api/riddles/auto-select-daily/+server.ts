import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkAndAutoSelectToday } from '$lib/server/riddle-auto-select';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

/**
 * API endpoint to trigger auto-selection of riddle of the day
 *
 * Can be called by:
 * - Cron job (Vercel Cron, GitHub Actions, etc.)
 * - Admin manually
 * - Scheduled task
 *
 * Security: Should be protected by API key or admin authentication
 *
 * Job Tracking: Logs execution to background_job_runs table
 */
export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	// Optional: Add API key authentication
	const authHeader = request.headers.get('authorization');
	const apiKey = import.meta.env.VITE_RIDDLE_AUTO_SELECT_API_KEY;

	// If API key is configured, verify it
	if (apiKey && authHeader !== `Bearer ${apiKey}`) {
		throw error(401, 'Non autorisé');
	}

	// Create service role client for job logging (bypasses RLS)
	const serviceClient = createServiceRoleClient();
	let runId: string | null = null;

	try {
		// Start job run
		const { data: startData, error: startError } = await serviceClient.rpc('start_job_run', {
			p_job_name: 'auto_select_daily_riddle',
			p_metadata: {}
		});

		if (startError) {
			console.error('Failed to start job run:', startError);
			// Continue anyway (don't block job execution)
		} else {
			runId = startData;
		}

		// Execute job logic
		const result = await checkAndAutoSelectToday(supabase);

		if (result.success) {
			// Extract riddle ID from success message if present
			// Message format: "Énigme du jour sélectionnée automatiquement: <riddle_id>"
			const riddleIdMatch = result.message.match(/: ([a-f0-9-]{36})/);
			const riddleId = riddleIdMatch ? riddleIdMatch[1] : null;

			// Complete job run (success)
			if (runId) {
				await serviceClient.rpc('complete_job_run', {
					p_run_id: runId,
					p_status: 'success',
					p_metadata: riddleId
						? { riddle_id: riddleId, message: result.message }
						: { message: result.message }
				});
			}

			return json({
				success: true,
				message: result.message
			});
		} else {
			// Complete job run (failed)
			if (runId) {
				await serviceClient.rpc('complete_job_run', {
					p_run_id: runId,
					p_status: 'failed',
					p_error_message: result.message,
					p_metadata: {}
				});
			}

			return json(
				{
					success: false,
					message: result.message
				},
				{ status: 500 }
			);
		}
	} catch (err) {
		// Complete job run (failed)
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'failed',
				p_error_message: err instanceof Error ? err.message : 'Unknown error',
				p_metadata: {}
			});
		}

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
