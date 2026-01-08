/**
 * Intervals Module - Mathematical Intervals with Algebraic Bounds
 *
 * Provides a complete system for representing and manipulating mathematical intervals
 * on the real line with exact algebraic bounds (rationals, radicals).
 *
 * @example
 * // Create intervals with exact algebraic bounds
 * import { closedInterval, radicalBound, fromNumber, formatDomainInterval } from '$lib/math/intervals';
 *
 * const sqrt2 = radicalBound(2n);
 * const domain = intervalSet([closedInterval(fromNumber(0), sqrt2)]);
 * console.log(formatDomainInterval(domain)); // "[0, √2]"
 *
 * @example
 * // Perform set operations
 * import { intersect, union, complement, positiveReals, nonZeroReals } from '$lib/math/intervals';
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
	InfinityKind,
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
	AlgebraicCompareResult
} from './types';

// Algebraic comparison
export { compareAlgebraicNumerically } from './algebraic-compare';

// Endpoint utilities
export {
	compareEndpointValues,
	endpointToNumber,
	endpointEquals,
	isPositiveInfinity,
	isNegativeInfinity
} from './endpoint';

// Factory functions - Endpoint values
export { fromNumber, rationalBound, radicalBound, infinityBound, algebraic } from './factory';

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

// Formatting
export {
	formatDomainInterval,
	formatDomainCondition,
	formatDomainFull,
	formatEndpointValue
} from './format';
