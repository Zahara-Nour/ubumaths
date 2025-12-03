/**
 * Pattern Matching Type Definitions for MathAST
 *
 * Defines pattern types for matching against MathNode expressions.
 * Patterns are SEPARATE from MathNode types - they describe what to match,
 * not actual mathematical expressions.
 */

import type { MathNode, MathNodeType, RelationType } from '../types';

// =============================================================================
// Pattern Constraints
// =============================================================================

/**
 * Type constraint - matches nodes of specific type(s)
 */
export interface TypeConstraint {
	readonly kind: 'type';
	readonly nodeType: MathNodeType | readonly MathNodeType[];
}

/**
 * Number constraint - matches only number nodes
 */
export interface NumberConstraint {
	readonly kind: 'number';
}

/**
 * Variable constraint - matches only variable nodes
 */
export interface VariableConstraint {
	readonly kind: 'variable';
}

/**
 * Positive constraint - matches nodes that evaluate to positive values
 */
export interface PositiveConstraint {
	readonly kind: 'positive';
}

/**
 * Negative constraint - matches nodes that evaluate to negative values
 */
export interface NegativeConstraint {
	readonly kind: 'negative';
}

/**
 * Non-zero constraint - matches nodes that evaluate to non-zero values
 */
export interface NonzeroConstraint {
	readonly kind: 'nonzero';
}

/**
 * Integer constraint - matches number nodes with integer values
 */
export interface IntegerConstraint {
	readonly kind: 'integer';
}

/**
 * Free-of constraint - matches expressions not containing specified variables
 */
export interface FreeOfConstraint {
	readonly kind: 'freeOf';
	readonly variables: readonly string[];
}

/**
 * Custom constraint - matches based on user-provided predicate
 */
export interface CustomConstraint {
	readonly kind: 'custom';
	readonly predicate: (node: MathNode) => boolean;
	readonly label?: string;
}

/**
 * And constraint - matches if ALL child constraints match
 */
export interface AndConstraint {
	readonly kind: 'and';
	readonly constraints: readonly PatternConstraint[];
}

/**
 * Or constraint - matches if ANY child constraint matches
 */
export interface OrConstraint {
	readonly kind: 'or';
	readonly constraints: readonly PatternConstraint[];
}

/**
 * Not constraint - matches if child constraint does NOT match
 */
export interface NotConstraint {
	readonly kind: 'not';
	readonly constraint: PatternConstraint;
}

/**
 * Union of all constraint types
 */
export type PatternConstraint =
	| TypeConstraint
	| NumberConstraint
	| VariableConstraint
	| PositiveConstraint
	| NegativeConstraint
	| NonzeroConstraint
	| IntegerConstraint
	| FreeOfConstraint
	| CustomConstraint
	| AndConstraint
	| OrConstraint
	| NotConstraint;

// =============================================================================
// Wildcard Pattern
// =============================================================================

/**
 * Wildcard pattern - captures any expression that satisfies optional constraints
 *
 * When matched, binds the matched node to `name` in the bindings map.
 *
 * @example
 * // Match any expression and bind to 'x'
 * { type: 'wildcard', name: 'x' }
 *
 * // Match any number and bind to 'n'
 * { type: 'wildcard', name: 'n', constraint: { kind: 'number' } }
 */
export interface WildcardPattern {
	readonly type: 'wildcard';
	readonly name: string;
	readonly constraint?: PatternConstraint;
}

// =============================================================================
// Literal Pattern
// =============================================================================

/**
 * Literal pattern - matches an exact MathNode
 *
 * Uses structural equality to match the exact node.
 *
 * @example
 * // Match the number 0 exactly
 * { type: 'literal', node: { type: 'number', value: '0' } }
 */
export interface LiteralPattern {
	readonly type: 'literal';
	readonly node: MathNode;
}

// =============================================================================
// Structural Patterns
// =============================================================================

/**
 * Addition pattern - matches addition nodes
 */
export interface AdditionPattern {
	readonly type: 'addition-pattern';
	readonly left: Pattern;
	readonly right: Pattern;
}

/**
 * Subtraction pattern - matches subtraction nodes
 */
export interface SubtractionPattern {
	readonly type: 'subtraction-pattern';
	readonly left: Pattern;
	readonly right: Pattern;
}

/**
 * Multiplication pattern - matches multiplication nodes
 */
export interface MultiplicationPattern {
	readonly type: 'multiplication-pattern';
	readonly left: Pattern;
	readonly right: Pattern;
}

/**
 * Division pattern - matches division nodes
 */
export interface DivisionPattern {
	readonly type: 'division-pattern';
	readonly numerator: Pattern;
	readonly denominator: Pattern;
}

/**
 * Superscript/power pattern - matches superscript nodes
 */
export interface SuperscriptPattern {
	readonly type: 'superscript-pattern';
	readonly base: Pattern;
	readonly exponent: Pattern;
}

/**
 * Function pattern - matches function nodes by name and argument patterns
 */
export interface FunctionPattern {
	readonly type: 'function-pattern';
	readonly name: string;
	readonly args: readonly Pattern[];
}

/**
 * Opposite/negation pattern - matches opposite nodes
 */
export interface OppositePattern {
	readonly type: 'opposite-pattern';
	readonly operand: Pattern;
}

/**
 * Positive pattern - matches positive sign nodes
 */
export interface PositivePattern {
	readonly type: 'positive-pattern';
	readonly operand: Pattern;
}

/**
 * Delimiter pattern - matches delimiter nodes (parentheses, etc.)
 */
export interface DelimiterPattern {
	readonly type: 'delimiter-pattern';
	readonly content: Pattern;
}

/**
 * Subscript pattern - matches subscript nodes
 */
export interface SubscriptPattern {
	readonly type: 'subscript-pattern';
	readonly base: Pattern;
	readonly subscript: Pattern;
}

/**
 * Relation pattern - matches relation nodes
 *
 * Use 'any' for relation to match any relation type.
 */
export interface RelationPattern {
	readonly type: 'relation-pattern';
	readonly relation: RelationType | 'any';
	readonly left: Pattern;
	readonly right: Pattern;
}

// =============================================================================
// Pattern Union
// =============================================================================

/**
 * Union of all pattern types
 */
export type Pattern =
	| WildcardPattern
	| LiteralPattern
	| AdditionPattern
	| SubtractionPattern
	| MultiplicationPattern
	| DivisionPattern
	| SuperscriptPattern
	| FunctionPattern
	| OppositePattern
	| PositivePattern
	| DelimiterPattern
	| SubscriptPattern
	| RelationPattern;

// =============================================================================
// Pattern Type Extraction
// =============================================================================

/**
 * Extract the type literal from a Pattern
 */
export type PatternType = Pattern['type'];

// =============================================================================
// Match Result Types
// =============================================================================

/**
 * Alias for bindings map - maps wildcard names to matched MathNodes
 */
export type MatchBindings = ReadonlyMap<string, MathNode>;

/**
 * Result of a pattern match operation
 */
export interface MatchResult {
	readonly success: boolean;
	readonly bindings: MatchBindings;
}

/**
 * Creates a successful match result
 */
export function successMatch(bindings: MatchBindings): MatchResult {
	return { success: true, bindings };
}

/**
 * Creates a failed match result with empty bindings
 */
export function failMatch(): MatchResult {
	return { success: false, bindings: new Map() };
}

/**
 * Empty bindings constant for convenience
 */
export const EMPTY_BINDINGS: MatchBindings = new Map();

// =============================================================================
// Rule Types
// =============================================================================

/**
 * Options for creating a rule
 */
export interface RuleOptions {
	readonly name?: string;
	readonly condition?: (bindings: MatchBindings) => boolean;
	readonly priority?: number;
}

/**
 * A transformation rule consisting of a pattern and replacement
 *
 * The replacement can be either:
 * - A Pattern to substitute bindings into
 * - A function that creates a new MathNode from bindings
 */
export interface Rule {
	readonly name: string;
	readonly pattern: Pattern;
	readonly replacement: Pattern | ((bindings: MatchBindings) => MathNode);
	readonly condition?: (bindings: MatchBindings) => boolean;
	readonly priority?: number;
}

// =============================================================================
// Type Guards for Patterns
// =============================================================================

/**
 * Checks if a pattern is a wildcard pattern
 */
export function isWildcardPattern(pattern: Pattern): pattern is WildcardPattern {
	return pattern.type === 'wildcard';
}

/**
 * Checks if a pattern is a literal pattern
 */
export function isLiteralPattern(pattern: Pattern): pattern is LiteralPattern {
	return pattern.type === 'literal';
}

/**
 * Checks if a pattern is an addition pattern
 */
export function isAdditionPattern(pattern: Pattern): pattern is AdditionPattern {
	return pattern.type === 'addition-pattern';
}

/**
 * Checks if a pattern is a subtraction pattern
 */
export function isSubtractionPattern(pattern: Pattern): pattern is SubtractionPattern {
	return pattern.type === 'subtraction-pattern';
}

/**
 * Checks if a pattern is a multiplication pattern
 */
export function isMultiplicationPattern(pattern: Pattern): pattern is MultiplicationPattern {
	return pattern.type === 'multiplication-pattern';
}

/**
 * Checks if a pattern is a division pattern
 */
export function isDivisionPattern(pattern: Pattern): pattern is DivisionPattern {
	return pattern.type === 'division-pattern';
}

/**
 * Checks if a pattern is a superscript pattern
 */
export function isSuperscriptPattern(pattern: Pattern): pattern is SuperscriptPattern {
	return pattern.type === 'superscript-pattern';
}

/**
 * Checks if a pattern is a function pattern
 */
export function isFunctionPattern(pattern: Pattern): pattern is FunctionPattern {
	return pattern.type === 'function-pattern';
}

/**
 * Checks if a pattern is an opposite pattern
 */
export function isOppositePattern(pattern: Pattern): pattern is OppositePattern {
	return pattern.type === 'opposite-pattern';
}

/**
 * Checks if a pattern is a positive pattern
 */
export function isPositivePattern(pattern: Pattern): pattern is PositivePattern {
	return pattern.type === 'positive-pattern';
}

/**
 * Checks if a pattern is a delimiter pattern
 */
export function isDelimiterPattern(pattern: Pattern): pattern is DelimiterPattern {
	return pattern.type === 'delimiter-pattern';
}

/**
 * Checks if a pattern is a subscript pattern
 */
export function isSubscriptPattern(pattern: Pattern): pattern is SubscriptPattern {
	return pattern.type === 'subscript-pattern';
}

/**
 * Checks if a pattern is a relation pattern
 */
export function isRelationPattern(pattern: Pattern): pattern is RelationPattern {
	return pattern.type === 'relation-pattern';
}

/**
 * Checks if a pattern is a structural pattern (has children)
 */
export function isStructuralPattern(pattern: Pattern): boolean {
	return pattern.type !== 'wildcard' && pattern.type !== 'literal';
}

// =============================================================================
// Type Guards for Constraints
// =============================================================================

/**
 * Checks if a constraint is a type constraint
 */
export function isTypeConstraint(constraint: PatternConstraint): constraint is TypeConstraint {
	return constraint.kind === 'type';
}

/**
 * Checks if a constraint is a number constraint
 */
export function isNumberConstraint(constraint: PatternConstraint): constraint is NumberConstraint {
	return constraint.kind === 'number';
}

/**
 * Checks if a constraint is a variable constraint
 */
export function isVariableConstraint(
	constraint: PatternConstraint
): constraint is VariableConstraint {
	return constraint.kind === 'variable';
}

/**
 * Checks if a constraint is a positive constraint
 */
export function isPositiveConstraint(
	constraint: PatternConstraint
): constraint is PositiveConstraint {
	return constraint.kind === 'positive';
}

/**
 * Checks if a constraint is a negative constraint
 */
export function isNegativeConstraint(
	constraint: PatternConstraint
): constraint is NegativeConstraint {
	return constraint.kind === 'negative';
}

/**
 * Checks if a constraint is a nonzero constraint
 */
export function isNonzeroConstraint(
	constraint: PatternConstraint
): constraint is NonzeroConstraint {
	return constraint.kind === 'nonzero';
}

/**
 * Checks if a constraint is an integer constraint
 */
export function isIntegerConstraint(
	constraint: PatternConstraint
): constraint is IntegerConstraint {
	return constraint.kind === 'integer';
}

/**
 * Checks if a constraint is a freeOf constraint
 */
export function isFreeOfConstraint(constraint: PatternConstraint): constraint is FreeOfConstraint {
	return constraint.kind === 'freeOf';
}

/**
 * Checks if a constraint is a custom constraint
 */
export function isCustomConstraint(constraint: PatternConstraint): constraint is CustomConstraint {
	return constraint.kind === 'custom';
}

/**
 * Checks if a constraint is an and constraint
 */
export function isAndConstraint(constraint: PatternConstraint): constraint is AndConstraint {
	return constraint.kind === 'and';
}

/**
 * Checks if a constraint is an or constraint
 */
export function isOrConstraint(constraint: PatternConstraint): constraint is OrConstraint {
	return constraint.kind === 'or';
}

/**
 * Checks if a constraint is a not constraint
 */
export function isNotConstraint(constraint: PatternConstraint): constraint is NotConstraint {
	return constraint.kind === 'not';
}
