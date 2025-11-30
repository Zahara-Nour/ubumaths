/**
 * MathAST - Mathematical Abstract Syntax Tree Type Definitions
 *
 * A comprehensive type system for representing mathematical expressions
 * as an immutable abstract syntax tree.
 */

// =============================================================================
// Greek Letters
// =============================================================================

/**
 * Lowercase Greek letter names
 */
export type GreekLetterLowercase =
	| 'alpha'
	| 'beta'
	| 'gamma'
	| 'delta'
	| 'epsilon'
	| 'zeta'
	| 'eta'
	| 'theta'
	| 'iota'
	| 'kappa'
	| 'lambda'
	| 'mu'
	| 'nu'
	| 'xi'
	| 'omicron'
	| 'pi'
	| 'rho'
	| 'sigma'
	| 'tau'
	| 'upsilon'
	| 'phi'
	| 'chi'
	| 'psi'
	| 'omega';

/**
 * Uppercase Greek letter names
 */
export type GreekLetterUppercase =
	| 'Alpha'
	| 'Beta'
	| 'Gamma'
	| 'Delta'
	| 'Epsilon'
	| 'Zeta'
	| 'Eta'
	| 'Theta'
	| 'Iota'
	| 'Kappa'
	| 'Lambda'
	| 'Mu'
	| 'Nu'
	| 'Xi'
	| 'Omicron'
	| 'Pi'
	| 'Rho'
	| 'Sigma'
	| 'Tau'
	| 'Upsilon'
	| 'Phi'
	| 'Chi'
	| 'Psi'
	| 'Omega';

/**
 * All Greek letter names (lowercase and uppercase)
 */
export type GreekLetter = GreekLetterLowercase | GreekLetterUppercase;

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
 * Union of all literal node types
 */
export type LiteralNode = NumberNode | VariableNode | GreekLetterNode | SymbolNode;

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
}

/**
 * Represents subtraction: left - right
 */
export interface SubtractionNode extends BaseNode {
	readonly type: 'subtraction';
	readonly left: MathNode;
	readonly right: MathNode;
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
}

/**
 * Represents an explicit positive sign: +operand
 */
export interface PositiveNode extends BaseNode {
	readonly type: 'positive';
	readonly operand: MathNode;
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
 * Examples: sin(x), log_2(8), f^2(x)
 */
export interface FunctionNode extends BaseNode {
	readonly type: 'function';
	readonly name: string;
	readonly args: readonly MathNode[];
	readonly power?: MathNode;
	readonly base?: MathNode;
}

// =============================================================================
// Structural Nodes
// =============================================================================

/**
 * Types of delimiters that can surround content
 */
export type DelimiterType =
	| 'parentheses'
	| 'brackets'
	| 'braces'
	| 'invisible'
	| 'absolute'
	| 'floor'
	| 'ceiling';

/**
 * Semantic meaning of delimited content
 */
export type DelimiterSemantic =
	| 'grouping'
	| 'interval'
	| 'set'
	| 'absolute'
	| 'floor'
	| 'ceiling'
	| 'matrix'
	| 'vector';

/**
 * Represents content surrounded by delimiters
 * semantic provides meaning for interpretation
 */
export interface DelimiterNode extends BaseNode {
	readonly type: 'delimiter';
	readonly delimiters: DelimiterType;
	readonly content: MathNode;
	readonly semantic?: DelimiterSemantic;
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
	| RelationNode;

// =============================================================================
// Node Type Extraction
// =============================================================================

/**
 * Extract the type literal from a MathNode
 */
export type MathNodeType = MathNode['type'];
