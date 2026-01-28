/**
 * MathAST - Mathematical Abstract Syntax Tree Type Definitions
 *
 * A comprehensive type system for representing mathematical expressions
 * as an immutable abstract syntax tree.
 */

import type { Unit } from './units/types';
import type { MatrixType } from './matrix/types';

// =============================================================================
// Greek Letters
// =============================================================================

/**
 * Supported Greek letter names (lowercase only)
 *
 * This is a limited set of Greek letters supported by both LaTeX and Custom parsers.
 * Only these letters can be used as variables in mathematical expressions.
 *
 * Note: π is NOT a GreekLetter - it's a MathConstant. Use piConstant() or PI.
 * Similarly, e (Euler's number) is MathConstant('euler'), not a variable.
 *
 * Supported: alpha, beta, gamma, theta
 * Not supported: pi (use MathConstant), omega, sigma, delta, epsilon, etc.
 */
export type GreekLetter = 'alpha' | 'beta' | 'gamma' | 'theta';

// =============================================================================
// Mathematical Constants
// =============================================================================

/**
 * Mathematical constants that have special meaning.
 *
 * - 'euler': Euler's number e ≈ 2.71828...
 * - 'pi': π ≈ 3.14159...
 *
 * Note: The imaginary unit 'i' is represented as ComplexNode(0, 1), not as a MathConstant.
 */
export type MathConstant = 'euler' | 'pi';

// =============================================================================
// Mathematical Symbols
// =============================================================================

/**
 * Special mathematical symbols
 */
export type MathSymbol =
	| 'infinity'
	| 'emptyset'
	| 'partial'
	| 'nabla'
	| 'forall'
	| 'exists'
	| 'nexists'
	| 'in'
	| 'notin'
	| 'subset'
	| 'supset'
	| 'subseteq'
	| 'supseteq'
	| 'union'
	| 'intersection'
	| 'setminus'
	| 'therefore'
	| 'because'
	| 'qed'
	| 'aleph'
	| 'beth'
	| 'ell'
	| 'wp'
	| 'Re'
	| 'Im'
	| 'hbar'
	| 'degree'
	| 'prime'
	| 'dprime'
	| 'approx'
	| 'simeq'
	| 'cong'
	| 'propto'
	| 'perp'
	| 'parallel'
	| 'angle'
	| 'measuredangle'
	| 'triangle'
	| 'square'
	| 'diamond'
	| 'star'
	| 'circ'
	| 'bullet'
	| 'cdot'
	| 'times'
	| 'div'
	| 'pm'
	| 'mp'
	| 'ast'
	| 'oplus'
	| 'ominus'
	| 'otimes'
	| 'odot';

// =============================================================================
// Node Metadata
// =============================================================================

/**
 * Optional metadata that can be attached to any node for rendering hints
 */
export interface NodeMetadata {
	readonly color?: string;
	readonly style?: 'normal' | 'bold' | 'italic';
	readonly annotation?: string;
}

// =============================================================================
// Base Node Interface
// =============================================================================

/**
 * Base interface for all AST nodes
 */
interface BaseNode {
	readonly type: string;
	readonly metadata?: NodeMetadata;
}

// =============================================================================
// Literal Nodes
// =============================================================================

/**
 * Represents a numeric literal
 * Value is stored as string to preserve exact formatting (e.g., "3.14" vs "3.140")
 */
export interface NumberNode extends BaseNode {
	readonly type: 'number';
	readonly value: string;
}

/**
 * Represents a variable (single letter or multi-character identifier)
 */
export interface VariableNode extends BaseNode {
	readonly type: 'variable';
	readonly name: string;
}

/**
 * Represents a Greek letter used as a variable or constant
 */
export interface GreekLetterNode extends BaseNode {
	readonly type: 'greek';
	readonly letter: GreekLetter;
}

/**
 * Represents a special mathematical symbol
 */
export interface SymbolNode extends BaseNode {
	readonly type: 'symbol';
	readonly symbol: MathSymbol;
}

/**
 * Represents a placeholder/hole to be filled in by the user
 * Used for interactive exercises and fill-in-the-blank questions
 */
export interface HoleNode extends BaseNode {
	readonly type: 'hole';
	readonly index: number;
	readonly placeholder?: string;
}

/**
 * Represents a mathematical constant (e or π).
 *
 * This node type distinguishes mathematical constants from regular variables,
 * enabling proper handling in integration (e^x), evaluation (Math.E, Math.PI),
 * and symbolic manipulation.
 *
 * Note: The imaginary unit 'i' is NOT represented as MathConstantNode.
 * It is represented as ComplexNode(0, 1) for proper complex arithmetic.
 */
export interface MathConstantNode extends BaseNode {
	readonly type: 'constant';
	readonly constant: MathConstant;
}

/**
 * Union of all literal node types
 */
export type LiteralNode =
	| NumberNode
	| VariableNode
	| GreekLetterNode
	| SymbolNode
	| HoleNode
	| MathConstantNode;

// =============================================================================
// Binary Operation Nodes
// =============================================================================

/**
 * Represents addition: left + right
 */
export interface AdditionNode extends BaseNode {
	readonly type: 'addition';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly operatorMetadata?: NodeMetadata;
}

/**
 * Represents subtraction: left - right
 */
export interface SubtractionNode extends BaseNode {
	readonly type: 'subtraction';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly operatorMetadata?: NodeMetadata;
}

/**
 * Display styles for multiplication
 */
export type MultiplicationDisplayStyle = 'implicit' | 'dot' | 'cross' | 'star';

/**
 * Represents multiplication: left * right
 * displayStyle controls how the operation is rendered
 */
export interface MultiplicationNode extends BaseNode {
	readonly type: 'multiplication';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly displayStyle: MultiplicationDisplayStyle;
	readonly operatorMetadata?: NodeMetadata;
}

/**
 * Display styles for division
 */
export type DivisionDisplayStyle = 'fraction' | 'inline' | 'ratio';

/**
 * Represents division: numerator / denominator
 * displayStyle controls how the operation is rendered
 */
export interface DivisionNode extends BaseNode {
	readonly type: 'division';
	readonly numerator: MathNode;
	readonly denominator: MathNode;
	readonly displayStyle: DivisionDisplayStyle;
	readonly operatorMetadata?: NodeMetadata;
}

/**
 * Union of all binary operation node types
 */
export type BinaryOperationNode =
	| AdditionNode
	| SubtractionNode
	| MultiplicationNode
	| DivisionNode;

// =============================================================================
// Unary Operation Nodes
// =============================================================================

/**
 * Represents the negation/opposite of a value: -operand
 */
export interface OppositeNode extends BaseNode {
	readonly type: 'opposite';
	readonly operand: MathNode;
	readonly operatorMetadata?: NodeMetadata;
}

/**
 * Represents an explicit positive sign: +operand
 */
export interface PositiveNode extends BaseNode {
	readonly type: 'positive';
	readonly operand: MathNode;
	readonly operatorMetadata?: NodeMetadata;
}

/**
 * Union of all unary operation node types
 */
export type UnaryOperationNode = OppositeNode | PositiveNode;

// =============================================================================
// Function Node
// =============================================================================

/**
 * Represents a mathematical function application
 * Examples: sin(x), log_2(8), f^2(x), f'(x), f^{-1}(x)
 */
export interface FunctionNode extends BaseNode {
	readonly type: 'function';
	readonly name: string;
	readonly args: readonly MathNode[];
	readonly power?: MathNode;
	readonly base?: MathNode;
	readonly derivativeOrder?: number; // 1=f', 2=f'', 3=f'''
	readonly isInverse?: boolean; // true for f^{-1}
	readonly nameMetadata?: NodeMetadata;
	readonly delimiterMetadata?: NodeMetadata;
	readonly leftDelimiterMetadata?: NodeMetadata;
	readonly rightDelimiterMetadata?: NodeMetadata;
}

// =============================================================================
// Structural Nodes
// =============================================================================

/**
 * Types of delimiters that can surround content
 */
export type DelimiterType = 'parentheses';

/**
 * Semantic meaning of delimited content
 */
export type DelimiterSemantic = 'grouping' | 'interval' | 'set' | 'matrix' | 'vector';

/**
 * Represents content surrounded by delimiters
 * semantic provides meaning for interpretation
 */
export interface DelimiterNode extends BaseNode {
	readonly type: 'delimiter';
	readonly delimiters: DelimiterType;
	readonly content: MathNode;
	readonly semantic?: DelimiterSemantic;
	readonly delimiterMetadata?: NodeMetadata;
	readonly leftDelimiterMetadata?: NodeMetadata;
	readonly rightDelimiterMetadata?: NodeMetadata;
}

/**
 * Represents a subscript: base_subscript
 */
export interface SubscriptNode extends BaseNode {
	readonly type: 'subscript';
	readonly base: MathNode;
	readonly subscript: MathNode;
}

/**
 * Represents a superscript/exponent: base^superscript
 */
export interface SuperscriptNode extends BaseNode {
	readonly type: 'superscript';
	readonly base: MathNode;
	readonly superscript: MathNode;
}

/**
 * Union of all structural node types
 */
export type StructuralNode = DelimiterNode | SubscriptNode | SuperscriptNode;

// =============================================================================
// Relation Node
// =============================================================================

/**
 * Types of mathematical relations
 */
export type RelationType =
	| '='
	| '<'
	| '>'
	| '<='
	| '>='
	| '!='
	| '≡'
	| '≢'
	| '≈'
	| '≃'
	| '∼'
	| '≺'
	| '≻'
	| '⊂'
	| '⊃'
	| '⊆'
	| '⊇'
	| '∈'
	| '∉'
	| '⟹'
	| '⟺'
	| '⟸';

/**
 * Represents a mathematical relation between two expressions
 */
export interface RelationNode extends BaseNode {
	readonly type: 'relation';
	readonly relation: RelationType;
	readonly left: MathNode;
	readonly right: MathNode;
	readonly relationMetadata?: NodeMetadata;
}

// =============================================================================
// Unit Node
// =============================================================================

/**
 * Represents an expression with an associated physical unit.
 * The expression is wrapped and the unit is attached to the result.
 *
 * Examples:
 * - 5 m: UnitNode(NumberNode('5'), m)
 * - (3 + 4) km: UnitNode(AdditionNode(...), km)
 * - v m/s: UnitNode(VariableNode('v'), m/s)
 */
export interface UnitNode extends BaseNode {
	readonly type: 'unit';
	readonly expression: MathNode;
	readonly unit: Unit;
	readonly unitMetadata?: NodeMetadata;
}

// =============================================================================
// Matrix Node
// =============================================================================

/**
 * Represents a matrix (2D array of mathematical expressions).
 *
 * Examples:
 * - 2x2 matrix: [[1, 2], [3, 4]]
 * - Row vector: [[1, 2, 3]]
 * - Column vector: [[1], [2], [3]]
 * - Identity matrix: [[1, 0], [0, 1]]
 *
 * The matrixType controls LaTeX rendering (pmatrix, bmatrix, etc.)
 */
export interface MatrixNode extends BaseNode {
	readonly type: 'matrix';
	readonly rows: readonly (readonly MathNode[])[];
	readonly matrixType: MatrixType;
}

// =============================================================================
// Complex Number Node
// =============================================================================

/**
 * Represents a complex number with real and imaginary parts.
 *
 * Both parts are MathNodes, allowing symbolic expressions:
 * - Simple: 3 + 4i → ComplexNode(NumberNode('3'), NumberNode('4'))
 * - Symbolic: √2 + √3i → ComplexNode(sqrt(2), sqrt(3))
 * - Variable: x + yi → ComplexNode(VariableNode('x'), VariableNode('y'))
 *
 * The imaginary unit 'i' is implicit - the imaginary field is the coefficient.
 */
export interface ComplexNode extends BaseNode {
	readonly type: 'complex';
	readonly real: MathNode;
	readonly imaginary: MathNode;
}

// =============================================================================
// Infinity Node
// =============================================================================

/**
 * Sign of infinity: positive (+∞) or negative (-∞)
 */
export type InfinitySign = 'positive' | 'negative';

/**
 * Represents positive or negative infinity as a proper AST node.
 *
 * This is distinct from the 'infinity' MathSymbol which is unsigned.
 * InfinityNode has explicit sign tracking, essential for:
 * - Limits: lim_{x→+∞} vs lim_{x→-∞}
 * - One-sided limits: lim_{x→0⁺} 1/x = +∞ vs lim_{x→0⁻} 1/x = -∞
 * - Arithmetic with infinities: +∞ + 1 = +∞, -∞ × (-1) = +∞
 *
 * @example
 * // Positive infinity
 * { type: 'infinity', sign: 'positive' }  // +∞
 *
 * // Negative infinity
 * { type: 'infinity', sign: 'negative' }  // -∞
 */
export interface InfinityNode extends BaseNode {
	readonly type: 'infinity';
	readonly sign: InfinitySign;
}

// =============================================================================
// Limit Node
// =============================================================================

/**
 * Direction of approach for a limit:
 * - 'left': approaching from below (x → a⁻)
 * - 'right': approaching from above (x → a⁺)
 * - 'both': two-sided limit (x → a)
 */
export type LimitDirection = 'left' | 'right' | 'both';

/**
 * Represents a mathematical limit expression: lim_{x → a} f(x)
 *
 * Supports:
 * - Two-sided limits: lim_{x → a} f(x)
 * - One-sided limits: lim_{x → a⁺} f(x), lim_{x → a⁻} f(x)
 * - Limits at infinity: lim_{x → ∞} f(x), lim_{x → -∞} f(x)
 *
 * @example
 * // lim_{x → 0} sin(x)/x
 * {
 *   type: 'limit',
 *   expression: divide(func('sin', [variable('x')]), variable('x')),
 *   variable: 'x',
 *   approach: number('0'),
 *   direction: 'both'
 * }
 *
 * // lim_{x → 0⁺} 1/x = +∞
 * {
 *   type: 'limit',
 *   expression: divide(number('1'), variable('x')),
 *   variable: 'x',
 *   approach: number('0'),
 *   direction: 'right'
 * }
 *
 * // lim_{x → +∞} 1/x = 0
 * {
 *   type: 'limit',
 *   expression: divide(number('1'), variable('x')),
 *   variable: 'x',
 *   approach: { type: 'infinity', sign: 'positive' },
 *   direction: 'both'
 * }
 */
export interface LimitNode extends BaseNode {
	readonly type: 'limit';
	readonly expression: MathNode;
	readonly variable: string;
	readonly approach: MathNode;
	readonly direction: LimitDirection;
}

// =============================================================================
// Function Composition Node
// =============================================================================

/**
 * Represents function composition: outer composed with inner (outer ∘ inner)
 *
 * This represents the mathematical operation (f ∘ g)(x) = f(g(x))
 *
 * Examples:
 * - f ∘ g: CompositionNode(f, g) - applying g first, then f
 * - sin ∘ cos: the function that computes sin(cos(x))
 * - (f ∘ g) ∘ h: nested composition
 */
export interface CompositionNode extends BaseNode {
	readonly type: 'composition';
	readonly outer: MathNode; // f in f ∘ g
	readonly inner: MathNode; // g in f ∘ g
	readonly operatorMetadata?: NodeMetadata;
}

// =============================================================================
// Union Type for All Nodes
// =============================================================================

/**
 * Union of all possible MathAST node types
 */
export type MathNode =
	| NumberNode
	| VariableNode
	| GreekLetterNode
	| SymbolNode
	| HoleNode
	| MathConstantNode
	| AdditionNode
	| SubtractionNode
	| MultiplicationNode
	| DivisionNode
	| OppositeNode
	| PositiveNode
	| FunctionNode
	| DelimiterNode
	| SubscriptNode
	| SuperscriptNode
	| RelationNode
	| UnitNode
	| MatrixNode
	| CompositionNode
	| ComplexNode
	| InfinityNode
	| LimitNode;

// =============================================================================
// Node Type Extraction
// =============================================================================

/**
 * Extract the type literal from a MathNode
 */
export type MathNodeType = MathNode['type'];
