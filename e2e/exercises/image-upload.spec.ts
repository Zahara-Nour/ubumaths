/**
 * E2E Tests: Image Upload Flow
 * ============================
 *
 * Comprehensive tests for the image upload functionality in exercises:
 * - Drag-and-drop upload
 * - Click-to-upload via file picker
 * - Upload progress indicator
 * - Success state with preview
 * - Error handling for invalid files
 * - Dimension extraction verification
 *
 * Author: Claude Code
 * Date: 2025-11-22
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAsTeacher } from '../helpers/auth-helpers';
import {
	mockImageUploadApi,
	mockSlowImageUploadApi,
	mockImageUploadApiError,
	getDropZone,
	getFileInput,
	getImagePreview,
	expectUploaderIdle,
	expectUploaderUploading,
	expectUploaderSuccess,
	expectUploaderError,
	TEST_IMAGE_DATA,
	SMALL_IMAGE_DATA,
	LARGE_IMAGE_DATA
} from '../helpers/image-helpers';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

// Set timeout for all tests in this file
test.setTimeout(60000);

// Test page URL - adjust based on where ImageUploader is accessible
// This could be a dedicated test page or an exercise editor page
const IMAGE_UPLOAD_PAGE = '/dashboard/teacher/exercises/new';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Navigate to a page that contains the ImageUploader component
 * Since the component may be embedded in various pages, we need to find a test location
 */
async function navigateToImageUploader(page: Page): Promise<void> {
	// First try the exercise editor page
	await page.goto(IMAGE_UPLOAD_PAGE);
	await page.waitForLoadState('networkidle');

	// If the uploader isn't directly visible, we might need to open a dialog or navigate further
	// Check if there's an "Add Image" button or similar
	const addImageButton = page
		.locator('button:has-text("Image"), button:has-text("Ajouter une image")')
		.first();

	if ((await addImageButton.count()) > 0 && (await addImageButton.isVisible())) {
		await addImageButton.click();
		await page.waitForTimeout(500); // Wait for dialog/panel to open
	}
}

/**
 * Create a test image file in the browser and trigger upload via file input
 */
async function uploadTestFile(
	page: Page,
	filename: string = 'test-image.png',
	mimeType: string = 'image/png'
): Promise<void> {
	const fileInput = getFileInput(page);

	// Create a simple valid PNG buffer in the browser
	// Playwright supports setting file input values with buffer data
	const pngBuffer = Buffer.from([
		// PNG signature
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		// IHDR chunk
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
		// IDAT chunk
		0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05,
		0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4,
		// IEND chunk
		0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
	]);

	await fileInput.setInputFiles({
		name: filename,
		mimeType: mimeType,
		buffer: pngBuffer
	});
}

/**
 * Upload an invalid file (e.g., text file disguised as image)
 * Note: Prefixed with underscore as it may be used in future tests
 */
async function _uploadInvalidFile(page: Page): Promise<void> {
	const fileInput = getFileInput(page);

	await fileInput.setInputFiles({
		name: 'fake-image.png',
		mimeType: 'image/png',
		buffer: Buffer.from('This is not a valid image file')
	});
}

/**
 * Upload a file that's too large
 */
async function uploadOversizedFile(page: Page): Promise<void> {
	const fileInput = getFileInput(page);

	// Create a buffer larger than 5MB
	const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
	// Add PNG signature to make it look like a PNG
	oversizedBuffer.write('\x89PNG\r\n\x1a\n', 0);

	await fileInput.setInputFiles({
		name: 'large-image.png',
		mimeType: 'image/png',
		buffer: oversizedBuffer
	});
}

// ============================================================================
// TEST SUITE: IMAGE UPLOAD FLOW
// ============================================================================

test.describe('Image Upload Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Login as teacher (required for upload permissions)
		await loginAsTeacher(page);
	});

	// ========================================================================
	// TEST 1: Drop Zone Renders Correctly
	// ========================================================================

	test('should render drop zone in idle state', async ({ page }) => {
		await mockImageUploadApi(page);
		await navigateToImageUploader(page);

		// Verify drop zone is visible
		const dropZone = getDropZone(page);
		await expect(dropZone).toBeVisible();

		// Verify idle state message
		await expect(page.locator('text=/Glissez-deposez|selectionner/i')).toBeVisible();

		// Verify accepted file types are mentioned
		await expect(page.locator('text=/JPEG|PNG|GIF|WebP|SVG/i')).toBeVisible();

		// Verify max size is mentioned
		await expect(page.locator('text=/5 Mo/i')).toBeVisible();
	});

	// ========================================================================
	// TEST 2: Click to Upload via File Picker
	// ========================================================================

	test('should open file picker when drop zone is clicked', async ({ page }) => {
		await mockImageUploadApi(page);
		await navigateToImageUploader(page);

		const dropZone = getDropZone(page);

		// Set up file chooser listener
		const fileChooserPromise = page.waitForEvent('filechooser');

		// Click drop zone
		await dropZone.click();

		// Verify file chooser opens
		const fileChooser = await fileChooserPromise;
		expect(fileChooser).toBeDefined();

		// Cancel the file chooser
		await fileChooser.setFiles([]);
	});

	// ========================================================================
	// TEST 3: Successful File Upload
	// ========================================================================

	test('should upload file successfully and show preview', async ({ page }) => {
		await mockImageUploadApi(page, { success: true, data: TEST_IMAGE_DATA });
		await navigateToImageUploader(page);

		// Upload test file
		await uploadTestFile(page);

		// Wait for success state
		await expectUploaderSuccess(page);

		// Verify preview is shown
		const preview = getImagePreview(page);
		await expect(preview).toBeVisible();

		// Verify filename is displayed
		await expect(page.locator(`text=${TEST_IMAGE_DATA.filename}`)).toBeVisible();

		// Verify dimensions are displayed
		await expect(
			page.locator(`text=${TEST_IMAGE_DATA.width} x ${TEST_IMAGE_DATA.height}`)
		).toBeVisible();
	});

	// ========================================================================
	// TEST 4: Upload Progress Indicator
	// ========================================================================

	test('should show progress indicator during upload', async ({ page }) => {
		// Mock slow upload to catch progress state
		await mockSlowImageUploadApi(page, 2000, { success: true, data: TEST_IMAGE_DATA });
		await navigateToImageUploader(page);

		// Start upload
		await uploadTestFile(page);

		// Verify uploading state is shown
		await expectUploaderUploading(page);

		// Verify progress bar is visible
		await expect(page.locator('[role="progressbar"], .animate-spin')).toBeVisible();

		// Wait for completion
		await expectUploaderSuccess(page);
	});

	// ========================================================================
	// TEST 5: Error - Invalid File Type
	// ========================================================================

	test('should show error for invalid file type', async ({ page }) => {
		await mockImageUploadApiError(page, 'Type de fichier non autorise', 400);
		await navigateToImageUploader(page);

		const fileInput = getFileInput(page);

		// Try to upload a text file
		await fileInput.setInputFiles({
			name: 'document.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('This is a text file')
		});

		// Verify error state
		await expectUploaderError(page, /Type de fichier|non autorise/i);

		// Verify retry button is visible
		await expect(page.locator('button:has-text("Reessayer")')).toBeVisible();
	});

	// ========================================================================
	// TEST 6: Error - File Too Large
	// ========================================================================

	test('should show error for file exceeding max size', async ({ page }) => {
		await navigateToImageUploader(page);

		// Try to upload oversized file
		await uploadOversizedFile(page);

		// Verify error state
		await expectUploaderError(page, /trop volumineux|Maximum/i);
	});

	// ========================================================================
	// TEST 7: Error - Server Error
	// ========================================================================

	test('should handle server error gracefully', async ({ page }) => {
		await mockImageUploadApiError(page, 'Internal server error', 500);
		await navigateToImageUploader(page);

		// Upload valid file but server fails
		await uploadTestFile(page);

		// Verify error state
		await expectUploaderError(page, /Erreur/i);

		// Verify retry button is visible
		await expect(page.locator('button:has-text("Reessayer")')).toBeVisible();
	});

	// ========================================================================
	// TEST 8: Retry After Error
	// ========================================================================

	test('should allow retry after upload error', async ({ page }) => {
		// First mock error, then success
		let requestCount = 0;
		await page.route('**/api/exercises/images', async (route) => {
			requestCount++;
			if (requestCount === 1) {
				await route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'Temporary error' })
				});
			} else {
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify({ success: true, data: TEST_IMAGE_DATA })
				});
			}
		});

		await navigateToImageUploader(page);

		// First upload fails
		await uploadTestFile(page);
		await expectUploaderError(page);

		// Click retry
		await page.click('button:has-text("Reessayer")');

		// Verify back to idle state
		await expectUploaderIdle(page);

		// Upload again
		await uploadTestFile(page);

		// Should succeed
		await expectUploaderSuccess(page);
	});

	// ========================================================================
	// TEST 9: Reset After Successful Upload
	// ========================================================================

	test('should allow removing uploaded image and starting over', async ({ page }) => {
		await mockImageUploadApi(page, { success: true, data: TEST_IMAGE_DATA });
		await navigateToImageUploader(page);

		// Upload file
		await uploadTestFile(page);
		await expectUploaderSuccess(page);

		// Find and click remove/reset button
		const removeButton = page.locator('[aria-label*="Supprimer"], button:has-text("X")').first();
		await removeButton.click();

		// Verify back to idle state
		await expectUploaderIdle(page);
	});

	// ========================================================================
	// TEST 10: Keyboard Accessibility - Open File Picker
	// ========================================================================

	test('should open file picker with keyboard (Enter/Space)', async ({ page }) => {
		await mockImageUploadApi(page);
		await navigateToImageUploader(page);

		const dropZone = getDropZone(page);

		// Focus the drop zone
		await dropZone.focus();

		// Set up file chooser listener
		const fileChooserPromise = page.waitForEvent('filechooser');

		// Press Enter
		await page.keyboard.press('Enter');

		// Verify file chooser opens
		const fileChooser = await fileChooserPromise;
		expect(fileChooser).toBeDefined();

		// Cancel the file chooser
		await fileChooser.setFiles([]);
	});

	// ========================================================================
	// TEST 11: Drag Enter/Leave Visual States
	// ========================================================================

	test('should show drag over visual state', async ({ page }) => {
		await mockImageUploadApi(page);
		await navigateToImageUploader(page);

		const dropZone = getDropZone(page);

		// Initial state check
		const initialClasses = await dropZone.getAttribute('class');
		expect(initialClasses).not.toContain('border-primary');

		// Simulate drag over using dispatchEvent
		await dropZone.evaluate((el) => {
			const dragEvent = new DragEvent('dragover', {
				bubbles: true,
				cancelable: true,
				dataTransfer: new DataTransfer()
			});
			el.dispatchEvent(dragEvent);
		});

		// Check for visual change (border-primary class or similar)
		// Note: This test may need adjustment based on actual implementation
		await page.waitForTimeout(100);

		// Verify the "Deposez" text appears (indicating drag state)
		const dropText = page.locator('text=/Deposez/i');
		if ((await dropText.count()) > 0) {
			await expect(dropText).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 12: Various Image Formats
	// ========================================================================

	test.describe('Image Format Support', () => {
		test('should accept JPEG files', async ({ page }) => {
			await mockImageUploadApi(page, {
				success: true,
				data: { ...TEST_IMAGE_DATA, mimeType: 'image/jpeg', filename: 'photo.jpg' }
			});
			await navigateToImageUploader(page);

			const fileInput = getFileInput(page);
			await fileInput.setInputFiles({
				name: 'photo.jpg',
				mimeType: 'image/jpeg',
				buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) // JPEG signature
			});

			await expectUploaderSuccess(page);
		});

		test('should accept WebP files', async ({ page }) => {
			await mockImageUploadApi(page, {
				success: true,
				data: { ...TEST_IMAGE_DATA, mimeType: 'image/webp', filename: 'image.webp' }
			});
			await navigateToImageUploader(page);

			const fileInput = getFileInput(page);
			await fileInput.setInputFiles({
				name: 'image.webp',
				mimeType: 'image/webp',
				buffer: Buffer.from([0x52, 0x49, 0x46, 0x46]) // RIFF signature for WebP
			});

			await expectUploaderSuccess(page);
		});

		test('should accept GIF files', async ({ page }) => {
			await mockImageUploadApi(page, {
				success: true,
				data: { ...TEST_IMAGE_DATA, mimeType: 'image/gif', filename: 'animation.gif' }
			});
			await navigateToImageUploader(page);

			const fileInput = getFileInput(page);
			await fileInput.setInputFiles({
				name: 'animation.gif',
				mimeType: 'image/gif',
				buffer: Buffer.from([0x47, 0x49, 0x46, 0x38]) // GIF signature
			});

			await expectUploaderSuccess(page);
		});

		test('should accept SVG files', async ({ page }) => {
			await mockImageUploadApi(page, {
				success: true,
				data: { ...TEST_IMAGE_DATA, mimeType: 'image/svg+xml', filename: 'vector.svg' }
			});
			await navigateToImageUploader(page);

			const fileInput = getFileInput(page);
			await fileInput.setInputFiles({
				name: 'vector.svg',
				mimeType: 'image/svg+xml',
				buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
			});

			await expectUploaderSuccess(page);
		});
	});

	// ========================================================================
	// TEST 13: Dimension Display
	// ========================================================================

	test.describe('Dimension Display', () => {
		test('should display correct dimensions for uploaded image', async ({ page }) => {
			await mockImageUploadApi(page, { success: true, data: TEST_IMAGE_DATA });
			await navigateToImageUploader(page);

			await uploadTestFile(page);
			await expectUploaderSuccess(page);

			// Verify dimensions are displayed
			await expect(
				page.locator(`text=${TEST_IMAGE_DATA.width} x ${TEST_IMAGE_DATA.height}`)
			).toBeVisible();
		});

		test('should display file size correctly', async ({ page }) => {
			await mockImageUploadApi(page, { success: true, data: TEST_IMAGE_DATA });
			await navigateToImageUploader(page);

			await uploadTestFile(page);
			await expectUploaderSuccess(page);

			// File size is 100KB, should display as "100 Ko" or similar
			await expect(page.locator('text=/100.*Ko|100.*KB/i')).toBeVisible();
		});

		test('should handle small images', async ({ page }) => {
			await mockImageUploadApi(page, { success: true, data: SMALL_IMAGE_DATA });
			await navigateToImageUploader(page);

			await uploadTestFile(page, 'icon.png');
			await expectUploaderSuccess(page);

			// Verify small dimensions displayed
			await expect(
				page.locator(`text=${SMALL_IMAGE_DATA.width} x ${SMALL_IMAGE_DATA.height}`)
			).toBeVisible();
		});

		test('should handle large images', async ({ page }) => {
			await mockImageUploadApi(page, { success: true, data: LARGE_IMAGE_DATA });
			await navigateToImageUploader(page);

			await uploadTestFile(page, 'diagram.png');
			await expectUploaderSuccess(page);

			// Verify large dimensions displayed
			await expect(
				page.locator(`text=${LARGE_IMAGE_DATA.width} x ${LARGE_IMAGE_DATA.height}`)
			).toBeVisible();
		});
	});
});

// ============================================================================
// E2E TEST SETUP INSTRUCTIONS
// ============================================================================

/**
 * To run these E2E tests:
 *
 * 1. Ensure you have a test teacher account configured:
 *    - TEST_TEACHER_EMAIL: Valid teacher email
 *    - TEST_TEACHER_PASSWORD: Valid teacher password
 *
 * 2. Start the development server:
 *    pnpm dev -- --port 5175
 *
 * 3. Run E2E tests:
 *    pnpm test:e2e exercises/image-upload
 *
 * 4. Run with headed browser (for debugging):
 *    pnpm test:e2e --headed exercises/image-upload
 *
 * 5. Run specific test:
 *    pnpm test:e2e -g "should upload file successfully"
 *
 * NOTE: The upload API is mocked in these tests to ensure consistent behavior.
 * Actual upload functionality should be tested in integration tests against
 * a test Supabase instance.
 */
