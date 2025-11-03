/**
 * Update Class Gidouilles API
 * ============================
 *
 * Endpoint: POST /api/teacher/rewards/update-class
 * Purpose: Add or remove gidouilles for all students in a class
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const schema = z.object({
	classId: z.string().uuid(),
	delta: z.number().int().min(-1000).max(1000) // Safety bounds
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = locals;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	// Validate input
	const validation = schema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { classId, delta } = validation.data;
	const supabase = locals.supabase;

	try {
		// Call RPC to update class gidouilles
		const { data: studentsUpdated, error: rpcError } = await supabase.rpc(
			'update_class_gidouilles',
			{
				p_class_id: classId,
				p_delta: delta
			}
		);

		if (rpcError) {
			console.error('[API] RPC Error:', rpcError);
			throw error(500, rpcError.message || 'Failed to update class gidouilles');
		}

		return json({
			success: true,
			message: `${studentsUpdated} élève(s) mis à jour avec succès`,
			studentsUpdated
		});
	} catch (err) {
		console.error('[API] Error updating class gidouilles:', err);
		throw error(500, 'An error occurred while updating class gidouilles');
	}
};
