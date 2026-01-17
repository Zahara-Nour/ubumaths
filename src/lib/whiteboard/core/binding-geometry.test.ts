/**
 * Tests for binding geometry calculations
 *
 * TDD Phase 1: Types and Geometry
 */

import { describe, it, expect } from 'vitest';
import {
	normalizePoint,
	denormalizePoint,
	rotatePointAroundCenter,
	getRectanglePerimeterPoint,
	getEllipsePerimeterPoint,
	getPolygonPerimeterPoint,
	getClosestPerimeterPoint
} from './binding-geometry';
import type { Point, ShapeElement } from '../types/document';

// =============================================================================
// Test Utilities
// =============================================================================

/** Helper to check if two points are approximately equal */
function expectPointClose(actual: Point, expected: Point, tolerance = 0.01) {
	expect(actual.x).toBeCloseTo(expected.x, tolerance);
	expect(actual.y).toBeCloseTo(expected.y, tolerance);
}

/** Helper to create a bounding box */
function createBounds(x: number, y: number, width: number, height: number) {
	return { x, y, width, height };
}

/** Helper to create a mock shape element */
function createShape(
	shapeType: ShapeElement['shapeType'],
	start: Point,
	end: Point,
	rotation = 0
): ShapeElement {
	return {
		id: crypto.randomUUID(),
		type: 'shape',
		shapeType,
		start,
		end,
		color: '#000000',
		strokeWidth: 2,
		opacity: 1,
		rotation
	};
}

// =============================================================================
// normalizePoint Tests
// =============================================================================

describe('normalizePoint', () => {
	it('converts a point at the top-left corner to (0, 0)', () => {
		const point: Point = { x: 100, y: 100 };
		const bounds = createBounds(100, 100, 200, 150);

		const result = normalizePoint(point, bounds);

		expect(result.x).toBe(0);
		expect(result.y).toBe(0);
	});

	it('converts a point at the bottom-right corner to (1, 1)', () => {
		const point: Point = { x: 300, y: 250 };
		const bounds = createBounds(100, 100, 200, 150);

		const result = normalizePoint(point, bounds);

		expect(result.x).toBe(1);
		expect(result.y).toBe(1);
	});

	it('converts a point at the center to (0.5, 0.5)', () => {
		const point: Point = { x: 200, y: 175 };
		const bounds = createBounds(100, 100, 200, 150);

		const result = normalizePoint(point, bounds);

		expect(result.x).toBe(0.5);
		expect(result.y).toBe(0.5);
	});

	it('handles points outside the bounds (values < 0 or > 1)', () => {
		const point: Point = { x: 50, y: 300 };
		const bounds = createBounds(100, 100, 200, 150);

		const result = normalizePoint(point, bounds);

		expect(result.x).toBe(-0.25); // 50 is 50 units left of 100, which is -50/200 = -0.25
		expect(result.y).toBe(4 / 3); // 300 is 200 units below 100, which is 200/150 ≈ 1.33
	});

	it('handles zero-dimension bounds gracefully', () => {
		const point: Point = { x: 100, y: 100 };
		const bounds = createBounds(100, 100, 0, 0);

		const result = normalizePoint(point, bounds);

		// Should fallback to dimension of 1 to prevent Infinity/NaN
		expect(Number.isFinite(result.x)).toBe(true);
		expect(Number.isFinite(result.y)).toBe(true);
		expect(result.x).toBe(0); // (100 - 100) / 1 = 0
		expect(result.y).toBe(0); // (100 - 100) / 1 = 0
	});

	it('handles negative coordinates', () => {
		const point: Point = { x: -50, y: -25 };
		const bounds = createBounds(-100, -100, 200, 200);

		const result = normalizePoint(point, bounds);

		expect(result.x).toBe(0.25); // (-50 - (-100)) / 200 = 50/200 = 0.25
		expect(result.y).toBe(0.375); // (-25 - (-100)) / 200 = 75/200 = 0.375
	});

	it('handles very large coordinates', () => {
		const point: Point = { x: 1e10, y: 1e10 };
		const bounds = createBounds(0, 0, 1e10, 1e10);

		const result = normalizePoint(point, bounds);

		expect(result.x).toBeCloseTo(1, 5);
		expect(result.y).toBeCloseTo(1, 5);
	});

	it('handles extremely small but non-zero bounds', () => {
		const point: Point = { x: 100.0001, y: 100.0001 };
		const bounds = createBounds(100, 100, 0.001, 0.001);

		const result = normalizePoint(point, bounds);

		expect(Number.isFinite(result.x)).toBe(true);
		expect(Number.isFinite(result.y)).toBe(true);
		expect(result.x).toBeCloseTo(0.1, 1);
		expect(result.y).toBeCloseTo(0.1, 1);
	});

	it('handles extreme aspect ratios (very wide)', () => {
		const point: Point = { x: 5000, y: 101 };
		const bounds = createBounds(0, 100, 10000, 2);

		const result = normalizePoint(point, bounds);

		expect(result.x).toBe(0.5);
		expect(result.y).toBe(0.5);
	});

	it('handles extreme aspect ratios (very tall)', () => {
		const point: Point = { x: 101, y: 5000 };
		const bounds = createBounds(100, 0, 2, 10000);

		const result = normalizePoint(point, bounds);

		expect(result.x).toBe(0.5);
		expect(result.y).toBe(0.5);
	});
});

// =============================================================================
// denormalizePoint Tests
// =============================================================================

describe('denormalizePoint', () => {
	it('converts (0, 0) to the top-left corner', () => {
		const normalized: Point = { x: 0, y: 0 };
		const bounds = createBounds(100, 100, 200, 150);

		const result = denormalizePoint(normalized, bounds);

		expect(result.x).toBe(100);
		expect(result.y).toBe(100);
	});

	it('converts (1, 1) to the bottom-right corner', () => {
		const normalized: Point = { x: 1, y: 1 };
		const bounds = createBounds(100, 100, 200, 150);

		const result = denormalizePoint(normalized, bounds);

		expect(result.x).toBe(300);
		expect(result.y).toBe(250);
	});

	it('converts (0.5, 0.5) to the center', () => {
		const normalized: Point = { x: 0.5, y: 0.5 };
		const bounds = createBounds(100, 100, 200, 150);

		const result = denormalizePoint(normalized, bounds);

		expect(result.x).toBe(200);
		expect(result.y).toBe(175);
	});

	it('is the inverse of normalizePoint', () => {
		const originalPoint: Point = { x: 150, y: 180 };
		const bounds = createBounds(100, 100, 200, 150);

		const normalized = normalizePoint(originalPoint, bounds);
		const denormalized = denormalizePoint(normalized, bounds);

		expectPointClose(denormalized, originalPoint);
	});

	it('handles negative normalized values', () => {
		const normalized: Point = { x: -0.5, y: -0.5 };
		const bounds = createBounds(100, 100, 200, 200);

		const result = denormalizePoint(normalized, bounds);

		expect(result.x).toBe(0); // 100 + (-0.5 * 200) = 0
		expect(result.y).toBe(0);
	});

	it('handles values greater than 1', () => {
		const normalized: Point = { x: 1.5, y: 2 };
		const bounds = createBounds(100, 100, 100, 100);

		const result = denormalizePoint(normalized, bounds);

		expect(result.x).toBe(250); // 100 + (1.5 * 100) = 250
		expect(result.y).toBe(300); // 100 + (2 * 100) = 300
	});

	it('handles zero-dimension bounds gracefully', () => {
		const normalized: Point = { x: 0.5, y: 0.5 };
		const bounds = createBounds(100, 100, 0, 0);

		const result = denormalizePoint(normalized, bounds);

		expect(Number.isFinite(result.x)).toBe(true);
		expect(Number.isFinite(result.y)).toBe(true);
	});

	it('roundtrip with extreme values', () => {
		const bounds = createBounds(-1000, -1000, 5000, 5000);
		const testPoints: Point[] = [
			{ x: -1000, y: -1000 },
			{ x: 4000, y: 4000 },
			{ x: 1500, y: 1500 },
			{ x: -500, y: 2000 }
		];

		for (const originalPoint of testPoints) {
			const normalized = normalizePoint(originalPoint, bounds);
			const denormalized = denormalizePoint(normalized, bounds);
			expectPointClose(denormalized, originalPoint);
		}
	});
});

// =============================================================================
// rotatePointAroundCenter Tests
// =============================================================================

describe('rotatePointAroundCenter', () => {
	it('returns the same point for 0 degree rotation', () => {
		const point: Point = { x: 150, y: 100 };
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 0);

		expectPointClose(result, point);
	});

	it('rotates a point 90 degrees clockwise', () => {
		const point: Point = { x: 150, y: 100 }; // 50 units right of center
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 90);

		// After 90° clockwise: should be 50 units below center
		expectPointClose(result, { x: 100, y: 150 });
	});

	it('rotates a point 180 degrees', () => {
		const point: Point = { x: 150, y: 100 }; // 50 units right of center
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 180);

		// After 180°: should be 50 units left of center
		expectPointClose(result, { x: 50, y: 100 });
	});

	it('rotates a point 270 degrees (or -90)', () => {
		const point: Point = { x: 150, y: 100 }; // 50 units right of center
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 270);

		// After 270° (= -90°): should be 50 units above center
		expectPointClose(result, { x: 100, y: 50 });
	});

	it('rotates a point 45 degrees', () => {
		const point: Point = { x: 100 + 50, y: 100 }; // 50 units right of center
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 45);

		// After 45°: should be at (100 + 50*cos(45°), 100 + 50*sin(45°))
		const cos45 = Math.cos(Math.PI / 4);
		const sin45 = Math.sin(Math.PI / 4);
		expectPointClose(result, { x: 100 + 50 * cos45, y: 100 + 50 * sin45 });
	});

	it('returns the center point when rotating the center', () => {
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(center, center, 90);

		expectPointClose(result, center);
	});

	it('handles full 360 degree rotation', () => {
		const point: Point = { x: 150, y: 120 };
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 360);

		expectPointClose(result, point);
	});

	it('handles negative rotation angles', () => {
		const point: Point = { x: 150, y: 100 }; // 50 units right of center
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, -90);

		// -90° (counterclockwise) should put point above center
		expectPointClose(result, { x: 100, y: 50 });
	});

	it('handles angles greater than 360', () => {
		const point: Point = { x: 150, y: 100 };
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 450); // 360 + 90

		// Should be same as 90 degree rotation
		expectPointClose(result, { x: 100, y: 150 });
	});

	it('handles very small rotation amounts', () => {
		const point: Point = { x: 150, y: 100 };
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 0.001);

		// Should be very close to original point
		expect(Math.abs(result.x - point.x)).toBeLessThan(0.01);
		expect(Math.abs(result.y - point.y)).toBeLessThan(0.01);
	});

	it('handles point very far from center', () => {
		const point: Point = { x: 1000000, y: 0 };
		const center: Point = { x: 0, y: 0 };

		const result = rotatePointAroundCenter(point, center, 90);

		expectPointClose(result, { x: 0, y: 1000000 });
	});

	it('handles negative coordinates', () => {
		const point: Point = { x: -50, y: -100 };
		const center: Point = { x: -100, y: -100 };

		const result = rotatePointAroundCenter(point, center, 180);

		expectPointClose(result, { x: -150, y: -100 });
	});

	it('handles multiple full rotations', () => {
		const point: Point = { x: 150, y: 120 };
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, 720); // 2 full rotations

		expectPointClose(result, point);
	});

	it('handles large negative angles', () => {
		const point: Point = { x: 150, y: 100 };
		const center: Point = { x: 100, y: 100 };

		const result = rotatePointAroundCenter(point, center, -270);

		// -270° = +90° equivalent
		expectPointClose(result, { x: 100, y: 150 });
	});
});

// =============================================================================
// getRectanglePerimeterPoint Tests
// =============================================================================

describe('getRectanglePerimeterPoint', () => {
	const bounds = createBounds(100, 100, 200, 100); // Rectangle from (100,100) to (300,200)

	it('returns the right edge point when pointing right', () => {
		const fromPoint: Point = { x: 400, y: 150 }; // Point to the right

		const result = getRectanglePerimeterPoint(bounds, fromPoint);

		expectPointClose(result, { x: 300, y: 150 }); // Right edge, vertically centered
	});

	it('returns the left edge point when pointing left', () => {
		const fromPoint: Point = { x: 0, y: 150 }; // Point to the left

		const result = getRectanglePerimeterPoint(bounds, fromPoint);

		expectPointClose(result, { x: 100, y: 150 }); // Left edge, vertically centered
	});

	it('returns the top edge point when pointing up', () => {
		const fromPoint: Point = { x: 200, y: 0 }; // Point above

		const result = getRectanglePerimeterPoint(bounds, fromPoint);

		expectPointClose(result, { x: 200, y: 100 }); // Top edge, horizontally centered
	});

	it('returns the bottom edge point when pointing down', () => {
		const fromPoint: Point = { x: 200, y: 300 }; // Point below

		const result = getRectanglePerimeterPoint(bounds, fromPoint);

		expectPointClose(result, { x: 200, y: 200 }); // Bottom edge, horizontally centered
	});

	it('returns a corner-adjacent point for diagonal direction', () => {
		const fromPoint: Point = { x: 400, y: 300 }; // Point to bottom-right

		const result = getRectanglePerimeterPoint(bounds, fromPoint);

		// Should be on either the right edge or bottom edge
		const onRightEdge = Math.abs(result.x - 300) < 0.01;
		const onBottomEdge = Math.abs(result.y - 200) < 0.01;
		expect(onRightEdge || onBottomEdge).toBe(true);
	});

	it('handles a point exactly at the center', () => {
		// When fromPoint is at center, direction is undefined
		// Implementation should handle this edge case gracefully
		const fromPoint: Point = { x: 200, y: 150 };

		const result = getRectanglePerimeterPoint(bounds, fromPoint);

		// Should return some point on the perimeter (implementation-defined)
		const onPerimeter =
			Math.abs(result.x - 100) < 0.01 ||
			Math.abs(result.x - 300) < 0.01 ||
			Math.abs(result.y - 100) < 0.01 ||
			Math.abs(result.y - 200) < 0.01;
		expect(onPerimeter).toBe(true);
	});

	describe('with corner radius', () => {
		it('returns a point on the rounded corner arc for diagonal direction', () => {
			const cornerRadius = 20;
			const fromPoint: Point = { x: 400, y: 50 }; // Point to top-right

			const result = getRectanglePerimeterPoint(bounds, fromPoint, cornerRadius);

			// The point should be on the arc of the rounded corner
			// The corner arc center is at (300-20, 100+20) = (280, 120)
			const arcCenter: Point = { x: 280, y: 120 };
			const distanceToArcCenter = Math.sqrt(
				Math.pow(result.x - arcCenter.x, 2) + Math.pow(result.y - arcCenter.y, 2)
			);

			// Should be approximately equal to corner radius
			expect(distanceToArcCenter).toBeCloseTo(cornerRadius, 0);
		});

		it('returns a straight edge point when not near a corner', () => {
			const cornerRadius = 20;
			const fromPoint: Point = { x: 400, y: 150 }; // Point to the right, centered

			const result = getRectanglePerimeterPoint(bounds, fromPoint, cornerRadius);

			// Should be on the right edge, not affected by corner radius
			expectPointClose(result, { x: 300, y: 150 });
		});
	});

	describe('edge cases', () => {
		it('handles very thin rectangle (width >> height)', () => {
			const thinBounds = createBounds(0, 100, 1000, 10);
			const fromPoint: Point = { x: 500, y: 0 }; // Above center

			const result = getRectanglePerimeterPoint(thinBounds, fromPoint);

			expect(result.y).toBeCloseTo(100, 0); // Top edge
			expect(result.x).toBeGreaterThanOrEqual(0);
			expect(result.x).toBeLessThanOrEqual(1000);
		});

		it('handles very tall rectangle (height >> width)', () => {
			const tallBounds = createBounds(100, 0, 10, 1000);
			const fromPoint: Point = { x: 200, y: 500 }; // To the right

			const result = getRectanglePerimeterPoint(tallBounds, fromPoint);

			expect(result.x).toBeCloseTo(110, 0); // Right edge
		});

		it('handles very small rectangle', () => {
			const smallBounds = createBounds(100, 100, 1, 1);
			const fromPoint: Point = { x: 200, y: 100.5 };

			const result = getRectanglePerimeterPoint(smallBounds, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles point exactly on a corner', () => {
			const fromPoint: Point = { x: 400, y: 50 }; // Diagonal toward top-right corner
			// Direction toward (300, 100) corner
			const result = getRectanglePerimeterPoint(bounds, fromPoint);

			// Should be near or at the corner
			expect(result.x).toBeGreaterThanOrEqual(290);
			expect(result.y).toBeLessThanOrEqual(110);
		});

		it('handles point exactly on an edge (collinear)', () => {
			const fromPoint: Point = { x: 500, y: 150 }; // Directly to the right, same y as center

			const result = getRectanglePerimeterPoint(bounds, fromPoint);

			expect(result.x).toBeCloseTo(300, 0);
			expect(result.y).toBeCloseTo(150, 0);
		});

		it('handles corner radius larger than half the smallest dimension', () => {
			const smallBounds = createBounds(100, 100, 40, 20);
			const largeRadius = 15; // Larger than half of height (10)
			const fromPoint: Point = { x: 200, y: 50 };

			const result = getRectanglePerimeterPoint(smallBounds, fromPoint, largeRadius);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles negative coordinates in bounds', () => {
			const negBounds = createBounds(-200, -200, 100, 100);
			const fromPoint: Point = { x: 0, y: -150 };

			const result = getRectanglePerimeterPoint(negBounds, fromPoint);

			expect(result.x).toBeCloseTo(-100, 0); // Right edge at -100
		});

		it('handles zero-area rectangle gracefully', () => {
			const zeroBounds = createBounds(100, 100, 0, 0);
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getRectanglePerimeterPoint(zeroBounds, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});
	});
});

// =============================================================================
// getEllipsePerimeterPoint Tests
// =============================================================================

describe('getEllipsePerimeterPoint', () => {
	describe('with a circle (equal width and height)', () => {
		const bounds = createBounds(100, 100, 100, 100); // Circle centered at (150, 150), radius 50
		const center: Point = { x: 150, y: 150 };
		const radius = 50;

		it('returns the right point when pointing right', () => {
			const fromPoint: Point = { x: 300, y: 150 };

			const result = getEllipsePerimeterPoint(bounds, fromPoint);

			expectPointClose(result, { x: 200, y: 150 }); // Right edge of circle
		});

		it('returns the top point when pointing up', () => {
			const fromPoint: Point = { x: 150, y: 0 };

			const result = getEllipsePerimeterPoint(bounds, fromPoint);

			expectPointClose(result, { x: 150, y: 100 }); // Top of circle
		});

		it('returns a 45-degree point for diagonal direction', () => {
			const fromPoint: Point = { x: 300, y: 0 }; // Upper-right direction

			const result = getEllipsePerimeterPoint(bounds, fromPoint);

			// At 45°, the point should be at center + (radius * cos(45°), radius * -sin(45°))
			const cos45 = Math.cos(Math.PI / 4);
			const sin45 = Math.sin(Math.PI / 4);
			expectPointClose(result, { x: 150 + radius * cos45, y: 150 - radius * sin45 });
		});

		it('all perimeter points are equidistant from center (circle property)', () => {
			const testAngles = [0, 30, 45, 60, 90, 135, 180, 270];

			for (const angleDeg of testAngles) {
				const angleRad = (angleDeg * Math.PI) / 180;
				const fromPoint: Point = {
					x: center.x + 200 * Math.cos(angleRad),
					y: center.y + 200 * Math.sin(angleRad)
				};

				const result = getEllipsePerimeterPoint(bounds, fromPoint);
				const distance = Math.sqrt(
					Math.pow(result.x - center.x, 2) + Math.pow(result.y - center.y, 2)
				);

				expect(distance).toBeCloseTo(radius, 0);
			}
		});
	});

	describe('with an ellipse (different width and height)', () => {
		const bounds = createBounds(100, 100, 200, 100); // Ellipse centered at (200, 150), a=100, b=50
		const center: Point = { x: 200, y: 150 };
		const a = 100; // Semi-major axis (horizontal)
		const b = 50; // Semi-minor axis (vertical)

		it('returns the right point on the major axis', () => {
			const fromPoint: Point = { x: 400, y: 150 };

			const result = getEllipsePerimeterPoint(bounds, fromPoint);

			expectPointClose(result, { x: 300, y: 150 }); // Right edge: center.x + a
		});

		it('returns the top point on the minor axis', () => {
			const fromPoint: Point = { x: 200, y: 0 };

			const result = getEllipsePerimeterPoint(bounds, fromPoint);

			expectPointClose(result, { x: 200, y: 100 }); // Top: center.y - b
		});

		it('perimeter points satisfy the ellipse equation', () => {
			const testAngles = [0, 30, 45, 60, 90, 120, 150, 180, 210, 270, 315];

			for (const angleDeg of testAngles) {
				const angleRad = (angleDeg * Math.PI) / 180;
				const fromPoint: Point = {
					x: center.x + 300 * Math.cos(angleRad),
					y: center.y + 300 * Math.sin(angleRad)
				};

				const result = getEllipsePerimeterPoint(bounds, fromPoint);

				// Ellipse equation: ((x-cx)/a)² + ((y-cy)/b)² = 1
				const ellipseValue =
					Math.pow((result.x - center.x) / a, 2) + Math.pow((result.y - center.y) / b, 2);

				expect(ellipseValue).toBeCloseTo(1, 1);
			}
		});
	});

	describe('edge cases', () => {
		it('handles very flat ellipse (extreme horizontal aspect ratio)', () => {
			const flatBounds = createBounds(0, 95, 1000, 10); // Very wide, thin ellipse
			const fromPoint: Point = { x: 500, y: 0 };

			const result = getEllipsePerimeterPoint(flatBounds, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
			expect(result.y).toBeCloseTo(95, 0); // Top of ellipse
		});

		it('handles very tall ellipse (extreme vertical aspect ratio)', () => {
			const tallBounds = createBounds(95, 0, 10, 1000);
			const fromPoint: Point = { x: 200, y: 500 };

			const result = getEllipsePerimeterPoint(tallBounds, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles point exactly at center', () => {
			const bounds = createBounds(100, 100, 100, 100);
			const center: Point = { x: 150, y: 150 };

			const result = getEllipsePerimeterPoint(bounds, center);

			// Should return some point on perimeter (default direction)
			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles point very close to center', () => {
			const bounds = createBounds(100, 100, 100, 100);
			const nearCenter: Point = { x: 150.0001, y: 150.0001 };

			const result = getEllipsePerimeterPoint(bounds, nearCenter);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles very small ellipse', () => {
			const tinyBounds = createBounds(100, 100, 0.1, 0.1);
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getEllipsePerimeterPoint(tinyBounds, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles zero-size ellipse gracefully', () => {
			const zeroBounds = createBounds(100, 100, 0, 0);
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getEllipsePerimeterPoint(zeroBounds, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles negative coordinates', () => {
			const negBounds = createBounds(-200, -200, 100, 100);
			const fromPoint: Point = { x: 0, y: -150 };

			const result = getEllipsePerimeterPoint(negBounds, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles point inside ellipse', () => {
			const bounds = createBounds(100, 100, 100, 100);
			const insidePoint: Point = { x: 140, y: 150 }; // Inside the circle

			const result = getEllipsePerimeterPoint(bounds, insidePoint);

			// Should still find perimeter point in that direction
			const center: Point = { x: 150, y: 150 };
			const dist = Math.sqrt(Math.pow(result.x - center.x, 2) + Math.pow(result.y - center.y, 2));
			expect(dist).toBeCloseTo(50, 0); // Radius is 50
		});
	});
});

// =============================================================================
// getPolygonPerimeterPoint Tests
// =============================================================================

describe('getPolygonPerimeterPoint', () => {
	describe('with a triangle', () => {
		// Equilateral-ish triangle
		const vertices: Point[] = [
			{ x: 150, y: 100 }, // Top
			{ x: 100, y: 200 }, // Bottom-left
			{ x: 200, y: 200 } // Bottom-right
		];
		const center: Point = { x: 150, y: 166.67 }; // Approximate centroid

		it('returns a point on the top edge when pointing up', () => {
			const fromPoint: Point = { x: 150, y: 0 };

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			// Should be on the segment from (100,200) to (150,100) or (150,100) to (200,200)
			// Since we're pointing straight up, it should hit the top vertex
			expectPointClose(result, { x: 150, y: 100 });
		});

		it('returns a point on the bottom edge when pointing down', () => {
			const fromPoint: Point = { x: 150, y: 400 };

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			// Should be on the bottom edge (100,200) to (200,200)
			expect(result.y).toBeCloseTo(200, 0);
			expect(result.x).toBeGreaterThanOrEqual(100);
			expect(result.x).toBeLessThanOrEqual(200);
		});

		it('returns a point on the left edge when pointing left', () => {
			const fromPoint: Point = { x: 0, y: 150 };

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			// Should be on the left edge (150,100) to (100,200)
			// Verify the point lies on this line segment
			const onLeftEdge = isPointOnSegment(result, vertices[0], vertices[1], 1);
			expect(onLeftEdge).toBe(true);
		});
	});

	describe('with a pentagon', () => {
		// Regular pentagon centered at (150, 150) with radius 50
		const center: Point = { x: 150, y: 150 };
		const radius = 50;
		const vertices: Point[] = [];
		for (let i = 0; i < 5; i++) {
			const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2; // Start from top
			vertices.push({
				x: center.x + radius * Math.cos(angle),
				y: center.y + radius * Math.sin(angle)
			});
		}

		it('returns the top vertex when pointing straight up', () => {
			const fromPoint: Point = { x: 150, y: 0 };

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			// Top vertex is at angle -90° = (150, 100)
			expectPointClose(result, { x: 150, y: 100 });
		});

		it('returns a point on an edge between vertices', () => {
			// Point at 18° (between top vertex at -90° and next at -18°)
			const fromPoint: Point = { x: 200, y: 80 };

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			// Should be on the edge between vertex 0 and vertex 1
			const onEdge = isPointOnSegment(result, vertices[0], vertices[1], 1);
			expect(onEdge).toBe(true);
		});
	});

	describe('with a star (non-convex)', () => {
		// 5-pointed star
		const center: Point = { x: 150, y: 150 };
		const outerRadius = 50;
		const innerRadius = 20;
		const vertices: Point[] = [];
		for (let i = 0; i < 10; i++) {
			const angle = (i * Math.PI) / 5 - Math.PI / 2;
			const r = i % 2 === 0 ? outerRadius : innerRadius;
			vertices.push({
				x: center.x + r * Math.cos(angle),
				y: center.y + r * Math.sin(angle)
			});
		}

		it('returns an outer point when pointing toward an outer vertex', () => {
			const fromPoint: Point = { x: 150, y: 0 }; // Straight up

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			// Should hit the top outer vertex at (150, 100)
			expectPointClose(result, { x: 150, y: 100 });
		});

		it('returns a point on the star edge for diagonal directions', () => {
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			// Should be on some edge of the star
			let onAnyEdge = false;
			for (let i = 0; i < vertices.length; i++) {
				const v1 = vertices[i];
				const v2 = vertices[(i + 1) % vertices.length];
				if (isPointOnSegment(result, v1, v2, 2)) {
					onAnyEdge = true;
					break;
				}
			}
			expect(onAnyEdge).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('handles collinear vertices (degenerate polygon)', () => {
			// All points on a line
			const collinearVertices: Point[] = [
				{ x: 100, y: 100 },
				{ x: 150, y: 100 },
				{ x: 200, y: 100 }
			];
			const center: Point = { x: 150, y: 100 };
			const fromPoint: Point = { x: 150, y: 0 };

			const result = getPolygonPerimeterPoint(collinearVertices, center, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles very small polygon', () => {
			const tinyVertices: Point[] = [
				{ x: 100, y: 100 },
				{ x: 100.01, y: 100 },
				{ x: 100.005, y: 100.01 }
			];
			const center: Point = { x: 100.005, y: 100.003 };
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getPolygonPerimeterPoint(tinyVertices, center, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles point inside polygon', () => {
			const vertices: Point[] = [
				{ x: 100, y: 100 },
				{ x: 200, y: 100 },
				{ x: 200, y: 200 },
				{ x: 100, y: 200 }
			];
			const center: Point = { x: 150, y: 150 };
			const insidePoint: Point = { x: 140, y: 150 };

			const result = getPolygonPerimeterPoint(vertices, center, insidePoint);

			// Should find perimeter point in that direction (left)
			expect(result.x).toBeCloseTo(100, 0);
		});

		it('handles point exactly at center', () => {
			const vertices: Point[] = [
				{ x: 100, y: 100 },
				{ x: 200, y: 100 },
				{ x: 200, y: 200 },
				{ x: 100, y: 200 }
			];
			const center: Point = { x: 150, y: 150 };

			const result = getPolygonPerimeterPoint(vertices, center, center);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles polygon with only 2 vertices (line segment)', () => {
			const lineVertices: Point[] = [
				{ x: 100, y: 100 },
				{ x: 200, y: 200 }
			];
			const center: Point = { x: 150, y: 150 };
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getPolygonPerimeterPoint(lineVertices, center, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles polygon with 1 vertex (point)', () => {
			const singleVertex: Point[] = [{ x: 100, y: 100 }];
			const center: Point = { x: 100, y: 100 };
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getPolygonPerimeterPoint(singleVertex, center, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles empty vertices array', () => {
			const emptyVertices: Point[] = [];
			const center: Point = { x: 150, y: 150 };
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getPolygonPerimeterPoint(emptyVertices, center, fromPoint);

			// Should return center as fallback
			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles negative coordinates', () => {
			const vertices: Point[] = [
				{ x: -200, y: -200 },
				{ x: -100, y: -200 },
				{ x: -100, y: -100 },
				{ x: -200, y: -100 }
			];
			const center: Point = { x: -150, y: -150 };
			const fromPoint: Point = { x: 0, y: -150 };

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			expect(result.x).toBeCloseTo(-100, 0); // Right edge
		});

		it('handles very large polygon', () => {
			// Generate a polygon with many vertices
			const center: Point = { x: 0, y: 0 };
			const vertices: Point[] = [];
			for (let i = 0; i < 100; i++) {
				const angle = (i * 2 * Math.PI) / 100;
				vertices.push({
					x: 1000 * Math.cos(angle),
					y: 1000 * Math.sin(angle)
				});
			}
			const fromPoint: Point = { x: 2000, y: 0 };

			const result = getPolygonPerimeterPoint(vertices, center, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
			expect(result.x).toBeCloseTo(1000, -1); // Approximately at the right edge
		});
	});
});

// =============================================================================
// getClosestPerimeterPoint Tests (Unified dispatcher)
// =============================================================================

describe('getClosestPerimeterPoint', () => {
	it('dispatches to rectangle logic for rectangle shapes', () => {
		const shape = createShape('rectangle', { x: 100, y: 100 }, { x: 300, y: 200 });
		const fromPoint: Point = { x: 400, y: 150 };

		const result = getClosestPerimeterPoint(shape, fromPoint);

		// Should be on the right edge
		expectPointClose(result, { x: 300, y: 150 });
	});

	it('dispatches to ellipse logic for circle shapes', () => {
		const shape = createShape('circle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const fromPoint: Point = { x: 300, y: 150 };

		const result = getClosestPerimeterPoint(shape, fromPoint);

		// Circle center is (150, 150), radius 50
		// From (300, 150), the closest point is (200, 150)
		expectPointClose(result, { x: 200, y: 150 });
	});

	it('dispatches to polygon logic for pentagon shapes', () => {
		const shape = createShape('pentagon', { x: 100, y: 100 }, { x: 200, y: 200 });
		const fromPoint: Point = { x: 150, y: 0 }; // Straight up

		const result = getClosestPerimeterPoint(shape, fromPoint);

		// Should be on the top of the pentagon
		expect(result.y).toBeLessThan(150); // Above center
	});

	it('dispatches to polygon logic for hexagon shapes', () => {
		const shape = createShape('hexagon', { x: 100, y: 100 }, { x: 200, y: 200 });
		const fromPoint: Point = { x: 300, y: 150 }; // To the right

		const result = getClosestPerimeterPoint(shape, fromPoint);

		// Should be on the right side of the hexagon
		expect(result.x).toBeGreaterThan(150);
	});

	it('dispatches to polygon logic for star shapes', () => {
		const shape = createShape('star', { x: 100, y: 100 }, { x: 200, y: 200 });
		const fromPoint: Point = { x: 150, y: 0 }; // Straight up

		const result = getClosestPerimeterPoint(shape, fromPoint);

		// Should be on the top point of the star
		expect(result.y).toBeLessThan(150);
	});

	it('applies gap offset correctly', () => {
		const shape = createShape('rectangle', { x: 100, y: 100 }, { x: 300, y: 200 });
		const fromPoint: Point = { x: 400, y: 150 };
		const gap = 10;

		const result = getClosestPerimeterPoint(shape, fromPoint, gap);

		// Should be 10px outside the right edge
		expectPointClose(result, { x: 310, y: 150 });
	});

	it('handles rotation of the shape', () => {
		const shape = createShape(
			'rectangle',
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
			90 // 90 degree rotation
		);
		const fromPoint: Point = { x: 250, y: 150 }; // To the right of center

		const result = getClosestPerimeterPoint(shape, fromPoint);

		// With 90° rotation, the "right" edge is now the "bottom" of the original
		// This is complex - just verify the point is on the perimeter
		const center = { x: 150, y: 150 };
		const distFromCenter = Math.sqrt(
			Math.pow(result.x - center.x, 2) + Math.pow(result.y - center.y, 2)
		);

		// For a 100x100 square, the max distance from center to perimeter is ~70.7 (diagonal/2)
		expect(distFromCenter).toBeLessThanOrEqual(71);
		expect(distFromCenter).toBeGreaterThanOrEqual(49); // At least half-width
	});

	it('returns center for line shapes (no perimeter)', () => {
		const shape = createShape('line', { x: 100, y: 100 }, { x: 200, y: 200 });
		const fromPoint: Point = { x: 300, y: 150 };

		const result = getClosestPerimeterPoint(shape, fromPoint);

		// Lines don't have a meaningful perimeter, return center
		expectPointClose(result, { x: 150, y: 150 });
	});

	it('returns center for arrow shapes (no binding to arrows)', () => {
		const shape = createShape('arrow', { x: 100, y: 100 }, { x: 200, y: 200 });
		const fromPoint: Point = { x: 300, y: 150 };

		const result = getClosestPerimeterPoint(shape, fromPoint);

		// Arrows don't support binding, return center
		expectPointClose(result, { x: 150, y: 150 });
	});

	describe('edge cases', () => {
		it('handles negative gap values (treated as 0)', () => {
			const shape = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const fromPoint: Point = { x: 300, y: 150 };

			const result = getClosestPerimeterPoint(shape, fromPoint, -10);

			// Should be on the perimeter (gap clamped to 0 or handled gracefully)
			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles very large gap values', () => {
			const shape = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const fromPoint: Point = { x: 300, y: 150 };

			const result = getClosestPerimeterPoint(shape, fromPoint, 1000);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(result.x).toBeGreaterThan(1000); // Far from shape
		});

		it('handles extremely small shapes', () => {
			const shape = createShape('rectangle', { x: 100, y: 100 }, { x: 100.001, y: 100.001 });
			const fromPoint: Point = { x: 200, y: 100 };

			const result = getClosestPerimeterPoint(shape, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles shape with 180° rotation', () => {
			const shape = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, 180);
			const fromPoint: Point = { x: 300, y: 150 };

			const result = getClosestPerimeterPoint(shape, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles shape with negative rotation', () => {
			const shape = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, -45);
			const fromPoint: Point = { x: 300, y: 150 };

			const result = getClosestPerimeterPoint(shape, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles inverted bounds (end < start)', () => {
			const shape = createShape('rectangle', { x: 200, y: 200 }, { x: 100, y: 100 });
			const fromPoint: Point = { x: 300, y: 150 };

			const result = getClosestPerimeterPoint(shape, fromPoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles shape at origin', () => {
			const shape = createShape('rectangle', { x: 0, y: 0 }, { x: 100, y: 100 });
			const fromPoint: Point = { x: 200, y: 50 };

			const result = getClosestPerimeterPoint(shape, fromPoint);

			expect(result.x).toBeCloseTo(100, 0);
			expect(result.y).toBeCloseTo(50, 0);
		});

		it('handles shape spanning negative to positive coordinates', () => {
			const shape = createShape('rectangle', { x: -50, y: -50 }, { x: 50, y: 50 });
			const fromPoint: Point = { x: 100, y: 0 };

			const result = getClosestPerimeterPoint(shape, fromPoint);

			expect(result.x).toBeCloseTo(50, 0);
			expect(result.y).toBeCloseTo(0, 0);
		});

		it('handles all bindable shape types with gap', () => {
			const shapeTypes: ShapeElement['shapeType'][] = [
				'rectangle',
				'circle',
				'pentagon',
				'hexagon',
				'star'
			];
			const gap = 5;

			for (const shapeType of shapeTypes) {
				const shape = createShape(shapeType, { x: 100, y: 100 }, { x: 200, y: 200 });
				const fromPoint: Point = { x: 300, y: 150 };

				const resultWithGap = getClosestPerimeterPoint(shape, fromPoint, gap);
				const resultNoGap = getClosestPerimeterPoint(shape, fromPoint, 0);

				expect(Number.isFinite(resultWithGap.x)).toBe(true);
				expect(Number.isFinite(resultWithGap.y)).toBe(true);
				// Result with gap should be further from center than without gap
				const center = { x: 150, y: 150 };
				const distWithGap = Math.sqrt(
					Math.pow(resultWithGap.x - center.x, 2) + Math.pow(resultWithGap.y - center.y, 2)
				);
				const distNoGap = Math.sqrt(
					Math.pow(resultNoGap.x - center.x, 2) + Math.pow(resultNoGap.y - center.y, 2)
				);
				expect(distWithGap).toBeGreaterThan(distNoGap);
			}
		});
	});
});

// =============================================================================
// Helper Functions for Tests
// =============================================================================

/**
 * Check if a point lies on a line segment (with tolerance)
 */
function isPointOnSegment(
	point: Point,
	segStart: Point,
	segEnd: Point,
	tolerance: number
): boolean {
	// Calculate distance from point to line segment
	const lengthSquared = Math.pow(segEnd.x - segStart.x, 2) + Math.pow(segEnd.y - segStart.y, 2);

	if (lengthSquared === 0) {
		// Segment is a point
		return (
			Math.sqrt(Math.pow(point.x - segStart.x, 2) + Math.pow(point.y - segStart.y, 2)) <= tolerance
		);
	}

	// Project point onto line
	let t =
		((point.x - segStart.x) * (segEnd.x - segStart.x) +
			(point.y - segStart.y) * (segEnd.y - segStart.y)) /
		lengthSquared;
	t = Math.max(0, Math.min(1, t));

	const projection = {
		x: segStart.x + t * (segEnd.x - segStart.x),
		y: segStart.y + t * (segEnd.y - segStart.y)
	};

	const distance = Math.sqrt(
		Math.pow(point.x - projection.x, 2) + Math.pow(point.y - projection.y, 2)
	);

	return distance <= tolerance;
}
