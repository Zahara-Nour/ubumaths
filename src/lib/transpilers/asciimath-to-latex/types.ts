/**
 * Types for ASCIIMath to LaTeX transpiler
 *
 * This module defines the token types, AST node types, and configuration
 * for the ASCIIMath parser and transpiler.
 */

/**
 * Token types produced by the lexer
 */
export type TokenType =
	| 'NUMBER' // 123, 3.14
	| 'IDENTIFIER' // x, abc
	| 'FUNCTION' // sqrt, sin, cos, log, abs, root
	| 'GREEK' // alpha, beta, pi, theta
	| 'SYMBOL' // oo, +-, !=, forall, etc.
	| 'OPERATOR' // +, -, *, /, ^, _, =, <, >, :
	| 'LPAREN' // (
	| 'RPAREN' // )
	| 'LBRACKET' // [
	| 'RBRACKET' // ]
	| 'LBRACE' // {
	| 'RBRACE' // }
	| 'PIPE' // |
	| 'TEMPLATE' // {{...}} (full content preserved)
	| 'WHITESPACE'
	| 'EOF';

/**
 * Token produced by the lexer
 */
export interface Token {
	type: TokenType;
	value: string;
	start: number;
	end: number;
}

/**
 * Base interface for all AST nodes
 */
export interface BaseNode {
	type: string;
	start: number;
	end: number;
}

/**
 * Numeric literal node (e.g., 123, 3.14)
 */
export interface NumberNode extends BaseNode {
	type: 'Number';
	value: string;
}

/**
 * Identifier node (e.g., x, abc)
 */
export interface IdentifierNode extends BaseNode {
	type: 'Identifier';
	name: string;
}

/**
 * Greek letter node (e.g., alpha, beta)
 */
export interface GreekNode extends BaseNode {
	type: 'Greek';
	name: string;
}

/**
 * Symbol node (e.g., oo, +-, !=)
 */
export interface SymbolNode extends BaseNode {
	type: 'Symbol';
	name: string;
}

/**
 * Template placeholder node (e.g., {{x}})
 * Content is preserved as-is during transpilation
 */
export interface TemplateNode extends BaseNode {
	type: 'Template';
	content: string;
}

/**
 * Absolute value node (e.g., |x+y|)
 */
export interface AbsNode extends BaseNode {
	type: 'Abs';
	expression: ASTNode;
}

/**
 * Group node for curly braces (e.g., {x+y})
 */
export interface GroupNode extends BaseNode {
	type: 'Group';
	expression: ASTNode;
}

/**
 * Parentheses or bracket node (e.g., (x+y), [a,b])
 */
export interface ParenNode extends BaseNode {
	type: 'Paren';
	expression: ASTNode;
	bracket: '(' | '[';
}

/**
 * Binary operation node (e.g., x + y, a * b)
 */
export interface BinaryOpNode extends BaseNode {
	type: 'BinaryOp';
	operator: string;
	left: ASTNode;
	right: ASTNode;
}

/**
 * Unary operation node (e.g., -x, +y)
 */
export interface UnaryOpNode extends BaseNode {
	type: 'UnaryOp';
	operator: string;
	operand: ASTNode;
}

/**
 * Fraction node (e.g., x/y)
 */
export interface FractionNode extends BaseNode {
	type: 'Fraction';
	numerator: ASTNode;
	denominator: ASTNode;
}

/**
 * Superscript node (e.g., x^2)
 */
export interface SuperscriptNode extends BaseNode {
	type: 'Superscript';
	base: ASTNode;
	exponent: ASTNode;
}

/**
 * Subscript node (e.g., x_i)
 */
export interface SubscriptNode extends BaseNode {
	type: 'Subscript';
	base: ASTNode;
	subscript: ASTNode;
}

/**
 * Combined subscript and superscript node (e.g., x_i^2)
 */
export interface SubSupNode extends BaseNode {
	type: 'SubSup';
	base: ASTNode;
	subscript: ASTNode;
	superscript: ASTNode;
}

/**
 * Function call node (e.g., sqrt(x), sin(x))
 */
export interface FunctionNode extends BaseNode {
	type: 'Function';
	name: string;
	argument: ASTNode;
}

/**
 * Root node (e.g., root(n)(x) for nth root)
 */
export interface RootNode extends BaseNode {
	type: 'Root';
	index: ASTNode;
	radicand: ASTNode;
}

/**
 * Union type of all AST node types
 */
export type ASTNode =
	| NumberNode
	| IdentifierNode
	| GreekNode
	| SymbolNode
	| TemplateNode
	| AbsNode
	| GroupNode
	| ParenNode
	| BinaryOpNode
	| UnaryOpNode
	| FractionNode
	| SuperscriptNode
	| SubscriptNode
	| SubSupNode
	| FunctionNode
	| RootNode;

/**
 * Options for the transpiler
 */
export interface TranspileOptions {
	/**
	 * Whether to preserve template placeholders ({{...}}) in output
	 * @default true
	 */
	preserveTemplates?: boolean;
}

/**
 * Result of a transpilation operation
 */
export interface TranspileResult {
	/**
	 * Whether the transpilation succeeded
	 */
	success: boolean;

	/**
	 * The resulting LaTeX string
	 */
	latex: string;

	/**
	 * Error message if transpilation failed
	 */
	error?: string;

	/**
	 * Number of template placeholders preserved in output
	 */
	templatesPreserved: number;
}
