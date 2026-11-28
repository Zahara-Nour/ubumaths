/**
 * Update Class Gidouilles API
 * ============================
 *
 * Endpoint: POST /api/teacher/rewards/update-class
 * Purpose: Add or remove gidouilles for all students in a class
 */

import { throwServerError } from '#lib/server/utils/error-handler.ts';
import { error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { z } from 'zod';

const schema = z.object({
	classId: z.string().uuid(),
	delta: z.number().int().min(-1000).max(1000) // Safety bounds
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// SECURITY (finding M5): teacher/admin only (defense in depth over the RPC guard).
	await requireRoles(locals, ['teacher', 'admin']);

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
			throwServerError(
				'api/teacher/rewards/update-class',
				rpcError,
				'Impossible de modifier les gidouilles de la classe'
			);
		}

		return Response.json({
			success: true,
			message: `${studentsUpdated} élève(s) mis à jour avec succès`,
			studentsUpdated
		});
	} catch (err) {
		// L'erreur 500 levée plus haut porte déjà son message français : la relancer telle quelle.
		if (isHttpError(err)) throw err;
		throwServerError(
			'api/teacher/rewards/update-class',
			err,
			'Impossible de modifier les gidouilles de la classe'
		);
	}
};
