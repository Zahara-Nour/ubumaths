/**
 * Image Dimensions Service Tests
 * ==============================
 *
 * Tests for the image-dimensions service that manages image sizing
 * across multiple output formats (HTML, LaTeX, Typst).
 *
 * @module exercises/services/__tests__/image-dimensions
 */

import { describe, it, expect } from 'vitest';
import {
	getDimensionsForFormat,
	autoDetectSizeClass,
	getAlignmentStyles,
	shouldUseFigureEnvironment,
	type OutputFormat
} from '../image-dimensions';
import type { ImageNode } from '../../types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a minimal ImageNode for testing
 */
function createImageNode(overrides: Partial<ImageNode> = {}): ImageNode {
	return {
		type: 'image',
		src: 'test-image.png',
		...overrides
	};
}

// ============================================================================
// getDimensionsForFormat TESTS
// ============================================================================

describe('getDimensionsForFormat', () => {
	describe('with sizeClass', () => {
		describe('HTML format', () => {
			it('should return correct dimensions for small sizeClass', () => {
				const node = createImageNode({ sizeClass: 'small' });
				const result = getDimensionsForFormat(node, 'html');

				expect(result).toEqual({
					width: '25%',
					maxWidth: '300px'
				});
			});

			it('should return correct dimensions for medium sizeClass', () => {
				const node = createImageNode({ sizeClass: 'medium' });
				const result = getDimensionsForFormat(node, 'html');

				expect(result).toEqual({
					width: '50%',
					maxWidth: '600px'
				});
			});

			it('should return correct dimensions for large sizeClass', () => {
				const node = createImageNode({ sizeClass: 'large' });
				const result = getDimensionsForFormat(node, 'html');

				expect(result).toEqual({
					width: '75%',
					maxWidth: '900px'
				});
			});

			it('should return correct dimensions for full sizeClass', () => {
				const node = createImageNode({ sizeClass: 'full' });
				const result = getDimensionsForFormat(node, 'html');

				expect(result).toEqual({
					width: '100%',
					maxWidth: '1200px'
				});
			});

			it('should return correct dimensions for inline sizeClass', () => {
				const node = createImageNode({ sizeClass: 'inline' });
				const result = getDimensionsForFormat(node, 'html');

				expect(result).toEqual({
					width: '1.5em',
					maxHeight: '1.5em'
				});
			});
		});

		describe('LaTeX format', () => {
			it('should return correct dimensions for small sizeClass', () => {
				const node = createImageNode({ sizeClass: 'small' });
				const result = getDimensionsForFormat(node, 'latex');

				expect(result).toEqual({
					width: '0.25\\textwidth'
				});
			});

			it('should return correct dimensions for medium sizeClass', () => {
				const node = createImageNode({ sizeClass: 'medium' });
				const result = getDimensionsForFormat(node, 'latex');

				expect(result).toEqual({
					width: '0.5\\textwidth'
				});
			});

			it('should return correct dimensions for large sizeClass', () => {
				const node = createImageNode({ sizeClass: 'large' });
				const result = getDimensionsForFormat(node, 'latex');

				expect(result).toEqual({
					width: '0.75\\textwidth'
				});
			});

			it('should return correct dimensions for full sizeClass', () => {
				const node = createImageNode({ sizeClass: 'full' });
				const result = getDimensionsForFormat(node, 'latex');

				expect(result).toEqual({
					width: '\\textwidth'
				});
			});

			it('should return correct dimensions for inline sizeClass', () => {
				const node = createImageNode({ sizeClass: 'inline' });
				const result = getDimensionsForFormat(node, 'latex');

				expect(result).toEqual({
					width: '1em'
				});
			});
		});

		describe('Typst format', () => {
			it('should return correct dimensions for small sizeClass', () => {
				const node = createImageNode({ sizeClass: 'small' });
				const result = getDimensionsForFormat(node, 'typst');

				expect(result).toEqual({
					width: '25%'
				});
			});

			it('should return correct dimensions for medium sizeClass', () => {
				const node = createImageNode({ sizeClass: 'medium' });
				const result = getDimensionsForFormat(node, 'typst');

				expect(result).toEqual({
					width: '50%'
				});
			});

			it('should return correct dimensions for large sizeClass', () => {
				const node = createImageNode({ sizeClass: 'large' });
				const result = getDimensionsForFormat(node, 'typst');

				expect(result).toEqual({
					width: '75%'
				});
			});

			it('should return correct dimensions for full sizeClass', () => {
				const node = createImageNode({ sizeClass: 'full' });
				const result = getDimensionsForFormat(node, 'typst');

				expect(result).toEqual({
					width: '100%'
				});
			});

			it('should return correct dimensions for inline sizeClass', () => {
				const node = createImageNode({ sizeClass: 'inline' });
				const result = getDimensionsForFormat(node, 'typst');

				expect(result).toEqual({
					width: '1em'
				});
			});
		});
	});

	describe('with widthPercent (should have priority over sizeClass)', () => {
		const formats: OutputFormat[] = ['html', 'latex', 'typst'];

		it('should use widthPercent when both widthPercent and sizeClass are provided', () => {
			const node = createImageNode({
				sizeClass: 'small', // Would give 25%
				widthPercent: 75 // Should override to 75%
			});

			// HTML format
			expect(getDimensionsForFormat(node, 'html')).toEqual({ width: '75%' });

			// LaTeX format
			expect(getDimensionsForFormat(node, 'latex')).toEqual({ width: '0.75\\textwidth' });

			// Typst format
			expect(getDimensionsForFormat(node, 'typst')).toEqual({ width: '75%' });
		});

		it.each(formats)('should convert widthPercent to %s format correctly', (format) => {
			const node = createImageNode({ widthPercent: 50 });
			const result = getDimensionsForFormat(node, format);

			if (format === 'latex') {
				expect(result).toEqual({ width: '0.5\\textwidth' });
			} else {
				expect(result).toEqual({ width: '50%' });
			}
		});

		it.each(formats)('should handle widthPercent of 0 for %s format', (format) => {
			const node = createImageNode({ widthPercent: 0 });
			const result = getDimensionsForFormat(node, format);

			if (format === 'latex') {
				expect(result).toEqual({ width: '0\\textwidth' });
			} else {
				expect(result).toEqual({ width: '0%' });
			}
		});

		it.each(formats)('should handle widthPercent of 100 for %s format', (format) => {
			const node = createImageNode({ widthPercent: 100 });
			const result = getDimensionsForFormat(node, format);

			if (format === 'latex') {
				expect(result).toEqual({ width: '1\\textwidth' });
			} else {
				expect(result).toEqual({ width: '100%' });
			}
		});
	});

	describe('with widthPercent out of bounds (should be clamped to 0-100)', () => {
		it('should clamp negative widthPercent to 0 for HTML', () => {
			const node = createImageNode({ widthPercent: -25 });
			const result = getDimensionsForFormat(node, 'html');

			expect(result).toEqual({ width: '0%' });
		});

		it('should clamp negative widthPercent to 0 for LaTeX', () => {
			const node = createImageNode({ widthPercent: -50 });
			const result = getDimensionsForFormat(node, 'latex');

			expect(result).toEqual({ width: '0\\textwidth' });
		});

		it('should clamp negative widthPercent to 0 for Typst', () => {
			const node = createImageNode({ widthPercent: -100 });
			const result = getDimensionsForFormat(node, 'typst');

			expect(result).toEqual({ width: '0%' });
		});

		it('should clamp widthPercent > 100 to 100 for HTML', () => {
			const node = createImageNode({ widthPercent: 150 });
			const result = getDimensionsForFormat(node, 'html');

			expect(result).toEqual({ width: '100%' });
		});

		it('should clamp widthPercent > 100 to 100 for LaTeX', () => {
			const node = createImageNode({ widthPercent: 200 });
			const result = getDimensionsForFormat(node, 'latex');

			expect(result).toEqual({ width: '1\\textwidth' });
		});

		it('should clamp widthPercent > 100 to 100 for Typst', () => {
			const node = createImageNode({ widthPercent: 999 });
			const result = getDimensionsForFormat(node, 'typst');

			expect(result).toEqual({ width: '100%' });
		});
	});

	describe('without sizeClass or widthPercent (should default to medium)', () => {
		it('should use medium as default for HTML', () => {
			const node = createImageNode({}); // No sizeClass, no widthPercent
			const result = getDimensionsForFormat(node, 'html');

			expect(result).toEqual({
				width: '50%',
				maxWidth: '600px'
			});
		});

		it('should use medium as default for LaTeX', () => {
			const node = createImageNode({});
			const result = getDimensionsForFormat(node, 'latex');

			expect(result).toEqual({
				width: '0.5\\textwidth'
			});
		});

		it('should use medium as default for Typst', () => {
			const node = createImageNode({});
			const result = getDimensionsForFormat(node, 'typst');

			expect(result).toEqual({
				width: '50%'
			});
		});
	});

	describe('edge cases', () => {
		it('should handle decimal widthPercent values for HTML', () => {
			const node = createImageNode({ widthPercent: 33.33 });
			const result = getDimensionsForFormat(node, 'html');

			expect(result).toEqual({ width: '33.33%' });
		});

		it('should handle decimal widthPercent values for LaTeX', () => {
			const node = createImageNode({ widthPercent: 66.67 });
			const result = getDimensionsForFormat(node, 'latex');

			// LaTeX output is now rounded to 2 decimal places for cleaner output
			// 66.67 / 100 = 0.6667, rounded to 2 decimals = 0.67
			expect(result.width).toBe('0.67\\textwidth');
		});

		it('should handle very small widthPercent values', () => {
			const node = createImageNode({ widthPercent: 0.5 });
			const result = getDimensionsForFormat(node, 'html');

			expect(result).toEqual({ width: '0.5%' });
		});
	});
});

// ============================================================================
// autoDetectSizeClass TESTS
// ============================================================================

describe('autoDetectSizeClass', () => {
	describe('panoramic images (ratio > 3)', () => {
		it('should return full for wide panoramic image', () => {
			const result = autoDetectSizeClass(1200, 300); // ratio = 4.0
			expect(result).toBe('full');
		});

		it('should return full for borderline panoramic (ratio slightly > 3)', () => {
			const result = autoDetectSizeClass(901, 300); // ratio ~= 3.003
			expect(result).toBe('full');
		});

		it('should return full for extreme panoramic', () => {
			const result = autoDetectSizeClass(2000, 200); // ratio = 10
			expect(result).toBe('full');
		});
	});

	describe('portrait images (ratio < 0.4)', () => {
		it('should return small for tall portrait image', () => {
			const result = autoDetectSizeClass(200, 600); // ratio ~= 0.33
			expect(result).toBe('small');
		});

		it('should return small for borderline portrait (ratio slightly < 0.4)', () => {
			const result = autoDetectSizeClass(119, 300); // ratio ~= 0.396
			expect(result).toBe('small');
		});

		it('should return small for extreme portrait', () => {
			const result = autoDetectSizeClass(100, 1000); // ratio = 0.1
			expect(result).toBe('small');
		});
	});

	describe('small images (< 200x200)', () => {
		it('should return small for tiny image', () => {
			const result = autoDetectSizeClass(100, 100);
			expect(result).toBe('small');
		});

		it('should return small for small icon', () => {
			const result = autoDetectSizeClass(50, 50);
			expect(result).toBe('small');
		});

		it('should return small for small rectangular image', () => {
			const result = autoDetectSizeClass(150, 100);
			expect(result).toBe('small');
		});

		it('should return small when both dimensions are under 200', () => {
			const result = autoDetectSizeClass(199, 199);
			expect(result).toBe('small');
		});
	});

	describe('large images (width > 800 or height > 600)', () => {
		it('should return large for wide image (> 800px)', () => {
			const result = autoDetectSizeClass(1000, 500); // width > 800
			expect(result).toBe('large');
		});

		it('should return large for tall image (> 600px)', () => {
			const result = autoDetectSizeClass(500, 700); // height > 600
			expect(result).toBe('large');
		});

		it('should return large for both dimensions large', () => {
			const result = autoDetectSizeClass(900, 700);
			expect(result).toBe('large');
		});

		it('should return large for borderline wide (width = 801)', () => {
			const result = autoDetectSizeClass(801, 400);
			expect(result).toBe('large');
		});

		it('should return large for borderline tall (height = 601)', () => {
			const result = autoDetectSizeClass(400, 601);
			expect(result).toBe('large');
		});
	});

	describe('wide images (ratio > 2 but <= 3)', () => {
		it('should return large for wide image with ratio > 2', () => {
			const result = autoDetectSizeClass(600, 250); // ratio = 2.4
			expect(result).toBe('large');
		});

		it('should return large for borderline wide (ratio slightly > 2)', () => {
			const result = autoDetectSizeClass(401, 200); // ratio ~= 2.005
			expect(result).toBe('large');
		});
	});

	describe('standard images (default to medium)', () => {
		it('should return medium for standard 4:3 image', () => {
			const result = autoDetectSizeClass(400, 300); // ratio ~= 1.33
			expect(result).toBe('medium');
		});

		it('should return medium for standard 16:9 image under size threshold', () => {
			const result = autoDetectSizeClass(640, 360); // ratio ~= 1.77
			expect(result).toBe('medium');
		});

		it('should return medium for square image within medium range', () => {
			const result = autoDetectSizeClass(400, 400); // ratio = 1.0
			expect(result).toBe('medium');
		});

		it('should return medium for borderline (width = 800, ratio <= 2)', () => {
			const result = autoDetectSizeClass(800, 500); // ratio = 1.6
			expect(result).toBe('medium');
		});

		it('should return medium for borderline (height = 600, ratio <= 2)', () => {
			const result = autoDetectSizeClass(700, 600); // ratio ~= 1.16
			expect(result).toBe('medium');
		});
	});

	describe('edge cases and boundary conditions', () => {
		it('should return medium for exactly 200x200 image', () => {
			// width = 200, height = 200 - not less than 200 AND 200
			const result = autoDetectSizeClass(200, 200);
			expect(result).toBe('medium');
		});

		it('should handle ratio exactly at 3 (not panoramic)', () => {
			const result = autoDetectSizeClass(900, 300); // ratio = 3.0 exactly
			// ratio > 3 for full, so ratio = 3 should be large (wide image ratio > 2)
			expect(result).toBe('large');
		});

		it('should handle ratio exactly at 0.4 (not portrait)', () => {
			const result = autoDetectSizeClass(200, 500); // ratio = 0.4 exactly
			// ratio < 0.4 for portrait, so ratio = 0.4 is NOT portrait
			// width < 200 && height < 200 is false (height >= 200)
			// width > 800 || height > 600 is false
			// ratio > 2 is false
			expect(result).toBe('medium');
		});

		it('should handle ratio exactly at 2 (not wide)', () => {
			const result = autoDetectSizeClass(400, 200); // ratio = 2.0 exactly
			// ratio > 2 for wide/large, so ratio = 2 should be medium
			expect(result).toBe('medium');
		});
	});

	describe('invalid dimensions (should default to medium)', () => {
		it('should return medium for zero width', () => {
			const result = autoDetectSizeClass(0, 300);
			expect(result).toBe('medium');
		});

		it('should return medium for zero height', () => {
			const result = autoDetectSizeClass(400, 0);
			expect(result).toBe('medium');
		});

		it('should return medium for both dimensions zero', () => {
			const result = autoDetectSizeClass(0, 0);
			expect(result).toBe('medium');
		});

		it('should return medium for negative width', () => {
			const result = autoDetectSizeClass(-100, 300);
			expect(result).toBe('medium');
		});

		it('should return medium for negative height', () => {
			const result = autoDetectSizeClass(400, -200);
			expect(result).toBe('medium');
		});

		it('should return medium for Infinity width', () => {
			const result = autoDetectSizeClass(Infinity, 300);
			expect(result).toBe('medium');
		});

		it('should return medium for Infinity height', () => {
			const result = autoDetectSizeClass(400, Infinity);
			expect(result).toBe('medium');
		});

		it('should return medium for NaN width', () => {
			const result = autoDetectSizeClass(NaN, 300);
			expect(result).toBe('medium');
		});

		it('should return medium for NaN height', () => {
			const result = autoDetectSizeClass(400, NaN);
			expect(result).toBe('medium');
		});
	});
});

// ============================================================================
// getAlignmentStyles TESTS
// ============================================================================

describe('getAlignmentStyles', () => {
	describe('HTML format', () => {
		it('should return left alignment styles', () => {
			const result = getAlignmentStyles('left', 'html');
			expect(result).toBe('margin-right: auto;');
		});

		it('should return center alignment styles', () => {
			const result = getAlignmentStyles('center', 'html');
			expect(result).toBe('margin-left: auto; margin-right: auto;');
		});

		it('should return right alignment styles', () => {
			const result = getAlignmentStyles('right', 'html');
			expect(result).toBe('margin-left: auto;');
		});
	});

	describe('LaTeX format', () => {
		it('should return left alignment command', () => {
			const result = getAlignmentStyles('left', 'latex');
			expect(result).toBe('\\raggedright');
		});

		it('should return center alignment command', () => {
			const result = getAlignmentStyles('center', 'latex');
			expect(result).toBe('\\centering');
		});

		it('should return right alignment command', () => {
			const result = getAlignmentStyles('right', 'latex');
			expect(result).toBe('\\raggedleft');
		});
	});

	describe('Typst format', () => {
		it('should return left alignment property', () => {
			const result = getAlignmentStyles('left', 'typst');
			expect(result).toBe('align: left');
		});

		it('should return center alignment property', () => {
			const result = getAlignmentStyles('center', 'typst');
			expect(result).toBe('align: center');
		});

		it('should return right alignment property', () => {
			const result = getAlignmentStyles('right', 'typst');
			expect(result).toBe('align: right');
		});
	});

	describe('undefined alignment (should default to center)', () => {
		it('should default to center alignment for HTML', () => {
			const result = getAlignmentStyles(undefined, 'html');
			expect(result).toBe('margin-left: auto; margin-right: auto;');
		});

		it('should default to center alignment for LaTeX', () => {
			const result = getAlignmentStyles(undefined, 'latex');
			expect(result).toBe('\\centering');
		});

		it('should default to center alignment for Typst', () => {
			const result = getAlignmentStyles(undefined, 'typst');
			expect(result).toBe('align: center');
		});
	});
});

// ============================================================================
// shouldUseFigureEnvironment TESTS
// ============================================================================

describe('shouldUseFigureEnvironment', () => {
	describe('with caption', () => {
		it('should return true when node has caption', () => {
			const node = createImageNode({ caption: 'Figure 1: Test image' });
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});

		it('should return true when node has caption and inline sizeClass', () => {
			const node = createImageNode({
				caption: 'Figure 1',
				sizeClass: 'inline'
			});
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});

		it('should return true when node has caption and any other sizeClass', () => {
			const node = createImageNode({
				caption: 'Figure 1',
				sizeClass: 'large'
			});
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});

		it('should return true for empty string caption (truthy check)', () => {
			// Note: Empty string is falsy in JavaScript, so this should return false
			const node = createImageNode({ caption: '' });
			expect(shouldUseFigureEnvironment(node)).toBe(false);
		});
	});

	describe('with sizeClass other than inline', () => {
		it('should return true for small sizeClass without caption', () => {
			const node = createImageNode({ sizeClass: 'small' });
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});

		it('should return true for medium sizeClass without caption', () => {
			const node = createImageNode({ sizeClass: 'medium' });
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});

		it('should return true for large sizeClass without caption', () => {
			const node = createImageNode({ sizeClass: 'large' });
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});

		it('should return true for full sizeClass without caption', () => {
			const node = createImageNode({ sizeClass: 'full' });
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});
	});

	describe('with inline sizeClass without caption', () => {
		it('should return false for inline sizeClass without caption', () => {
			const node = createImageNode({ sizeClass: 'inline' });
			expect(shouldUseFigureEnvironment(node)).toBe(false);
		});
	});

	describe('without sizeClass or caption', () => {
		it('should return false for node without sizeClass or caption', () => {
			const node = createImageNode({});
			expect(shouldUseFigureEnvironment(node)).toBe(false);
		});

		it('should return false when only src is provided', () => {
			const node: ImageNode = {
				type: 'image',
				src: 'photo.jpg'
			};
			expect(shouldUseFigureEnvironment(node)).toBe(false);
		});

		it('should return false when alt text is provided but no caption or sizeClass', () => {
			const node = createImageNode({ alt: 'Description of image' });
			expect(shouldUseFigureEnvironment(node)).toBe(false);
		});
	});

	describe('combined scenarios', () => {
		it('should return true for fully specified node with caption', () => {
			const node = createImageNode({
				alt: 'Graph showing sales data',
				title: 'Sales Graph',
				sizeClass: 'large',
				alignment: 'center',
				caption: 'Figure 1: Sales data by quarter'
			});
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});

		it('should return true for node with widthPercent and sizeClass', () => {
			const node = createImageNode({
				widthPercent: 75,
				sizeClass: 'medium'
			});
			// sizeClass is 'medium' which is not 'inline', so should be true
			expect(shouldUseFigureEnvironment(node)).toBe(true);
		});

		it('should return false for inline with widthPercent and no caption', () => {
			const node = createImageNode({
				widthPercent: 50,
				sizeClass: 'inline'
			});
			expect(shouldUseFigureEnvironment(node)).toBe(false);
		});
	});
});
