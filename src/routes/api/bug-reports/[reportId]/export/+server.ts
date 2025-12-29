/**
 * Bug Report Export API
 * ======================
 *
 * GET /api/bug-reports/[reportId]/export - Export bug report for Claude Code
 *
 * AUTH: Admin only
 *
 * Returns: Markdown formatted bug report optimized for Claude Code debugging
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { generateClaudeCodeExport } from '$lib/server/bug-report-export';
import { z } from 'zod';

const reportIdSchema = z.string().uuid('ID de rapport invalide');

export const GET: RequestHandler = async ({ params, locals }) => {
	const { profile } = await requireAuth(locals);

	if (profile.role !== 'admin') {
		throw error(403, 'Seuls les administrateurs peuvent exporter des rapports');
	}

	// Validate report ID
	const idValidation = reportIdSchema.safeParse(params.reportId);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	try {
		// Fetch the complete report with author info
		const { data: report, error: fetchError } = await locals.supabase
			.from('bug_reports')
			.select(
				`
				*,
				author:profiles!bug_reports_user_id_fkey (
					id,
					full_name,
					email,
					role
				)
			`
			)
			.eq('id', params.reportId)
			.single();

		if (fetchError || !report) {
			if (fetchError?.code === 'PGRST116') {
				throw error(404, 'Rapport non trouvé');
			}
			console.error('[API] Error fetching bug report for export:', fetchError);
			throw error(500, 'Erreur lors de la récupération du rapport');
		}

		// Generate the export
		const exportData = generateClaudeCodeExport(report);

		// Return as downloadable markdown file
		return new Response(exportData.markdown, {
			status: 200,
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Content-Disposition': `attachment; filename="${exportData.filename}"`,
				'Cache-Control': 'no-cache'
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in GET /api/bug-reports/[reportId]/export:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
