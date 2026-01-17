/**
 * Tests for Shape Drawing
 */

import { describe, it, expect } from 'vitest';
import {
	createShapeElement,
	getShapeSvgProps,
	calculateShapeBounds,
	calculateLineAngle,
	calculateLineLength,
	normalizeAngleForText
} from '../core/shapes';
import type { Point, ShapeType } from '../types/document';

describe('Shape Creation', () => {
	describe('createShapeElement', () => {
		it('creates a line shape element', () => {
			const start: Point = { x: 10, y: 20 };
			const end: Point = { x: 100, y: 80 };

			const shape = createShapeElement('line', start, end, {
				color: '#000000',
				strokeWidth: 2,
				opacity: 1
			});

			expect(shape.id).toMatch(/^[0-9a-f-]{36}$/i);
			expect(shape.type).toBe('shape');
			expect(shape.shapeType).toBe('line');
			expect(shape.start).toEqual(start);
			expect(shape.end).toEqual(end);
			expect(shape.color).toBe('#000000');
			expect(shape.strokeWidth).toBe(2);
		});

		it('creates a rectangle shape element', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 100, y: 50 };

			const shape = createShapeElement('rectangle', start, end, {
				color: '#ff0000',
				strokeWidth: 3,
				opacity: 1,
				fill: '#ffcccc',
				fillOpacity: 0.5
			});

			expect(shape.shapeType).toBe('rectangle');
			expect(shape.fill).toBe('#ffcccc');
			expect(shape.fillOpacity).toBe(0.5);
		});

		it('creates a circle shape element', () => {
			const start: Point = { x: 50, y: 50 };
			const end: Point = { x: 100, y: 100 };

			const shape = createShapeElement('circle', start, end, {
				color: '#0000ff',
				strokeWidth: 2,
				opacity: 1
			});

			expect(shape.shapeType).toBe('circle');
		});

		it('creates an arrow shape element', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 50, y: 50 };

			const shape = createShapeElement('arrow', start, end, {
				color: '#00ff00',
				strokeWidth: 2,
				opacity: 1
			});

			expect(shape.shapeType).toBe('arrow');
		});

		it('generates unique IDs for each shape', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 10, y: 10 };
			const options = { color: '#000000', strokeWidth: 1, opacity: 1 };

			const shape1 = createShapeElement('line', start, end, options);
			const shape2 = createShapeElement('line', start, end, options);

			expect(shape1.id).not.toBe(shape2.id);
		});
	});
});

describe('Shape SVG Properties', () => {
	describe('getShapeSvgProps', () => {
		it('returns line props for line shape', () => {
			const props = getShapeSvgProps('line', { x: 10, y: 20 }, { x: 100, y: 80 });

			expect(props.type).toBe('line');
			expect(props.x1).toBe(10);
			expect(props.y1).toBe(20);
			expect(props.x2).toBe(100);
			expect(props.y2).toBe(80);
		});

		it('returns rect props for rectangle shape', () => {
			const props = getShapeSvgProps('rectangle', { x: 10, y: 20 }, { x: 110, y: 70 });

			expect(props.type).toBe('rect');
			expect(props.x).toBe(10);
			expect(props.y).toBe(20);
			expect(props.width).toBe(100);
			expect(props.height).toBe(50);
		});

		it('handles rectangle with inverted coordinates', () => {
			// When end is before start (dragging up-left)
			const props = getShapeSvgProps('rectangle', { x: 100, y: 80 }, { x: 20, y: 30 });

			expect(props.type).toBe('rect');
			expect(props.x).toBe(20);
			expect(props.y).toBe(30);
			expect(props.width).toBe(80);
			expect(props.height).toBe(50);
		});

		it('returns ellipse props for circle shape', () => {
			const props = getShapeSvgProps('circle', { x: 50, y: 50 }, { x: 150, y: 100 });

			expect(props.type).toBe('ellipse');
			expect(props.cx).toBe(100); // center x
			expect(props.cy).toBe(75); // center y
			expect(props.rx).toBe(50); // radius x
			expect(props.ry).toBe(25); // radius y
		});

		it('handles circle with inverted coordinates', () => {
			const props = getShapeSvgProps('circle', { x: 150, y: 100 }, { x: 50, y: 50 });

			expect(props.type).toBe('ellipse');
			expect(props.cx).toBe(100);
			expect(props.cy).toBe(75);
			expect(props.rx).toBe(50);
			expect(props.ry).toBe(25);
		});

		it('returns line props for arrow shape (with marker flag)', () => {
			const props = getShapeSvgProps('arrow', { x: 0, y: 0 }, { x: 100, y: 100 });

			expect(props.type).toBe('line');
			expect(props.x1).toBe(0);
			expect(props.y1).toBe(0);
			expect(props.x2).toBe(100);
			expect(props.y2).toBe(100);
			expect(props.hasArrowMarker).toBe(true);
		});
	});
});

describe('Shape Bounds Calculation', () => {
	describe('calculateShapeBounds', () => {
		it('calculates bounds for line', () => {
			const bounds = calculateShapeBounds('line', { x: 10, y: 20 }, { x: 100, y: 80 }, 4);

			// Line bounds should include stroke width padding
			expect(bounds.minX).toBe(8); // 10 - 2
			expect(bounds.minY).toBe(18); // 20 - 2
			expect(bounds.maxX).toBe(102); // 100 + 2
			expect(bounds.maxY).toBe(82); // 80 + 2
		});

		it('calculates bounds for rectangle', () => {
			const bounds = calculateShapeBounds('rectangle', { x: 10, y: 20 }, { x: 110, y: 70 }, 2);

			expect(bounds.minX).toBe(9);
			expect(bounds.minY).toBe(19);
			expect(bounds.maxX).toBe(111);
			expect(bounds.maxY).toBe(71);
		});

		it('calculates bounds for circle (ellipse)', () => {
			const bounds = calculateShapeBounds('circle', { x: 50, y: 50 }, { x: 150, y: 100 }, 2);

			// Ellipse from (50,50) to (150,100) has center at (100, 75)
			// rx = 50, ry = 25
			// bounds: minX = 50, minY = 50, maxX = 150, maxY = 100
			// with stroke padding of 1 each side
			expect(bounds.minX).toBe(49);
			expect(bounds.minY).toBe(49);
			expect(bounds.maxX).toBe(151);
			expect(bounds.maxY).toBe(101);
		});

		it('handles inverted coordinates correctly', () => {
			const bounds = calculateShapeBounds('rectangle', { x: 100, y: 80 }, { x: 20, y: 30 }, 0);

			expect(bounds.minX).toBe(20);
			expect(bounds.minY).toBe(30);
			expect(bounds.maxX).toBe(100);
			expect(bounds.maxY).toBe(80);
		});
	});
});

describe('Shape Types', () => {
	const shapeTypes: ShapeType[] = ['line', 'rectangle', 'circle', 'arrow'];

	it.each(shapeTypes)('creates valid %s shape', (shapeType) => {
		const shape = createShapeElement(
			shapeType,
			{ x: 0, y: 0 },
			{ x: 100, y: 100 },
			{
				color: '#000000',
				strokeWidth: 2,
				opacity: 1
			}
		);

		expect(shape.shapeType).toBe(shapeType);
		expect(shape.type).toBe('shape');
	});

	it.each(shapeTypes)('generates SVG props for %s', (shapeType) => {
		const props = getShapeSvgProps(shapeType, { x: 0, y: 0 }, { x: 100, y: 100 });

		expect(props).toBeDefined();
		expect(props.type).toBeDefined();
	});
});

describe('Line Geometry Utilities', () => {
	describe('calculateLineAngle', () => {
		it('returns 0° for horizontal line pointing right', () => {
			const angle = calculateLineAngle({ x: 0, y: 0 }, { x: 100, y: 0 });
			expect(angle).toBeCloseTo(0);
		});

		it('returns 180° for horizontal line pointing left', () => {
			const angle = calculateLineAngle({ x: 100, y: 0 }, { x: 0, y: 0 });
			expect(angle).toBeCloseTo(180);
		});

		it('returns 90° for vertical line pointing down', () => {
			const angle = calculateLineAngle({ x: 0, y: 0 }, { x: 0, y: 100 });
			expect(angle).toBeCloseTo(90);
		});

		it('returns -90° for vertical line pointing up', () => {
			const angle = calculateLineAngle({ x: 0, y: 100 }, { x: 0, y: 0 });
			expect(angle).toBeCloseTo(-90);
		});

		it('returns 45° for diagonal line (down-right)', () => {
			const angle = calculateLineAngle({ x: 0, y: 0 }, { x: 100, y: 100 });
			expect(angle).toBeCloseTo(45);
		});

		it('returns -45° for diagonal line (up-right)', () => {
			const angle = calculateLineAngle({ x: 0, y: 100 }, { x: 100, y: 0 });
			expect(angle).toBeCloseTo(-45);
		});

		it('returns 135° for diagonal line (down-left)', () => {
			const angle = calculateLineAngle({ x: 100, y: 0 }, { x: 0, y: 100 });
			expect(angle).toBeCloseTo(135);
		});

		it('returns -135° for diagonal line (up-left)', () => {
			const angle = calculateLineAngle({ x: 100, y: 100 }, { x: 0, y: 0 });
			expect(angle).toBeCloseTo(-135);
		});
	});

	describe('calculateLineLength', () => {
		it('calculates horizontal line length', () => {
			const length = calculateLineLength({ x: 0, y: 0 }, { x: 100, y: 0 });
			expect(length).toBe(100);
		});

		it('calculates vertical line length', () => {
			const length = calculateLineLength({ x: 0, y: 0 }, { x: 0, y: 50 });
			expect(length).toBe(50);
		});

		it('calculates diagonal line length (3-4-5 triangle)', () => {
			const length = calculateLineLength({ x: 0, y: 0 }, { x: 30, y: 40 });
			expect(length).toBe(50);
		});

		it('handles negative direction (length is always positive)', () => {
			const length = calculateLineLength({ x: 100, y: 50 }, { x: 0, y: 0 });
			expect(length).toBeGreaterThan(0);
		});

		it('returns 0 for point (start equals end)', () => {
			const length = calculateLineLength({ x: 50, y: 50 }, { x: 50, y: 50 });
			expect(length).toBe(0);
		});
	});

	describe('normalizeAngleForText', () => {
		it('keeps angles in range -90 to 90 unchanged', () => {
			expect(normalizeAngleForText(0)).toBe(0);
			expect(normalizeAngleForText(45)).toBe(45);
			expect(normalizeAngleForText(-45)).toBe(-45);
			expect(normalizeAngleForText(90)).toBe(90);
			expect(normalizeAngleForText(-90)).toBe(-90);
		});

		it('flips angles > 90° by subtracting 180°', () => {
			expect(normalizeAngleForText(91)).toBeCloseTo(-89);
			expect(normalizeAngleForText(135)).toBeCloseTo(-45);
			expect(normalizeAngleForText(180)).toBeCloseTo(0);
		});

		it('flips angles < -90° by adding 180°', () => {
			expect(normalizeAngleForText(-91)).toBeCloseTo(89);
			expect(normalizeAngleForText(-135)).toBeCloseTo(45);
			expect(normalizeAngleForText(-180)).toBeCloseTo(0);
		});

		it('ensures text is never upside down for common angles', () => {
			// Line pointing left (180°) should become 0°
			const angle180 = normalizeAngleForText(180);
			expect(angle180).toBeGreaterThanOrEqual(-90);
			expect(angle180).toBeLessThanOrEqual(90);

			// Line pointing up-left (-135°) should become 45°
			const angleMinus135 = normalizeAngleForText(-135);
			expect(angleMinus135).toBeGreaterThanOrEqual(-90);
			expect(angleMinus135).toBeLessThanOrEqual(90);
		});
	});
});
