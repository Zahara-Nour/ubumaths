/**
 * Whiteboard Save to Google Drive Endpoint
 * =========================================
 *
 * Endpoint: POST /api/whiteboard/drive/save
 * Purpose: Save whiteboard document to Google Drive
 *
 * Features:
 * - Creates new file or updates existing
 * - Stores in "UbuMaths Whiteboards" folder
 * - Validates document structure
 * - Uses custom MIME type for .ubw files
 *
 * Security:
 * - Teacher role required
 * - Requires Google integration with drive.file scope
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { saveToDriveRequestSchema } from '$lib/server/validation/whiteboard-drive';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { validateUbwFile, serializeDocument } from '$lib/whiteboard/utils/file-operations';
import { DRIVE_MIME_TYPE } from '$lib/whiteboard/utils/sync-state';

/**
 * Save whiteboard document to Google Drive
 *
 * Creates new file if fileId not provided, otherwise updates existing
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

	const validation = saveToDriveRequestSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { document, fileName, fileId, folderId: requestedFolderId, thumbnail } = validation.data;

	// Validate document structure
	const documentJson = JSON.stringify(document);
	const docValidation = validateUbwFile(documentJson);
	if (!docValidation.valid) {
		throw error(400, `Invalid document: ${docValidation.error}`);
	}

	try {
		// Get access token (with automatic refresh if needed)
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);

		// Use requested folder or fall back to app root folder
		const folderId = requestedFolderId || (await driveClient.getOrCreateAppFolder());

		// Serialize document for storage
		const content = serializeDocument(docValidation.document!);

		// Ensure filename has .ubw extension
		const finalFileName = fileName.endsWith('.ubw') ? fileName : `${fileName}.ubw`;

		// Handle thumbnail upload if provided
		let thumbnailFileId: string | undefined;
		if (thumbnail) {
			// Extract base64 data and mime type from data URL
			const match = thumbnail.match(/^data:image\/(webp|jpeg|png);base64,(.+)$/);
			if (match) {
				const [, imageType, base64Data] = match;
				const thumbFileName = finalFileName.replace('.ubw', `_thumb.${imageType}`);
				const thumbMimeType = `image/${imageType}`;

				try {
					const thumbResult = await driveClient.createFile({
						name: thumbFileName,
						content: base64Data,
						mimeType: thumbMimeType,
						folderId,
						isBase64: true,
						description: `Thumbnail for ${finalFileName}`
					});
					thumbnailFileId = thumbResult.id;
					console.log(`[Whiteboard Drive] Created thumbnail ${thumbResult.id}`);
				} catch (thumbErr) {
					// Log but don't fail if thumbnail creation fails
					console.warn('[Whiteboard Drive] Failed to create thumbnail:', thumbErr);
				}
			}
		}

		let result;
		if (fileId) {
			// Update existing file
			result = await driveClient.updateFile(fileId, content);
			console.log(`[Whiteboard Drive] Updated file ${fileId} for teacher ${user.id}`);

			// Update appProperties with thumbnail ID if we have a new one
			if (thumbnailFileId) {
				await driveClient.updateFileMetadata(fileId, { thumbnailFileId });
			}
		} else {
			// Create new file with thumbnail reference in appProperties
			const appProperties: Record<string, string> = {};
			if (thumbnailFileId) {
				appProperties.thumbnailFileId = thumbnailFileId;
			}

			result = await driveClient.createFile({
				name: finalFileName,
				content,
				mimeType: DRIVE_MIME_TYPE,
				folderId,
				appProperties: Object.keys(appProperties).length > 0 ? appProperties : undefined
			});
			console.log(`[Whiteboard Drive] Created file ${result.id} for teacher ${user.id}`);
		}

		return json({
			success: true,
			fileId: result.id,
			modifiedTime: result.modifiedTime || new Date().toISOString()
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

		console.error('[Whiteboard Drive] Save error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, `Failed to save to Drive: ${message}`);
	}
};
