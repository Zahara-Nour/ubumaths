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
import { requireRole } from '$lib/server/middleware/auth';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { createFolderRequestSchema } from '$lib/server/validation/whiteboard-drive';

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
		throw error(400, 'Invalid JSON body');
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

		console.log(`[Whiteboard Drive] Created folder "${name}" (${folderId}) for teacher ${user.id}`);

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
			if (err.message.includes('No Google integration')) {
				throw error(401, 'Google account not connected. Please connect in Settings.');
			}
			if (err.message.includes('Token expired') || err.message.includes('401')) {
				throw error(401, 'Google session expired. Please reconnect your Google account.');
			}
			if (err.message.includes('403') || err.message.includes('Insufficient')) {
				throw error(403, 'Insufficient permissions. Please reconnect with Drive access.');
			}
		}

		console.error('[Whiteboard Drive] Create folder error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, `Failed to create folder: ${message}`);
	}
};
