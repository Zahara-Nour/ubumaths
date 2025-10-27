/**
 * Geometry Validator Tests
 * =========================
 *
 * Tests for the geometry validation engine focusing on validation flows and logic.
 *
 * Note: Many validators depend on MathGraph32 (browser-only). These tests focus on
 * high-level validation logic that can be tested in Node environment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MathGraphApp, MathGraphPoint, MathGraphCircle, GeometryExercise } from '$lib/types/geometry';
import {
	validateExercise,
	validatePointIsMidpoint,
	validatePointCoordinates,
	validateCircleRadius,
	validateCircleCenter,
	validateTriangle,
	validateEquilateralTriangle,
	validateIsoscelesTriangle
} from './geometry-validator';

// Mock the MathGraphHelpers module
vi.mock('./mathgraph-api', () => ({
	MathGraphHelpers: {
		findByTag: vi.fn(),
		findPointByName: vi.fn(),
		calculateDistance: vi.fn((p1: {x: number, y: number}, p2: {x: number, y: number}) => {
			const dx = p2.x - p1.x;
			const dy = p2.y - p1.y;
			return Math.sqrt(dx * dx + dy * dy);
		}),
		calculateAngle: vi.fn(),
		pointOnLine: vi.fn(),
		linesParallel: vi.fn(),
		linesPerpendicular: vi.fn()
	}
}));

// Import after mocking
import { MathGraphHelpers } from './mathgraph-api';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockApp(): MathGraphApp {
	return {
		liste: { length: 0 },
		addPointXY: async () => ({}),
		addSegment: async () => ({}),
		addLineAB: async () => ({}),
		addCircleOA: async () => ({}),
		refresh: async () => {}
	} as MathGraphApp;
}

function createMockPoint(tag: string, x: number, y: number, existe: boolean = true): MathGraphPoint {
	return {
		tag,
		nom: tag,
		x,
		y,
		existe,
		type: 'point',
		visible: true
	} as MathGraphPoint;
}

function createMockCircle(tag: string, centreX: number, centreY: number, rayon: number): MathGraphCircle {
	return {
		tag,
		nom: tag,
		centreX,
		centreY,
		rayon,
		existe: true,
		type: 'circle',
		visible: true
	} as MathGraphCircle;
}

// =============================================================================
// MAIN VALIDATION FUNCTION TESTS
// =============================================================================

describe('Main Validation Function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validateExercise', () => {
		it('should validate measurement exercise - angle', async () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue({ valeur: 90, existe: true });

			const exercise: GeometryExercise = {
				id: 'test-1',
				exercise_type: 'measure',
				max_score: 100,
				title: 'Test',
				difficulty_level: 'medium',
				validation_mode: 'automatic',
				validation_config: {
					checkAngle: true,
					angleTag: 'angle_ABC',
					expectedAnswer: 90,
					answerTolerance: 2
				},
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};

			const result = await validateExercise(app, exercise);

			expect(result.isValid).toBe(true);
			expect(result.score).toBe(100);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject measurement with wrong answer', async () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue({ valeur: 45, existe: true });

			const exercise: GeometryExercise = {
				id: 'test-2',
				exercise_type: 'measure',
				max_score: 100,
				title: 'Test',
				difficulty_level: 'medium',
				validation_mode: 'automatic',
				validation_config: {
					checkAngle: true,
					angleTag: 'angle_ABC',
					expectedAnswer: 90,
					answerTolerance: 2
				},
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};

			const result = await validateExercise(app, exercise);

			expect(result.isValid).toBe(false);
			expect(result.score).toBeLessThan(100);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should validate construction exercise with all objects present', async () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('M', 50, 0, true))
				.mockReturnValueOnce({ existe: true });

			const exercise: GeometryExercise = {
				id: 'test-3',
				exercise_type: 'construct',
				max_score: 100,
				title: 'Test',
				difficulty_level: 'medium',
				validation_mode: 'automatic',
				validation_config: {
					requiredObjects: ['point_M', 'line_d']
				},
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};

			const result = await validateExercise(app, exercise);

			expect(result.isValid).toBe(true);
			expect(result.score).toBe(100);
			expect(result.objectsCreated).toContain('point_M');
			expect(result.objectsCreated).toContain('line_d');
		});

		it('should handle missing objects in construction', async () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('M', 50, 0, true))
				.mockReturnValueOnce(null); // line_d is missing

			const exercise: GeometryExercise = {
				id: 'test-4',
				exercise_type: 'construct',
				max_score: 100,
				title: 'Test',
				difficulty_level: 'medium',
				validation_mode: 'automatic',
				validation_config: {
					requiredObjects: ['point_M', 'line_d']
				},
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};

			const result = await validateExercise(app, exercise);

			expect(result.isValid).toBe(false);
			expect(result.score).toBe(50); // 1/2 objects created
			expect(result.objectsMissing).toContain('line_d');
		});

		it('should return success for view/explore exercises', async () => {
			const app = createMockApp();

			const exercise: GeometryExercise = {
				id: 'test-5',
				exercise_type: 'view',
				max_score: 100,
				title: 'Test',
				difficulty_level: 'medium',
				validation_mode: 'automatic',
				validation_config: {},
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};

			const result = await validateExercise(app, exercise);

			expect(result.isValid).toBe(true);
			expect(result.score).toBe(100);
		});

		it('should handle validation errors gracefully', async () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockImplementation(() => {
				throw new Error('Test error');
			});

			const exercise: GeometryExercise = {
				id: 'test-6',
				exercise_type: 'construct',
				max_score: 100,
				title: 'Test',
				difficulty_level: 'medium',
				validation_mode: 'automatic',
				validation_config: {
					requiredObjects: ['point_A']
				},
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};

			const result = await validateExercise(app, exercise);

			expect(result.isValid).toBe(false);
			expect(result.score).toBe(0);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBe('VALIDATION_ERROR');
		});
	});
});

// =============================================================================
// POINT VALIDATOR TESTS
// =============================================================================

describe('Point Validators', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validatePointIsMidpoint', () => {
		it('should return true for exact midpoint', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('M', 50, 0))
				.mockReturnValueOnce(createMockPoint('A', 0, 0))
				.mockReturnValueOnce(createMockPoint('B', 100, 0));

			const result = validatePointIsMidpoint(app, 'M', 'A', 'B');
			expect(result).toBe(true);
		});

		it('should return true for midpoint within tolerance', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('M', 51, 0))
				.mockReturnValueOnce(createMockPoint('A', 0, 0))
				.mockReturnValueOnce(createMockPoint('B', 100, 0));

			const result = validatePointIsMidpoint(app, 'M', 'A', 'B', 2);
			expect(result).toBe(true);
		});

		it('should return false for point outside tolerance', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('M', 70, 0))
				.mockReturnValueOnce(createMockPoint('A', 0, 0))
				.mockReturnValueOnce(createMockPoint('B', 100, 0));

			const result = validatePointIsMidpoint(app, 'M', 'A', 'B', 2);
			expect(result).toBe(false);
		});

		it('should return false when points are null', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(null);

			const result = validatePointIsMidpoint(app, 'M', 'A', 'B');
			expect(result).toBe(false);
		});
	});

	describe('validatePointCoordinates', () => {
		it('should return true for exact coordinates', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(createMockPoint('A', 100, 200));

			const result = validatePointCoordinates(app, 'A', 100, 200);
			expect(result).toBe(true);
		});

		it('should return true for coordinates within tolerance', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(createMockPoint('A', 101, 199));

			const result = validatePointCoordinates(app, 'A', 100, 200, 2);
			expect(result).toBe(true);
		});

		it('should return false for coordinates outside tolerance', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(createMockPoint('A', 110, 190));

			const result = validatePointCoordinates(app, 'A', 100, 200, 2);
			expect(result).toBe(false);
		});

		it('should return false for non-existent point', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(null);

			const result = validatePointCoordinates(app, 'A', 100, 200);
			expect(result).toBe(false);
		});
	});
});

// =============================================================================
// CIRCLE VALIDATOR TESTS
// =============================================================================

describe('Circle Validators', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validateCircleRadius', () => {
		it('should return true for exact radius', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(createMockCircle('c1', 100, 100, 50));

			const result = validateCircleRadius(app, 'c1', 50);
			expect(result).toBe(true);
		});

		it('should return true for radius within tolerance', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(createMockCircle('c1', 100, 100, 51));

			const result = validateCircleRadius(app, 'c1', 50, 2);
			expect(result).toBe(true);
		});

		it('should return false for radius outside tolerance', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(createMockCircle('c1', 100, 100, 60));

			const result = validateCircleRadius(app, 'c1', 50, 2);
			expect(result).toBe(false);
		});

		it('should return false for non-existent circle', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(null);

			const result = validateCircleRadius(app, 'c1', 50);
			expect(result).toBe(false);
		});
	});

	describe('validateCircleCenter', () => {
		it('should return true for correct center', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockCircle('c1', 100, 100, 50))
				.mockReturnValueOnce(createMockPoint('O', 100, 100));

			const result = validateCircleCenter(app, 'c1', 'O');
			expect(result).toBe(true);
		});

		it('should return true for center within tolerance', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockCircle('c1', 100, 100, 50))
				.mockReturnValueOnce(createMockPoint('O', 101, 99));

			const result = validateCircleCenter(app, 'c1', 'O', 2);
			expect(result).toBe(true);
		});

		it('should return false for incorrect center', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockCircle('c1', 100, 100, 50))
				.mockReturnValueOnce(createMockPoint('O', 150, 150));

			const result = validateCircleCenter(app, 'c1', 'O', 2);
			expect(result).toBe(false);
		});
	});
});

// =============================================================================
// TRIANGLE VALIDATOR TESTS
// =============================================================================

describe('Triangle Validators', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validateTriangle', () => {
		it('should return true for valid triangle', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('A', 0, 0))
				.mockReturnValueOnce(createMockPoint('B', 100, 0))
				.mockReturnValueOnce(createMockPoint('C', 50, 86.6));

			const result = validateTriangle(app, 'A', 'B', 'C');
			expect(result).toBe(true);
		});

		it('should return false for collinear points', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('A', 0, 0))
				.mockReturnValueOnce(createMockPoint('B', 50, 0))
				.mockReturnValueOnce(createMockPoint('C', 100, 0));

			const result = validateTriangle(app, 'A', 'B', 'C');
			expect(result).toBe(false);
		});

		it('should return false when points are null', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag).mockReturnValue(null);

			const result = validateTriangle(app, 'A', 'B', 'C');
			expect(result).toBe(false);
		});
	});

	describe('validateEquilateralTriangle', () => {
		it('should return true for equilateral triangle', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('A', 0, 0))
				.mockReturnValueOnce(createMockPoint('B', 100, 0))
				.mockReturnValueOnce(createMockPoint('C', 50, 86.6));

			const result = validateEquilateralTriangle(app, 'A', 'B', 'C', 3);
			expect(result).toBe(true);
		});

		it('should return false for non-equilateral triangle', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('A', 0, 0))
				.mockReturnValueOnce(createMockPoint('B', 100, 0))
				.mockReturnValueOnce(createMockPoint('C', 0, 100));

			const result = validateEquilateralTriangle(app, 'A', 'B', 'C', 2);
			expect(result).toBe(false);
		});
	});

	describe('validateIsoscelesTriangle', () => {
		it('should return true for isosceles triangle', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('A', 50, 0))
				.mockReturnValueOnce(createMockPoint('B', 0, 100))
				.mockReturnValueOnce(createMockPoint('C', 100, 100));

			const result = validateIsoscelesTriangle(app, 'A', 'B', 'C', 2);
			expect(result).toBe(true);
		});

		it('should return false for scalene triangle', () => {
			const app = createMockApp();
			vi.mocked(MathGraphHelpers.findByTag)
				.mockReturnValueOnce(createMockPoint('A', 0, 0))
				.mockReturnValueOnce(createMockPoint('B', 100, 0))
				.mockReturnValueOnce(createMockPoint('C', 50, 120));

			// Mock calculateDistance to return different values for each side
			vi.mocked(MathGraphHelpers.calculateDistance)
				.mockReturnValueOnce(100)  // AB
				.mockReturnValueOnce(130)  // AC
				.mockReturnValueOnce(110); // BC

			const result = validateIsoscelesTriangle(app, 'A', 'B', 'C', 2);
			expect(result).toBe(false);
		});
	});
});
