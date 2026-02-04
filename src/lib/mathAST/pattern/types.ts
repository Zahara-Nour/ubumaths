/**
 * Pattern Matching Type Definitions for MathAST
 *
 * Defines pattern types for matching against MathNode expressions.
 * Patterns are SEPARATE from MathNode types - they describe what to match,
 * not actual mathematical expressions.
 */

import type { MathNode, MathNodeType, RelationType } from '../types';
import type { SignedTerm } from '../flatten';
import type { NumericType } from '../numtype/types';

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
 * Non-one constraint - matches nodes that evaluate to values different from 1
 */
export interface NononeConstraint {
	readonly kind: 'nonone';
}

/**
 * Comparison constraint - matches numbers based on comparison with a value
 *
 * Operators:
 * - 'gt': greater than (>)
 * - 'lt': less than (<)
 * - 'gte': greater than or equal (≥)
 * - 'lte': less than or equal (≤)
 * - 'eq': equal to (=)
 * - 'ne': not equal to (≠)
 */
export interface ComparisonConstraint {
	readonly kind: 'comparison';
	readonly operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
	readonly value: number;
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
 * Numeric type constraint - matches nodes with specific numeric type
 *
 * Uses the numtype inference system to determine the type of expressions.
 *
 * @example
 * // Match any integer expression
 * { kind: 'numericType', numericType: 'integer' }
 *
 * // Match any real expression (includes integer, rational, algebraic, transcendental)
 * { kind: 'numericType', numericType: 'real' }
 *
 * // Match exactly rational (not subtypes)
 * { kind: 'numericType', numericType: 'rational', strict: true }
 */
export interface NumericTypeConstraint {
	readonly kind: 'numericType';
	readonly numericType: NumericType;
	/**
	 * If true, requires exact type match.
	 * If false (default), allows subtypes (e.g., integer satisfies 'rational').
	 */
	readonly strict?: boolean;
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
	| NononeConstraint
	| ComparisonConstraint
	| IntegerConstraint
	| FreeOfConstraint
	| CustomConstraint
	| AndConstraint
	| OrConstraint
	| NotConstraint
	| NumericTypeConstraint;

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
	readonly power?: Pattern;
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
// Sequence Patterns (N-ary matching)
// =============================================================================

/**
 * Sequence wildcard pattern - captures 1 or more consecutive terms in a sum/product
 *
 * Used with SumPattern or ProductPattern to capture multiple terms.
 * The sequence must contain at least one element (use OptionalSequencePattern for 0+).
 *
 * @example
 * // Match a + <rest> where rest is 1+ terms
 * P.sum(P._('a'), P.__('rest'))
 */
export interface SequencePattern {
	readonly type: 'sequence';
	readonly name: string;
	readonly constraint?: PatternConstraint;
}

/**
 * Optional sequence wildcard pattern - captures 0 or more consecutive terms
 *
 * Used with SumPattern or ProductPattern to capture optional terms.
 * Can match empty sequences (0 elements).
 *
 * @example
 * // Match a + b + <extras> where extras can be 0 or more terms
 * P.sum(P._('a'), P._('b'), P.___('extras'))
 */
export interface OptionalSequencePattern {
	readonly type: 'optional-sequence';
	readonly name: string;
	readonly constraint?: PatternConstraint;
}

/**
 * Element type for SumPattern - can be a regular pattern or sequence pattern
 */
export type SumPatternElement = Pattern | SequencePattern | OptionalSequencePattern;

/**
 * Element type for ProductPattern - can be a regular pattern or sequence pattern
 */
export type ProductPatternElement = Pattern | SequencePattern | OptionalSequencePattern;

/**
 * N-ary sum pattern - matches sums with multiple terms (commutative)
 *
 * Flattens the sum and attempts to match elements in any order (due to commutativity).
 * Can include sequence wildcards to capture remaining terms.
 *
 * @example
 * // Match any sum with a captured first term and remaining terms
 * P.sum(P._('first'), P.__('rest'))
 *
 * // Match sum with known term and optional extras
 * P.sum(P._('a'), P._('b'), P.___('extras'))
 */
export interface SumPattern {
	readonly type: 'sum-pattern';
	readonly elements: readonly SumPatternElement[];
}

/**
 * N-ary product pattern - matches products with multiple factors (commutative)
 *
 * Flattens the product and attempts to match elements in any order (due to commutativity).
 * Can include sequence wildcards to capture remaining factors.
 *
 * @example
 * // Match coefficient * variables pattern
 * P.prod(P._('coeff', P.isNumber()), P.__('vars'))
 */
export interface ProductPattern {
	readonly type: 'product-pattern';
	readonly elements: readonly ProductPatternElement[];
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
	| RelationPattern
	| SumPattern
	| ProductPattern;

// =============================================================================
// Pattern Type Extraction
// =============================================================================

/**
 * Extract the type literal from a Pattern
 */
export type PatternType = Pattern['type'];

// =============================================================================
// Sequence Binding Types
// =============================================================================

/**
 * Binding for a sequence captured in a sum context
 *
 * Stores signed terms to preserve sign information.
 */
export interface SumSequenceBinding {
	readonly kind: 'sum-sequence';
	readonly terms: readonly SignedTerm[];
}

/**
 * Binding for a sequence captured in a product context
 *
 * Stores raw factor nodes.
 */
export interface ProductSequenceBinding {
	readonly kind: 'product-sequence';
	readonly factors: readonly MathNode[];
}

/**
 * Union of sequence binding types
 */
export type SequenceBinding = SumSequenceBinding | ProductSequenceBinding;

/**
 * Value that can be bound to a wildcard or sequence
 */
export type BindingValue = MathNode | SequenceBinding;

// =============================================================================
// Match Result Types
// =============================================================================

/**
 * Alias for bindings map - maps wildcard names to matched values
 *
 * Regular wildcards bind to MathNode, sequence wildcards bind to SequenceBinding.
 */
export type MatchBindings = ReadonlyMap<string, BindingValue>;

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

/**
 * Checks if a pattern is a sum pattern
 */
export function isSumPattern(pattern: Pattern): pattern is SumPattern {
	return pattern.type === 'sum-pattern';
}

/**
 * Checks if a pattern is a product pattern
 */
export function isProductPattern(pattern: Pattern): pattern is ProductPattern {
	return pattern.type === 'product-pattern';
}

/**
 * Checks if a pattern element is a sequence pattern (1+ terms)
 */
export function isSequencePattern(
	element: SumPatternElement | ProductPatternElement
): element is SequencePattern {
	return (element as SequencePattern).type === 'sequence';
}

/**
 * Checks if a pattern element is an optional sequence pattern (0+ terms)
 */
export function isOptionalSequencePattern(
	element: SumPatternElement | ProductPatternElement
): element is OptionalSequencePattern {
	return (element as OptionalSequencePattern).type === 'optional-sequence';
}

/**
 * Checks if a pattern element is any sequence pattern (sequence or optional-sequence)
 */
export function isAnySequencePattern(
	element: SumPatternElement | ProductPatternElement
): element is SequencePattern | OptionalSequencePattern {
	return isSequencePattern(element) || isOptionalSequencePattern(element);
}

// =============================================================================
// Type Guards for Bindings
// =============================================================================

/**
 * Checks if a binding value is a SumSequenceBinding
 */
export function isSumSequenceBinding(value: BindingValue): value is SumSequenceBinding {
	return typeof value === 'object' && 'kind' in value && value.kind === 'sum-sequence';
}

/**
 * Checks if a binding value is a ProductSequenceBinding
 */
export function isProductSequenceBinding(value: BindingValue): value is ProductSequenceBinding {
	return typeof value === 'object' && 'kind' in value && value.kind === 'product-sequence';
}

/**
 * Checks if a binding value is any SequenceBinding
 */
export function isSequenceBinding(value: BindingValue): value is SequenceBinding {
	return isSumSequenceBinding(value) || isProductSequenceBinding(value);
}

/**
 * Checks if a binding value is a MathNode (not a sequence binding)
 */
export function isMathNodeBinding(value: BindingValue): value is MathNode {
	return !isSequenceBinding(value);
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

/**
 * Checks if a constraint is a numeric type constraint
 */
export function isNumericTypeConstraint(
	constraint: PatternConstraint
): constraint is NumericTypeConstraint {
	return constraint.kind === 'numericType';
}
