/**
 * MathAST - Mathematical Abstract Syntax Tree
 *
 * A comprehensive library for representing mathematical expressions
 * as an immutable abstract syntax tree, designed as a pivot structure
 * for transpilation between LaTeX and custom syntax.
 *
 * @example
 * ```typescript
 * import { MathAST, isVariable, mapNode, withMetadata } from '$lib/mathAST';
 *
 * // Create expression: x^2 + 3x - 5 = 0
 * const ast = MathAST.equals(
 *   MathAST.subtract(
 *     MathAST.add(
 *       MathAST.power(MathAST.variable('x'), MathAST.number('2')),
 *       MathAST.implicitMultiply(MathAST.number('3'), MathAST.variable('x'))
 *     ),
 *     MathAST.number('5')
 *   ),
 *   MathAST.number('0')
 * );
 *
 * // Color all variables red
 * const colored = mapNode(ast, node =>
 *   isVariable(node) ? withMetadata(node, { color: 'red' }) : node
 * );
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
	// Metadata
	NodeMetadata,

	// Greek letters
	GreekLetter,
	GreekLetterLowercase,
	GreekLetterUppercase,

	// Symbols
	MathSymbol,

	// Display styles
	MultiplicationDisplayStyle,
	DivisionDisplayStyle,
	DelimiterType,
	DelimiterSemantic,
	RelationType,

	// Node types
	MathNode,
	NumberNode,
	VariableNode,
	GreekLetterNode,
	SymbolNode,
	AdditionNode,
	SubtractionNode,
	MultiplicationNode,
	DivisionNode,
	OppositeNode,
	PositiveNode,
	FunctionNode,
	DelimiterNode,
	SubscriptNode,
	SuperscriptNode,
	RelationNode,

	// Union types
	LiteralNode,
	BinaryOperationNode,
	UnaryOperationNode,
	StructuralNode,

	// Utility types
	MathNodeType
} from './types';

// =============================================================================
// Factory Functions
// =============================================================================

export {
	// Namespace with all factories
	MathAST,

	// Individual factories (for tree-shaking)
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
	iff
} from './factory';

// =============================================================================
// Transformation Helpers
// =============================================================================

export {
	withMetadata,
	getChildren,
	mapNode,
	mapNodeTopDown,
	findNodes,
	findFirst,
	replaceNode,
	cloneNode,
	countNodes,
	getDepth
} from './transforms';

// =============================================================================
// Type Guards
// =============================================================================

export {
	// Category type guards
	isLiteralNode,
	isBinaryOperationNode,
	isUnaryOperationNode,
	isStructuralNode,

	// Individual type guards
	isNumber,
	isVariable,
	isGreek,
	isSymbol,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isFunction,
	isDelimiter,
	isSubscript,
	isSuperscript,
	isRelation,

	// Utility predicates
	hasChildren,
	isLeaf,
	hasMetadata,

	// Specific predicates
	isFraction,
	isImplicitMultiplication,
	isComparison,
	isEquality,
	isInequality
} from './guards';
