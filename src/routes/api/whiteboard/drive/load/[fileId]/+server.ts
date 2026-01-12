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
import { requireRole } from '$lib/server/middleware/auth';
import { loadFromDriveParamsSchema } from '$lib/server/validation/whiteboard-drive';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { validateUbwFile } from '$lib/whiteboard/utils/file-operations';

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
			throw error(400, `Invalid document: ${docValidation.error}`);
		}

		// Get file metadata for name and modifiedTime
		const metadata = await driveClient.getFileMetadata(fileId);

		console.log(`[Whiteboard Drive] Loaded file ${fileId} for teacher ${user.id}`);

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
			if (err.message.includes('No Google integration')) {
				throw error(401, 'Google account not connected. Please connect in Settings.');
			}
			if (err.message.includes('Token expired') || err.message.includes('401')) {
				throw error(401, 'Google session expired. Please reconnect your Google account.');
			}
			if (err.message.includes('404') || err.message.includes('Not found')) {
				throw error(404, 'File not found on Google Drive.');
			}
			if (err.message.includes('403') || err.message.includes('Insufficient')) {
				throw error(403, 'Access denied to this file.');
			}
		}

		console.error('[Whiteboard Drive] Load error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, `Failed to load from Drive: ${message}`);
	}
};
