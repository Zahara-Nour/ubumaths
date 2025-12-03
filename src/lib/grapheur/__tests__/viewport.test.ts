/**
 * Unit tests for Grapheur viewport module
 */

import { describe, it, expect } from 'vitest';
import {
	DEFAULT_VIEWPORT,
	createTransformer,
	panViewport,
	zoomViewport,
	resetViewport,
	createViewport,
	getViewportMetrics,
	isValidViewport,
	clampViewport
} from '../viewport';
import type { Viewport } from '../types';

// =============================================================================
// Default Viewport Tests
// =============================================================================

describe('DEFAULT_VIEWPORT', () => {
	it('has correct default values', () => {
		expect(DEFAULT_VIEWPORT).toEqual({
			xMin: -10,
			xMax: 10,
			yMin: -10,
			yMax: 10
		});
	});
});

// =============================================================================
// Coordinate Transformer Tests
// =============================================================================

describe('createTransformer', () => {
	describe('mathToSvg', () => {
		it('transforms origin to center for centered viewport', () => {
			const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transformer = createTransformer(viewport, 500, 500);

			const svgPoint = transformer.mathToSvg(0, 0);
			expect(svgPoint.x).toBe(250);
			expect(svgPoint.y).toBe(250);
		});

		it('transforms math top-right to SVG top-right', () => {
			const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transformer = createTransformer(viewport, 500, 500);

			const svgPoint = transformer.mathToSvg(10, 10);
			expect(svgPoint.x).toBe(500);
			expect(svgPoint.y).toBe(0); // Y is inverted
		});

		it('transforms math bottom-left to SVG bottom-left', () => {
			const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transformer = createTransformer(viewport, 500, 500);

			const svgPoint = transformer.mathToSvg(-10, -10);
			expect(svgPoint.x).toBe(0);
			expect(svgPoint.y).toBe(500); // Y is inverted
		});

		it('handles non-square viewports', () => {
			const viewport: Viewport = { xMin: 0, xMax: 10, yMin: 0, yMax: 5 };
			const transformer = createTransformer(viewport, 400, 200);

			// Center should be at (5, 2.5) in math coords = (200, 100) in SVG
			const center = transformer.mathToSvg(5, 2.5);
			expect(center.x).toBe(200);
			expect(center.y).toBe(100);
		});

		it('handles non-square SVG dimensions', () => {
			const viewport: Viewport = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
			const transformer = createTransformer(viewport, 1000, 500);

			// Math point (5, 5) should be at center
			const center = transformer.mathToSvg(5, 5);
			expect(center.x).toBe(500);
			expect(center.y).toBe(250);
		});

		it('handles negative viewports', () => {
			const viewport: Viewport = { xMin: -100, xMax: -50, yMin: -100, yMax: -50 };
			const transformer = createTransformer(viewport, 500, 500);

			// Center of viewport: (-75, -75)
			const center = transformer.mathToSvg(-75, -75);
			expect(center.x).toBe(250);
			expect(center.y).toBe(250);
		});

		it('exposes correct scale values', () => {
			const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transformer = createTransformer(viewport, 800, 600);

			// 800px / 20 math units = 40 px/unit
			expect(transformer.scaleX).toBe(40);
			// 600px / 20 math units = 30 px/unit
			expect(transformer.scaleY).toBe(30);
		});

		it('handles zero-span viewport defensively', () => {
			const viewport: Viewport = { xMin: 5, xMax: 5, yMin: 10, yMax: 10 };
			const transformer = createTransformer(viewport, 500, 500);

			// Should not crash or produce NaN
			const result = transformer.mathToSvg(5, 10);
			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});
	});

	describe('svgToMath', () => {
		it('transforms SVG center to math origin for centered viewport', () => {
			const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transformer = createTransformer(viewport, 500, 500);

			const mathPoint = transformer.svgToMath(250, 250);
			expect(mathPoint.x).toBeCloseTo(0, 10);
			expect(mathPoint.y).toBeCloseTo(0, 10);
		});

		it('transforms SVG corners correctly', () => {
			const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transformer = createTransformer(viewport, 500, 500);

			// Top-left SVG (0, 0) -> Math (-10, 10)
			const topLeft = transformer.svgToMath(0, 0);
			expect(topLeft.x).toBeCloseTo(-10, 10);
			expect(topLeft.y).toBeCloseTo(10, 10);

			// Bottom-right SVG (500, 500) -> Math (10, -10)
			const bottomRight = transformer.svgToMath(500, 500);
			expect(bottomRight.x).toBeCloseTo(10, 10);
			expect(bottomRight.y).toBeCloseTo(-10, 10);
		});

		it('is inverse of mathToSvg', () => {
			const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
			const transformer = createTransformer(viewport, 500, 500);

			const original = { x: 3.5, y: -7.2 };
			const svg = transformer.mathToSvg(original.x, original.y);
			const backToMath = transformer.svgToMath(svg.x, svg.y);

			expect(backToMath.x).toBeCloseTo(original.x, 10);
			expect(backToMath.y).toBeCloseTo(original.y, 10);
		});

		it('handles non-square viewports correctly', () => {
			const viewport: Viewport = { xMin: 0, xMax: 20, yMin: 0, yMax: 10 };
			const transformer = createTransformer(viewport, 400, 200);

			// SVG (200, 100) should map to center (10, 5)
			const center = transformer.svgToMath(200, 100);
			expect(center.x).toBeCloseTo(10, 10);
			expect(center.y).toBeCloseTo(5, 10);
		});
	});
});

// =============================================================================
// Viewport Operations Tests
// =============================================================================

describe('panViewport', () => {
	it('pans right by positive dx', () => {
		const viewport = DEFAULT_VIEWPORT;
		const panned = panViewport(viewport, 5, 0);

		expect(panned).toEqual({
			xMin: -5,
			xMax: 15,
			yMin: -10,
			yMax: 10
		});
	});

	it('pans left by negative dx', () => {
		const viewport = DEFAULT_VIEWPORT;
		const panned = panViewport(viewport, -5, 0);

		expect(panned).toEqual({
			xMin: -15,
			xMax: 5,
			yMin: -10,
			yMax: 10
		});
	});

	it('pans up by positive dy', () => {
		const viewport = DEFAULT_VIEWPORT;
		const panned = panViewport(viewport, 0, 5);

		expect(panned).toEqual({
			xMin: -10,
			xMax: 10,
			yMin: -5,
			yMax: 15
		});
	});

	it('pans down by negative dy', () => {
		const viewport = DEFAULT_VIEWPORT;
		const panned = panViewport(viewport, 0, -5);

		expect(panned).toEqual({
			xMin: -10,
			xMax: 10,
			yMin: -15,
			yMax: 5
		});
	});

	it('pans diagonally', () => {
		const viewport = DEFAULT_VIEWPORT;
		const panned = panViewport(viewport, 3, 4);

		expect(panned).toEqual({
			xMin: -7,
			xMax: 13,
			yMin: -6,
			yMax: 14
		});
	});

	it('does not modify original viewport', () => {
		const viewport = { ...DEFAULT_VIEWPORT };
		const original = { ...viewport };
		panViewport(viewport, 5, 5);

		expect(viewport).toEqual(original);
	});

	it('handles zero pan', () => {
		const viewport = DEFAULT_VIEWPORT;
		const panned = panViewport(viewport, 0, 0);

		expect(panned).toEqual(viewport);
	});
});

describe('zoomViewport', () => {
	it('zooms in by factor 0.5 at center', () => {
		const viewport = DEFAULT_VIEWPORT;
		const zoomed = zoomViewport(viewport, 0.5);

		expect(zoomed).toEqual({
			xMin: -5,
			xMax: 5,
			yMin: -5,
			yMax: 5
		});
	});

	it('zooms out by factor 2 at center', () => {
		const viewport = DEFAULT_VIEWPORT;
		const zoomed = zoomViewport(viewport, 2);

		expect(zoomed).toEqual({
			xMin: -20,
			xMax: 20,
			yMin: -20,
			yMax: 20
		});
	});

	it('zooms around custom center point', () => {
		const viewport = DEFAULT_VIEWPORT;
		const zoomed = zoomViewport(viewport, 0.5, 5, 5);

		// Should zoom in, keeping (5, 5) at the same relative position
		expect(zoomed.xMax - zoomed.xMin).toBeCloseTo(10, 5);
		expect(zoomed.yMax - zoomed.yMin).toBeCloseTo(10, 5);

		// The center point (5, 5) should remain at the same relative position
		const relX = (5 - viewport.xMin) / (viewport.xMax - viewport.xMin);
		const relY = (5 - viewport.yMin) / (viewport.yMax - viewport.yMin);

		const newRelX = (5 - zoomed.xMin) / (zoomed.xMax - zoomed.xMin);
		const newRelY = (5 - zoomed.yMin) / (zoomed.yMax - zoomed.yMin);

		expect(newRelX).toBeCloseTo(relX, 5);
		expect(newRelY).toBeCloseTo(relY, 5);
	});

	it('maintains aspect ratio', () => {
		const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -5, yMax: 15 };
		const originalRatio = (viewport.xMax - viewport.xMin) / (viewport.yMax - viewport.yMin);

		const zoomed = zoomViewport(viewport, 1.5);
		const newRatio = (zoomed.xMax - zoomed.xMin) / (zoomed.yMax - zoomed.yMin);

		expect(newRatio).toBeCloseTo(originalRatio, 10);
	});

	it('clamps to minimum span', () => {
		const viewport: Viewport = { xMin: 0, xMax: 1e-9, yMin: 0, yMax: 1e-9 };
		const zoomed = zoomViewport(viewport, 0.1);

		// Should be clamped to MIN_SPAN (1e-6)
		expect(zoomed.xMax - zoomed.xMin).toBeGreaterThanOrEqual(1e-6);
		expect(zoomed.yMax - zoomed.yMin).toBeGreaterThanOrEqual(1e-6);
	});

	it('clamps to maximum span', () => {
		const viewport: Viewport = { xMin: -1e9, xMax: 1e9, yMin: -1e9, yMax: 1e9 };
		const zoomed = zoomViewport(viewport, 100);

		// Should be clamped to MAX_SPAN (1e10)
		expect(zoomed.xMax - zoomed.xMin).toBeLessThanOrEqual(1e10);
		expect(zoomed.yMax - zoomed.yMin).toBeLessThanOrEqual(1e10);
	});

	it('does not modify original viewport', () => {
		const viewport = { ...DEFAULT_VIEWPORT };
		const original = { ...viewport };
		zoomViewport(viewport, 2);

		expect(viewport).toEqual(original);
	});

	it('handles zoom factor of 1', () => {
		const viewport = DEFAULT_VIEWPORT;
		const zoomed = zoomViewport(viewport, 1);

		expect(zoomed.xMax - zoomed.xMin).toBeCloseTo(viewport.xMax - viewport.xMin, 5);
		expect(zoomed.yMax - zoomed.yMin).toBeCloseTo(viewport.yMax - viewport.yMin, 5);
	});
});

describe('resetViewport', () => {
	it('returns default viewport', () => {
		const reset = resetViewport();
		expect(reset).toEqual(DEFAULT_VIEWPORT);
	});

	it('returns a new object (not the same reference)', () => {
		const reset = resetViewport();
		expect(reset).not.toBe(DEFAULT_VIEWPORT);
	});
});

describe('createViewport', () => {
	it('creates centered viewport with specified width', () => {
		const viewport = createViewport(0, 0, 20);

		expect(viewport).toEqual({
			xMin: -10,
			xMax: 10,
			yMin: -10,
			yMax: 10
		});
	});

	it('creates centered viewport with different height', () => {
		const viewport = createViewport(0, 0, 40, 20);

		expect(viewport).toEqual({
			xMin: -20,
			xMax: 20,
			yMin: -10,
			yMax: 10
		});
	});

	it('creates viewport centered at non-origin point', () => {
		const viewport = createViewport(5, 5, 10);

		expect(viewport).toEqual({
			xMin: 0,
			xMax: 10,
			yMin: 0,
			yMax: 10
		});
	});

	it('creates viewport with negative center', () => {
		const viewport = createViewport(-5, -5, 10);

		expect(viewport).toEqual({
			xMin: -10,
			xMax: 0,
			yMin: -10,
			yMax: 0
		});
	});

	it('clamps to minimum span', () => {
		const viewport = createViewport(0, 0, 1e-9, 1e-9);

		expect(viewport.xMax - viewport.xMin).toBeGreaterThanOrEqual(1e-6);
		expect(viewport.yMax - viewport.yMin).toBeGreaterThanOrEqual(1e-6);
	});

	it('clamps to maximum span', () => {
		const viewport = createViewport(0, 0, 1e12, 1e12);

		expect(viewport.xMax - viewport.xMin).toBeLessThanOrEqual(1e10);
		expect(viewport.yMax - viewport.yMin).toBeLessThanOrEqual(1e10);
	});

	it('uses width for height when height is not specified', () => {
		const viewport = createViewport(0, 0, 20);

		expect(viewport.xMax - viewport.xMin).toBe(viewport.yMax - viewport.yMin);
	});
});

// =============================================================================
// Viewport Metrics Tests
// =============================================================================

describe('getViewportMetrics', () => {
	it('calculates metrics for default viewport', () => {
		const metrics = getViewportMetrics(DEFAULT_VIEWPORT);

		expect(metrics).toEqual({
			width: 20,
			height: 20,
			centerX: 0,
			centerY: 0
		});
	});

	it('calculates metrics for non-centered viewport', () => {
		const viewport: Viewport = { xMin: 0, xMax: 10, yMin: 5, yMax: 15 };
		const metrics = getViewportMetrics(viewport);

		expect(metrics).toEqual({
			width: 10,
			height: 10,
			centerX: 5,
			centerY: 10
		});
	});

	it('handles negative viewports', () => {
		const viewport: Viewport = { xMin: -20, xMax: -10, yMin: -30, yMax: -20 };
		const metrics = getViewportMetrics(viewport);

		expect(metrics).toEqual({
			width: 10,
			height: 10,
			centerX: -15,
			centerY: -25
		});
	});

	it('handles non-square viewports', () => {
		const viewport: Viewport = { xMin: 0, xMax: 100, yMin: 0, yMax: 50 };
		const metrics = getViewportMetrics(viewport);

		expect(metrics).toEqual({
			width: 100,
			height: 50,
			centerX: 50,
			centerY: 25
		});
	});
});

// =============================================================================
// Viewport Validation Tests
// =============================================================================

describe('isValidViewport', () => {
	it('returns true for valid viewport', () => {
		expect(isValidViewport(DEFAULT_VIEWPORT)).toBe(true);
	});

	it('returns false when xMin >= xMax', () => {
		const viewport: Viewport = { xMin: 10, xMax: 10, yMin: -10, yMax: 10 };
		expect(isValidViewport(viewport)).toBe(false);

		const inverted: Viewport = { xMin: 10, xMax: -10, yMin: -10, yMax: 10 };
		expect(isValidViewport(inverted)).toBe(false);
	});

	it('returns false when yMin >= yMax', () => {
		const viewport: Viewport = { xMin: -10, xMax: 10, yMin: 10, yMax: 10 };
		expect(isValidViewport(viewport)).toBe(false);

		const inverted: Viewport = { xMin: -10, xMax: 10, yMin: 10, yMax: -10 };
		expect(isValidViewport(inverted)).toBe(false);
	});

	it('returns false when any value is Infinity', () => {
		expect(isValidViewport({ xMin: -Infinity, xMax: 10, yMin: -10, yMax: 10 })).toBe(false);
		expect(isValidViewport({ xMin: -10, xMax: Infinity, yMin: -10, yMax: 10 })).toBe(false);
		expect(isValidViewport({ xMin: -10, xMax: 10, yMin: -Infinity, yMax: 10 })).toBe(false);
		expect(isValidViewport({ xMin: -10, xMax: 10, yMin: -10, yMax: Infinity })).toBe(false);
	});

	it('returns false when any value is NaN', () => {
		expect(isValidViewport({ xMin: NaN, xMax: 10, yMin: -10, yMax: 10 })).toBe(false);
		expect(isValidViewport({ xMin: -10, xMax: NaN, yMin: -10, yMax: 10 })).toBe(false);
		expect(isValidViewport({ xMin: -10, xMax: 10, yMin: NaN, yMax: 10 })).toBe(false);
		expect(isValidViewport({ xMin: -10, xMax: 10, yMin: -10, yMax: NaN })).toBe(false);
	});

	it('returns true for very small viewports', () => {
		const viewport: Viewport = {
			xMin: 0,
			xMax: 1e-10,
			yMin: 0,
			yMax: 1e-10
		};
		expect(isValidViewport(viewport)).toBe(true);
	});

	it('returns true for very large viewports', () => {
		const viewport: Viewport = {
			xMin: -1e15,
			xMax: 1e15,
			yMin: -1e15,
			yMax: 1e15
		};
		expect(isValidViewport(viewport)).toBe(true);
	});
});

describe('clampViewport', () => {
	it('returns viewport unchanged if already valid', () => {
		const viewport = DEFAULT_VIEWPORT;
		const clamped = clampViewport(viewport);

		expect(clamped).toEqual(viewport);
	});

	it('returns default viewport when values are not finite', () => {
		const viewport: Viewport = { xMin: NaN, xMax: 10, yMin: -10, yMax: 10 };
		const clamped = clampViewport(viewport);

		expect(clamped).toEqual(DEFAULT_VIEWPORT);
	});

	it('returns default viewport when values are infinite', () => {
		const viewport: Viewport = {
			xMin: -Infinity,
			xMax: 10,
			yMin: -10,
			yMax: 10
		};
		const clamped = clampViewport(viewport);

		expect(clamped).toEqual(DEFAULT_VIEWPORT);
	});

	it('fixes viewport when xMin >= xMax', () => {
		const viewport: Viewport = { xMin: 10, xMax: 5, yMin: -10, yMax: 10 };
		const clamped = clampViewport(viewport);

		expect(clamped.xMin).toBeLessThan(clamped.xMax);
		// Use toBeCloseTo for floating point comparison (MIN_SPAN / 2 may have precision issues)
		expect(clamped.xMax - clamped.xMin).toBeCloseTo(1e-6, 10);
	});

	it('fixes viewport when yMin >= yMax', () => {
		const viewport: Viewport = { xMin: -10, xMax: 10, yMin: 10, yMax: 5 };
		const clamped = clampViewport(viewport);

		expect(clamped.yMin).toBeLessThan(clamped.yMax);
		// Use toBeCloseTo for floating point comparison (MIN_SPAN / 2 may have precision issues)
		expect(clamped.yMax - clamped.yMin).toBeCloseTo(1e-6, 10);
	});

	it('clamps span to maximum', () => {
		const viewport: Viewport = {
			xMin: -1e11,
			xMax: 1e11,
			yMin: -1e11,
			yMax: 1e11
		};
		const clamped = clampViewport(viewport);

		expect(clamped.xMax - clamped.xMin).toBeLessThanOrEqual(1e10);
		expect(clamped.yMax - clamped.yMin).toBeLessThanOrEqual(1e10);
	});

	it('preserves center when clamping span', () => {
		const viewport: Viewport = {
			xMin: -1e11,
			xMax: 1e11,
			yMin: -1e11,
			yMax: 1e11
		};
		const originalCenterX = (viewport.xMin + viewport.xMax) / 2;
		const originalCenterY = (viewport.yMin + viewport.yMax) / 2;

		const clamped = clampViewport(viewport);
		const clampedCenterX = (clamped.xMin + clamped.xMax) / 2;
		const clampedCenterY = (clamped.yMin + clamped.yMax) / 2;

		expect(clampedCenterX).toBeCloseTo(originalCenterX, 5);
		expect(clampedCenterY).toBeCloseTo(originalCenterY, 5);
	});
});
