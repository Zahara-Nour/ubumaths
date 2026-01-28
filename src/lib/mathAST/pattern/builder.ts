/**
 * Pattern Builder API for MathAST
 *
 * Provides a fluent API for constructing patterns through the P namespace.
 * Follows the factory pattern established in the MathAST factory.
 */

import type { MathNode, MathNodeType, RelationType } from '../types';
import { parsePattern } from '../parser/custom/pattern-parser';
import { parseRule } from '../parser/custom/rule-parser';
import { number as astNumber, variable as astVariable } from '../factory';
import type {
	// Pattern types
	Pattern,
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
	// Constraint types
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
	NumericTypeConstraint,
	// Rule types
	Rule,
	RuleOptions,
	MatchBindings
} from './types';
import type { NumericType } from '../numtype/types';

// =============================================================================
// Wildcard Pattern Builders
// =============================================================================

/**
 * Creates a wildcard pattern that matches any expression
 *
 * @param name - Name to bind the matched expression to
 * @param constraint - Optional constraint the matched expression must satisfy
 * @returns A wildcard pattern
 *
 * @example
 * // Match any expression and bind to 'x'
 * P._('x')
 *
 * // Match any number and bind to 'n'
 * P._('n', P.isNumber())
 *
 * // Match any positive integer and bind to 'k'
 * P._('k', P.and(P.isInteger(), P.isPositive()))
 */
function wildcard(name: string, constraint?: PatternConstraint): WildcardPattern {
	return {
		type: 'wildcard',
		name,
		...(constraint !== undefined && { constraint })
	} as const;
}

// =============================================================================
// Sequence Pattern Builders
// =============================================================================

/**
 * Creates a sequence pattern that captures 1 or more consecutive terms/factors
 *
 * Used within P.sum() or P.prod() to capture multiple elements.
 * The sequence must capture at least one element.
 *
 * @param name - Name to bind the captured sequence to
 * @param constraint - Optional constraint that each element must satisfy
 * @returns A sequence pattern
 *
 * @example
 * // Match a + <rest> where rest is 1+ terms
 * P.sum(P._('a'), P.__('rest'))
 *
 * // Match coeff * <vars> where each var must be a variable
 * P.prod(P._('coeff', P.isNumber()), P.__('vars', P.isVariable()))
 */
function seqWildcard(name: string, constraint?: PatternConstraint): SequencePattern {
	return {
		type: 'sequence',
		name,
		...(constraint !== undefined && { constraint })
	} as const;
}

/**
 * Creates an optional sequence pattern that captures 0 or more consecutive terms/factors
 *
 * Used within P.sum() or P.prod() to capture optional elements.
 * Can capture zero elements (empty sequence).
 *
 * @param name - Name to bind the captured sequence to
 * @param constraint - Optional constraint that each element must satisfy
 * @returns An optional sequence pattern
 *
 * @example
 * // Match a + b + <extras> where extras can be empty
 * P.sum(P._('a'), P._('b'), P.___('extras'))
 */
function optSeqWildcard(name: string, constraint?: PatternConstraint): OptionalSequencePattern {
	return {
		type: 'optional-sequence',
		name,
		...(constraint !== undefined && { constraint })
	} as const;
}

// =============================================================================
// N-ary Pattern Builders
// =============================================================================

/**
 * Creates an n-ary sum pattern for matching sums with multiple terms
 *
 * Flattens addition/subtraction chains and matches elements in any order
 * (due to commutativity of addition). Can include sequence wildcards.
 *
 * @param elements - Pattern elements (wildcards, literals, or sequence patterns)
 * @returns A sum pattern
 *
 * @example
 * // Match a + <rest>
 * P.sum(P._('first'), P.__('rest'))
 *
 * // Match a + b with optional extras
 * P.sum(P._('a'), P._('b'), P.___('extras'))
 *
 * // Match sum where first term is a number
 * P.sum(P._('n', P.isNumber()), P.__('rest'))
 */
function sum(...elements: SumPatternElement[]): SumPattern {
	return {
		type: 'sum-pattern',
		elements
	} as const;
}

/**
 * Creates an n-ary product pattern for matching products with multiple factors
 *
 * Flattens multiplication chains and matches elements in any order
 * (due to commutativity of multiplication). Can include sequence wildcards.
 *
 * @param elements - Pattern elements (wildcards, literals, or sequence patterns)
 * @returns A product pattern
 *
 * @example
 * // Match coeff * <vars>
 * P.prod(P._('coeff', P.isNumber()), P.__('vars'))
 *
 * // Match a * b with optional extras
 * P.prod(P._('a'), P._('b'), P.___('extras'))
 */
function prod(...elements: ProductPatternElement[]): ProductPattern {
	return {
		type: 'product-pattern',
		elements
	} as const;
}

// =============================================================================
// Literal Pattern Builders
// =============================================================================

/**
 * Creates a literal pattern matching an exact number value
 *
 * @param value - The numeric value to match
 * @returns A literal pattern with a number node
 *
 * @example
 * P.num(0)  // Matches exactly 0
 * P.num(1)  // Matches exactly 1
 */
function num(value: number): LiteralPattern {
	return {
		type: 'literal',
		node: astNumber(String(value))
	} as const;
}

/**
 * Creates a literal pattern matching an exact variable by name
 *
 * @param name - The variable name to match
 * @returns A literal pattern with a variable node
 *
 * @example
 * P.var('x')  // Matches exactly the variable x
 * P.var('y')  // Matches exactly the variable y
 */
function varPattern(name: string): LiteralPattern {
	return {
		type: 'literal',
		node: astVariable(name)
	} as const;
}

/**
 * Creates a literal pattern matching an exact MathNode
 *
 * @param node - The MathNode to match exactly
 * @returns A literal pattern
 *
 * @example
 * P.lit(someNode)  // Matches exactly that node
 */
function lit(node: MathNode): LiteralPattern {
	return {
		type: 'literal',
		node
	} as const;
}

// =============================================================================
// Structural Pattern Builders
// =============================================================================

/**
 * Creates an addition pattern: left + right
 *
 * @param left - Pattern for left operand
 * @param right - Pattern for right operand
 * @returns An addition pattern
 *
 * @example
 * // Match x + y
 * P.add(P._('x'), P._('y'))
 *
 * // Match n + 0 (for identity rule)
 * P.add(P._('n'), P.num(0))
 */
function add(left: Pattern, right: Pattern): AdditionPattern {
	return {
		type: 'addition-pattern',
		left,
		right
	} as const;
}

/**
 * Creates a subtraction pattern: left - right
 *
 * @param left - Pattern for left operand
 * @param right - Pattern for right operand
 * @returns A subtraction pattern
 *
 * @example
 * // Match x - y
 * P.sub(P._('x'), P._('y'))
 *
 * // Match x - 0
 * P.sub(P._('x'), P.num(0))
 */
function sub(left: Pattern, right: Pattern): SubtractionPattern {
	return {
		type: 'subtraction-pattern',
		left,
		right
	} as const;
}

/**
 * Creates a multiplication pattern: left * right
 *
 * @param left - Pattern for left operand
 * @param right - Pattern for right operand
 * @returns A multiplication pattern
 *
 * @example
 * // Match x * y
 * P.mul(P._('x'), P._('y'))
 *
 * // Match n * 1 (for identity rule)
 * P.mul(P._('n'), P.num(1))
 *
 * // Match n * 0 (for zero rule)
 * P.mul(P._('n'), P.num(0))
 */
function mul(left: Pattern, right: Pattern): MultiplicationPattern {
	return {
		type: 'multiplication-pattern',
		left,
		right
	} as const;
}

/**
 * Creates a division pattern: numerator / denominator
 *
 * @param numerator - Pattern for numerator
 * @param denominator - Pattern for denominator
 * @returns A division pattern
 *
 * @example
 * // Match x / y
 * P.div(P._('x'), P._('y'))
 *
 * // Match x / 1
 * P.div(P._('x'), P.num(1))
 *
 * // Match 0 / x (where x is nonzero)
 * P.div(P.num(0), P._('x', P.isNonzero()))
 */
function div(numerator: Pattern, denominator: Pattern): DivisionPattern {
	return {
		type: 'division-pattern',
		numerator,
		denominator
	} as const;
}

/**
 * Creates a power/superscript pattern: base^exponent
 *
 * @param base - Pattern for base
 * @param exponent - Pattern for exponent
 * @returns A superscript pattern
 *
 * @example
 * // Match x^n
 * P.pow(P._('x'), P._('n'))
 *
 * // Match x^0 (result is 1)
 * P.pow(P._('x'), P.num(0))
 *
 * // Match x^1 (result is x)
 * P.pow(P._('x'), P.num(1))
 */
function pow(base: Pattern, exponent: Pattern): SuperscriptPattern {
	return {
		type: 'superscript-pattern',
		base,
		exponent
	} as const;
}

/**
 * Creates a function pattern: name(args...) with optional power
 *
 * @param name - Function name to match
 * @param args - Patterns for function arguments
 * @param options - Optional settings (power pattern for matching sin²(x), etc.)
 * @returns A function pattern
 *
 * @example
 * // Match sin(x)
 * P.func('sin', [P._('x')])
 *
 * // Match sin²(x)
 * P.func('sin', [P._('x')], { power: P.num(2) })
 *
 * // Match sin^n(x) where n is any expression
 * P.func('sin', [P._('x')], { power: P._('n') })
 *
 * // Match log(x) with any base
 * P.func('log', [P._('x')])
 *
 * // Match max(a, b)
 * P.func('max', [P._('a'), P._('b')])
 */
function func(name: string, args: Pattern[], options?: { power?: Pattern }): FunctionPattern {
	return {
		type: 'function-pattern',
		name,
		args,
		...(options?.power !== undefined && { power: options.power })
	} as const;
}

/**
 * Creates a negation pattern: -operand
 *
 * @param operand - Pattern for the negated expression
 * @returns An opposite pattern
 *
 * @example
 * // Match -x
 * P.neg(P._('x'))
 *
 * // Match -(-x) (double negation)
 * P.neg(P.neg(P._('x')))
 */
function neg(operand: Pattern): OppositePattern {
	return {
		type: 'opposite-pattern',
		operand
	} as const;
}

/**
 * Creates a positive sign pattern: +operand
 *
 * @param operand - Pattern for the positive expression
 * @returns A positive pattern
 *
 * @example
 * // Match +x
 * P.pos(P._('x'))
 */
function pos(operand: Pattern): PositivePattern {
	return {
		type: 'positive-pattern',
		operand
	} as const;
}

/**
 * Creates a delimiter/parentheses pattern: (content)
 *
 * @param content - Pattern for the content inside delimiters
 * @returns A delimiter pattern
 *
 * @example
 * // Match (x)
 * P.paren(P._('x'))
 *
 * // Match (a + b)
 * P.paren(P.add(P._('a'), P._('b')))
 */
function paren(content: Pattern): DelimiterPattern {
	return {
		type: 'delimiter-pattern',
		content
	} as const;
}

/**
 * Creates a subscript pattern: base_subscript
 *
 * @param base - Pattern for base
 * @param subscriptPattern - Pattern for subscript
 * @returns A subscript pattern
 *
 * @example
 * // Match x_n
 * P.subscript(P._('x'), P._('n'))
 */
function subscript(base: Pattern, subscriptPattern: Pattern): SubscriptPattern {
	return {
		type: 'subscript-pattern',
		base,
		subscript: subscriptPattern
	} as const;
}

/**
 * Creates a relation pattern: left relation right
 *
 * @param relation - The relation type to match, or 'any' for any relation
 * @param left - Pattern for left operand
 * @param right - Pattern for right operand
 * @returns A relation pattern
 *
 * @example
 * // Match x = y
 * P.rel('=', P._('x'), P._('y'))
 *
 * // Match any relation between x and y
 * P.rel('any', P._('x'), P._('y'))
 *
 * // Match x < y
 * P.rel('<', P._('x'), P._('y'))
 */
function rel(relation: RelationType | 'any', left: Pattern, right: Pattern): RelationPattern {
	return {
		type: 'relation-pattern',
		relation,
		left,
		right
	} as const;
}

// =============================================================================
// Constraint Builders
// =============================================================================

/**
 * Creates a type constraint
 *
 * @param types - One or more MathNode types to match
 * @returns A type constraint
 *
 * @example
 * P.isType('number')
 * P.isType('number', 'variable')
 */
function isType(...types: MathNodeType[]): TypeConstraint {
	return {
		kind: 'type',
		nodeType: types.length === 1 ? types[0] : types
	} as const;
}

/**
 * Creates a number constraint
 *
 * @returns A number constraint
 *
 * @example
 * P._('n', P.isNumber())  // Match any number
 */
function isNumber(): NumberConstraint {
	return { kind: 'number' } as const;
}

/**
 * Creates a variable constraint
 *
 * @returns A variable constraint
 *
 * @example
 * P._('x', P.isVariable())  // Match any variable
 */
function isVariable(): VariableConstraint {
	return { kind: 'variable' } as const;
}

/**
 * Creates a positive constraint
 *
 * @returns A positive constraint
 *
 * @example
 * P._('n', P.isPositive())  // Match positive values
 */
function isPositive(): PositiveConstraint {
	return { kind: 'positive' } as const;
}

/**
 * Creates a negative constraint
 *
 * @returns A negative constraint
 *
 * @example
 * P._('n', P.isNegative())  // Match negative values
 */
function isNegative(): NegativeConstraint {
	return { kind: 'negative' } as const;
}

/**
 * Creates a nonzero constraint
 *
 * @returns A nonzero constraint
 *
 * @example
 * P._('d', P.isNonzero())  // Match nonzero values (useful for denominators)
 */
function isNonzero(): NonzeroConstraint {
	return { kind: 'nonzero' } as const;
}

/**
 * Creates an integer constraint
 *
 * @returns An integer constraint
 *
 * @example
 * P._('k', P.isInteger())  // Match integer values
 */
function isInteger(): IntegerConstraint {
	return { kind: 'integer' } as const;
}

/**
 * Creates a freeOf constraint (expression does not contain specified variables)
 *
 * @param variables - Variable names that must not appear in the expression
 * @returns A freeOf constraint
 *
 * @example
 * P._('c', P.isFreeOf('x'))  // Match expressions not containing x
 * P._('k', P.isFreeOf('x', 'y'))  // Match expressions containing neither x nor y
 */
function isFreeOf(...variables: string[]): FreeOfConstraint {
	return {
		kind: 'freeOf',
		variables
	} as const;
}

/**
 * Creates a custom constraint with a predicate function
 *
 * @param predicate - Function that returns true if the node matches
 * @param label - Optional label for debugging/display
 * @returns A custom constraint
 *
 * @example
 * P._('n', P.custom(
 *   (node) => node.type === 'number' && parseFloat(node.value) > 10,
 *   'greater than 10'
 * ))
 */
function custom(predicate: (node: MathNode) => boolean, label?: string): CustomConstraint {
	return {
		kind: 'custom',
		predicate,
		...(label !== undefined && { label })
	} as const;
}

/**
 * Creates an AND constraint (all constraints must match)
 *
 * @param constraints - Constraints that must all be satisfied
 * @returns An AND constraint
 *
 * @example
 * P._('n', P.and(P.isInteger(), P.isPositive()))  // Match positive integers
 */
function and(...constraints: PatternConstraint[]): AndConstraint {
	return {
		kind: 'and',
		constraints
	} as const;
}

/**
 * Creates an OR constraint (at least one constraint must match)
 *
 * @param constraints - Constraints where at least one must be satisfied
 * @returns An OR constraint
 *
 * @example
 * P._('x', P.or(P.isNumber(), P.isVariable()))  // Match number or variable
 */
function or(...constraints: PatternConstraint[]): OrConstraint {
	return {
		kind: 'or',
		constraints
	} as const;
}

/**
 * Creates a NOT constraint (constraint must not match)
 *
 * @param constraint - Constraint that must not be satisfied
 * @returns A NOT constraint
 *
 * @example
 * P._('x', P.not(P.isNumber()))  // Match anything except numbers
 */
function not(constraint: PatternConstraint): NotConstraint {
	return {
		kind: 'not',
		constraint
	} as const;
}

// =============================================================================
// Numeric Type Constraint Builders
// =============================================================================

/**
 * Creates a numeric type constraint for integer expressions.
 *
 * Uses the numtype inference system to determine if an expression
 * has integer type based on its structure.
 *
 * @param strict - If true, requires exact 'integer' type; if false (default), allows subtypes
 * @returns A numeric type constraint for integers
 *
 * @example
 * P._('n', P.isIntegerType())     // Match any integer expression
 * P._('n', P.isIntegerType(true)) // Match only exact integer type
 */
function isIntegerType(strict?: boolean): NumericTypeConstraint {
	return {
		kind: 'numericType',
		numericType: 'integer',
		...(strict !== undefined && { strict })
	} as const;
}

/**
 * Creates a numeric type constraint for rational expressions.
 *
 * When strict is false (default), this matches integers as well
 * since integer is a subtype of rational.
 *
 * @param strict - If true, requires exact 'rational' type; if false, allows subtypes (integer)
 * @returns A numeric type constraint for rationals
 *
 * @example
 * P._('r', P.isRationalType())     // Match integer or rational expressions
 * P._('r', P.isRationalType(true)) // Match only exactly rational (like 1/2)
 */
function isRationalType(strict?: boolean): NumericTypeConstraint {
	return {
		kind: 'numericType',
		numericType: 'rational',
		...(strict !== undefined && { strict })
	} as const;
}

/**
 * Creates a numeric type constraint for algebraic expressions.
 *
 * Algebraic numbers include integers, rationals, and irrational algebraics (like √2).
 *
 * @param strict - If true, requires exact 'algebraic' type; if false, allows subtypes
 * @returns A numeric type constraint for algebraics
 *
 * @example
 * P._('a', P.isAlgebraicType())  // Match integer, rational, or irrational algebraic
 */
function isAlgebraicType(strict?: boolean): NumericTypeConstraint {
	return {
		kind: 'numericType',
		numericType: 'algebraic',
		...(strict !== undefined && { strict })
	} as const;
}

/**
 * Creates a numeric type constraint for real expressions.
 *
 * Real numbers include all algebraic and transcendental numbers.
 *
 * @param strict - If true, requires exact 'real' type; if false, allows subtypes
 * @returns A numeric type constraint for reals
 *
 * @example
 * P._('x', P.isRealType())  // Match any real expression
 */
function isRealType(strict?: boolean): NumericTypeConstraint {
	return {
		kind: 'numericType',
		numericType: 'real',
		...(strict !== undefined && { strict })
	} as const;
}

/**
 * Creates a numeric type constraint for transcendental expressions.
 *
 * Transcendental numbers include π, e, and results of transcendental
 * functions on algebraic inputs (sin(1), ln(2), etc.).
 *
 * @param strict - If true, requires exact 'transcendental' type
 * @returns A numeric type constraint for transcendentals
 *
 * @example
 * P._('t', P.isTranscendentalType())  // Match π, e, sin(1), etc.
 */
function isTranscendentalType(strict?: boolean): NumericTypeConstraint {
	return {
		kind: 'numericType',
		numericType: 'transcendental',
		...(strict !== undefined && { strict })
	} as const;
}

/**
 * Creates a numeric type constraint for complex expressions.
 *
 * @param strict - If true, requires exact 'complex' type; if false, allows subtypes
 * @returns A numeric type constraint for complex numbers
 *
 * @example
 * P._('z', P.isComplexType())  // Match complex expressions like √(-1)
 */
function isComplexType(strict?: boolean): NumericTypeConstraint {
	return {
		kind: 'numericType',
		numericType: 'complex',
		...(strict !== undefined && { strict })
	} as const;
}

/**
 * Creates a numeric type constraint for any specific type.
 *
 * @param numericType - The numeric type to match
 * @param strict - If true, requires exact type match; if false, allows subtypes
 * @returns A numeric type constraint
 *
 * @example
 * P._('x', P.isNumType('irrational_algebraic'))  // Match √2, ∛5, etc.
 */
function isNumType(numericType: NumericType, strict?: boolean): NumericTypeConstraint {
	return {
		kind: 'numericType',
		numericType,
		...(strict !== undefined && { strict })
	} as const;
}

// =============================================================================
// Rule Builder
// =============================================================================

/**
 * Creates a transformation rule
 *
 * @param pattern - Pattern to match
 * @param replacement - Pattern or function to generate replacement
 * @param options - Optional name, condition, and priority
 * @returns A Rule object
 *
 * @example
 * // x + 0 -> x
 * P.rule(
 *   P.add(P._('x'), P.num(0)),
 *   P._('x'),
 *   { name: 'additive-identity' }
 * )
 *
 * // x * 0 -> 0
 * P.rule(
 *   P.mul(P._('x'), P.num(0)),
 *   P.num(0),
 *   { name: 'multiply-by-zero' }
 * )
 *
 * // With condition: x / x -> 1 (when x != 0)
 * P.rule(
 *   P.div(P._('x'), P._('x')),
 *   P.num(1),
 *   {
 *     name: 'self-division',
 *     condition: (bindings) => {
 *       const x = bindings.get('x');
 *       return x?.type !== 'number' || x.value !== '0';
 *     }
 *   }
 * )
 */
function rule(
	pattern: Pattern,
	replacement: Pattern | ((bindings: MatchBindings) => MathNode),
	options?: RuleOptions
): Rule {
	return {
		name: options?.name ?? 'unnamed-rule',
		pattern,
		replacement,
		...(options?.condition !== undefined && { condition: options.condition }),
		...(options?.priority !== undefined && { priority: options.priority })
	} as const;
}

// =============================================================================
// Pattern Builder Namespace
// =============================================================================

/**
 * Pattern builder namespace
 *
 * Provides a fluent API for constructing patterns for matching MathAST expressions.
 *
 * @example
 * import { P } from './pattern';
 *
 * // Match x + 0
 * const pattern = P.add(P._('x'), P.num(0));
 *
 * // Match any number
 * const numPattern = P._('n', P.isNumber());
 *
 * // Match sin(x) where x is any expression
 * const sinPattern = P.func('sin', [P._('x')]);
 *
 * // Parse pattern from string
 * const parsed = P.parse('_x + 0');
 */
export const P = {
	// Wildcards
	_: wildcard,
	__: seqWildcard,
	___: optSeqWildcard,

	// N-ary patterns
	sum,
	prod,

	// Literals
	num,
	var: varPattern,
	lit,

	// Structural patterns
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

	// Constraints
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

	// Numeric type constraints
	isIntegerType,
	isRationalType,
	isAlgebraicType,
	isRealType,
	isTranscendentalType,
	isComplexType,
	isNumType,

	// Rules
	rule,

	// Parsers
	parse: parsePattern,
	parseRule
} as const;

// =============================================================================
// Individual Exports
// =============================================================================

// Re-export individual functions for direct imports
export {
	wildcard,
	seqWildcard,
	optSeqWildcard,
	sum,
	prod,
	num,
	varPattern as varPat,
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
	// Numeric type constraints
	isIntegerType,
	isRationalType,
	isAlgebraicType,
	isRealType,
	isTranscendentalType,
	isComplexType,
	isNumType,
	rule
};
