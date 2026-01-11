/**
 * Intervals Module - Mathematical Intervals with Symbolic Bounds
 *
 * Provides a complete system for representing and manipulating mathematical intervals
 * on the real line with symbolic bounds using MathNode from mathAST.
 *
 * Supports any symbolic expression as bounds: π, √2, ln(3), e^x, etc.
 *
 * @example
 * // Create intervals with symbolic bounds
 * import { closedInterval, sqrt2, fromNumber, formatDomainInterval } from '$lib/math/intervals';
 *
 * const domain = intervalSet([closedInterval(fromNumber(0), sqrt2())]);
 * console.log(formatDomainInterval(domain)); // "[0, √2]"
 *
 * @example
 * // Perform set operations
 * import { intersect, union, complement, positiveReals, unitInterval } from '$lib/math/intervals';
 *
 * const result = intersect(positiveReals(), unitInterval());
 * // result = ]0, 1]
 */

// Types
export type {
	// Endpoint types
	EndpointValue,
	EndpointType,
	Endpoint,
	// Interval types
	Interval,
	ExcludedPoint,
	// Domain types
	EmptySet,
	UniversalSet,
	IntervalSet,
	IntervalDomain,
	// Comparison types
	CompareResult,
	CompareOutcome
} from './types';

// Comparison functions
export {
	compareEndpointValues,
	compare,
	endpointLessThan,
	endpointEquals,
	endpointLessThanOrEqual,
	endpointGreaterThan,
	endpointGreaterThanOrEqual
} from './compare';

// Endpoint utilities
export { isInfinite, isPositiveInfinity, isNegativeInfinity, endpointToNumber } from './endpoint';

// Factory functions - Endpoint values
export {
	fromNumber,
	rationalBound,
	radicalBound,
	positiveInfinity,
	negativeInfinity,
	pi,
	e,
	sqrt2,
	sqrt3
} from './factory';

// Factory functions - Endpoints
export { endpoint, openEndpoint, closedEndpoint, negInfinity, posInfinity } from './factory';

// Factory functions - Intervals
export {
	interval,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThan,
	lessThanOrEqual,
	greaterThan,
	greaterThanOrEqual,
	realLine
} from './factory';

// Factory functions - Domains
export {
	emptySet,
	universalSet,
	intervalSet,
	excludedPoint,
	EMPTY_SET,
	UNIVERSAL_SET
} from './factory';

// Factory functions - Common domain shortcuts
export { positiveReals, nonNegativeReals, nonZeroReals, unitInterval } from './factory';

// Algebra operations
export {
	isEmpty,
	isUniversal,
	containsValue,
	intersect,
	union,
	complement,
	difference,
	excludePoints
} from './algebra';

// Formatting (new names)
export { formatInterval, formatCondition, formatDomainFull, formatEndpointValue } from './format';

// Formatting (deprecated aliases for backward compatibility)
export { formatDomainInterval, formatDomainCondition } from './format';
