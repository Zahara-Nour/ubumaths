/**
 * Image Upload Service - Unit Tests
 * ==================================
 *
 * Tests for exercise image upload functionality including:
 * - File validation (type, size)
 * - Filename generation
 * - Upload operations
 * - Delete operations
 * - URL utilities
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	uploadExerciseImage,
	deleteExerciseImage,
	uploadMultipleExerciseImages,
	deleteMultipleExerciseImages,
	validateImageType,
	validateImageSize,
	validateImageFile,
	generateUniqueFilename,
	generateStoragePath,
	extractStoragePathFromUrl,
	isExerciseImageUrl,
	MAX_IMAGE_SIZE,
	ALLOWED_IMAGE_TYPES,
	EXERCISE_IMAGES_BUCKET
} from './image-upload';

// ============================================================================
// MOCKS
// ============================================================================

/**
 * Create a mock Supabase client for testing
 */
function createMockSupabase() {
	const mockUpload = vi.fn();
	const mockRemove = vi.fn();
	const mockGetPublicUrl = vi.fn();

	const mockSupabase = {
		storage: {
			from: vi.fn(() => ({
				upload: mockUpload,
				remove: mockRemove,
				getPublicUrl: mockGetPublicUrl
			}))
		}
	} as unknown as SupabaseClient;

	return {
		supabase: mockSupabase,
		mockUpload,
		mockRemove,
		mockGetPublicUrl
	};
}

/**
 * Create a mock File for testing
 */
function createMockFile(name: string, size: number, type: string, content?: string): File {
	// Create content to match desired size
	const actualContent = content || 'x'.repeat(size);
	const blob = new Blob([actualContent], { type });
	const file = new File([blob], name, { type });

	// Override size property if needed (for testing edge cases)
	Object.defineProperty(file, 'size', {
		value: size,
		writable: false
	});

	return file;
}

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('File Validation', () => {
	describe('validateImageType', () => {
		it('should accept JPEG images', () => {
			const file = createMockFile('image.jpg', 1000, 'image/jpeg');
			expect(validateImageType(file)).toBe(true);
		});

		it('should accept PNG images', () => {
			const file = createMockFile('image.png', 1000, 'image/png');
			expect(validateImageType(file)).toBe(true);
		});

		it('should accept GIF images', () => {
			const file = createMockFile('image.gif', 1000, 'image/gif');
			expect(validateImageType(file)).toBe(true);
		});

		it('should accept SVG images', () => {
			const file = createMockFile('image.svg', 1000, 'image/svg+xml');
			expect(validateImageType(file)).toBe(true);
		});

		it('should reject PDF files', () => {
			const file = createMockFile('document.pdf', 1000, 'application/pdf');
			expect(validateImageType(file)).toBe(false);
		});

		it('should reject text files', () => {
			const file = createMockFile('document.txt', 1000, 'text/plain');
			expect(validateImageType(file)).toBe(false);
		});

		it('should reject video files', () => {
			const file = createMockFile('video.mp4', 1000, 'video/mp4');
			expect(validateImageType(file)).toBe(false);
		});
	});

	describe('validateImageSize', () => {
		it('should accept files within size limit', () => {
			const file = createMockFile('image.jpg', 1024 * 1024, 'image/jpeg'); // 1MB
			expect(validateImageSize(file)).toBe(true);
		});

		it('should accept files at exact size limit', () => {
			const file = createMockFile('image.jpg', MAX_IMAGE_SIZE, 'image/jpeg'); // 5MB
			expect(validateImageSize(file)).toBe(true);
		});

		it('should reject files over size limit', () => {
			const file = createMockFile('image.jpg', MAX_IMAGE_SIZE + 1, 'image/jpeg'); // 5MB + 1 byte
			expect(validateImageSize(file)).toBe(false);
		});

		it('should reject empty files', () => {
			const file = createMockFile('image.jpg', 0, 'image/jpeg');
			expect(validateImageSize(file)).toBe(false);
		});
	});

	describe('validateImageFile', () => {
		it('should return null for valid image', () => {
			const file = createMockFile('image.jpg', 1024 * 1024, 'image/jpeg');
			expect(validateImageFile(file)).toBeNull();
		});

		it('should return error for invalid type', () => {
			const file = createMockFile('document.pdf', 1000, 'application/pdf');
			const error = validateImageFile(file);
			expect(error).toContain('Type de fichier non autorisé');
			expect(error).toContain('application/pdf');
		});

		it('should return error for file too large', () => {
			const file = createMockFile('image.jpg', MAX_IMAGE_SIZE + 1, 'image/jpeg');
			const error = validateImageFile(file);
			expect(error).toContain('Taille de fichier trop grande');
			expect(error).toContain('5MB');
		});

		it('should prioritize type validation over size', () => {
			const file = createMockFile('document.pdf', MAX_IMAGE_SIZE + 1, 'application/pdf');
			const error = validateImageFile(file);
			expect(error).toContain('Type de fichier non autorisé');
		});
	});
});

// ============================================================================
// FILENAME UTILITIES TESTS
// ============================================================================

describe('Filename Utilities', () => {
	describe('generateUniqueFilename', () => {
		beforeEach(() => {
			// Mock crypto.randomUUID
			vi.stubGlobal('crypto', {
				randomUUID: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
			});

			// Mock Date.now
			vi.spyOn(Date, 'now').mockReturnValue(1698765432000);
		});

		it('should generate filename with timestamp and UUID', () => {
			const filename = generateUniqueFilename('image.jpg');
			expect(filename).toBe('1698765432000-a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg');
		});

		it('should preserve file extension', () => {
			const filename = generateUniqueFilename('graph.png');
			expect(filename).toMatch(/\.png$/);
		});

		it('should handle files without extension', () => {
			const filename = generateUniqueFilename('image');
			expect(filename).toBe('1698765432000-a1b2c3d4-e5f6-7890-abcd-ef1234567890');
		});

		it('should handle multiple dots in filename', () => {
			const filename = generateUniqueFilename('my.image.test.jpg');
			expect(filename).toMatch(/\.jpg$/);
		});

		it('should sanitize extension to lowercase', () => {
			const filename = generateUniqueFilename('IMAGE.JPG');
			expect(filename).toMatch(/\.jpg$/);
		});

		it('should remove path separators from extension', () => {
			const filename = generateUniqueFilename('image.jpg/../../hack');
			expect(filename).not.toContain('/');
			expect(filename).not.toContain('\\');
		});
	});

	describe('generateStoragePath', () => {
		it('should create path with userId and filename', () => {
			const path = generateStoragePath('user-123', 'image.jpg');
			expect(path).toBe('user-123/image.jpg');
		});

		it('should handle UUID user IDs', () => {
			const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
			const path = generateStoragePath(userId, 'test.png');
			expect(path).toBe(`${userId}/test.png`);
		});
	});
});

// ============================================================================
// UPLOAD OPERATIONS TESTS
// ============================================================================

describe('Upload Operations', () => {
	describe('uploadExerciseImage', () => {
		it('should successfully upload valid image', async () => {
			const { supabase, mockUpload, mockGetPublicUrl } = createMockSupabase();
			const file = createMockFile('image.jpg', 1024 * 1024, 'image/jpeg');
			const userId = 'user-123';

			// Mock successful upload
			mockUpload.mockResolvedValue({ error: null });
			mockGetPublicUrl.mockReturnValue({
				data: {
					publicUrl:
						'https://example.supabase.co/storage/v1/object/public/exercise-images/user-123/image.jpg'
				}
			});

			const result = await uploadExerciseImage(supabase, file, userId);

			expect(result.success).toBe(true);
			expect(result.url).toContain('exercise-images');
			expect(result.storagePath).toContain('user-123');
			expect(mockUpload).toHaveBeenCalledTimes(1);
		});

		it('should validate file type before upload', async () => {
			const { supabase } = createMockSupabase();
			const file = createMockFile('document.pdf', 1000, 'application/pdf');
			const userId = 'user-123';

			const result = await uploadExerciseImage(supabase, file, userId);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Type de fichier non autorisé');
		});

		it('should validate file size before upload', async () => {
			const { supabase } = createMockSupabase();
			const file = createMockFile('image.jpg', MAX_IMAGE_SIZE + 1, 'image/jpeg');
			const userId = 'user-123';

			const result = await uploadExerciseImage(supabase, file, userId);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Taille de fichier trop grande');
		});

		it('should handle upload errors', async () => {
			const { supabase, mockUpload } = createMockSupabase();
			const file = createMockFile('image.jpg', 1024, 'image/jpeg');
			const userId = 'user-123';

			// Mock upload error
			mockUpload.mockResolvedValue({
				error: { message: 'Storage quota exceeded' }
			});

			const result = await uploadExerciseImage(supabase, file, userId);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Storage quota exceeded');
		});

		it('should handle "already exists" error gracefully', async () => {
			const { supabase, mockUpload } = createMockSupabase();
			const file = createMockFile('image.jpg', 1024, 'image/jpeg');
			const userId = 'user-123';

			mockUpload.mockResolvedValue({
				error: { message: 'The resource already exists' }
			});

			const result = await uploadExerciseImage(supabase, file, userId);

			expect(result.success).toBe(false);
			expect(result.error).toContain('existe déjà');
		});

		it('should handle exceptions during upload', async () => {
			const { supabase, mockUpload } = createMockSupabase();
			const file = createMockFile('image.jpg', 1024, 'image/jpeg');
			const userId = 'user-123';

			// Mock exception
			mockUpload.mockRejectedValue(new Error('Network error'));

			const result = await uploadExerciseImage(supabase, file, userId);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Erreur inattendue');
		});

		it('should use correct bucket name', async () => {
			const { supabase, mockUpload, mockGetPublicUrl } = createMockSupabase();
			const file = createMockFile('image.jpg', 1024, 'image/jpeg');
			const userId = 'user-123';

			mockUpload.mockResolvedValue({ error: null });
			mockGetPublicUrl.mockReturnValue({
				data: { publicUrl: 'https://example.com/image.jpg' }
			});

			await uploadExerciseImage(supabase, file, userId);

			expect(supabase.storage.from).toHaveBeenCalledWith(EXERCISE_IMAGES_BUCKET);
		});

		it('should set upsert to false', async () => {
			const { supabase, mockUpload, mockGetPublicUrl } = createMockSupabase();
			const file = createMockFile('image.jpg', 1024, 'image/jpeg');
			const userId = 'user-123';

			mockUpload.mockResolvedValue({ error: null });
			mockGetPublicUrl.mockReturnValue({
				data: { publicUrl: 'https://example.com/image.jpg' }
			});

			await uploadExerciseImage(supabase, file, userId);

			const uploadOptions = (mockUpload as Mock).mock.calls[0][2];
			expect(uploadOptions.upsert).toBe(false);
		});
	});

	describe('uploadMultipleExerciseImages', () => {
		it('should upload multiple images', async () => {
			const { supabase, mockUpload, mockGetPublicUrl } = createMockSupabase();
			const files = [
				createMockFile('image1.jpg', 1024, 'image/jpeg'),
				createMockFile('image2.png', 1024, 'image/png'),
				createMockFile('image3.gif', 1024, 'image/gif')
			];
			const userId = 'user-123';

			mockUpload.mockResolvedValue({ error: null });
			mockGetPublicUrl.mockReturnValue({
				data: { publicUrl: 'https://example.com/image.jpg' }
			});

			const results = await uploadMultipleExerciseImages(supabase, files, userId);

			expect(results).toHaveLength(3);
			expect(results.every((r) => r.success)).toBe(true);
			expect(mockUpload).toHaveBeenCalledTimes(3);
		});

		it('should handle mixed success and failure', async () => {
			const { supabase, mockUpload, mockGetPublicUrl } = createMockSupabase();
			const files = [
				createMockFile('image1.jpg', 1024, 'image/jpeg'),
				createMockFile('too-large.jpg', MAX_IMAGE_SIZE + 1, 'image/jpeg'),
				createMockFile('invalid.pdf', 1024, 'application/pdf')
			];
			const userId = 'user-123';

			mockUpload.mockResolvedValue({ error: null });
			mockGetPublicUrl.mockReturnValue({
				data: { publicUrl: 'https://example.com/image.jpg' }
			});

			const results = await uploadMultipleExerciseImages(supabase, files, userId);

			expect(results).toHaveLength(3);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(false);
			expect(results[2].success).toBe(false);
		});
	});
});

// ============================================================================
// DELETE OPERATIONS TESTS
// ============================================================================

describe('Delete Operations', () => {
	describe('deleteExerciseImage', () => {
		it('should successfully delete image', async () => {
			const { supabase, mockRemove } = createMockSupabase();
			const imagePath = 'user-123/image.jpg';
			const userId = 'user-123';

			mockRemove.mockResolvedValue({ error: null });

			const result = await deleteExerciseImage(supabase, imagePath, userId);

			expect(result.success).toBe(true);
			expect(mockRemove).toHaveBeenCalledWith([imagePath]);
		});

		it('should verify user owns the image', async () => {
			const { supabase } = createMockSupabase();
			const imagePath = 'user-456/image.jpg';
			const userId = 'user-123';

			const result = await deleteExerciseImage(supabase, imagePath, userId);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Non autorisé');
		});

		it('should handle delete errors', async () => {
			const { supabase, mockRemove } = createMockSupabase();
			const imagePath = 'user-123/image.jpg';
			const userId = 'user-123';

			mockRemove.mockResolvedValue({
				error: { message: 'File not found' }
			});

			const result = await deleteExerciseImage(supabase, imagePath, userId);

			expect(result.success).toBe(false);
			expect(result.error).toContain('File not found');
		});

		it('should handle exceptions during deletion', async () => {
			const { supabase, mockRemove } = createMockSupabase();
			const imagePath = 'user-123/image.jpg';
			const userId = 'user-123';

			mockRemove.mockRejectedValue(new Error('Network error'));

			const result = await deleteExerciseImage(supabase, imagePath, userId);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Erreur inattendue');
		});
	});

	describe('deleteMultipleExerciseImages', () => {
		it('should delete multiple images', async () => {
			const { supabase, mockRemove } = createMockSupabase();
			const imagePaths = ['user-123/image1.jpg', 'user-123/image2.png', 'user-123/image3.gif'];
			const userId = 'user-123';

			mockRemove.mockResolvedValue({ error: null });

			const results = await deleteMultipleExerciseImages(supabase, imagePaths, userId);

			expect(results).toHaveLength(3);
			expect(results.every((r) => r.success)).toBe(true);
			expect(mockRemove).toHaveBeenCalledTimes(3);
		});

		it('should handle mixed success and failure', async () => {
			const { supabase, mockRemove } = createMockSupabase();
			const imagePaths = [
				'user-123/image1.jpg',
				'user-456/image2.jpg', // Wrong user
				'user-123/image3.jpg'
			];
			const userId = 'user-123';

			mockRemove.mockResolvedValue({ error: null });

			const results = await deleteMultipleExerciseImages(supabase, imagePaths, userId);

			expect(results).toHaveLength(3);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(false);
			expect(results[2].success).toBe(true);
		});
	});
});

// ============================================================================
// URL UTILITIES TESTS
// ============================================================================

describe('URL Utilities', () => {
	describe('extractStoragePathFromUrl', () => {
		it('should extract path from valid Supabase URL', () => {
			const url =
				'https://xyz.supabase.co/storage/v1/object/public/exercise-images/user-123/image.jpg';
			const path = extractStoragePathFromUrl(url);
			expect(path).toBe('user-123/image.jpg');
		});

		it('should handle URLs with query parameters', () => {
			const url =
				'https://xyz.supabase.co/storage/v1/object/public/exercise-images/user-123/image.jpg?token=abc123';
			const path = extractStoragePathFromUrl(url);
			expect(path).toBe('user-123/image.jpg');
		});

		it('should return null for invalid URL', () => {
			const url = 'not-a-valid-url';
			const path = extractStoragePathFromUrl(url);
			expect(path).toBeNull();
		});

		it('should return null for URL without exercise-images', () => {
			const url = 'https://xyz.supabase.co/storage/v1/object/public/other-bucket/image.jpg';
			const path = extractStoragePathFromUrl(url);
			expect(path).toBeNull();
		});

		it('should handle nested paths', () => {
			const url =
				'https://xyz.supabase.co/storage/v1/object/public/exercise-images/user-123/folder/subfolder/image.jpg';
			const path = extractStoragePathFromUrl(url);
			expect(path).toBe('user-123/folder/subfolder/image.jpg');
		});
	});

	describe('isExerciseImageUrl', () => {
		it('should identify exercise image URLs', () => {
			const url =
				'https://xyz.supabase.co/storage/v1/object/public/exercise-images/user-123/image.jpg';
			expect(isExerciseImageUrl(url)).toBe(true);
		});

		it('should reject non-exercise image URLs', () => {
			const url = 'https://xyz.supabase.co/storage/v1/object/public/other-bucket/image.jpg';
			expect(isExerciseImageUrl(url)).toBe(false);
		});

		it('should reject external URLs', () => {
			const url = 'https://example.com/image.jpg';
			expect(isExerciseImageUrl(url)).toBe(false);
		});
	});
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Constants', () => {
	it('should have correct max image size', () => {
		expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024); // 5MB
	});

	it('should have correct allowed image types', () => {
		expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
		expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
		expect(ALLOWED_IMAGE_TYPES).toContain('image/gif');
		expect(ALLOWED_IMAGE_TYPES).toContain('image/svg+xml');
		expect(ALLOWED_IMAGE_TYPES).toHaveLength(4);
	});

	it('should have correct bucket name', () => {
		expect(EXERCISE_IMAGES_BUCKET).toBe('exercise-images');
	});
});
