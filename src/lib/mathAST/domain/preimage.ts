/**
 * Preimage computation for domain analysis.
 *
 * Solves inequalities to find the preimage of a domain constraint:
 * - Linear: ax + b >= c, ax + b <= c
 * - Quadratic: ax² + bx + c >= d, ax² + bx + c <= d
 * - Finding zeros for exclusion
 */

import type { MathNode } from '../types';
import type { Domain } from './types';
import {
	universalDomain,
	intervalDomain,
	emptyDomain,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
	closedInterval,
	realLine,
	excludedPoint
} from './factory';

// =============================================================================
// Expression Classification
// =============================================================================

export type ExpressionKind =
	| { kind: 'constant'; value: number }
	| { kind: 'linear'; a: number; b: number } // a*x + b
	| { kind: 'quadratic'; a: number; b: number; c: number } // a*x² + b*x + c
	| { kind: 'complex' }; // Cannot classify

/**
 * Classify an expression as constant, linear, quadratic, or complex.
 */
export function classifyExpression(expr: MathNode, variable: string): ExpressionKind {
	return classifyExpressionRec(expr, variable);
}

function classifyExpressionRec(expr: MathNode, variable: string): ExpressionKind {
	switch (expr.type) {
		case 'number':
			return { kind: 'constant', value: parseFloat(expr.value) };

		case 'variable':
			if (expr.name === variable) {
				return { kind: 'linear', a: 1, b: 0 };
			} else {
				// Different variable - treat as constant (unknown value)
				return { kind: 'complex' };
			}

		case 'greek':
			if (expr.letter === 'pi') {
				return { kind: 'constant', value: Math.PI };
			}
			return { kind: 'complex' };

		case 'opposite': {
			const inner = classifyExpressionRec(expr.operand, variable);
			return negateClassified(inner);
		}

		case 'positive':
			return classifyExpressionRec(expr.operand, variable);

		case 'addition': {
			const left = classifyExpressionRec(expr.left, variable);
			const right = classifyExpressionRec(expr.right, variable);
			return addClassified(left, right);
		}

		case 'subtraction': {
			const left = classifyExpressionRec(expr.left, variable);
			const right = classifyExpressionRec(expr.right, variable);
			return addClassified(left, negateClassified(right));
		}

		case 'multiplication': {
			const left = classifyExpressionRec(expr.left, variable);
			const right = classifyExpressionRec(expr.right, variable);
			return multiplyClassified(left, right);
		}

		case 'superscript': {
			// x^2 case
			const base = classifyExpressionRec(expr.base, variable);
			const exp = classifyExpressionRec(expr.superscript, variable);

			// Only handle constant exponents
			if (exp.kind !== 'constant') {
				return { kind: 'complex' };
			}

			if (exp.value === 2 && base.kind === 'linear') {
				// (ax + b)² = a²x² + 2abx + b²
				const a = base.a;
				const b = base.b;
				return {
					kind: 'quadratic',
					a: a * a,
					b: 2 * a * b,
					c: b * b
				};
			}

			if (exp.value === 1) {
				return base;
			}

			if (exp.value === 0) {
				return { kind: 'constant', value: 1 };
			}

			return { kind: 'complex' };
		}

		case 'delimiter':
			return classifyExpressionRec(expr.content, variable);

		default:
			return { kind: 'complex' };
	}
}

/**
 * Negate a classified expression.
 */
function negateClassified(expr: ExpressionKind): ExpressionKind {
	switch (expr.kind) {
		case 'constant':
			return { kind: 'constant', value: -expr.value };
		case 'linear':
			return { kind: 'linear', a: -expr.a, b: -expr.b };
		case 'quadratic':
			return { kind: 'quadratic', a: -expr.a, b: -expr.b, c: -expr.c };
		case 'complex':
			return { kind: 'complex' };
	}
}

/**
 * Add two classified expressions.
 */
function addClassified(left: ExpressionKind, right: ExpressionKind): ExpressionKind {
	if (left.kind === 'complex' || right.kind === 'complex') {
		return { kind: 'complex' };
	}

	if (left.kind === 'constant' && right.kind === 'constant') {
		return { kind: 'constant', value: left.value + right.value };
	}

	if (left.kind === 'constant' && right.kind === 'linear') {
		return { kind: 'linear', a: right.a, b: left.value + right.b };
	}

	if (left.kind === 'linear' && right.kind === 'constant') {
		return { kind: 'linear', a: left.a, b: left.b + right.value };
	}

	if (left.kind === 'linear' && right.kind === 'linear') {
		return { kind: 'linear', a: left.a + right.a, b: left.b + right.b };
	}

	if (left.kind === 'constant' && right.kind === 'quadratic') {
		return { kind: 'quadratic', a: right.a, b: right.b, c: left.value + right.c };
	}

	if (left.kind === 'quadratic' && right.kind === 'constant') {
		return { kind: 'quadratic', a: left.a, b: left.b, c: left.c + right.value };
	}

	if (left.kind === 'linear' && right.kind === 'quadratic') {
		return { kind: 'quadratic', a: right.a, b: left.a + right.b, c: left.b + right.c };
	}

	if (left.kind === 'quadratic' && right.kind === 'linear') {
		return { kind: 'quadratic', a: left.a, b: left.b + right.a, c: left.c + right.b };
	}

	if (left.kind === 'quadratic' && right.kind === 'quadratic') {
		return {
			kind: 'quadratic',
			a: left.a + right.a,
			b: left.b + right.b,
			c: left.c + right.c
		};
	}

	return { kind: 'complex' };
}

/**
 * Multiply two classified expressions.
 */
function multiplyClassified(left: ExpressionKind, right: ExpressionKind): ExpressionKind {
	if (left.kind === 'complex' || right.kind === 'complex') {
		return { kind: 'complex' };
	}

	if (left.kind === 'constant' && right.kind === 'constant') {
		return { kind: 'constant', value: left.value * right.value };
	}

	if (left.kind === 'constant') {
		const k = left.value;
		if (right.kind === 'linear') {
			return { kind: 'linear', a: k * right.a, b: k * right.b };
		}
		if (right.kind === 'quadratic') {
			return { kind: 'quadratic', a: k * right.a, b: k * right.b, c: k * right.c };
		}
	}

	if (right.kind === 'constant') {
		const k = right.value;
		if (left.kind === 'linear') {
			return { kind: 'linear', a: k * left.a, b: k * left.b };
		}
		if (left.kind === 'quadratic') {
			return { kind: 'quadratic', a: k * left.a, b: k * left.b, c: k * left.c };
		}
	}

	// linear * linear = quadratic
	if (left.kind === 'linear' && right.kind === 'linear') {
		// (a1*x + b1) * (a2*x + b2) = a1*a2*x² + (a1*b2 + a2*b1)*x + b1*b2
		return {
			kind: 'quadratic',
			a: left.a * right.a,
			b: left.a * right.b + left.b * right.a,
			c: left.b * right.b
		};
	}

	// Higher degree - complex
	return { kind: 'complex' };
}

// =============================================================================
// Inequality Solving
// =============================================================================

/**
 * Solve a linear inequality: a*x + b >= c or a*x + b <= c
 *
 * @param a - Coefficient of x
 * @param b - Constant term
 * @param op - '>=' or '<='
 * @param bound - The bound value (right side)
 * @param strict - If true, use > or < instead of >= or <=
 * @param variable - Variable name (for documentation)
 * @returns The solution domain
 */
export function solveLinearInequality(
	a: number,
	b: number,
	op: '>=' | '<=',
	bound: number,
	strict: boolean,
	_variable: string
): Domain {
	// a*x + b >= bound  =>  a*x >= bound - b
	// a*x + b <= bound  =>  a*x <= bound - b
	const rhs = bound - b;

	if (Math.abs(a) < 1e-10) {
		// Degenerate case: no x term
		// Check if b satisfies the constraint
		const satisfied =
			op === '>=' ? (strict ? b > bound : b >= bound) : strict ? b < bound : b <= bound;
		return satisfied ? universalDomain() : emptyDomain();
	}

	const solution = rhs / a;

	// If a > 0, inequality direction is preserved
	// If a < 0, inequality direction is flipped
	if (a > 0) {
		if (op === '>=') {
			return intervalDomain([strict ? greaterThan(solution) : greaterThanOrEqual(solution)]);
		} else {
			return intervalDomain([strict ? lessThan(solution) : lessThanOrEqual(solution)]);
		}
	} else {
		// a < 0, flip inequality
		if (op === '>=') {
			return intervalDomain([strict ? lessThan(solution) : lessThanOrEqual(solution)]);
		} else {
			return intervalDomain([strict ? greaterThan(solution) : greaterThanOrEqual(solution)]);
		}
	}
}

/**
 * Solve a quadratic inequality: a*x² + b*x + c >= d or a*x² + b*x + c <= d
 *
 * @param a - Coefficient of x²
 * @param b - Coefficient of x
 * @param c - Constant term
 * @param op - '>=' or '<='
 * @param bound - The bound value (right side)
 * @param strict - If true, use > or < instead of >= or <=
 * @param variable - Variable name (for documentation)
 * @returns The solution domain
 */
export function solveQuadraticInequality(
	a: number,
	b: number,
	c: number,
	op: '>=' | '<=',
	bound: number,
	strict: boolean,
	variable: string
): Domain {
	// a*x² + b*x + c >= bound  =>  a*x² + b*x + (c - bound) >= 0
	const newC = c - bound;

	if (Math.abs(a) < 1e-10) {
		// Not really quadratic, delegate to linear
		return solveLinearInequality(b, newC, op, 0, strict, variable);
	}

	// Solve a*x² + b*x + newC = 0
	const discriminant = b * b - 4 * a * newC;

	if (discriminant < 0) {
		// No real roots
		// If a > 0: parabola opens up, always positive
		// If a < 0: parabola opens down, always negative
		if (a > 0) {
			return op === '>=' ? universalDomain() : emptyDomain();
		} else {
			return op === '<=' ? universalDomain() : emptyDomain();
		}
	}

	if (Math.abs(discriminant) < 1e-10) {
		// One root (tangent to axis)
		const root = -b / (2 * a);
		if (a > 0) {
			// Parabola opens up, touches 0 at root
			if (op === '>=') {
				return strict ? intervalDomain([realLine()], [excludedPoint(root)]) : universalDomain();
			} else {
				return strict ? emptyDomain() : intervalDomain([closedInterval(root, root)]);
			}
		} else {
			// Parabola opens down, touches 0 at root
			if (op === '<=') {
				return strict ? intervalDomain([realLine()], [excludedPoint(root)]) : universalDomain();
			} else {
				return strict ? emptyDomain() : intervalDomain([closedInterval(root, root)]);
			}
		}
	}

	// Two distinct roots
	const sqrtD = Math.sqrt(discriminant);
	const root1 = (-b - sqrtD) / (2 * a);
	const root2 = (-b + sqrtD) / (2 * a);
	const minRoot = Math.min(root1, root2);
	const maxRoot = Math.max(root1, root2);

	if (a > 0) {
		// Parabola opens up: negative between roots, positive outside
		if (op === '>=') {
			// Want where >= 0: x <= minRoot OR x >= maxRoot
			if (strict) {
				return intervalDomain([lessThan(minRoot), greaterThan(maxRoot)]);
			} else {
				return intervalDomain([lessThanOrEqual(minRoot), greaterThanOrEqual(maxRoot)]);
			}
		} else {
			// Want where <= 0: minRoot <= x <= maxRoot
			if (strict) {
				return intervalDomain([
					{
						kind: 'interval',
						lower: { value: minRoot, type: 'open' },
						upper: { value: maxRoot, type: 'open' }
					}
				]);
			} else {
				return intervalDomain([closedInterval(minRoot, maxRoot)]);
			}
		}
	} else {
		// Parabola opens down: positive between roots, negative outside
		if (op === '>=') {
			// Want where >= 0: minRoot <= x <= maxRoot
			if (strict) {
				return intervalDomain([
					{
						kind: 'interval',
						lower: { value: minRoot, type: 'open' },
						upper: { value: maxRoot, type: 'open' }
					}
				]);
			} else {
				return intervalDomain([closedInterval(minRoot, maxRoot)]);
			}
		} else {
			// Want where <= 0: x <= minRoot OR x >= maxRoot
			if (strict) {
				return intervalDomain([lessThan(minRoot), greaterThan(maxRoot)]);
			} else {
				return intervalDomain([lessThanOrEqual(minRoot), greaterThanOrEqual(maxRoot)]);
			}
		}
	}
}

// =============================================================================
// Zero Finding
// =============================================================================

/**
 * Find the zeros of an expression (values where expr = 0).
 *
 * @param expr - The expression to analyze
 * @param variable - The variable to solve for
 * @returns Array of numeric zeros found
 */
export function findZeros(expr: MathNode, variable: string): number[] {
	const classified = classifyExpression(expr, variable);

	switch (classified.kind) {
		case 'constant':
			// Constant is zero only if value is 0
			return Math.abs(classified.value) < 1e-10 ? [0] : [];

		case 'linear':
			// a*x + b = 0  =>  x = -b/a
			if (Math.abs(classified.a) < 1e-10) {
				return [];
			}
			return [-classified.b / classified.a];

		case 'quadratic':
			// a*x² + b*x + c = 0
			return solveQuadraticZeros(classified.a, classified.b, classified.c);

		case 'complex':
			// Cannot find zeros analytically
			return [];
	}
}

/**
 * Solve a*x² + b*x + c = 0.
 */
function solveQuadraticZeros(a: number, b: number, c: number): number[] {
	if (Math.abs(a) < 1e-10) {
		// Linear case
		if (Math.abs(b) < 1e-10) {
			return [];
		}
		return [-c / b];
	}

	const discriminant = b * b - 4 * a * c;

	if (discriminant < 0) {
		return [];
	}

	if (Math.abs(discriminant) < 1e-10) {
		return [-b / (2 * a)];
	}

	const sqrtD = Math.sqrt(discriminant);
	return [(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)];
}
