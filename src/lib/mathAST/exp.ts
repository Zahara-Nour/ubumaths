/**
 * Exp - Fluent Wrapper for MathNode
 *
 * Provides a chainable, immutable API for building and manipulating
 * mathematical ASTs. All operations return new Exp instances.
 *
 * @example
 * ```typescript
 * import { Exp, isVariable } from '$lib/mathAST';
 *
 * // Fluent construction: x^2 + 3x - 5 = 0
 * const expr = Exp.variable('x')
 *   .power(Exp.number('2'))
 *   .add(Exp.number('3').multiply(Exp.variable('x')))
 *   .subtract(Exp.number('5'))
 *   .equals(Exp.number('0'));
 *
 * console.log(expr.latex);  // x^{2} + 3 x - 5 = 0
 * console.log(expr.tree);   // Pretty-printed AST
 *
 * // Functions: static and instance
 * Exp.sin(Exp.variable('x'))   // sin(x)
 * Exp.variable('x').sin()      // sin(x) - equivalent
 *
 * // Transformations
 * const colored = expr.map(node =>
 *   isVariable(node) ? { ...node, metadata: { color: 'red' } } : node
 * );
 * ```
 */

import type {
	MathNode,
	NodeMetadata,
	GreekLetter,
	MathSymbol,
	MultiplicationDisplayStyle,
	DivisionDisplayStyle
} from './types';

import type { LatexGeneratorOptions } from './latex-generator';
import type { PrettyPrintOptions } from './pretty-print';
import type { LatexParserOptions } from './parser';
import type { FunctionOptions } from './factory';
import type { NormalForm } from './normal/types';

import { toLatex } from './latex-generator';
import { prettyPrint } from './pretty-print';
import { parseLatex } from './parser';

import {
	number,
	variable,
	greek,
	symbol,
	add,
	subtract,
	multiply,
	divide,
	fraction,
	opposite,
	positive,
	func,
	sin as sinFactory,
	cos as cosFactory,
	tan as tanFactory,
	ln as lnFactory,
	log as logFactory,
	exp as expFactory,
	sqrt as sqrtFactory,
	abs as absFactory,
	parentheses,
	power,
	subscript,
	equals,
	lessThan,
	greaterThan,
	lessThanOrEqual,
	greaterThanOrEqual,
	notEquals,
	approx,
	congruent
} from './factory';

import {
	withMetadata,
	mapNode,
	mapNodeTopDown,
	findNodes,
	findFirst,
	replaceNode,
	getChildren,
	countNodes,
	getDepth,
	cloneNode
} from './transforms';

import { normalize } from './normal/normalize';
import { denormalize } from './normal/denormalize';
import { normalFormsEquivalent, hashNormalForm } from './normal/hash';

// =============================================================================
// Type for Exp or MathNode parameters
// =============================================================================

type ExpOrNode = Exp | MathNode;

// =============================================================================
// Exp Class
// =============================================================================

/**
 * Fluent wrapper for MathNode providing chainable operations.
 * All operations return new Exp instances (immutable).
 */
export class Exp {
	readonly #node: MathNode;
	#cachedNormal?: NormalForm;

	private constructor(node: MathNode) {
		this.#node = node;
	}

	// =========================================================================
	// Helper: Unwrap Exp | MathNode to MathNode
	// =========================================================================

	private static unwrap(value: ExpOrNode): MathNode {
		return value instanceof Exp ? value.#node : value;
	}

	// =========================================================================
	// Output Getters
	// =========================================================================

	/** Get the underlying MathNode */
	get node(): MathNode {
		return this.#node;
	}

	/** Get the node type */
	get type(): MathNode['type'] {
		return this.#node.type;
	}

	/** Generate LaTeX output (default options) */
	get latex(): string {
		return toLatex(this.#node);
	}

	/** Generate pretty-print tree (default options) */
	get tree(): string {
		return prettyPrint(this.#node);
	}

	/** Generate LaTeX with custom options */
	toLatex(options?: LatexGeneratorOptions): string {
		return toLatex(this.#node, options);
	}

	/** Generate pretty-print tree with custom options */
	toTree(options?: PrettyPrintOptions): string {
		return prettyPrint(this.#node, options);
	}

	// =========================================================================
	// Static Factories - Wrapping
	// =========================================================================

	/** Wrap an existing MathNode */
	static from(node: MathNode): Exp {
		return new Exp(node);
	}

	/** Parse LaTeX string into Exp */
	static parse(latex: string, options?: LatexParserOptions): Exp {
		return new Exp(parseLatex(latex, options));
	}

	// =========================================================================
	// Static Factories - Literals
	// =========================================================================

	/** Create a number node */
	static number(value: string, metadata?: NodeMetadata): Exp {
		return new Exp(number(value, metadata));
	}

	/** Create a variable node */
	static variable(name: string, metadata?: NodeMetadata): Exp {
		return new Exp(variable(name, metadata));
	}

	/** Create a Greek letter node */
	static greek(letter: GreekLetter, metadata?: NodeMetadata): Exp {
		return new Exp(greek(letter, metadata));
	}

	/** Create a symbol node */
	static symbol(sym: MathSymbol, metadata?: NodeMetadata): Exp {
		return new Exp(symbol(sym, metadata));
	}

	// =========================================================================
	// Static Factories - Binary Operations
	// =========================================================================

	/** Create addition: left + right */
	static add(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(add(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create subtraction: left - right */
	static subtract(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(subtract(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create multiplication: left * right */
	static multiply(
		left: ExpOrNode,
		right: ExpOrNode,
		style: MultiplicationDisplayStyle = 'implicit'
	): Exp {
		return new Exp(multiply(Exp.unwrap(left), Exp.unwrap(right), style));
	}

	/** Create division: numerator / denominator */
	static divide(
		numerator: ExpOrNode,
		denominator: ExpOrNode,
		style: DivisionDisplayStyle = 'fraction'
	): Exp {
		return new Exp(divide(Exp.unwrap(numerator), Exp.unwrap(denominator), style));
	}

	/** Create fraction (division with 'fraction' style) */
	static fraction(numerator: ExpOrNode, denominator: ExpOrNode): Exp {
		return new Exp(fraction(Exp.unwrap(numerator), Exp.unwrap(denominator)));
	}

	// =========================================================================
	// Static Factories - Unary Operations
	// =========================================================================

	/** Create opposite: -operand */
	static opposite(operand: ExpOrNode): Exp {
		return new Exp(opposite(Exp.unwrap(operand)));
	}

	/** Create positive: +operand */
	static positive(operand: ExpOrNode): Exp {
		return new Exp(positive(Exp.unwrap(operand)));
	}

	// =========================================================================
	// Static Factories - Structural
	// =========================================================================

	/** Create power/superscript: base^exponent */
	static power(base: ExpOrNode, exponent: ExpOrNode): Exp {
		return new Exp(power(Exp.unwrap(base), Exp.unwrap(exponent)));
	}

	/** Create subscript: base_sub */
	static subscript(base: ExpOrNode, sub: ExpOrNode): Exp {
		return new Exp(subscript(Exp.unwrap(base), Exp.unwrap(sub)));
	}

	/** Create parentheses: (content) */
	static parentheses(content: ExpOrNode): Exp {
		return new Exp(parentheses(Exp.unwrap(content)));
	}

	// =========================================================================
	// Static Factories - Functions
	// =========================================================================

	/** Create generic function: name(args...) */
	static func(name: string, args: ExpOrNode[], options?: FunctionOptions): Exp {
		return new Exp(func(name, args.map(Exp.unwrap), options));
	}

	/** Create sin(arg) */
	static sin(arg: ExpOrNode, options?: FunctionOptions): Exp {
		return new Exp(sinFactory(Exp.unwrap(arg), options));
	}

	/** Create cos(arg) */
	static cos(arg: ExpOrNode, options?: FunctionOptions): Exp {
		return new Exp(cosFactory(Exp.unwrap(arg), options));
	}

	/** Create tan(arg) */
	static tan(arg: ExpOrNode, options?: FunctionOptions): Exp {
		return new Exp(tanFactory(Exp.unwrap(arg), options));
	}

	/** Create ln(arg) */
	static ln(arg: ExpOrNode, options?: FunctionOptions): Exp {
		return new Exp(lnFactory(Exp.unwrap(arg), options));
	}

	/** Create log(arg) or log_base(arg) */
	static log(arg: ExpOrNode, base?: ExpOrNode, options?: FunctionOptions): Exp {
		return new Exp(logFactory(Exp.unwrap(arg), base ? Exp.unwrap(base) : undefined, options));
	}

	/** Create exp(arg) */
	static exp(arg: ExpOrNode, options?: FunctionOptions): Exp {
		return new Exp(expFactory(Exp.unwrap(arg), options));
	}

	/** Create sqrt(arg) */
	static sqrt(arg: ExpOrNode, options?: FunctionOptions): Exp {
		return new Exp(sqrtFactory(Exp.unwrap(arg), options));
	}

	/** Create abs(arg) */
	static abs(arg: ExpOrNode, options?: FunctionOptions): Exp {
		return new Exp(absFactory(Exp.unwrap(arg), options));
	}

	// =========================================================================
	// Static Factories - Relations
	// =========================================================================

	/** Create equality: left = right */
	static equals(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(equals(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create less than: left < right */
	static lessThan(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(lessThan(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create greater than: left > right */
	static greaterThan(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(greaterThan(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create less than or equal: left <= right */
	static lessThanOrEqual(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(lessThanOrEqual(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create greater than or equal: left >= right */
	static greaterThanOrEqual(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(greaterThanOrEqual(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create not equal: left != right */
	static notEquals(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(notEquals(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create approximately equal: left ≈ right */
	static approx(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(approx(Exp.unwrap(left), Exp.unwrap(right)));
	}

	/** Create congruent: left ≡ right */
	static congruent(left: ExpOrNode, right: ExpOrNode): Exp {
		return new Exp(congruent(Exp.unwrap(left), Exp.unwrap(right)));
	}

	// =========================================================================
	// Instance Methods - Binary Operations (Fluent)
	// =========================================================================

	/** this + other */
	add(other: ExpOrNode): Exp {
		return Exp.add(this, other);
	}

	/** this - other */
	subtract(other: ExpOrNode): Exp {
		return Exp.subtract(this, other);
	}

	/** this * other (with display style, default: 'implicit') */
	multiply(other: ExpOrNode, style: MultiplicationDisplayStyle = 'implicit'): Exp {
		return Exp.multiply(this, other, style);
	}

	/** this / other (with display style, default: 'fraction') */
	divide(other: ExpOrNode, style: DivisionDisplayStyle = 'fraction'): Exp {
		return Exp.divide(this, other, style);
	}

	/** this / other (fraction display style) */
	fraction(other: ExpOrNode): Exp {
		return Exp.fraction(this, other);
	}

	// =========================================================================
	// Instance Methods - Unary Operations
	// =========================================================================

	/** -this */
	negate(): Exp {
		return Exp.opposite(this);
	}

	/** +this (explicit positive) */
	positive(): Exp {
		return Exp.positive(this);
	}

	// =========================================================================
	// Instance Methods - Structural
	// =========================================================================

	/** this^exponent */
	power(exponent: ExpOrNode): Exp {
		return Exp.power(this, exponent);
	}

	/** this_sub */
	subscript(sub: ExpOrNode): Exp {
		return Exp.subscript(this, sub);
	}

	/** (this) */
	parentheses(): Exp {
		return Exp.parentheses(this);
	}

	// =========================================================================
	// Instance Methods - Functions (apply function to this)
	// =========================================================================

	/** sin(this) */
	sin(options?: FunctionOptions): Exp {
		return Exp.sin(this, options);
	}

	/** cos(this) */
	cos(options?: FunctionOptions): Exp {
		return Exp.cos(this, options);
	}

	/** tan(this) */
	tan(options?: FunctionOptions): Exp {
		return Exp.tan(this, options);
	}

	/** ln(this) */
	ln(options?: FunctionOptions): Exp {
		return Exp.ln(this, options);
	}

	/** log(this) or log_base(this) */
	log(base?: ExpOrNode, options?: FunctionOptions): Exp {
		return Exp.log(this, base, options);
	}

	/** exp(this) */
	exp(options?: FunctionOptions): Exp {
		return Exp.exp(this, options);
	}

	/** sqrt(this) */
	sqrt(options?: FunctionOptions): Exp {
		return Exp.sqrt(this, options);
	}

	/** abs(this) */
	abs(options?: FunctionOptions): Exp {
		return Exp.abs(this, options);
	}

	// =========================================================================
	// Instance Methods - Relations (Fluent)
	// =========================================================================

	/** this = other */
	equals(other: ExpOrNode): Exp {
		return Exp.equals(this, other);
	}

	/** this < other */
	lessThan(other: ExpOrNode): Exp {
		return Exp.lessThan(this, other);
	}

	/** this > other */
	greaterThan(other: ExpOrNode): Exp {
		return Exp.greaterThan(this, other);
	}

	/** this <= other */
	lessThanOrEqual(other: ExpOrNode): Exp {
		return Exp.lessThanOrEqual(this, other);
	}

	/** this >= other */
	greaterThanOrEqual(other: ExpOrNode): Exp {
		return Exp.greaterThanOrEqual(this, other);
	}

	/** this != other */
	notEquals(other: ExpOrNode): Exp {
		return Exp.notEquals(this, other);
	}

	/** this ≈ other */
	approx(other: ExpOrNode): Exp {
		return Exp.approx(this, other);
	}

	/** this ≡ other */
	congruent(other: ExpOrNode): Exp {
		return Exp.congruent(this, other);
	}

	// =========================================================================
	// Instance Methods - Transformations
	// =========================================================================

	/** Add/merge metadata to this node */
	withMetadata(metadata: Partial<NodeMetadata>): Exp {
		return new Exp(withMetadata(this.#node, metadata));
	}

	/** Transform all nodes recursively (bottom-up: children first) */
	map(fn: (node: MathNode) => MathNode): Exp {
		return new Exp(mapNode(this.#node, fn));
	}

	/** Transform all nodes recursively (top-down: parent first) */
	mapTopDown(fn: (node: MathNode) => MathNode): Exp {
		return new Exp(mapNodeTopDown(this.#node, fn));
	}

	/** Find all nodes matching predicate */
	find(predicate: (node: MathNode) => boolean): MathNode[] {
		return findNodes(this.#node, predicate);
	}

	/** Find first node matching predicate */
	findFirst(predicate: (node: MathNode) => boolean): MathNode | undefined {
		return findFirst(this.#node, predicate);
	}

	/** Replace nodes matching predicate */
	replace(
		predicate: (node: MathNode) => boolean,
		replacement: MathNode | ((node: MathNode) => MathNode)
	): Exp {
		return new Exp(replaceNode(this.#node, predicate, replacement));
	}

	/** Get immediate children as MathNode array */
	children(): MathNode[] {
		return getChildren(this.#node);
	}

	/** Count total nodes in tree */
	count(): number {
		return countNodes(this.#node);
	}

	/** Get maximum depth of tree */
	depth(): number {
		return getDepth(this.#node);
	}

	/** Deep clone this expression */
	clone(): Exp {
		return new Exp(cloneNode(this.#node));
	}

	// =========================================================================
	// Instance Methods - Normalization
	// =========================================================================

	/**
	 * Get the normal form of this expression (lazy, cached).
	 *
	 * The normal form is a canonical representation that allows
	 * exact comparison of mathematical equivalence.
	 */
	get normal(): NormalForm {
		if (!this.#cachedNormal) {
			this.#cachedNormal = normalize(this.#node);
		}
		return this.#cachedNormal;
	}

	/**
	 * Get the canonical hash of this expression.
	 *
	 * Two mathematically equivalent expressions will have the same hash.
	 */
	get hash(): string {
		return hashNormalForm(this.normal);
	}

	/**
	 * Check if this expression is mathematically equivalent to another.
	 *
	 * @param other - The expression to compare with
	 * @returns true if the expressions are mathematically equivalent
	 *
	 * @example
	 * const a = Exp.parse('2x + 3x');
	 * const b = Exp.parse('5x');
	 * a.isEquivalent(b) // true
	 *
	 * const c = Exp.parse('(a + b)^2');
	 * const d = Exp.parse('a^2 + 2ab + b^2');
	 * c.isEquivalent(d) // true
	 */
	isEquivalent(other: ExpOrNode): boolean {
		const otherExp = other instanceof Exp ? other : Exp.from(other);
		return normalFormsEquivalent(this.normal, otherExp.normal);
	}

	/**
	 * Get a simplified version of this expression.
	 *
	 * This normalizes the expression and then converts it back to a MathNode,
	 * producing a simplified but human-readable form.
	 *
	 * @returns A new Exp with the simplified expression
	 *
	 * @example
	 * const expr = Exp.parse('2x + 3x');
	 * expr.simplify().latex // '5x'
	 */
	simplify(): Exp {
		return new Exp(denormalize(this.normal));
	}
}
