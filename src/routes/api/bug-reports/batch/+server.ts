/**
 * Bug Reports Batch Operations API
 * =================================
 *
 * PATCH /api/bug-reports/batch - Batch update status (admin only)
 * DELETE /api/bug-reports/batch - Batch delete (admin only)
 *
 * AUTH: admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import type { TablesUpdate } from '$lib/types/database';
import {
	batchUpdateBugReportsSchema,
	batchDeleteBugReportsSchema
} from '$lib/server/validation/bug-reports';

// =============================================================================
// PATCH /api/bug-reports/batch - Batch update status
// =============================================================================

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);

	if (profile.role !== 'admin') {
		throw error(403, 'Seuls les administrateurs peuvent effectuer des opérations en lot');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = batchUpdateBugReportsSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { reportIds, status } = validation.data;
	const updated: string[] = [];
	const failed: { id: string; reason: string }[] = [];

	// Determine if status change requires resolved_by
	const resolvedStatuses = ['resolved', 'wont_fix', 'duplicate'];
	const needsResolvedBy = resolvedStatuses.includes(status);

	for (const reportId of reportIds) {
		try {
			const updateData: TablesUpdate<'bug_reports'> = { status };

			if (needsResolvedBy) {
				updateData.resolved_by = user.id;
				updateData.resolved_at = new Date().toISOString();
			}

			// Zéro ligne touchée (rapport inconnu ou refus de la RLS) est un échec
			// pour cet identifiant, pas un succès : le compte rendu doit le dire.
			const { data: updatedRows, error: updateError } = await locals.supabase
				.from('bug_reports')
				.update(updateData)
				.eq('id', reportId)
				.select('id');

			if (updateError) {
				failed.push({ id: reportId, reason: 'Erreur de mise à jour' });
			} else if (!updatedRows || updatedRows.length === 0) {
				failed.push({ id: reportId, reason: 'Rapport introuvable ou non modifiable' });
			} else {
				updated.push(reportId);
			}
		} catch {
			failed.push({ id: reportId, reason: 'Erreur inattendue' });
		}
	}

	// `success` n'est vrai que si TOUS les rapports demandés ont été modifiés.
	return json({
		success: failed.length === 0,
		updated: updated.length,
		failed
	});
};

// =============================================================================
// DELETE /api/bug-reports/batch - Batch delete
// =============================================================================

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const { profile } = await requireAuth(locals);

	if (profile.role !== 'admin') {
		throw error(403, 'Seuls les administrateurs peuvent effectuer des opérations en lot');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = batchDeleteBugReportsSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { reportIds } = validation.data;
	const deleted: string[] = [];
	const failed: { id: string; reason: string }[] = [];

	for (const reportId of reportIds) {
		try {
			// Même règle que pour la mise à jour : zéro ligne = échec pour cet identifiant.
			const { data: deletedRows, error: deleteError } = await locals.supabase
				.from('bug_reports')
				.delete()
				.eq('id', reportId)
				.select('id');

			if (deleteError) {
				failed.push({ id: reportId, reason: 'Erreur de suppression' });
			} else if (!deletedRows || deletedRows.length === 0) {
				failed.push({ id: reportId, reason: 'Rapport introuvable ou non supprimable' });
			} else {
				deleted.push(reportId);
			}
		} catch {
			failed.push({ id: reportId, reason: 'Erreur inattendue' });
		}
	}

	// `success` n'est vrai que si TOUS les rapports demandés ont été supprimés.
	return json({
		success: failed.length === 0,
		deleted: deleted.length,
		failed
	});
};
