/**
 * Whiteboard Load from Google Drive Endpoint
 * ==========================================
 *
 * Endpoint: GET /api/whiteboard/drive/load/[fileId]
 * Purpose: Load whiteboard document from Google Drive
 *
 * Features:
 * - Downloads file content from Drive
 * - Validates document structure
 * - Returns parsed whiteboard document
 *
 * Security:
 * - Teacher role required
 * - Requires Google integration with drive.file scope
 * - Only accesses files created by the app (drive.file scope)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	GoogleNotConnectedError,
	GoogleTokenExpiredError,
	GoogleInsufficientPermissionsError
} from '$lib/server/google/errors';
import { requireRole } from '$lib/server/middleware/auth';
import { loadFromDriveParamsSchema } from '$lib/server/validation/whiteboard-drive';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { validateUbwFile } from '$lib/whiteboard/utils/file-operations';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/whiteboard/drive/load/[fileId]/+server');

/**
 * Load whiteboard document from Google Drive
 *
 * Returns validated whiteboard document with metadata
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Validate fileId parameter
	const validation = loadFromDriveParamsSchema.safeParse(params);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { fileId } = validation.data;

	try {
		// Get access token (with automatic refresh if needed)
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);

		// Get file content
		const content = await driveClient.getFileContent(fileId);

		// Validate document structure
		const docValidation = validateUbwFile(content);
		if (!docValidation.valid) {
			throw error(400, `Document invalide : ${docValidation.error}`);
		}

		// Get file metadata for name and modifiedTime
		const metadata = await driveClient.getFileMetadata(fileId);

		logger.info(`[Whiteboard Drive] Loaded file ${fileId} for teacher ${user.id}`);

		return json({
			document: docValidation.document,
			fileId,
			name: metadata.name,
			modifiedTime: metadata.modifiedTime || ''
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle specific Google API errors
		if (err instanceof Error) {
			if (err instanceof GoogleNotConnectedError) {
				throw error(401, 'Compte Google non connecté : à connecter dans les Paramètres');
			}
			if (err instanceof GoogleTokenExpiredError || err.message.includes('401')) {
				throw error(401, 'Session Google expirée : reconnecter le compte Google');
			}
			if (err.message.includes('404') || err.message.includes('Not found')) {
				throw error(404, 'Fichier introuvable sur Google Drive');
			}
			if (err instanceof GoogleInsufficientPermissionsError || err.message.includes('403')) {
				throw error(403, 'Accès refusé à ce fichier');
			}
		}

		logger.error('[Whiteboard Drive] Load error:', err);
		const message = err instanceof Error ? err.message : 'erreur inconnue';
		throw error(500, `Impossible de charger depuis Google Drive : ${message}`);
	}
};
