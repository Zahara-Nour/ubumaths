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
import { requireRole } from '$lib/server/middleware/auth';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { GoogleDriveClient } from '$lib/server/google/drive-api';

/** Google Drive file ID pattern: alphanumeric with dashes and underscores, 10-50 chars */
const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{10,50}$/;

const fileIdSchema = z.string().regex(DRIVE_FILE_ID_REGEX, 'Invalid Google Drive file ID');

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
		throw error(400, 'File ID required');
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
			throw error(400, 'File is not an image');
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
				throw error(404, 'Thumbnail not found');
			}
			if (response.status === 403) {
				throw error(403, 'Access denied to thumbnail');
			}
			throw error(response.status, 'Failed to fetch thumbnail from Drive');
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
			if (err.message.includes('No Google integration')) {
				throw error(401, 'Google account not connected');
			}
			if (err.message.includes('Token expired') || err.message.includes('401')) {
				throw error(401, 'Google session expired');
			}
			if (err.message.includes('403')) {
				throw error(403, 'Insufficient permissions');
			}
			if (err.message.includes('404')) {
				throw error(404, 'Thumbnail not found');
			}
		}

		console.error('[Whiteboard Drive Thumbnail] Error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, `Failed to fetch thumbnail: ${message}`);
	}
};
