/**
 * Admin Exercise Backup API
 * =========================
 *
 * Endpoints:
 * - GET: Export backup (JSON or SQL format)
 * - POST: Restore from backup JSON
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
	exportBackupJSON,
	exportBackupSQL,
	restoreFromBackup
} from '$lib/server/admin/exercise-backup';
import { isBackupSizeValid, getMaxFileSizeDisplay } from '$lib/server/validation/backup';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const exportQuerySchema = z.object({
	format: z.enum(['json', 'sql']).default('json')
});

const restoreBodySchema = z.object({
	backup: z.unknown(),
	options: z.object({
		conflict_strategy: z.enum(['skip', 'replace']).default('skip'),
		reassign_orphans_to_admin: z.boolean().default(false)
	})
});

// ============================================================================
// GET - Export Backup
// ============================================================================

/**
 * GET /api/admin/exercises/backup
 *
 * Export complete exercise backup in JSON or SQL format
 *
 * Query parameters:
 *   - format: 'json' (default) | 'sql'
 *
 * Response:
 *   - JSON format: ExerciseBackup object
 *   - SQL format: Plain text SQL dump
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Acces reserve aux administrateurs');
	}

	// 3. Parse query parameters
	const params = {
		format: url.searchParams.get('format') ?? 'json'
	};

	const queryValidation = exportQuerySchema.safeParse(params);
	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { format } = queryValidation.data;

	try {
		const adminEmail = locals.profile.email ?? 'admin@unknown';

		if (format === 'sql') {
			const sqlDump = await exportBackupSQL(locals.supabase, adminEmail);
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

			return new Response(sqlDump, {
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Content-Disposition': `attachment; filename="ubumaths-exercises-backup-${timestamp}.sql"`
				}
			});
		}

		// JSON format (default)
		const backup = await exportBackupJSON(locals.supabase, adminEmail);
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

		return new Response(JSON.stringify(backup, null, 2), {
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="ubumaths-exercises-backup-${timestamp}.json"`
			}
		});
	} catch (err) {
		console.error('Error exporting backup:', err);
		throw error(500, "Erreur lors de l'export du backup");
	}
};

// ============================================================================
// POST - Restore from Backup
// ============================================================================

/**
 * POST /api/admin/exercises/backup
 *
 * Restore exercises from a backup JSON file
 *
 * Body: {
 *   backup: ExerciseBackup,
 *   options: {
 *     conflict_strategy: 'skip' | 'replace',
 *     reassign_orphans_to_admin: boolean
 *   }
 * }
 *
 * Response: RestoreResult
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Acces reserve aux administrateurs');
	}

	// 3. Check content length (size limit)
	const contentLength = request.headers.get('content-length');
	if (contentLength) {
		const size = parseInt(contentLength, 10);
		if (!isBackupSizeValid(size)) {
			throw error(413, `Fichier trop volumineux. Taille maximale: ${getMaxFileSizeDisplay()}`);
		}
	}

	// 4. Parse request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	// 5. Validate body structure
	const bodyValidation = restoreBodySchema.safeParse(body);
	if (!bodyValidation.success) {
		throw error(400, bodyValidation.error.issues[0].message);
	}

	const { backup, options } = bodyValidation.data;

	try {
		// Add admin_id to options for orphan reassignment
		const restoreOptions = {
			...options,
			admin_id: options.reassign_orphans_to_admin ? locals.profile.id : undefined
		};

		const result = await restoreFromBackup(locals.supabase, backup, restoreOptions);

		// Return result with appropriate status
		if (!result.success) {
			return json(result, { status: 207 }); // Multi-Status (partial success)
		}

		return json(result);
	} catch (err) {
		console.error('Error restoring backup:', err);
		throw error(500, 'Erreur lors de la restauration du backup');
	}
};
