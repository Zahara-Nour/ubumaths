/**
 * Whiteboard List from Google Drive Endpoint
 * ==========================================
 *
 * Endpoint: GET /api/whiteboard/drive/list
 * Purpose: List whiteboard files from Google Drive
 *
 * Features:
 * - Lists .ubw files from "UbuMaths Whiteboards" folder
 * - Returns file metadata (id, name, modifiedTime)
 * - Sorted by modification time (newest first)
 *
 * Security:
 * - Teacher role required
 * - Requires Google integration with drive.file scope
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { DRIVE_MIME_TYPE } from '$lib/whiteboard/utils/sync-state';

/**
 * Construct proxy URL for thumbnail
 * Uses our proxy endpoint instead of direct Drive URL
 * because direct URLs require OAuth which <img> tags can't provide
 */
function getThumbnailUrl(fileId: string): string {
	return `/api/whiteboard/drive/thumbnail/${fileId}`;
}

/**
 * List whiteboard files from Google Drive
 *
 * Returns array of file metadata sorted by modification time
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	try {
		// Get access token (with automatic refresh if needed)
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);

		// Get or create the app folder
		const folderId = await driveClient.getOrCreateAppFolder();

		// List files with our MIME type, including appProperties for thumbnail IDs
		const files = await driveClient.listFiles(folderId, DRIVE_MIME_TYPE, true);

		console.log(`[Whiteboard Drive] Listed ${files.length} files for teacher ${user.id}`);

		return json({
			files: files.map((f) => {
				const thumbnailFileId = f.appProperties?.thumbnailFileId;
				return {
					id: f.id,
					name: f.name,
					modifiedTime: f.modifiedTime || '',
					thumbnailUrl: thumbnailFileId ? getThumbnailUrl(thumbnailFileId) : undefined
				};
			})
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle specific Google API errors
		if (err instanceof Error) {
			if (err.message.includes('No Google integration')) {
				throw error(401, 'Google account not connected. Please connect in Settings.');
			}
			if (err.message.includes('Token expired') || err.message.includes('401')) {
				throw error(401, 'Google session expired. Please reconnect your Google account.');
			}
		}

		console.error('[Whiteboard Drive] List error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, `Failed to list Drive files: ${message}`);
	}
};
