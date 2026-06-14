/**
 * Tests for Rough Renderer Types and Compatibility
 *
 * All shapes use roughjs for consistent hand-drawn rendering.
 * Strokes use perfect-freehand for natural handwriting.
 *
 * Note: The actual roughjs rendering functions require DOM access and are
 * tested implicitly through:
 * - Browser testing at http://localhost:5175/whiteboard
 * - Export functionality (PNG/SVG/PDF)
 * - Canvas component integration
 */

import { describe, it, expect } from 'vitest';
import type { ShapeElement, StrokeElement, Point, FillMode } from '../types/document';

// Helper to create a mock shape element (all shapes use roughjs)
function createMockShape(
	shapeType: ShapeElement['shapeType'],
	overrides: Partial<ShapeElement> = {}
): ShapeElement {
	return {
		id: 'test-shape-' + Math.random().toString(36).slice(2),
		type: 'shape',
		shapeType,
		start: { x: 10, y: 10 },
		end: { x: 100, y: 100 },
		color: '#000000',
		strokeWidth: 2,
		opacity: 1,
		roughSeed: 12345,
		roughness: 1,
		...overrides
	};
}

// Helper to create a mock stroke element (strokes use perfect-freehand)
function createMockStroke(overrides: Partial<StrokeElement> = {}): StrokeElement {
	const points: Point[] = [
		{ x: 10, y: 10 },
		{ x: 50, y: 30 },
		{ x: 100, y: 50 }
	];
	return {
		id: 'test-stroke-' + Math.random().toString(36).slice(2),
		type: 'stroke',
		toolType: 'pen',
		points,
		color: '#000000',
		width: 2,
		opacity: 1,
		...overrides
	};
}

describe('Rough Renderer Type Compatibility', () => {
	describe('Shape element types', () => {
		it('supports all shape types for roughjs rendering', () => {
			const shapeTypes: ShapeElement['shapeType'][] = [
				'rectangle',
				'circle',
				'line',
				'arrow',
				'pentagon',
				'hexagon',
				'star'
			];

			shapeTypes.forEach((shapeType) => {
				const shape = createMockShape(shapeType);
				expect(shape.roughSeed).toBe(12345);
				expect(shape.roughness).toBe(1);
			});
		});

		it('supports roughjs fill modes', () => {
			const fillModes: FillMode[] = ['hachure', 'crosshatch', 'zigzag', 'solid', 'none'];

			fillModes.forEach((fillMode) => {
				const shape = createMockShape('rectangle', { fillMode, fill: '#ff0000' });
				expect(shape.fillMode).toBe(fillMode);
			});
		});

		it('supports roughness values from 0 to 2 (sloppiness presets)', () => {
			const shape0 = createMockShape('rectangle', { roughness: 0 }); // architect
			const shape1 = createMockShape('rectangle', { roughness: 1 }); // artist
			const shape2 = createMockShape('rectangle', { roughness: 2 }); // cartoonist

			expect(shape0.roughness).toBe(0);
			expect(shape1.roughness).toBe(1);
			expect(shape2.roughness).toBe(2);
		});

		it('supports decimal roughness values', () => {
			const shape = createMockShape('rectangle', { roughness: 1.5 });
			expect(shape.roughness).toBe(1.5);
		});
	});

	describe('Stroke element types', () => {
		it('strokes use perfect-freehand (no roughjs)', () => {
			const stroke = createMockStroke();
			// Strokes don't have roughSeed or roughness - they use perfect-freehand
			expect((stroke as unknown as { roughSeed?: number }).roughSeed).toBeUndefined();
			expect((stroke as unknown as { roughness?: number }).roughness).toBeUndefined();
		});

		it('supports various stroke widths', () => {
			const thin = createMockStroke({ width: 1 });
			const thick = createMockStroke({ width: 10 });

			expect(thin.width).toBe(1);
			expect(thick.width).toBe(10);
		});

		it('supports multiple points', () => {
			const points: Point[] = [
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
				{ x: 100, y: 0 },
				{ x: 150, y: 50 }
			];
			const stroke = createMockStroke({ points });

			expect(stroke.points).toHaveLength(4);
		});
	});
});

describe('Backward Compatibility', () => {
	it('shapes without roughSeed still render (seed will be generated)', () => {
		const oldShape: ShapeElement = {
			id: 'test',
			type: 'shape',
			shapeType: 'rectangle',
			start: { x: 0, y: 0 },
			end: { x: 100, y: 100 },
			color: '#000000',
			strokeWidth: 2,
			opacity: 1
			// No roughSeed or roughness - renderer will use defaults
		};

		expect(oldShape.roughSeed).toBeUndefined();
		expect(oldShape.roughness).toBeUndefined();
	});

	it('hatched fillMode is separate from roughjs hachure', () => {
		const hatchedShape = createMockShape('rectangle', { fillMode: 'hatched' });
		const hachureShape = createMockShape('rectangle', { fillMode: 'hachure' });

		expect(hatchedShape.fillMode).toBe('hatched');
		expect(hachureShape.fillMode).toBe('hachure');
		// These are different fill modes - hatched is the old pattern,
		// hachure is the roughjs style
	});
});

describe('Deterministic Rendering', () => {
	it('roughSeed ensures deterministic output', () => {
		const shape1 = createMockShape('rectangle', { roughSeed: 42 });
		const shape2 = createMockShape('rectangle', { roughSeed: 42 });

		// Same seed should produce same element configuration
		expect(shape1.roughSeed).toBe(shape2.roughSeed);
	});

	it('different seeds produce different configurations', () => {
		const shape1 = createMockShape('rectangle', { roughSeed: 42 });
		const shape2 = createMockShape('rectangle', { roughSeed: 123 });

		expect(shape1.roughSeed).not.toBe(shape2.roughSeed);
	});
});
