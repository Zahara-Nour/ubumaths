/**
 * Image Upload E2E Test Helper Functions
 * =======================================
 *
 * Provides utilities for testing image upload and configuration:
 * - Mock file creation
 * - API route mocking
 * - Image component interactions
 * - Assertion helpers
 *
 * @module e2e/helpers/image-helpers
 */

import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import * as path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MockImageData {
	url: string;
	width: number;
	height: number;
	aspectRatio: number;
	filename: string;
	size: number;
	mimeType: string;
}

export interface MockUploadResponse {
	success: boolean;
	data?: MockImageData;
	error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const TEST_IMAGE_DATA: MockImageData = {
	url: 'https://test-storage.example.com/images/test-image.png',
	width: 800,
	height: 600,
	aspectRatio: 1.333333,
	filename: 'test-graph.png',
	size: 102400, // 100KB
	mimeType: 'image/png'
};

export const SMALL_IMAGE_DATA: MockImageData = {
	url: 'https://test-storage.example.com/images/small-icon.png',
	width: 64,
	height: 64,
	aspectRatio: 1,
	filename: 'icon.png',
	size: 4096, // 4KB
	mimeType: 'image/png'
};

export const LARGE_IMAGE_DATA: MockImageData = {
	url: 'https://test-storage.example.com/images/large-diagram.png',
	width: 1920,
	height: 1080,
	aspectRatio: 1.777778,
	filename: 'diagram.png',
	size: 2097152, // 2MB
	mimeType: 'image/png'
};

// ============================================================================
// MOCK FILE CREATION
// ============================================================================

/**
 * Create a mock PNG file buffer for testing
 * This creates a minimal valid PNG file structure
 */
export function createMockPngBuffer(width = 100, height = 100): Buffer {
	// Minimal PNG file structure (1x1 transparent PNG)
	// PNG signature + IHDR + IDAT + IEND chunks
	const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

	// Create a simple valid PNG structure
	// This is a minimal 1x1 transparent PNG
	const minimalPng = Buffer.concat([
		pngSignature,
		// IHDR chunk (width, height, bit depth, color type, etc.)
		Buffer.from([
			0x00,
			0x00,
			0x00,
			0x0d,
			0x49,
			0x48,
			0x44,
			0x52, // length + "IHDR"
			(width >> 24) & 0xff,
			(width >> 16) & 0xff,
			(width >> 8) & 0xff,
			width & 0xff, // width
			(height >> 24) & 0xff,
			(height >> 16) & 0xff,
			(height >> 8) & 0xff,
			height & 0xff, // height
			0x08,
			0x06,
			0x00,
			0x00,
			0x00, // bit depth, color type, compression, filter, interlace
			0x00,
			0x00,
			0x00,
			0x00 // CRC placeholder
		]),
		// Minimal IDAT chunk
		Buffer.from([
			0x00,
			0x00,
			0x00,
			0x0a,
			0x49,
			0x44,
			0x41,
			0x54, // length + "IDAT"
			0x78,
			0x9c,
			0x63,
			0x00,
			0x01,
			0x00,
			0x00,
			0x05,
			0x00,
			0x01, // compressed data
			0x00,
			0x00,
			0x00,
			0x00 // CRC placeholder
		]),
		// IEND chunk
		Buffer.from([
			0x00,
			0x00,
			0x00,
			0x00,
			0x49,
			0x45,
			0x4e,
			0x44, // length + "IEND"
			0xae,
			0x42,
			0x60,
			0x82 // CRC
		])
	]);

	return minimalPng;
}

/**
 * Create a mock JPEG file buffer for testing
 */
export function createMockJpegBuffer(): Buffer {
	// Minimal JPEG structure
	return Buffer.from([
		0xff,
		0xd8,
		0xff,
		0xe0, // SOI + APP0
		0x00,
		0x10,
		0x4a,
		0x46,
		0x49,
		0x46,
		0x00, // JFIF header
		0x01,
		0x01,
		0x00,
		0x00,
		0x01,
		0x00,
		0x01,
		0x00,
		0x00, // JFIF version
		0xff,
		0xdb,
		0x00,
		0x43,
		0x00, // DQT marker
		// Quantization table (64 bytes)
		...Array(64).fill(0x10),
		0xff,
		0xc0,
		0x00,
		0x0b, // SOF0 marker
		0x08,
		0x00,
		0x01,
		0x00,
		0x01, // 1x1 image
		0x01,
		0x01,
		0x11,
		0x00, // component info
		0xff,
		0xc4,
		0x00,
		0x1f, // DHT marker
		// Huffman table
		...Array(28).fill(0x00),
		0xff,
		0xda,
		0x00,
		0x08, // SOS marker
		0x01,
		0x01,
		0x00,
		0x00,
		0x3f,
		0x00, // scan header
		0x00, // image data
		0xff,
		0xd9 // EOI marker
	]);
}

/**
 * Create a mock file object that looks like an uploaded file
 * For use with Playwright file chooser
 */
export function createTestImagePath(filename: string): string {
	// Return path to test fixtures directory
	return path.join(process.cwd(), 'tests', 'fixtures', filename);
}

// ============================================================================
// API MOCKING
// ============================================================================

/**
 * Mock the image upload API endpoint
 */
export async function mockImageUploadApi(
	page: Page,
	response: MockUploadResponse = { success: true, data: TEST_IMAGE_DATA }
): Promise<void> {
	await page.route('**/api/exercises/images', async (route: Route) => {
		const request = route.request();

		if (request.method() === 'POST') {
			await route.fulfill({
				status: response.success ? 201 : 400,
				contentType: 'application/json',
				body: JSON.stringify(response)
			});
		} else {
			await route.continue();
		}
	});
}

/**
 * Mock the image upload API to simulate slow upload
 */
export async function mockSlowImageUploadApi(
	page: Page,
	delayMs: number = 2000,
	response: MockUploadResponse = { success: true, data: TEST_IMAGE_DATA }
): Promise<void> {
	await page.route('**/api/exercises/images', async (route: Route) => {
		const request = route.request();

		if (request.method() === 'POST') {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			await route.fulfill({
				status: response.success ? 201 : 400,
				contentType: 'application/json',
				body: JSON.stringify(response)
			});
		} else {
			await route.continue();
		}
	});
}

/**
 * Mock the image upload API to simulate error
 */
export async function mockImageUploadApiError(
	page: Page,
	errorMessage: string = 'Upload failed',
	statusCode: number = 500
): Promise<void> {
	await page.route('**/api/exercises/images', async (route: Route) => {
		const request = route.request();

		if (request.method() === 'POST') {
			await route.fulfill({
				status: statusCode,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					error: errorMessage
				})
			});
		} else {
			await route.continue();
		}
	});
}

// ============================================================================
// COMPONENT INTERACTION HELPERS
// ============================================================================

/**
 * Get the image uploader drop zone
 */
export function getDropZone(page: Page) {
	return page.locator('[aria-label*="telechargement"], [role="button"][tabindex="0"]').first();
}

/**
 * Get the hidden file input
 */
export function getFileInput(page: Page) {
	return page.locator('input[type="file"]');
}

/**
 * Get the progress indicator
 */
export function getProgressIndicator(page: Page) {
	return page.locator('[role="progressbar"], [aria-label*="progression"]');
}

/**
 * Get the uploaded image preview
 */
export function getImagePreview(page: Page) {
	return page.locator('img[alt]').first();
}

/**
 * Get the markdown output element
 */
export function getMarkdownOutput(page: Page) {
	return page.locator('code, [aria-label*="Markdown"]').first();
}

/**
 * Get the copy button
 */
export function getCopyButton(page: Page) {
	return page.locator('button:has-text("Copier"), [aria-label*="Copier"]').first();
}

/**
 * Get size selector radio buttons
 */
export function getSizeRadioButtons(page: Page) {
	return page.locator('[role="radiogroup"] input[type="radio"], [role="radio"]');
}

/**
 * Get a specific size option
 */
export function getSizeOption(page: Page, size: string) {
	return page.locator(`[id="size-${size}"], input[value="${size}"]`);
}

/**
 * Get alignment buttons
 */
export function getAlignmentButtons(page: Page) {
	return page.locator('[data-alignment-option]');
}

/**
 * Get a specific alignment button
 */
export function getAlignmentButton(page: Page, alignment: 'left' | 'center' | 'right') {
	const labels: Record<string, string> = {
		left: 'Gauche',
		center: 'Centre',
		right: 'Droite'
	};
	return page.locator(`[data-alignment-option][aria-label*="${labels[alignment]}"]`);
}

/**
 * Get caption input
 */
export function getCaptionInput(page: Page) {
	return page.locator('#image-caption, input[placeholder*="legende" i]');
}

/**
 * Get character counter
 */
export function getCharacterCounter(page: Page) {
	return page.locator('#caption-counter, [role="status"][aria-live="polite"]');
}

/**
 * Get clear caption button
 */
export function getClearCaptionButton(page: Page) {
	return page.locator('[aria-label*="Effacer"]');
}

/**
 * Get custom width input
 */
export function getCustomWidthInput(page: Page) {
	return page.locator('#custom-width-input, input[type="number"][max="100"]');
}

/**
 * Get alt text input
 */
export function getAltTextInput(page: Page) {
	return page.locator('#alt-text, input[placeholder*="accessibilite" i]');
}

// ============================================================================
// DRAG AND DROP HELPERS
// ============================================================================

/**
 * Simulate file drag and drop
 * Note: Playwright doesn't natively support DataTransfer in drag events,
 * so we use file chooser for actual file selection tests
 */
export async function simulateDragEnter(page: Page, dropZone: ReturnType<typeof getDropZone>) {
	await dropZone.dispatchEvent('dragenter', {
		dataTransfer: { types: ['Files'] }
	});
}

export async function simulateDragOver(page: Page, dropZone: ReturnType<typeof getDropZone>) {
	await dropZone.dispatchEvent('dragover', {
		dataTransfer: { types: ['Files'] }
	});
}

export async function simulateDragLeave(page: Page, dropZone: ReturnType<typeof getDropZone>) {
	await dropZone.dispatchEvent('dragleave', {});
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that the uploader is in idle state
 */
export async function expectUploaderIdle(page: Page) {
	const dropZone = getDropZone(page);
	await expect(dropZone).toBeVisible();
	await expect(page.locator('text=/Glissez-deposez|selectionner/i')).toBeVisible();
}

/**
 * Assert that the uploader is showing uploading state
 */
export async function expectUploaderUploading(page: Page) {
	await expect(page.locator('text=/Telechargement en cours/i')).toBeVisible();
}

/**
 * Assert that the uploader is showing success state
 */
export async function expectUploaderSuccess(page: Page) {
	await expect(page.locator('text=/Image telechargee/i')).toBeVisible();
}

/**
 * Assert that the uploader is showing error state
 */
export async function expectUploaderError(page: Page, errorText?: string | RegExp) {
	await expect(page.locator('[role="alert"]')).toBeVisible();
	if (errorText) {
		await expect(page.locator('[role="alert"]')).toContainText(errorText);
	}
}

/**
 * Assert markdown contains expected attributes
 */
export async function expectMarkdownContains(page: Page, ...patterns: (string | RegExp)[]) {
	const markdownOutput = getMarkdownOutput(page);
	for (const pattern of patterns) {
		if (typeof pattern === 'string') {
			await expect(markdownOutput).toContainText(pattern);
		} else {
			const text = await markdownOutput.textContent();
			expect(text).toMatch(pattern);
		}
	}
}

/**
 * Assert specific size class is selected
 */
export async function expectSizeSelected(page: Page, size: string) {
	const radioGroup = page.locator('[role="radiogroup"]');
	if ((await radioGroup.count()) > 0) {
		// Using Radix UI radio group
		const selectedItem = page.locator('[data-state="checked"]');
		await expect(selectedItem).toHaveAttribute('value', size);
	} else {
		// Using native radio
		const radio = getSizeOption(page, size);
		await expect(radio).toBeChecked();
	}
}

/**
 * Assert specific alignment is selected
 */
export async function expectAlignmentSelected(page: Page, alignment: 'left' | 'center' | 'right') {
	const button = getAlignmentButton(page, alignment);
	await expect(button).toHaveAttribute('aria-pressed', 'true');
}

// ============================================================================
// KEYBOARD NAVIGATION HELPERS
// ============================================================================

/**
 * Navigate to next option using keyboard
 */
export async function navigateRight(page: Page) {
	await page.keyboard.press('ArrowRight');
}

/**
 * Navigate to previous option using keyboard
 */
export async function navigateLeft(page: Page) {
	await page.keyboard.press('ArrowLeft');
}

/**
 * Select current option using keyboard
 */
export async function selectWithKeyboard(page: Page) {
	await page.keyboard.press('Enter');
}

/**
 * Tab to next focusable element
 */
export async function tabForward(page: Page) {
	await page.keyboard.press('Tab');
}

/**
 * Tab to previous focusable element
 */
export async function tabBackward(page: Page) {
	await page.keyboard.press('Shift+Tab');
}
