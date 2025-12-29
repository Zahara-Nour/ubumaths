/**
 * Bug Reports Config API
 * =======================
 *
 * GET   /api/bug-reports/config - Get current configuration (admin only)
 * PATCH /api/bug-reports/config - Update configuration (admin only)
 *
 * AUTH: Admin users only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { updateBugReportsConfigSchema } from '$lib/server/validation/bug-reports';
import type { BugReportsConfig } from '$lib/types/bug-reports';

// =============================================================================
// GET /api/bug-reports/config - Get current configuration
// =============================================================================

export const GET: RequestHandler = async ({ locals }) => {
	await requireRole(locals, 'admin');

	try {
		const { data: config, error: queryError } = await locals.supabase
			.from('bug_reports_config')
			.select(
				'fab_enabled, freeze_detection_enabled, freeze_prompt_enabled, auto_report_enabled, updated_at'
			)
			.eq('singleton_key', 'global')
			.single();

		if (queryError) {
			console.error('[API] Error fetching bug reports config:', queryError);
			throw error(500, 'Erreur lors de la récupération de la configuration');
		}

		if (!config) {
			throw error(404, 'Configuration non trouvée');
		}

		// Map database column names to camelCase
		const response: BugReportsConfig = {
			fabEnabled: config.fab_enabled,
			freezeDetectionEnabled: config.freeze_detection_enabled,
			freezePromptEnabled: config.freeze_prompt_enabled,
			autoReportEnabled: config.auto_report_enabled,
			updatedAt: config.updated_at
		};

		return json(response);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in GET /api/bug-reports/config:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};

// =============================================================================
// PATCH /api/bug-reports/config - Update configuration
// =============================================================================

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireRole(locals, 'admin');

	// Validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = updateBugReportsConfigSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	try {
		// Build update object with snake_case column names
		const updateData: Record<string, unknown> = {
			updated_by: user.id
		};

		if (data.fabEnabled !== undefined) {
			updateData.fab_enabled = data.fabEnabled;
		}
		if (data.freezeDetectionEnabled !== undefined) {
			updateData.freeze_detection_enabled = data.freezeDetectionEnabled;
		}
		if (data.freezePromptEnabled !== undefined) {
			updateData.freeze_prompt_enabled = data.freezePromptEnabled;
		}
		if (data.autoReportEnabled !== undefined) {
			updateData.auto_report_enabled = data.autoReportEnabled;
		}

		const { data: updatedConfig, error: updateError } = await locals.supabase
			.from('bug_reports_config')
			.update(updateData)
			.eq('singleton_key', 'global')
			.select(
				'fab_enabled, freeze_detection_enabled, freeze_prompt_enabled, auto_report_enabled, updated_at'
			)
			.single();

		if (updateError) {
			console.error('[API] Error updating bug reports config:', updateError);
			throw error(500, 'Erreur lors de la mise à jour de la configuration');
		}

		if (!updatedConfig) {
			throw error(404, 'Configuration non trouvée');
		}

		// Map database column names to camelCase
		const response: BugReportsConfig = {
			fabEnabled: updatedConfig.fab_enabled,
			freezeDetectionEnabled: updatedConfig.freeze_detection_enabled,
			freezePromptEnabled: updatedConfig.freeze_prompt_enabled,
			autoReportEnabled: updatedConfig.auto_report_enabled,
			updatedAt: updatedConfig.updated_at
		};

		return json(response);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in PATCH /api/bug-reports/config:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
