/**
 * Exercise Image Upload Service
 * ==============================
 *
 * Handles image uploads to Supabase Storage for exercise content.
 * Images are stored in the 'exercise-images' bucket with teacher-only upload permissions.
 *
 * FEATURES:
 * - Upload images to Supabase Storage
 * - File validation (type, size)
 * - Unique filename generation (UUID-based)
 * - Delete images from storage
 * - Path structure: {userId}/{timestamp}-{uuid}.{ext}
 *
 * CONSTRAINTS:
 * - Max file size: 5MB
 * - Allowed types: image/jpeg, image/png, image/gif, image/svg+xml
 * - Teacher-only uploads (enforced by RLS)
 *
 * @module exercises/services/image-upload
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum file size: 5MB
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml'
] as const;

/**
 * Storage bucket name
 */
export const EXERCISE_IMAGES_BUCKET = 'exercise-images';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of an image upload operation
 */
export interface ImageUploadResult {
	/** Whether upload succeeded */
	success: boolean;
	/** Public URL of uploaded image (only if success=true) */
	url?: string;
	/** Storage path (only if success=true) */
	storagePath?: string;
	/** Error message (only if success=false) */
	error?: string;
}

/**
 * Result of an image delete operation
 */
export interface ImageDeleteResult {
	/** Whether deletion succeeded */
	success: boolean;
	/** Error message (only if success=false) */
	error?: string;
}

/**
 * Options for custom image naming
 */
export interface ImageNamingOptions {
	/** Exercise slug for custom filename */
	slug: string;
	/** Image number within the exercise */
	imageNumber: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate image file type
 *
 * @param file - File to validate
 * @returns True if file type is allowed
 */
export function validateImageType(file: File): boolean {
	return ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]);
}

/**
 * Validate image file size
 *
 * @param file - File to validate
 * @returns True if file size is within limits
 */
export function validateImageSize(file: File): boolean {
	return file.size > 0 && file.size <= MAX_IMAGE_SIZE;
}

/**
 * Validate image file (type and size)
 *
 * @param file - File to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
	if (!validateImageType(file)) {
		return `Type de fichier non autorisé. Types acceptés: JPEG, PNG, GIF, SVG (reçu: ${file.type})`;
	}

	if (!validateImageSize(file)) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
		return `Taille de fichier trop grande. Maximum: 5MB (reçu: ${sizeMB}MB)`;
	}

	return null;
}

// ============================================================================
// FILENAME UTILITIES
// ============================================================================

/**
 * Generate unique filename with UUID and timestamp
 *
 * @param originalFilename - Original filename
 * @returns Unique filename with sanitized extension
 *
 * @example
 * generateUniqueFilename('graph.png')
 * // Returns: '1698765432-a1b2c3d4-e5f6-7890-abcd-ef1234567890.png'
 */
export function generateUniqueFilename(originalFilename: string): string {
	// Extract extension
	const lastDotIndex = originalFilename.lastIndexOf('.');
	const extension = lastDotIndex >= 0 ? originalFilename.substring(lastDotIndex) : '';

	// Sanitize extension (remove any path separators)
	const sanitizedExtension = extension.replace(/[/\\]/g, '').toLowerCase();

	// Generate unique filename: timestamp-uuid.ext
	const timestamp = Date.now();
	const uuid = crypto.randomUUID();

	return `${timestamp}-${uuid}${sanitizedExtension}`;
}

/**
 * Extract file extension from filename
 *
 * @param filename - Original filename
 * @returns Lowercase extension with dot (e.g., '.png') or empty string
 */
export function extractExtension(filename: string): string {
	const lastDotIndex = filename.lastIndexOf('.');
	if (lastDotIndex < 0) return '';
	return filename.substring(lastDotIndex).replace(/[/\\]/g, '').toLowerCase();
}

/**
 * Generate custom filename with slug and image number
 *
 * @param slug - Exercise slug (base name)
 * @param imageNumber - Image number within the exercise
 * @param originalFilename - Original filename (for extension)
 * @returns Custom filename: {slug}-{number}.{ext}
 *
 * @example
 * generateSlugFilename('pythagore', 1, 'photo.png')
 * // Returns: 'pythagore-1.png'
 */
export function generateSlugFilename(
	slug: string,
	imageNumber: number,
	originalFilename: string
): string {
	const extension = extractExtension(originalFilename);
	return `${slug}-${imageNumber}${extension}`;
}

/**
 * Generate storage path for exercise image
 *
 * @param userId - User ID (teacher)
 * @param filename - Unique filename
 * @returns Storage path in format: {userId}/{filename}
 *
 * @example
 * generateStoragePath('abc-123', '1698765432-uuid.png')
 * // Returns: 'abc-123/1698765432-uuid.png'
 */
export function generateStoragePath(userId: string, filename: string): string {
	return `${userId}/${filename}`;
}

// ============================================================================
// UPLOAD OPERATIONS
// ============================================================================

/**
 * Upload exercise image to Supabase Storage
 *
 * Uploads an image to the 'exercise-images' bucket with automatic validation,
 * unique filename generation, and public URL retrieval.
 *
 * PATH STRUCTURE:
 * - Default: {userId}/{timestamp}-{uuid}.{ext}
 * - With naming options: {userId}/{slug}-{imageNumber}.{ext}
 *
 * @param supabase - Supabase client
 * @param file - Image file to upload
 * @param userId - User ID (teacher creating the exercise)
 * @param namingOptions - Optional custom naming with slug and image number
 * @returns Upload result with public URL or error message
 *
 * @example
 * // Default naming (UUID-based)
 * const result = await uploadExerciseImage(supabase, file, userId);
 *
 * // Custom naming with slug
 * const result = await uploadExerciseImage(supabase, file, userId, {
 *   slug: 'pythagore',
 *   imageNumber: 1
 * });
 * // Filename: pythagore-1.png
 */
export async function uploadExerciseImage(
	supabase: SupabaseClient,
	file: File,
	userId: string,
	namingOptions?: ImageNamingOptions
): Promise<ImageUploadResult> {
	// Validate file
	const validationError = validateImageFile(file);
	if (validationError) {
		return {
			success: false,
			error: validationError
		};
	}

	// Generate filename based on naming options
	const filename = namingOptions
		? generateSlugFilename(namingOptions.slug, namingOptions.imageNumber, file.name)
		: generateUniqueFilename(file.name);
	const storagePath = generateStoragePath(userId, filename);

	try {
		// Upload to Supabase Storage
		const { error: uploadError } = await supabase.storage
			.from(EXERCISE_IMAGES_BUCKET)
			.upload(storagePath, file, {
				cacheControl: '3600',
				upsert: false // Prevent accidental overwrites
			});

		if (uploadError) {
			console.error('Storage upload error:', uploadError);

			// Provide user-friendly error messages
			if (uploadError.message.includes('already exists')) {
				return {
					success: false,
					error: 'Un fichier avec ce nom existe déjà. Veuillez réessayer.'
				};
			}

			return {
				success: false,
				error: `Erreur d'upload: ${uploadError.message}`
			};
		}

		// Get public URL
		const {
			data: { publicUrl }
		} = supabase.storage.from(EXERCISE_IMAGES_BUCKET).getPublicUrl(storagePath);

		return {
			success: true,
			url: publicUrl,
			storagePath
		};
	} catch (error) {
		console.error('Exception during image upload:', error);
		return {
			success: false,
			error: "Erreur inattendue lors de l'upload de l'image"
		};
	}
}

/**
 * Upload multiple exercise images
 *
 * @param supabase - Supabase client
 * @param files - Array of image files to upload
 * @param userId - User ID (teacher)
 * @returns Array of upload results
 *
 * @example
 * const results = await uploadMultipleExerciseImages(supabase, files, userId);
 * const successfulUploads = results.filter(r => r.success);
 * const failedUploads = results.filter(r => !r.success);
 */
export async function uploadMultipleExerciseImages(
	supabase: SupabaseClient,
	files: File[],
	userId: string
): Promise<ImageUploadResult[]> {
	return Promise.all(files.map((file) => uploadExerciseImage(supabase, file, userId)));
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete exercise image from Supabase Storage
 *
 * Deletes an image from the 'exercise-images' bucket. Only the owner (teacher)
 * can delete their own images (enforced by RLS policies).
 *
 * @param supabase - Supabase client
 * @param imagePath - Storage path of the image (from ImageUploadResult.storagePath)
 * @param userId - User ID (teacher who owns the image)
 * @returns Delete result
 *
 * @example
 * // Extract path from URL or use storagePath from upload result
 * const result = await deleteExerciseImage(supabase, storagePath, userId);
 * if (result.success) {
 *   console.log('Image deleted successfully');
 * }
 */
export async function deleteExerciseImage(
	supabase: SupabaseClient,
	imagePath: string,
	userId: string
): Promise<ImageDeleteResult> {
	try {
		// Verify the path belongs to this user (security check)
		if (!imagePath.startsWith(`${userId}/`)) {
			return {
				success: false,
				error: 'Non autorisé: vous ne pouvez supprimer que vos propres images'
			};
		}

		const { error } = await supabase.storage.from(EXERCISE_IMAGES_BUCKET).remove([imagePath]);

		if (error) {
			console.error('Storage delete error:', error);
			return {
				success: false,
				error: `Erreur de suppression: ${error.message}`
			};
		}

		return { success: true };
	} catch (error) {
		console.error('Exception during image deletion:', error);
		return {
			success: false,
			error: 'Erreur inattendue lors de la suppression'
		};
	}
}

/**
 * Delete multiple exercise images
 *
 * @param supabase - Supabase client
 * @param imagePaths - Array of storage paths to delete
 * @param userId - User ID (teacher)
 * @returns Array of delete results
 */
export async function deleteMultipleExerciseImages(
	supabase: SupabaseClient,
	imagePaths: string[],
	userId: string
): Promise<ImageDeleteResult[]> {
	return Promise.all(imagePaths.map((path) => deleteExerciseImage(supabase, path, userId)));
}

// ============================================================================
// URL UTILITIES
// ============================================================================

/**
 * Extract storage path from public URL
 *
 * Extracts the storage path from a Supabase public URL.
 * Useful for deleting images when you only have the URL.
 *
 * @param publicUrl - Public URL from Supabase Storage
 * @returns Storage path or null if URL is invalid
 *
 * @example
 * const url = 'https://xyz.supabase.co/storage/v1/object/public/exercise-images/user123/image.png';
 * const path = extractStoragePathFromUrl(url);
 * // Returns: 'user123/image.png'
 */
export function extractStoragePathFromUrl(publicUrl: string): string | null {
	try {
		const url = new URL(publicUrl);
		const pathMatch = url.pathname.match(/\/exercise-images\/(.+)$/);
		return pathMatch ? pathMatch[1] : null;
	} catch {
		return null;
	}
}

/**
 * Check if URL is an exercise image from this application
 *
 * @param url - URL to check
 * @returns True if URL is from exercise-images bucket
 */
export function isExerciseImageUrl(url: string): boolean {
	return url.includes('/exercise-images/');
}
