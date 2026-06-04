/**
 * API Route: PATCH /api/python-notebooks/[id]/checkpoint-runs/[cell_id]/hint-revealed
 *
 * Records that the student clicked "Voir l'indice" on this checkpoint.
 *
 * - Idempotent: any number of PATCHes flips the flag to true and stays there
 *   (the DB function is also idempotent — defense in depth).
 * - If no row exists yet for this (notebook, user, cell) triplet (unusual:
 *   the UI requires 2 failed Vérifier attempts before showing the button),
 *   the SQL function inserts a placeholder row with `attempt_count = 0`,
 *   `first_attempted_at = NULL`, `status = 'failed'`. The next runCheckpoint
 *   will fill the actual values.
 * - 401 if not authenticated; 403 if RLS rejects (e.g. student no longer
 *   has access to the notebook).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { validateUuidParam } from '$lib/server/validation/params';

const cellIdSchema = z.string().min(1).max(100);

export const PATCH: RequestHandler = async ({ locals, params }) => {
	const notebookId = validateUuidParam(params.id);
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const cellIdValidation = cellIdSchema.safeParse(params.cell_id);
	if (!cellIdValidation.success) {
		throw error(400, 'cell_id invalide');
	}

	const { data: run, error: dbError } = await supabase
		.rpc('mark_checkpoint_hint_revealed', {
			p_notebook_id: notebookId,
			p_cell_id: cellIdValidation.data
		})
		.single();

	if (dbError) {
		if (dbError.code === '42501') {
			throw error(403, 'Accès refusé à ce notebook');
		}
		console.error('Failed to mark checkpoint hint as revealed:', dbError);
		throw error(500, "Erreur lors de l'enregistrement de l'indice");
	}

	return json({ run });
};
