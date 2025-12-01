/**
 * LaTeX Generator for ASCIIMath transpiler
 *
 * Converts AST nodes produced by the parser into LaTeX strings.
 * Preserves template placeholders ({{...}}) exactly as-is.
 */

import type { ASTNode } from './types.js';
import { GREEK_LETTERS, SYMBOLS } from './symbols.js';

/**
 * Result of LaTeX generation
 */
export interface GenerateResult {
	/** Generated LaTeX string */
	latex: string;
	/** Number of template placeholders preserved in output */
	templatesPreserved: number;
}

/**
 * Converts AST nodes to LaTeX strings
 */
export class LatexGenerator {
	private templateCount: number = 0;

	/**
	 * Generate LaTeX from an AST node
	 */
	generate(node: ASTNode): GenerateResult {
		this.templateCount = 0;
		const latex = this.visit(node);
		return {
			latex,
			templatesPreserved: this.templateCount
		};
	}

	/**
	 * Visit a node and generate its LaTeX representation
	 */
	private visit(node: ASTNode): string {
		switch (node.type) {
			case 'Number':
				return this.visitNumber(node);
			case 'Identifier':
				return this.visitIdentifier(node);
			case 'Greek':
				return this.visitGreek(node);
			case 'Symbol':
				return this.visitSymbol(node);
			case 'Template':
				return this.visitTemplate(node);
			case 'Group':
				return this.visitGroup(node);
			case 'Paren':
				return this.visitParen(node);
			case 'Abs':
				return this.visitAbs(node);
			case 'BinaryOp':
				return this.visitBinaryOp(node);
			case 'UnaryOp':
				return this.visitUnaryOp(node);
			case 'Fraction':
				return this.visitFraction(node);
			case 'Superscript':
				return this.visitSuperscript(node);
			case 'Subscript':
				return this.visitSubscript(node);
			case 'SubSup':
				return this.visitSubSup(node);
			case 'Function':
				return this.visitFunction(node);
			case 'Root':
				return this.visitRoot(node);
			case 'ImplicitMul':
				return this.visitImplicitMul(node);
			default: {
				// Exhaustiveness check
				const _exhaustive: never = node;
				throw new Error(`Unknown node type: ${(_exhaustive as ASTNode).type}`);
			}
		}
	}

	/**
	 * Visit a number node (e.g., 123, 3.14)
	 */
	private visitNumber(node: { value: string }): string {
		return node.value;
	}

	/**
	 * Visit an identifier node (e.g., x, abc)
	 */
	private visitIdentifier(node: { name: string }): string {
		return node.name;
	}

	/**
	 * Visit a Greek letter node (e.g., alpha -> \alpha)
	 */
	private visitGreek(node: { name: string }): string {
		return GREEK_LETTERS[node.name] ?? node.name;
	}

	/**
	 * Visit a symbol node (e.g., oo -> \infty)
	 */
	private visitSymbol(node: { name: string }): string {
		return SYMBOLS[node.name] ?? node.name;
	}

	/**
	 * Visit a template placeholder node (e.g., {{x}})
	 * Preserves content exactly as-is
	 */
	private visitTemplate(node: { content: string }): string {
		this.templateCount++;
		return `{{${node.content}}}`;
	}

	/**
	 * Visit a group node (e.g., {x+y})
	 */
	private visitGroup(node: { expression: ASTNode }): string {
		return `{${this.visit(node.expression)}}`;
	}

	/**
	 * Visit a parentheses/bracket node (e.g., (x+y), [a,b])
	 */
	private visitParen(node: { expression: ASTNode; bracket: '(' | '[' }): string {
		const content = this.visit(node.expression);
		if (node.bracket === '(') {
			return `\\left(${content}\\right)`;
		} else {
			return `\\left[${content}\\right]`;
		}
	}

	/**
	 * Visit an absolute value node (e.g., |x|)
	 */
	private visitAbs(node: { expression: ASTNode }): string {
		const content = this.visit(node.expression);
		return `\\left|${content}\\right|`;
	}

	/**
	 * Visit a binary operation node (e.g., a+b, a*b)
	 */
	private visitBinaryOp(node: { operator: string; left: ASTNode; right: ASTNode }): string {
		const left = this.visit(node.left);
		const right = this.visit(node.right);
		const op = this.translateOperator(node.operator);
		return `${left}${op}${right}`;
	}

	/**
	 * Visit a unary operation node (e.g., -x)
	 */
	private visitUnaryOp(node: { operator: string; operand: ASTNode }): string {
		const operand = this.visit(node.operand);
		return `${node.operator}${operand}`;
	}

	/**
	 * Visit a fraction node (e.g., a/b -> \frac{a}{b})
	 */
	private visitFraction(node: { numerator: ASTNode; denominator: ASTNode }): string {
		const numerator = this.visit(node.numerator);
		const denominator = this.visit(node.denominator);
		return `\\frac{${numerator}}{${denominator}}`;
	}

	/**
	 * Visit a superscript node (e.g., x^2)
	 */
	private visitSuperscript(node: { base: ASTNode; exponent: ASTNode }): string {
		const base = this.visit(node.base);
		const exponent = this.visit(node.exponent);
		return `${base}^{${exponent}}`;
	}

	/**
	 * Visit a subscript node (e.g., x_i)
	 */
	private visitSubscript(node: { base: ASTNode; subscript: ASTNode }): string {
		const base = this.visit(node.base);
		const subscript = this.visit(node.subscript);
		return `${base}_{${subscript}}`;
	}

	/**
	 * Visit a combined subscript/superscript node (e.g., x_i^2)
	 */
	private visitSubSup(node: { base: ASTNode; subscript: ASTNode; superscript: ASTNode }): string {
		const base = this.visit(node.base);
		const subscript = this.visit(node.subscript);
		const superscript = this.visit(node.superscript);
		return `${base}_{${subscript}}^{${superscript}}`;
	}

	/**
	 * Visit a function node (e.g., sin(x), sqrt(x))
	 */
	private visitFunction(node: { name: string; argument: ASTNode }): string {
		const arg = this.visit(node.argument);

		// Special handling for different function types
		switch (node.name) {
			case 'sqrt':
				return `\\sqrt{${arg}}`;
			case 'abs':
				return `\\left|${arg}\\right|`;
			case 'sin':
			case 'cos':
			case 'tan':
			case 'log':
			case 'ln':
			case 'exp':
				return `\\${node.name}\\left(${arg}\\right)`;
			default:
				// Generic function
				return `\\text{${node.name}}\\left(${arg}\\right)`;
		}
	}

	/**
	 * Visit a root node (e.g., root(n)(x) -> \sqrt[n]{x})
	 */
	private visitRoot(node: { index: ASTNode; radicand: ASTNode }): string {
		const index = this.visit(node.index);
		const radicand = this.visit(node.radicand);
		return `\\sqrt[${index}]{${radicand}}`;
	}

	/**
	 * Visit an implicit multiplication node (e.g., 2x, xy, 2(x+1))
	 * Output as juxtaposition without any multiplication symbol
	 */
	private visitImplicitMul(node: { left: ASTNode; right: ASTNode }): string {
		const left = this.visit(node.left);
		const right = this.visit(node.right);
		return `${left}${right}`;
	}

	/**
	 * Translate an operator to its LaTeX representation
	 */
	private translateOperator(op: string): string {
		const mapping: Record<string, string> = {
			'*': ' \\times ',
			':': ' \\div ',
			'+': '+',
			'-': '-',
			'=': '=',
			'<': '<',
			'>': '>',
			// Multi-character operators (also in SYMBOLS)
			'<=': '\\leq',
			'>=': '\\geq',
			'!=': '\\neq',
			'~~': '\\approx',
			'-=': '\\equiv',
			'~': '\\sim',
			prop: '\\propto',
			// Arrows
			'<=>': '\\Leftrightarrow',
			'<->': '\\leftrightarrow',
			'=>': '\\Rightarrow',
			'->': '\\to',
			// Multi-char comparisons
			'<<': '\\ll',
			'>>': '\\gg'
		};

		// Check mapping first, then SYMBOLS, then return as-is
		return mapping[op] ?? SYMBOLS[op] ?? op;
	}
}
