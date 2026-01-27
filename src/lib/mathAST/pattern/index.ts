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
	// Sequence pattern types
	SequencePattern,
	OptionalSequencePattern,
	SumPattern,
	ProductPattern,
	SumPatternElement,
	ProductPatternElement,
	// Sequence binding types
	SumSequenceBinding,
	ProductSequenceBinding,
	SequenceBinding,
	BindingValue,
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
	// Sequence pattern type guards
	isSumPattern,
	isProductPattern,
	isSequencePattern,
	isOptionalSequencePattern,
	isAnySequencePattern,
	// Binding type guards
	isSumSequenceBinding,
	isProductSequenceBinding,
	isSequenceBinding,
	isMathNodeBinding,
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

// =============================================================================
// Parser Exports
// =============================================================================

export { parsePattern, PatternParseError } from '../parser/custom/pattern-parser';
export { parseRule, RuleParseError } from '../parser/custom/rule-parser';

// Export individual builder functions for direct imports
export {
	wildcard,
	seqWildcard,
	optSeqWildcard,
	sum,
	prod,
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

// =============================================================================
// Verification Exports
// =============================================================================

export { verifyForm, matchesForm, extractBindings } from './verify';
export type {
	VerifyFormResult,
	VerifyFormSuccess,
	VerifyFormFailure,
	VerifyFormOptions
} from './verify';
