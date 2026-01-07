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
	DivisionDisplayStyle,
	RelationNode
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

import { substitute as substituteFunc, evaluate as evaluateFunc } from './eval';
import type { EvalBindings, EvalOptions, EvalResult } from './eval';

import { differentiate as differentiateFunc, differentiateN } from './differentiation';
import type { DifferentiationOptions } from './differentiation';

import { match, applyRules } from './pattern';
import type { Pattern, Rule } from './pattern';

import { solve as solveEquation, SolveError } from './solve';
import type { SolveOptions, SolveResult } from './solve';

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

	// =========================================================================
	// Instance Methods - Pattern Matching
	// =========================================================================

	/**
	 * Check if this expression matches a pattern.
	 *
	 * @param pattern - The pattern to match against
	 * @returns true if the expression matches the pattern
	 *
	 * @example
	 * const expr = Exp.parse('x + 0');
	 * expr.matches(P.add(P._('a'), P.num(0))) // true
	 * expr.matches(P.mul(P._('a'), P.num(0))) // false
	 */
	matches(pattern: Pattern): boolean {
		return match(pattern, this.#node).success;
	}

	/**
	 * Extract bindings from pattern match.
	 *
	 * Returns a map of wildcard names to matched nodes if the pattern matches,
	 * or null if the pattern doesn't match.
	 *
	 * @param pattern - The pattern to match against
	 * @returns Map of bindings if match succeeds, null otherwise
	 *
	 * @example
	 * const expr = Exp.parse('x + 5');
	 * const bindings = expr.extract(P.add(P._('left'), P._('right')));
	 * // bindings.get('left') => variable('x')
	 * // bindings.get('right') => number('5')
	 *
	 * const noMatch = expr.extract(P.mul(P._('a'), P._('b')));
	 * // noMatch => null
	 */
	extract(pattern: Pattern): Map<string, MathNode> | null {
		const result = match(pattern, this.#node);
		return result.success ? new Map(result.bindings) : null;
	}

	/**
	 * Apply simplification rules to this expression.
	 *
	 * Rules are applied recursively until no more changes occur (fixpoint).
	 * Rules are sorted by priority (higher priority first) and applied in order.
	 *
	 * @param rules - Array of rules to apply
	 * @param maxIterations - Maximum iterations to prevent infinite loops (default 100)
	 * @returns A new Exp with rules applied
	 *
	 * @example
	 * import { arithmeticRules } from '$lib/mathAST/pattern';
	 *
	 * const expr = Exp.parse('(x + 0) * 1');
	 * const simplified = expr.simplifyWith(arithmeticRules);
	 * // simplified.latex => 'x'
	 *
	 * @example
	 * import { allRules } from '$lib/mathAST/pattern';
	 *
	 * const expr = Exp.parse('x^1 + 0');
	 * const simplified = expr.simplifyWith(allRules);
	 * // simplified.latex => 'x'
	 */
	simplifyWith(rules: readonly Rule[], maxIterations?: number): Exp {
		const newNode = applyRules([...rules], this.#node, maxIterations);
		return new Exp(newNode);
	}

	// =========================================================================
	// Instance Methods - Evaluation
	// =========================================================================

	/**
	 * Evaluate this expression numerically (must not contain unsubstituted variables).
	 *
	 * The expression must be fully substituted before evaluation. Use `evalWith()`
	 * if you have variables to substitute, or call `substitute()` first.
	 *
	 * @param options - Evaluation options (mode: 'exact' or 'decimal', precision)
	 * @returns EvalResult containing the numeric value, AST node, and exactness flag
	 * @throws Error if expression contains unsubstituted variables
	 *
	 * @example
	 * // Exact evaluation
	 * Exp.parse('2+3').eval()
	 * // { value: { n: 5n, d: 1n }, exact: true, node: ... }
	 *
	 * @example
	 * // Decimal mode for transcendental functions
	 * Exp.parse('\\sqrt{2}').eval({ mode: 'decimal' })
	 * // { value: 1.4142135623730951, exact: false, node: ... }
	 *
	 * @example
	 * // Error: unsubstituted variable
	 * Exp.parse('x+1').eval()
	 * // throws Error: Cannot evaluate expression with unsubstituted variables: x
	 */
	eval(options?: EvalOptions): EvalResult {
		return evaluateFunc(this.#node, options);
	}

	/**
	 * Substitute variables then evaluate to numeric value.
	 *
	 * This is a convenience method that combines `substitute()` and `eval()`.
	 * It first replaces variables with the provided bindings, then evaluates
	 * the resulting expression to a numeric value.
	 *
	 * @param bindings - Map of variable names to their replacement values
	 * @param options - Evaluation options (mode: 'exact' or 'decimal', precision)
	 * @returns EvalResult containing the numeric value, AST node, and exactness flag
	 *
	 * @example
	 * // Substitute and evaluate: x^2 with x = 3
	 * Exp.parse('x^2').evalWith({ x: 3 })
	 * // { value: { n: 9n, d: 1n }, exact: true, node: ... }
	 *
	 * @example
	 * // Multiple variables: x * y + z with x = 2, y = 3, z = 5
	 * Exp.parse('x \\cdot y + z').evalWith({ x: 2, y: 3, z: 5 })
	 * // { value: { n: 11n, d: 1n }, exact: true, node: ... }
	 *
	 * @example
	 * // String bindings (parsed as LaTeX): x + 1 with x = '2+3'
	 * Exp.parse('x+1').evalWith({ x: '2+3' })
	 * // { value: { n: 6n, d: 1n }, exact: true, node: ... }
	 *
	 * @example
	 * // Greek letters: alpha^2 + beta with alpha = 5, beta = 3
	 * Exp.parse('\\alpha^2 + \\beta').evalWith({ alpha: 5, beta: 3 })
	 * // { value: { n: 28n, d: 1n }, exact: true, node: ... }
	 */
	evalWith(bindings: EvalBindings, options?: EvalOptions): EvalResult {
		const substituted = substituteFunc(this.#node, bindings);
		return evaluateFunc(substituted, options);
	}

	/**
	 * Substitute variables without evaluating (returns new Exp).
	 *
	 * Replaces all variables (regular and Greek letters) that have bindings
	 * with their corresponding values. Returns a new Exp with the substituted
	 * expression. The original Exp is unchanged (immutable operation).
	 *
	 * Substitution values can be:
	 * - numbers: Converted to NumberNode (e.g., 5 -> number('5'))
	 * - strings: Parsed as LaTeX expressions
	 * - MathNode: Used directly
	 *
	 * @param bindings - Map of variable names to their replacement values
	 * @returns A new Exp with variables substituted
	 *
	 * @example
	 * // Simple substitution: x + 1 with x = 5
	 * const original = Exp.parse('x+1');
	 * const substituted = original.substitute({ x: 5 });
	 * substituted.latex // '5 + 1'
	 * original.latex    // 'x + 1' (unchanged)
	 *
	 * @example
	 * // Multiple variables: x * y with x = 2, y = 3
	 * Exp.parse('x \\cdot y').substitute({ x: 2, y: 3 }).latex
	 * // '2 \\cdot 3'
	 *
	 * @example
	 * // String substitution (parsed): x^2 with x = 'a+b'
	 * Exp.parse('x^2').substitute({ x: 'a+b' }).latex
	 * // '(a + b)^{2}'
	 *
	 * @example
	 * // Greek letters: alpha + beta with alpha = 5
	 * Exp.parse('\\alpha + \\beta').substitute({ alpha: 5 }).latex
	 * // '5 + \\beta'
	 */
	substitute(bindings: EvalBindings): Exp {
		return new Exp(substituteFunc(this.#node, bindings));
	}

	// =========================================================================
	// Instance Methods - Differentiation
	// =========================================================================

	/**
	 * Compute the symbolic derivative of this expression.
	 *
	 * Returns a new Exp representing the derivative of this expression
	 * with respect to the specified variable (default: 'x').
	 *
	 * @param variable - Variable to differentiate with respect to (default: 'x')
	 * @param options - Additional differentiation options
	 * @returns A new Exp containing the derivative
	 *
	 * @example
	 * // d/dx(x^2) = 2x
	 * Exp.parse('x^2').differentiate().latex // '2 x'
	 *
	 * @example
	 * // d/dx(sin(x)) = cos(x)
	 * Exp.parse('\\sin(x)').differentiate().latex // '\\cos(x)'
	 *
	 * @example
	 * // d/dy(x*y^2) = 2xy
	 * Exp.parse('x y^2').differentiate('y').latex // '2 x y'
	 *
	 * @example
	 * // Chain rule: d/dx(sin(x^2)) = 2x*cos(x^2)
	 * Exp.parse('\\sin(x^2)').differentiate().latex // '2 x \\cos(x^{2})'
	 *
	 * @example
	 * // With function bindings
	 * const bindings = {
	 *   f: { expression: parseLatex('x^2'), parameters: ['x'] }
	 * };
	 * Exp.parse('f(x)').differentiate('x', { functions: bindings }).latex // '2 x'
	 */
	differentiate(variable: string = 'x', options?: Omit<DifferentiationOptions, 'variable'>): Exp {
		const result = differentiateFunc(this.#node, { variable, ...options });
		return new Exp(result);
	}

	/**
	 * Alias for `differentiate()`.
	 *
	 * Compute the symbolic derivative of this expression.
	 *
	 * @param variable - Variable to differentiate with respect to (default: 'x')
	 * @param options - Additional differentiation options
	 * @returns A new Exp containing the derivative
	 *
	 * @example
	 * Exp.parse('x^3').diff().latex // '3 x^{2}'
	 */
	diff(variable: string = 'x', options?: Omit<DifferentiationOptions, 'variable'>): Exp {
		return this.differentiate(variable, options);
	}

	/**
	 * Compute the nth derivative of this expression.
	 *
	 * @param n - Order of the derivative (1, 2, 3, ...)
	 * @param variable - Variable to differentiate with respect to (default: 'x')
	 * @param options - Additional differentiation options
	 * @returns A new Exp containing the nth derivative
	 *
	 * @example
	 * // d²/dx²(x^3) = 6x
	 * Exp.parse('x^3').nthDerivative(2).latex // '6 x'
	 *
	 * @example
	 * // d³/dx³(x^4) = 24x
	 * Exp.parse('x^4').nthDerivative(3).latex // '24 x'
	 */
	nthDerivative(
		n: number,
		variable: string = 'x',
		options?: Omit<DifferentiationOptions, 'variable'>
	): Exp {
		const result = differentiateN(this.#node, n, { variable, ...options });
		return new Exp(result);
	}

	// =========================================================================
	// Instance Methods - Equation Solving
	// =========================================================================

	/**
	 * Solve this expression as an equation.
	 *
	 * This expression must be a relation with '=' (e.g., 2x + 4 = 0).
	 * Returns a SolveResult containing the solutions and step-by-step explanations.
	 *
	 * @param options - Solving options (variable, verbosity, precision)
	 * @returns SolveResult with solutions and metadata
	 * @throws SolveError if the expression is not an equation or cannot be solved
	 *
	 * @example
	 * // Solve linear equation: 2x + 4 = 0
	 * const result = Exp.parse('2x + 4 = 0').solve();
	 * // result.status === 'unique'
	 * // result.solutions[0].value represents x = -2
	 *
	 * @example
	 * // Solve quadratic equation with detailed steps
	 * const result = Exp.parse('x^2 - 5x + 6 = 0').solve({ verbosity: 'detailed' });
	 * // result.status === 'multiple'
	 * // result.solutions contains x = 2 and x = 3
	 * // result.steps contains step-by-step explanation
	 *
	 * @example
	 * // Solve for a specific variable
	 * const result = Exp.parse('a*x + b = 0').solve({ variable: 'x' });
	 * // Solves for x in terms of a and b
	 *
	 * @example
	 * // Handle no real solution
	 * const result = Exp.parse('x^2 + 1 = 0').solve();
	 * // result.status === 'no-real-solution'
	 */
	solve(options?: SolveOptions): SolveResult {
		if (this.#node.type !== 'relation') {
			throw new SolveError(
				"L'expression doit etre une equation (ex: 2x + 3 = 0)",
				'unknown',
				`Type recu: ${this.#node.type}`
			);
		}

		const relation = this.#node as RelationNode;
		if (relation.relation !== '=') {
			throw new SolveError(
				'Seules les egalites peuvent etre resolues',
				'unknown',
				`Relation recue: ${relation.relation}`
			);
		}

		return solveEquation(relation, options);
	}

	/**
	 * Get solutions of this equation as Exp instances.
	 *
	 * Convenience method that solves the equation and returns the solution
	 * values wrapped in Exp instances for further manipulation.
	 *
	 * @param options - Solving options (variable, verbosity, precision)
	 * @returns Array of Exp instances representing the solutions
	 * @throws SolveError if the expression is not an equation or cannot be solved
	 *
	 * @example
	 * // Get solutions as Exp instances
	 * const solutions = Exp.parse('x^2 - 4 = 0').solutions();
	 * solutions.map(s => s.latex) // ['2', '-2'] or similar
	 *
	 * @example
	 * // Chain with other operations
	 * const [sol] = Exp.parse('x^2 - 2 = 0').solutions();
	 * sol.latex // '\\sqrt{2}' or similar
	 */
	solutions(options?: SolveOptions): Exp[] {
		const result = this.solve(options);
		return result.solutions.map((sol) => new Exp(sol.value));
	}
}
