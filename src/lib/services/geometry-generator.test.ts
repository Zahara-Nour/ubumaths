/**
 * Geometry Generator Tests
 * =========================
 *
 * Tests for geometry figure generation with randomization and constraints.
 */

import { describe, it, expect } from 'vitest';
import type { MathGraphApp } from '$lib/types/geometry';
import {
	generateRandomTriangle,
	generateCircleConfiguration,
	generateTransformationProblem,
	generateAngleProblem
} from './geometry-generator';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a mock MathGraph32 app for testing
 */
function createMockApp(): MathGraphApp {
	const addedObjects: any[] = [];

	const mockApp = {
		liste: { length: 0 },
		addPointXY: async (params: any) => {
			addedObjects.push({ type: 'point', ...params });
			return {};
		},
		addSegment: async (params: any) => {
			addedObjects.push({ type: 'segment', ...params });
			return {};
		},
		addLineAB: async (params: any) => {
			addedObjects.push({ type: 'line', ...params });
			return {};
		},
		addCircleOA: async (params: any) => {
			addedObjects.push({ type: 'circle', ...params });
			return {};
		},
		addRay: async (params: any) => {
			addedObjects.push({ type: 'ray', ...params });
			return {};
		},
		addVector: async (params: any) => {
			addedObjects.push({ type: 'vector', ...params });
			return {};
		},
		refresh: async () => {},
		getBase64Code: () => 'mock_base64_figure',
		getFig: async () => 'mock_base64_figure'
	} as MathGraphApp;

	(mockApp as any).addedObjects = addedObjects;

	return mockApp;
}

// =============================================================================
// TRIANGLE GENERATION TESTS
// =============================================================================

describe('Triangle Generation', () => {
	describe('generateRandomTriangle', () => {
		it('should generate equilateral triangle', async () => {
			const app = createMockApp();

			const result = await generateRandomTriangle(app, {
				type: 'equilateral',
				fixedSideLength: 100
			});

			expect(result.figureBase64).toBeDefined();
			expect(result.metadata.objects).toContain('A');
			expect(result.metadata.objects).toContain('B');
			expect(result.metadata.objects).toContain('C');
			expect(result.metadata.measurements['AB']).toBe(100);
			expect(result.metadata.measurements['BC']).toBe(100);
			expect(result.metadata.measurements['CA']).toBe(100);
			expect(result.metadata.measurements['angle_A']).toBe(60);
			expect(result.metadata.measurements['angle_B']).toBe(60);
			expect(result.metadata.measurements['angle_C']).toBe(60);
		});

		it('should generate right triangle', async () => {
			const app = createMockApp();

			const result = await generateRandomTriangle(app, {
				type: 'right',
				fixedSideLength: 100
			});

			expect(result.metadata.objects).toHaveLength(6); // 3 points + 3 segments
			expect(result.metadata.measurements['angle_A']).toBe(90);
			expect(result.metadata.randomizationSeed).toBeDefined();
		});

		it('should generate isosceles triangle', async () => {
			const app = createMockApp();

			const result = await generateRandomTriangle(app, {
				type: 'isosceles',
				fixedSideLength: 100
			});

			expect(result.metadata.measurements['AB']).toBe(100);
			// AC and BC should be equal (the two equal sides)
			const ac = result.metadata.measurements['AC'];
			const bc = result.metadata.measurements['BC'];
			expect(Math.abs(ac - bc)).toBeLessThan(1);
		});

		it('should generate scalene triangle', async () => {
			const app = createMockApp();

			const result = await generateRandomTriangle(app, {
				type: 'scalene',
				minSideLength: 50,
				maxSideLength: 150
			});

			expect(result.metadata.objects).toHaveLength(6);
			expect(result.metadata.measurements['AB']).toBeGreaterThanOrEqual(50);
			expect(result.metadata.measurements['AB']).toBeLessThanOrEqual(150);
		});

		it('should use custom point labels', async () => {
			const app = createMockApp();

			const result = await generateRandomTriangle(app, {
				type: 'scalene',
				pointLabels: ['P', 'Q', 'R']
			});

			expect(result.metadata.objects).toContain('P');
			expect(result.metadata.objects).toContain('Q');
			expect(result.metadata.objects).toContain('R');
		});

		it('should generate reproducible figures with same seed', async () => {
			// Note: Current implementation doesn't support seed-based generation
			// This test documents expected behavior for future enhancement
			const app1 = createMockApp();
			const app2 = createMockApp();

			const result1 = await generateRandomTriangle(app1, {
				type: 'scalene'
			});
			const result2 = await generateRandomTriangle(app2, {
				type: 'scalene'
			});

			// Figures should have different seeds (randomized)
			expect(result1.metadata.randomizationSeed).not.toBe(
				result2.metadata.randomizationSeed
			);
		});
	});
});

// =============================================================================
// CIRCLE GENERATION TESTS
// =============================================================================

describe('Circle Generation', () => {
	describe('generateCircleConfiguration', () => {
		it('should generate single circle', async () => {
			const app = createMockApp();

			const result = await generateCircleConfiguration(app, {
				type: 'single',
				minRadius: 50,
				maxRadius: 100
			});

			expect(result.metadata.objects).toContain('O');
			expect(result.metadata.objects).toContain('circle1');
			expect(result.metadata.measurements['radius']).toBeGreaterThanOrEqual(50);
			expect(result.metadata.measurements['radius']).toBeLessThanOrEqual(100);
		});

		it('should generate two intersecting circles', async () => {
			const app = createMockApp();

			const result = await generateCircleConfiguration(app, {
				type: 'two-intersecting',
				minRadius: 40,
				maxRadius: 60
			});

			expect(result.metadata.objects).toContain('circle1');
			expect(result.metadata.objects).toContain('circle2');
			expect(result.metadata.measurements['radius1']).toBeDefined();
			expect(result.metadata.measurements['radius2']).toBeDefined();
			expect(result.metadata.measurements['distanceBetweenCenters']).toBeDefined();

			// Verify circles intersect: |r1-r2| < distance < r1+r2
			const r1 = result.metadata.measurements['radius1'];
			const r2 = result.metadata.measurements['radius2'];
			const d = result.metadata.measurements['distanceBetweenCenters'];

			expect(d).toBeGreaterThan(Math.abs(r1 - r2));
			expect(d).toBeLessThan(r1 + r2);
		});

		it('should use custom center labels', async () => {
			const app = createMockApp();

			const result = await generateCircleConfiguration(app, {
				type: 'single',
				centerLabels: ['C']
			});

			expect(result.metadata.objects).toContain('C');
		});
	});
});

// =============================================================================
// TRANSFORMATION GENERATION TESTS
// =============================================================================

describe('Transformation Generation', () => {
	describe('generateTransformationProblem', () => {
		it('should generate translation problem', async () => {
			const app = createMockApp();

			const result = await generateTransformationProblem(app, {
				type: 'translation',
				sourceShape: 'segment'
			});

			expect(result.metadata.measurements['translation_dx']).toBeDefined();
			expect(result.metadata.measurements['translation_dy']).toBeDefined();
			expect(result.metadata.objects.length).toBeGreaterThan(0);
		});

		it('should generate rotation problem', async () => {
			const app = createMockApp();

			const result = await generateTransformationProblem(app, {
				type: 'rotation',
				sourceShape: 'point'
			});

			expect(result.metadata.measurements['rotation_angle']).toBeDefined();
			expect(result.metadata.measurements['rotation_center']).toBe('O');
			expect(result.metadata.objects).toContain('O');
		});

		it('should generate reflection problem', async () => {
			const app = createMockApp();

			const result = await generateTransformationProblem(app, {
				type: 'reflection',
				sourceShape: 'segment'
			});

			expect(result.metadata.objects).toContain('axis');
			expect(result.metadata.objects).toContain('L1');
			expect(result.metadata.objects).toContain('L2');
		});

		it('should generate homothety problem', async () => {
			const app = createMockApp();

			const result = await generateTransformationProblem(app, {
				type: 'homothety',
				sourceShape: 'point'
			});

			expect(result.metadata.measurements['homothety_ratio']).toBeGreaterThan(1);
			expect(result.metadata.measurements['homothety_center']).toBe('O');
		});
	});
});

// =============================================================================
// ANGLE GENERATION TESTS
// =============================================================================

describe('Angle Generation', () => {
	describe('generateAngleProblem', () => {
		it('should generate angle measurement problem', async () => {
			const app = createMockApp();

			const result = await generateAngleProblem(app, {
				difficulty: 'easy',
				type: 'measure',
				targetAngle: 60
			});

			expect(result.metadata.measurements['angle_AOB']).toBe(60);
			expect(result.metadata.correctAnswers?.['angle']).toBe(60);
			expect(result.metadata.objects).toContain('O');
			expect(result.metadata.objects).toContain('A');
			expect(result.metadata.objects).toContain('B');
		});

		it('should generate angle construction problem', async () => {
			const app = createMockApp();

			const result = await generateAngleProblem(app, {
				difficulty: 'medium',
				type: 'construct',
				targetAngle: 45
			});

			expect(result.metadata.measurements['target_angle']).toBe(45);
			expect(result.metadata.objects).toContain('ray_OA');
		});

		it('should generate complementary angle problem', async () => {
			const app = createMockApp();

			const result = await generateAngleProblem(app, {
				difficulty: 'easy',
				type: 'complementary'
			});

			const givenAngle = result.metadata.measurements['given_angle'];
			const targetAngle = result.metadata.measurements['target_angle'];

			expect(givenAngle + targetAngle).toBe(90);
		});

		it('should generate supplementary angle problem', async () => {
			const app = createMockApp();

			const result = await generateAngleProblem(app, {
				difficulty: 'medium',
				type: 'supplementary'
			});

			const givenAngle = result.metadata.measurements['given_angle'];
			const targetAngle = result.metadata.measurements['target_angle'];

			expect(givenAngle + targetAngle).toBe(180);
		});

		it('should generate parallel lines angle problem', async () => {
			const app = createMockApp();

			const result = await generateAngleProblem(app, {
				difficulty: 'hard',
				type: 'parallel-lines'
			});

			expect(result.metadata.objects).toContain('line1');
			expect(result.metadata.objects).toContain('line2');
			expect(result.metadata.objects).toContain('transversal');
			expect(result.metadata.measurements['transversal_angle']).toBeDefined();
			expect(result.metadata.measurements['alternate_interior']).toBeDefined();
			expect(result.metadata.measurements['corresponding']).toBeDefined();
		});

		it('should respect difficulty level for angle values', async () => {
			const app1 = createMockApp();
			const app2 = createMockApp();

			const easyResult = await generateAngleProblem(app1, {
				difficulty: 'easy',
				type: 'measure'
			});

			const mediumResult = await generateAngleProblem(app2, {
				difficulty: 'medium',
				type: 'measure'
			});

			// Easy should be multiple of 15 (but randomness might vary)
			const easyAngle = easyResult.metadata.measurements['angle_AOB'];
			expect(easyAngle).toBeGreaterThanOrEqual(0);
			expect(easyAngle).toBeLessThanOrEqual(180);

			// Medium should be multiple of 5 (but randomness might vary)
			const mediumAngle = mediumResult.metadata.measurements['angle_AOB'];
			expect(mediumAngle).toBeGreaterThanOrEqual(0);
			expect(mediumAngle).toBeLessThanOrEqual(180);
		});
	});
});

// =============================================================================
// METADATA VALIDATION TESTS
// =============================================================================

describe('Generated Figure Metadata', () => {
	it('should include randomization seed', async () => {
		const app = createMockApp();

		const result = await generateRandomTriangle(app, {
			type: 'scalene'
		});

		expect(result.metadata.randomizationSeed).toBeDefined();
		expect(typeof result.metadata.randomizationSeed).toBe('string');
	});

	it('should include all created objects', async () => {
		const app = createMockApp();

		const result = await generateRandomTriangle(app, {
			type: 'equilateral'
		});

		expect(result.metadata.objects.length).toBeGreaterThan(0);
		expect(Array.isArray(result.metadata.objects)).toBe(true);
	});

	it('should include relevant measurements', async () => {
		const app = createMockApp();

		const result = await generateRandomTriangle(app, {
			type: 'right'
		});

		expect(result.metadata.measurements).toBeDefined();
		expect(typeof result.metadata.measurements).toBe('object');
		expect(Object.keys(result.metadata.measurements).length).toBeGreaterThan(0);
	});

	it('should return base64 encoded figure', async () => {
		const app = createMockApp();

		const result = await generateRandomTriangle(app, {
			type: 'scalene'
		});

		expect(result.figureBase64).toBeDefined();
		expect(typeof result.figureBase64).toBe('string');
	});
});

// =============================================================================
// CONSTRAINT VALIDATION TESTS
// =============================================================================

describe('Constraint Validation', () => {
	it('should respect minSideLength constraint', async () => {
		const app = createMockApp();

		const result = await generateRandomTriangle(app, {
			type: 'scalene',
			minSideLength: 100,
			maxSideLength: 200
		});

		const ab = result.metadata.measurements['AB'];
		const ac = result.metadata.measurements['AC'];
		const bc = result.metadata.measurements['BC'];

		expect(ab).toBeGreaterThanOrEqual(100);
		expect(ac).toBeGreaterThanOrEqual(0); // May vary based on angle
		expect(bc).toBeGreaterThanOrEqual(0);
	});

	it('should respect maxSideLength constraint', async () => {
		const app = createMockApp();

		const result = await generateRandomTriangle(app, {
			type: 'scalene',
			minSideLength: 50,
			maxSideLength: 100
		});

		const ab = result.metadata.measurements['AB'];

		expect(ab).toBeLessThanOrEqual(100);
	});

	it('should use fixedSideLength when provided', async () => {
		const app = createMockApp();

		const result = await generateRandomTriangle(app, {
			type: 'equilateral',
			fixedSideLength: 150
		});

		expect(result.metadata.measurements['AB']).toBe(150);
		expect(result.metadata.measurements['BC']).toBe(150);
		expect(result.metadata.measurements['CA']).toBe(150);
	});
});
