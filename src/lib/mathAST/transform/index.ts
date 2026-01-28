/**
 * MathAST Transform Module
 *
 * Provides transformation rules and utilities for mathematical expressions.
 *
 * @module mathAST/transform
 */

// Trigonometric identities
export {
	// Application functions
	applyTrigIdentities,
	contractToDoubleAngle,
	simplifyPythagorean,
	simplifyQuotients,
	linearize,
	expandAddition,
	// Individual transforms (for testing/direct use)
	TRANSFORM_SIN_COS_PRODUCT,
	TRANSFORM_DOUBLE_ANGLE_SIN,
	TRANSFORM_SIN_SQUARED,
	TRANSFORM_COS_SQUARED,
	TRANSFORM_PYTHAGOREAN,
	TRANSFORM_ONE_MINUS_SIN_SQUARED,
	TRANSFORM_ONE_MINUS_COS_SQUARED,
	TRANSFORM_SIN_OVER_COS,
	TRANSFORM_COS_COS_PRODUCT,
	TRANSFORM_SIN_SIN_PRODUCT,
	TRANSFORM_SIN_COS_DIFFERENT,
	TRANSFORM_COS_SUM,
	TRANSFORM_COS_DIFFERENCE,
	TRANSFORM_SIN_SUM,
	TRANSFORM_SIN_DIFFERENCE,
	// Types
	type TrigTransformResult
} from './trig-identities';
