/**
 * Server load function for teacher error report detail page
 *
 * Fetches a single error report with exercise content for review.
 * Uses the API endpoint to ensure consistent data format.
 */
import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid();

export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Validate UUIDs
	const worksheetIdValidation = uuidSchema.safeParse(params.id);
	const assignmentIdValidation = uuidSchema.safeParse(params.assignmentId);
	const reportIdValidation = uuidSchema.safeParse(params.reportId);

	if (!worksheetIdValidation.success) {
		throw error(400, 'ID de feuille invalide');
	}
	if (!assignmentIdValidation.success) {
		throw error(400, "ID d'assignation invalide");
	}
	if (!reportIdValidation.success) {
		throw error(400, 'ID de signalement invalide');
	}

	// Fetch report detail via API
	const reportResponse = await fetch(
		`/api/worksheets/${params.id}/assignments/${params.assignmentId}/reports/${params.reportId}`
	);

	if (!reportResponse.ok) {
		if (reportResponse.status === 404) {
			throw error(404, 'Signalement non trouve');
		}
		if (reportResponse.status === 403) {
			throw error(403, 'Acces refuse');
		}
		throw error(500, 'Erreur lors du chargement du signalement');
	}

	const data = await reportResponse.json();

	return {
		report: data.report,
		exercise: data.exercise,
		context: data.context,
		nextPendingReportId: data.next_pending_report_id,
		worksheetId: params.id,
		assignmentId: params.assignmentId,
		user
	};
};
