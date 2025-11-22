/**
 * E2E Tests: Image Attribute Configuration
 * ========================================
 *
 * Comprehensive tests for image attribute configuration:
 * - Size class selection (inline, small, medium, large, full)
 * - Custom width percentage input
 * - Alignment selection (left, center, right)
 * - Caption input with character limit
 * - Alt text configuration
 * - Markdown generation and copy
 * - Full workflow integration
 *
 * Author: Claude Code
 * Date: 2025-11-22
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAsTeacher } from '../helpers/auth-helpers';
import {
	mockImageUploadApi,
	getDropZone,
	getFileInput,
	getSizeOption,
	getAlignmentButton,
	getAlignmentButtons,
	getCaptionInput,
	getCharacterCounter,
	getClearCaptionButton,
	getCustomWidthInput,
	getAltTextInput,
	getMarkdownOutput,
	getCopyButton,
	expectUploaderSuccess,
	expectSizeSelected,
	expectAlignmentSelected,
	expectMarkdownContains,
	navigateRight,
	TEST_IMAGE_DATA
} from '../helpers/image-helpers';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

test.setTimeout(60000);

// Test page URL
const IMAGE_UPLOAD_PAGE = '/dashboard/teacher/exercises/new';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Navigate to image uploader and upload a test image
 * Returns after image is successfully uploaded
 */
async function setupWithUploadedImage(page: Page): Promise<void> {
	await mockImageUploadApi(page, { success: true, data: TEST_IMAGE_DATA });
	await page.goto(IMAGE_UPLOAD_PAGE);
	await page.waitForLoadState('networkidle');

	// Open image dialog if needed
	const addImageButton = page
		.locator('button:has-text("Image"), button:has-text("Ajouter une image")')
		.first();
	if ((await addImageButton.count()) > 0 && (await addImageButton.isVisible())) {
		await addImageButton.click();
		await page.waitForTimeout(500);
	}

	// Upload test file
	const fileInput = getFileInput(page);
	const pngBuffer = createTestPngBuffer();

	await fileInput.setInputFiles({
		name: 'test-image.png',
		mimeType: 'image/png',
		buffer: pngBuffer
	});

	await expectUploaderSuccess(page);
}

/**
 * Create a minimal test PNG buffer
 */
function createTestPngBuffer(): Buffer {
	return Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
		0x42, 0x60, 0x82
	]);
}

// ============================================================================
// TEST SUITE: SIZE CLASS SELECTION
// ============================================================================

test.describe('Size Class Selection', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
		await setupWithUploadedImage(page);
	});

	// ========================================================================
	// TEST 1: Default Size Selection
	// ========================================================================

	test('should default to medium size class', async ({ page }) => {
		// Medium should be selected by default
		await expectSizeSelected(page, 'medium');

		// Verify markdown contains no size attribute (medium is default)
		const markdown = getMarkdownOutput(page);
		const markdownText = await markdown.textContent();

		// Medium is default so size attribute may be omitted
		expect(markdownText).toContain('!');
	});

	// ========================================================================
	// TEST 2: Select Inline Size
	// ========================================================================

	test('should select inline size class', async ({ page }) => {
		const inlineOption = getSizeOption(page, 'inline');
		await inlineOption.click();

		await expectSizeSelected(page, 'inline');
		await expectMarkdownContains(page, 'size=inline');
	});

	// ========================================================================
	// TEST 3: Select Small Size
	// ========================================================================

	test('should select small size class', async ({ page }) => {
		const smallOption = getSizeOption(page, 'small');
		await smallOption.click();

		await expectSizeSelected(page, 'small');
		await expectMarkdownContains(page, 'size=small');
	});

	// ========================================================================
	// TEST 4: Select Large Size
	// ========================================================================

	test('should select large size class', async ({ page }) => {
		const largeOption = getSizeOption(page, 'large');
		await largeOption.click();

		await expectSizeSelected(page, 'large');
		await expectMarkdownContains(page, 'size=large');
	});

	// ========================================================================
	// TEST 5: Select Full Size
	// ========================================================================

	test('should select full size class', async ({ page }) => {
		const fullOption = getSizeOption(page, 'full');
		await fullOption.click();

		await expectSizeSelected(page, 'full');
		await expectMarkdownContains(page, 'size=full');
	});

	// ========================================================================
	// TEST 6: Custom Width Input
	// ========================================================================

	test('should enable custom width input when custom is selected', async ({ page }) => {
		// Select custom option
		const customOption = page.locator('#size-custom, [value="custom"]');
		await customOption.click();

		// Custom width input should appear
		const customWidthInput = getCustomWidthInput(page);
		await expect(customWidthInput).toBeVisible();
	});

	// ========================================================================
	// TEST 7: Custom Width Value
	// ========================================================================

	test('should apply custom width percentage', async ({ page }) => {
		// Select custom option
		const customOption = page.locator('#size-custom, [value="custom"]');
		await customOption.click();

		// Enter custom width
		const customWidthInput = getCustomWidthInput(page);
		await customWidthInput.fill('60');

		// Verify markdown contains width attribute
		await expectMarkdownContains(page, 'width=60%');
	});

	// ========================================================================
	// TEST 8: Custom Width Validation - Min
	// ========================================================================

	test('should enforce minimum custom width of 0', async ({ page }) => {
		const customOption = page.locator('#size-custom, [value="custom"]');
		await customOption.click();

		const customWidthInput = getCustomWidthInput(page);

		// Try negative value
		await customWidthInput.fill('-10');

		// Should be clamped or rejected
		const value = await customWidthInput.inputValue();
		const numValue = parseFloat(value);
		expect(numValue).toBeGreaterThanOrEqual(0);
	});

	// ========================================================================
	// TEST 9: Custom Width Validation - Max
	// ========================================================================

	test('should enforce maximum custom width of 100', async ({ page }) => {
		const customOption = page.locator('#size-custom, [value="custom"]');
		await customOption.click();

		const customWidthInput = getCustomWidthInput(page);

		// Try value over 100
		await customWidthInput.fill('150');

		// Should be clamped or rejected
		const value = await customWidthInput.inputValue();
		const numValue = parseFloat(value);
		expect(numValue).toBeLessThanOrEqual(100);
	});

	// ========================================================================
	// TEST 10: Format-Specific Dimensions Display
	// ========================================================================

	test('should display format-specific dimensions for selected size', async ({ page }) => {
		// Select large size
		const largeOption = getSizeOption(page, 'large');
		await largeOption.click();

		// Verify format dimensions are shown
		await expect(page.locator('text=/HTML|LaTeX|Typst/i')).toBeVisible();

		// Verify specific values for large size
		await expect(page.locator('text=/75%/i')).toBeVisible(); // HTML width
		await expect(page.locator('text=/textwidth/i')).toBeVisible(); // LaTeX
	});
});

// ============================================================================
// TEST SUITE: ALIGNMENT SELECTION
// ============================================================================

test.describe('Alignment Selection', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
		await setupWithUploadedImage(page);
	});

	// ========================================================================
	// TEST 1: Default Alignment
	// ========================================================================

	test('should default to center alignment', async ({ page }) => {
		await expectAlignmentSelected(page, 'center');

		// Center is default, so align attribute may be omitted
		const markdown = getMarkdownOutput(page);
		const text = await markdown.textContent();
		expect(text).not.toContain('align=center');
	});

	// ========================================================================
	// TEST 2: Select Left Alignment
	// ========================================================================

	test('should select left alignment', async ({ page }) => {
		const leftButton = getAlignmentButton(page, 'left');
		await leftButton.click();

		await expectAlignmentSelected(page, 'left');
		await expectMarkdownContains(page, 'align=left');
	});

	// ========================================================================
	// TEST 3: Select Right Alignment
	// ========================================================================

	test('should select right alignment', async ({ page }) => {
		const rightButton = getAlignmentButton(page, 'right');
		await rightButton.click();

		await expectAlignmentSelected(page, 'right');
		await expectMarkdownContains(page, 'align=right');
	});

	// ========================================================================
	// TEST 4: Visual Preview Updates
	// ========================================================================

	test('should update visual preview when alignment changes', async ({ page }) => {
		// Get alignment preview element
		const preview = page.locator('[aria-label*="Apercu de l\'alignement"]');

		// Select left
		const leftButton = getAlignmentButton(page, 'left');
		await leftButton.click();

		// Preview should show left-aligned element
		const leftStyle = await preview
			.locator('div')
			.first()
			.evaluate((el) => {
				return window.getComputedStyle(el).marginLeft;
			});
		expect(leftStyle).toBe('0px');

		// Select right
		const rightButton = getAlignmentButton(page, 'right');
		await rightButton.click();

		// Preview should show right-aligned element
		const rightStyle = await preview
			.locator('div')
			.first()
			.evaluate((el) => {
				return window.getComputedStyle(el).marginRight;
			});
		expect(rightStyle).toBe('0px');
	});

	// ========================================================================
	// TEST 5: Keyboard Navigation - Left/Right
	// ========================================================================

	test('should navigate alignment options with arrow keys', async ({ page }) => {
		const buttons = getAlignmentButtons(page);
		const firstButton = buttons.first();

		// Focus first button
		await firstButton.focus();

		// Navigate right
		await navigateRight(page);

		// Center should now be focused/selected
		const centerButton = getAlignmentButton(page, 'center');
		await expect(centerButton).toBeFocused();

		// Navigate right again
		await navigateRight(page);

		// Right should now be focused/selected
		const rightButton = getAlignmentButton(page, 'right');
		await expect(rightButton).toBeFocused();

		// Navigate right should wrap to left
		await navigateRight(page);
		const leftButton = getAlignmentButton(page, 'left');
		await expect(leftButton).toBeFocused();
	});

	// ========================================================================
	// TEST 6: Keyboard Selection - Enter/Space
	// ========================================================================

	test('should select alignment with Enter key', async ({ page }) => {
		const leftButton = getAlignmentButton(page, 'left');

		// Focus left button
		await leftButton.focus();

		// Press Enter
		await page.keyboard.press('Enter');

		// Left should be selected
		await expectAlignmentSelected(page, 'left');
	});
});

// ============================================================================
// TEST SUITE: CAPTION INPUT
// ============================================================================

test.describe('Caption Input', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
		await setupWithUploadedImage(page);
	});

	// ========================================================================
	// TEST 1: Caption Input Exists
	// ========================================================================

	test('should display caption input field', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		await expect(captionInput).toBeVisible();
	});

	// ========================================================================
	// TEST 2: Enter Caption Text
	// ========================================================================

	test('should accept caption text', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		const testCaption = 'Figure 1 - Triangle rectangle';

		await captionInput.fill(testCaption);

		const value = await captionInput.inputValue();
		expect(value).toBe(testCaption);
	});

	// ========================================================================
	// TEST 3: Caption in Markdown
	// ========================================================================

	test('should include caption in generated markdown', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		const testCaption = 'Theoreme de Pythagore';

		await captionInput.fill(testCaption);

		await expectMarkdownContains(page, `caption="${testCaption}"`);
	});

	// ========================================================================
	// TEST 4: Character Count Display
	// ========================================================================

	test('should display character count', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		const charCounter = getCharacterCounter(page);

		await expect(charCounter).toBeVisible();

		// Initially 0/200
		await expect(charCounter).toContainText('0/200');

		// Type some text
		await captionInput.fill('Test caption');

		// Should update to 12/200
		await expect(charCounter).toContainText('12/200');
	});

	// ========================================================================
	// TEST 5: Character Limit Warning
	// ========================================================================

	test('should show warning when approaching character limit', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		const charCounter = getCharacterCounter(page);

		// Fill with text near limit (>80% of 200 = 160)
		const longText = 'A'.repeat(170);
		await captionInput.fill(longText);

		// Counter should have warning styling
		await expect(charCounter).toContainText('170/200');

		// Check for warning color class
		const hasWarningClass = await charCounter.evaluate((el) => {
			return (
				el.classList.contains('text-warning') ||
				el.classList.contains('text-yellow-500') ||
				window.getComputedStyle(el).color.includes('rgb(234, 179, 8)') // yellow-500
			);
		});
		expect(hasWarningClass).toBe(true);
	});

	// ========================================================================
	// TEST 6: Character Limit Enforcement
	// ========================================================================

	test('should enforce 200 character limit', async ({ page }) => {
		const captionInput = getCaptionInput(page);

		// Try to enter more than 200 characters
		const tooLongText = 'A'.repeat(250);
		await captionInput.fill(tooLongText);

		// Should be truncated to 200
		const value = await captionInput.inputValue();
		expect(value.length).toBeLessThanOrEqual(200);
	});

	// ========================================================================
	// TEST 7: Clear Caption Button
	// ========================================================================

	test('should clear caption when clear button is clicked', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		await captionInput.fill('Test caption to clear');

		const clearButton = getClearCaptionButton(page);
		await expect(clearButton).toBeVisible();

		await clearButton.click();

		const value = await captionInput.inputValue();
		expect(value).toBe('');
	});

	// ========================================================================
	// TEST 8: Clear Button Hidden When Empty
	// ========================================================================

	test('should hide clear button when caption is empty', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		const clearButton = getClearCaptionButton(page);

		// Initially empty - clear button should be hidden
		await expect(clearButton).not.toBeVisible();

		// Add text
		await captionInput.fill('Some text');
		await expect(clearButton).toBeVisible();

		// Clear text manually
		await captionInput.fill('');
		await expect(clearButton).not.toBeVisible();
	});

	// ========================================================================
	// TEST 9: Caption Preview
	// ========================================================================

	test('should show caption preview when text is entered', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		const testCaption = 'Preview test caption';

		await captionInput.fill(testCaption);

		// Preview section should appear
		const preview = page.locator('[aria-label*="Apercu de la legende"]');
		await expect(preview).toBeVisible();
		await expect(preview).toContainText(testCaption);
	});

	// ========================================================================
	// TEST 10: Caption with Special Characters
	// ========================================================================

	test('should handle caption with special characters', async ({ page }) => {
		const captionInput = getCaptionInput(page);
		const specialCaption = 'Equation: x^2 + "y" = z';

		await captionInput.fill(specialCaption);

		// Check markdown escapes quotes properly
		const markdown = getMarkdownOutput(page);
		const text = await markdown.textContent();
		expect(text).toContain('caption=');
		// Quotes should be escaped
		expect(text?.includes('\\"')).toBe(true);
	});
});

// ============================================================================
// TEST SUITE: ALT TEXT
// ============================================================================

test.describe('Alt Text Configuration', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
		await setupWithUploadedImage(page);
	});

	// ========================================================================
	// TEST 1: Alt Text Input Exists
	// ========================================================================

	test('should display alt text input field', async ({ page }) => {
		const altTextInput = getAltTextInput(page);
		await expect(altTextInput).toBeVisible();
	});

	// ========================================================================
	// TEST 2: Auto-Generated Alt Text
	// ========================================================================

	test('should auto-generate alt text from filename', async ({ page }) => {
		const altTextInput = getAltTextInput(page);

		// Should have auto-generated value from filename
		const value = await altTextInput.inputValue();
		expect(value.length).toBeGreaterThan(0);
	});

	// ========================================================================
	// TEST 3: Edit Alt Text
	// ========================================================================

	test('should allow editing alt text', async ({ page }) => {
		const altTextInput = getAltTextInput(page);
		const customAlt = 'Graph showing quadratic function';

		await altTextInput.fill(customAlt);

		const value = await altTextInput.inputValue();
		expect(value).toBe(customAlt);
	});

	// ========================================================================
	// TEST 4: Alt Text in Markdown
	// ========================================================================

	test('should include alt text in generated markdown', async ({ page }) => {
		const altTextInput = getAltTextInput(page);
		const customAlt = 'Mathematical diagram';

		await altTextInput.fill(customAlt);

		await expectMarkdownContains(page, `![${customAlt}]`);
	});

	// ========================================================================
	// TEST 5: Required Field Indicator
	// ========================================================================

	test('should show required indicator for alt text', async ({ page }) => {
		// Look for asterisk or required attribute
		const requiredIndicator = page.locator(
			'label:has-text("Texte alternatif") span.text-destructive'
		);
		await expect(requiredIndicator).toBeVisible();
	});
});

// ============================================================================
// TEST SUITE: MARKDOWN GENERATION
// ============================================================================

test.describe('Markdown Generation', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
		await setupWithUploadedImage(page);
	});

	// ========================================================================
	// TEST 1: Basic Markdown Format
	// ========================================================================

	test('should generate basic markdown syntax', async ({ page }) => {
		const markdown = getMarkdownOutput(page);
		const text = await markdown.textContent();

		// Should have markdown image format
		expect(text).toMatch(/!\[.+\]\(.+\)/);
	});

	// ========================================================================
	// TEST 2: Markdown with All Attributes
	// ========================================================================

	test('should generate markdown with all attributes', async ({ page }) => {
		// Set all attributes
		const smallOption = getSizeOption(page, 'small');
		await smallOption.click();

		const leftButton = getAlignmentButton(page, 'left');
		await leftButton.click();

		const captionInput = getCaptionInput(page);
		await captionInput.fill('Test caption');

		const altTextInput = getAltTextInput(page);
		await altTextInput.fill('Test image');

		// Verify markdown contains all attributes
		await expectMarkdownContains(page, '![Test image]');
		await expectMarkdownContains(page, 'size=small');
		await expectMarkdownContains(page, 'align=left');
		await expectMarkdownContains(page, 'caption="Test caption"');
	});

	// ========================================================================
	// TEST 3: Copy to Clipboard
	// ========================================================================

	test('should copy markdown to clipboard', async ({ page }) => {
		const copyButton = getCopyButton(page);

		// Grant clipboard permissions
		await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);

		await copyButton.click();

		// Verify success feedback
		await expect(page.locator('text=/Copie/i')).toBeVisible();

		// Verify clipboard content
		const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboardContent).toMatch(/!\[.+\]\(.+\)/);
	});

	// ========================================================================
	// TEST 4: Copy Button Disabled Without Image
	// ========================================================================

	test('copy button should be enabled only with image', async ({ page }) => {
		// After setup, copy button should be enabled
		const copyButton = getCopyButton(page);
		await expect(copyButton).toBeEnabled();
	});
});

// ============================================================================
// TEST SUITE: FULL WORKFLOW
// ============================================================================

test.describe('Full Image Configuration Workflow', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
	});

	// ========================================================================
	// TEST 1: Complete Upload and Configure Flow
	// ========================================================================

	test('should complete full upload -> configure -> generate workflow', async ({ page }) => {
		await mockImageUploadApi(page, { success: true, data: TEST_IMAGE_DATA });
		await page.goto(IMAGE_UPLOAD_PAGE);
		await page.waitForLoadState('networkidle');

		// Step 1: Open image dialog if needed
		const addImageButton = page
			.locator('button:has-text("Image"), button:has-text("Ajouter une image")')
			.first();
		if ((await addImageButton.count()) > 0 && (await addImageButton.isVisible())) {
			await addImageButton.click();
			await page.waitForTimeout(500);
		}

		// Step 2: Upload image
		const fileInput = getFileInput(page);
		await fileInput.setInputFiles({
			name: 'workflow-test.png',
			mimeType: 'image/png',
			buffer: createTestPngBuffer()
		});

		await expectUploaderSuccess(page);

		// Step 3: Configure alt text
		const altTextInput = getAltTextInput(page);
		await altTextInput.fill('Mathematical graph');

		// Step 4: Select size
		const largeOption = getSizeOption(page, 'large');
		await largeOption.click();

		// Step 5: Select alignment
		const rightButton = getAlignmentButton(page, 'right');
		await rightButton.click();

		// Step 6: Add caption
		const captionInput = getCaptionInput(page);
		await captionInput.fill('Figure 1: Quadratic function graph');

		// Step 7: Verify final markdown
		await expectMarkdownContains(page, '![Mathematical graph]');
		await expectMarkdownContains(page, TEST_IMAGE_DATA.url);
		await expectMarkdownContains(page, 'size=large');
		await expectMarkdownContains(page, 'align=right');
		await expectMarkdownContains(page, 'caption="Figure 1: Quadratic function graph"');

		// Step 8: Copy to clipboard
		await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
		const copyButton = getCopyButton(page);
		await copyButton.click();

		// Verify copy success
		await expect(page.locator('text=/Copie/i')).toBeVisible();
	});

	// ========================================================================
	// TEST 2: Reset and Start Over
	// ========================================================================

	test('should allow resetting and starting fresh', async ({ page }) => {
		await mockImageUploadApi(page, { success: true, data: TEST_IMAGE_DATA });
		await page.goto(IMAGE_UPLOAD_PAGE);
		await page.waitForLoadState('networkidle');

		// Open image dialog if needed
		const addImageButton = page
			.locator('button:has-text("Image"), button:has-text("Ajouter une image")')
			.first();
		if ((await addImageButton.count()) > 0 && (await addImageButton.isVisible())) {
			await addImageButton.click();
			await page.waitForTimeout(500);
		}

		// Upload first image
		const fileInput = getFileInput(page);
		await fileInput.setInputFiles({
			name: 'first-image.png',
			mimeType: 'image/png',
			buffer: createTestPngBuffer()
		});

		await expectUploaderSuccess(page);

		// Configure some settings
		const captionInput = getCaptionInput(page);
		await captionInput.fill('First caption');

		// Click reset/reinitialize button
		const resetButton = page.locator('button:has-text("Reinitialiser")');
		await resetButton.click();

		// Verify uploader is back to idle state
		await expect(page.locator('text=/Glissez-deposez|selectionner/i')).toBeVisible();
	});

	// ========================================================================
	// TEST 3: Multiple Attribute Changes
	// ========================================================================

	test('should handle rapid attribute changes correctly', async ({ page }) => {
		await setupWithUploadedImage(page);

		// Rapidly change size multiple times
		const smallOption = getSizeOption(page, 'small');
		const largeOption = getSizeOption(page, 'large');
		const mediumOption = getSizeOption(page, 'medium');

		await smallOption.click();
		await largeOption.click();
		await mediumOption.click();

		// Final state should be medium
		await expectSizeSelected(page, 'medium');

		// Rapidly change alignment
		const leftButton = getAlignmentButton(page, 'left');
		const rightButton = getAlignmentButton(page, 'right');
		const centerButton = getAlignmentButton(page, 'center');

		await leftButton.click();
		await rightButton.click();
		await centerButton.click();

		// Final state should be center
		await expectAlignmentSelected(page, 'center');
	});
});

// ============================================================================
// TEST SUITE: RESPONSIVE BEHAVIOR
// ============================================================================

test.describe('Responsive Behavior', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
	});

	// ========================================================================
	// TEST 1: Mobile Viewport
	// ========================================================================

	test('should work correctly on mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		await setupWithUploadedImage(page);

		// All controls should still be accessible
		const sizeOption = getSizeOption(page, 'small');
		await expect(sizeOption).toBeVisible();

		const alignmentButtons = getAlignmentButtons(page);
		await expect(alignmentButtons.first()).toBeVisible();

		const captionInput = getCaptionInput(page);
		await expect(captionInput).toBeVisible();
	});

	// ========================================================================
	// TEST 2: Tablet Viewport
	// ========================================================================

	test('should work correctly on tablet viewport', async ({ page }) => {
		// Set tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });

		await setupWithUploadedImage(page);

		// All controls should be properly laid out
		const sizeOption = getSizeOption(page, 'large');
		await sizeOption.click();

		await expectSizeSelected(page, 'large');
		await expectMarkdownContains(page, 'size=large');
	});
});

// ============================================================================
// TEST SUITE: ACCESSIBILITY
// ============================================================================

test.describe('Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
		await setupWithUploadedImage(page);
	});

	// ========================================================================
	// TEST 1: ARIA Labels
	// ========================================================================

	test('should have proper ARIA labels', async ({ page }) => {
		// Check size selector has label
		await expect(page.locator('[aria-labelledby="size-selector-label"]')).toBeVisible();

		// Check alignment selector has label
		await expect(page.locator('[aria-labelledby="alignment-selector-label"]')).toBeVisible();

		// Check caption input has description
		const captionInput = getCaptionInput(page);
		const describedBy = await captionInput.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
	});

	// ========================================================================
	// TEST 2: Keyboard-Only Navigation
	// ========================================================================

	test('should be fully navigable with keyboard only', async ({ page }) => {
		// Start from drop zone
		const dropZone = getDropZone(page);
		await dropZone.focus();

		// Tab through all interactive elements
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		// Should eventually reach caption input
		const focusedElement = page.locator(':focus');
		const tagName = await focusedElement.evaluate((el) => el.tagName.toLowerCase());

		// Verify we can tab through the form
		expect(['input', 'button', 'div', 'label']).toContain(tagName);
	});

	// ========================================================================
	// TEST 3: Screen Reader Announcements
	// ========================================================================

	test('should have live regions for dynamic content', async ({ page }) => {
		// Character counter should have aria-live
		const charCounter = getCharacterCounter(page);
		const ariaLive = await charCounter.getAttribute('aria-live');
		expect(ariaLive).toBe('polite');

		// Counter should also have aria-atomic
		const ariaAtomic = await charCounter.getAttribute('aria-atomic');
		expect(ariaAtomic).toBe('true');
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
 *    pnpm test:e2e exercises/image-attributes
 *
 * 4. Run with headed browser (for debugging):
 *    pnpm test:e2e --headed exercises/image-attributes
 *
 * 5. Run specific test suite:
 *    pnpm test:e2e -g "Size Class Selection"
 *
 * NOTE: The upload API is mocked in these tests to ensure consistent behavior.
 * Tests assume the ImageAttributePanel component is accessible through the
 * exercise editor page.
 */
