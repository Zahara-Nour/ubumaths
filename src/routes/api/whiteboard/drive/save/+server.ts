/**
 * Whiteboard Save to Google Drive Endpoint
 * =========================================
 *
 * Endpoint: POST /api/whiteboard/drive/save
 * Purpose: Save whiteboard document to Google Drive
 *
 * Features:
 * - Creates new file or updates existing
 * - Stores in "Chiphre Whiteboards" folder
 * - Validates document structure
 * - Uses custom MIME type for .ubw files
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
import { saveToDriveRequestSchema } from '$lib/server/validation/whiteboard-drive';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { validateUbwFile, serializeDocument } from '$lib/whiteboard/utils/file-operations';
import { DRIVE_MIME_TYPE } from '$lib/whiteboard/utils/sync-state';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/whiteboard/drive/save/+server');

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
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = saveToDriveRequestSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const {
		document,
		fileName,
		fileId,
		folderId: requestedFolderId,
		thumbnail,
		isAutosave,
		originalFileId
	} = validation.data;

	// Debug: log what we received
	logger.info('[Whiteboard Drive Save] Request received:', {
		fileId: fileId || 'undefined (will create new)',
		requestedFolderId: requestedFolderId || 'undefined (will use root)',
		fileName,
		hasThumbnail: !!thumbnail,
		isAutosave: isAutosave || false,
		originalFileId: originalFileId || 'none'
	});

	// Validate document structure
	const documentJson = JSON.stringify(document);
	const docValidation = validateUbwFile(documentJson);
	if (!docValidation.valid) {
		throw error(400, `Document invalide : ${docValidation.error}`);
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
		// For autosaves, add _autosave suffix before extension
		let finalFileName = fileName.endsWith('.ubw') ? fileName : `${fileName}.ubw`;
		if (isAutosave) {
			finalFileName = finalFileName.replace('.ubw', '_autosave.ubw');
		}

		// Handle thumbnail upload if provided (skip for autosaves to save space)
		let thumbnailFileId: string | undefined;
		if (thumbnail && !isAutosave) {
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
					logger.info(`[Whiteboard Drive] Created thumbnail ${thumbResult.id}`);
				} catch (thumbErr) {
					// Log but don't fail if thumbnail creation fails
					logger.warn('[Whiteboard Drive] Failed to create thumbnail:', thumbErr);
				}
			}
		}

		let result;
		if (fileId) {
			// Update existing file content
			result = await driveClient.updateFile(fileId, content);
			logger.info(`[Whiteboard Drive] Updated file ${fileId} for teacher ${user.id}`);

			// Only move file if folderId was EXPLICITLY provided in the request
			// This prevents auto-save (which doesn't send folderId) from moving files
			if (requestedFolderId) {
				const currentParent = await driveClient.getParentFolderId(fileId);
				if (currentParent !== requestedFolderId) {
					await driveClient.moveFile(fileId, requestedFolderId);
					logger.info(`[Whiteboard Drive] Moved file ${fileId} to folder ${requestedFolderId}`);
				}
			}

			// Update appProperties with thumbnail ID if we have a new one
			if (thumbnailFileId) {
				await driveClient.updateFileMetadata(fileId, { thumbnailFileId });
			}
		} else {
			// Create new file with thumbnail reference and autosave info in appProperties
			const appProperties: Record<string, string> = {};
			if (thumbnailFileId) {
				appProperties.thumbnailFileId = thumbnailFileId;
			}
			// Mark as autosave with reference to original file
			if (isAutosave) {
				appProperties.isAutosave = 'true';
				if (originalFileId) {
					appProperties.originalFileId = originalFileId;
				}
			}

			result = await driveClient.createFile({
				name: finalFileName,
				content,
				mimeType: DRIVE_MIME_TYPE,
				folderId,
				appProperties: Object.keys(appProperties).length > 0 ? appProperties : undefined
			});
			logger.info(
				`[Whiteboard Drive] Created ${isAutosave ? 'autosave' : 'file'} ${result.id} for teacher ${user.id}`
			);
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

		logger.error('[Whiteboard Drive] Save error:', err);
		const message = err instanceof Error ? err.message : 'erreur inconnue';
		throw error(500, `Impossible d’enregistrer sur Google Drive : ${message}`);
	}
};
