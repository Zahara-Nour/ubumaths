/**
 * MathAST Domain Type System
 *
 * Types for representing mathematical domains: sets of valid input values
 * for functions. Supports interval notation, condition-based constraints,
 * and domain algebra operations.
 *
 * Core interval types are imported from $lib/math/intervals.
 * This module adds domain-specific types like ConditionDomain.
 */

// =============================================================================
// Re-export core types from intervals module
// =============================================================================

// Endpoint types
export type {
	EndpointValue,
	EndpointType,
	Endpoint,
	// Interval types
	Interval,
	ExcludedPoint,
	// Domain types (interval-based)
	EmptySet,
	UniversalSet,
	IntervalSet,
	// Comparison types
	CompareOutcome,
	CompareResult
} from '$lib/math/intervals/types';

// Import for use in this file
import type { EndpointValue, EmptySet, UniversalSet, IntervalSet } from '$lib/math/intervals/types';

// =============================================================================
// Backward compatibility aliases
// =============================================================================

/**
 * Alias for EmptySet for backward compatibility.
 * @deprecated Use EmptySet instead
 */
export type EmptyDomain = EmptySet;

/**
 * Alias for UniversalSet for backward compatibility.
 * @deprecated Use UniversalSet instead
 */
export type UniversalDomain = UniversalSet;

/**
 * Alias for IntervalSet for backward compatibility.
 * @deprecated Use IntervalSet instead
 */
export type IntervalDomain = IntervalSet;

// =============================================================================
// Condition Types (Domain-specific, not in intervals)
// =============================================================================

/**
 * Comparison operators for domain conditions
 */
export type ComparisonOp = '<' | '<=' | '>' | '>=' | '=' | '!=';

/**
 * A simple comparison condition: variable op expression
 *
 * @example
 * // x > 0
 * { kind: 'comparison', variable: 'x', op: '>', bound: 0 }
 */
export interface ComparisonCondition {
	readonly kind: 'comparison';
	readonly variable: string;
	readonly op: ComparisonOp;
	readonly bound: EndpointValue;
}

/**
 * Union of all condition types
 */
export type Condition = ComparisonCondition;

/**
 * A condition-based domain (conjunction or disjunction of conditions)
 *
 * Represents domains like:
 * - x > 0
 * - x >= -1 AND x <= 1
 * - x != 0
 */
export interface ConditionDomain {
	readonly kind: 'condition_domain';
	readonly conditions: readonly Condition[];
	readonly combinator: 'and' | 'or';
}

// =============================================================================
// Periodic Exclusion Types (for tan, cot, sec, csc)
// =============================================================================

import type { MathNode } from '../types';

/**
 * Represents a domain with periodic exclusions.
 * Used for functions like tan (excludes π/2 + kπ for all integers k).
 *
 * The excluded points form an infinite set: basePoint + k * period for all k ∈ ℤ
 *
 * @example
 * // tan: ℝ \ {π/2 + kπ : k ∈ ℤ}
 * { kind: 'periodic_exclusion', basePoint: π/2, period: π }
 *
 * // cot, csc: ℝ \ {kπ : k ∈ ℤ}
 * { kind: 'periodic_exclusion', basePoint: 0, period: π }
 */
export interface PeriodicExclusion {
	readonly kind: 'periodic_exclusion';
	/** The base exclusion point (smallest positive excluded value or 0) */
	readonly basePoint: MathNode;
	/** The period between consecutive excluded points */
	readonly period: MathNode;
}

// =============================================================================
// Domain Union Type
// =============================================================================

/**
 * Union of all domain types.
 *
 * Includes:
 * - EmptySet: no valid values (kind: 'empty')
 * - UniversalSet: all real numbers (kind: 'universal')
 * - IntervalSet: union of intervals with excluded points (kind: 'interval_set')
 * - ConditionDomain: condition-based representation (kind: 'condition_domain')
 * - PeriodicExclusion: real line with periodic point exclusions (kind: 'periodic_exclusion')
 */
export type Domain = EmptySet | UniversalSet | IntervalSet | ConditionDomain | PeriodicExclusion;

// =============================================================================
// Domain Result Types (for domain operations)
// =============================================================================

/**
 * A step in the domain computation (for pedagogical display)
 */
export interface DomainStep {
	readonly expression: string;
	readonly constraint: string;
	readonly explanation: string;
}

/**
 * Result of a domain computation - may include reasons/explanations
 */
export interface DomainResult {
	readonly domain: Domain;
	readonly variable: string;
	readonly steps?: readonly DomainStep[];
}

/**
 * Represents a domain violation found during validation
 */
export interface DomainViolation {
	/** The function or operation that caused the violation */
	readonly source: string;
	/** The parameter name that violated the constraint */
	readonly parameter: string;
	/** Human-readable constraint description */
	readonly constraint: string;
	/** The violating value */
	readonly value: number;
	/** French pedagogical message */
	readonly messageFr: string;
	/** English technical message */
	readonly messageEn: string;
}

// =============================================================================
// Range Result Types (for range/image operations)
// =============================================================================

/**
 * A step in the range computation (for pedagogical display)
 */
export interface RangeStep {
	readonly expression: string;
	readonly rangeDescription: string;
	readonly explanation: string;
}

/**
 * Result of a range computation
 */
export interface RangeResult {
	readonly range: Domain;
	readonly variable: string;
	readonly inputDomain?: Domain;
	readonly steps?: readonly RangeStep[];
}

// =============================================================================
// Re-export Enhanced Step Types
// =============================================================================

export type { DomainRule, EnhancedDomainStep, EnhancedDomainResult } from './enhanced-step-types';

export {
	isConstraintRule,
	isPreimageRule,
	isOperationRule,
	getConstraintRuleForFunction
} from './enhanced-step-types';
