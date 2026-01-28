/**
 * MathAST Factory Functions
 *
 * Factory functions for creating immutable MathAST nodes.
 * All nodes are readonly and follow strict TypeScript typing.
 */

import type {
	AdditionNode,
	ComplexNode,
	CompositionNode,
	DelimiterNode,
	DelimiterSemantic,
	DelimiterType,
	DivisionDisplayStyle,
	DivisionNode,
	FunctionNode,
	GreekLetter,
	GreekLetterNode,
	HoleNode,
	InfinityNode,
	InfinitySign,
	LimitDirection,
	LimitNode,
	MathConstant,
	MathConstantNode,
	MathNode,
	MathSymbol,
	MatrixNode,
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
import type { MatrixType, MatrixOptions } from './matrix/types';
import { MatrixDimensionError } from './matrix/types';
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

/**
 * Options for composition nodes
 */
export interface CompositionOptions {
	operatorMetadata?: NodeMetadata;
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

/**
 * Type guard to check if a value is a CompositionOptions object
 */
function isCompositionOptions(opt: unknown): opt is CompositionOptions {
	return (
		typeof opt === 'object' && opt !== null && ('operatorMetadata' in opt || 'metadata' in opt)
	);
}

/**
 * Normalizes composition options for backwards compatibility.
 */
function normalizeCompositionOptions(
	options?: CompositionOptions | NodeMetadata
): CompositionOptions {
	if (!options) return {};
	if (isCompositionOptions(options)) return options;
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

/**
 * Creates a hole/placeholder node for fill-in-the-blank expressions
 * @param index - The index of this hole (1-based, used for ordering)
 * @param placeholder - Optional placeholder text to display
 * @param metadata - Optional rendering hints
 */
export function hole(index: number, placeholder?: string, metadata?: NodeMetadata): HoleNode {
	return {
		type: 'hole',
		index,
		...(placeholder && { placeholder }),
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a mathematical constant node (e or π)
 * @param constant - The constant type ('euler' or 'pi')
 * @param metadata - Optional rendering hints
 */
export function mathConstant(constant: MathConstant, metadata?: NodeMetadata): MathConstantNode {
	return {
		type: 'constant',
		constant,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates Euler's number e ≈ 2.71828...
 * @param metadata - Optional rendering hints
 */
export function euler(metadata?: NodeMetadata): MathConstantNode {
	return mathConstant('euler', metadata);
}

/**
 * Creates the constant π ≈ 3.14159...
 * @param metadata - Optional rendering hints
 */
export function piConstant(metadata?: NodeMetadata): MathConstantNode {
	return mathConstant('pi', metadata);
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
	derivativeOrder?: number; // 1=f', 2=f'', 3=f'''
	isInverse?: boolean; // true for f^{-1}
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
 * @param options - Optional power, base, derivativeOrder, isInverse, and metadata options
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
		...(options?.derivativeOrder !== undefined && { derivativeOrder: options.derivativeOrder }),
		...(options?.isInverse && { isInverse: options.isInverse }),
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
			'base' in opt ||
			'derivativeOrder' in opt ||
			'isInverse' in opt)
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
 * Convenience: Creates cot(arg) - cotangent
 */
export function cot(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('cot', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates sec(arg) - secant
 */
export function sec(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('sec', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates csc(arg) - cosecant
 */
export function csc(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('csc', [arg], normalizeFunctionOptions(options));
}

// =============================================================================
// Hyperbolic Functions
// =============================================================================

/**
 * Convenience: Creates sinh(arg) - hyperbolic sine
 */
export function sinh(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('sinh', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates cosh(arg) - hyperbolic cosine
 */
export function cosh(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('cosh', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates tanh(arg) - hyperbolic tangent
 */
export function tanh(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('tanh', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates coth(arg) - hyperbolic cotangent
 */
export function coth(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('coth', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates sech(arg) - hyperbolic secant
 */
export function sech(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('sech', [arg], normalizeFunctionOptions(options));
}

/**
 * Convenience: Creates csch(arg) - hyperbolic cosecant
 */
export function csch(arg: MathNode, options?: FunctionOptions | NodeMetadata): FunctionNode {
	return func('csch', [arg], normalizeFunctionOptions(options));
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

/**
 * Creates a derivative function: f'(x), f''(x), f'''(x), f^(n)(x)
 * @param name - Function name (e.g., 'f', 'g')
 * @param args - Function arguments
 * @param order - Derivative order (1 for f', 2 for f'', etc.)
 * @param options - Optional additional function options
 */
export function derivativeFunc(
	name: string,
	args: readonly MathNode[],
	order: number = 1,
	options?: FunctionOptions | NodeMetadata
): FunctionNode {
	if (!Number.isInteger(order) || order < 1) {
		throw new Error(`derivativeOrder must be a positive integer, got ${order}`);
	}
	const opts = normalizeFunctionOptions(options);
	return func(name, args, { ...opts, derivativeOrder: order });
}

/**
 * Creates an inverse function: f^{-1}(x)
 * @param name - Function name (e.g., 'f', 'sin')
 * @param args - Function arguments
 * @param options - Optional additional function options
 */
export function inverseFunc(
	name: string,
	args: readonly MathNode[],
	options?: FunctionOptions | NodeMetadata
): FunctionNode {
	const opts = normalizeFunctionOptions(options);
	return func(name, args, { ...opts, isInverse: true });
}

// =============================================================================
// Structural Factories
// =============================================================================

/**
 * Creates a delimiter node (content surrounded by delimiters)
 * Note: For absolute value, use abs() function instead of delimiter
 * @param type - Type of delimiter ('parentheses')
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
// Composition Factory
// =============================================================================

/**
 * Creates a composition node representing f composed with g (f ∘ g)
 *
 * The composition (f ∘ g)(x) means f(g(x)) - g is applied first, then f.
 *
 * @param outer - The outer function f (applied second)
 * @param inner - The inner function g (applied first)
 * @param options - Optional CompositionOptions or NodeMetadata for rendering hints
 *
 * @example
 * // f ∘ g
 * compose(variable('f'), variable('g'))
 *
 * // sin ∘ cos
 * compose(func('sin', []), func('cos', []))
 *
 * // (f ∘ g) ∘ h (left associative)
 * compose(compose(variable('f'), variable('g')), variable('h'))
 */
export function compose(
	outer: MathNode,
	inner: MathNode,
	options?: CompositionOptions | NodeMetadata
): CompositionNode {
	const opts = normalizeCompositionOptions(options);
	return {
		type: 'composition',
		outer,
		inner,
		...(opts.operatorMetadata && { operatorMetadata: opts.operatorMetadata }),
		...(opts.metadata && { metadata: opts.metadata })
	} as const;
}

// =============================================================================
// Complex Number Factory
// =============================================================================

/**
 * Creates a complex number node with real and imaginary parts.
 *
 * Both parts can be any MathNode, allowing symbolic complex numbers.
 * The imaginary unit 'i' is implicit - the imaginary field is the coefficient.
 *
 * @param real - Real part (any MathNode)
 * @param imaginary - Imaginary part coefficient (any MathNode)
 * @param metadata - Optional rendering hints
 *
 * @example
 * // 3 + 4i
 * complex(number('3'), number('4'))
 *
 * // Pure imaginary: i
 * complex(number('0'), number('1'))
 *
 * // Symbolic: √2 + √3i
 * complex(sqrt(number('2')), sqrt(number('3')))
 */
export function complex(real: MathNode, imaginary: MathNode, metadata?: NodeMetadata): ComplexNode {
	return {
		type: 'complex',
		real,
		imaginary,
		...(metadata && { metadata })
	} as const;
}

// =============================================================================
// Infinity Factories
// =============================================================================

/**
 * Creates an infinity node with specified sign.
 *
 * This is a proper AST node representing positive or negative infinity,
 * distinct from the unsigned 'infinity' symbol. Essential for:
 * - Limits: lim_{x→+∞} vs lim_{x→-∞}
 * - One-sided limit results: lim_{x→0⁺} 1/x = +∞
 *
 * @param sign - 'positive' for +∞, 'negative' for -∞
 * @param metadata - Optional rendering hints
 *
 * @example
 * infinity('positive')  // +∞
 * infinity('negative')  // -∞
 */
export function infinity(sign: InfinitySign, metadata?: NodeMetadata): InfinityNode {
	return {
		type: 'infinity',
		sign,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates positive infinity (+∞).
 *
 * @param metadata - Optional rendering hints
 *
 * @example
 * positiveInfinity()  // +∞
 */
export function positiveInfinity(metadata?: NodeMetadata): InfinityNode {
	return infinity('positive', metadata);
}

/**
 * Creates negative infinity (-∞).
 *
 * @param metadata - Optional rendering hints
 *
 * @example
 * negativeInfinity()  // -∞
 */
export function negativeInfinity(metadata?: NodeMetadata): InfinityNode {
	return infinity('negative', metadata);
}

// =============================================================================
// Limit Factories
// =============================================================================

/**
 * Creates a limit node: lim_{x → a} f(x)
 *
 * @param expression - The expression being evaluated (f(x))
 * @param variableName - Variable approaching the limit point (x)
 * @param approach - Value being approached (a, or infinity)
 * @param direction - 'left', 'right', or 'both' (default: 'both')
 * @param metadata - Optional rendering hints
 *
 * @example
 * // lim_{x → 0} sin(x)/x
 * limit(
 *   divide(func('sin', [variable('x')]), variable('x')),
 *   'x',
 *   number('0')
 * )
 *
 * // lim_{x → 0⁺} 1/x
 * limit(
 *   divide(number('1'), variable('x')),
 *   'x',
 *   number('0'),
 *   'right'
 * )
 *
 * // lim_{x → +∞} 1/x
 * limit(
 *   divide(number('1'), variable('x')),
 *   'x',
 *   positiveInfinity()
 * )
 */
export function limit(
	expression: MathNode,
	variableName: string,
	approach: MathNode,
	direction: LimitDirection = 'both',
	metadata?: NodeMetadata
): LimitNode {
	return {
		type: 'limit',
		expression,
		variable: variableName,
		approach,
		direction,
		...(metadata && { metadata })
	} as const;
}

/**
 * Creates a two-sided limit (shorthand for limit with direction='both').
 *
 * @example
 * // lim_{x → a} f(x)
 * twoSidedLimit(expression, 'x', number('0'))
 */
export function twoSidedLimit(
	expression: MathNode,
	variableName: string,
	approach: MathNode,
	metadata?: NodeMetadata
): LimitNode {
	return limit(expression, variableName, approach, 'both', metadata);
}

/**
 * Creates a right limit (approaching from above): lim_{x → a⁺}
 *
 * @example
 * // lim_{x → 0⁺} 1/x = +∞
 * rightLimit(divide(number('1'), variable('x')), 'x', number('0'))
 */
export function rightLimit(
	expression: MathNode,
	variableName: string,
	approach: MathNode,
	metadata?: NodeMetadata
): LimitNode {
	return limit(expression, variableName, approach, 'right', metadata);
}

/**
 * Creates a left limit (approaching from below): lim_{x → a⁻}
 *
 * @example
 * // lim_{x → 0⁻} 1/x = -∞
 * leftLimit(divide(number('1'), variable('x')), 'x', number('0'))
 */
export function leftLimit(
	expression: MathNode,
	variableName: string,
	approach: MathNode,
	metadata?: NodeMetadata
): LimitNode {
	return limit(expression, variableName, approach, 'left', metadata);
}

/**
 * Creates a limit at positive infinity: lim_{x → +∞}
 *
 * @example
 * // lim_{x → +∞} 1/x = 0
 * limitAtInfinity(divide(number('1'), variable('x')), 'x')
 */
export function limitAtInfinity(
	expression: MathNode,
	variableName: string,
	metadata?: NodeMetadata
): LimitNode {
	return limit(expression, variableName, positiveInfinity(), 'both', metadata);
}

/**
 * Creates a limit at negative infinity: lim_{x → -∞}
 *
 * @example
 * // lim_{x → -∞} e^x = 0
 * limitAtNegativeInfinity(func('exp', [variable('x')]), 'x')
 */
export function limitAtNegativeInfinity(
	expression: MathNode,
	variableName: string,
	metadata?: NodeMetadata
): LimitNode {
	return limit(expression, variableName, negativeInfinity(), 'both', metadata);
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
// Matrix Factories
// =============================================================================

/** Maximum matrix dimension for v1 (educational context) */
const MAX_MATRIX_SIZE = 5;

/**
 * Validates matrix dimensions
 * @throws MatrixDimensionError for invalid dimensions
 */
function validateMatrixDimensions(rows: number, cols: number): void {
	if (rows <= 0) {
		throw new MatrixDimensionError('Matrix must have at least 1 row', 1, undefined, rows, cols);
	}
	if (cols <= 0) {
		throw new MatrixDimensionError('Matrix must have at least 1 column', undefined, 1, rows, cols);
	}
	if (rows > MAX_MATRIX_SIZE) {
		throw new MatrixDimensionError(
			`Matrix rows exceed maximum size of ${MAX_MATRIX_SIZE}`,
			MAX_MATRIX_SIZE,
			undefined,
			rows,
			cols
		);
	}
	if (cols > MAX_MATRIX_SIZE) {
		throw new MatrixDimensionError(
			`Matrix columns exceed maximum size of ${MAX_MATRIX_SIZE}`,
			undefined,
			MAX_MATRIX_SIZE,
			rows,
			cols
		);
	}
}

/**
 * Creates a matrix node from a 2D array of MathNodes.
 *
 * @param rows - 2D array of MathNode elements (row-major order)
 * @param options - Optional matrixType and metadata
 * @throws MatrixDimensionError for empty matrix, empty rows, or rows with different lengths
 *
 * @example
 * // 2x2 matrix
 * matrix([[number('1'), number('2')], [number('3'), number('4')]])
 *
 * // With options
 * matrix([[number('1')]], { matrixType: 'bmatrix', metadata: { color: 'red' } })
 */
export function matrix(
	rows: readonly (readonly MathNode[])[],
	options?: MatrixOptions
): MatrixNode {
	// Validate non-empty
	if (rows.length === 0) {
		throw new MatrixDimensionError('Matrix must have at least 1 row', 1, undefined, 0, 0);
	}

	const numCols = rows[0].length;
	if (numCols === 0) {
		throw new MatrixDimensionError(
			'Matrix rows must have at least 1 element',
			undefined,
			1,
			rows.length,
			0
		);
	}

	// Validate all rows have the same length
	for (let i = 0; i < rows.length; i++) {
		if (rows[i].length !== numCols) {
			throw new MatrixDimensionError(
				`Row ${i + 1} has ${rows[i].length} elements, expected ${numCols}`,
				rows.length,
				numCols,
				rows.length,
				rows[i].length
			);
		}
	}

	// Validate size limits
	validateMatrixDimensions(rows.length, numCols);

	const matrixType: MatrixType = options?.matrixType ?? 'pmatrix';

	return {
		type: 'matrix',
		rows,
		matrixType,
		...(options?.metadata && { metadata: options.metadata })
	} as const;
}

/**
 * Creates a row vector (1xN matrix).
 *
 * @param elements - Array of MathNode elements
 * @param options - Optional matrixType and metadata
 * @throws MatrixDimensionError for empty elements
 *
 * @example
 * rowVector([number('1'), number('2'), number('3')])
 */
export function rowVector(elements: readonly MathNode[], options?: MatrixOptions): MatrixNode {
	if (elements.length === 0) {
		throw new MatrixDimensionError('Row vector must have at least 1 element', 1, 1, 1, 0);
	}
	return matrix([elements], options);
}

/**
 * Creates a column vector (Nx1 matrix).
 *
 * @param elements - Array of MathNode elements
 * @param options - Optional matrixType and metadata
 * @throws MatrixDimensionError for empty elements
 *
 * @example
 * columnVector([number('1'), number('2'), number('3')])
 */
export function columnVector(elements: readonly MathNode[], options?: MatrixOptions): MatrixNode {
	if (elements.length === 0) {
		throw new MatrixDimensionError('Column vector must have at least 1 element', 1, 1, 0, 1);
	}
	// Convert to column format: [[e1], [e2], [e3]]
	const rows = elements.map((elem) => [elem]);
	return matrix(rows, options);
}

/**
 * Creates an identity matrix of size n.
 *
 * @param size - Size of the square identity matrix (1 to 5)
 * @param options - Optional matrixType and metadata
 * @throws MatrixDimensionError for invalid size
 *
 * @example
 * identityMatrix(3) // 3x3 identity matrix with 1s on diagonal
 */
export function identityMatrix(size: number, options?: MatrixOptions): MatrixNode {
	if (!Number.isInteger(size) || size <= 0) {
		throw new MatrixDimensionError(
			'Identity matrix size must be a positive integer',
			1,
			1,
			size,
			size
		);
	}
	validateMatrixDimensions(size, size);

	const rows: MathNode[][] = [];
	for (let i = 0; i < size; i++) {
		const row: MathNode[] = [];
		for (let j = 0; j < size; j++) {
			row.push(number(i === j ? '1' : '0'));
		}
		rows.push(row);
	}

	return matrix(rows, options);
}

/**
 * Creates a zero matrix of size rows x cols.
 *
 * @param rows - Number of rows
 * @param cols - Number of columns (defaults to rows for square matrix)
 * @param options - Optional matrixType and metadata
 * @throws MatrixDimensionError for invalid dimensions
 *
 * @example
 * zeroMatrix(2, 3) // 2x3 zero matrix
 * zeroMatrix(3)    // 3x3 zero matrix
 */
export function zeroMatrix(numRows: number, numCols?: number, options?: MatrixOptions): MatrixNode {
	const cols = numCols ?? numRows;

	if (!Number.isInteger(numRows) || numRows <= 0) {
		throw new MatrixDimensionError(
			'Zero matrix rows must be a positive integer',
			1,
			undefined,
			numRows,
			cols
		);
	}
	if (!Number.isInteger(cols) || cols <= 0) {
		throw new MatrixDimensionError(
			'Zero matrix columns must be a positive integer',
			undefined,
			1,
			numRows,
			cols
		);
	}
	validateMatrixDimensions(numRows, cols);

	const rows: MathNode[][] = [];
	for (let i = 0; i < numRows; i++) {
		const row: MathNode[] = [];
		for (let j = 0; j < cols; j++) {
			row.push(number('0'));
		}
		rows.push(row);
	}

	return matrix(rows, options);
}

// =============================================================================
// Pre-built Constants
// =============================================================================

/**
 * The mathematical constant π ≈ 3.14159...
 * Pre-built MathConstantNode for convenience.
 */
export const PI: MathConstantNode = piConstant();

/**
 * Euler's number e ≈ 2.71828...
 * Pre-built MathConstantNode for convenience.
 */
export const E: MathConstantNode = euler();

/**
 * The constant 2π ≈ 6.28318...
 * Commonly used in trigonometry and periodicity.
 */
export const TWO_PI: MultiplicationNode = multiply(number('2'), PI, 'implicit');

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
	hole,

	// Mathematical constants
	mathConstant,
	euler,
	piConstant,
	PI,
	E,
	TWO_PI,

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
	cot,
	sec,
	csc,
	ln,
	log,
	exp,
	sqrt,
	abs,
	derivativeFunc,
	inverseFunc,

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
	quantityVar,

	// Matrices
	matrix,
	rowVector,
	columnVector,
	identityMatrix,
	zeroMatrix,

	// Composition
	compose,

	// Complex numbers
	complex,

	// Infinity
	infinity,
	positiveInfinity,
	negativeInfinity,

	// Limits
	limit,
	twoSidedLimit,
	rightLimit,
	leftLimit,
	limitAtInfinity,
	limitAtNegativeInfinity
} as const;
