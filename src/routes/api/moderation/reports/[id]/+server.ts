import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/moderation/reports/[id]/+server');

/**
 * Review report request schema
 */
const reviewReportSchema = z.object({
	status: z.enum(['reviewed', 'dismissed', 'actioned'], {
		message: 'Status must be: reviewed, dismissed, or actioned'
	}),
	reviewNotes: z.string().max(1000, 'Review notes cannot exceed 1000 characters').optional(),
	deleteMessage: z.boolean().optional().default(false)
});

/**
 * PUT /api/moderation/reports/[id]
 *
 * Review a message report (teacher action)
 *
 * URL params:
 * - id: UUID - Report ID to review
 *
 * Request body:
 * - status: 'reviewed' | 'dismissed' | 'actioned'
 * - reviewNotes: string (optional, max 1000 chars)
 * - deleteMessage: boolean (optional, default false)
 *
 * Responses:
 * - 200: Report reviewed successfully
 * - 400: Validation failed
 * - 401: Not authenticated
 * - 403: Not a teacher/admin
 * - 404: Report not found
 * - 500: Database error
 */
export const PUT: RequestHandler = async ({ request, params, locals }) => {
	// 1. Check authentication
	if (!locals.user || !locals.profile) {
		throw error(401, 'Not authenticated');
	}

	// 2. Check teacher role
	if (!['teacher', 'admin'].includes(locals.profile.role)) {
		throw error(403, 'Only teachers can review reports');
	}

	// 3. Validate report ID
	const reportId = params.id;
	if (
		!reportId ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId)
	) {
		throw error(400, 'Invalid report ID');
	}

	// 4. Parse and validate input
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = reviewReportSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { status, reviewNotes, deleteMessage } = validation.data;

	// 5. Vérifier que le signalement existe. La RPC `review_report` (SECURITY
	// DEFINER, `RETURNS void`) fait un UPDATE sans compter les lignes : un
	// identifiant inconnu rendait « succès » sur zéro ligne modifiée. Le prof et
	// l'admin voient tous les signalements (policy « Teachers can view all
	// reports ») : une absence ici est une vraie absence.
	const { data: existingReport, error: fetchError } = await locals.supabase
		.from('message_reports')
		.select('id')
		.eq('id', reportId)
		.maybeSingle();

	if (fetchError) {
		logger.error('Failed to fetch report:', fetchError);
		throw error(500, 'Impossible de vérifier le signalement');
	}

	if (!existingReport) {
		throw error(404, 'Signalement introuvable');
	}

	// 6. Call review_report RPC
	const { error: reviewError } = await locals.supabase.rpc('review_report', {
		p_report_id: reportId,
		p_new_status: status,
		// Paramètre `DEFAULT NULL` : l'omettre applique le même défaut.
		p_review_notes: reviewNotes ?? undefined,
		p_delete_message: deleteMessage
	});

	if (reviewError) {
		logger.error('Failed to review report:', reviewError);

		if (reviewError.message.includes('Permission denied')) {
			throw error(403, 'Permission denied');
		}
		if (reviewError.message.includes('Invalid status')) {
			throw error(400, 'Invalid status');
		}

		throw error(500, 'Failed to review report');
	}

	return json({ success: true });
};
