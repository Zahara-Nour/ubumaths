/**
 * Whiteboard Create Folder Endpoint
 * ==================================
 *
 * Endpoint: POST /api/whiteboard/drive/folder
 * Purpose: Create a subfolder in Google Drive
 *
 * Features:
 * - Creates subfolder in specified parent folder
 * - Returns new folder ID
 *
 * Security:
 * - Teacher role required
 * - Requires Google integration with drive.file scope
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	GoogleNotConnectedError,
	GoogleTokenExpiredError,
	GoogleInsufficientPermissionsError
} from '$lib/server/google/errors';
import { requireRole } from '$lib/server/middleware/auth';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { createFolderRequestSchema } from '$lib/server/validation/whiteboard-drive';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/whiteboard/drive/folder/+server');

/**
 * Create a subfolder in Google Drive
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = createFolderRequestSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { name, parentFolderId } = validation.data;

	try {
		// Get access token (with automatic refresh if needed)
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);

		// Create the folder
		const folderId = await driveClient.createFolder(name, parentFolderId);

		logger.info(`[Whiteboard Drive] Created folder "${name}" (${folderId}) for teacher ${user.id}`);

		return json({
			success: true,
			folderId,
			name
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
			if (err instanceof GoogleInsufficientPermissionsError || err.message.includes('403')) {
				throw error(
					403,
					'Droits insuffisants : reconnecter le compte Google avec l’accès à Google Drive'
				);
			}
		}

		logger.error('[Whiteboard Drive] Create folder error:', err);
		const message = err instanceof Error ? err.message : 'erreur inconnue';
		throw error(500, `Impossible de créer le dossier : ${message}`);
	}
};
