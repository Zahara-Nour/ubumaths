/**
 * Tests for Intersection Detection Algorithm
 *
 * @module grapheur/__tests__/intersections
 */

import { describe, it, expect } from 'vitest';
import {
	findIntersections,
	findAllIntersections,
	deduplicateIntersections,
	type IntersectionResult
} from '../intersections';
import type { Viewport } from '../types';

// =============================================================================
// Test Fixtures
// =============================================================================

const defaultViewport: Viewport = {
	xMin: -10,
	xMax: 10,
	yMin: -10,
	yMax: 10
};

// Simple linear functions
const linear1 = (x: number) => x; // y = x
const linear2 = (x: number) => -x; // y = -x (intersects at origin)
const linear3 = (x: number) => x + 2; // y = x + 2 (parallel to linear1)
const linear4 = (x: number) => 2 * x - 1; // y = 2x - 1

// Quadratic functions
const quadratic1 = (x: number) => x * x; // y = x²
const quadratic2 = (x: number) => -x * x + 4; // y = -x² + 4

// Functions with discontinuities
const withNull = (x: number): number | null => (x === 0 ? null : 1 / x);

// =============================================================================
// findIntersections Tests
// =============================================================================

describe('findIntersections', () => {
	describe('basic intersections', () => {
		it('finds intersection of y=x and y=-x at origin', () => {
			const intersections = findIntersections(linear1, linear2, defaultViewport);

			expect(intersections.length).toBe(1);
			expect(intersections[0].x).toBeCloseTo(0, 5);
			expect(intersections[0].y).toBeCloseTo(0, 5);
		});

		it('finds intersection of y=x and y=2x-1', () => {
			const intersections = findIntersections(linear1, linear4, defaultViewport);

			expect(intersections.length).toBe(1);
			// y = x and y = 2x - 1 intersect when x = 2x - 1, so x = 1
			expect(intersections[0].x).toBeCloseTo(1, 5);
			expect(intersections[0].y).toBeCloseTo(1, 5);
		});

		it('finds no intersection for parallel lines', () => {
			const intersections = findIntersections(linear1, linear3, defaultViewport);

			expect(intersections.length).toBe(0);
		});
	});

	describe('quadratic intersections', () => {
		it('finds intersections of y=x² and y=x', () => {
			const intersections = findIntersections(quadratic1, linear1, defaultViewport);

			// x² = x => x(x-1) = 0 => x = 0 or x = 1
			expect(intersections.length).toBe(2);

			const sortedByX = intersections.sort((a, b) => a.x - b.x);
			expect(sortedByX[0].x).toBeCloseTo(0, 5);
			expect(sortedByX[0].y).toBeCloseTo(0, 5);
			expect(sortedByX[1].x).toBeCloseTo(1, 5);
			expect(sortedByX[1].y).toBeCloseTo(1, 5);
		});

		it('finds intersections of two parabolas', () => {
			const intersections = findIntersections(quadratic1, quadratic2, defaultViewport);

			// x² = -x² + 4 => 2x² = 4 => x = ±√2
			expect(intersections.length).toBe(2);

			const sortedByX = intersections.sort((a, b) => a.x - b.x);
			expect(sortedByX[0].x).toBeCloseTo(-Math.sqrt(2), 4);
			expect(sortedByX[1].x).toBeCloseTo(Math.sqrt(2), 4);
		});
	});

	describe('viewport filtering', () => {
		it('only returns intersections within viewport', () => {
			const smallViewport: Viewport = {
				xMin: 0.5,
				xMax: 2,
				yMin: -1,
				yMax: 2
			};

			const intersections = findIntersections(quadratic1, linear1, smallViewport);

			// x = 0 is outside viewport, only x = 1 should be found
			expect(intersections.length).toBe(1);
			expect(intersections[0].x).toBeCloseTo(1, 5);
		});

		it('excludes intersections outside y bounds', () => {
			const yLimitedViewport: Viewport = {
				xMin: -10,
				xMax: 10,
				yMin: 2,
				yMax: 10
			};

			const intersections = findIntersections(quadratic1, linear1, yLimitedViewport);

			// Both intersections (0,0) and (1,1) are below y=2
			expect(intersections.length).toBe(0);
		});
	});

	describe('edge cases', () => {
		it('handles functions with null values gracefully', () => {
			const intersections = findIntersections(withNull, linear1, defaultViewport);

			// Should not crash, may find intersections where both are defined
			expect(Array.isArray(intersections)).toBe(true);
		});

		it('respects sample count parameter', () => {
			// With very few samples, might miss some intersections
			const fewSamples = findIntersections(quadratic1, linear1, defaultViewport, 10);
			const manySamples = findIntersections(quadratic1, linear1, defaultViewport, 500);

			// More samples should be at least as accurate
			expect(manySamples.length).toBeGreaterThanOrEqual(fewSamples.length);
		});

		it('handles identical functions (infinite intersections) by finding sampled points', () => {
			const intersections = findIntersections(linear1, linear1, defaultViewport);

			// Identical functions don't have sign changes, so algorithm finds exact matches
			// Due to tolerance check, it may find some points where diff is very small
			expect(Array.isArray(intersections)).toBe(true);
		});
	});
});

// =============================================================================
// findAllIntersections Tests
// =============================================================================

describe('findAllIntersections', () => {
	it('finds intersections between all function pairs', () => {
		const functions = [
			{ id: 'a', evaluator: linear1 },
			{ id: 'b', evaluator: linear2 },
			{ id: 'c', evaluator: quadratic1 }
		];

		const results = findAllIntersections(functions, defaultViewport);

		// Should have results for pairs (a,b), (a,c), (b,c)
		expect(results.length).toBeGreaterThan(0);

		// Verify functionIds are correctly set
		const hasAB = results.some(
			(r) =>
				(r.functionIds[0] === 'a' && r.functionIds[1] === 'b') ||
				(r.functionIds[0] === 'b' && r.functionIds[1] === 'a')
		);
		expect(hasAB).toBe(true);
	});

	it('returns empty array for single function', () => {
		const functions = [{ id: 'a', evaluator: linear1 }];

		const results = findAllIntersections(functions, defaultViewport);

		expect(results.length).toBe(0);
	});

	it('returns empty array for empty function list', () => {
		const results = findAllIntersections([], defaultViewport);

		expect(results.length).toBe(0);
	});

	it('includes correct function IDs in results', () => {
		const functions = [
			{ id: 'func-1', evaluator: linear1 },
			{ id: 'func-2', evaluator: linear2 }
		];

		const results = findAllIntersections(functions, defaultViewport);

		expect(results.length).toBe(1);
		expect(results[0].functionIds).toContain('func-1');
		expect(results[0].functionIds).toContain('func-2');
	});
});

// =============================================================================
// deduplicateIntersections Tests
// =============================================================================

describe('deduplicateIntersections', () => {
	it('removes duplicate points within tolerance', () => {
		const intersections: IntersectionResult[] = [
			{ point: { x: 1.0, y: 2.0 }, functionIds: ['a', 'b'] },
			{ point: { x: 1.0001, y: 2.0001 }, functionIds: ['a', 'c'] }, // Too close to first
			{ point: { x: 5.0, y: 3.0 }, functionIds: ['b', 'c'] }
		];

		const deduplicated = deduplicateIntersections(intersections, 0.01);

		expect(deduplicated.length).toBe(2);
		expect(deduplicated[0].point.x).toBeCloseTo(1.0, 5);
		expect(deduplicated[1].point.x).toBeCloseTo(5.0, 5);
	});

	it('keeps points that are far enough apart', () => {
		const intersections: IntersectionResult[] = [
			{ point: { x: 0, y: 0 }, functionIds: ['a', 'b'] },
			{ point: { x: 1, y: 1 }, functionIds: ['a', 'b'] },
			{ point: { x: 2, y: 4 }, functionIds: ['a', 'c'] }
		];

		const deduplicated = deduplicateIntersections(intersections, 0.01);

		expect(deduplicated.length).toBe(3);
	});

	it('handles empty array', () => {
		const deduplicated = deduplicateIntersections([], 0.01);

		expect(deduplicated.length).toBe(0);
	});

	it('handles single intersection', () => {
		const intersections: IntersectionResult[] = [
			{ point: { x: 1, y: 2 }, functionIds: ['a', 'b'] }
		];

		const deduplicated = deduplicateIntersections(intersections, 0.01);

		expect(deduplicated.length).toBe(1);
		expect(deduplicated[0].point.x).toBe(1);
	});

	it('respects custom tolerance', () => {
		const intersections: IntersectionResult[] = [
			{ point: { x: 0, y: 0 }, functionIds: ['a', 'b'] },
			{ point: { x: 0.5, y: 0.5 }, functionIds: ['a', 'c'] }
		];

		// With small tolerance, both kept
		const smallTolerance = deduplicateIntersections(intersections, 0.1);
		expect(smallTolerance.length).toBe(2);

		// With large tolerance, second is duplicate
		const largeTolerance = deduplicateIntersections(intersections, 1.0);
		expect(largeTolerance.length).toBe(1);
	});

	it('preserves order of first occurrence', () => {
		const intersections: IntersectionResult[] = [
			{ point: { x: 5, y: 5 }, functionIds: ['first', 'b'] },
			{ point: { x: 5.001, y: 5.001 }, functionIds: ['second', 'b'] },
			{ point: { x: 5.002, y: 5.002 }, functionIds: ['third', 'b'] }
		];

		const deduplicated = deduplicateIntersections(intersections, 0.01);

		expect(deduplicated.length).toBe(1);
		expect(deduplicated[0].functionIds[0]).toBe('first');
	});
});

// =============================================================================
// Numerical Precision Tests
// =============================================================================

describe('numerical precision', () => {
	it('finds intersection with high precision', () => {
		// y = x and y = 0.5 intersect at x = 0.5
		const constant = () => 0.5;
		const intersections = findIntersections(linear1, constant, defaultViewport);

		expect(intersections.length).toBe(1);
		expect(intersections[0].x).toBeCloseTo(0.5, 8);
		expect(intersections[0].y).toBeCloseTo(0.5, 8);
	});

	it('handles very small intersection values', () => {
		// y = x and y = 0.0001 intersect at x = 0.0001
		const tinyConstant = () => 0.0001;
		const intersections = findIntersections(linear1, tinyConstant, {
			xMin: -1,
			xMax: 1,
			yMin: -1,
			yMax: 1
		});

		expect(intersections.length).toBe(1);
		expect(intersections[0].x).toBeCloseTo(0.0001, 6);
	});

	it('handles intersection near viewport boundary', () => {
		const viewport: Viewport = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };

		// y = x intersects y = 0.01 near x = 0.01
		const nearBoundary = () => 0.01;
		const intersections = findIntersections(linear1, nearBoundary, viewport);

		// Should find the intersection even near boundary
		expect(intersections.length).toBe(1);
		expect(intersections[0].x).toBeCloseTo(0.01, 4);
	});
});
