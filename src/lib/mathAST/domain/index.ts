/**
 * Domain System
 *
 * Provides comprehensive domain of definition handling for mathematical expressions:
 * - Domain types (empty, universal, interval set, condition)
 * - Domain algebra (intersect, union, complement, difference)
 * - Automatic domain computation for expressions
 * - Validation at evaluation time
 * - French interval notation formatting
 *
 * Uses the intervals module for interval representation and algebra.
 *
 * @module mathAST/domain
 */

// =============================================================================
// Types
// =============================================================================

export type {
	// Core interval types (from intervals module via types.ts)
	EndpointValue,
	EndpointType,
	Endpoint,
	Interval,
	ExcludedPoint,
	EmptySet,
	UniversalSet,
	IntervalSet,
	CompareOutcome,
	CompareResult,
	// Domain-specific types
	Domain,
	ConditionDomain,
	PeriodicExclusion,
	Condition,
	ComparisonCondition,
	ComparisonOp,
	DomainViolation,
	DomainResult,
	DomainStep,
	// Range types
	RangeResult,
	RangeStep,
	// Backward compatibility aliases
	EmptyDomain,
	UniversalDomain,
	IntervalDomain
} from './types';

// =============================================================================
// Factory Functions
// =============================================================================

export {
	// Bound value constructors (from intervals)
	fromNumber,
	rationalBound,
	radicalBound,
	positiveInfinity,
	negativeInfinity,
	pi,
	e,
	sqrt2,
	sqrt3,
	// Endpoint factories
	endpoint,
	openEndpoint,
	closedEndpoint,
	negInfinity,
	posInfinity,
	// Interval factories
	interval,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThan,
	lessThanOrEqual,
	greaterThan,
	greaterThanOrEqual,
	realLine,
	// Domain constants
	EMPTY_SET,
	UNIVERSAL_SET,
	EMPTY_DOMAIN,
	UNIVERSAL_DOMAIN,
	// Domain factories
	emptySet,
	universalSet,
	emptyDomain,
	universalDomain,
	intervalDomain,
	excludedPoint,
	// Common domain shortcuts
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	// Domain-specific factories (conditions)
	conditionDomain,
	comparison,
	// Periodic exclusion factories
	periodicExclusion,
	tanDomain,
	cotDomain,
	secDomain,
	cscDomain
} from './factory';

// =============================================================================
// Algebra Operations
// =============================================================================

export {
	isEmpty,
	isUniversal,
	containsValue,
	intersect,
	union,
	complement,
	difference,
	excludePoints,
	excludeNumericPoints,
	tryConvertConditionToInterval
} from './algebra';

// =============================================================================
// Domain Computation
// =============================================================================

export { computeDomain } from './compute';
export type { ComputeDomainOptions } from './compute';

// =============================================================================
// Validation
// =============================================================================

export { isInDomain, getDomainViolations } from './validate';
export type { Bindings } from './validate';

// =============================================================================
// Formatting (new names)
// =============================================================================

export { formatInterval, formatCondition, formatDomainFull, formatEndpointValue } from './format';

// Formatting (deprecated aliases for backward compatibility)
export { formatDomainInterval, formatDomainCondition } from './format';

// =============================================================================
// Built-in Function Domains
// =============================================================================

export {
	getBuiltinDomain,
	hasRestrictedDomain,
	getBuiltinConstraintDescription,
	getRestrictedFunctions
} from './builtins';

// =============================================================================
// Built-in Function Ranges (output ranges)
// =============================================================================

export {
	getBuiltinRange,
	hasRestrictedRange,
	applyFunctionToRange,
	getBoundsFromDomain,
	domainFromBounds
} from './builtins';
export type { BuiltinRangeEntry, Monotonicity, MonotonicInterval, Bounds } from './builtins';

// =============================================================================
// Range Computation
// =============================================================================

export { computeRange } from './range';
export type { ComputeRangeOptions } from './range';

// =============================================================================
// Range Helpers (advanced pattern matching and analysis)
// =============================================================================

export {
	// Pattern detection
	extractQuadratic,
	extractRationalPower,
	// Piecewise function ranges
	computeAbsRange,
	computeMinRange,
	computeMaxRange,
	// Polynomial ranges
	computeQuadraticRange,
	computeLinearRange,
	// Power ranges
	computeRationalPowerRange,
	// Critical point analysis
	findCriticalPoints,
	computeRangeWithCriticalPoints,
	// Periodic optimization
	spansFullPeriod,
	getFunctionPeriod
} from './range-helpers';
export type { QuadraticForm, LinearForm, RationalPower } from './range-helpers';

// =============================================================================
// Errors
// =============================================================================

export { DomainError } from './errors';
