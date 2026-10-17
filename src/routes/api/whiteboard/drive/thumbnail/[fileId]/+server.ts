/**
 * Whiteboard Drive Thumbnail Proxy Endpoint
 * ==========================================
 *
 * Endpoint: GET /api/whiteboard/drive/thumbnail/[fileId]
 * Purpose: Proxy thumbnail images from Google Drive with authentication
 *
 * Why this is needed:
 * - Direct Drive URLs require OAuth authentication
 * - Browser <img> tags can't send OAuth headers
 * - This endpoint fetches the image using user's token and returns it
 *
 * Security:
 * - Teacher role required
 * - User can only access thumbnails they own (via their OAuth token)
 * - Images are fetched server-side with proper auth
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { GoogleNotConnectedError, GoogleTokenExpiredError } from '$lib/server/google/errors';
import { requireRole } from '$lib/server/middleware/auth';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/whiteboard/drive/thumbnail/[fileId]/+server');

/** Google Drive file ID pattern: alphanumeric with dashes and underscores, 10-50 chars */
const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{10,50}$/;

const fileIdSchema = z
	.string()
	.regex(DRIVE_FILE_ID_REGEX, 'Identifiant de fichier Google Drive invalide');

/**
 * Get thumbnail image from Google Drive
 *
 * Fetches the thumbnail file content using user's OAuth token
 * and returns it with appropriate Content-Type header
 */
export const GET: RequestHandler = async ({ params, locals, setHeaders }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	const { fileId } = params;
	if (!fileId) {
		throw error(400, 'Identifiant de fichier requis');
	}

	// Validate file ID format
	const validation = fileIdSchema.safeParse(fileId);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	try {
		// Get access token (with automatic refresh if needed)
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);

		// Get file metadata to determine content type
		const metadata = await driveClient.getFileMetadata(fileId);

		// Validate it's an image
		if (!metadata.mimeType.startsWith('image/')) {
			throw error(400, 'Ce fichier n’est pas une image');
		}

		// Fetch the file content using authenticated client
		// For thumbnails we need to use the raw download URL with alt=media
		const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, 'Miniature introuvable');
			}
			if (response.status === 403) {
				throw error(403, 'Accès refusé à la miniature');
			}
			throw error(response.status, 'Impossible de charger la miniature depuis Google Drive');
		}

		// Get image data
		const imageData = await response.arrayBuffer();

		// Set cache headers (thumbnails rarely change)
		setHeaders({
			'Content-Type': metadata.mimeType,
			'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
			'Content-Length': imageData.byteLength.toString()
		});

		// Return the image data
		return new Response(imageData);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle specific Google API errors
		if (err instanceof Error) {
			if (err instanceof GoogleNotConnectedError) {
				throw error(401, 'Compte Google non connecté');
			}
			if (err instanceof GoogleTokenExpiredError || err.message.includes('401')) {
				throw error(401, 'Session Google expirée');
			}
			if (err.message.includes('403')) {
				throw error(403, 'Droits insuffisants');
			}
			if (err.message.includes('404')) {
				throw error(404, 'Miniature introuvable');
			}
		}

		logger.error('[Whiteboard Drive Thumbnail] Error:', err);
		const message = err instanceof Error ? err.message : 'erreur inconnue';
		throw error(500, `Impossible de charger la miniature : ${message}`);
	}
};
