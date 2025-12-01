/**
 * MathAST Factory Functions
 *
 * Factory functions for creating immutable MathAST nodes.
 * All nodes are readonly and follow strict TypeScript typing.
 */

import type {
	AdditionNode,
	DelimiterNode,
	DelimiterSemantic,
	DelimiterType,
	DivisionDisplayStyle,
	DivisionNode,
	FunctionNode,
	GreekLetter,
	GreekLetterNode,
	MathNode,
	MathSymbol,
	MultiplicationDisplayStyle,
	MultiplicationNode,
	NodeMetadata,
	NumberNode,
	OppositeNode,
	PositiveNode,
	RelationNode,
	RelationType,
	SubscriptNode,
	SubtractionNode,
	SuperscriptNode,
	SymbolNode,
	UnitNode,
	VariableNode
} from './types';
import type { Unit } from './units/types';
import { parseOrThrow } from './units/parser';
import { unflattenRelationChain } from './flatten';

// =============================================================================
// Literal Factories
// =============================================================================

/**
 * Creates a number node
 * @param value - Numeric value as string (to preserve exact formatting)
 * @param metadata - Optional rendering hints
 */
export function number(value: string, metadata?: NodeMetadata): NumberNode {
	return {
		type: 'number',
		value,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a variable node
 * @param name - Variable name (single letter or multi-character identifier)
 * @param metadata - Optional rendering hints
 */
export function variable(name: string, metadata?: NodeMetadata): VariableNode {
	return {
		type: 'variable',
		name,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a Greek letter node
 * @param letter - Greek letter name (e.g., 'alpha', 'Beta')
 * @param metadata - Optional rendering hints
 */
export function greek(letter: GreekLetter, metadata?: NodeMetadata): GreekLetterNode {
	return {
		type: 'greek',
		letter,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a mathematical symbol node
 * @param symbol - Symbol name (e.g., 'infinity', 'partial')
 * @param metadata - Optional rendering hints
 */
export function symbol(sym: MathSymbol, metadata?: NodeMetadata): SymbolNode {
	return {
		type: 'symbol',
		symbol: sym,
		...(metadata && { metadata })
	} as const;
}

// =============================================================================
// Binary Operation Factories
// =============================================================================

/**
 * Creates an addition node: left + right
 * @param left - Left operand
 * @param right - Right operand
 * @param metadata - Optional rendering hints
 */
export function add(left: MathNode, right: MathNode, metadata?: NodeMetadata): AdditionNode {
	return {
		type: 'addition',
		left,
		right,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a subtraction node: left - right
 * @param left - Left operand
 * @param right - Right operand
 * @param metadata - Optional rendering hints
 */
export function subtract(
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): SubtractionNode {
	return {
		type: 'subtraction',
		left,
		right,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a multiplication node: left * right
 * @param left - Left operand
 * @param right - Right operand
 * @param displayStyle - How to render the multiplication ('implicit', 'dot', 'cross', 'star')
 * @param metadata - Optional rendering hints
 */
export function multiply(
	left: MathNode,
	right: MathNode,
	displayStyle: MultiplicationDisplayStyle,
	metadata?: NodeMetadata
): MultiplicationNode {
	return {
		type: 'multiplication',
		left,
		right,
		displayStyle,
		...(metadata && { metadata })
	} as const;
}

/**
 * Convenience: Creates implicit multiplication (e.g., 2x)
 */
export function implicitMultiply(
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): MultiplicationNode {
	return multiply(left, right, 'implicit', metadata);
}

/**
 * Creates a division node: numerator / denominator
 * @param numerator - Numerator
 * @param denominator - Denominator
 * @param displayStyle - How to render the division ('fraction', 'inline', 'ratio')
 * @param metadata - Optional rendering hints
 */
export function divide(
	numerator: MathNode,
	denominator: MathNode,
	displayStyle: DivisionDisplayStyle,
	metadata?: NodeMetadata
): DivisionNode {
	return {
		type: 'division',
		numerator,
		denominator,
		displayStyle,
		...(metadata && { metadata })
	} as const;
}

/**
 * Convenience: Creates a fraction (vertical division)
 */
export function fraction(
	numerator: MathNode,
	denominator: MathNode,
	metadata?: NodeMetadata
): DivisionNode {
	return divide(numerator, denominator, 'fraction', metadata);
}

// =============================================================================
// Unary Operation Factories
// =============================================================================

/**
 * Creates an opposite/negation node: -operand
 * @param operand - The value to negate
 * @param metadata - Optional rendering hints
 */
export function opposite(operand: MathNode, metadata?: NodeMetadata): OppositeNode {
	return {
		type: 'opposite',
		operand,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a positive sign node: +operand
 * @param operand - The value with explicit positive sign
 * @param metadata - Optional rendering hints
 */
export function positive(operand: MathNode, metadata?: NodeMetadata): PositiveNode {
	return {
		type: 'positive',
		operand,
		...(metadata && { metadata })
	} as const;
}

// =============================================================================
// Function Factory
// =============================================================================

/**
 * Creates a function application node
 * @param name - Function name (e.g., 'sin', 'log', 'f')
 * @param args - Function arguments
 * @param options - Optional power and base (for log_base or f^2)
 * @param metadata - Optional rendering hints
 */
export function func(
	name: string,
	args: readonly MathNode[],
	options?: { power?: MathNode; base?: MathNode },
	metadata?: NodeMetadata
): FunctionNode {
	return {
		type: 'function',
		name,
		args,
		...(options?.power && { power: options.power }),
		...(options?.base && { base: options.base }),
		...(metadata && { metadata })
	} as const;
}

/**
 * Convenience: Creates sin(arg)
 */
export function sin(arg: MathNode, metadata?: NodeMetadata): FunctionNode {
	return func('sin', [arg], undefined, metadata);
}

/**
 * Convenience: Creates cos(arg)
 */
export function cos(arg: MathNode, metadata?: NodeMetadata): FunctionNode {
	return func('cos', [arg], undefined, metadata);
}

/**
 * Convenience: Creates tan(arg)
 */
export function tan(arg: MathNode, metadata?: NodeMetadata): FunctionNode {
	return func('tan', [arg], undefined, metadata);
}

/**
 * Convenience: Creates ln(arg)
 */
export function ln(arg: MathNode, metadata?: NodeMetadata): FunctionNode {
	return func('ln', [arg], undefined, metadata);
}

/**
 * Convenience: Creates log(arg) or log_base(arg)
 */
export function log(arg: MathNode, base?: MathNode, metadata?: NodeMetadata): FunctionNode {
	return func('log', [arg], base ? { base } : undefined, metadata);
}

/**
 * Convenience: Creates exp(arg)
 */
export function exp(arg: MathNode, metadata?: NodeMetadata): FunctionNode {
	return func('exp', [arg], undefined, metadata);
}

/**
 * Convenience: Creates sqrt(arg)
 */
export function sqrt(arg: MathNode, metadata?: NodeMetadata): FunctionNode {
	return func('sqrt', [arg], undefined, metadata);
}

/**
 * Convenience: Creates abs(arg)
 */
export function abs(arg: MathNode, metadata?: NodeMetadata): FunctionNode {
	return func('abs', [arg], undefined, metadata);
}

// =============================================================================
// Structural Factories
// =============================================================================

/**
 * Creates a delimiter node (content surrounded by delimiters)
 * @param type - Type of delimiter ('parentheses', 'brackets', 'braces', etc.)
 * @param content - Content inside delimiters
 * @param semantic - Optional semantic meaning ('grouping', 'interval', 'set', etc.)
 * @param metadata - Optional rendering hints
 */
export function delimiter(
	type: DelimiterType,
	content: MathNode,
	semantic?: DelimiterSemantic,
	metadata?: NodeMetadata
): DelimiterNode {
	return {
		type: 'delimiter',
		delimiters: type,
		content,
		...(semantic && { semantic }),
		...(metadata && { metadata })
	} as const;
}

/**
 * Convenience: Creates parentheses (content)
 */
export function parentheses(content: MathNode, metadata?: NodeMetadata): DelimiterNode {
	return delimiter('parentheses', content, 'grouping', metadata);
}

/**
 * Convenience: Creates brackets [content]
 */
export function brackets(content: MathNode, metadata?: NodeMetadata): DelimiterNode {
	return delimiter('brackets', content, undefined, metadata);
}

/**
 * Convenience: Creates braces {content}
 */
export function braces(content: MathNode, metadata?: NodeMetadata): DelimiterNode {
	return delimiter('braces', content, 'set', metadata);
}

/**
 * Creates a subscript node: base_subscript
 * @param base - Base expression
 * @param subscript - Subscript expression
 * @param metadata - Optional rendering hints
 */
export function subscript(
	base: MathNode,
	subscript: MathNode,
	metadata?: NodeMetadata
): SubscriptNode {
	return {
		type: 'subscript',
		base,
		subscript,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a superscript node: base^superscript
 * @param base - Base expression
 * @param superscript - Superscript/exponent expression
 * @param metadata - Optional rendering hints
 */
export function superscript(
	base: MathNode,
	superscript: MathNode,
	metadata?: NodeMetadata
): SuperscriptNode {
	return {
		type: 'superscript',
		base,
		superscript,
		...(metadata && { metadata })
	} as const;
}

/**
 * Convenience: Alias for superscript (power notation)
 */
export function power(
	base: MathNode,
	exponent: MathNode,
	metadata?: NodeMetadata
): SuperscriptNode {
	return superscript(base, exponent, metadata);
}

// =============================================================================
// Relation Factory
// =============================================================================

/**
 * Creates a relation node: left relation right
 * @param type - Relation type ('=', '<', '>', etc.)
 * @param left - Left expression
 * @param right - Right expression
 * @param metadata - Optional rendering hints
 */
export function relation(
	type: RelationType,
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): RelationNode {
	return {
		type: 'relation',
		relation: type,
		left,
		right,
		...(metadata && { metadata })
	} as const;
}

/**
 * Convenience: Creates equals relation (left = right)
 */
export function equals(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('=', left, right, metadata);
}

/**
 * Convenience: Creates less than relation (left < right)
 */
export function lessThan(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('<', left, right, metadata);
}

/**
 * Convenience: Creates greater than relation (left > right)
 */
export function greaterThan(
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): RelationNode {
	return relation('>', left, right, metadata);
}

/**
 * Convenience: Creates less than or equal relation (left <= right)
 */
export function lessThanOrEqual(
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): RelationNode {
	return relation('<=', left, right, metadata);
}

/**
 * Convenience: Creates greater than or equal relation (left >= right)
 */
export function greaterThanOrEqual(
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): RelationNode {
	return relation('>=', left, right, metadata);
}

/**
 * Convenience: Creates not equal relation (left != right)
 */
export function notEquals(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('!=', left, right, metadata);
}

/**
 * Convenience: Creates approximately equal relation (left ≈ right)
 */
export function approx(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('≈', left, right, metadata);
}

/**
 * Convenience: Creates congruent relation (left ≡ right)
 */
export function congruent(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('≡', left, right, metadata);
}

/**
 * Convenience: Creates element of relation (left ∈ right)
 */
export function elementOf(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('∈', left, right, metadata);
}

/**
 * Convenience: Creates not element of relation (left ∉ right)
 */
export function notElementOf(
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): RelationNode {
	return relation('∉', left, right, metadata);
}

/**
 * Convenience: Creates subset relation (left ⊂ right)
 */
export function subset(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('⊂', left, right, metadata);
}

/**
 * Convenience: Creates subset or equal relation (left ⊆ right)
 */
export function subsetOrEqual(
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): RelationNode {
	return relation('⊆', left, right, metadata);
}

/**
 * Convenience: Creates superset relation (left ⊃ right)
 */
export function superset(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('⊃', left, right, metadata);
}

/**
 * Convenience: Creates superset or equal relation (left ⊇ right)
 */
export function supersetOrEqual(
	left: MathNode,
	right: MathNode,
	metadata?: NodeMetadata
): RelationNode {
	return relation('⊇', left, right, metadata);
}

/**
 * Convenience: Creates implies relation (left ⟹ right)
 */
export function implies(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('⟹', left, right, metadata);
}

/**
 * Convenience: Creates if and only if relation (left ⟺ right)
 */
export function iff(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode {
	return relation('⟺', left, right, metadata);
}

// =============================================================================
// Relation Chain Factories
// =============================================================================

/**
 * Creates a relation chain from arrays of operands and relations.
 * Uses LEFT associativity: a < b < c = ((a < b) < c)
 *
 * @param operands - Array of operand nodes (at least 2)
 * @param relations - Array of relation types (length = operands.length - 1)
 * @param metadata - Optional rendering hints (applied to outermost relation)
 * @throws Error if operands.length < 2 or relations.length !== operands.length - 1
 *
 * @example
 * // a < b < c
 * relationChain([a, b, c], ['<', '<'])
 *
 * // a <= b < c (mixed)
 * relationChain([a, b, c], ['<=', '<'])
 */
export function relationChain(
	operands: readonly MathNode[],
	relations: readonly RelationType[],
	metadata?: NodeMetadata
): RelationNode {
	if (operands.length < 2) {
		throw new Error('relationChain requires at least 2 operands');
	}
	if (relations.length !== operands.length - 1) {
		throw new Error(
			`relationChain: expected ${operands.length - 1} relations for ${operands.length} operands, got ${relations.length}`
		);
	}

	const result = unflattenRelationChain(operands, relations);
	if (!result) {
		throw new Error('relationChain: failed to build relation chain');
	}

	// Apply metadata to outermost node if provided
	if (metadata) {
		return { ...result, metadata } as const;
	}
	return result;
}

/**
 * Creates an equality chain: a = b = c = ...
 * @param operands - At least 2 operand nodes
 * @throws Error if less than 2 operands
 */
export function equalsChain(...operands: MathNode[]): RelationNode {
	if (operands.length < 2) {
		throw new Error('equalsChain requires at least 2 operands');
	}
	return relationChain(operands, Array(operands.length - 1).fill('='));
}

/**
 * Creates a less-than chain: a < b < c < ...
 * @param operands - At least 2 operand nodes
 * @throws Error if less than 2 operands
 */
export function lessThanChain(...operands: MathNode[]): RelationNode {
	if (operands.length < 2) {
		throw new Error('lessThanChain requires at least 2 operands');
	}
	return relationChain(operands, Array(operands.length - 1).fill('<'));
}

/**
 * Creates a less-than-or-equal chain: a <= b <= c <= ...
 * @param operands - At least 2 operand nodes
 * @throws Error if less than 2 operands
 */
export function lessThanOrEqualChain(...operands: MathNode[]): RelationNode {
	if (operands.length < 2) {
		throw new Error('lessThanOrEqualChain requires at least 2 operands');
	}
	return relationChain(operands, Array(operands.length - 1).fill('<='));
}

/**
 * Creates a greater-than chain: a > b > c > ...
 * @param operands - At least 2 operand nodes
 * @throws Error if less than 2 operands
 */
export function greaterThanChain(...operands: MathNode[]): RelationNode {
	if (operands.length < 2) {
		throw new Error('greaterThanChain requires at least 2 operands');
	}
	return relationChain(operands, Array(operands.length - 1).fill('>'));
}

/**
 * Creates a greater-than-or-equal chain: a >= b >= c >= ...
 * @param operands - At least 2 operand nodes
 * @throws Error if less than 2 operands
 */
export function greaterThanOrEqualChain(...operands: MathNode[]): RelationNode {
	if (operands.length < 2) {
		throw new Error('greaterThanOrEqualChain requires at least 2 operands');
	}
	return relationChain(operands, Array(operands.length - 1).fill('>='));
}

/**
 * Creates an implication chain: P => Q => R => ...
 * @param operands - At least 2 operand nodes
 * @throws Error if less than 2 operands
 */
export function impliesChain(...operands: MathNode[]): RelationNode {
	if (operands.length < 2) {
		throw new Error('impliesChain requires at least 2 operands');
	}
	return relationChain(operands, Array(operands.length - 1).fill('⟹'));
}

/**
 * Creates an if-and-only-if (equivalence) chain: P <=> Q <=> R <=> ...
 * @param operands - At least 2 operand nodes
 * @throws Error if less than 2 operands
 */
export function iffChain(...operands: MathNode[]): RelationNode {
	if (operands.length < 2) {
		throw new Error('iffChain requires at least 2 operands');
	}
	return relationChain(operands, Array(operands.length - 1).fill('⟺'));
}

// =============================================================================
// Unit Factories
// =============================================================================

/**
 * Creates a unit node that wraps an expression with a physical unit.
 * @param expression - The numeric or algebraic expression
 * @param unitValue - The physical unit from Unit AST
 * @param metadata - Optional rendering hints
 *
 * @example
 * // 5 meters
 * withUnit(number('5'), parse('m')!)
 *
 * // (3 + 4) kilometers
 * withUnit(add(number('3'), number('4')), parse('km')!)
 */
export function withUnit(expression: MathNode, unitValue: Unit, metadata?: NodeMetadata): UnitNode {
	return {
		type: 'unit',
		expression,
		unit: unitValue,
		...(metadata && { metadata })
	} as const;
}

/**
 * Convenience: Creates a quantity (number with unit) from value and unit strings.
 * @param value - Numeric value as string (to preserve exact formatting)
 * @param unitStr - Unit string to parse (e.g., 'm', 'km/h', 'm.s^-2')
 * @param metadata - Optional rendering hints
 * @throws Error if unitStr cannot be parsed
 *
 * @example
 * quantity('5', 'm')      // 5 meters
 * quantity('100', 'km/h') // 100 km/h
 */
export function quantity(value: string, unitStr: string, metadata?: NodeMetadata): UnitNode {
	return withUnit(number(value), parseOrThrow(unitStr), metadata);
}

/**
 * Convenience: Creates a variable with a unit.
 * @param name - Variable name (single letter or multi-character identifier)
 * @param unitStr - Unit string to parse (e.g., 'm/s', 'kg')
 * @param metadata - Optional rendering hints
 * @throws Error if unitStr cannot be parsed
 *
 * @example
 * quantityVar('v', 'm/s')   // velocity v in m/s
 * quantityVar('m', 'kg')    // mass m in kg
 */
export function quantityVar(name: string, unitStr: string, metadata?: NodeMetadata): UnitNode {
	return withUnit(variable(name), parseOrThrow(unitStr), metadata);
}

// =============================================================================
// MathAST Namespace
// =============================================================================

/**
 * Namespace containing all MathAST factory functions
 */
export const MathAST = {
	// Literals
	number,
	variable,
	greek,
	symbol,

	// Binary operations
	add,
	subtract,
	multiply,
	implicitMultiply,
	divide,
	fraction,

	// Unary operations
	opposite,
	positive,

	// Functions
	func,
	sin,
	cos,
	tan,
	ln,
	log,
	exp,
	sqrt,
	abs,

	// Structural
	delimiter,
	parentheses,
	brackets,
	braces,
	subscript,
	superscript,
	power,

	// Relations
	relation,
	equals,
	lessThan,
	greaterThan,
	lessThanOrEqual,
	greaterThanOrEqual,
	notEquals,
	approx,
	congruent,
	elementOf,
	notElementOf,
	subset,
	subsetOrEqual,
	superset,
	supersetOrEqual,
	implies,
	iff,

	// Relation chains
	relationChain,
	equalsChain,
	lessThanChain,
	lessThanOrEqualChain,
	greaterThanChain,
	greaterThanOrEqualChain,
	impliesChain,
	iffChain,

	// Units
	withUnit,
	quantity,
	quantityVar
} as const;
