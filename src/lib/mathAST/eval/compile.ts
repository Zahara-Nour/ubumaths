/**
 * MathAST Compiler — compiles a MathNode into a native JS closure
 * for fast numerical evaluation.
 *
 * Used by the curve plotter to evaluate y=f(x) thousands of times per render.
 * Each call to compile() walks the AST once and returns a closure that can be
 * invoked with variable bindings — no AST traversal or BigInt arithmetic at
 * evaluation time.
 *
 * @example
 * ```typescript
 * const f = compile(parseLatex('x^2 + 2\\sin(x)'));
 * f({ x: 0.5 }); // => 1.2094...
 * ```
 */

import type { FunctionNode, MathNode } from '../types';
import {
	isNumber,
	isVariable,
	isGreek,
	isMathConstant,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isFunction,
	isDelimiter,
	isSuperscript,
	isRelation,
	isLogical,
	isLogicalNot,
	isBoolean,
	isPiecewise
} from '../guards';
import { flattenRelationChain } from '../flatten';

export type CompiledFn = (vars: Record<string, number>) => number;

/** Map of supported function names to their JS implementations. */
const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
	arcsin: Math.asin,
	arccos: Math.acos,
	arctan: Math.atan,
	sinh: Math.sinh,
	cosh: Math.cosh,
	tanh: Math.tanh,
	arcsinh: Math.asinh,
	arccosh: Math.acosh,
	arctanh: Math.atanh,
	exp: Math.exp,
	ln: Math.log,
	log: Math.log10,
	log10: Math.log10,
	log2: Math.log2,
	sqrt: Math.sqrt,
	cbrt: Math.cbrt,
	abs: Math.abs,
	floor: Math.floor,
	ceil: Math.ceil,
	round: Math.round,
	min: Math.min,
	max: Math.max
};

/**
 * Compile a MathNode into a native JS closure for fast numerical evaluation.
 * Throws at compile time if the AST contains unsupported node types.
 */
export function compile(node: MathNode): CompiledFn {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return () => val;
	}

	if (isVariable(node)) {
		// 'e' as a standalone variable is Euler's number (same convention as evaluate.ts)
		if (node.name === 'e') {
			return () => Math.E;
		}
		const name = node.name;
		return (v) => v[name] ?? NaN;
	}

	if (isGreek(node)) {
		const name = node.letter;
		return (v) => v[name] ?? NaN;
	}

	if (isMathConstant(node)) {
		const val = node.constant === 'pi' ? Math.PI : Math.E;
		return () => val;
	}

	if (isAddition(node)) {
		const left = compile(node.left);
		const right = compile(node.right);
		return (v) => left(v) + right(v);
	}

	if (isSubtraction(node)) {
		const left = compile(node.left);
		const right = compile(node.right);
		return (v) => left(v) - right(v);
	}

	if (isMultiplication(node)) {
		const left = compile(node.left);
		const right = compile(node.right);
		return (v) => left(v) * right(v);
	}

	if (isDivision(node)) {
		const num = compile(node.numerator);
		const den = compile(node.denominator);
		return (v) => num(v) / den(v);
	}

	if (isOpposite(node)) {
		const operand = compile(node.operand);
		return (v) => -operand(v);
	}

	if (isPositive(node)) {
		return compile(node.operand);
	}

	if (isSuperscript(node)) {
		const base = compile(node.base);
		const exponent = compile(node.superscript);
		return (v) => Math.pow(base(v), exponent(v));
	}

	if (isDelimiter(node)) {
		return compile(node.content);
	}

	if (isFunction(node)) {
		return compileFunction(node);
	}

	if (node.type === 'infinity') {
		const val = node.sign === 'positive' ? Infinity : -Infinity;
		return () => val;
	}

	if (node.type === 'signed-zero') {
		return () => 0;
	}

	if (isPiecewise(node)) {
		const compiledPieces = node.pieces.map((p) => ({
			condition: compileCondition(p.condition),
			value: compile(p.value)
		}));
		const compiledOtherwise = node.otherwise !== undefined ? compile(node.otherwise) : null;
		return (vars) => {
			for (const piece of compiledPieces) {
				if (piece.condition(vars)) return piece.value(vars);
			}
			return compiledOtherwise ? compiledOtherwise(vars) : NaN;
		};
	}

	throw new CompileError(`Unsupported node type: ${node.type}`);
}

/**
 * Compiled condition: takes variable bindings, returns a boolean.
 * Supports relations (`a < b`), logical and/or/not, relation chains
 * (`a < x <= b`), and boolean literals.
 */
type CompiledCondition = (vars: Record<string, number>) => boolean;

function compileCondition(node: MathNode): CompiledCondition {
	if (isBoolean(node)) {
		const v = node.value;
		return () => v;
	}

	if (isLogical(node)) {
		const left = compileCondition(node.left);
		const right = compileCondition(node.right);
		if (node.operator === 'and') return (v) => left(v) && right(v);
		return (v) => left(v) || right(v);
	}

	if (isLogicalNot(node)) {
		const operand = compileCondition(node.operand);
		return (v) => !operand(v);
	}

	if (isRelation(node)) {
		// Relation chains (a < b < c) are nested RelationNodes — flatten first.
		const chain = flattenRelationChain(node);
		if (chain.operands.length < 2) {
			throw new CompileError(`Invalid relation chain (no operands)`);
		}

		const operands = chain.operands.map(compile);
		const relations = chain.relations;

		return (v) => {
			let prev = operands[0](v);
			for (let i = 0; i < relations.length; i++) {
				const cur = operands[i + 1](v);
				if (!compareNumbers(prev, relations[i], cur)) return false;
				prev = cur;
			}
			return true;
		};
	}

	throw new CompileError(`Unsupported condition node type: ${node.type}`);
}

function compareNumbers(a: number, op: string, b: number): boolean {
	switch (op) {
		case '<':
			return a < b;
		case '<=':
		case '≤':
			return a <= b;
		case '>':
			return a > b;
		case '>=':
		case '≥':
			return a >= b;
		case '=':
			return a === b;
		case '!=':
		case '≠':
			return a !== b;
	}
	return false;
}

/** Inverse function mapping for isInverse=true. */
const INVERSE_FUNCTIONS: Record<string, (...args: number[]) => number> = {
	sin: Math.asin,
	cos: Math.acos,
	tan: Math.atan,
	sinh: Math.asinh,
	cosh: Math.acosh,
	tanh: Math.atanh
};

function compileFunction(node: FunctionNode): CompiledFn {
	const { name, args } = node;

	// Nth root: sqrt with base property → x^(1/n)
	if (name === 'sqrt' && node.base) {
		const arg = compile(args[0]);
		const base = compile(node.base);
		return wrapPower(node, (v) => Math.pow(arg(v), 1 / base(v)));
	}

	// log with base property → log_n(x) = ln(x) / ln(n)
	if ((name === 'log' || name === 'ln') && node.base) {
		const arg = compile(args[0]);
		const base = compile(node.base);
		return wrapPower(node, (v) => Math.log(arg(v)) / Math.log(base(v)));
	}

	// Inverse function: sin⁻¹(x) → arcsin(x)
	if (node.isInverse) {
		const inverseFn = INVERSE_FUNCTIONS[name];
		if (!inverseFn) {
			throw new CompileError(`Unsupported inverse function: ${name}⁻¹`);
		}
		const arg0 = compile(args[0]);
		return wrapPower(node, (v) => inverseFn(arg0(v)));
	}

	const mathFn = MATH_FUNCTIONS[name];
	if (!mathFn) {
		throw new CompileError(`Unsupported function: ${name}`);
	}

	const compiledArgs = args.map((a) => compile(a));
	let baseFn: CompiledFn;

	if (compiledArgs.length === 1) {
		const arg0 = compiledArgs[0];
		baseFn = (v) => mathFn(arg0(v));
	} else if (compiledArgs.length === 2) {
		const arg0 = compiledArgs[0];
		const arg1 = compiledArgs[1];
		baseFn = (v) => mathFn(arg0(v), arg1(v));
	} else {
		// Variadic (min, max, etc.)
		baseFn = (v) => mathFn(...compiledArgs.map((a) => a(v)));
	}

	return wrapPower(node, baseFn);
}

/** Wraps a function result with Math.pow if the FunctionNode has a power property (e.g. sin²(x)). */
function wrapPower(node: FunctionNode, baseFn: CompiledFn): CompiledFn {
	if (!node.power) return baseFn;
	const powerFn = compile(node.power);
	return (v) => Math.pow(baseFn(v), powerFn(v));
}

/**
 * Create a safe evaluator function from a MathNode.
 * Combines compile() with domain-error handling: returns null instead of
 * NaN/Infinity for undefined values (sqrt of negative, division by zero, etc.).
 *
 * Used by both the Grapheur and geometry-core for curve rendering.
 *
 * @param ast - The expression to compile
 * @param variable - The variable name (default: 'x')
 * @returns A function that takes a number and returns number | null
 */
export function createSafeEvaluator(
	ast: MathNode,
	variable: string = 'x'
): (x: number) => number | null {
	const fn = compile(ast);
	return (x: number) => {
		if (!Number.isFinite(x)) return null;
		const y = fn({ [variable]: x });
		return Number.isFinite(y) ? y : null;
	};
}

export class CompileError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CompileError';
	}
}
