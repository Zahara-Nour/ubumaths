/**
 * Bug Report Detail API
 * ======================
 *
 * GET   /api/bug-reports/[reportId] - Get report details
 * PATCH /api/bug-reports/[reportId] - Update report (user: pending only, admin: all)
 * DELETE /api/bug-reports/[reportId] - Delete report (admin only)
 *
 * AUTH: Authenticated users (own reports) or admin
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import {
	updateBugReportUserSchema,
	updateBugReportAdminSchema
} from '$lib/server/validation/bug-reports';
import { z } from 'zod';

const reportIdSchema = z.string().uuid('ID de rapport invalide');

// =============================================================================
// GET /api/bug-reports/[reportId] - Get report details
// =============================================================================

export const GET: RequestHandler = async ({ params, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const isAdmin = profile.role === 'admin';

	// Validate report ID
	const idValidation = reportIdSchema.safeParse(params.reportId);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	try {
		const { data: report, error: queryError } = await locals.supabase
			.from('bug_reports')
			.select(
				`
				*,
				author:profiles!bug_reports_user_id_fkey (
					id,
					full_name,
					email,
					role
				),
				resolver:profiles!bug_reports_resolved_by_fkey (
					id,
					full_name
				)
			`
			)
			.eq('id', params.reportId)
			.single();

		if (queryError) {
			if (queryError.code === 'PGRST116') {
				throw error(404, 'Rapport non trouvé');
			}
			console.error('[API] Error fetching bug report:', queryError);
			throw error(500, 'Erreur lors de la récupération du rapport');
		}

		// Check access: user can only see their own reports (RLS handles this, but double-check)
		if (!isAdmin && report.user_id !== user.id) {
			throw error(403, 'Accès non autorisé');
		}

		return json({ report });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in GET /api/bug-reports/[reportId]:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};

// =============================================================================
// PATCH /api/bug-reports/[reportId] - Update report
// =============================================================================

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const isAdmin = profile.role === 'admin';

	// Validate report ID
	const idValidation = reportIdSchema.safeParse(params.reportId);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const body = await request.json();

	try {
		// First, fetch the current report to check ownership and status
		const { data: existingReport, error: fetchError } = await locals.supabase
			.from('bug_reports')
			.select('id, user_id, status')
			.eq('id', params.reportId)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				throw error(404, 'Rapport non trouvé');
			}
			throw error(500, 'Erreur lors de la récupération du rapport');
		}

		// Determine which schema to use based on role
		if (isAdmin) {
			// Admin can update status and resolution notes
			const validation = updateBugReportAdminSchema.safeParse(body);
			if (!validation.success) {
				throw error(400, validation.error.issues[0].message);
			}

			const updateData: Record<string, unknown> = {};

			if (validation.data.status !== undefined) {
				updateData.status = validation.data.status;

				// If resolving, set resolved_by and resolved_at
				if (['resolved', 'wont_fix', 'duplicate'].includes(validation.data.status)) {
					updateData.resolved_by = user.id;
					updateData.resolved_at = new Date().toISOString();
				}
			}

			if (validation.data.resolutionNotes !== undefined) {
				updateData.resolution_notes = validation.data.resolutionNotes;
			}

			const { data: updatedReport, error: updateError } = await locals.supabase
				.from('bug_reports')
				.update(updateData)
				.eq('id', params.reportId)
				.select()
				.single();

			if (updateError) {
				console.error('[API] Error updating bug report:', updateError);
				throw error(500, 'Erreur lors de la mise à jour du rapport');
			}

			return json({ success: true, report: updatedReport });
		} else {
			// User can only update their own pending reports
			if (existingReport.user_id !== user.id) {
				throw error(403, 'Accès non autorisé');
			}

			if (existingReport.status !== 'pending') {
				throw error(400, 'Seuls les rapports en attente peuvent être modifiés');
			}

			const validation = updateBugReportUserSchema.safeParse(body);
			if (!validation.success) {
				throw error(400, validation.error.issues[0].message);
			}

			const updateData: Record<string, unknown> = {};

			if (validation.data.title !== undefined) {
				updateData.title = validation.data.title;
			}

			if (validation.data.description !== undefined) {
				updateData.description = validation.data.description;
			}

			const { data: updatedReport, error: updateError } = await locals.supabase
				.from('bug_reports')
				.update(updateData)
				.eq('id', params.reportId)
				.select()
				.single();

			if (updateError) {
				console.error('[API] Error updating bug report:', updateError);
				throw error(500, 'Erreur lors de la mise à jour du rapport');
			}

			return json({ success: true, report: updatedReport });
		}
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in PATCH /api/bug-reports/[reportId]:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};

// =============================================================================
// DELETE /api/bug-reports/[reportId] - Delete report (admin only)
// =============================================================================

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { profile } = await requireAuth(locals);

	if (profile.role !== 'admin') {
		throw error(403, 'Seuls les administrateurs peuvent supprimer des rapports');
	}

	// Validate report ID
	const idValidation = reportIdSchema.safeParse(params.reportId);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	try {
		const { error: deleteError } = await locals.supabase
			.from('bug_reports')
			.delete()
			.eq('id', params.reportId);

		if (deleteError) {
			console.error('[API] Error deleting bug report:', deleteError);
			throw error(500, 'Erreur lors de la suppression du rapport');
		}

		return json({ success: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in DELETE /api/bug-reports/[reportId]:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
