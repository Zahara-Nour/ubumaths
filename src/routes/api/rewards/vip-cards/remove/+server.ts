import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * Validation schema for removing VIP cards
 */
const removeVipCardSchema = z.object({
	studentId: z.string().uuid('Invalid student ID'),
	cardId: z.string().min(1, 'Card ID is required').max(50, 'Card ID too long')
});

/**
 * Remove a VIP card from a student
 *
 * POST /api/rewards/vip-cards/remove
 *
 * Request body:
 *   - studentId (string, UUID): Student's profile ID
 *   - cardId (string): VIP card ID to remove (e.g., "bonus", "captain", "joker")
 *
 * Response:
 *   - 200: { success: true }
 *   - 400: Validation error
 *   - 401: Not authenticated
 *   - 403: Not a teacher or student not in teacher's classes
 *   - 404: No matching card found to remove
 *   - 500: Server error
 *
 * Security:
 *   - Requires authentication
 *   - Requires teacher or admin role
 *   - RPC function verifies student is in teacher's classes
 *   - No gidouilles refund (card is simply removed)
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		// ✅ SECURITY: Validate input with Zod
		const body = await request.json();
		const validation = removeVipCardSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { studentId, cardId } = validation.data;

		// Verify the user is a teacher or admin
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (profileError || !profile) {
			throw error(500, 'Failed to fetch user profile');
		}

		if (profile.role !== 'teacher' && profile.role !== 'admin') {
			throw error(403, 'Only teachers and admins can remove VIP cards');
		}

		// Call RPC function to remove VIP card
		// The RPC function handles additional security checks:
		// - Verifies student is in one of the teacher's classes
		// - Removes oldest unused instance of the specified card
		// - No gidouilles refund
		const { data: success, error: rpcError } = await supabase.rpc('remove_student_vip_card', {
			p_student_id: studentId,
			p_card_id: cardId
		});

		if (rpcError) {
			console.error('RPC error removing VIP card:', rpcError);

			// Handle specific authorization errors from RPC function
			if (rpcError.message?.includes('Unauthorized')) {
				throw error(403, rpcError.message);
			}

			throw error(500, 'Failed to remove VIP card');
		}

		// RPC function returns FALSE if no matching card was found
		if (!success) {
			throw error(404, 'No matching VIP card found to remove');
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error removing VIP card:', err);

		// Re-throw SvelteKit errors (they already have proper status codes)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
