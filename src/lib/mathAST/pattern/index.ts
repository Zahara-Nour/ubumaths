/**
 * Pattern Matching Module for MathAST
 *
 * Provides pattern types and builder API for matching against MathNode expressions.
 *
 * @example
 * ```typescript
 * import { P, type Pattern, type MatchResult } from './pattern';
 *
 * // Create a pattern for x + 0
 * const pattern = P.add(P._('x'), P.num(0));
 *
 * // Create a pattern with constraints
 * const numPattern = P._('n', P.isNumber());
 *
 * // Create a rule
 * const rule = P.rule(
 *   P.add(P._('x'), P.num(0)),
 *   P._('x'),
 *   { name: 'additive-identity' }
 * );
 * ```
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
	// Pattern constraint types
	PatternConstraint,
	TypeConstraint,
	NumberConstraint,
	VariableConstraint,
	PositiveConstraint,
	NegativeConstraint,
	NonzeroConstraint,
	IntegerConstraint,
	FreeOfConstraint,
	CustomConstraint,
	AndConstraint,
	OrConstraint,
	NotConstraint,
	// Pattern types
	Pattern,
	PatternType,
	WildcardPattern,
	LiteralPattern,
	AdditionPattern,
	SubtractionPattern,
	MultiplicationPattern,
	DivisionPattern,
	SuperscriptPattern,
	FunctionPattern,
	OppositePattern,
	PositivePattern,
	DelimiterPattern,
	SubscriptPattern,
	RelationPattern,
	// Match types
	MatchResult,
	MatchBindings,
	// Rule types
	Rule,
	RuleOptions
} from './types';

// =============================================================================
// Function/Value Exports
// =============================================================================

export {
	// Match result helpers
	successMatch,
	failMatch,
	EMPTY_BINDINGS,
	// Pattern type guards
	isWildcardPattern,
	isLiteralPattern,
	isAdditionPattern,
	isSubtractionPattern,
	isMultiplicationPattern,
	isDivisionPattern,
	isSuperscriptPattern,
	isFunctionPattern,
	isOppositePattern,
	isPositivePattern,
	isDelimiterPattern,
	isSubscriptPattern,
	isRelationPattern,
	isStructuralPattern,
	// Constraint type guards
	isTypeConstraint,
	isNumberConstraint,
	isVariableConstraint,
	isPositiveConstraint,
	isNegativeConstraint,
	isNonzeroConstraint,
	isIntegerConstraint,
	isFreeOfConstraint,
	isCustomConstraint,
	isAndConstraint,
	isOrConstraint,
	isNotConstraint
} from './types';

// =============================================================================
// Builder Exports
// =============================================================================

export { P } from './builder';

// Export individual builder functions for direct imports
export {
	wildcard,
	num,
	varPat,
	lit,
	add,
	sub,
	mul,
	div,
	pow,
	func,
	neg,
	pos,
	paren,
	subscript,
	rel,
	isType,
	isNumber,
	isVariable,
	isPositive,
	isNegative,
	isNonzero,
	isInteger,
	isFreeOf,
	custom,
	and,
	or,
	not,
	rule
} from './builder';

// =============================================================================
// Match Exports
// =============================================================================

export { match, nodesEqual, tryMatch, matches } from './match';

// =============================================================================
// Constraint Exports
// =============================================================================

export { checkConstraint, containsVariable, isFreeOfVariables } from './constraints';

// =============================================================================
// Rule Exports
// =============================================================================

export { createRule, instantiate, applyRule, applyRuleDeep, applyRules } from './rule';

// =============================================================================
// Rule Set Exports
// =============================================================================

export { arithmeticRules, powerRules, allRules } from './rule-sets';
