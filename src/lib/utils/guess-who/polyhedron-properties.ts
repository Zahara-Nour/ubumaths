/**
 * Polyhedron Properties for Guess Who Math Game
 *
 * Provides types and utilities for checking properties of 3D polyhedra.
 * Supports common polyhedra like cubes, tetrahedra, pyramids, prisms, etc.
 *
 * @module utils/guess-who/polyhedron-properties
 */

// ============================================================================
// POLYHEDRON TYPES
// ============================================================================

/**
 * Types of polygon faces
 */
export type FaceType = 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'rectangle';

/**
 * A 3D polyhedron with its properties
 */
export interface Polyhedron {
	/** Unique identifier */
	id: string;
	/** Name of the polyhedron */
	name: string;
	/** French name for display */
	nameFr: string;
	/** Number of faces */
	faceCount: number;
	/** Number of vertices */
	vertexCount: number;
	/** Number of edges */
	edgeCount: number;
	/** Types of faces present */
	faceTypes: FaceType[];
	/** Count of each face type */
	faceTypeCounts: Record<FaceType, number>;
	/** Is a regular polyhedron (Platonic solid) */
	isRegular: boolean;
	/** Is a prism */
	isPrism: boolean;
	/** Is a pyramid */
	isPyramid: boolean;
	/** Is an antiprism */
	isAntiprism: boolean;
	/** Has at least one square face */
	hasSquareFaces: boolean;
	/** Has at least one triangular face */
	hasTriangularFaces: boolean;
	/** Has at least one pentagonal face */
	hasPentagonalFaces: boolean;
	/** Has at least one hexagonal face */
	hasHexagonalFaces: boolean;
	/** Has at least one rectangular face (non-square) */
	hasRectangularFaces: boolean;
	/** All faces are the same polygon type */
	hasUniformFaces: boolean;
	/** Number of faces of each type that meet at each vertex */
	vertexConfiguration: string;
	/** Is convex */
	isConvex: boolean;
}

/**
 * Question types for polyhedra
 */
export type PolyhedronQuestionType =
	| 'face_count_equals'
	| 'face_count_greater_than'
	| 'face_count_less_than'
	| 'vertex_count_equals'
	| 'vertex_count_greater_than'
	| 'edge_count_equals'
	| 'edge_count_greater_than'
	| 'is_regular'
	| 'is_prism'
	| 'is_pyramid'
	| 'is_antiprism'
	| 'has_square_faces'
	| 'has_triangular_faces'
	| 'has_pentagonal_faces'
	| 'has_hexagonal_faces'
	| 'has_rectangular_faces'
	| 'has_uniform_faces'
	| 'is_convex'
	| 'is_platonic_solid'
	| 'face_type_count';

// ============================================================================
// PREDEFINED POLYHEDRA
// ============================================================================

/**
 * All predefined polyhedra
 */
export const POLYHEDRA: Record<string, Omit<Polyhedron, 'id'>> = {
	// Platonic Solids (Regular)
	tetrahedron: {
		name: 'tetrahedron',
		nameFr: 'Tetraedre',
		faceCount: 4,
		vertexCount: 4,
		edgeCount: 6,
		faceTypes: ['triangle'],
		faceTypeCounts: { triangle: 4, square: 0, pentagon: 0, hexagon: 0, rectangle: 0 },
		isRegular: true,
		isPrism: false,
		isPyramid: true,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: true,
		vertexConfiguration: '3.3.3',
		isConvex: true
	},
	cube: {
		name: 'cube',
		nameFr: 'Cube',
		faceCount: 6,
		vertexCount: 8,
		edgeCount: 12,
		faceTypes: ['square'],
		faceTypeCounts: { triangle: 0, square: 6, pentagon: 0, hexagon: 0, rectangle: 0 },
		isRegular: true,
		isPrism: true,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: true,
		hasTriangularFaces: false,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: true,
		vertexConfiguration: '4.4.4',
		isConvex: true
	},
	octahedron: {
		name: 'octahedron',
		nameFr: 'Octaedre',
		faceCount: 8,
		vertexCount: 6,
		edgeCount: 12,
		faceTypes: ['triangle'],
		faceTypeCounts: { triangle: 8, square: 0, pentagon: 0, hexagon: 0, rectangle: 0 },
		isRegular: true,
		isPrism: false,
		isPyramid: false,
		isAntiprism: true,
		hasSquareFaces: false,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: true,
		vertexConfiguration: '3.3.3.3',
		isConvex: true
	},
	dodecahedron: {
		name: 'dodecahedron',
		nameFr: 'Dodecaedre',
		faceCount: 12,
		vertexCount: 20,
		edgeCount: 30,
		faceTypes: ['pentagon'],
		faceTypeCounts: { triangle: 0, square: 0, pentagon: 12, hexagon: 0, rectangle: 0 },
		isRegular: true,
		isPrism: false,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: false,
		hasPentagonalFaces: true,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: true,
		vertexConfiguration: '5.5.5',
		isConvex: true
	},
	icosahedron: {
		name: 'icosahedron',
		nameFr: 'Icosaedre',
		faceCount: 20,
		vertexCount: 12,
		edgeCount: 30,
		faceTypes: ['triangle'],
		faceTypeCounts: { triangle: 20, square: 0, pentagon: 0, hexagon: 0, rectangle: 0 },
		isRegular: true,
		isPrism: false,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: true,
		vertexConfiguration: '3.3.3.3.3',
		isConvex: true
	},

	// Prisms
	triangular_prism: {
		name: 'triangular_prism',
		nameFr: 'Prisme triangulaire',
		faceCount: 5,
		vertexCount: 6,
		edgeCount: 9,
		faceTypes: ['triangle', 'rectangle'],
		faceTypeCounts: { triangle: 2, square: 0, pentagon: 0, hexagon: 0, rectangle: 3 },
		isRegular: false,
		isPrism: true,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: true,
		hasUniformFaces: false,
		vertexConfiguration: '3.4.4',
		isConvex: true
	},
	pentagonal_prism: {
		name: 'pentagonal_prism',
		nameFr: 'Prisme pentagonal',
		faceCount: 7,
		vertexCount: 10,
		edgeCount: 15,
		faceTypes: ['pentagon', 'rectangle'],
		faceTypeCounts: { triangle: 0, square: 0, pentagon: 2, hexagon: 0, rectangle: 5 },
		isRegular: false,
		isPrism: true,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: false,
		hasPentagonalFaces: true,
		hasHexagonalFaces: false,
		hasRectangularFaces: true,
		hasUniformFaces: false,
		vertexConfiguration: '4.4.5',
		isConvex: true
	},
	hexagonal_prism: {
		name: 'hexagonal_prism',
		nameFr: 'Prisme hexagonal',
		faceCount: 8,
		vertexCount: 12,
		edgeCount: 18,
		faceTypes: ['hexagon', 'rectangle'],
		faceTypeCounts: { triangle: 0, square: 0, pentagon: 0, hexagon: 2, rectangle: 6 },
		isRegular: false,
		isPrism: true,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: false,
		hasPentagonalFaces: false,
		hasHexagonalFaces: true,
		hasRectangularFaces: true,
		hasUniformFaces: false,
		vertexConfiguration: '4.4.6',
		isConvex: true
	},

	// Pyramids
	square_pyramid: {
		name: 'square_pyramid',
		nameFr: 'Pyramide a base carree',
		faceCount: 5,
		vertexCount: 5,
		edgeCount: 8,
		faceTypes: ['triangle', 'square'],
		faceTypeCounts: { triangle: 4, square: 1, pentagon: 0, hexagon: 0, rectangle: 0 },
		isRegular: false,
		isPrism: false,
		isPyramid: true,
		isAntiprism: false,
		hasSquareFaces: true,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: false,
		vertexConfiguration: '3.3.3.3 / 3.3.4.3',
		isConvex: true
	},
	pentagonal_pyramid: {
		name: 'pentagonal_pyramid',
		nameFr: 'Pyramide a base pentagonale',
		faceCount: 6,
		vertexCount: 6,
		edgeCount: 10,
		faceTypes: ['triangle', 'pentagon'],
		faceTypeCounts: { triangle: 5, square: 0, pentagon: 1, hexagon: 0, rectangle: 0 },
		isRegular: false,
		isPrism: false,
		isPyramid: true,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: true,
		hasPentagonalFaces: true,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: false,
		vertexConfiguration: '3.3.3.3.3 / 3.3.5.3',
		isConvex: true
	},
	hexagonal_pyramid: {
		name: 'hexagonal_pyramid',
		nameFr: 'Pyramide a base hexagonale',
		faceCount: 7,
		vertexCount: 7,
		edgeCount: 12,
		faceTypes: ['triangle', 'hexagon'],
		faceTypeCounts: { triangle: 6, square: 0, pentagon: 0, hexagon: 1, rectangle: 0 },
		isRegular: false,
		isPrism: false,
		isPyramid: true,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: true,
		hasRectangularFaces: false,
		hasUniformFaces: false,
		vertexConfiguration: '3.3.3.3.3.3 / 3.3.6.3',
		isConvex: true
	},

	// Antiprisms
	square_antiprism: {
		name: 'square_antiprism',
		nameFr: 'Antiprisme carre',
		faceCount: 10,
		vertexCount: 8,
		edgeCount: 16,
		faceTypes: ['triangle', 'square'],
		faceTypeCounts: { triangle: 8, square: 2, pentagon: 0, hexagon: 0, rectangle: 0 },
		isRegular: false,
		isPrism: false,
		isPyramid: false,
		isAntiprism: true,
		hasSquareFaces: true,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: false,
		vertexConfiguration: '3.3.3.4',
		isConvex: true
	},

	// Other common polyhedra
	cuboctahedron: {
		name: 'cuboctahedron',
		nameFr: 'Cuboctaedre',
		faceCount: 14,
		vertexCount: 12,
		edgeCount: 24,
		faceTypes: ['triangle', 'square'],
		faceTypeCounts: { triangle: 8, square: 6, pentagon: 0, hexagon: 0, rectangle: 0 },
		isRegular: false,
		isPrism: false,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: true,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: false,
		vertexConfiguration: '3.4.3.4',
		isConvex: true
	},
	truncated_tetrahedron: {
		name: 'truncated_tetrahedron',
		nameFr: 'Tetraedre tronque',
		faceCount: 8,
		vertexCount: 12,
		edgeCount: 18,
		faceTypes: ['triangle', 'hexagon'],
		faceTypeCounts: { triangle: 4, square: 0, pentagon: 0, hexagon: 4, rectangle: 0 },
		isRegular: false,
		isPrism: false,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: false,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: true,
		hasRectangularFaces: false,
		hasUniformFaces: false,
		vertexConfiguration: '3.6.6',
		isConvex: true
	},
	truncated_cube: {
		name: 'truncated_cube',
		nameFr: 'Cube tronque',
		faceCount: 14,
		vertexCount: 24,
		edgeCount: 36,
		faceTypes: ['triangle', 'square'],
		faceTypeCounts: { triangle: 8, square: 6, pentagon: 0, hexagon: 0, rectangle: 0 },
		isRegular: false,
		isPrism: false,
		isPyramid: false,
		isAntiprism: false,
		hasSquareFaces: true,
		hasTriangularFaces: true,
		hasPentagonalFaces: false,
		hasHexagonalFaces: false,
		hasRectangularFaces: false,
		hasUniformFaces: false,
		vertexConfiguration: '3.8.8',
		isConvex: true
	}
};

// ============================================================================
// POLYHEDRON CREATION
// ============================================================================

/**
 * Create a Polyhedron from a predefined type
 */
export function createPolyhedron(name: string, id?: string): Polyhedron | null {
	const template = POLYHEDRA[name];
	if (!template) return null;

	return {
		id: id ?? crypto.randomUUID(),
		...template
	};
}

/**
 * Get all available polyhedron names
 */
export function getPolyhedronNames(): string[] {
	return Object.keys(POLYHEDRA);
}

/**
 * Get all Platonic solids
 */
export function getPlatonicSolids(): Polyhedron[] {
	return Object.entries(POLYHEDRA)
		.filter(([, p]) => p.isRegular)
		.map(([name]) => createPolyhedron(name)!);
}

/**
 * Get all prisms
 */
export function getPrisms(): Polyhedron[] {
	return Object.entries(POLYHEDRA)
		.filter(([, p]) => p.isPrism)
		.map(([name]) => createPolyhedron(name)!);
}

/**
 * Get all pyramids
 */
export function getPyramids(): Polyhedron[] {
	return Object.entries(POLYHEDRA)
		.filter(([, p]) => p.isPyramid)
		.map(([name]) => createPolyhedron(name)!);
}

// ============================================================================
// PROPERTY CHECKS
// ============================================================================

/**
 * Check a polyhedron property by type
 */
export function checkPolyhedronProperty(
	polyhedron: Polyhedron,
	type: PolyhedronQuestionType,
	param?: number | FaceType
): boolean {
	switch (type) {
		case 'face_count_equals':
			if (param === undefined || typeof param !== 'number')
				throw new Error('face_count_equals requires numeric param');
			return polyhedron.faceCount === param;

		case 'face_count_greater_than':
			if (param === undefined || typeof param !== 'number')
				throw new Error('face_count_greater_than requires numeric param');
			return polyhedron.faceCount > param;

		case 'face_count_less_than':
			if (param === undefined || typeof param !== 'number')
				throw new Error('face_count_less_than requires numeric param');
			return polyhedron.faceCount < param;

		case 'vertex_count_equals':
			if (param === undefined || typeof param !== 'number')
				throw new Error('vertex_count_equals requires numeric param');
			return polyhedron.vertexCount === param;

		case 'vertex_count_greater_than':
			if (param === undefined || typeof param !== 'number')
				throw new Error('vertex_count_greater_than requires numeric param');
			return polyhedron.vertexCount > param;

		case 'edge_count_equals':
			if (param === undefined || typeof param !== 'number')
				throw new Error('edge_count_equals requires numeric param');
			return polyhedron.edgeCount === param;

		case 'edge_count_greater_than':
			if (param === undefined || typeof param !== 'number')
				throw new Error('edge_count_greater_than requires numeric param');
			return polyhedron.edgeCount > param;

		case 'is_regular':
			return polyhedron.isRegular;

		case 'is_prism':
			return polyhedron.isPrism;

		case 'is_pyramid':
			return polyhedron.isPyramid;

		case 'is_antiprism':
			return polyhedron.isAntiprism;

		case 'has_square_faces':
			return polyhedron.hasSquareFaces;

		case 'has_triangular_faces':
			return polyhedron.hasTriangularFaces;

		case 'has_pentagonal_faces':
			return polyhedron.hasPentagonalFaces;

		case 'has_hexagonal_faces':
			return polyhedron.hasHexagonalFaces;

		case 'has_rectangular_faces':
			return polyhedron.hasRectangularFaces;

		case 'has_uniform_faces':
			return polyhedron.hasUniformFaces;

		case 'is_convex':
			return polyhedron.isConvex;

		case 'is_platonic_solid':
			return polyhedron.isRegular;

		case 'face_type_count':
			if (param === undefined || typeof param !== 'string')
				throw new Error('face_type_count requires FaceType param');
			return polyhedron.faceTypeCounts[param as FaceType] > 0;
	}
}

/**
 * Filter polyhedra by a property
 */
export function filterPolyhedra(
	polyhedra: Polyhedron[],
	type: PolyhedronQuestionType,
	param?: number | FaceType,
	expected: boolean = true
): Polyhedron[] {
	return polyhedra.filter((p) => checkPolyhedronProperty(p, type, param) === expected);
}

// ============================================================================
// GENERATION
// ============================================================================

/**
 * Template categories for polyhedron generation
 */
export const POLYHEDRON_TEMPLATES = {
	platonic: ['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron'],
	prisms: ['cube', 'triangular_prism', 'pentagonal_prism', 'hexagonal_prism'],
	pyramids: ['tetrahedron', 'square_pyramid', 'pentagonal_pyramid', 'hexagonal_pyramid'],
	antiprisms: ['octahedron', 'square_antiprism'],
	archimedean: ['cuboctahedron', 'truncated_tetrahedron', 'truncated_cube'],
	all: Object.keys(POLYHEDRA)
} as const;

/**
 * Generate polyhedra from a category
 */
export function generatePolyhedra(
	category: keyof typeof POLYHEDRON_TEMPLATES,
	count: number
): Polyhedron[] {
	const templates = POLYHEDRON_TEMPLATES[category];
	const polyhedra: Polyhedron[] = [];
	const usedNames = new Set<string>();

	const shuffled = [...templates].sort(() => Math.random() - 0.5);

	for (const name of shuffled) {
		if (polyhedra.length >= count) break;
		if (usedNames.has(name)) continue;

		const p = createPolyhedron(name);
		if (p) {
			usedNames.add(name);
			polyhedra.push(p);
		}
	}

	if (polyhedra.length < count) {
		throw new Error(
			`Could not generate ${count} polyhedra from ${category} (got ${polyhedra.length})`
		);
	}

	return polyhedra;
}

/**
 * Generate a mixed grid of polyhedra
 */
export function generatePolyhedronGrid(count: number): Polyhedron[] {
	const allPolyhedra: Polyhedron[] = [];
	const usedNames = new Set<string>();

	// Collect all templates
	for (const name of Object.keys(POLYHEDRA)) {
		const p = createPolyhedron(name);
		if (p && !usedNames.has(name)) {
			usedNames.add(name);
			allPolyhedra.push(p);
		}
	}

	// Shuffle and pick
	const shuffled = allPolyhedra.sort(() => Math.random() - 0.5);

	if (shuffled.length < count) {
		throw new Error(`Not enough polyhedra (need ${count}, have ${shuffled.length})`);
	}

	return shuffled.slice(0, count);
}

// ============================================================================
// DISPLAY
// ============================================================================

/**
 * Convert polyhedron to ubumark for display
 */
export function polyhedronToUbumark(polyhedron: Polyhedron): string {
	return polyhedron.nameFr;
}

/**
 * Get LaTeX representation for a polyhedron
 */
export function polyhedronToLatex(polyhedron: Polyhedron): string {
	// For now, just return the French name
	// In the future, this could include a reference to a 3D image
	return `\\text{${polyhedron.nameFr}}`;
}

/**
 * Check if two polyhedra are the same
 */
export function polyhedraEqual(p1: Polyhedron, p2: Polyhedron): boolean {
	return p1.name === p2.name;
}

/**
 * Get a description of the polyhedron's properties in French
 */
export function getPolyhedronDescription(polyhedron: Polyhedron): string {
	const parts: string[] = [];

	parts.push(`${polyhedron.faceCount} faces`);
	parts.push(`${polyhedron.vertexCount} sommets`);
	parts.push(`${polyhedron.edgeCount} aretes`);

	if (polyhedron.isRegular) {
		parts.push('solide de Platon');
	}
	if (polyhedron.isPrism && !polyhedron.isRegular) {
		parts.push('prisme');
	}
	if (polyhedron.isPyramid && !polyhedron.isRegular) {
		parts.push('pyramide');
	}

	return parts.join(', ');
}
