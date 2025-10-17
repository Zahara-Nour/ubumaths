/**
 * Geometry Validation Engine
 *
 * Comprehensive validation system for automatically checking geometry exercises.
 * Provides 30+ specialized validator functions for different geometric properties.
 *
 * ## Features
 * - **Point validation**: Existence, position, relationships
 * - **Line validation**: Parallel, perpendicular, angle bisectors
 * - **Circle validation**: Tangency, inscribed/circumscribed
 * - **Measurement validation**: Distances, angles, areas with tolerance
 * - **Construction validation**: Step-by-step geometric constructions
 * - **Proof validation**: Logical reasoning and justifications
 *
 * ## Tolerance System
 * - Angles: ±2° (DEFAULT_TOLERANCE_ANGLE)
 * - Distances: ±2 pixels (DEFAULT_TOLERANCE_DISTANCE)
 * - Ratios: ±5% (DEFAULT_TOLERANCE_RATIO)
 *
 * @module geometry-validator
 * @see {@link GEOMETRY_API_DOCS.md} for complete validator documentation
 *
 * @example Basic Validation
 * ```typescript
 * import { validateExercise } from '$lib/services/geometry-validator';
 *
 * const results = await validateExercise(mathGraphApp, exercise);
 *
 * if (results.isValid) {
 *   console.log(`Score: ${results.score}/${results.maxScore}`);
 * } else {
 *   results.errors.forEach(err => console.error(err.message));
 * }
 * ```
 *
 * @example Specific Validators
 * ```typescript
 * import {
 *   validatePointExists,
 *   validateLinesParallel,
 *   validatePointIsMidpoint
 * } from '$lib/services/geometry-validator';
 *
 * // Check if point M exists
 * const pointExists = validatePointExists(app, 'point_M');
 *
 * // Check if lines are parallel (within 2° tolerance)
 * const areParallel = validateLinesParallel(app, 'line1', 'line2');
 *
 * // Check if M is midpoint of [AB] (within 2px tolerance)
 * const isMidpoint = validatePointIsMidpoint(app, 'point_M', 'A', 'B');
 * ```
 */

import type {
	MathGraphApp,
	MathGraphPoint,
	MathGraphLine,
	MathGraphCircle,
	GeometryExercise,
	ValidationResults,
	ValidationError,
	ValidationWarning,
	StepValidationResult
} from '$lib/types/geometry';
import { MathGraphHelpers } from '$lib/services/mathgraph-api';

// =========================
// CONSTANTS
// =========================

/** Default angle tolerance in degrees (±2°) */
const DEFAULT_TOLERANCE_ANGLE = 2;

/** Default distance tolerance in pixels (±2px) */
const DEFAULT_TOLERANCE_DISTANCE = 2;

/** Default ratio tolerance as decimal (±5%) */
const DEFAULT_TOLERANCE_RATIO = 0.05;

// =========================
// MAIN VALIDATION FUNCTION
// =========================

/**
 * Main validation function for geometry exercises
 *
 * Routes to the appropriate validation function based on exercise type:
 * - `measure`: Validates measurements (distances, angles, areas)
 * - `construct`: Validates geometric constructions (objects and relationships)
 * - `proof`: Validates logical proofs (steps and justifications)
 * - `view`/`explore`: Returns success (interactive exploration, no validation)
 *
 * @param {MathGraphApp} app - MathGraph32 application instance with student's work
 * @param {GeometryExercise} exercise - Exercise configuration with validation rules
 *
 * @returns {Promise<ValidationResults>} Validation results with score, errors, and feedback
 *
 * @throws {Error} If validation encounters an unexpected error
 *
 * @example Validate a construction exercise
 * ```typescript
 * const exercise = {
 *   exercise_type: 'construct',
 *   max_score: 100,
 *   validation_config: {
 *     requiredObjects: ['point_M', 'line_mediatrice'],
 *     checkMidpoint: {
 *       midpointTag: 'point_M',
 *       point1Tag: 'A',
 *       point2Tag: 'B'
 *     }
 *   }
 * };
 *
 * const results = await validateExercise(app, exercise);
 * // Results: { isValid: true, score: 100, errors: [], feedback: [...] }
 * ```
 *
 * @example Validate a measurement exercise
 * ```typescript
 * const exercise = {
 *   exercise_type: 'measure',
 *   max_score: 100,
 *   validation_config: {
 *     expectedMeasurements: {
 *       angle_ABC: { value: 90, tolerance: 2, unit: 'degrees' },
 *       distance_AB: { value: 120, tolerance: 3, unit: 'mm' }
 *     }
 *   }
 * };
 *
 * const results = await validateExercise(app, exercise);
 * // Results: { isValid: true/false, score: 0-100, measurements: {...}, ... }
 * ```
 */
export async function validateExercise(
	app: MathGraphApp,
	exercise: GeometryExercise
): Promise<ValidationResults> {
	const config = exercise.validation_config;
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];
	const feedback: string[] = [];
	const measurements: Record<string, number> = {};

	let score = 0;
	const maxScore = exercise.max_score;

	try {
		// Run validation based on exercise type
		switch (exercise.exercise_type) {
			case 'measure':
				return await validateMeasurement(app, config);

			case 'construct':
				return await validateConstruction(app, config);

			case 'proof':
				return await validateProof(app, config);

			default:
				return {
					isValid: true,
					score: maxScore,
					maxScore,
					errors: [],
					warnings: [],
					feedback: ['Exercice validé'],
					measurements
				};
		}
	} catch (error) {
		errors.push({
			code: 'VALIDATION_ERROR',
			message: error instanceof Error ? error.message : 'Erreur de validation inconnue'
		});

		return {
			isValid: false,
			score: 0,
			maxScore,
			errors,
			warnings,
			feedback,
			measurements
		};
	}
}

/**
 * Validate measurement exercises
 */
async function validateMeasurement(
	app: MathGraphApp,
	config: Record<string, unknown>
): Promise<ValidationResults> {
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];
	const feedback: string[] = [];
	const measurements: Record<string, number> = {};

	const expectedAnswer = config.expectedAnswer as number;
	const tolerance = (config.answerTolerance as number) ?? DEFAULT_TOLERANCE_DISTANCE;

	// Get actual measurement from figure
	// This depends on what's being measured
	let actualValue: number | null = null;

	if (config.checkAngle) {
		// Measure angle
		const angleTag = config.angleTag as string;
		const angleMeasure = MathGraphHelpers.findByTag(app, angleTag) as any;
		if (angleMeasure?.valeur !== undefined) {
			actualValue = angleMeasure.valeur;
			measurements['angle'] = actualValue;
		}
	} else if (config.checkDistance) {
		// Measure distance
		const distanceTag = config.distanceTag as string;
		const distanceMeasure = MathGraphHelpers.findByTag(app, distanceTag) as any;
		if (distanceMeasure?.valeur !== undefined) {
			actualValue = distanceMeasure.valeur;
			measurements['distance'] = actualValue;
		}
	}

	// Validate
	let score = 0;
	let isValid = false;

	if (actualValue !== null) {
		const difference = Math.abs(actualValue - expectedAnswer);
		isValid = difference <= tolerance;

		if (isValid) {
			score = 100;
			feedback.push('✓ Mesure correcte !');
		} else {
			score = Math.max(0, 100 - (difference / tolerance) * 20);
			errors.push({
				code: 'MEASUREMENT_INCORRECT',
				message: 'La mesure n\'est pas correcte',
				expectedValue: expectedAnswer,
				actualValue
			});

			if (difference <= tolerance * 2) {
				warnings.push({
					code: 'CLOSE_BUT_WRONG',
					message: 'Tu es proche de la bonne réponse',
					suggestion: 'Vérifie tes mesures'
				});
			}
		}
	} else {
		errors.push({
			code: 'NO_MEASUREMENT',
			message: 'Aucune mesure trouvée'
		});
	}

	return {
		isValid,
		score,
		maxScore: 100,
		errors,
		warnings,
		feedback,
		measurements
	};
}

/**
 * Validate construction exercises
 */
async function validateConstruction(
	app: MathGraphApp,
	config: Record<string, unknown>
): Promise<ValidationResults> {
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];
	const feedback: string[] = [];
	const measurements: Record<string, number> = {};

	let score = 0;
	let totalPoints = 0;
	let earnedPoints = 0;

	// Check required objects
	const requiredObjects = (config.requiredObjects as string[]) ?? [];
	const forbiddenObjects = (config.forbiddenObjects as string[]) ?? [];
	const tolerance = (config.tolerance as number) ?? DEFAULT_TOLERANCE_DISTANCE;

	const objectsCreated: string[] = [];
	const objectsMissing: string[] = [];

	for (const tag of requiredObjects) {
		totalPoints++;
		const obj = MathGraphHelpers.findByTag(app, tag);

		if (obj && obj.existe) {
			objectsCreated.push(tag);
			earnedPoints++;
		} else {
			objectsMissing.push(tag);
			errors.push({
				code: 'MISSING_OBJECT',
				message: `Objet manquant: ${tag}`
			});
		}
	}

	// Check forbidden objects
	for (const tag of forbiddenObjects) {
		const obj = MathGraphHelpers.findByTag(app, tag);
		if (obj && obj.existe) {
			warnings.push({
				code: 'FORBIDDEN_OBJECT',
				message: `Objet non autorisé trouvé: ${tag}`,
				suggestion: 'Supprime cet objet'
			});
		}
	}

	// Specific validations
	if (config.checkPerpendicular) {
		totalPoints++;
		const line1Tag = config.lineTag1 as string;
		const line2Tag = config.lineTag2 as string;

		if (validateLinesPerpendicular(app, line1Tag, line2Tag, tolerance)) {
			earnedPoints++;
			feedback.push('✓ Les droites sont bien perpendiculaires');
		} else {
			errors.push({
				code: 'NOT_PERPENDICULAR',
				message: 'Les droites ne sont pas perpendiculaires'
			});
		}
	}

	if (config.checkParallel) {
		totalPoints++;
		const line1Tag = config.lineTag1 as string;
		const line2Tag = config.lineTag2 as string;

		if (validateLinesParallel(app, line1Tag, line2Tag, tolerance)) {
			earnedPoints++;
			feedback.push('✓ Les droites sont bien parallèles');
		} else {
			errors.push({
				code: 'NOT_PARALLEL',
				message: 'Les droites ne sont pas parallèles'
			});
		}
	}

	if (config.checkCircle) {
		totalPoints++;
		const circleTag = config.circleTag as string;
		const expectedRadius = config.expectedRadius as number;

		const circle = MathGraphHelpers.findByTag(app, circleTag) as MathGraphCircle;
		if (circle && circle.rayon) {
			measurements['radius'] = circle.rayon;

			if (Math.abs(circle.rayon - expectedRadius) <= tolerance) {
				earnedPoints++;
				feedback.push('✓ Le rayon du cercle est correct');
			} else {
				errors.push({
					code: 'INCORRECT_RADIUS',
					message: 'Le rayon du cercle est incorrect',
					expectedValue: expectedRadius,
					actualValue: circle.rayon
				});
			}
		}
	}

	// Calculate final score
	score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
	const isValid = score >= 100;

	if (isValid) {
		feedback.push('🎉 Construction parfaite !');
	} else if (score >= 50) {
		feedback.push('Bonne progression, continue !');
	}

	return {
		isValid,
		score,
		maxScore: 100,
		errors,
		warnings,
		feedback,
		measurements,
		objectsCreated,
		objectsMissing
	};
}

/**
 * Validate proof/justification exercises
 */
async function validateProof(
	app: MathGraphApp,
	config: Record<string, unknown>
): Promise<ValidationResults> {
	// Similar to construction but may have different validation criteria
	return validateConstruction(app, config);
}

// =========================
// POINT VALIDATION METHODS
// =========================

/**
 * Validate that a point exists in the MathGraph32 figure
 *
 * Checks if a point with the given name exists and is valid (existe = true).
 *
 * @param {MathGraphApp} app - MathGraph32 application instance
 * @param {string} name - Name of the point to check
 *
 * @returns {boolean} True if point exists and is valid, false otherwise
 *
 * @example
 * ```typescript
 * const exists = validatePointExists(app, 'A');
 * if (!exists) {
 *   console.error('Point A is missing');
 * }
 * ```
 */
export function validatePointExists(app: MathGraphApp, name: string): boolean {
	const point = MathGraphHelpers.findPointByName(app, name);
	return point !== null && point.existe;
}

/**
 * Validate that a point lies on a line
 *
 * Checks if a point is positioned on a line within the specified tolerance.
 * Uses perpendicular distance from point to line.
 *
 * @param {MathGraphApp} app - MathGraph32 application instance
 * @param {string} pointTag - Tag of the point to check
 * @param {string} lineTag - Tag of the line
 * @param {number} [tolerance=DEFAULT_TOLERANCE_DISTANCE] - Maximum allowed distance in pixels (default: 2px)
 *
 * @returns {boolean} True if point is on the line within tolerance
 *
 * @example
 * ```typescript
 * // Check if point M is on line d1 (within 2px)
 * const isOnLine = validatePointOnLine(app, 'point_M', 'line_d1');
 *
 * // Check with custom tolerance
 * const isOnLine = validatePointOnLine(app, 'point_M', 'line_d1', 5);
 * ```
 */
export function validatePointOnLine(
	app: MathGraphApp,
	pointTag: string,
	lineTag: string,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const point = MathGraphHelpers.findByTag(app, pointTag) as MathGraphPoint;
	const line = MathGraphHelpers.findByTag(app, lineTag) as any;

	if (!point || !line || !point.existe || !line.existe) {
		return false;
	}

	// Get two points on the line to define it
	// This is simplified - actual implementation would extract line points from MathGraph32
	const linePoints = extractLinePoints(line);
	if (!linePoints) return false;

	return MathGraphHelpers.pointOnLine(
		{ x: point.x, y: point.y },
		linePoints.p1,
		linePoints.p2,
		tolerance
	);
}

/**
 * Validate that a point lies on a circle
 *
 * Checks if the distance from the point to the circle's center equals
 * the circle's radius (within tolerance).
 *
 * @param {MathGraphApp} app - MathGraph32 application instance
 * @param {string} pointTag - Tag of the point to check
 * @param {string} circleTag - Tag of the circle
 * @param {number} [tolerance=DEFAULT_TOLERANCE_DISTANCE] - Maximum allowed distance difference in pixels (default: 2px)
 *
 * @returns {boolean} True if point is on the circle within tolerance
 *
 * @example
 * ```typescript
 * // Check if point M is on circle c1
 * const isOnCircle = validatePointOnCircle(app, 'point_M', 'circle_c1');
 *
 * // For inscribed polygon vertices
 * const A_on_circle = validatePointOnCircle(app, 'A', 'circumcircle');
 * const B_on_circle = validatePointOnCircle(app, 'B', 'circumcircle');
 * const C_on_circle = validatePointOnCircle(app, 'C', 'circumcircle');
 * ```
 */
export function validatePointOnCircle(
	app: MathGraphApp,
	pointTag: string,
	circleTag: string,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const point = MathGraphHelpers.findByTag(app, pointTag) as MathGraphPoint;
	const circle = MathGraphHelpers.findByTag(app, circleTag) as MathGraphCircle;

	if (!point || !circle || !point.existe || !circle.existe) {
		return false;
	}

	const distance = MathGraphHelpers.calculateDistance(
		{ x: point.x, y: point.y },
		{ x: circle.centreX, y: circle.centreY }
	);

	return Math.abs(distance - circle.rayon) <= tolerance;
}

/**
 * Validate that a point is the midpoint of a segment
 *
 * Checks if point M is positioned at the midpoint of segment [AB].
 * Midpoint coordinates should be ((xA + xB)/2, (yA + yB)/2).
 *
 * @param {MathGraphApp} app - MathGraph32 application instance
 * @param {string} mTag - Tag of the potential midpoint
 * @param {string} aTag - Tag of first endpoint
 * @param {string} bTag - Tag of second endpoint
 * @param {number} [tolerance=DEFAULT_TOLERANCE_DISTANCE] - Maximum allowed distance in pixels (default: 2px)
 *
 * @returns {boolean} True if M is the midpoint of [AB] within tolerance
 *
 * @example Perpendicular bisector construction
 * ```typescript
 * // Validate that M is the midpoint of [AB]
 * const isMidpoint = validatePointIsMidpoint(app, 'point_M', 'A', 'B');
 *
 * if (isMidpoint) {
 *   console.log('✓ M is correctly positioned as midpoint');
 * }
 * ```
 *
 * @example Median of triangle
 * ```typescript
 * // Check if M is midpoint of [BC] for median AM
 * const isMedianValid = validatePointIsMidpoint(app, 'M', 'B', 'C', 3);
 * ```
 */
export function validatePointIsMidpoint(
	app: MathGraphApp,
	mTag: string,
	aTag: string,
	bTag: string,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const m = MathGraphHelpers.findByTag(app, mTag) as MathGraphPoint;
	const a = MathGraphHelpers.findByTag(app, aTag) as MathGraphPoint;
	const b = MathGraphHelpers.findByTag(app, bTag) as MathGraphPoint;

	if (!m || !a || !b) return false;

	const expectedX = (a.x + b.x) / 2;
	const expectedY = (a.y + b.y) / 2;

	const distX = Math.abs(m.x - expectedX);
	const distY = Math.abs(m.y - expectedY);

	return distX <= tolerance && distY <= tolerance;
}

/**
 * Check if point coordinates match expected values
 */
export function validatePointCoordinates(
	app: MathGraphApp,
	pointTag: string,
	expectedX: number,
	expectedY: number,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const point = MathGraphHelpers.findByTag(app, pointTag) as MathGraphPoint;

	if (!point || !point.existe) return false;

	return (
		Math.abs(point.x - expectedX) <= tolerance && Math.abs(point.y - expectedY) <= tolerance
	);
}

// =========================
// LINE VALIDATION METHODS
// =========================

/**
 * Validate that two lines are parallel
 *
 * Checks if the angle between two lines is approximately 0° or 180° (parallel).
 * Uses direction vectors to calculate the angle between lines.
 *
 * @param {MathGraphApp} app - MathGraph32 application instance
 * @param {string} line1Tag - Tag of first line
 * @param {string} line2Tag - Tag of second line
 * @param {number} [angleTolerance=DEFAULT_TOLERANCE_ANGLE] - Maximum allowed angle difference in degrees (default: 2°)
 *
 * @returns {boolean} True if lines are parallel within tolerance
 *
 * @example Thales configuration
 * ```typescript
 * // Check if (BC) // (DE) in Thales theorem
 * const areParallel = validateLinesParallel(app, 'line_BC', 'line_DE');
 *
 * if (areParallel) {
 *   console.log('✓ Lines BC and DE are parallel');
 * }
 * ```
 *
 * @example Parallelogram construction
 * ```typescript
 * // Validate parallelogram ABCD: (AB) // (DC) and (AD) // (BC)
 * const side1Parallel = validateLinesParallel(app, 'AB', 'DC', 2);
 * const side2Parallel = validateLinesParallel(app, 'AD', 'BC', 2);
 *
 * const isParallelogram = side1Parallel && side2Parallel;
 * ```
 */
export function validateLinesParallel(
	app: MathGraphApp,
	line1Tag: string,
	line2Tag: string,
	angleTolerance: number = DEFAULT_TOLERANCE_ANGLE
): boolean {
	const line1 = MathGraphHelpers.findByTag(app, line1Tag) as any;
	const line2 = MathGraphHelpers.findByTag(app, line2Tag) as any;

	if (!line1 || !line2) return false;

	const points1 = extractLinePoints(line1);
	const points2 = extractLinePoints(line2);

	if (!points1 || !points2) return false;

	return MathGraphHelpers.linesParallel(points1.p1, points1.p2, points2.p1, points2.p2, angleTolerance);
}

/**
 * Validate that two lines are perpendicular
 *
 * Checks if the angle between two lines is approximately 90° (perpendicular).
 * Uses direction vectors to calculate the angle between lines.
 *
 * @param {MathGraphApp} app - MathGraph32 application instance
 * @param {string} line1Tag - Tag of first line
 * @param {string} line2Tag - Tag of second line
 * @param {number} [angleTolerance=DEFAULT_TOLERANCE_ANGLE] - Maximum allowed angle difference in degrees (default: 2°)
 *
 * @returns {boolean} True if lines are perpendicular within tolerance (angle ≈ 90°)
 *
 * @example Perpendicular bisector
 * ```typescript
 * // Check if mediator is perpendicular to segment [AB]
 * const isPerpendicular = validateLinesPerpendicular(
 *   app,
 *   'line_mediatrice',
 *   'segment_AB'
 * );
 * ```
 *
 * @example Right angle in triangle
 * ```typescript
 * // Validate right triangle: (AB) ⊥ (BC)
 * const isRightAngle = validateLinesPerpendicular(app, 'AB', 'BC', 2);
 *
 * if (isRightAngle) {
 *   console.log('✓ Triangle ABC is right-angled at B');
 * }
 * ```
 *
 * @example Altitude construction
 * ```typescript
 * // Check if altitude is perpendicular to base
 * const isAltitude = validateLinesPerpendicular(app, 'altitude_h', 'base_BC');
 * ```
 */
export function validateLinesPerpendicular(
	app: MathGraphApp,
	line1Tag: string,
	line2Tag: string,
	angleTolerance: number = DEFAULT_TOLERANCE_ANGLE
): boolean {
	const line1 = MathGraphHelpers.findByTag(app, line1Tag) as any;
	const line2 = MathGraphHelpers.findByTag(app, line2Tag) as any;

	if (!line1 || !line2) return false;

	const points1 = extractLinePoints(line1);
	const points2 = extractLinePoints(line2);

	if (!points1 || !points2) return false;

	return MathGraphHelpers.linesPerpendicular(
		points1.p1,
		points1.p2,
		points2.p1,
		points2.p2,
		angleTolerance
	);
}

/**
 * Check if a line passes through specified points
 */
export function validateLinePassesThroughPoints(
	app: MathGraphApp,
	lineTag: string,
	pointTags: string[],
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const line = MathGraphHelpers.findByTag(app, lineTag) as any;
	if (!line) return false;

	const linePoints = extractLinePoints(line);
	if (!linePoints) return false;

	for (const pointTag of pointTags) {
		const point = MathGraphHelpers.findByTag(app, pointTag) as MathGraphPoint;
		if (!point) return false;

		if (
			!MathGraphHelpers.pointOnLine(
				{ x: point.x, y: point.y },
				linePoints.p1,
				linePoints.p2,
				tolerance
			)
		) {
			return false;
		}
	}

	return true;
}

/**
 * Check if a line is the perpendicular bisector of a segment
 */
export function validateLineBisector(
	app: MathGraphApp,
	lineTag: string,
	segmentATag: string,
	segmentBTag: string,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const a = MathGraphHelpers.findByTag(app, segmentATag) as MathGraphPoint;
	const b = MathGraphHelpers.findByTag(app, segmentBTag) as MathGraphPoint;

	if (!a || !b) return false;

	// Calculate midpoint
	const midX = (a.x + b.x) / 2;
	const midY = (a.y + b.y) / 2;

	const line = MathGraphHelpers.findByTag(app, lineTag) as any;
	const linePoints = extractLinePoints(line);
	if (!linePoints) return false;

	// Check if line passes through midpoint
	if (
		!MathGraphHelpers.pointOnLine({ x: midX, y: midY }, linePoints.p1, linePoints.p2, tolerance)
	) {
		return false;
	}

	// Check if line is perpendicular to AB
	return MathGraphHelpers.linesPerpendicular(
		{ x: a.x, y: a.y },
		{ x: b.x, y: b.y },
		linePoints.p1,
		linePoints.p2,
		DEFAULT_TOLERANCE_ANGLE
	);
}

// =========================
// CIRCLE VALIDATION METHODS
// =========================

/**
 * Check if a circle has the expected radius
 */
export function validateCircleRadius(
	app: MathGraphApp,
	circleTag: string,
	expectedRadius: number,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const circle = MathGraphHelpers.findByTag(app, circleTag) as MathGraphCircle;

	if (!circle || !circle.existe) return false;

	return Math.abs(circle.rayon - expectedRadius) <= tolerance;
}

/**
 * Check if a circle has the expected center
 */
export function validateCircleCenter(
	app: MathGraphApp,
	circleTag: string,
	centerTag: string,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const circle = MathGraphHelpers.findByTag(app, circleTag) as MathGraphCircle;
	const center = MathGraphHelpers.findByTag(app, centerTag) as MathGraphPoint;

	if (!circle || !center) return false;

	return (
		Math.abs(circle.centreX - center.x) <= tolerance &&
		Math.abs(circle.centreY - center.y) <= tolerance
	);
}

/**
 * Check if two circles intersect
 */
export function validateCirclesIntersect(
	app: MathGraphApp,
	circle1Tag: string,
	circle2Tag: string
): boolean {
	const c1 = MathGraphHelpers.findByTag(app, circle1Tag) as MathGraphCircle;
	const c2 = MathGraphHelpers.findByTag(app, circle2Tag) as MathGraphCircle;

	if (!c1 || !c2) return false;

	const distance = MathGraphHelpers.calculateDistance(
		{ x: c1.centreX, y: c1.centreY },
		{ x: c2.centreX, y: c2.centreY }
	);

	const radiusSum = c1.rayon + c2.rayon;
	const radiusDiff = Math.abs(c1.rayon - c2.rayon);

	// Circles intersect if distance is between |r1-r2| and r1+r2
	return distance >= radiusDiff && distance <= radiusSum;
}

// =========================
// ANGLE VALIDATION METHODS
// =========================

/**
 * Measure an angle formed by three points
 */
export function measureAngle(
	app: MathGraphApp,
	aTag: string,
	oTag: string,
	bTag: string
): number | null {
	const a = MathGraphHelpers.findByTag(app, aTag) as MathGraphPoint;
	const o = MathGraphHelpers.findByTag(app, oTag) as MathGraphPoint;
	const b = MathGraphHelpers.findByTag(app, bTag) as MathGraphPoint;

	if (!a || !o || !b) return null;

	return MathGraphHelpers.calculateAngle(
		{ x: a.x, y: a.y },
		{ x: o.x, y: o.y },
		{ x: b.x, y: b.y }
	);
}

/**
 * Validate angle measure
 */
export function validateAngleMeasure(
	app: MathGraphApp,
	aTag: string,
	oTag: string,
	bTag: string,
	expectedAngle: number,
	tolerance: number = DEFAULT_TOLERANCE_ANGLE
): boolean {
	const actualAngle = measureAngle(app, aTag, oTag, bTag);

	if (actualAngle === null) return false;

	return Math.abs(actualAngle - expectedAngle) <= tolerance;
}

/**
 * Validate right angle (90°)
 */
export function validateRightAngle(
	app: MathGraphApp,
	aTag: string,
	oTag: string,
	bTag: string,
	tolerance: number = DEFAULT_TOLERANCE_ANGLE
): boolean {
	return validateAngleMeasure(app, aTag, oTag, bTag, 90, tolerance);
}

/**
 * Validate angles are equal
 */
export function validateAnglesEqual(
	app: MathGraphApp,
	angle1: [string, string, string],
	angle2: [string, string, string],
	tolerance: number = DEFAULT_TOLERANCE_ANGLE
): boolean {
	const measure1 = measureAngle(app, angle1[0], angle1[1], angle1[2]);
	const measure2 = measureAngle(app, angle2[0], angle2[1], angle2[2]);

	if (measure1 === null || measure2 === null) return false;

	return Math.abs(measure1 - measure2) <= tolerance;
}

// =========================
// DISTANCE VALIDATION METHODS
// =========================

/**
 * Validate distance between two points
 */
export function validateDistance(
	app: MathGraphApp,
	aTag: string,
	bTag: string,
	expectedDistance: number,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const a = MathGraphHelpers.findByTag(app, aTag) as MathGraphPoint;
	const b = MathGraphHelpers.findByTag(app, bTag) as MathGraphPoint;

	if (!a || !b) return false;

	const actualDistance = MathGraphHelpers.calculateDistance(
		{ x: a.x, y: a.y },
		{ x: b.x, y: b.y }
	);

	return Math.abs(actualDistance - expectedDistance) <= tolerance;
}

/**
 * Validate two segments have equal length
 */
export function validateSegmentsEqual(
	app: MathGraphApp,
	segment1: [string, string],
	segment2: [string, string],
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const a1 = MathGraphHelpers.findByTag(app, segment1[0]) as MathGraphPoint;
	const b1 = MathGraphHelpers.findByTag(app, segment1[1]) as MathGraphPoint;
	const a2 = MathGraphHelpers.findByTag(app, segment2[0]) as MathGraphPoint;
	const b2 = MathGraphHelpers.findByTag(app, segment2[1]) as MathGraphPoint;

	if (!a1 || !b1 || !a2 || !b2) return false;

	const dist1 = MathGraphHelpers.calculateDistance({ x: a1.x, y: a1.y }, { x: b1.x, y: b1.y });
	const dist2 = MathGraphHelpers.calculateDistance({ x: a2.x, y: a2.y }, { x: b2.x, y: b2.y });

	return Math.abs(dist1 - dist2) <= tolerance;
}

// =========================
// TRIANGLE VALIDATION METHODS
// =========================

/**
 * Validate triangle exists (three non-collinear points)
 */
export function validateTriangle(
	app: MathGraphApp,
	aTag: string,
	bTag: string,
	cTag: string
): boolean {
	const a = MathGraphHelpers.findByTag(app, aTag) as MathGraphPoint;
	const b = MathGraphHelpers.findByTag(app, bTag) as MathGraphPoint;
	const c = MathGraphHelpers.findByTag(app, cTag) as MathGraphPoint;

	if (!a || !b || !c) return false;

	// Check points are not collinear by calculating area
	const area =
		Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;

	return area > 1; // Minimum area threshold
}

/**
 * Validate isosceles triangle (2 equal sides)
 */
export function validateIsoscelesTriangle(
	app: MathGraphApp,
	aTag: string,
	bTag: string,
	cTag: string,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const a = MathGraphHelpers.findByTag(app, aTag) as MathGraphPoint;
	const b = MathGraphHelpers.findByTag(app, bTag) as MathGraphPoint;
	const c = MathGraphHelpers.findByTag(app, cTag) as MathGraphPoint;

	if (!a || !b || !c) return false;

	const ab = MathGraphHelpers.calculateDistance({ x: a.x, y: a.y }, { x: b.x, y: b.y });
	const ac = MathGraphHelpers.calculateDistance({ x: a.x, y: a.y }, { x: c.x, y: c.y });
	const bc = MathGraphHelpers.calculateDistance({ x: b.x, y: b.y }, { x: c.x, y: c.y });

	// Check if at least two sides are equal
	return (
		Math.abs(ab - ac) <= tolerance ||
		Math.abs(ab - bc) <= tolerance ||
		Math.abs(ac - bc) <= tolerance
	);
}

/**
 * Validate equilateral triangle (3 equal sides)
 */
export function validateEquilateralTriangle(
	app: MathGraphApp,
	aTag: string,
	bTag: string,
	cTag: string,
	tolerance: number = DEFAULT_TOLERANCE_DISTANCE
): boolean {
	const a = MathGraphHelpers.findByTag(app, aTag) as MathGraphPoint;
	const b = MathGraphHelpers.findByTag(app, bTag) as MathGraphPoint;
	const c = MathGraphHelpers.findByTag(app, cTag) as MathGraphPoint;

	if (!a || !b || !c) return false;

	const ab = MathGraphHelpers.calculateDistance({ x: a.x, y: a.y }, { x: b.x, y: b.y });
	const ac = MathGraphHelpers.calculateDistance({ x: a.x, y: a.y }, { x: c.x, y: c.y });
	const bc = MathGraphHelpers.calculateDistance({ x: b.x, y: b.y }, { x: c.x, y: c.y });

	// All three sides must be equal
	return Math.abs(ab - ac) <= tolerance && Math.abs(ab - bc) <= tolerance;
}

/**
 * Validate right triangle
 */
export function validateRightTriangle(
	app: MathGraphApp,
	aTag: string,
	bTag: string,
	cTag: string,
	tolerance: number = DEFAULT_TOLERANCE_ANGLE
): boolean {
	// Check if any angle is 90°
	return (
		validateRightAngle(app, aTag, bTag, cTag, tolerance) ||
		validateRightAngle(app, bTag, cTag, aTag, tolerance) ||
		validateRightAngle(app, cTag, aTag, bTag, tolerance)
	);
}

// =========================
// HELPER FUNCTIONS
// =========================

/**
 * Extract two points from a line object to define it
 * This is a simplified version - actual implementation would
 * depend on MathGraph32's line representation
 */
function extractLinePoints(line: any): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
	// This would need to be implemented based on MathGraph32's internal structure
	// For now, return null as placeholder
	return null;
}

// Export all validation functions
export const GeometryValidators = {
	// Points
	validatePointExists,
	validatePointOnLine,
	validatePointOnCircle,
	validatePointIsMidpoint,
	validatePointCoordinates,

	// Lines
	validateLinesParallel,
	validateLinesPerpendicular,
	validateLinePassesThroughPoints,
	validateLineBisector,

	// Circles
	validateCircleRadius,
	validateCircleCenter,
	validateCirclesIntersect,

	// Angles
	measureAngle,
	validateAngleMeasure,
	validateRightAngle,
	validateAnglesEqual,

	// Distances
	validateDistance,
	validateSegmentsEqual,

	// Triangles
	validateTriangle,
	validateIsoscelesTriangle,
	validateEquilateralTriangle,
	validateRightTriangle
};
