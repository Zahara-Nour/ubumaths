/**
 * Geometry Figure Generator Service
 *
 * Programmatic generation of MathGraph32 figures with advanced features:
 * - **Randomization** - Generate unique variations of exercises
 * - **Constraints** - Control geometric properties (triangle type, circle radius, etc.)
 * - **Presets** - Quick generation of common configurations
 * - **Metadata** - Track generated objects and correct answers
 *
 * ## Main Functions
 * - `generateTriangle` - Creates triangles with type constraints
 * - `generateCircle` - Creates circles with various configurations
 * - `generateParallelLines` - Creates parallel line configurations
 * - `generateAngleProblem` - Creates angle measurement/construction problems
 * - `applyRandomization` - Applies random variations to existing figures
 *
 * @module geometry-generator
 * @see {@link GEOMETRY_API_DOCS.md} for complete generator documentation
 *
 * @example Generate a random right triangle
 * ```typescript
 * import { generateTriangle } from '$lib/services/geometry-generator';
 *
 * const figure = await generateTriangle(app, {
 *   type: 'right',
 *   minSideLength: 80,
 *   maxSideLength: 200,
 *   pointLabels: ['A', 'B', 'C']
 * });
 *
 * // Use figure.figureBase64 for storage
 * // Use figure.metadata.measurements for validation
 * ```
 *
 * @example Generate inscribed circle in triangle
 * ```typescript
 * import { generateCircle } from '$lib/services/geometry-generator';
 *
 * const figure = await generateCircle(app, {
 *   type: 'inscribed-triangle',
 *   pointLabels: ['A', 'B', 'C', 'I']
 * });
 *
 * // Triangle ABC with inscribed circle centered at I
 * ```
 */

import type {
	MathGraphApp,
	GeometryExercise,
	RandomizationParams,
	Point2D,
	MathGraphPoint,
	MathGraphLine,
	MathGraphCircle
} from '$lib/types/geometry';
import { MathGraphHelpers } from '$lib/services/mathgraph-api';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

/**
 * Triangle generation constraints
 *
 * Controls the type and properties of generated triangles.
 *
 * @interface TriangleConstraints
 *
 * @example Generate equilateral triangle
 * ```typescript
 * const constraints: TriangleConstraints = {
 *   type: 'equilateral',
 *   fixedSideLength: 150,
 *   pointLabels: ['A', 'B', 'C']
 * };
 * ```
 */
export interface TriangleConstraints {
	/** Type of triangle to generate */
	type?: 'scalene' | 'isosceles' | 'equilateral' | 'right' | 'acute' | 'obtuse';

	/** Minimum side length in pixels */
	minSideLength?: number;

	/** Maximum side length in pixels */
	maxSideLength?: number;

	/** Fixed side length (for isosceles/equilateral) */
	fixedSideLength?: number;

	/** Fixed angle in degrees (for specific constructions) */
	fixedAngle?: number;

	/** Labels for vertices [A, B, C] */
	pointLabels?: [string, string, string];
}

/**
 * Circle generation configuration
 *
 * Defines circle arrangements and relationships.
 *
 * @interface CircleConfiguration
 *
 * @example Generate two intersecting circles
 * ```typescript
 * const config: CircleConfiguration = {
 *   type: 'two-intersecting',
 *   minRadius: 80,
 *   maxRadius: 120,
 *   centerLabels: ['O1', 'O2'],
 *   pointLabels: ['A', 'B'] // Intersection points
 * };
 * ```
 */
export interface CircleConfiguration {
	/** Type of circle configuration */
	type:
		| 'single'
		| 'two-intersecting'
		| 'two-tangent-external'
		| 'two-tangent-internal'
		| 'concentric'
		| 'inscribed-triangle'
		| 'circumscribed-triangle';

	/** Minimum radius in pixels */
	minRadius?: number;

	/** Maximum radius in pixels */
	maxRadius?: number;

	/** Labels for circle centers */
	centerLabels?: string[];

	/** Labels for special points (tangent points, intersections) */
	pointLabels?: string[];
}

/**
 * Transformation problem configuration
 *
 * Defines geometric transformations to demonstrate.
 *
 * @interface TransformationProblem
 */
export interface TransformationProblem {
	/** Type of geometric transformation */
	type: 'translation' | 'rotation' | 'reflection' | 'homothety';

	/** Shape to transform */
	sourceShape: 'point' | 'segment' | 'triangle' | 'quadrilateral';

	/** Whether to include a coordinate grid */
	includeGrid?: boolean;

	/** Whether to show construction lines */
	showConstruction?: boolean;
}

/**
 * Angle problem configuration
 *
 * Defines angle-related exercises.
 *
 * @interface AngleProblem
 */
export interface AngleProblem {
	/** Difficulty level */
	difficulty: 'easy' | 'medium' | 'hard';

	/** Type of angle problem */
	type: 'measure' | 'construct' | 'complementary' | 'supplementary' | 'vertical' | 'parallel-lines';

	/** Target angle value in degrees */
	targetAngle?: number;

	/** Whether to include a protractor */
	includeProtractor?: boolean;
}

/**
 * Result of figure generation
 *
 * Contains the generated figure and metadata for validation.
 *
 * @interface GeneratedFigure
 *
 * @example
 * ```typescript
 * const figure: GeneratedFigure = {
 *   figureBase64: 'base64_encoded_mathgraph32_figure...',
 *   metadata: {
 *     objects: ['A', 'B', 'C', 'triangle_ABC'],
 *     measurements: {
 *       'AB': 120.5,
 *       'BC': 90.3,
 *       'AC': 150.8,
 *       'angle_ABC': 90
 *     },
 *     correctAnswers: {
 *       'distance_AB': 120.5,
 *       'angle_ABC': 90
 *     },
 *     randomizationSeed: '1234567890'
 *   }
 * };
 * ```
 */
export interface GeneratedFigure {
	/** Base64-encoded MathGraph32 figure for storage */
	figureBase64: string;

	/** Metadata about the generated figure */
	metadata: {
		/** List of created object tags */
		objects: string[];

		/** Measured values (distances, angles, areas) */
		measurements: Record<string, number>;

		/** Expected correct answers for validation */
		correctAnswers?: Record<string, number | string>;

		/** Randomization seed for reproducibility */
		randomizationSeed?: string;
	};
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a random number between min and max
 */
function randomRange(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
	return Math.floor(randomRange(min, max + 1));
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
function toDegrees(radians: number): number {
	return (radians * 180) / Math.PI;
}

/**
 * Rotates a point around origin by angle (in radians)
 */
function rotatePoint(point: Point2D, origin: Point2D, angleRad: number): Point2D {
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);
	const dx = point.x - origin.x;
	const dy = point.y - origin.y;

	return {
		x: origin.x + dx * cos - dy * sin,
		y: origin.y + dx * sin + dy * cos
	};
}

/**
 * Calculates distance between two points
 */
function distance(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generates a unique seed from timestamp and random value
 */
function generateSeed(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================================================
// TRIANGLE GENERATION
// ============================================================================

/**
 * Generates a random triangle based on constraints
 */
export async function generateRandomTriangle(
	app: MathGraphApp,
	constraints: TriangleConstraints = {}
): Promise<GeneratedFigure> {
	const {
		type = 'scalene',
		minSideLength = 50,
		maxSideLength = 200,
		fixedSideLength,
		fixedAngle,
		pointLabels = ['A', 'B', 'C']
	} = constraints;

	const metadata: GeneratedFigure['metadata'] = {
		objects: [],
		measurements: {},
		randomizationSeed: generateSeed()
	};

	// Base point A at random position
	const centerX = randomRange(150, 350);
	const centerY = randomRange(150, 350);

	const A: Point2D = { x: centerX, y: centerY };

	// Generate triangle based on type
	let B: Point2D;
	let C: Point2D;

	switch (type) {
		case 'equilateral': {
			const sideLength = fixedSideLength ?? randomRange(minSideLength, maxSideLength);
			B = { x: A.x + sideLength, y: A.y };
			C = rotatePoint(B, A, toRadians(60));
			metadata.measurements['AB'] = sideLength;
			metadata.measurements['BC'] = sideLength;
			metadata.measurements['CA'] = sideLength;
			metadata.measurements['angle_A'] = 60;
			metadata.measurements['angle_B'] = 60;
			metadata.measurements['angle_C'] = 60;
			break;
		}

		case 'isosceles': {
			const baseSide = fixedSideLength ?? randomRange(minSideLength, maxSideLength);
			const apexAngle = fixedAngle ?? randomRange(30, 120);
			const baseAngle = (180 - apexAngle) / 2;

			B = { x: A.x + baseSide, y: A.y };
			const height = (baseSide / 2) * Math.tan(toRadians(baseAngle));
			C = { x: A.x + baseSide / 2, y: A.y + height };

			metadata.measurements['AB'] = baseSide;
			metadata.measurements['AC'] = distance(A, C);
			metadata.measurements['BC'] = distance(B, C);
			metadata.measurements['angle_A'] = baseAngle;
			metadata.measurements['angle_B'] = baseAngle;
			metadata.measurements['angle_C'] = apexAngle;
			break;
		}

		case 'right': {
			const side1 = fixedSideLength ?? randomRange(minSideLength, maxSideLength);
			const side2 = randomRange(minSideLength, maxSideLength);

			B = { x: A.x + side1, y: A.y };
			C = { x: A.x, y: A.y + side2 };

			metadata.measurements['AB'] = side1;
			metadata.measurements['AC'] = side2;
			metadata.measurements['BC'] = distance(B, C);
			metadata.measurements['angle_A'] = 90;
			metadata.measurements['angle_B'] = toDegrees(Math.atan(side2 / side1));
			metadata.measurements['angle_C'] = 90 - metadata.measurements['angle_B'];
			break;
		}

		case 'scalene':
		default: {
			// Generate three different side lengths
			const side1 = randomRange(minSideLength, maxSideLength);
			const side2 = randomRange(minSideLength, maxSideLength);
			const angle = toRadians(randomRange(30, 150));

			B = { x: A.x + side1, y: A.y };
			C = {
				x: A.x + side2 * Math.cos(angle),
				y: A.y + side2 * Math.sin(angle)
			};

			metadata.measurements['AB'] = side1;
			metadata.measurements['AC'] = side2;
			metadata.measurements['BC'] = distance(B, C);

			// Calculate angles using law of cosines
			const a = metadata.measurements['BC'];
			const b = metadata.measurements['AC'];
			const c = metadata.measurements['AB'];

			metadata.measurements['angle_A'] = toDegrees(
				Math.acos((b * b + c * c - a * a) / (2 * b * c))
			);
			metadata.measurements['angle_B'] = toDegrees(
				Math.acos((a * a + c * c - b * b) / (2 * a * c))
			);
			metadata.measurements['angle_C'] =
				180 - metadata.measurements['angle_A'] - metadata.measurements['angle_B'];
			break;
		}
	}

	// Add points to MathGraph32
	await app.addPointXY({
		tag: pointLabels[0],
		name: pointLabels[0],
		x: A.x,
		y: A.y,
		visible: true,
		labelVisible: true
	});

	await app.addPointXY({
		tag: pointLabels[1],
		name: pointLabels[1],
		x: B.x,
		y: B.y,
		visible: true,
		labelVisible: true
	});

	await app.addPointXY({
		tag: pointLabels[2],
		name: pointLabels[2],
		x: C.x,
		y: C.y,
		visible: true,
		labelVisible: true
	});

	// Add segments
	await app.addSegment({
		tag: 'seg_AB',
		tagPoint1: pointLabels[0],
		tagPoint2: pointLabels[1],
		visible: true
	});

	await app.addSegment({
		tag: 'seg_BC',
		tagPoint1: pointLabels[1],
		tagPoint2: pointLabels[2],
		visible: true
	});

	await app.addSegment({
		tag: 'seg_CA',
		tagPoint1: pointLabels[2],
		tagPoint2: pointLabels[0],
		visible: true
	});

	metadata.objects = [...pointLabels, 'seg_AB', 'seg_BC', 'seg_CA'];

	// Get figure as base64
	const figureBase64 = app.getBase64Code
		? app.getBase64Code()
		: app.getFig
			? await app.getFig()
			: '';

	return {
		figureBase64,
		metadata
	};
}

// ============================================================================
// CIRCLE GENERATION
// ============================================================================

/**
 * Generates circle configurations
 */
export async function generateCircleConfiguration(
	app: MathGraphApp,
	config: CircleConfiguration
): Promise<GeneratedFigure> {
	const {
		type,
		minRadius = 30,
		maxRadius = 100,
		centerLabels = ['O', 'O1', 'O2'],
		pointLabels = ['A', 'B', 'C', 'D', 'E', 'F']
	} = config;

	const metadata: GeneratedFigure['metadata'] = {
		objects: [],
		measurements: {},
		randomizationSeed: generateSeed()
	};

	const centerX = randomRange(200, 300);
	const centerY = randomRange(200, 300);

	switch (type) {
		case 'single': {
			const radius = randomRange(minRadius, maxRadius);
			const center: Point2D = { x: centerX, y: centerY };

			// Add center point
			await app.addPointXY({
				tag: centerLabels[0],
				name: centerLabels[0],
				x: center.x,
				y: center.y,
				visible: true,
				labelVisible: true
			});

			// Add point on circle
			await app.addPointXY({
				tag: pointLabels[0],
				name: pointLabels[0],
				x: center.x + radius,
				y: center.y,
				visible: true,
				labelVisible: true
			});

			// Add circle (OFFICIAL API: addCircleOA)
			await app.addCircleOA({
				tag: 'circle1',
				o: centerLabels[0], // Center point
				a: pointLabels[0], // Point on circle (defines radius)
				hidden: false
			});

			metadata.measurements['radius'] = radius;
			metadata.objects = [centerLabels[0], pointLabels[0], 'circle1'];
			break;
		}

		case 'two-intersecting': {
			const radius1 = randomRange(minRadius, maxRadius);
			const radius2 = randomRange(minRadius, maxRadius);
			const distanceBetweenCenters = randomRange(
				Math.abs(radius1 - radius2) + 10,
				radius1 + radius2 - 10
			);

			const center1: Point2D = { x: centerX - distanceBetweenCenters / 2, y: centerY };
			const center2: Point2D = { x: centerX + distanceBetweenCenters / 2, y: centerY };

			// Add centers
			await app.addPointXY({
				tag: centerLabels[0],
				name: centerLabels[0],
				x: center1.x,
				y: center1.y,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: centerLabels[1],
				name: centerLabels[1],
				x: center2.x,
				y: center2.y,
				visible: true,
				labelVisible: true
			});

			// Add points on circles
			await app.addPointXY({
				tag: pointLabels[0],
				name: pointLabels[0],
				x: center1.x + radius1,
				y: center1.y,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: pointLabels[1],
				name: pointLabels[1],
				x: center2.x + radius2,
				y: center2.y,
				visible: true,
				labelVisible: true
			});

			// Add circles
			await app.addCircleOA({
				tag: 'circle1',
				o: centerLabels[0],
				a: pointLabels[0],
				visible: true
			});

			await app.addCircleOA({
				tag: 'circle2',
				o: centerLabels[1],
				a: pointLabels[1],
				visible: true
			});

			metadata.measurements['radius1'] = radius1;
			metadata.measurements['radius2'] = radius2;
			metadata.measurements['distanceBetweenCenters'] = distanceBetweenCenters;
			metadata.objects = [
				centerLabels[0],
				centerLabels[1],
				pointLabels[0],
				pointLabels[1],
				'circle1',
				'circle2'
			];
			break;
		}

		case 'inscribed-triangle': {
			// Generate random triangle first
			const triangleResult = await generateRandomTriangle(app, {
				type: 'scalene',
				minSideLength: 60,
				maxSideLength: 120,
				pointLabels: [pointLabels[0], pointLabels[1], pointLabels[2]]
			});

			// Calculate circumcenter and radius
			const pointA = MathGraphHelpers.findByTag(app, pointLabels[0]) as any;
			const pointB = MathGraphHelpers.findByTag(app, pointLabels[1]) as any;
			const pointC = MathGraphHelpers.findByTag(app, pointLabels[2]) as any;

			const A = { x: pointA?.x ?? 0, y: pointA?.y ?? 0 };
			const B = { x: pointB?.x ?? 0, y: pointB?.y ?? 0 };
			const C = { x: pointC?.x ?? 0, y: pointC?.y ?? 0 };

			// Calculate circumcenter using perpendicular bisectors
			const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
			const ux =
				((A.x * A.x + A.y * A.y) * (B.y - C.y) +
					(B.x * B.x + B.y * B.y) * (C.y - A.y) +
					(C.x * C.x + C.y * C.y) * (A.y - B.y)) /
				D;
			const uy =
				((A.x * A.x + A.y * A.y) * (C.x - B.x) +
					(B.x * B.x + B.y * B.y) * (A.x - C.x) +
					(C.x * C.x + C.y * C.y) * (B.x - A.x)) /
				D;

			const circumcenter: Point2D = { x: ux, y: uy };
			const circumradius = distance(circumcenter, A);

			// Add circumcenter
			await app.addPointXY({
				tag: centerLabels[0],
				name: centerLabels[0],
				x: circumcenter.x,
				y: circumcenter.y,
				visible: true,
				labelVisible: true
			});

			// Add circumcircle
			await app.addCircleOA({
				tag: 'circumcircle',
				o: centerLabels[0],
				a: pointLabels[0],
				visible: true
			});

			metadata.measurements['circumradius'] = circumradius;
			metadata.measurements = { ...metadata.measurements, ...triangleResult.metadata.measurements };
			metadata.objects = [...triangleResult.metadata.objects, centerLabels[0], 'circumcircle'];
			break;
		}

		default: {
			// Single circle as fallback
			return generateCircleConfiguration(app, { ...config, type: 'single' });
		}
	}

	const figureBase64 = app.getBase64Code
		? app.getBase64Code()
		: app.getFig
			? await app.getFig()
			: '';

	return {
		figureBase64,
		metadata
	};
}

// ============================================================================
// TRANSFORMATION GENERATION
// ============================================================================

/**
 * Generates transformation problems
 */
export async function generateTransformationProblem(
	app: MathGraphApp,
	problem: TransformationProblem
): Promise<GeneratedFigure> {
	const { type, sourceShape, includeGrid = true, showConstruction = false } = problem;

	const metadata: GeneratedFigure['metadata'] = {
		objects: [],
		measurements: {},
		randomizationSeed: generateSeed()
	};

	// Generate source shape
	let sourcePoints: Point2D[] = [];
	const pointLabels: string[] = [];

	switch (sourceShape) {
		case 'point': {
			sourcePoints = [{ x: randomRange(100, 200), y: randomRange(100, 200) }];
			pointLabels.push('A');
			break;
		}

		case 'segment': {
			const x1 = randomRange(100, 200);
			const y1 = randomRange(100, 200);
			const length = randomRange(50, 100);
			const angle = toRadians(randomRange(0, 360));

			sourcePoints = [
				{ x: x1, y: y1 },
				{ x: x1 + length * Math.cos(angle), y: y1 + length * Math.sin(angle) }
			];
			pointLabels.push('A', 'B');
			break;
		}

		case 'triangle': {
			const triangleResult = await generateRandomTriangle(app, {
				type: 'scalene',
				minSideLength: 40,
				maxSideLength: 80,
				pointLabels: ['A', 'B', 'C']
			});

			pointLabels.push('A', 'B', 'C');
			metadata.objects.push(...triangleResult.metadata.objects);
			break;
		}
	}

	// Apply transformation
	const transformedPoints: Point2D[] = [];
	const transformedLabels: string[] = [];

	switch (type) {
		case 'translation': {
			const dx = randomRange(100, 150);
			const dy = randomRange(50, 100);

			for (let i = 0; i < sourcePoints.length; i++) {
				transformedPoints.push({
					x: sourcePoints[i].x + dx,
					y: sourcePoints[i].y + dy
				});
				transformedLabels.push(`${pointLabels[i]}'`);
			}

			metadata.measurements['translation_dx'] = dx;
			metadata.measurements['translation_dy'] = dy;

			if (showConstruction) {
				// Add translation vector
				await app.addVector({
					tag: 'translation_vector',
					tagOrigin: pointLabels[0],
					tagEnd: transformedLabels[0],
					visible: true,
					labelVisible: true
				});
			}
			break;
		}

		case 'rotation': {
			const centerX = randomRange(200, 300);
			const centerY = randomRange(200, 300);
			const center: Point2D = { x: centerX, y: centerY };
			const angle = randomRange(30, 150);
			const angleRad = toRadians(angle);

			// Add rotation center
			await app.addPointXY({
				tag: 'O',
				name: 'O',
				x: center.x,
				y: center.y,
				visible: true,
				labelVisible: true,
				color: 'red'
			});

			for (let i = 0; i < sourcePoints.length; i++) {
				transformedPoints.push(rotatePoint(sourcePoints[i], center, angleRad));
				transformedLabels.push(`${pointLabels[i]}'`);
			}

			metadata.measurements['rotation_angle'] = angle;
			metadata.measurements['rotation_center'] = 'O';
			metadata.objects.push('O');
			break;
		}

		case 'reflection': {
			// Generate random reflection line
			const lineX1 = randomRange(150, 250);
			const lineY1 = randomRange(100, 300);
			const lineAngle = toRadians(randomRange(0, 180));
			const lineX2 = lineX1 + 200 * Math.cos(lineAngle);
			const lineY2 = lineY1 + 200 * Math.sin(lineAngle);

			// Add reflection line
			await app.addPointXY({
				tag: 'L1',
				name: 'L1',
				x: lineX1,
				y: lineY1,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: 'L2',
				name: 'L2',
				x: lineX2,
				y: lineY2,
				visible: true,
				labelVisible: true
			});

			await app.addLineAB({
				tag: 'axis',
				tagPoint1: 'L1',
				tagPoint2: 'L2',
				visible: true,
				color: 'blue'
			});

			// Reflect points across line
			for (let i = 0; i < sourcePoints.length; i++) {
				const p = sourcePoints[i];
				// Project point onto line and reflect
				const dx = lineX2 - lineX1;
				const dy = lineY2 - lineY1;
				const lineLengthSq = dx * dx + dy * dy;

				const t = ((p.x - lineX1) * dx + (p.y - lineY1) * dy) / lineLengthSq;
				const projX = lineX1 + t * dx;
				const projY = lineY1 + t * dy;

				transformedPoints.push({
					x: 2 * projX - p.x,
					y: 2 * projY - p.y
				});
				transformedLabels.push(`${pointLabels[i]}'`);
			}

			metadata.objects.push('L1', 'L2', 'axis');
			break;
		}

		case 'homothety': {
			const centerX = randomRange(150, 250);
			const centerY = randomRange(150, 250);
			const center: Point2D = { x: centerX, y: centerY };
			const ratio = randomRange(1.5, 3);

			// Add homothety center
			await app.addPointXY({
				tag: 'O',
				name: 'O',
				x: center.x,
				y: center.y,
				visible: true,
				labelVisible: true,
				color: 'red'
			});

			for (let i = 0; i < sourcePoints.length; i++) {
				const dx = sourcePoints[i].x - center.x;
				const dy = sourcePoints[i].y - center.y;
				transformedPoints.push({
					x: center.x + ratio * dx,
					y: center.y + ratio * dy
				});
				transformedLabels.push(`${pointLabels[i]}'`);
			}

			metadata.measurements['homothety_ratio'] = ratio;
			metadata.measurements['homothety_center'] = 'O';
			metadata.objects.push('O');
			break;
		}
	}

	// Add transformed points and shapes
	for (let i = 0; i < transformedPoints.length; i++) {
		await app.addPointXY({
			tag: transformedLabels[i],
			name: transformedLabels[i],
			x: transformedPoints[i].x,
			y: transformedPoints[i].y,
			visible: true,
			labelVisible: true,
			color: 'green'
		});
		metadata.objects.push(transformedLabels[i]);
	}

	// Connect transformed points if needed
	if (sourceShape === 'segment' && transformedLabels.length === 2) {
		await app.addSegment({
			tag: 'seg_transformed',
			tagPoint1: transformedLabels[0],
			tagPoint2: transformedLabels[1],
			visible: true,
			color: 'green'
		});
		metadata.objects.push('seg_transformed');
	}

	const figureBase64 = app.getBase64Code
		? app.getBase64Code()
		: app.getFig
			? await app.getFig()
			: '';

	return {
		figureBase64,
		metadata
	};
}

// ============================================================================
// ANGLE GENERATION
// ============================================================================

/**
 * Generates angle problems
 */
export async function generateAngleProblem(
	app: MathGraphApp,
	problem: AngleProblem
): Promise<GeneratedFigure> {
	const { difficulty, type, targetAngle, includeProtractor = false } = problem;

	const metadata: GeneratedFigure['metadata'] = {
		objects: [],
		measurements: {},
		randomizationSeed: generateSeed()
	};

	const centerX = 250;
	const centerY = 250;

	switch (type) {
		case 'measure': {
			// Generate random angle to measure
			const angle =
				targetAngle ??
				(difficulty === 'easy'
					? randomInt(0, 180) - (randomInt(0, 180) % 15) // Multiples of 15°
					: difficulty === 'medium'
						? randomInt(0, 180) - (randomInt(0, 180) % 5) // Multiples of 5°
						: randomInt(10, 170)); // Any angle

			const length = 100;

			// Create angle AOB
			await app.addPointXY({
				tag: 'O',
				name: 'O',
				x: centerX,
				y: centerY,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: 'A',
				name: 'A',
				x: centerX + length,
				y: centerY,
				visible: true,
				labelVisible: true
			});

			const angleRad = toRadians(angle);
			await app.addPointXY({
				tag: 'B',
				name: 'B',
				x: centerX + length * Math.cos(angleRad),
				y: centerY + length * Math.sin(angleRad),
				visible: true,
				labelVisible: true
			});

			// Add rays
			await app.addRay({
				tag: 'ray_OA',
				tagOrigin: 'O',
				tagPoint: 'A',
				visible: true
			});

			await app.addRay({
				tag: 'ray_OB',
				tagOrigin: 'O',
				tagPoint: 'B',
				visible: true
			});

			metadata.measurements['angle_AOB'] = angle;
			metadata.correctAnswers = { angle: angle };
			metadata.objects = ['O', 'A', 'B', 'ray_OA', 'ray_OB'];
			break;
		}

		case 'construct': {
			// Student must construct an angle
			const angle =
				targetAngle ?? (difficulty === 'easy' ? randomInt(1, 12) * 15 : randomInt(10, 170));

			// Provide starting ray
			await app.addPointXY({
				tag: 'O',
				name: 'O',
				x: centerX,
				y: centerY,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: 'A',
				name: 'A',
				x: centerX + 100,
				y: centerY,
				visible: true,
				labelVisible: true
			});

			await app.addRay({
				tag: 'ray_OA',
				tagOrigin: 'O',
				tagPoint: 'A',
				visible: true
			});

			metadata.measurements['target_angle'] = angle;
			metadata.correctAnswers = { angle: angle };
			metadata.objects = ['O', 'A', 'ray_OA'];
			break;
		}

		case 'complementary':
		case 'supplementary': {
			// Given one angle, find the complementary/supplementary angle
			const baseAngle =
				difficulty === 'easy'
					? randomInt(1, type === 'complementary' ? 6 : 12) * 15
					: randomInt(10, type === 'complementary' ? 80 : 170);

			const targetSum = type === 'complementary' ? 90 : 180;
			const secondAngle = targetSum - baseAngle;

			// Create first angle
			await app.addPointXY({
				tag: 'O',
				name: 'O',
				x: centerX,
				y: centerY,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: 'A',
				name: 'A',
				x: centerX + 100,
				y: centerY,
				visible: true,
				labelVisible: true
			});

			const angleRad = toRadians(baseAngle);
			await app.addPointXY({
				tag: 'B',
				name: 'B',
				x: centerX + 100 * Math.cos(angleRad),
				y: centerY + 100 * Math.sin(angleRad),
				visible: true,
				labelVisible: true
			});

			await app.addRay({
				tag: 'ray_OA',
				tagOrigin: 'O',
				tagPoint: 'A',
				visible: true
			});

			await app.addRay({
				tag: 'ray_OB',
				tagOrigin: 'O',
				tagPoint: 'B',
				visible: true
			});

			metadata.measurements['given_angle'] = baseAngle;
			metadata.measurements['target_angle'] = secondAngle;
			metadata.correctAnswers = { angle: secondAngle };
			metadata.objects = ['O', 'A', 'B', 'ray_OA', 'ray_OB'];
			break;
		}

		case 'parallel-lines': {
			// Angles formed by parallel lines and transversal
			const transversalAngle = randomInt(10, 80);

			// Create two parallel horizontal lines
			const line1Y = centerY - 50;
			const line2Y = centerY + 50;

			await app.addPointXY({
				tag: 'A1',
				name: 'A1',
				x: centerX - 100,
				y: line1Y,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: 'A2',
				name: 'A2',
				x: centerX + 100,
				y: line1Y,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: 'B1',
				name: 'B1',
				x: centerX - 100,
				y: line2Y,
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: 'B2',
				name: 'B2',
				x: centerX + 100,
				y: line2Y,
				visible: true,
				labelVisible: true
			});

			// Add parallel lines
			await app.addLineAB({
				tag: 'line1',
				tagPoint1: 'A1',
				tagPoint2: 'A2',
				visible: true
			});

			await app.addLineAB({
				tag: 'line2',
				tagPoint1: 'B1',
				tagPoint2: 'B2',
				visible: true
			});

			// Add transversal
			const transLength = 120;
			const angleRad = toRadians(transversalAngle);
			await app.addPointXY({
				tag: 'T1',
				name: 'T1',
				x: centerX - transLength * Math.cos(angleRad),
				y: centerY - 100 - transLength * Math.sin(angleRad),
				visible: true,
				labelVisible: true
			});

			await app.addPointXY({
				tag: 'T2',
				name: 'T2',
				x: centerX + transLength * Math.cos(angleRad),
				y: centerY + 100 + transLength * Math.sin(angleRad),
				visible: true,
				labelVisible: true
			});

			await app.addLineAB({
				tag: 'transversal',
				tagPoint1: 'T1',
				tagPoint2: 'T2',
				visible: true,
				color: 'blue'
			});

			metadata.measurements['transversal_angle'] = transversalAngle;
			metadata.measurements['alternate_interior'] = transversalAngle;
			metadata.measurements['corresponding'] = transversalAngle;
			metadata.measurements['supplementary'] = 180 - transversalAngle;
			metadata.objects = ['A1', 'A2', 'B1', 'B2', 'T1', 'T2', 'line1', 'line2', 'transversal'];
			break;
		}
	}

	const figureBase64 = app.getBase64Code
		? app.getBase64Code()
		: app.getFig
			? await app.getFig()
			: '';

	return {
		figureBase64,
		metadata
	};
}

// ============================================================================
// RANDOMIZATION APPLICATION
// ============================================================================

/**
 * Applies randomization parameters to a figure template
 */
export async function applyRandomization(
	app: MathGraphApp,
	templateFigure: string,
	params: RandomizationParams
): Promise<GeneratedFigure> {
	// Load template figure first
	await app.setFig({ fig: templateFigure });

	const metadata: GeneratedFigure['metadata'] = {
		objects: [],
		measurements: {},
		randomizationSeed: generateSeed()
	};

	// Process each randomization parameter
	for (const [objectTag, paramConfig] of Object.entries(params)) {
		const obj = MathGraphHelpers.findByTag(app, objectTag);

		if (!obj) {
			console.warn(`Object with tag ${objectTag} not found in template`);
			continue;
		}

		// Apply randomization based on object type
		if (obj.type === 'point') {
			const point = obj as MathGraphPoint;

			// Randomize coordinates if specified
			if (typeof paramConfig === 'object' && 'x' in paramConfig && 'y' in paramConfig) {
				const newX = evalRandomExpression(paramConfig.x as string);
				const newY = evalRandomExpression(paramConfig.y as string);

				// Update point position
				point.x = newX;
				point.y = newY;

				metadata.measurements[`${objectTag}_x`] = newX;
				metadata.measurements[`${objectTag}_y`] = newY;
			}
		} else if (obj.type === 'calculation') {
			// Randomize calculation value
			if (typeof paramConfig === 'string') {
				const newValue = evalRandomExpression(paramConfig);
				metadata.measurements[objectTag] = newValue;
			}
		}

		metadata.objects.push(objectTag);
	}

	// Refresh display
	await app.refresh?.();

	const figureBase64 = app.getBase64Code
		? app.getBase64Code()
		: app.getFig
			? await app.getFig()
			: '';

	return {
		figureBase64,
		metadata
	};
}

/**
 * Evaluates a random expression like "random(0, 100)" or "random(30, 150)"
 */
function evalRandomExpression(expr: string): number {
	// Simple parser for "random(min, max)" expressions
	const match = expr.match(/random\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);

	if (match) {
		const min = parseFloat(match[1]);
		const max = parseFloat(match[2]);
		return randomRange(min, max);
	}

	// If not a random expression, try to parse as number
	const num = parseFloat(expr);
	return isNaN(num) ? 0 : num;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GeometryGenerator = {
	generateRandomTriangle,
	generateCircleConfiguration,
	generateTransformationProblem,
	generateAngleProblem,
	applyRandomization
};
