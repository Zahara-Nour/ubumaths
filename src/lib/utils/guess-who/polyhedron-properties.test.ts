/**
 * Tests for Polyhedron Properties
 *
 * @vitest-environment node
 */

import { describe, test, expect } from 'vitest';
import {
	createPolyhedron,
	getPolyhedronNames,
	getPlatonicSolids,
	getPrisms,
	getPyramids,
	checkPolyhedronProperty,
	filterPolyhedra,
	generatePolyhedra,
	generatePolyhedronGrid,
	polyhedronToUbumark,
	polyhedraEqual,
	getPolyhedronDescription,
	POLYHEDRA,
	POLYHEDRON_TEMPLATES
} from './polyhedron-properties';

// ============================================================================
// POLYHEDRON CREATION TESTS
// ============================================================================

describe('createPolyhedron', () => {
	test('creates cube', () => {
		const cube = createPolyhedron('cube');
		expect(cube).not.toBeNull();
		expect(cube!.name).toBe('cube');
		expect(cube!.faceCount).toBe(6);
		expect(cube!.vertexCount).toBe(8);
		expect(cube!.edgeCount).toBe(12);
	});

	test('creates tetrahedron', () => {
		const tetra = createPolyhedron('tetrahedron');
		expect(tetra).not.toBeNull();
		expect(tetra!.name).toBe('tetrahedron');
		expect(tetra!.faceCount).toBe(4);
		expect(tetra!.isRegular).toBe(true);
	});

	test('returns null for unknown polyhedron', () => {
		const unknown = createPolyhedron('unknown_shape');
		expect(unknown).toBeNull();
	});

	test('uses provided id', () => {
		const cube = createPolyhedron('cube', 'custom-id');
		expect(cube!.id).toBe('custom-id');
	});
});

describe('getPolyhedronNames', () => {
	test('returns all polyhedron names', () => {
		const names = getPolyhedronNames();
		expect(names).toContain('cube');
		expect(names).toContain('tetrahedron');
		expect(names).toContain('octahedron');
		expect(names.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// PLATONIC SOLIDS TESTS
// ============================================================================

describe('Platonic solids', () => {
	test('getPlatonicSolids returns 5 solids', () => {
		const solids = getPlatonicSolids();
		expect(solids).toHaveLength(5);
	});

	test('all Platonic solids are regular', () => {
		const solids = getPlatonicSolids();
		for (const solid of solids) {
			expect(solid.isRegular).toBe(true);
		}
	});

	test('Euler formula holds: V - E + F = 2', () => {
		const solids = getPlatonicSolids();
		for (const solid of solids) {
			const euler = solid.vertexCount - solid.edgeCount + solid.faceCount;
			expect(euler).toBe(2);
		}
	});

	test('tetrahedron has 4 triangular faces', () => {
		const tetra = createPolyhedron('tetrahedron')!;
		expect(tetra.faceCount).toBe(4);
		expect(tetra.faceTypeCounts.triangle).toBe(4);
		expect(tetra.hasUniformFaces).toBe(true);
	});

	test('cube has 6 square faces', () => {
		const cube = createPolyhedron('cube')!;
		expect(cube.faceCount).toBe(6);
		expect(cube.faceTypeCounts.square).toBe(6);
		expect(cube.hasUniformFaces).toBe(true);
	});

	test('octahedron has 8 triangular faces', () => {
		const octa = createPolyhedron('octahedron')!;
		expect(octa.faceCount).toBe(8);
		expect(octa.faceTypeCounts.triangle).toBe(8);
	});

	test('dodecahedron has 12 pentagonal faces', () => {
		const dodeca = createPolyhedron('dodecahedron')!;
		expect(dodeca.faceCount).toBe(12);
		expect(dodeca.faceTypeCounts.pentagon).toBe(12);
	});

	test('icosahedron has 20 triangular faces', () => {
		const icosa = createPolyhedron('icosahedron')!;
		expect(icosa.faceCount).toBe(20);
		expect(icosa.faceTypeCounts.triangle).toBe(20);
	});
});

// ============================================================================
// PRISMS AND PYRAMIDS TESTS
// ============================================================================

describe('Prisms', () => {
	test('getPrisms returns prisms', () => {
		const prisms = getPrisms();
		expect(prisms.length).toBeGreaterThan(0);
		for (const prism of prisms) {
			expect(prism.isPrism).toBe(true);
		}
	});

	test('triangular prism has correct properties', () => {
		const prism = createPolyhedron('triangular_prism')!;
		expect(prism.faceCount).toBe(5);
		expect(prism.vertexCount).toBe(6);
		expect(prism.edgeCount).toBe(9);
		expect(prism.faceTypeCounts.triangle).toBe(2);
		expect(prism.faceTypeCounts.rectangle).toBe(3);
	});

	test('cube is also a prism', () => {
		const cube = createPolyhedron('cube')!;
		expect(cube.isPrism).toBe(true);
	});
});

describe('Pyramids', () => {
	test('getPyramids returns pyramids', () => {
		const pyramids = getPyramids();
		expect(pyramids.length).toBeGreaterThan(0);
		for (const pyramid of pyramids) {
			expect(pyramid.isPyramid).toBe(true);
		}
	});

	test('square pyramid has correct properties', () => {
		const pyramid = createPolyhedron('square_pyramid')!;
		expect(pyramid.faceCount).toBe(5);
		expect(pyramid.vertexCount).toBe(5);
		expect(pyramid.edgeCount).toBe(8);
		expect(pyramid.faceTypeCounts.triangle).toBe(4);
		expect(pyramid.faceTypeCounts.square).toBe(1);
	});

	test('tetrahedron is also a pyramid', () => {
		const tetra = createPolyhedron('tetrahedron')!;
		expect(tetra.isPyramid).toBe(true);
	});
});

// ============================================================================
// PROPERTY CHECK TESTS
// ============================================================================

describe('checkPolyhedronProperty', () => {
	const cube = createPolyhedron('cube')!;
	const tetra = createPolyhedron('tetrahedron')!;
	const pyramid = createPolyhedron('square_pyramid')!;

	test('face_count_equals', () => {
		expect(checkPolyhedronProperty(cube, 'face_count_equals', 6)).toBe(true);
		expect(checkPolyhedronProperty(cube, 'face_count_equals', 5)).toBe(false);
	});

	test('face_count_greater_than', () => {
		expect(checkPolyhedronProperty(cube, 'face_count_greater_than', 5)).toBe(true);
		expect(checkPolyhedronProperty(cube, 'face_count_greater_than', 6)).toBe(false);
	});

	test('face_count_less_than', () => {
		expect(checkPolyhedronProperty(tetra, 'face_count_less_than', 5)).toBe(true);
		expect(checkPolyhedronProperty(cube, 'face_count_less_than', 5)).toBe(false);
	});

	test('vertex_count_equals', () => {
		expect(checkPolyhedronProperty(cube, 'vertex_count_equals', 8)).toBe(true);
		expect(checkPolyhedronProperty(tetra, 'vertex_count_equals', 4)).toBe(true);
	});

	test('vertex_count_greater_than', () => {
		expect(checkPolyhedronProperty(cube, 'vertex_count_greater_than', 5)).toBe(true);
		expect(checkPolyhedronProperty(tetra, 'vertex_count_greater_than', 5)).toBe(false);
	});

	test('edge_count_equals', () => {
		expect(checkPolyhedronProperty(cube, 'edge_count_equals', 12)).toBe(true);
		expect(checkPolyhedronProperty(tetra, 'edge_count_equals', 6)).toBe(true);
	});

	test('is_regular', () => {
		expect(checkPolyhedronProperty(cube, 'is_regular')).toBe(true);
		expect(checkPolyhedronProperty(pyramid, 'is_regular')).toBe(false);
	});

	test('is_prism', () => {
		expect(checkPolyhedronProperty(cube, 'is_prism')).toBe(true);
		expect(checkPolyhedronProperty(tetra, 'is_prism')).toBe(false);
	});

	test('is_pyramid', () => {
		expect(checkPolyhedronProperty(pyramid, 'is_pyramid')).toBe(true);
		expect(checkPolyhedronProperty(cube, 'is_pyramid')).toBe(false);
	});

	test('has_square_faces', () => {
		expect(checkPolyhedronProperty(cube, 'has_square_faces')).toBe(true);
		expect(checkPolyhedronProperty(tetra, 'has_square_faces')).toBe(false);
	});

	test('has_triangular_faces', () => {
		expect(checkPolyhedronProperty(tetra, 'has_triangular_faces')).toBe(true);
		expect(checkPolyhedronProperty(cube, 'has_triangular_faces')).toBe(false);
	});

	test('has_uniform_faces', () => {
		expect(checkPolyhedronProperty(cube, 'has_uniform_faces')).toBe(true);
		expect(checkPolyhedronProperty(pyramid, 'has_uniform_faces')).toBe(false);
	});

	test('is_convex', () => {
		expect(checkPolyhedronProperty(cube, 'is_convex')).toBe(true);
		expect(checkPolyhedronProperty(tetra, 'is_convex')).toBe(true);
	});

	test('is_platonic_solid', () => {
		expect(checkPolyhedronProperty(cube, 'is_platonic_solid')).toBe(true);
		expect(checkPolyhedronProperty(pyramid, 'is_platonic_solid')).toBe(false);
	});

	test('throws error when param is missing', () => {
		expect(() => checkPolyhedronProperty(cube, 'face_count_equals')).toThrow();
		expect(() => checkPolyhedronProperty(cube, 'vertex_count_greater_than')).toThrow();
	});
});

// ============================================================================
// FILTER TESTS
// ============================================================================

describe('filterPolyhedra', () => {
	test('filters by is_regular', () => {
		const all = Object.keys(POLYHEDRA).map((n) => createPolyhedron(n)!);
		const regular = filterPolyhedra(all, 'is_regular');
		expect(regular.length).toBe(5); // 5 Platonic solids
	});

	test('filters by has_triangular_faces', () => {
		const all = Object.keys(POLYHEDRA).map((n) => createPolyhedron(n)!);
		const withTriangles = filterPolyhedra(all, 'has_triangular_faces');
		expect(withTriangles.length).toBeGreaterThan(0);
		for (const p of withTriangles) {
			expect(p.hasTriangularFaces).toBe(true);
		}
	});

	test('filters by face_count_greater_than', () => {
		const all = Object.keys(POLYHEDRA).map((n) => createPolyhedron(n)!);
		const moreThan6 = filterPolyhedra(all, 'face_count_greater_than', 6);
		for (const p of moreThan6) {
			expect(p.faceCount).toBeGreaterThan(6);
		}
	});
});

// ============================================================================
// GENERATION TESTS
// ============================================================================

describe('generatePolyhedra', () => {
	test('generates platonic solids', () => {
		const solids = generatePolyhedra('platonic', 3);
		expect(solids).toHaveLength(3);
		for (const s of solids) {
			expect(s.isRegular).toBe(true);
		}
	});

	test('generates prisms', () => {
		const prisms = generatePolyhedra('prisms', 3);
		expect(prisms).toHaveLength(3);
		for (const p of prisms) {
			expect(p.isPrism).toBe(true);
		}
	});

	test('generates unique polyhedra', () => {
		const solids = generatePolyhedra('all', 5);
		const names = new Set(solids.map((s) => s.name));
		expect(names.size).toBe(5);
	});
});

describe('generatePolyhedronGrid', () => {
	test('generates correct count', () => {
		const grid = generatePolyhedronGrid(8);
		expect(grid).toHaveLength(8);
	});

	test('generates unique polyhedra', () => {
		const grid = generatePolyhedronGrid(10);
		const names = new Set(grid.map((p) => p.name));
		expect(names.size).toBe(10);
	});

	test('includes variety of types', () => {
		const grid = generatePolyhedronGrid(15);
		const hasRegular = grid.some((p) => p.isRegular);
		const hasPrism = grid.some((p) => p.isPrism && !p.isRegular);
		const hasPyramid = grid.some((p) => p.isPyramid && !p.isRegular);
		expect(hasRegular).toBe(true);
		expect(hasPrism).toBe(true);
		expect(hasPyramid).toBe(true);
	});
});

// ============================================================================
// DISPLAY TESTS
// ============================================================================

describe('Display functions', () => {
	test('polyhedronToUbumark returns French name', () => {
		const cube = createPolyhedron('cube')!;
		expect(polyhedronToUbumark(cube)).toBe('Cube');
	});

	test('getPolyhedronDescription includes face count', () => {
		const cube = createPolyhedron('cube')!;
		const desc = getPolyhedronDescription(cube);
		expect(desc).toContain('6 faces');
		expect(desc).toContain('8 sommets');
		expect(desc).toContain('12 aretes');
	});
});

// ============================================================================
// EQUALITY TESTS
// ============================================================================

describe('polyhedraEqual', () => {
	test('same polyhedron returns true', () => {
		const cube1 = createPolyhedron('cube')!;
		const cube2 = createPolyhedron('cube')!;
		expect(polyhedraEqual(cube1, cube2)).toBe(true);
	});

	test('different polyhedra return false', () => {
		const cube = createPolyhedron('cube')!;
		const tetra = createPolyhedron('tetrahedron')!;
		expect(polyhedraEqual(cube, tetra)).toBe(false);
	});
});

// ============================================================================
// TEMPLATE TESTS
// ============================================================================

describe('POLYHEDRON_TEMPLATES', () => {
	test('all template categories exist', () => {
		expect(POLYHEDRON_TEMPLATES.platonic).toBeDefined();
		expect(POLYHEDRON_TEMPLATES.prisms).toBeDefined();
		expect(POLYHEDRON_TEMPLATES.pyramids).toBeDefined();
		expect(POLYHEDRON_TEMPLATES.antiprisms).toBeDefined();
		expect(POLYHEDRON_TEMPLATES.archimedean).toBeDefined();
		expect(POLYHEDRON_TEMPLATES.all).toBeDefined();
	});

	test('platonic has 5 solids', () => {
		expect(POLYHEDRON_TEMPLATES.platonic).toHaveLength(5);
	});

	test('all templates reference valid polyhedra', () => {
		for (const name of POLYHEDRON_TEMPLATES.all) {
			expect(POLYHEDRA[name]).toBeDefined();
		}
	});
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge cases', () => {
	test('all polyhedra satisfy Euler formula', () => {
		for (const name of Object.keys(POLYHEDRA)) {
			const p = createPolyhedron(name)!;
			const euler = p.vertexCount - p.edgeCount + p.faceCount;
			expect(euler).toBe(2);
		}
	});

	test('all polyhedra are convex', () => {
		for (const name of Object.keys(POLYHEDRA)) {
			const p = createPolyhedron(name)!;
			expect(p.isConvex).toBe(true);
		}
	});

	test('face counts match faceTypeCounts', () => {
		for (const name of Object.keys(POLYHEDRA)) {
			const p = createPolyhedron(name)!;
			const totalFromCounts = Object.values(p.faceTypeCounts).reduce((a, b) => a + b, 0);
			expect(totalFromCounts).toBe(p.faceCount);
		}
	});
});
