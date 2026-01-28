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
	// Individual transforms (for testing/direct use)
	TRANSFORM_SIN_COS_PRODUCT,
	TRANSFORM_DOUBLE_ANGLE_SIN,
	TRANSFORM_SIN_SQUARED,
	TRANSFORM_COS_SQUARED,
	TRANSFORM_PYTHAGOREAN,
	TRANSFORM_ONE_MINUS_SIN_SQUARED,
	TRANSFORM_ONE_MINUS_COS_SQUARED,
	TRANSFORM_SIN_OVER_COS,
	// Types
	type TrigTransformResult
} from './trig-identities';
