/**
 * Image Upload Validation Schemas
 * ================================
 *
 * Zod validation schemas for exercise image upload API endpoints.
 *
 * FEATURES:
 * - Content-type validation
 * - File size validation
 * - Response schema validation
 *
 * @module validation/image-upload
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum file size: 5MB
 */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Maximum image dimension (width or height): 10,000 pixels
 */
export const MAX_IMAGE_DIMENSION = 10000;

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml'
] as const;

/**
 * File extension to MIME type mapping
 */
export const EXTENSION_TO_MIME: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml'
};

/**
 * Magic bytes (file signatures) for image types
 * Used to validate file content matches declared type
 */
export const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
	'image/jpeg': [
		[0xff, 0xd8, 0xff] // JPEG/JFIF
	],
	'image/png': [
		[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] // PNG
	],
	'image/gif': [
		[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
		[0x47, 0x49, 0x46, 0x38, 0x39, 0x61] // GIF89a
	],
	'image/webp': [
		[0x52, 0x49, 0x46, 0x46] // RIFF header (WebP starts with RIFF)
	]
	// SVG is text-based, validated separately
};

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating image file metadata
 * Used before processing the actual file
 */
export const imageFileMetadataSchema = z.object({
	filename: z
		.string()
		.min(1, 'Filename is required')
		.max(255, 'Filename too long')
		.refine(
			(name) => {
				const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
				return Object.keys(EXTENSION_TO_MIME).includes(ext);
			},
			{
				message: `Invalid file extension. Allowed: ${Object.keys(EXTENSION_TO_MIME).join(', ')}`
			}
		),
	size: z
		.number()
		.int('File size must be an integer')
		.positive('File size must be positive')
		.max(
			MAX_IMAGE_SIZE_BYTES,
			`File size must be less than ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`
		),
	type: z
		.string()
		.refine(
			(val) => ALLOWED_IMAGE_MIME_TYPES.includes(val as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]),
			{
				message: `Invalid MIME type. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`
			}
		)
});

/**
 * Schema for Content-Type header validation
 */
export const contentTypeHeaderSchema = z
	.string()
	.refine((ct) => ct.startsWith('multipart/form-data'), {
		message: 'Content-Type must be multipart/form-data'
	});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Image metadata returned after successful upload
 */
export const imageMetadataSchema = z.object({
	url: z.string().url('Invalid URL'),
	width: z.number().int().positive().max(MAX_IMAGE_DIMENSION, 'Width exceeds maximum'),
	height: z.number().int().positive().max(MAX_IMAGE_DIMENSION, 'Height exceeds maximum'),
	aspectRatio: z.number().positive().finite(),
	filename: z.string().min(1),
	size: z.number().int().positive(),
	mimeType: z
		.string()
		.refine((val) =>
			ALLOWED_IMAGE_MIME_TYPES.includes(val as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])
		)
});

/**
 * Successful image upload response
 */
export const imageUploadSuccessResponseSchema = z.object({
	success: z.literal(true),
	data: imageMetadataSchema
});

/**
 * Failed image upload response
 */
export const imageUploadErrorResponseSchema = z.object({
	success: z.literal(false),
	error: z.string()
});

/**
 * Complete image upload response (success or error)
 */
export const imageUploadResponseSchema = z.discriminatedUnion('success', [
	imageUploadSuccessResponseSchema,
	imageUploadErrorResponseSchema
]);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ImageFileMetadata = z.infer<typeof imageFileMetadataSchema>;
export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
export type ImageUploadSuccessResponse = z.infer<typeof imageUploadSuccessResponseSchema>;
export type ImageUploadErrorResponse = z.infer<typeof imageUploadErrorResponseSchema>;
export type ImageUploadResponse = z.infer<typeof imageUploadResponseSchema>;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate image file metadata
 */
export function validateImageFileMetadata(data: unknown) {
	return imageFileMetadataSchema.safeParse(data);
}

/**
 * Validate image upload response
 */
export function validateImageUploadResponse(data: unknown) {
	return imageUploadResponseSchema.safeParse(data);
}

/**
 * Check if a MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): mimeType is AllowedImageMimeType {
	return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedImageMimeType);
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string | null {
	const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
	return EXTENSION_TO_MIME[ext] || null;
}

/**
 * Validate file signature (magic bytes)
 *
 * @param buffer - First bytes of the file
 * @param declaredMimeType - MIME type declared by the client
 * @returns true if file signature matches declared type
 */
export function validateFileSignature(buffer: Uint8Array, declaredMimeType: string): boolean {
	// SVG is XML-based, check for XML/SVG content
	if (declaredMimeType === 'image/svg+xml') {
		const text = new TextDecoder().decode(buffer.slice(0, 1000));
		return text.includes('<svg') || text.includes('<?xml');
	}

	const signatures = IMAGE_MAGIC_BYTES[declaredMimeType];
	if (!signatures) {
		return false;
	}

	return signatures.some((signature) => {
		if (buffer.length < signature.length) {
			return false;
		}

		// Special case for WebP: Check RIFF header + WEBP at bytes 8-11
		if (declaredMimeType === 'image/webp') {
			const riffMatch = signature.every((byte, index) => buffer[index] === byte);
			if (!riffMatch) return false;
			// Check for "WEBP" at bytes 8-11
			const webpSignature = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
			return webpSignature.every((byte, index) => buffer[8 + index] === byte);
		}

		return signature.every((byte, index) => buffer[index] === byte);
	});
}
