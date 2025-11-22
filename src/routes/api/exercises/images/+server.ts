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
		throw error(400, 'Content-Type must be multipart/form-data');
	}

	// 3. Parse form data
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch (err) {
		console.error('Error parsing form data:', err);
		throw error(400, 'Invalid form data');
	}

	// 4. Get image file from form
	const imageFile = formData.get('image');

	if (!imageFile) {
		throw error(400, 'Image file is required (field name: "image")');
	}

	if (!(imageFile instanceof File)) {
		throw error(400, 'Invalid file upload');
	}

	// 5. Validate file is not empty
	if (imageFile.size === 0) {
		throw error(400, 'Image file cannot be empty');
	}

	// 6. Validate file size
	if (imageFile.size > MAX_FILE_SIZE) {
		const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
		throw error(400, `File size (${sizeMB}MB) exceeds maximum of 5MB`);
	}

	// 7. Validate MIME type is allowed
	if (!isAllowedMimeType(imageFile.type)) {
		throw error(
			400,
			`Invalid file type: ${imageFile.type}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
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
		console.error('Error reading file buffer:', err);
		throw error(400, 'Error reading image file');
	}

	// 10. Validate file signature (magic bytes)
	// This prevents malicious files masquerading as images
	if (!validateFileSignature(fileBuffer, imageFile.type)) {
		throw error(400, 'File content does not match declared file type');
	}

	// 11. Extract image dimensions
	// Create a new File from the buffer since we've already consumed the original
	const blobForDimensions = new Blob([fileBuffer as unknown as ArrayBuffer], {
		type: imageFile.type
	});
	const fileForDimensions = new File([blobForDimensions], imageFile.name, { type: imageFile.type });
	const dimensionResult = await extractDimensionsFromFile(fileForDimensions);

	if (!dimensionResult.success || !dimensionResult.dimensions) {
		throw error(400, dimensionResult.error || 'Failed to extract image dimensions');
	}

	const { width, height, aspectRatio } = dimensionResult.dimensions;

	// 12. Validate dimensions are within acceptable range
	if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
		throw error(
			400,
			`Image dimensions (${width}x${height}) exceed maximum of ${MAX_DIMENSION}x${MAX_DIMENSION} pixels`
		);
	}

	// 13. Upload to Supabase Storage
	// Create a new File from the buffer for upload
	const blobForUpload = new Blob([fileBuffer as unknown as ArrayBuffer], { type: imageFile.type });
	const fileForUpload = new File([blobForUpload], imageFile.name, { type: imageFile.type });
	const uploadResult = await uploadExerciseImage(locals.supabase, fileForUpload, user.id);

	if (!uploadResult.success) {
		console.error('Image upload failed:', uploadResult.error);
		throw error(500, uploadResult.error || 'Failed to upload image');
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
