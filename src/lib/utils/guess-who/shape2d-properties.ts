/**
 * 2D Shape Properties for Guess Who Math Game
 *
 * Provides types and utilities for checking geometric properties of 2D shapes.
 * Shapes are defined by their type and properties, rendered as SVG in cards.
 *
 * @module utils/guess-who/shape2d-properties
 */

// ============================================================================
// SHAPE TYPES
// ============================================================================

/**
 * Types of 2D shapes available in the game
 */
export type Shape2DType =
	// Triangles
	| 'triangle_equilateral'
	| 'triangle_isocele'
	| 'triangle_rectangle'
	| 'triangle_rectangle_isocele'
	| 'triangle_scalene'
	// Quadrilaterals
	| 'square'
	| 'rectangle'
	| 'rhombus'
	| 'parallelogram'
	| 'trapezoid'
	| 'trapezoid_isocele'
	| 'kite'
	// Regular polygons
	| 'pentagon_regular'
	| 'hexagon_regular'
	| 'heptagon_regular'
	| 'octagon_regular'
	// Irregular polygons
	| 'pentagon_irregular'
	| 'hexagon_irregular'
	// Circles and arcs
	| 'circle'
	| 'semicircle'
	| 'quarter_circle';

/**
 * A 2D shape with its properties
 */
export interface Shape2D {
	type: Shape2DType;
	/** French name for display */
	nameFr: string;
	/** Number of sides (0 for circles) */
	sides: number;
	/** Has at least one right angle */
	hasRightAngles: boolean;
	/** All angles are equal and all sides are equal */
	isRegular: boolean;
	/** All interior angles < 180° */
	isConvex: boolean;
	/** Has at least one axis of symmetry */
	hasAxisSymmetry: boolean;
	/** Number of axes of symmetry */
	axesOfSymmetry: number;
	/** Has center of symmetry */
	hasCenterSymmetry: boolean;
	/** All sides are equal length */
	hasEqualSides: boolean;
	/** Has at least two parallel sides */
	hasParallelSides: boolean;
	/** Is a type of triangle */
	isTriangle: boolean;
	/** Is a type of quadrilateral */
	isQuadrilateral: boolean;
	/** Is a polygon (not curved) */
	isPolygon: boolean;
	/** Contains curved edges */
	hasCurvedEdges: boolean;
}

// ============================================================================
// SHAPE DEFINITIONS
// ============================================================================

/**
 * Complete definitions of all 2D shapes
 */
export const SHAPES_2D: Record<Shape2DType, Shape2D> = {
	// Triangles
	triangle_equilateral: {
		type: 'triangle_equilateral',
		nameFr: 'Triangle équilatéral',
		sides: 3,
		hasRightAngles: false,
		isRegular: true,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 3,
		hasCenterSymmetry: false,
		hasEqualSides: true,
		hasParallelSides: false,
		isTriangle: true,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},
	triangle_isocele: {
		type: 'triangle_isocele',
		nameFr: 'Triangle isocèle',
		sides: 3,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 1,
		hasCenterSymmetry: false,
		hasEqualSides: false, // Only 2 equal sides, not all
		hasParallelSides: false,
		isTriangle: true,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},
	triangle_rectangle: {
		type: 'triangle_rectangle',
		nameFr: 'Triangle rectangle',
		sides: 3,
		hasRightAngles: true,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: false,
		axesOfSymmetry: 0,
		hasCenterSymmetry: false,
		hasEqualSides: false,
		hasParallelSides: false,
		isTriangle: true,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},
	triangle_rectangle_isocele: {
		type: 'triangle_rectangle_isocele',
		nameFr: 'Triangle rectangle isocèle',
		sides: 3,
		hasRightAngles: true,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 1,
		hasCenterSymmetry: false,
		hasEqualSides: false,
		hasParallelSides: false,
		isTriangle: true,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},
	triangle_scalene: {
		type: 'triangle_scalene',
		nameFr: 'Triangle quelconque',
		sides: 3,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: false,
		axesOfSymmetry: 0,
		hasCenterSymmetry: false,
		hasEqualSides: false,
		hasParallelSides: false,
		isTriangle: true,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},

	// Quadrilaterals
	square: {
		type: 'square',
		nameFr: 'Carré',
		sides: 4,
		hasRightAngles: true,
		isRegular: true,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 4,
		hasCenterSymmetry: true,
		hasEqualSides: true,
		hasParallelSides: true,
		isTriangle: false,
		isQuadrilateral: true,
		isPolygon: true,
		hasCurvedEdges: false
	},
	rectangle: {
		type: 'rectangle',
		nameFr: 'Rectangle',
		sides: 4,
		hasRightAngles: true,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 2,
		hasCenterSymmetry: true,
		hasEqualSides: false,
		hasParallelSides: true,
		isTriangle: false,
		isQuadrilateral: true,
		isPolygon: true,
		hasCurvedEdges: false
	},
	rhombus: {
		type: 'rhombus',
		nameFr: 'Losange',
		sides: 4,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 2,
		hasCenterSymmetry: true,
		hasEqualSides: true,
		hasParallelSides: true,
		isTriangle: false,
		isQuadrilateral: true,
		isPolygon: true,
		hasCurvedEdges: false
	},
	parallelogram: {
		type: 'parallelogram',
		nameFr: 'Parallélogramme',
		sides: 4,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: false,
		axesOfSymmetry: 0,
		hasCenterSymmetry: true,
		hasEqualSides: false,
		hasParallelSides: true,
		isTriangle: false,
		isQuadrilateral: true,
		isPolygon: true,
		hasCurvedEdges: false
	},
	trapezoid: {
		type: 'trapezoid',
		nameFr: 'Trapèze',
		sides: 4,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: false,
		axesOfSymmetry: 0,
		hasCenterSymmetry: false,
		hasEqualSides: false,
		hasParallelSides: true,
		isTriangle: false,
		isQuadrilateral: true,
		isPolygon: true,
		hasCurvedEdges: false
	},
	trapezoid_isocele: {
		type: 'trapezoid_isocele',
		nameFr: 'Trapèze isocèle',
		sides: 4,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 1,
		hasCenterSymmetry: false,
		hasEqualSides: false,
		hasParallelSides: true,
		isTriangle: false,
		isQuadrilateral: true,
		isPolygon: true,
		hasCurvedEdges: false
	},
	kite: {
		type: 'kite',
		nameFr: 'Cerf-volant',
		sides: 4,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 1,
		hasCenterSymmetry: false,
		hasEqualSides: false, // 2 pairs of adjacent equal sides
		hasParallelSides: false,
		isTriangle: false,
		isQuadrilateral: true,
		isPolygon: true,
		hasCurvedEdges: false
	},

	// Regular polygons
	pentagon_regular: {
		type: 'pentagon_regular',
		nameFr: 'Pentagone régulier',
		sides: 5,
		hasRightAngles: false,
		isRegular: true,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 5,
		hasCenterSymmetry: false,
		hasEqualSides: true,
		hasParallelSides: false,
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},
	hexagon_regular: {
		type: 'hexagon_regular',
		nameFr: 'Hexagone régulier',
		sides: 6,
		hasRightAngles: false,
		isRegular: true,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 6,
		hasCenterSymmetry: true,
		hasEqualSides: true,
		hasParallelSides: true,
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},
	heptagon_regular: {
		type: 'heptagon_regular',
		nameFr: 'Heptagone régulier',
		sides: 7,
		hasRightAngles: false,
		isRegular: true,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 7,
		hasCenterSymmetry: false,
		hasEqualSides: true,
		hasParallelSides: false,
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},
	octagon_regular: {
		type: 'octagon_regular',
		nameFr: 'Octogone régulier',
		sides: 8,
		hasRightAngles: false,
		isRegular: true,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 8,
		hasCenterSymmetry: true,
		hasEqualSides: true,
		hasParallelSides: true,
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},

	// Irregular polygons
	pentagon_irregular: {
		type: 'pentagon_irregular',
		nameFr: 'Pentagone irrégulier',
		sides: 5,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: false,
		axesOfSymmetry: 0,
		hasCenterSymmetry: false,
		hasEqualSides: false,
		hasParallelSides: false,
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},
	hexagon_irregular: {
		type: 'hexagon_irregular',
		nameFr: 'Hexagone irrégulier',
		sides: 6,
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: false,
		axesOfSymmetry: 0,
		hasCenterSymmetry: false,
		hasEqualSides: false,
		hasParallelSides: false,
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: true,
		hasCurvedEdges: false
	},

	// Circles and arcs
	circle: {
		type: 'circle',
		nameFr: 'Cercle',
		sides: 0,
		hasRightAngles: false,
		isRegular: true, // Infinite symmetry
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: Infinity,
		hasCenterSymmetry: true,
		hasEqualSides: false, // N/A
		hasParallelSides: false, // N/A
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: false,
		hasCurvedEdges: true
	},
	semicircle: {
		type: 'semicircle',
		nameFr: 'Demi-cercle',
		sides: 1, // The diameter
		hasRightAngles: false,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 1,
		hasCenterSymmetry: false,
		hasEqualSides: false,
		hasParallelSides: false,
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: false,
		hasCurvedEdges: true
	},
	quarter_circle: {
		type: 'quarter_circle',
		nameFr: 'Quart de cercle',
		sides: 2, // Two radii
		hasRightAngles: true,
		isRegular: false,
		isConvex: true,
		hasAxisSymmetry: true,
		axesOfSymmetry: 1,
		hasCenterSymmetry: false,
		hasEqualSides: true, // Two radii are equal
		hasParallelSides: false,
		isTriangle: false,
		isQuadrilateral: false,
		isPolygon: false,
		hasCurvedEdges: true
	}
};

// ============================================================================
// QUESTION TYPES
// ============================================================================

/**
 * Question types specific to 2D shapes
 */
export type Shape2DQuestionType =
	| 'sides_count'
	| 'sides_greater_than'
	| 'sides_less_than'
	| 'has_right_angles'
	| 'is_regular'
	| 'is_convex'
	| 'has_axis_symmetry'
	| 'axes_count'
	| 'axes_greater_than'
	| 'has_center_symmetry'
	| 'has_equal_sides'
	| 'has_parallel_sides'
	| 'is_triangle'
	| 'is_quadrilateral'
	| 'is_polygon'
	| 'has_curved_edges';

// ============================================================================
// PROPERTY CHECKS
// ============================================================================

/**
 * Check a shape property by type
 */
export function checkShape2DProperty(
	shape: Shape2D,
	type: Shape2DQuestionType,
	param?: number
): boolean {
	switch (type) {
		case 'sides_count':
			if (param === undefined) throw new Error('sides_count requires param');
			return shape.sides === param;
		case 'sides_greater_than':
			if (param === undefined) throw new Error('sides_greater_than requires param');
			return shape.sides > param;
		case 'sides_less_than':
			if (param === undefined) throw new Error('sides_less_than requires param');
			return shape.sides < param;
		case 'has_right_angles':
			return shape.hasRightAngles;
		case 'is_regular':
			return shape.isRegular;
		case 'is_convex':
			return shape.isConvex;
		case 'has_axis_symmetry':
			return shape.hasAxisSymmetry;
		case 'axes_count':
			if (param === undefined) throw new Error('axes_count requires param');
			return shape.axesOfSymmetry === param;
		case 'axes_greater_than':
			if (param === undefined) throw new Error('axes_greater_than requires param');
			return shape.axesOfSymmetry > param;
		case 'has_center_symmetry':
			return shape.hasCenterSymmetry;
		case 'has_equal_sides':
			return shape.hasEqualSides;
		case 'has_parallel_sides':
			return shape.hasParallelSides;
		case 'is_triangle':
			return shape.isTriangle;
		case 'is_quadrilateral':
			return shape.isQuadrilateral;
		case 'is_polygon':
			return shape.isPolygon;
		case 'has_curved_edges':
			return shape.hasCurvedEdges;
	}
}

// ============================================================================
// GRID GENERATION
// ============================================================================

/**
 * Get all available 2D shapes
 */
export function getAllShapes2D(): Shape2D[] {
	return Object.values(SHAPES_2D);
}

/**
 * Get shapes filtered by criteria
 */
export function filterShapes2D(criteria: {
	minSides?: number;
	maxSides?: number;
	onlyPolygons?: boolean;
	onlyRegular?: boolean;
	hasRightAngles?: boolean;
}): Shape2D[] {
	return getAllShapes2D().filter((shape) => {
		if (criteria.minSides !== undefined && shape.sides < criteria.minSides) return false;
		if (criteria.maxSides !== undefined && shape.sides > criteria.maxSides) return false;
		if (criteria.onlyPolygons && !shape.isPolygon) return false;
		if (criteria.onlyRegular && !shape.isRegular) return false;
		if (criteria.hasRightAngles !== undefined && shape.hasRightAngles !== criteria.hasRightAngles)
			return false;
		return true;
	});
}

/**
 * Generate a random selection of shapes for a game grid
 */
export function generateShapeGrid(
	count: number,
	criteria?: Parameters<typeof filterShapes2D>[0]
): Shape2D[] {
	const pool = criteria ? filterShapes2D(criteria) : getAllShapes2D();

	if (pool.length < count) {
		throw new Error(`Not enough shapes matching criteria (need ${count}, have ${pool.length})`);
	}

	// Shuffle and pick
	const shuffled = [...pool].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

// ============================================================================
// DISPLAY (SVG)
// ============================================================================

/**
 * Generate SVG path for a shape
 * Returns an object with SVG path data and viewBox
 */
export function shape2DToSVG(shape: Shape2D): { path: string; viewBox: string; fill?: string } {
	const size = 100; // Base size
	const cx = size / 2;
	const cy = size / 2;
	const r = size * 0.4; // Radius for polygons

	switch (shape.type) {
		// Triangles
		case 'triangle_equilateral':
			return {
				path: generateRegularPolygonPath(3, cx, cy, r),
				viewBox: `0 0 ${size} ${size}`
			};
		case 'triangle_isocele':
			return {
				path: `M ${cx} ${cy - r} L ${cx - r * 0.8} ${cy + r * 0.6} L ${cx + r * 0.8} ${cy + r * 0.6} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'triangle_rectangle':
			return {
				path: `M ${cx - r} ${cy + r * 0.6} L ${cx - r} ${cy - r * 0.4} L ${cx + r} ${cy + r * 0.6} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'triangle_rectangle_isocele':
			return {
				path: `M ${cx - r * 0.7} ${cy + r * 0.7} L ${cx - r * 0.7} ${cy - r * 0.7} L ${cx + r * 0.7} ${cy + r * 0.7} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'triangle_scalene':
			return {
				path: `M ${cx - r * 0.3} ${cy - r * 0.8} L ${cx - r} ${cy + r * 0.6} L ${cx + r * 0.9} ${cy + r * 0.4} Z`,
				viewBox: `0 0 ${size} ${size}`
			};

		// Quadrilaterals
		case 'square':
			return {
				path: generateRegularPolygonPath(4, cx, cy, r, Math.PI / 4),
				viewBox: `0 0 ${size} ${size}`
			};
		case 'rectangle':
			return {
				path: `M ${cx - r} ${cy - r * 0.6} L ${cx + r} ${cy - r * 0.6} L ${cx + r} ${cy + r * 0.6} L ${cx - r} ${cy + r * 0.6} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'rhombus':
			return {
				path: `M ${cx} ${cy - r} L ${cx + r * 0.7} ${cy} L ${cx} ${cy + r} L ${cx - r * 0.7} ${cy} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'parallelogram':
			return {
				path: `M ${cx - r * 0.6} ${cy - r * 0.5} L ${cx + r} ${cy - r * 0.5} L ${cx + r * 0.6} ${cy + r * 0.5} L ${cx - r} ${cy + r * 0.5} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'trapezoid':
			return {
				path: `M ${cx - r * 0.5} ${cy - r * 0.5} L ${cx + r * 0.5} ${cy - r * 0.5} L ${cx + r} ${cy + r * 0.5} L ${cx - r} ${cy + r * 0.5} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'trapezoid_isocele':
			return {
				path: `M ${cx - r * 0.5} ${cy - r * 0.5} L ${cx + r * 0.5} ${cy - r * 0.5} L ${cx + r * 0.8} ${cy + r * 0.5} L ${cx - r * 0.8} ${cy + r * 0.5} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'kite':
			return {
				path: `M ${cx} ${cy - r} L ${cx + r * 0.5} ${cy - r * 0.2} L ${cx} ${cy + r} L ${cx - r * 0.5} ${cy - r * 0.2} Z`,
				viewBox: `0 0 ${size} ${size}`
			};

		// Regular polygons
		case 'pentagon_regular':
			return {
				path: generateRegularPolygonPath(5, cx, cy, r),
				viewBox: `0 0 ${size} ${size}`
			};
		case 'hexagon_regular':
			return {
				path: generateRegularPolygonPath(6, cx, cy, r),
				viewBox: `0 0 ${size} ${size}`
			};
		case 'heptagon_regular':
			return {
				path: generateRegularPolygonPath(7, cx, cy, r),
				viewBox: `0 0 ${size} ${size}`
			};
		case 'octagon_regular':
			return {
				path: generateRegularPolygonPath(8, cx, cy, r),
				viewBox: `0 0 ${size} ${size}`
			};

		// Irregular polygons
		case 'pentagon_irregular':
			return {
				path: `M ${cx} ${cy - r} L ${cx + r * 0.9} ${cy - r * 0.3} L ${cx + r * 0.6} ${cy + r * 0.8} L ${cx - r * 0.6} ${cy + r * 0.6} L ${cx - r * 0.8} ${cy - r * 0.2} Z`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'hexagon_irregular':
			return {
				path: `M ${cx - r * 0.3} ${cy - r * 0.9} L ${cx + r * 0.6} ${cy - r * 0.7} L ${cx + r * 0.9} ${cy} L ${cx + r * 0.5} ${cy + r * 0.8} L ${cx - r * 0.4} ${cy + r * 0.7} L ${cx - r * 0.8} ${cy - r * 0.1} Z`,
				viewBox: `0 0 ${size} ${size}`
			};

		// Circles and arcs
		case 'circle':
			return {
				path: `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'semicircle':
			return {
				path: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} L ${cx - r} ${cy}`,
				viewBox: `0 0 ${size} ${size}`
			};
		case 'quarter_circle':
			return {
				path: `M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy - r} L ${cx} ${cy}`,
				viewBox: `0 0 ${size} ${size}`
			};
	}
}

/**
 * Generate SVG path for a regular polygon
 */
function generateRegularPolygonPath(
	sides: number,
	cx: number,
	cy: number,
	r: number,
	startAngle: number = -Math.PI / 2
): string {
	const points: string[] = [];
	for (let i = 0; i < sides; i++) {
		const angle = startAngle + (i * 2 * Math.PI) / sides;
		const x = cx + r * Math.cos(angle);
		const y = cy + r * Math.sin(angle);
		points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
	}
	return `M ${points.join(' L ')} Z`;
}

/**
 * Check if two shapes are the same type
 */
export function shapesEqual(s1: Shape2D, s2: Shape2D): boolean {
	return s1.type === s2.type;
}
