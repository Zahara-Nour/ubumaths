/**
 * Whiteboard List from Google Drive Endpoint
 * ==========================================
 *
 * Endpoint: GET /api/whiteboard/drive/list
 * Purpose: List whiteboard files and folders from Google Drive
 *
 * Features:
 * - Lists .ubw files from specified folder (or app root)
 * - Lists subfolders for navigation
 * - Returns file metadata (id, name, modifiedTime)
 * - Sorted by modification time (newest first)
 *
 * Query params:
 * - folderId: Optional folder ID to list from (defaults to app root)
 *
 * Security:
 * - Teacher role required
 * - Requires Google integration with drive.file scope
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleNotConnectedError, GoogleTokenExpiredError } from '$lib/server/google/errors';
import { requireRole } from '$lib/server/middleware/auth';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { DRIVE_MIME_TYPE } from '$lib/whiteboard/utils/sync-state';
import { listFilesQuerySchema } from '$lib/server/validation/whiteboard-drive';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/whiteboard/drive/list/+server');

/**
 * Construct proxy URL for thumbnail
 * Uses our proxy endpoint instead of direct Drive URL
 * because direct URLs require OAuth which <img> tags can't provide
 */
function getThumbnailUrl(fileId: string): string {
	return `/api/whiteboard/drive/thumbnail/${fileId}`;
}

/**
 * List whiteboard files and folders from Google Drive
 *
 * Returns files and folders for the specified folder (or app root)
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse query params
	const queryParams = {
		folderId: url.searchParams.get('folderId') || undefined
	};
	const validation = listFilesQuerySchema.safeParse(queryParams);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { folderId: requestedFolderId } = validation.data;

	try {
		// Get access token (with automatic refresh if needed)
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);

		// Get app folder ID (root)
		const appFolderId = await driveClient.getOrCreateAppFolder();

		// Determine which folder to list from
		const targetFolderId = requestedFolderId || appFolderId;
		const isRootFolder = targetFolderId === appFolderId;

		// Get parent folder ID for navigation (null if at root)
		let parentFolderId: string | null = null;
		if (!isRootFolder) {
			parentFolderId = await driveClient.getParentFolderId(targetFolderId);
			// If parent is the app folder, set to null (represents root)
			if (parentFolderId === appFolderId) {
				parentFolderId = null;
			}
		}

		// List files with our MIME type, including appProperties for thumbnail IDs
		const files = await driveClient.listFiles(targetFolderId, DRIVE_MIME_TYPE, true);

		// List subfolders
		const folders = await driveClient.listFolders(targetFolderId);

		logger.info(
			`[Whiteboard Drive] Listed ${files.length} files and ${folders.length} folders for teacher ${user.id}`
		);

		// Filter out autosave files from the gallery
		const visibleFiles = files.filter((f) => f.appProperties?.isAutosave !== 'true');

		return json({
			files: visibleFiles.map((f) => {
				const thumbnailFileId = f.appProperties?.thumbnailFileId;
				return {
					id: f.id,
					name: f.name,
					modifiedTime: f.modifiedTime || '',
					thumbnailUrl: thumbnailFileId ? getThumbnailUrl(thumbnailFileId) : undefined
				};
			}),
			folders: folders.map((f) => ({
				id: f.id,
				name: f.name
			})),
			currentFolderId: isRootFolder ? null : targetFolderId,
			parentFolderId,
			appFolderId
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
		}

		logger.error('[Whiteboard Drive] List error:', {
			error: err,
			requestedFolderId,
			userId: user.id
		});
		const message = err instanceof Error ? err.message : 'erreur inconnue';
		throw error(500, `Impossible de lister les fichiers Google Drive : ${message}`);
	}
};
