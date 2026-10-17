/**
 * Exercise Image Upload API
 * =========================
 *
 * Endpoint: POST /api/exercises/images
 *
 * Uploads exercise images to Supabase Storage with automatic metadata extraction.
 * Returns image URL, dimensions, and file metadata.
 *
 * Features:
 * - File type validation (JPEG, PNG, GIF, WebP, SVG)
 * - File size validation (max 5MB)
 * - File signature validation (magic bytes)
 * - Automatic dimension extraction
 * - Secure storage path generation
 *
 * Security:
 * - Authentication required
 * - Teachers only (role check)
 * - File signature validation prevents disguised malicious files
 *
 * @module api/exercises/images
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	uploadExerciseImage,
	validateImageFile,
	ALLOWED_IMAGE_TYPES
} from '$lib/exercises/services/image-upload';
import { extractDimensionsFromFile } from '$lib/exercises/services/image-dimension-extractor';
import {
	validateFileSignature,
	isAllowedMimeType,
	imageUploadSuccessResponseSchema,
	type ImageUploadResponse,
	type ImageMetadata
} from '$lib/server/validation/image-upload';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/exercises/images/+server');

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 10000; // 10,000 pixels

// ============================================================================
// POST /api/exercises/images
// ============================================================================

/**
 * POST /api/exercises/images
 *
 * Upload an exercise image with automatic metadata extraction.
 *
 * Request: multipart/form-data with 'image' field
 *
 * Response (success):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "url": "https://...",
 *     "width": 800,
 *     "height": 600,
 *     "aspectRatio": 1.333333,
 *     "filename": "graph.png",
 *     "size": 123456,
 *     "mimeType": "image/png"
 *   }
 * }
 * ```
 *
 * Errors:
 * - 400: Invalid file (type, size, dimensions, signature)
 * - 401: Not authenticated
 * - 403: Not a teacher or admin
 * - 500: Server error during upload
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Authentication and authorization
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// 2. Validate Content-Type header
	const contentType = request.headers.get('content-type');
	if (!contentType || !contentType.includes('multipart/form-data')) {
		throw error(400, 'La requête doit être envoyée en multipart/form-data');
	}

	// 3. Parse form data
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch (err) {
		logger.error('Error parsing form data:', err);
		throw error(400, 'Formulaire invalide');
	}

	// 4. Get image file from form
	const imageFile = formData.get('image');

	if (!imageFile) {
		throw error(400, 'Fichier image requis (champ « image »)');
	}

	if (!(imageFile instanceof File)) {
		throw error(400, 'Envoi de fichier invalide');
	}

	// 5. Validate file is not empty
	if (imageFile.size === 0) {
		throw error(400, 'Le fichier image est vide');
	}

	// 6. Validate file size
	if (imageFile.size > MAX_FILE_SIZE) {
		const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
		throw error(400, `Fichier trop lourd (${sizeMB} Mo) : 5 Mo au maximum`);
	}

	// 7. Validate MIME type is allowed
	if (!isAllowedMimeType(imageFile.type)) {
		throw error(
			400,
			`Type de fichier non autorisé : ${imageFile.type}. Types acceptés : ${ALLOWED_IMAGE_TYPES.join(', ')}`
		);
	}

	// 8. Validate file using existing service (type + size)
	const fileValidationError = validateImageFile(imageFile);
	if (fileValidationError) {
		throw error(400, fileValidationError);
	}

	// 9. Read file buffer for signature validation and dimension extraction
	let fileBuffer: Uint8Array;
	try {
		const arrayBuffer = await imageFile.arrayBuffer();
		fileBuffer = new Uint8Array(arrayBuffer);
	} catch (err) {
		logger.error('Error reading file buffer:', err);
		throw error(400, 'Impossible de lire le fichier image');
	}

	// 10. Validate file signature (magic bytes)
	// This prevents malicious files masquerading as images
	if (!validateFileSignature(fileBuffer, imageFile.type)) {
		throw error(400, 'Le contenu du fichier ne correspond pas à son type');
	}

	// 11. Extract image dimensions
	// Create a new File from the buffer since we've already consumed the original
	const blobForDimensions = new Blob([fileBuffer as unknown as ArrayBuffer], {
		type: imageFile.type
	});
	const fileForDimensions = new File([blobForDimensions], imageFile.name, { type: imageFile.type });
	const dimensionResult = await extractDimensionsFromFile(fileForDimensions);

	if (!dimensionResult.success || !dimensionResult.dimensions) {
		throw error(400, dimensionResult.error || 'Impossible de lire les dimensions de l’image');
	}

	const { width, height, aspectRatio } = dimensionResult.dimensions;

	// 12. Validate dimensions are within acceptable range
	if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
		throw error(
			400,
			`Image trop grande (${width}×${height}) : ${MAX_DIMENSION}×${MAX_DIMENSION} pixels au maximum`
		);
	}

	// 13. Upload to Supabase Storage
	// Create a new File from the buffer for upload
	const blobForUpload = new Blob([fileBuffer as unknown as ArrayBuffer], { type: imageFile.type });
	const fileForUpload = new File([blobForUpload], imageFile.name, { type: imageFile.type });
	const uploadResult = await uploadExerciseImage(locals.supabase, fileForUpload, user.id);

	if (!uploadResult.success) {
		logger.error('Image upload failed:', uploadResult.error);
		throw error(500, uploadResult.error || 'Impossible d’envoyer l’image');
	}

	// 14. Build response
	const imageMetadata: ImageMetadata = {
		url: uploadResult.url!,
		width,
		height,
		aspectRatio,
		filename: imageFile.name,
		size: imageFile.size,
		mimeType: imageFile.type as ImageMetadata['mimeType']
	};

	const response: ImageUploadResponse = {
		success: true,
		data: imageMetadata
	};

	// 15. Validate response format
	const validated = validateJsonResponse(
		imageUploadSuccessResponseSchema,
		response,
		'POST /api/exercises/images'
	);

	return json(validated, { status: 201 });
};
