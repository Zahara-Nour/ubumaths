/**
 * POST /api/notifications/cleanup
 *
 * Cleanup expired notifications (hard delete)
 * This endpoint can be called manually or by a cron job
 *
 * For Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/notifications/cleanup",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * This will run daily at 2 AM UTC
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanupExpiredNotifications } from '$lib/server/notifications';

export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	// Optional: Verify cron secret for security
	// const authHeader = request.headers.get('authorization');
	// if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
	//   return json({ error: 'Unauthorized' }, { status: 401 });
	// }

	// Run cleanup
	const result = await cleanupExpiredNotifications(supabase);

	if (!result.success) {
		return json(
			{
				success: false,
				error: result.error
			},
			{ status: 500 }
		);
	}

	return json({
		success: true,
		deletedCount: result.deletedCount,
		message: `Cleaned up ${result.deletedCount} expired notification(s)`
	});
};

// Allow GET for manual testing (remove in production if needed)
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	const result = await cleanupExpiredNotifications(supabase);

	if (!result.success) {
		return json(
			{
				success: false,
				error: result.error
			},
			{ status: 500 }
		);
	}

	return json({
		success: true,
		deletedCount: result.deletedCount,
		message: `Cleaned up ${result.deletedCount} expired notification(s)`
	});
};
