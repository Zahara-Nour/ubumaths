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
// Options Types for Extended Metadata
// =============================================================================

/**
 * Options for binary operations (add, subtract, multiply, divide)
 */
export interface BinaryOpOptions {
	operatorMetadata?: NodeMetadata;
	metadata?: NodeMetadata;
}

/**
 * Options for unary operations (opposite, positive)
 */
export interface UnaryOpOptions {
	operatorMetadata?: NodeMetadata;
	metadata?: NodeMetadata;
}

/**
 * Options for delimiter nodes
 */
export interface DelimiterOptions {
	delimiterMetadata?: NodeMetadata;
	leftDelimiterMetadata?: NodeMetadata;
	rightDelimiterMetadata?: NodeMetadata;
	metadata?: NodeMetadata;
}

/**
 * Options for function nodes with extended metadata
 */
export interface FunctionMetadataOptions {
	nameMetadata?: NodeMetadata;
	delimiterMetadata?: NodeMetadata;
	leftDelimiterMetadata?: NodeMetadata;
	rightDelimiterMetadata?: NodeMetadata;
	metadata?: NodeMetadata;
}

/**
 * Options for relation nodes
 */
export interface RelationOptions {
	relationMetadata?: NodeMetadata;
	metadata?: NodeMetadata;
}

/**
 * Options for unit nodes
 */
export interface UnitOptions {
	unitMetadata?: NodeMetadata;
	metadata?: NodeMetadata;
}

// =============================================================================
// Options Normalization Helpers
// =============================================================================

/**
 * Type guard to check if a value is a BinaryOpOptions object
 */
function isBinaryOpOptions(opt: unknown): opt is BinaryOpOptions {
	return (
		typeof opt === 'object' && opt !== null && ('operatorMetadata' in opt || 'metadata' in opt)
	);
}

/**
 * Normalizes binary operation options for backwards compatibility.
 * Accepts either BinaryOpOptions or plain NodeMetadata.
 */
function normalizeBinaryOpOptions(options?: BinaryOpOptions | NodeMetadata): BinaryOpOptions {
	if (!options) return {};
	if (isBinaryOpOptions(options)) return options;
	return { metadata: options };
}

/**
 * Type guard to check if a value is a UnaryOpOptions object
 */
function isUnaryOpOptions(opt: unknown): opt is UnaryOpOptions {
	return (
		typeof opt === 'object' && opt !== null && ('operatorMetadata' in opt || 'metadata' in opt)
	);
}

/**
 * Normalizes unary operation options for backwards compatibility.
 */
function normalizeUnaryOpOptions(options?: UnaryOpOptions | NodeMetadata): UnaryOpOptions {
	if (!options) return {};
	if (isUnaryOpOptions(options)) return options;
	return { metadata: options };
}

/**
 * Type guard to check if a value is a DelimiterOptions object
 */
function isDelimiterOptions(opt: unknown): opt is DelimiterOptions {
	return (
		typeof opt === 'object' &&
		opt !== null &&
		('delimiterMetadata' in opt ||
			'leftDelimiterMetadata' in opt ||
			'rightDelimiterMetadata' in opt ||
			'metadata' in opt)
	);
}

/**
 * Normalizes delimiter options for backwards compatibility.
 */
function normalizeDelimiterOptions(options?: DelimiterOptions | NodeMetadata): DelimiterOptions {
	if (!options) return {};
	if (isDelimiterOptions(options)) return options;
	return { metadata: options };
}

/**
 * Type guard to check if a value is a RelationOptions object
 */
function isRelationOptions(opt: unknown): opt is RelationOptions {
	return (
		typeof opt === 'object' && opt !== null && ('relationMetadata' in opt || 'metadata' in opt)
	);
}

/**
 * Normalizes relation options for backwards compatibility.
 */
function normalizeRelationOptions(options?: RelationOptions | NodeMetadata): RelationOptions {
	if (!options) return {};
	if (isRelationOptions(options)) return options;
	return { metadata: options };
}

/**
 * Type guard to check if a value is a UnitOptions object
 */
function isUnitOptions(opt: unknown): opt is UnitOptions {
	return typeof opt === 'object' && opt !== null && ('unitMetadata' in opt || 'metadata' in opt);
}

/**
 * Normalizes unit options for backwards compatibility.
 */
function normalizeUnitOptions(options?: UnitOptions | NodeMetadata): UnitOptions {
	if (!options) return {};
	if (isUnitOptions(options)) return options;
	return { metadata: options };
}

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
 * @param options - Optional BinaryOpOptions or NodeMetadata for rendering hints
 */
export function add(
	left: MathNode,
	right: MathNode,
	options?: BinaryOpOptions | NodeMetadata
): AdditionNode {
	const opts = normalizeBinaryOpOptions(options);
	return {
		type: 'addition',
		left,
		right,
		...(opts.operatorMetadata && { operatorMetadata: opts.operatorMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

/**
 * Creates a subtraction node: left - right
 * @param left - Left operand
 * @param right - Right operand
 * @param options - Optional BinaryOpOptions or NodeMetadata for rendering hints
 */
export function subtract(
	left: MathNode,
	right: MathNode,
	options?: BinaryOpOptions | NodeMetadata
): SubtractionNode {
	const opts = normalizeBinaryOpOptions(options);
	return {
		type: 'subtraction',
		left,
		right,
		...(opts.operatorMetadata && { operatorMetadata: opts.operatorMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

/**
 * Creates a multiplication node: left * right
 * @param left - Left operand
 * @param right - Right operand
 * @param displayStyle - How to render the multiplication ('implicit', 'dot', 'cross', 'star')
 * @param options - Optional BinaryOpOptions or NodeMetadata for rendering hints
 */
export function multiply(
	left: MathNode,
	right: MathNode,
	displayStyle: MultiplicationDisplayStyle,
	options?: BinaryOpOptions | NodeMetadata
): MultiplicationNode {
	const opts = normalizeBinaryOpOptions(options);
	return {
		type: 'multiplication',
		left,
		right,
		displayStyle,
		...(opts.operatorMetadata && { operatorMetadata: opts.operatorMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

/**
 * Convenience: Creates implicit multiplication (e.g., 2x)
 */
export function implicitMultiply(
	left: MathNode,
	right: MathNode,
	options?: BinaryOpOptions | NodeMetadata
): MultiplicationNode {
	return multiply(left, right, 'implicit', options);
}

/**
 * Creates a division node: numerator / denominator
 * @param numerator - Numerator
 * @param denominator - Denominator
 * @param displayStyle - How to render the division ('fraction', 'inline', 'ratio')
 * @param options - Optional BinaryOpOptions or NodeMetadata for rendering hints
 */
export function divide(
	numerator: MathNode,
	denominator: MathNode,
	displayStyle: DivisionDisplayStyle,
	options?: BinaryOpOptions | NodeMetadata
): DivisionNode {
	const opts = normalizeBinaryOpOptions(options);
	return {
		type: 'division',
		numerator,
		denominator,
		displayStyle,
		...(opts.operatorMetadata && { operatorMetadata: opts.operatorMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

/**
 * Convenience: Creates a fraction (vertical division)
 */
export function fraction(
	numerator: MathNode,
	denominator: MathNode,
	options?: BinaryOpOptions | NodeMetadata
): DivisionNode {
	return divide(numerator, denominator, 'fraction', options);
}

// =============================================================================
// Unary Operation Factories
// =============================================================================

/**
 * Creates an opposite/negation node: -operand
 * @param operand - The value to negate
 * @param options - Optional UnaryOpOptions or NodeMetadata for rendering hints
 */
export function opposite(operand: MathNode, options?: UnaryOpOptions | NodeMetadata): OppositeNode {
	const opts = normalizeUnaryOpOptions(options);
	return {
		type: 'opposite',
		operand,
		...(opts.operatorMetadata && { operatorMetadata: opts.operatorMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

/**
 * Creates a positive sign node: +operand
 * @param operand - The value with explicit positive sign
 * @param options - Optional UnaryOpOptions or NodeMetadata for rendering hints
 */
export function positive(operand: MathNode, options?: UnaryOpOptions | NodeMetadata): PositiveNode {
	const opts = normalizeUnaryOpOptions(options);
	return {
		type: 'positive',
		operand,
		...(opts.operatorMetadata && { operatorMetadata: opts.operatorMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

// =============================================================================
// Function Factory
// =============================================================================

/**
 * Combined options for function nodes
 */
export interface FunctionOptions {
	power?: MathNode;
	base?: MathNode;
	nameMetadata?: NodeMetadata;
	delimiterMetadata?: NodeMetadata;
	leftDelimiterMetadata?: NodeMetadata;
	rightDelimiterMetadata?: NodeMetadata;
	metadata?: NodeMetadata;
}

/**
 * Creates a function application node
 * @param name - Function name (e.g., 'sin', 'log', 'f')
 * @param args - Function arguments
 * @param options - Optional power, base, and metadata options
 */
export function func(
	name: string,
	args: readonly MathNode[],
	options?: FunctionOptions
): FunctionNode {
	return {
		type: 'function',
		name,
		args,
		...(options?.power && { power: options.power }),
		...(options?.base && { base: options.base }),
		...(options?.nameMetadata && { nameMetadata: options.nameMetadata }),
		...(options?.delimiterMetadata && { delimiterMetadata: options.delimiterMetadata }),
		...(options?.leftDelimiterMetadata && { leftDelimiterMetadata: options.leftDelimiterMetadata }),
		...(options?.rightDelimiterMetadata && {
			rightDelimiterMetadata: options.rightDelimiterMetadata
		}),
		...(options?.metadata && { metadata: options.metadata })
	} as const;
}

/**
 * Type guard to check if a value is a FunctionOptions object
 */
function isFunctionOptions(opt: unknown): opt is FunctionOptions {
	return (
		typeof opt === 'object' &&
		opt !== null &&
		('metadata' in opt ||
			'nameMetadata' in opt ||
			'delimiterMetadata' in opt ||
			'leftDelimiterMetadata' in opt ||
			'rightDelimiterMetadata' in opt ||
			'power' in opt ||
			'base' in opt)
	);
}

/**
 * Normalizes function options for backwards compatibility.
 */
function normalizeFunctionOptions(options?: FunctionOptions | NodeMetadata): FunctionOptions {
	if (!options) return {};
	if (isFunctionOptions(options)) return options;
	return { metadata: options };
}

/**
 * Convenience: Creates sin(arg)
 */
export function sin(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('sin', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates cos(arg)
 */
export function cos(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('cos', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates tan(arg)
 */
export function tan(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('tan', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates ln(arg)
 */
export function ln(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('ln', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates log(arg) or log_base(arg)
 */
export function log(
	arg: MathNode,
	base?: MathNode,
	options?: FunctionOptions | NodeMetadata
): FunctionNode {
	const opts = normalizeFunctionOptions(options);
	return func('log', [arg], base ? { ...opts, base } : opts);
}

/**
 * Convenience: Creates exp(arg)
 */
export function exp(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('exp', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates sqrt(arg)
 */
export function sqrt(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('sqrt', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates abs(arg)
 */
export function abs(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('abs', [arg], normalizeFunctionOptions(options));
}

// =============================================================================
// Structural Factories
// =============================================================================

/**
 * Creates a delimiter node (content surrounded by delimiters)
 * @param type - Type of delimiter ('parentheses', 'absolute')
 * @param content - Content inside delimiters
 * @param semantic - Optional semantic meaning ('grouping', 'interval', 'set', etc.)
 * @param options - Optional DelimiterOptions or NodeMetadata for rendering hints
 */
export function delimiter(
	type: DelimiterType,
	content: MathNode,
	semantic?: DelimiterSemantic,
	options?: DelimiterOptions | NodeMetadata
): DelimiterNode {
	const opts = normalizeDelimiterOptions(options);
	return {
		type: 'delimiter',
		delimiters: type,
		content,
		...(semantic && { semantic }),
		...(opts.delimiterMetadata && { delimiterMetadata: opts.delimiterMetadata }),
		...(opts.leftDelimiterMetadata && { leftDelimiterMetadata: opts.leftDelimiterMetadata }),
		...(opts.rightDelimiterMetadata && { rightDelimiterMetadata: opts.rightDelimiterMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

/**
 * Convenience: Creates parentheses (content)
 */
export function parentheses(
	content: MathNode,
	options?: DelimiterOptions | NodeMetadata
): DelimiterNode {
	return delimiter('parentheses', content, 'grouping', options);
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
 * @param options - Optional RelationOptions or NodeMetadata for rendering hints
 */
export function relation(
	type: RelationType,
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	const opts = normalizeRelationOptions(options);
	return {
		type: 'relation',
		relation: type,
		left,
		right,
		...(opts.relationMetadata && { relationMetadata: opts.relationMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

/**
 * Convenience: Creates equals relation (left = right)
 */
export function equals(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('=', left, right, options);
}

/**
 * Convenience: Creates less than relation (left < right)
 */
export function lessThan(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('<', left, right, options);
}

/**
 * Convenience: Creates greater than relation (left > right)
 */
export function greaterThan(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('>', left, right, options);
}

/**
 * Convenience: Creates less than or equal relation (left <= right)
 */
export function lessThanOrEqual(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('<=', left, right, options);
}

/**
 * Convenience: Creates greater than or equal relation (left >= right)
 */
export function greaterThanOrEqual(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('>=', left, right, options);
}

/**
 * Convenience: Creates not equal relation (left != right)
 */
export function notEquals(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('!=', left, right, options);
}

/**
 * Convenience: Creates approximately equal relation (left ≈ right)
 */
export function approx(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('≈', left, right, options);
}

/**
 * Convenience: Creates congruent relation (left ≡ right)
 */
export function congruent(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('≡', left, right, options);
}

/**
 * Convenience: Creates element of relation (left ∈ right)
 */
export function elementOf(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('∈', left, right, options);
}

/**
 * Convenience: Creates not element of relation (left ∉ right)
 */
export function notElementOf(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('∉', left, right, options);
}

/**
 * Convenience: Creates subset relation (left ⊂ right)
 */
export function subset(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('⊂', left, right, options);
}

/**
 * Convenience: Creates subset or equal relation (left ⊆ right)
 */
export function subsetOrEqual(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('⊆', left, right, options);
}

/**
 * Convenience: Creates superset relation (left ⊃ right)
 */
export function superset(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('⊃', left, right, options);
}

/**
 * Convenience: Creates superset or equal relation (left ⊇ right)
 */
export function supersetOrEqual(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('⊇', left, right, options);
}

/**
 * Convenience: Creates implies relation (left ⟹ right)
 */
export function implies(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('⟹', left, right, options);
}

/**
 * Convenience: Creates if and only if relation (left ⟺ right)
 */
export function iff(
	left: MathNode,
	right: MathNode,
	options?: RelationOptions | NodeMetadata
): RelationNode {
	return relation('⟺', left, right, options);
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
 * @param options - Optional RelationOptions or NodeMetadata (applied to outermost relation)
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
	options?: RelationOptions | NodeMetadata
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

	// Apply options to outermost node if provided
	const opts = normalizeRelationOptions(options);
	if (opts.relationMetadata || opts.metadata) {
		return {
			...result,
			...(opts.relationMetadata && { relationMetadata: opts.relationMetadata }),
			...(opts.metadata && { metadata: opts.metadata })
		} as const;
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
 * @param options - Optional UnitOptions or NodeMetadata for rendering hints
 *
 * @example
 * // 5 meters
 * withUnit(number('5'), parse('m')!)
 *
 * // (3 + 4) kilometers
 * withUnit(add(number('3'), number('4')), parse('km')!)
 */
export function withUnit(
	expression: MathNode,
	unitValue: Unit,
	options?: UnitOptions | NodeMetadata
): UnitNode {
	const opts = normalizeUnitOptions(options);
	return {
		type: 'unit',
		expression,
		unit: unitValue,
		...(opts.unitMetadata && { unitMetadata: opts.unitMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

/**
 * Convenience: Creates a quantity (number with unit) from value and unit strings.
 * @param value - Numeric value as string (to preserve exact formatting)
 * @param unitStr - Unit string to parse (e.g., 'm', 'km/h', 'm.s^-2')
 * @param options - Optional UnitOptions or NodeMetadata for rendering hints
 * @throws Error if unitStr cannot be parsed
 *
 * @example
 * quantity('5', 'm')      // 5 meters
 * quantity('100', 'km/h') // 100 km/h
 */
export function quantity(
	value: string,
	unitStr: string,
	options?: UnitOptions | NodeMetadata
): UnitNode {
	return withUnit(number(value), parseOrThrow(unitStr), options);
}

/**
 * Convenience: Creates a variable with a unit.
 * @param name - Variable name (single letter or multi-character identifier)
 * @param unitStr - Unit string to parse (e.g., 'm/s', 'kg')
 * @param options - Optional UnitOptions or NodeMetadata for rendering hints
 * @throws Error if unitStr cannot be parsed
 *
 * @example
 * quantityVar('v', 'm/s')   // velocity v in m/s
 * quantityVar('m', 'kg')    // mass m in kg
 */
export function quantityVar(
	name: string,
	unitStr: string,
	options?: UnitOptions | NodeMetadata
): UnitNode {
	return withUnit(variable(name), parseOrThrow(unitStr), options);
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
