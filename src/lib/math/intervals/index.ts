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
 * import { closedInterval, bound, fromNumber, formatDomainInterval } from '$lib/math/intervals';
 *
 * const domain = intervalSet([closedInterval(fromNumber(0), bound('sqrt(2)'))]);
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
	// Domain types
	EmptySet,
	UniversalSet,
	IntervalSet,
	IntervalDomain,
	// Comparison types
	CompareOutcome
} from './types';

// Comparison
export { compare } from './compare';

// Endpoint utilities
export {
	isInfiniteEndpoint,
	isPositiveInfinityEndpoint,
	isNegativeInfinityEndpoint,
	endpointToNumber
} from './endpoint';

// Factory functions - Endpoint values
export { fromNumber, bound } from './factory';

// Factory functions - Endpoints
export {
	endpoint,
	openEndpoint,
	closedEndpoint,
	negInfinityEndpoint,
	posInfinityEndpoint
} from './factory';

// Factory functions - Intervals
export {
	interval,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThanInterval,
	lessThanOrEqualInterval,
	greaterThanInterval,
	greaterThanOrEqualInterval,
	realLine
} from './factory';

// Factory functions - Domains
export { emptySet, universalSet, intervalSet, EMPTY_SET, UNIVERSAL_SET } from './factory';

// Factory functions - Common domain shortcuts
export { positiveReals, nonNegativeReals, nonZeroReals, unitInterval } from './factory';

// Algebra operations (set theory)
export {
	isEmpty,
	isUniversal,
	containsValue,
	intersect,
	union,
	complement,
	difference
} from './algebra';

// Symbolic interval utilities
export { getEndpoints, combineEndpointTypes, buildInterval } from './algebra';

// Symbolic interval arithmetic
export { addBounds, subtractBounds, negateBounds, multiplyBounds, divideBounds } from './algebra';

// Specialized interval operations
export { absBounds, powerBounds } from './algebra';

// Formatting (new names)
export { formatInterval, formatCondition, formatDomainFull, formatEndpointValue } from './format';

// Formatting (deprecated aliases for backward compatibility)
export { formatDomainInterval, formatDomainCondition } from './format';
