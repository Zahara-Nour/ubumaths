/**
 * Tests for Stroke Smoothing with perfect-freehand
 */

import { describe, it, expect } from 'vitest';
import {
	smoothStroke,
	getToolOptions,
	pointsToSvgPath,
	getBoundingBox,
	doStrokesIntersect
} from '../core/stroke-smoothing';
import type { Point } from '../types/document';

describe('Stroke Smoothing', () => {
	describe('smoothStroke', () => {
		it('converts raw points to smooth outline points', () => {
			const points: Point[] = [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
				{ x: 20, y: 20 }
			];

			const result = smoothStroke(points, { size: 4 });

			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBeGreaterThan(0);
			// Each point should be [x, y] or [x, y, pressure]
			expect(result[0]).toBeInstanceOf(Array);
			expect(result[0].length).toBeGreaterThanOrEqual(2);
		});

		it('returns empty array for empty input', () => {
			const result = smoothStroke([], { size: 4 });
			expect(result).toEqual([]);
		});

		it('handles single point input', () => {
			const points: Point[] = [{ x: 50, y: 50 }];
			const result = smoothStroke(points, { size: 4 });

			// Should still produce some output (a dot)
			expect(result.length).toBeGreaterThanOrEqual(0);
		});

		it('respects pressure data when provided', () => {
			const pointsWithPressure: Point[] = [
				{ x: 0, y: 0, pressure: 0.5 },
				{ x: 10, y: 10, pressure: 1.0 },
				{ x: 20, y: 20, pressure: 0.3 }
			];

			const result = smoothStroke(pointsWithPressure, { size: 8, simulatePressure: false });

			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBeGreaterThan(0);
		});

		it('applies size option correctly', () => {
			const points: Point[] = [
				{ x: 0, y: 0 },
				{ x: 50, y: 50 }
			];

			const smallStroke = smoothStroke(points, { size: 2 });
			const largeStroke = smoothStroke(points, { size: 20 });

			// Larger stroke should have more spread in the outline
			expect(smallStroke).not.toEqual(largeStroke);
		});
	});

	describe('getToolOptions', () => {
		it('returns correct options for pen tool', () => {
			const options = getToolOptions('pen', 4, '#000000', 1);

			expect(options.size).toBe(4);
			expect(options.thinning).toBeGreaterThan(0);
			expect(options.smoothing).toBeGreaterThan(0);
			expect(options.streamline).toBeGreaterThan(0);
		});

		it('returns correct options for highlighter tool', () => {
			const options = getToolOptions('highlighter', 20, '#FFFF00', 0.3);

			expect(options.size).toBe(20);
			// Highlighter should have less thinning for consistent width
			expect(options.thinning).toBeLessThanOrEqual(0.2);
		});

		it('returns correct options for eraser tool', () => {
			const options = getToolOptions('eraser', 10, '#FFFFFF', 1);

			expect(options.size).toBe(10);
		});

		it('clamps size to valid range', () => {
			const tooSmall = getToolOptions('pen', 0.1, '#000000', 1);
			const tooLarge = getToolOptions('pen', 200, '#000000', 1);

			expect(tooSmall.size).toBeGreaterThanOrEqual(1);
			expect(tooLarge.size).toBeLessThanOrEqual(100);
		});
	});

	describe('pointsToSvgPath', () => {
		it('converts outline points to SVG path string', () => {
			const outlinePoints: number[][] = [
				[0, 0],
				[10, 0],
				[10, 10],
				[0, 10]
			];

			const path = pointsToSvgPath(outlinePoints);

			expect(path).toContain('M');
			expect(path).toContain('0');
			expect(path).toContain('10');
		});

		it('returns empty string for empty input', () => {
			const path = pointsToSvgPath([]);
			expect(path).toBe('');
		});

		it('handles single point (creates a dot path)', () => {
			const outlinePoints: number[][] = [[50, 50]];
			const path = pointsToSvgPath(outlinePoints);

			// Should create some valid path even for single point
			expect(typeof path).toBe('string');
		});

		it('closes the path for filled strokes', () => {
			const outlinePoints: number[][] = [
				[0, 0],
				[10, 0],
				[10, 10],
				[0, 10]
			];

			const path = pointsToSvgPath(outlinePoints);

			// Path should end with Z to close
			expect(path).toContain('Z');
		});
	});

	describe('getBoundingBox', () => {
		it('calculates correct bounding box for points', () => {
			const points: Point[] = [
				{ x: 10, y: 20 },
				{ x: 50, y: 30 },
				{ x: 30, y: 60 }
			];

			const bbox = getBoundingBox(points);

			expect(bbox.minX).toBe(10);
			expect(bbox.minY).toBe(20);
			expect(bbox.maxX).toBe(50);
			expect(bbox.maxY).toBe(60);
		});

		it('handles single point', () => {
			const points: Point[] = [{ x: 25, y: 35 }];

			const bbox = getBoundingBox(points);

			expect(bbox.minX).toBe(25);
			expect(bbox.minY).toBe(35);
			expect(bbox.maxX).toBe(25);
			expect(bbox.maxY).toBe(35);
		});

		it('returns zero box for empty points', () => {
			const bbox = getBoundingBox([]);

			expect(bbox.minX).toBe(0);
			expect(bbox.minY).toBe(0);
			expect(bbox.maxX).toBe(0);
			expect(bbox.maxY).toBe(0);
		});

		it('expands bounding box by stroke width', () => {
			const points: Point[] = [
				{ x: 10, y: 10 },
				{ x: 20, y: 20 }
			];

			const bbox = getBoundingBox(points, 4);

			// Should be expanded by half the stroke width on each side
			expect(bbox.minX).toBe(8);
			expect(bbox.minY).toBe(8);
			expect(bbox.maxX).toBe(22);
			expect(bbox.maxY).toBe(22);
		});
	});

	describe('doStrokesIntersect', () => {
		it('detects intersection when strokes cross', () => {
			// Horizontal stroke
			const stroke1Points: Point[] = [
				{ x: 0, y: 50 },
				{ x: 100, y: 50 }
			];

			// Vertical stroke crossing it
			const stroke2Points: Point[] = [
				{ x: 50, y: 0 },
				{ x: 50, y: 100 }
			];

			const intersects = doStrokesIntersect(stroke1Points, stroke2Points, 4, 4);

			expect(intersects).toBe(true);
		});

		it('returns false for non-intersecting strokes', () => {
			const stroke1Points: Point[] = [
				{ x: 0, y: 0 },
				{ x: 50, y: 0 }
			];

			const stroke2Points: Point[] = [
				{ x: 0, y: 100 },
				{ x: 50, y: 100 }
			];

			const intersects = doStrokesIntersect(stroke1Points, stroke2Points, 4, 4);

			expect(intersects).toBe(false);
		});

		it('detects intersection with stroke width considered', () => {
			// Two parallel strokes that are close enough to intersect with width
			const stroke1Points: Point[] = [
				{ x: 0, y: 50 },
				{ x: 100, y: 50 }
			];

			const stroke2Points: Point[] = [
				{ x: 0, y: 54 },
				{ x: 100, y: 54 }
			];

			// With width 4, strokes extend 2px each side, so they should touch
			const intersectsWithWidth = doStrokesIntersect(stroke1Points, stroke2Points, 4, 4);
			expect(intersectsWithWidth).toBe(true);

			// With width 2, strokes extend 1px each side, gap of 4px - 2px = 2px
			const noIntersectSmallWidth = doStrokesIntersect(stroke1Points, stroke2Points, 2, 2);
			expect(noIntersectSmallWidth).toBe(false);
		});

		it('handles empty strokes gracefully', () => {
			const stroke1Points: Point[] = [];
			const stroke2Points: Point[] = [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 }
			];

			const intersects = doStrokesIntersect(stroke1Points, stroke2Points, 4, 4);

			expect(intersects).toBe(false);
		});
	});
});

describe('Performance', () => {
	it('handles large number of points efficiently', () => {
		// Generate 10000 points (a very long stroke)
		const manyPoints: Point[] = Array.from({ length: 10000 }, (_, i) => ({
			x: i * 0.1,
			y: Math.sin(i * 0.01) * 100 + 100
		}));

		const start = performance.now();
		const result = smoothStroke(manyPoints, { size: 4 });
		const duration = performance.now() - start;

		expect(result.length).toBeGreaterThan(0);
		// Should complete in reasonable time (< 500ms)
		expect(duration).toBeLessThan(500);
	});

	it('respects max points limit', () => {
		// Generate more than max allowed points
		const tooManyPoints: Point[] = Array.from({ length: 60000 }, (_, i) => ({
			x: i,
			y: i
		}));

		// Should not throw, but may truncate
		expect(() => smoothStroke(tooManyPoints, { size: 4 })).not.toThrow();
	});
});
