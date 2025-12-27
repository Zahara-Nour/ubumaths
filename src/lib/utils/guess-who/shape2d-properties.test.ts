/**
 * Tests for 2D Shape Properties
 *
 * @vitest-environment node
 */

import { describe, test, expect } from 'vitest';
import {
	SHAPES_2D,
	getAllShapes2D,
	filterShapes2D,
	generateShapeGrid,
	checkShape2DProperty,
	shape2DToSVG,
	shapesEqual,
	type Shape2D
} from './shape2d-properties';

// ============================================================================
// SHAPE DEFINITIONS TESTS
// ============================================================================

describe('Shape definitions', () => {
	test('should have 21 shapes defined', () => {
		expect(Object.keys(SHAPES_2D)).toHaveLength(21);
	});

	test('getAllShapes2D returns all shapes', () => {
		const shapes = getAllShapes2D();
		expect(shapes).toHaveLength(21);
	});

	test('each shape has required properties', () => {
		const requiredProps: (keyof Shape2D)[] = [
			'type',
			'nameFr',
			'sides',
			'hasRightAngles',
			'isRegular',
			'isConvex',
			'hasAxisSymmetry',
			'axesOfSymmetry',
			'hasCenterSymmetry',
			'hasEqualSides',
			'hasParallelSides',
			'isTriangle',
			'isQuadrilateral',
			'isPolygon',
			'hasCurvedEdges'
		];

		for (const shape of getAllShapes2D()) {
			for (const prop of requiredProps) {
				expect(shape[prop], `${shape.type} should have ${prop}`).toBeDefined();
			}
		}
	});
});

// ============================================================================
// TRIANGLE PROPERTIES TESTS
// ============================================================================

describe('Triangle properties', () => {
	test('equilateral triangle is regular with 3 axes of symmetry', () => {
		const shape = SHAPES_2D.triangle_equilateral;
		expect(shape.isRegular).toBe(true);
		expect(shape.axesOfSymmetry).toBe(3);
		expect(shape.hasEqualSides).toBe(true);
		expect(shape.hasRightAngles).toBe(false);
		expect(shape.isTriangle).toBe(true);
	});

	test('isoceles triangle has 1 axis of symmetry', () => {
		const shape = SHAPES_2D.triangle_isocele;
		expect(shape.axesOfSymmetry).toBe(1);
		expect(shape.hasAxisSymmetry).toBe(true);
		expect(shape.isRegular).toBe(false);
		expect(shape.hasEqualSides).toBe(false); // Only 2 equal sides
	});

	test('right triangle has right angles and no symmetry', () => {
		const shape = SHAPES_2D.triangle_rectangle;
		expect(shape.hasRightAngles).toBe(true);
		expect(shape.hasAxisSymmetry).toBe(false);
		expect(shape.axesOfSymmetry).toBe(0);
	});

	test('right isoceles triangle has both right angles and symmetry', () => {
		const shape = SHAPES_2D.triangle_rectangle_isocele;
		expect(shape.hasRightAngles).toBe(true);
		expect(shape.hasAxisSymmetry).toBe(true);
		expect(shape.axesOfSymmetry).toBe(1);
	});

	test('scalene triangle has no symmetry', () => {
		const shape = SHAPES_2D.triangle_scalene;
		expect(shape.hasAxisSymmetry).toBe(false);
		expect(shape.hasCenterSymmetry).toBe(false);
		expect(shape.hasEqualSides).toBe(false);
	});

	test('all triangles have 3 sides and are convex', () => {
		const triangles = getAllShapes2D().filter((s) => s.isTriangle);
		expect(triangles).toHaveLength(5);
		for (const t of triangles) {
			expect(t.sides).toBe(3);
			expect(t.isConvex).toBe(true);
			expect(t.isPolygon).toBe(true);
			expect(t.hasParallelSides).toBe(false);
		}
	});
});

// ============================================================================
// QUADRILATERAL PROPERTIES TESTS
// ============================================================================

describe('Quadrilateral properties', () => {
	test('square is regular with 4 axes of symmetry', () => {
		const shape = SHAPES_2D.square;
		expect(shape.isRegular).toBe(true);
		expect(shape.axesOfSymmetry).toBe(4);
		expect(shape.hasRightAngles).toBe(true);
		expect(shape.hasEqualSides).toBe(true);
		expect(shape.hasCenterSymmetry).toBe(true);
		expect(shape.hasParallelSides).toBe(true);
	});

	test('rectangle has 2 axes of symmetry and right angles', () => {
		const shape = SHAPES_2D.rectangle;
		expect(shape.axesOfSymmetry).toBe(2);
		expect(shape.hasRightAngles).toBe(true);
		expect(shape.hasEqualSides).toBe(false);
		expect(shape.hasCenterSymmetry).toBe(true);
		expect(shape.hasParallelSides).toBe(true);
	});

	test('rhombus has equal sides but no right angles', () => {
		const shape = SHAPES_2D.rhombus;
		expect(shape.hasEqualSides).toBe(true);
		expect(shape.hasRightAngles).toBe(false);
		expect(shape.axesOfSymmetry).toBe(2);
		expect(shape.hasCenterSymmetry).toBe(true);
	});

	test('parallelogram has center symmetry but no axis symmetry', () => {
		const shape = SHAPES_2D.parallelogram;
		expect(shape.hasCenterSymmetry).toBe(true);
		expect(shape.hasAxisSymmetry).toBe(false);
		expect(shape.axesOfSymmetry).toBe(0);
		expect(shape.hasParallelSides).toBe(true);
	});

	test('trapezoid has no symmetry', () => {
		const shape = SHAPES_2D.trapezoid;
		expect(shape.hasAxisSymmetry).toBe(false);
		expect(shape.hasCenterSymmetry).toBe(false);
		expect(shape.hasParallelSides).toBe(true);
	});

	test('isoceles trapezoid has 1 axis of symmetry', () => {
		const shape = SHAPES_2D.trapezoid_isocele;
		expect(shape.hasAxisSymmetry).toBe(true);
		expect(shape.axesOfSymmetry).toBe(1);
		expect(shape.hasCenterSymmetry).toBe(false);
	});

	test('kite has 1 axis of symmetry and no parallel sides', () => {
		const shape = SHAPES_2D.kite;
		expect(shape.hasAxisSymmetry).toBe(true);
		expect(shape.axesOfSymmetry).toBe(1);
		expect(shape.hasParallelSides).toBe(false);
	});

	test('all quadrilaterals have 4 sides', () => {
		const quads = getAllShapes2D().filter((s) => s.isQuadrilateral);
		expect(quads).toHaveLength(7);
		for (const q of quads) {
			expect(q.sides).toBe(4);
			expect(q.isConvex).toBe(true);
			expect(q.isPolygon).toBe(true);
		}
	});
});

// ============================================================================
// REGULAR POLYGON PROPERTIES TESTS
// ============================================================================

describe('Regular polygon properties', () => {
	test('regular pentagon has 5 axes of symmetry', () => {
		const shape = SHAPES_2D.pentagon_regular;
		expect(shape.sides).toBe(5);
		expect(shape.isRegular).toBe(true);
		expect(shape.axesOfSymmetry).toBe(5);
		expect(shape.hasCenterSymmetry).toBe(false); // Odd number of sides
		expect(shape.hasParallelSides).toBe(false);
	});

	test('regular hexagon has 6 axes and center symmetry', () => {
		const shape = SHAPES_2D.hexagon_regular;
		expect(shape.sides).toBe(6);
		expect(shape.isRegular).toBe(true);
		expect(shape.axesOfSymmetry).toBe(6);
		expect(shape.hasCenterSymmetry).toBe(true); // Even number of sides
		expect(shape.hasParallelSides).toBe(true);
	});

	test('regular heptagon has 7 axes and no center symmetry', () => {
		const shape = SHAPES_2D.heptagon_regular;
		expect(shape.sides).toBe(7);
		expect(shape.isRegular).toBe(true);
		expect(shape.axesOfSymmetry).toBe(7);
		expect(shape.hasCenterSymmetry).toBe(false);
	});

	test('regular octagon has 8 axes and center symmetry', () => {
		const shape = SHAPES_2D.octagon_regular;
		expect(shape.sides).toBe(8);
		expect(shape.isRegular).toBe(true);
		expect(shape.axesOfSymmetry).toBe(8);
		expect(shape.hasCenterSymmetry).toBe(true);
		expect(shape.hasParallelSides).toBe(true);
	});

	test('all regular polygons are convex and have equal sides', () => {
		const regularShapes = getAllShapes2D().filter((s) => s.isRegular && s.isPolygon);
		for (const shape of regularShapes) {
			expect(shape.isConvex).toBe(true);
			expect(shape.hasEqualSides).toBe(true);
		}
	});
});

// ============================================================================
// IRREGULAR POLYGON PROPERTIES TESTS
// ============================================================================

describe('Irregular polygon properties', () => {
	test('irregular pentagon has no symmetry', () => {
		const shape = SHAPES_2D.pentagon_irregular;
		expect(shape.sides).toBe(5);
		expect(shape.isRegular).toBe(false);
		expect(shape.hasAxisSymmetry).toBe(false);
		expect(shape.hasCenterSymmetry).toBe(false);
	});

	test('irregular hexagon has no symmetry', () => {
		const shape = SHAPES_2D.hexagon_irregular;
		expect(shape.sides).toBe(6);
		expect(shape.isRegular).toBe(false);
		expect(shape.hasAxisSymmetry).toBe(false);
		expect(shape.hasCenterSymmetry).toBe(false);
	});
});

// ============================================================================
// CIRCLES AND ARCS PROPERTIES TESTS
// ============================================================================

describe('Circle and arc properties', () => {
	test('circle has infinite axes of symmetry', () => {
		const shape = SHAPES_2D.circle;
		expect(shape.sides).toBe(0);
		expect(shape.axesOfSymmetry).toBe(Infinity);
		expect(shape.hasCenterSymmetry).toBe(true);
		expect(shape.isRegular).toBe(true);
		expect(shape.hasCurvedEdges).toBe(true);
		expect(shape.isPolygon).toBe(false);
	});

	test('semicircle has 1 axis of symmetry', () => {
		const shape = SHAPES_2D.semicircle;
		expect(shape.sides).toBe(1);
		expect(shape.axesOfSymmetry).toBe(1);
		expect(shape.hasCenterSymmetry).toBe(false);
		expect(shape.hasCurvedEdges).toBe(true);
	});

	test('quarter circle has 1 axis and right angle', () => {
		const shape = SHAPES_2D.quarter_circle;
		expect(shape.sides).toBe(2);
		expect(shape.hasRightAngles).toBe(true);
		expect(shape.axesOfSymmetry).toBe(1);
		expect(shape.hasEqualSides).toBe(true); // Two radii
		expect(shape.hasCurvedEdges).toBe(true);
	});

	test('all curved shapes are not polygons', () => {
		const curvedShapes = getAllShapes2D().filter((s) => s.hasCurvedEdges);
		expect(curvedShapes).toHaveLength(3);
		for (const shape of curvedShapes) {
			expect(shape.isPolygon).toBe(false);
		}
	});
});

// ============================================================================
// PROPERTY CHECK FUNCTION TESTS
// ============================================================================

describe('checkShape2DProperty', () => {
	test('sides_count checks exact number of sides', () => {
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'sides_count', 3)).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'sides_count', 4)).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.square, 'sides_count', 4)).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.hexagon_regular, 'sides_count', 6)).toBe(true);
	});

	test('sides_greater_than checks side count comparison', () => {
		expect(checkShape2DProperty(SHAPES_2D.pentagon_regular, 'sides_greater_than', 4)).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.pentagon_regular, 'sides_greater_than', 5)).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.square, 'sides_greater_than', 3)).toBe(true);
	});

	test('sides_less_than checks side count comparison', () => {
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'sides_less_than', 4)).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'sides_less_than', 3)).toBe(false);
	});

	test('has_right_angles property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.square, 'has_right_angles')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.rectangle, 'has_right_angles')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.rhombus, 'has_right_angles')).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.triangle_rectangle, 'has_right_angles')).toBe(true);
	});

	test('is_regular property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'is_regular')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.triangle_isocele, 'is_regular')).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.square, 'is_regular')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.rectangle, 'is_regular')).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.circle, 'is_regular')).toBe(true);
	});

	test('is_convex property check', () => {
		// All our shapes are convex
		for (const shape of getAllShapes2D()) {
			expect(checkShape2DProperty(shape, 'is_convex')).toBe(true);
		}
	});

	test('has_axis_symmetry property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'has_axis_symmetry')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.triangle_scalene, 'has_axis_symmetry')).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.parallelogram, 'has_axis_symmetry')).toBe(false);
	});

	test('axes_count checks exact number of axes', () => {
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'axes_count', 3)).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.square, 'axes_count', 4)).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.hexagon_regular, 'axes_count', 6)).toBe(true);
	});

	test('axes_greater_than comparison', () => {
		expect(checkShape2DProperty(SHAPES_2D.square, 'axes_greater_than', 3)).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.square, 'axes_greater_than', 4)).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.circle, 'axes_greater_than', 100)).toBe(true);
	});

	test('has_center_symmetry property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.square, 'has_center_symmetry')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.hexagon_regular, 'has_center_symmetry')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.pentagon_regular, 'has_center_symmetry')).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'has_center_symmetry')).toBe(false);
	});

	test('has_equal_sides property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'has_equal_sides')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.square, 'has_equal_sides')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.rhombus, 'has_equal_sides')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.rectangle, 'has_equal_sides')).toBe(false);
	});

	test('has_parallel_sides property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.square, 'has_parallel_sides')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.parallelogram, 'has_parallel_sides')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.trapezoid, 'has_parallel_sides')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'has_parallel_sides')).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.kite, 'has_parallel_sides')).toBe(false);
	});

	test('is_triangle property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'is_triangle')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.triangle_scalene, 'is_triangle')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.square, 'is_triangle')).toBe(false);
	});

	test('is_quadrilateral property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.square, 'is_quadrilateral')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.kite, 'is_quadrilateral')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'is_quadrilateral')).toBe(false);
	});

	test('is_polygon property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.triangle_equilateral, 'is_polygon')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.hexagon_regular, 'is_polygon')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.circle, 'is_polygon')).toBe(false);
		expect(checkShape2DProperty(SHAPES_2D.semicircle, 'is_polygon')).toBe(false);
	});

	test('has_curved_edges property check', () => {
		expect(checkShape2DProperty(SHAPES_2D.circle, 'has_curved_edges')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.semicircle, 'has_curved_edges')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.quarter_circle, 'has_curved_edges')).toBe(true);
		expect(checkShape2DProperty(SHAPES_2D.square, 'has_curved_edges')).toBe(false);
	});

	test('throws error when param is missing for parameterized checks', () => {
		expect(() => checkShape2DProperty(SHAPES_2D.square, 'sides_count')).toThrow();
		expect(() => checkShape2DProperty(SHAPES_2D.square, 'sides_greater_than')).toThrow();
		expect(() => checkShape2DProperty(SHAPES_2D.square, 'sides_less_than')).toThrow();
		expect(() => checkShape2DProperty(SHAPES_2D.square, 'axes_count')).toThrow();
		expect(() => checkShape2DProperty(SHAPES_2D.square, 'axes_greater_than')).toThrow();
	});
});

// ============================================================================
// FILTER SHAPES TESTS
// ============================================================================

describe('filterShapes2D', () => {
	test('filter by minimum sides', () => {
		const shapes = filterShapes2D({ minSides: 5 });
		for (const shape of shapes) {
			expect(shape.sides).toBeGreaterThanOrEqual(5);
		}
		expect(shapes.length).toBeGreaterThan(0);
	});

	test('filter by maximum sides', () => {
		const shapes = filterShapes2D({ maxSides: 4 });
		for (const shape of shapes) {
			expect(shape.sides).toBeLessThanOrEqual(4);
		}
	});

	test('filter polygons only', () => {
		const shapes = filterShapes2D({ onlyPolygons: true });
		for (const shape of shapes) {
			expect(shape.isPolygon).toBe(true);
		}
		expect(shapes.length).toBe(18); // 21 - 3 (circle, semicircle, quarter_circle)
	});

	test('filter regular shapes only', () => {
		const shapes = filterShapes2D({ onlyRegular: true });
		for (const shape of shapes) {
			expect(shape.isRegular).toBe(true);
		}
	});

	test('filter by right angles', () => {
		const withRightAngles = filterShapes2D({ hasRightAngles: true });
		for (const shape of withRightAngles) {
			expect(shape.hasRightAngles).toBe(true);
		}

		const withoutRightAngles = filterShapes2D({ hasRightAngles: false });
		for (const shape of withoutRightAngles) {
			expect(shape.hasRightAngles).toBe(false);
		}
	});

	test('combine multiple filters', () => {
		const shapes = filterShapes2D({
			minSides: 4,
			maxSides: 6,
			onlyPolygons: true,
			onlyRegular: true
		});
		for (const shape of shapes) {
			expect(shape.sides).toBeGreaterThanOrEqual(4);
			expect(shape.sides).toBeLessThanOrEqual(6);
			expect(shape.isPolygon).toBe(true);
			expect(shape.isRegular).toBe(true);
		}
	});
});

// ============================================================================
// GRID GENERATION TESTS
// ============================================================================

describe('generateShapeGrid', () => {
	test('generates correct number of shapes', () => {
		const grid = generateShapeGrid(10);
		expect(grid).toHaveLength(10);
	});

	test('generates unique shapes', () => {
		const grid = generateShapeGrid(15);
		const types = grid.map((s) => s.type);
		const uniqueTypes = new Set(types);
		expect(uniqueTypes.size).toBe(15);
	});

	test('respects filter criteria', () => {
		const grid = generateShapeGrid(5, { onlyPolygons: true });
		for (const shape of grid) {
			expect(shape.isPolygon).toBe(true);
		}
	});

	test('throws error when not enough shapes match criteria', () => {
		expect(() => generateShapeGrid(25)).toThrow(); // Only 21 shapes
		expect(() => generateShapeGrid(10, { minSides: 7 })).toThrow(); // Only heptagon and octagon
	});
});

// ============================================================================
// SVG GENERATION TESTS
// ============================================================================

describe('shape2DToSVG', () => {
	test('generates valid SVG paths for all shapes', () => {
		for (const shape of getAllShapes2D()) {
			const svg = shape2DToSVG(shape);
			expect(svg.path).toBeDefined();
			expect(svg.path.length).toBeGreaterThan(0);
			expect(svg.viewBox).toBe('0 0 100 100');
		}
	});

	test('polygon paths start with M and end with Z', () => {
		const polygonShapes = getAllShapes2D().filter((s) => s.isPolygon);
		for (const shape of polygonShapes) {
			const svg = shape2DToSVG(shape);
			expect(svg.path.startsWith('M')).toBe(true);
			expect(svg.path.endsWith('Z')).toBe(true);
		}
	});

	test('circle path uses arc command', () => {
		const svg = shape2DToSVG(SHAPES_2D.circle);
		expect(svg.path).toContain('A');
	});

	test('semicircle path uses arc command', () => {
		const svg = shape2DToSVG(SHAPES_2D.semicircle);
		expect(svg.path).toContain('A');
	});

	test('quarter circle path uses arc command', () => {
		const svg = shape2DToSVG(SHAPES_2D.quarter_circle);
		expect(svg.path).toContain('A');
	});
});

// ============================================================================
// SHAPE EQUALITY TESTS
// ============================================================================

describe('shapesEqual', () => {
	test('returns true for same shape type', () => {
		expect(shapesEqual(SHAPES_2D.square, SHAPES_2D.square)).toBe(true);
		expect(shapesEqual(SHAPES_2D.circle, SHAPES_2D.circle)).toBe(true);
	});

	test('returns false for different shape types', () => {
		expect(shapesEqual(SHAPES_2D.square, SHAPES_2D.rectangle)).toBe(false);
		expect(shapesEqual(SHAPES_2D.triangle_equilateral, SHAPES_2D.triangle_isocele)).toBe(false);
	});
});

// ============================================================================
// FRENCH NAMES TESTS
// ============================================================================

describe('French names', () => {
	test('all shapes have French names', () => {
		for (const shape of getAllShapes2D()) {
			expect(shape.nameFr).toBeDefined();
			expect(shape.nameFr.length).toBeGreaterThan(0);
		}
	});

	test('French names are correct', () => {
		expect(SHAPES_2D.square.nameFr).toBe('Carré');
		expect(SHAPES_2D.rectangle.nameFr).toBe('Rectangle');
		expect(SHAPES_2D.triangle_equilateral.nameFr).toBe('Triangle équilatéral');
		expect(SHAPES_2D.circle.nameFr).toBe('Cercle');
		expect(SHAPES_2D.hexagon_regular.nameFr).toBe('Hexagone régulier');
	});
});
