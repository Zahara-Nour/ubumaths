/**
 * Whiteboard Autosave Management Endpoint
 * =======================================
 *
 * Endpoint: /api/whiteboard/drive/autosave/[fileId]
 * Purpose: Find and manage autosave files for a given original file
 *
 * Methods:
 * - GET: Find autosave for the given original fileId
 * - DELETE: Delete autosave for the given original fileId
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
import { DRIVE_FILE_ID_REGEX } from '$lib/server/validation/whiteboard-drive';

/**
 * Find autosave for a given original file
 * Returns autosave metadata if found and more recent than original
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireRole(locals, 'teacher');
	const { fileId } = params;

	// Validate fileId
	if (!fileId || !DRIVE_FILE_ID_REGEX.test(fileId)) {
		throw error(400, 'Invalid file ID');
	}

	try {
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);

		// Find autosave for this file
		const autosave = await driveClient.findAutosaveForFile(fileId);

		if (!autosave) {
			return json({
				found: false,
				autosave: null
			});
		}

		// Get original file's modifiedTime to compare
		const originalFile = await driveClient.getFileMetadata(fileId);

		const autosaveTime = new Date(autosave.modifiedTime || 0).getTime();
		const originalTime = new Date(originalFile.modifiedTime || 0).getTime();

		return json({
			found: true,
			autosave: {
				id: autosave.id,
				name: autosave.name,
				modifiedTime: autosave.modifiedTime
			},
			isMoreRecent: autosaveTime > originalTime,
			originalModifiedTime: originalFile.modifiedTime
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Whiteboard Drive] Autosave lookup error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, `Failed to find autosave: ${message}`);
	}
};

/**
 * Delete autosave for a given original file
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireRole(locals, 'teacher');
	const { fileId } = params;

	// Validate fileId
	if (!fileId || !DRIVE_FILE_ID_REGEX.test(fileId)) {
		throw error(400, 'Invalid file ID');
	}

	try {
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);

		// Find autosave for this file
		const autosave = await driveClient.findAutosaveForFile(fileId);

		if (!autosave) {
			return json({
				success: true,
				deleted: false,
				message: 'No autosave found'
			});
		}

		// Delete the autosave
		await driveClient.deleteFile(autosave.id);
		console.log(`[Whiteboard Drive] Deleted autosave ${autosave.id} for original ${fileId}`);

		return json({
			success: true,
			deleted: true,
			deletedFileId: autosave.id
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Whiteboard Drive] Autosave delete error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, `Failed to delete autosave: ${message}`);
	}
};
