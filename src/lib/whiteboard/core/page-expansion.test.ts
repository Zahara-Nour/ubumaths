/**
 * Page Expansion Tests
 *
 * Tests for automatic page expansion when drawing near edges.
 */

import { describe, it, expect } from 'vitest';
import {
	isPageExpanded,
	getOriginalDimensions,
	getExpansionFactor,
	getExportScaleFactor,
	calculatePageExpansion,
	expandPageByDelta,
	isNearPageEdge,
	getResetDimensions,
	createExpandedPage,
	createResetPage
} from './page-expansion';
import type { Page } from '../types/document';
import { MAX_EXPANSION_FACTOR, EDGE_DETECTION_THRESHOLD } from '../types/document';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockPage(
	width: number = 794,
	height: number = 1123,
	originalWidth?: number,
	originalHeight?: number
): Page {
	return {
		id: 'test-page',
		elements: [],
		background: { type: 'plain', style: 'plain', color: '#ffffff' },
		width,
		height,
		originalWidth,
		originalHeight
	};
}

// A4 dimensions at 96 DPI
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

// =============================================================================
// isPageExpanded Tests
// =============================================================================

describe('isPageExpanded', () => {
	it('returns false for a regular page', () => {
		const page = createMockPage();
		expect(isPageExpanded(page)).toBe(false);
	});

	it('returns true for an expanded page', () => {
		const page = createMockPage(1588, 2246, A4_WIDTH, A4_HEIGHT);
		expect(isPageExpanded(page)).toBe(true);
	});

	it('returns false if only originalWidth is set', () => {
		const page = createMockPage(1000, 1000, 500, undefined);
		expect(isPageExpanded(page)).toBe(false);
	});

	it('returns false if only originalHeight is set', () => {
		const page = createMockPage(1000, 1000, undefined, 500);
		expect(isPageExpanded(page)).toBe(false);
	});
});

// =============================================================================
// getOriginalDimensions Tests
// =============================================================================

describe('getOriginalDimensions', () => {
	it('returns current dimensions for non-expanded page', () => {
		const page = createMockPage(A4_WIDTH, A4_HEIGHT);
		const dims = getOriginalDimensions(page);
		expect(dims.width).toBe(A4_WIDTH);
		expect(dims.height).toBe(A4_HEIGHT);
	});

	it('returns original dimensions for expanded page', () => {
		const page = createMockPage(1588, 2246, A4_WIDTH, A4_HEIGHT);
		const dims = getOriginalDimensions(page);
		expect(dims.width).toBe(A4_WIDTH);
		expect(dims.height).toBe(A4_HEIGHT);
	});
});

// =============================================================================
// getExpansionFactor Tests
// =============================================================================

describe('getExpansionFactor', () => {
	it('returns 1 for non-expanded page', () => {
		const page = createMockPage();
		expect(getExpansionFactor(page)).toBe(1);
	});

	it('returns correct factor for 2x expanded page', () => {
		const page = createMockPage(A4_WIDTH * 2, A4_HEIGHT * 2, A4_WIDTH, A4_HEIGHT);
		expect(getExpansionFactor(page)).toBe(2);
	});

	it('returns correct factor for partially expanded page', () => {
		const page = createMockPage(A4_WIDTH * 1.5, A4_HEIGHT * 1.5, A4_WIDTH, A4_HEIGHT);
		expect(getExpansionFactor(page)).toBeCloseTo(1.5);
	});
});

// =============================================================================
// getExportScaleFactor Tests
// =============================================================================

describe('getExportScaleFactor', () => {
	it('returns 1 for non-expanded page', () => {
		const page = createMockPage();
		expect(getExportScaleFactor(page)).toBe(1);
	});

	it('returns 0.5 for 2x expanded page', () => {
		const page = createMockPage(A4_WIDTH * 2, A4_HEIGHT * 2, A4_WIDTH, A4_HEIGHT);
		expect(getExportScaleFactor(page)).toBe(0.5);
	});

	it('returns correct inverse factor for arbitrary expansion', () => {
		const page = createMockPage(A4_WIDTH * 3, A4_HEIGHT * 3, A4_WIDTH, A4_HEIGHT);
		expect(getExportScaleFactor(page)).toBeCloseTo(1 / 3);
	});
});

// =============================================================================
// calculatePageExpansion Tests
// =============================================================================

describe('calculatePageExpansion', () => {
	it('returns no expansion for point in center of page', () => {
		const page = createMockPage();
		const result = calculatePageExpansion(page, { x: 400, y: 500 });
		expect(result.needsExpansion).toBe(false);
		expect(result.newWidth).toBe(A4_WIDTH);
		expect(result.newHeight).toBe(A4_HEIGHT);
	});

	it('returns no expansion for point near left/top edge', () => {
		const page = createMockPage();
		const result = calculatePageExpansion(page, { x: 10, y: 10 });
		expect(result.needsExpansion).toBe(false);
	});

	it('triggers expansion when near right edge', () => {
		const page = createMockPage();
		const nearRightEdge = A4_WIDTH - EDGE_DETECTION_THRESHOLD + 10;
		const result = calculatePageExpansion(page, { x: nearRightEdge, y: 500 });
		expect(result.needsExpansion).toBe(true);
		expect(result.newWidth).toBeGreaterThan(A4_WIDTH);
	});

	it('triggers expansion when near bottom edge', () => {
		const page = createMockPage();
		const nearBottomEdge = A4_HEIGHT - EDGE_DETECTION_THRESHOLD + 10;
		const result = calculatePageExpansion(page, { x: 400, y: nearBottomEdge });
		expect(result.needsExpansion).toBe(true);
		expect(result.newHeight).toBeGreaterThan(A4_HEIGHT);
	});

	it('maintains aspect ratio when expanding', () => {
		const page = createMockPage();
		const originalAspectRatio = A4_WIDTH / A4_HEIGHT;
		const nearRightEdge = A4_WIDTH - 10;
		const result = calculatePageExpansion(page, { x: nearRightEdge, y: 500 });

		if (result.needsExpansion) {
			const newAspectRatio = result.newWidth / result.newHeight;
			expect(newAspectRatio).toBeCloseTo(originalAspectRatio, 2);
		}
	});

	it('respects MAX_EXPANSION_FACTOR limit (√2 for area x2)', () => {
		const page = createMockPage();
		// Try to expand way beyond max (√2 ≈ 1.414)
		const result = calculatePageExpansion(page, { x: A4_WIDTH * 10, y: A4_HEIGHT * 10 });

		// MAX_EXPANSION_FACTOR is √2 ≈ 1.414 (area doubles)
		expect(result.newWidth).toBeLessThanOrEqual(Math.ceil(A4_WIDTH * MAX_EXPANSION_FACTOR));
		expect(result.newHeight).toBeLessThanOrEqual(Math.ceil(A4_HEIGHT * MAX_EXPANSION_FACTOR));
	});

	it('adds EXPANSION_MARGIN to the point position', () => {
		const page = createMockPage();
		const pointX = A4_WIDTH - 20;
		const result = calculatePageExpansion(page, { x: pointX, y: 500 });

		if (result.needsExpansion) {
			// The expansion should account for the margin
			// Due to aspect ratio maintenance, the actual width might be higher
			expect(result.newWidth).toBeGreaterThanOrEqual(pointX);
		}
	});

	it('allows custom margin parameter', () => {
		const page = createMockPage();
		const customMargin = 200;
		const pointX = A4_WIDTH - 20;
		const result = calculatePageExpansion(page, { x: pointX, y: 500 }, customMargin);

		if (result.needsExpansion) {
			expect(result.newWidth).toBeGreaterThanOrEqual(pointX);
		}
	});

	it('continues to expand an already expanded page (within limit)', () => {
		// Use 1.2x which is below the √2 ≈ 1.414 limit
		const expandedPage = createMockPage(
			Math.round(A4_WIDTH * 1.2),
			Math.round(A4_HEIGHT * 1.2),
			A4_WIDTH,
			A4_HEIGHT
		);
		const nearEdge = expandedPage.width - 20;
		const result = calculatePageExpansion(expandedPage, { x: nearEdge, y: 500 });

		// Should still be able to expand since 1.2 < √2
		expect(result.needsExpansion).toBe(true);
		expect(result.newWidth).toBeGreaterThan(expandedPage.width);
	});

	it('does not expand beyond MAX_EXPANSION_FACTOR limit', () => {
		// Page already at max (√2 ≈ 1.414)
		const maxExpanded = createMockPage(
			Math.round(A4_WIDTH * MAX_EXPANSION_FACTOR),
			Math.round(A4_HEIGHT * MAX_EXPANSION_FACTOR),
			A4_WIDTH,
			A4_HEIGHT
		);
		const nearEdge = maxExpanded.width - 20;
		const result = calculatePageExpansion(maxExpanded, { x: nearEdge, y: 500 });

		// Should not expand further
		expect(result.needsExpansion).toBe(false);
	});
});

// =============================================================================
// isNearPageEdge Tests
// =============================================================================

describe('isNearPageEdge', () => {
	it('returns false for center point', () => {
		const page = createMockPage();
		const result = isNearPageEdge(page, { x: 400, y: 500 });
		expect(result.nearRight).toBe(false);
		expect(result.nearBottom).toBe(false);
	});

	it('returns true for near right edge', () => {
		const page = createMockPage();
		const result = isNearPageEdge(page, { x: A4_WIDTH - 10, y: 500 });
		expect(result.nearRight).toBe(true);
		expect(result.nearBottom).toBe(false);
	});

	it('returns true for near bottom edge', () => {
		const page = createMockPage();
		const result = isNearPageEdge(page, { x: 400, y: A4_HEIGHT - 10 });
		expect(result.nearRight).toBe(false);
		expect(result.nearBottom).toBe(true);
	});

	it('returns true for both edges in corner', () => {
		const page = createMockPage();
		const result = isNearPageEdge(page, { x: A4_WIDTH - 10, y: A4_HEIGHT - 10 });
		expect(result.nearRight).toBe(true);
		expect(result.nearBottom).toBe(true);
	});

	it('does not trigger for negative coordinates', () => {
		const page = createMockPage();
		const result = isNearPageEdge(page, { x: -10, y: -10 });
		expect(result.nearRight).toBe(false);
		expect(result.nearBottom).toBe(false);
	});
});

// =============================================================================
// getResetDimensions Tests
// =============================================================================

describe('getResetDimensions', () => {
	it('returns null for non-expanded page', () => {
		const page = createMockPage();
		expect(getResetDimensions(page)).toBeNull();
	});

	it('returns original dimensions for expanded page', () => {
		const page = createMockPage(1588, 2246, A4_WIDTH, A4_HEIGHT);
		const dims = getResetDimensions(page);
		expect(dims).toEqual({ width: A4_WIDTH, height: A4_HEIGHT });
	});
});

// =============================================================================
// createExpandedPage Tests
// =============================================================================

describe('createExpandedPage', () => {
	it('creates expanded page with original dimensions preserved', () => {
		const page = createMockPage();
		const expanded = createExpandedPage(page, 1000, 1414);

		expect(expanded.width).toBe(1000);
		expect(expanded.height).toBe(1414);
		expect(expanded.originalWidth).toBe(A4_WIDTH);
		expect(expanded.originalHeight).toBe(A4_HEIGHT);
	});

	it('preserves existing original dimensions on further expansion', () => {
		const alreadyExpanded = createMockPage(1000, 1414, A4_WIDTH, A4_HEIGHT);
		const furtherExpanded = createExpandedPage(alreadyExpanded, 1200, 1697);

		expect(furtherExpanded.width).toBe(1200);
		expect(furtherExpanded.height).toBe(1697);
		expect(furtherExpanded.originalWidth).toBe(A4_WIDTH);
		expect(furtherExpanded.originalHeight).toBe(A4_HEIGHT);
	});

	it('preserves all other page properties', () => {
		const page = createMockPage();
		const expanded = createExpandedPage(page, 1000, 1414);

		expect(expanded.id).toBe(page.id);
		expect(expanded.elements).toBe(page.elements);
		expect(expanded.background).toBe(page.background);
	});
});

// =============================================================================
// createResetPage Tests
// =============================================================================

describe('createResetPage', () => {
	it('returns same page if not expanded', () => {
		const page = createMockPage();
		const reset = createResetPage(page);
		expect(reset).toBe(page);
	});

	it('resets to original dimensions', () => {
		const expanded = createMockPage(1588, 2246, A4_WIDTH, A4_HEIGHT);
		const reset = createResetPage(expanded);

		expect(reset.width).toBe(A4_WIDTH);
		expect(reset.height).toBe(A4_HEIGHT);
	});

	it('removes originalWidth and originalHeight', () => {
		const expanded = createMockPage(1588, 2246, A4_WIDTH, A4_HEIGHT);
		const reset = createResetPage(expanded);

		expect(reset.originalWidth).toBeUndefined();
		expect(reset.originalHeight).toBeUndefined();
	});

	it('preserves other page properties', () => {
		const expanded = createMockPage(1588, 2246, A4_WIDTH, A4_HEIGHT);
		const reset = createResetPage(expanded);

		expect(reset.id).toBe(expanded.id);
		expect(reset.elements).toBe(expanded.elements);
		expect(reset.background).toBe(expanded.background);
	});
});

// =============================================================================
// expandPageByDelta Tests (for pan-based progressive expansion)
// =============================================================================

describe('expandPageByDelta', () => {
	it('returns null for zero delta', () => {
		const page = createMockPage();
		const result = expandPageByDelta(page, 0, 0);
		expect(result).toBeNull();
	});

	it('returns null for negative delta', () => {
		const page = createMockPage();
		const result = expandPageByDelta(page, -50, -50);
		expect(result).toBeNull();
	});

	it('expands progressively by small delta', () => {
		const page = createMockPage();
		const delta = 50; // 50 pixels
		const result = expandPageByDelta(page, delta, 0);

		expect(result).not.toBeNull();
		if (result) {
			// Should expand by the delta amount (with aspect ratio maintenance)
			expect(result.width).toBeGreaterThan(A4_WIDTH);
			// Expansion should be proportional, not max
			expect(result.width).toBeLessThan(A4_WIDTH + delta * 2);
		}
	});

	it('maintains aspect ratio when expanding', () => {
		const page = createMockPage();
		const originalAspectRatio = A4_WIDTH / A4_HEIGHT;
		const result = expandPageByDelta(page, 100, 0);

		expect(result).not.toBeNull();
		if (result) {
			const newAspectRatio = result.width / result.height;
			expect(newAspectRatio).toBeCloseTo(originalAspectRatio, 2);
		}
	});

	it('respects MAX_EXPANSION_FACTOR limit', () => {
		const page = createMockPage();
		// Try to expand beyond limit
		const result = expandPageByDelta(page, A4_WIDTH * 10, A4_HEIGHT * 10);

		expect(result).not.toBeNull();
		if (result) {
			expect(result.width).toBeLessThanOrEqual(Math.ceil(A4_WIDTH * MAX_EXPANSION_FACTOR));
			expect(result.height).toBeLessThanOrEqual(Math.ceil(A4_HEIGHT * MAX_EXPANSION_FACTOR));
		}
	});

	it('returns null when page is already at max expansion', () => {
		const maxExpanded = createMockPage(
			Math.round(A4_WIDTH * MAX_EXPANSION_FACTOR),
			Math.round(A4_HEIGHT * MAX_EXPANSION_FACTOR),
			A4_WIDTH,
			A4_HEIGHT
		);
		const result = expandPageByDelta(maxExpanded, 50, 50);
		expect(result).toBeNull();
	});

	it('allows further expansion of already expanded page (within limit)', () => {
		// Page at 1.2x, still below √2 ≈ 1.414
		const expandedPage = createMockPage(
			Math.round(A4_WIDTH * 1.2),
			Math.round(A4_HEIGHT * 1.2),
			A4_WIDTH,
			A4_HEIGHT
		);
		const result = expandPageByDelta(expandedPage, 50, 50);

		expect(result).not.toBeNull();
		if (result) {
			expect(result.width).toBeGreaterThan(expandedPage.width);
			expect(result.height).toBeGreaterThan(expandedPage.height);
		}
	});

	it('progressive expansion is additive', () => {
		const page = createMockPage();
		const delta = 20;

		// First expansion
		const result1 = expandPageByDelta(page, delta, 0);
		expect(result1).not.toBeNull();

		// Second expansion (using expanded page)
		if (result1) {
			const expandedPage = createMockPage(result1.width, result1.height, A4_WIDTH, A4_HEIGHT);
			const result2 = expandPageByDelta(expandedPage, delta, 0);

			expect(result2).not.toBeNull();
			if (result2) {
				// Should be larger than first expansion
				expect(result2.width).toBeGreaterThan(result1.width);
			}
		}
	});
});
