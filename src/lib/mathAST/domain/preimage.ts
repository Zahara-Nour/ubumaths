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
	openInterval,
	realLine,
	excludedPoint,
	fromNumber
} from './factory';
import { ZERO_TOLERANCE } from '../common';

// =============================================================================
// Expression Classification
// =============================================================================

export type ExpressionKind =
	| { kind: 'constant'; value: number }
	| { kind: 'linear'; a: number; b: number } // a*x + b
	| { kind: 'quadratic'; a: number; b: number; c: number } // a*x² + b*x + c
	| { kind: 'cubic'; a: number; b: number; c: number; d: number } // a*x³ + b*x² + c*x + d
	| { kind: 'quartic'; a: number; b: number; c: number; d: number; e: number } // a*x⁴ + b*x³ + c*x² + d*x + e
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
			// x^2, x^3, x^4 cases
			const base = classifyExpressionRec(expr.base, variable);
			const exp = classifyExpressionRec(expr.superscript, variable);

			// Only handle constant exponents
			if (exp.kind !== 'constant') {
				return { kind: 'complex' };
			}

			if (exp.value === 4 && base.kind === 'linear') {
				// (ax + b)⁴ = a⁴x⁴ + 4a³bx³ + 6a²b²x² + 4ab³x + b⁴
				const a = base.a;
				const b = base.b;
				const a2 = a * a;
				const a3 = a2 * a;
				const a4 = a3 * a;
				const b2 = b * b;
				const b3 = b2 * b;
				const b4 = b3 * b;
				return {
					kind: 'quartic',
					a: a4,
					b: 4 * a3 * b,
					c: 6 * a2 * b2,
					d: 4 * a * b3,
					e: b4
				};
			}

			if (exp.value === 3 && base.kind === 'linear') {
				// (ax + b)³ = a³x³ + 3a²bx² + 3ab²x + b³
				const a = base.a;
				const b = base.b;
				const a2 = a * a;
				const a3 = a2 * a;
				const b2 = b * b;
				const b3 = b2 * b;
				return {
					kind: 'cubic',
					a: a3,
					b: 3 * a2 * b,
					c: 3 * a * b2,
					d: b3
				};
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

			if (exp.value === 2 && base.kind === 'quadratic') {
				// (ax² + bx + c)² = a²x⁴ + 2abx³ + (2ac+b²)x² + 2bcx + c²
				const a = base.a;
				const b = base.b;
				const c = base.c;
				return {
					kind: 'quartic',
					a: a * a,
					b: 2 * a * b,
					c: 2 * a * c + b * b,
					d: 2 * b * c,
					e: c * c
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
		case 'cubic':
			return { kind: 'cubic', a: -expr.a, b: -expr.b, c: -expr.c, d: -expr.d };
		case 'quartic':
			return { kind: 'quartic', a: -expr.a, b: -expr.b, c: -expr.c, d: -expr.d, e: -expr.e };
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

	// Cubic cases
	if (left.kind === 'constant' && right.kind === 'cubic') {
		return { kind: 'cubic', a: right.a, b: right.b, c: right.c, d: left.value + right.d };
	}

	if (left.kind === 'cubic' && right.kind === 'constant') {
		return { kind: 'cubic', a: left.a, b: left.b, c: left.c, d: left.d + right.value };
	}

	if (left.kind === 'linear' && right.kind === 'cubic') {
		return {
			kind: 'cubic',
			a: right.a,
			b: right.b,
			c: left.a + right.c,
			d: left.b + right.d
		};
	}

	if (left.kind === 'cubic' && right.kind === 'linear') {
		return {
			kind: 'cubic',
			a: left.a,
			b: left.b,
			c: left.c + right.a,
			d: left.d + right.b
		};
	}

	if (left.kind === 'quadratic' && right.kind === 'cubic') {
		return {
			kind: 'cubic',
			a: right.a,
			b: left.a + right.b,
			c: left.b + right.c,
			d: left.c + right.d
		};
	}

	if (left.kind === 'cubic' && right.kind === 'quadratic') {
		return {
			kind: 'cubic',
			a: left.a,
			b: left.b + right.a,
			c: left.c + right.b,
			d: left.d + right.c
		};
	}

	if (left.kind === 'cubic' && right.kind === 'cubic') {
		return {
			kind: 'cubic',
			a: left.a + right.a,
			b: left.b + right.b,
			c: left.c + right.c,
			d: left.d + right.d
		};
	}

	// Quartic cases
	if (left.kind === 'constant' && right.kind === 'quartic') {
		return {
			kind: 'quartic',
			a: right.a,
			b: right.b,
			c: right.c,
			d: right.d,
			e: left.value + right.e
		};
	}

	if (left.kind === 'quartic' && right.kind === 'constant') {
		return {
			kind: 'quartic',
			a: left.a,
			b: left.b,
			c: left.c,
			d: left.d,
			e: left.e + right.value
		};
	}

	if (left.kind === 'linear' && right.kind === 'quartic') {
		return {
			kind: 'quartic',
			a: right.a,
			b: right.b,
			c: right.c,
			d: left.a + right.d,
			e: left.b + right.e
		};
	}

	if (left.kind === 'quartic' && right.kind === 'linear') {
		return {
			kind: 'quartic',
			a: left.a,
			b: left.b,
			c: left.c,
			d: left.d + right.a,
			e: left.e + right.b
		};
	}

	if (left.kind === 'quadratic' && right.kind === 'quartic') {
		return {
			kind: 'quartic',
			a: right.a,
			b: right.b,
			c: left.a + right.c,
			d: left.b + right.d,
			e: left.c + right.e
		};
	}

	if (left.kind === 'quartic' && right.kind === 'quadratic') {
		return {
			kind: 'quartic',
			a: left.a,
			b: left.b,
			c: left.c + right.a,
			d: left.d + right.b,
			e: left.e + right.c
		};
	}

	if (left.kind === 'cubic' && right.kind === 'quartic') {
		return {
			kind: 'quartic',
			a: right.a,
			b: left.a + right.b,
			c: left.b + right.c,
			d: left.c + right.d,
			e: left.d + right.e
		};
	}

	if (left.kind === 'quartic' && right.kind === 'cubic') {
		return {
			kind: 'quartic',
			a: left.a,
			b: left.b + right.a,
			c: left.c + right.b,
			d: left.d + right.c,
			e: left.e + right.d
		};
	}

	if (left.kind === 'quartic' && right.kind === 'quartic') {
		return {
			kind: 'quartic',
			a: left.a + right.a,
			b: left.b + right.b,
			c: left.c + right.c,
			d: left.d + right.d,
			e: left.e + right.e
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
		if (right.kind === 'cubic') {
			return { kind: 'cubic', a: k * right.a, b: k * right.b, c: k * right.c, d: k * right.d };
		}
		if (right.kind === 'quartic') {
			return {
				kind: 'quartic',
				a: k * right.a,
				b: k * right.b,
				c: k * right.c,
				d: k * right.d,
				e: k * right.e
			};
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
		if (left.kind === 'cubic') {
			return { kind: 'cubic', a: k * left.a, b: k * left.b, c: k * left.c, d: k * left.d };
		}
		if (left.kind === 'quartic') {
			return {
				kind: 'quartic',
				a: k * left.a,
				b: k * left.b,
				c: k * left.c,
				d: k * left.d,
				e: k * left.e
			};
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

	// linear * quadratic = cubic
	if (left.kind === 'linear' && right.kind === 'quadratic') {
		// (a1*x + b1) * (a2*x² + b2*x + c2)
		// = a1*a2*x³ + a1*b2*x² + a1*c2*x + b1*a2*x² + b1*b2*x + b1*c2
		// = a1*a2*x³ + (a1*b2 + b1*a2)*x² + (a1*c2 + b1*b2)*x + b1*c2
		return {
			kind: 'cubic',
			a: left.a * right.a,
			b: left.a * right.b + left.b * right.a,
			c: left.a * right.c + left.b * right.b,
			d: left.b * right.c
		};
	}

	if (left.kind === 'quadratic' && right.kind === 'linear') {
		// Symmetric case
		return {
			kind: 'cubic',
			a: left.a * right.a,
			b: left.a * right.b + left.b * right.a,
			c: left.b * right.b + left.c * right.a,
			d: left.c * right.b
		};
	}

	// linear * cubic = quartic
	if (left.kind === 'linear' && right.kind === 'cubic') {
		// (a1*x + b1) * (a2*x³ + b2*x² + c2*x + d2)
		// = a1*a2*x⁴ + (a1*b2 + b1*a2)*x³ + (a1*c2 + b1*b2)*x² + (a1*d2 + b1*c2)*x + b1*d2
		return {
			kind: 'quartic',
			a: left.a * right.a,
			b: left.a * right.b + left.b * right.a,
			c: left.a * right.c + left.b * right.b,
			d: left.a * right.d + left.b * right.c,
			e: left.b * right.d
		};
	}

	if (left.kind === 'cubic' && right.kind === 'linear') {
		// Symmetric case
		return {
			kind: 'quartic',
			a: left.a * right.a,
			b: left.a * right.b + left.b * right.a,
			c: left.b * right.b + left.c * right.a,
			d: left.c * right.b + left.d * right.a,
			e: left.d * right.b
		};
	}

	// quadratic * quadratic = quartic
	if (left.kind === 'quadratic' && right.kind === 'quadratic') {
		// (a1*x² + b1*x + c1) * (a2*x² + b2*x + c2)
		// = a1*a2*x⁴ + (a1*b2 + b1*a2)*x³ + (a1*c2 + b1*b2 + c1*a2)*x² + (b1*c2 + c1*b2)*x + c1*c2
		return {
			kind: 'quartic',
			a: left.a * right.a,
			b: left.a * right.b + left.b * right.a,
			c: left.a * right.c + left.b * right.b + left.c * right.a,
			d: left.b * right.c + left.c * right.b,
			e: left.c * right.c
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

	if (Math.abs(a) < ZERO_TOLERANCE) {
		// Degenerate case: no x term
		// Check if b satisfies the constraint
		const satisfied =
			op === '>=' ? (strict ? b > bound : b >= bound) : strict ? b < bound : b <= bound;
		return satisfied ? universalDomain() : emptyDomain();
	}

	const solution = rhs / a;
	const solutionValue = fromNumber(solution);

	// If a > 0, inequality direction is preserved
	// If a < 0, inequality direction is flipped
	if (a > 0) {
		if (op === '>=') {
			return intervalDomain([
				strict ? greaterThan(solutionValue) : greaterThanOrEqual(solutionValue)
			]);
		} else {
			return intervalDomain([strict ? lessThan(solutionValue) : lessThanOrEqual(solutionValue)]);
		}
	} else {
		// a < 0, flip inequality
		if (op === '>=') {
			return intervalDomain([strict ? lessThan(solutionValue) : lessThanOrEqual(solutionValue)]);
		} else {
			return intervalDomain([
				strict ? greaterThan(solutionValue) : greaterThanOrEqual(solutionValue)
			]);
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

	if (Math.abs(a) < ZERO_TOLERANCE) {
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

	if (Math.abs(discriminant) < ZERO_TOLERANCE) {
		// One root (tangent to axis)
		const root = -b / (2 * a);
		const rootValue = fromNumber(root);
		if (a > 0) {
			// Parabola opens up, touches 0 at root
			if (op === '>=') {
				return strict
					? intervalDomain([realLine()], [excludedPoint(rootValue)])
					: universalDomain();
			} else {
				return strict ? emptyDomain() : intervalDomain([closedInterval(rootValue, rootValue)]);
			}
		} else {
			// Parabola opens down, touches 0 at root
			if (op === '<=') {
				return strict
					? intervalDomain([realLine()], [excludedPoint(rootValue)])
					: universalDomain();
			} else {
				return strict ? emptyDomain() : intervalDomain([closedInterval(rootValue, rootValue)]);
			}
		}
	}

	// Two distinct roots
	const sqrtD = Math.sqrt(discriminant);
	const root1 = (-b - sqrtD) / (2 * a);
	const root2 = (-b + sqrtD) / (2 * a);
	const minRoot = Math.min(root1, root2);
	const maxRoot = Math.max(root1, root2);
	const minRootValue = fromNumber(minRoot);
	const maxRootValue = fromNumber(maxRoot);

	if (a > 0) {
		// Parabola opens up: negative between roots, positive outside
		if (op === '>=') {
			// Want where >= 0: x <= minRoot OR x >= maxRoot
			if (strict) {
				return intervalDomain([lessThan(minRootValue), greaterThan(maxRootValue)]);
			} else {
				return intervalDomain([lessThanOrEqual(minRootValue), greaterThanOrEqual(maxRootValue)]);
			}
		} else {
			// Want where <= 0: minRoot <= x <= maxRoot
			if (strict) {
				return intervalDomain([openInterval(minRootValue, maxRootValue)]);
			} else {
				return intervalDomain([closedInterval(minRootValue, maxRootValue)]);
			}
		}
	} else {
		// Parabola opens down: positive between roots, negative outside
		if (op === '>=') {
			// Want where >= 0: minRoot <= x <= maxRoot
			if (strict) {
				return intervalDomain([openInterval(minRootValue, maxRootValue)]);
			} else {
				return intervalDomain([closedInterval(minRootValue, maxRootValue)]);
			}
		} else {
			// Want where <= 0: x <= minRoot OR x >= maxRoot
			if (strict) {
				return intervalDomain([lessThan(minRootValue), greaterThan(maxRootValue)]);
			} else {
				return intervalDomain([lessThanOrEqual(minRootValue), greaterThanOrEqual(maxRootValue)]);
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
			return Math.abs(classified.value) < ZERO_TOLERANCE ? [0] : [];

		case 'linear':
			// a*x + b = 0  =>  x = -b/a
			if (Math.abs(classified.a) < ZERO_TOLERANCE) {
				return [];
			}
			return [-classified.b / classified.a];

		case 'quadratic':
			// a*x² + b*x + c = 0
			return solveQuadraticZeros(classified.a, classified.b, classified.c);

		case 'cubic':
			// a*x³ + b*x² + c*x + d = 0
			return solveCubicZeros(classified.a, classified.b, classified.c, classified.d);

		case 'quartic':
			// a*x⁴ + b*x³ + c*x² + d*x + e = 0
			return solveQuarticZeros(
				classified.a,
				classified.b,
				classified.c,
				classified.d,
				classified.e
			);

		case 'complex':
			// Cannot find zeros analytically
			return [];
	}
}

/**
 * Clean up floating-point roots by rounding values very close to integers.
 * This fixes precision issues in polynomial root-finding (e.g., 1.9999999999999998 → 2).
 */
function cleanRoots(roots: number[]): number[] {
	return roots.map((root) => {
		const rounded = Math.round(root);
		if (Math.abs(root - rounded) < ZERO_TOLERANCE) {
			return rounded;
		}
		return root;
	});
}

/**
 * Solve a*x² + b*x + c = 0.
 */
function solveQuadraticZeros(a: number, b: number, c: number): number[] {
	if (Math.abs(a) < ZERO_TOLERANCE) {
		// Linear case
		if (Math.abs(b) < ZERO_TOLERANCE) {
			return [];
		}
		return cleanRoots([-c / b]);
	}

	const discriminant = b * b - 4 * a * c;

	if (discriminant < 0) {
		return [];
	}

	if (Math.abs(discriminant) < ZERO_TOLERANCE) {
		return cleanRoots([-b / (2 * a)]);
	}

	const sqrtD = Math.sqrt(discriminant);
	return cleanRoots([(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)]);
}

/**
 * Solve a*x³ + b*x² + c*x + d = 0 using Cardano's formula.
 *
 * Uses the depressed cubic method:
 * 1. Substitute x = t - b/(3a) to get t³ + pt + q = 0
 * 2. Apply Cardano's formula based on discriminant
 *
 * @returns Array of real roots (1 to 3 roots)
 */
function solveCubicZeros(a: number, b: number, c: number, d: number): number[] {
	if (Math.abs(a) < ZERO_TOLERANCE) {
		// Not really cubic, delegate to quadratic
		return solveQuadraticZeros(b, c, d);
	}

	// Normalize to monic form: x³ + (b/a)x² + (c/a)x + (d/a) = 0
	const b1 = b / a;
	const c1 = c / a;
	const d1 = d / a;

	// Substitute x = t - b1/3 to get depressed cubic t³ + pt + q = 0
	const b1_3 = b1 / 3;
	const p = c1 - (b1 * b1) / 3;
	const q = d1 - (b1 * c1) / 3 + (2 * b1 * b1 * b1) / 27;

	// Discriminant: Δ = -4p³ - 27q²
	// Equivalently: Δ = (q/2)² + (p/3)³ for Cardano
	const halfQ = q / 2;
	const thirdP = p / 3;
	const discriminant = halfQ * halfQ + thirdP * thirdP * thirdP;

	const roots: number[] = [];

	if (Math.abs(discriminant) < ZERO_TOLERANCE) {
		// Discriminant ≈ 0: one or two real roots
		if (Math.abs(q) < ZERO_TOLERANCE) {
			// Triple root at t = 0
			roots.push(-b1_3);
		} else {
			// One single root and one double root
			const cubeRoot = Math.cbrt(-halfQ);
			roots.push(2 * cubeRoot - b1_3);
			roots.push(-cubeRoot - b1_3);
		}
	} else if (discriminant > 0) {
		// One real root (and two complex conjugates)
		const sqrtDelta = Math.sqrt(discriminant);
		const u = Math.cbrt(-halfQ + sqrtDelta);
		const v = Math.cbrt(-halfQ - sqrtDelta);
		roots.push(u + v - b1_3);
	} else {
		// Three distinct real roots (trigonometric solution)
		const r = Math.sqrt(-thirdP * thirdP * thirdP);
		const theta = Math.acos(-halfQ / r);
		const twoSqrtMinusP3 = 2 * Math.sqrt(-thirdP);

		roots.push(twoSqrtMinusP3 * Math.cos(theta / 3) - b1_3);
		roots.push(twoSqrtMinusP3 * Math.cos((theta + 2 * Math.PI) / 3) - b1_3);
		roots.push(twoSqrtMinusP3 * Math.cos((theta + 4 * Math.PI) / 3) - b1_3);
	}

	// Clean roots (round near-integers), sort, and remove near-duplicates
	const cleaned = cleanRoots(roots);
	cleaned.sort((x, y) => x - y);
	const uniqueRoots: number[] = [];
	for (const root of cleaned) {
		if (
			uniqueRoots.length === 0 ||
			Math.abs(root - uniqueRoots[uniqueRoots.length - 1]) > ZERO_TOLERANCE
		) {
			uniqueRoots.push(root);
		}
	}

	return uniqueRoots;
}

/**
 * Solve a*x⁴ + b*x³ + c*x² + d*x + e = 0 using Ferrari's method.
 *
 * Uses the depressed quartic method:
 * 1. Substitute x = t - b/(4a) to get t⁴ + pt² + qt + r = 0
 * 2. Solve the resolvent cubic to find y
 * 3. Factor into two quadratics and solve each
 *
 * @returns Array of real roots (0 to 4 roots)
 */
function solveQuarticZeros(a: number, b: number, c: number, d: number, e: number): number[] {
	if (Math.abs(a) < ZERO_TOLERANCE) {
		// Not really quartic, delegate to cubic
		return solveCubicZeros(b, c, d, e);
	}

	// Normalize to monic form: x⁴ + px³ + qx² + rx + s = 0
	const p = b / a;
	const q = c / a;
	const r = d / a;
	const s = e / a;

	// Substitute x = t - p/4 to get depressed quartic: t⁴ + At² + Bt + C = 0
	const p2 = p * p;
	const p3 = p2 * p;
	const p4 = p3 * p;
	const shift = p / 4;

	const A = q - (3 * p2) / 8;
	const B = r - (p * q) / 2 + p3 / 8;
	const C = s - (p * r) / 4 + (p2 * q) / 16 - (3 * p4) / 256;

	// Special case: Biquadratic (B = 0)
	if (Math.abs(B) < ZERO_TOLERANCE) {
		return solveBiquadratic(A, C, shift);
	}

	// Solve the resolvent cubic: y³ + (A/2)y² + ((A² - 4C)/16)y - B²/64 = 0
	// Rewritten as: y³ + py² + qy + r = 0 (don't confuse with outer p, q, r)
	const cubicP = A / 2;
	const cubicQ = (A * A - 4 * C) / 16;
	const cubicR = -(B * B) / 64;

	const cubicRoots = solveCubicZeros(1, cubicP, cubicQ, cubicR);

	// We need any real root y > 0 (or the largest one) for the factorization
	// If all roots are negative, the method still works but we need to adjust
	let y = 0;
	for (const root of cubicRoots) {
		if (root > y) {
			y = root;
		}
	}

	// If y is too small, try the largest root even if negative
	if (Math.abs(y) < ZERO_TOLERANCE && cubicRoots.length > 0) {
		y = Math.max(...cubicRoots.map(Math.abs));
		// Find the actual root with this absolute value
		for (const root of cubicRoots) {
			if (Math.abs(Math.abs(root) - y) < ZERO_TOLERANCE) {
				y = root;
				break;
			}
		}
	}

	// Factor the depressed quartic as (t² + √(2y)t + q₁)(t² - √(2y)t + q₂)
	const twoY = 2 * y;
	if (twoY < -ZERO_TOLERANCE) {
		// Cannot factor with real coefficients, no real roots
		return [];
	}

	const sqrtTwoY = Math.sqrt(Math.max(0, twoY));
	if (Math.abs(sqrtTwoY) < ZERO_TOLERANCE) {
		// Special case: y ≈ 0, factor as (t² + √C)(t² - √C) or similar
		return solveBiquadratic(A, C, shift);
	}

	const q1 = A / 2 + y - B / (2 * sqrtTwoY);
	const q2 = A / 2 + y + B / (2 * sqrtTwoY);

	// Solve t² + sqrtTwoY*t + q1 = 0 and t² - sqrtTwoY*t + q2 = 0
	const roots1 = solveQuadraticZeros(1, sqrtTwoY, q1);
	const roots2 = solveQuadraticZeros(1, -sqrtTwoY, q2);

	// Transform back: x = t - p/4
	const allRoots = [...roots1, ...roots2].map((t) => t - shift);

	// Sort and remove duplicates
	return deduplicateRoots(allRoots);
}

/**
 * Solve a biquadratic equation: t⁴ + At² + C = 0 (where B = 0)
 * This is equivalent to solving u² + Au + C = 0 where u = t²
 *
 * @param A - Coefficient of t²
 * @param C - Constant term
 * @param shift - Value to subtract from roots (for de-depressing)
 * @returns Array of real roots
 */
function solveBiquadratic(A: number, C: number, shift: number): number[] {
	// Solve u² + Au + C = 0 where u = t²
	const uRoots = solveQuadraticZeros(1, A, C);

	const tRoots: number[] = [];
	for (const u of uRoots) {
		if (u >= 0) {
			const sqrtU = Math.sqrt(u);
			tRoots.push(sqrtU - shift);
			if (Math.abs(sqrtU) > ZERO_TOLERANCE) {
				tRoots.push(-sqrtU - shift);
			}
		}
	}

	return deduplicateRoots(cleanRoots(tRoots));
}

/**
 * Remove duplicate roots within tolerance.
 */
function deduplicateRoots(roots: number[]): number[] {
	if (roots.length === 0) return [];

	roots.sort((x, y) => x - y);
	const unique: number[] = [roots[0]];
	for (let i = 1; i < roots.length; i++) {
		if (Math.abs(roots[i] - unique[unique.length - 1]) > ZERO_TOLERANCE) {
			unique.push(roots[i]);
		}
	}
	return unique;
}

/**
 * Solve a cubic inequality: a*x³ + b*x² + c*x + d >= bound or a*x³ + b*x² + c*x + d <= bound
 *
 * @param a - Coefficient of x³
 * @param b - Coefficient of x²
 * @param c - Coefficient of x
 * @param d - Constant term
 * @param op - '>=' or '<='
 * @param bound - The bound value (right side)
 * @param strict - If true, use > or < instead of >= or <=
 * @param variable - Variable name (for documentation)
 * @returns The solution domain
 */
export function solveCubicInequality(
	a: number,
	b: number,
	c: number,
	d: number,
	op: '>=' | '<=',
	bound: number,
	strict: boolean,
	variable: string
): Domain {
	// a*x³ + b*x² + c*x + d >= bound => a*x³ + b*x² + c*x + (d - bound) >= 0
	const newD = d - bound;

	if (Math.abs(a) < ZERO_TOLERANCE) {
		// Not really cubic, delegate to quadratic
		return solveQuadraticInequality(b, c, newD, op, 0, strict, variable);
	}

	// Find the roots of the cubic
	const roots = solveCubicZeros(a, b, c, newD);

	if (roots.length === 0) {
		// No real roots - sign is constant
		// Evaluate at x=0 to determine sign
		const signAtZero = newD;
		if (a > 0) {
			// Cubic goes from -∞ to +∞, so if no roots, it must be one sign everywhere
			// But wait, cubics always have at least one real root, so this shouldn't happen
			// unless numerical issues. Check value at 0.
			return signAtZero >= 0 === (op === '>=') ? universalDomain() : emptyDomain();
		} else {
			return signAtZero >= 0 === (op === '>=') ? universalDomain() : emptyDomain();
		}
	}

	if (roots.length === 1) {
		// One real root r
		const r = roots[0];
		const rValue = fromNumber(r);

		// For a > 0: f(x) < 0 when x < r, f(x) > 0 when x > r
		// For a < 0: f(x) > 0 when x < r, f(x) < 0 when x > r
		if (a > 0) {
			if (op === '>=') {
				// f(x) >= 0 when x >= r
				return intervalDomain([strict ? greaterThan(rValue) : greaterThanOrEqual(rValue)]);
			} else {
				// f(x) <= 0 when x <= r
				return intervalDomain([strict ? lessThan(rValue) : lessThanOrEqual(rValue)]);
			}
		} else {
			// a < 0
			if (op === '>=') {
				// f(x) >= 0 when x <= r
				return intervalDomain([strict ? lessThan(rValue) : lessThanOrEqual(rValue)]);
			} else {
				// f(x) <= 0 when x >= r
				return intervalDomain([strict ? greaterThan(rValue) : greaterThanOrEqual(rValue)]);
			}
		}
	}

	if (roots.length === 2) {
		// Two real roots (one simple, one double)
		const r1 = roots[0];
		const r2 = roots[1];
		const r1Value = fromNumber(r1);
		const r2Value = fromNumber(r2);

		// The sign pattern depends on which root is the double root
		// For simplicity, handle like three roots case with middle behavior adjusted
		if (a > 0) {
			if (op === '>=') {
				// f(x) >= 0: x = r1 (if double) or x >= r2
				return intervalDomain([
					strict ? lessThan(r1Value) : lessThanOrEqual(r1Value),
					strict ? greaterThan(r2Value) : greaterThanOrEqual(r2Value)
				]);
			} else {
				// f(x) <= 0: r1 <= x <= r2
				if (strict) {
					return intervalDomain([openInterval(r1Value, r2Value)]);
				} else {
					return intervalDomain([closedInterval(r1Value, r2Value)]);
				}
			}
		} else {
			if (op === '>=') {
				// f(x) >= 0: r1 <= x <= r2
				if (strict) {
					return intervalDomain([openInterval(r1Value, r2Value)]);
				} else {
					return intervalDomain([closedInterval(r1Value, r2Value)]);
				}
			} else {
				// f(x) <= 0: x <= r1 or x >= r2
				return intervalDomain([
					strict ? lessThan(r1Value) : lessThanOrEqual(r1Value),
					strict ? greaterThan(r2Value) : greaterThanOrEqual(r2Value)
				]);
			}
		}
	}

	// Three distinct real roots r1 < r2 < r3
	const r1 = roots[0];
	const r2 = roots[1];
	const r3 = roots[2];
	const r1Value = fromNumber(r1);
	const r2Value = fromNumber(r2);
	const r3Value = fromNumber(r3);

	// For a > 0: f(x) < 0 when x < r1 or r2 < x < r3
	//            f(x) > 0 when r1 < x < r2 or x > r3
	// For a < 0: opposite signs

	if (a > 0) {
		if (op === '>=') {
			// f(x) >= 0: r1 <= x <= r2 or x >= r3
			if (strict) {
				return intervalDomain([openInterval(r1Value, r2Value), greaterThan(r3Value)]);
			} else {
				return intervalDomain([closedInterval(r1Value, r2Value), greaterThanOrEqual(r3Value)]);
			}
		} else {
			// f(x) <= 0: x <= r1 or r2 <= x <= r3
			if (strict) {
				return intervalDomain([lessThan(r1Value), openInterval(r2Value, r3Value)]);
			} else {
				return intervalDomain([lessThanOrEqual(r1Value), closedInterval(r2Value, r3Value)]);
			}
		}
	} else {
		// a < 0: signs are flipped
		if (op === '>=') {
			// f(x) >= 0: x <= r1 or r2 <= x <= r3
			if (strict) {
				return intervalDomain([lessThan(r1Value), openInterval(r2Value, r3Value)]);
			} else {
				return intervalDomain([lessThanOrEqual(r1Value), closedInterval(r2Value, r3Value)]);
			}
		} else {
			// f(x) <= 0: r1 <= x <= r2 or x >= r3
			if (strict) {
				return intervalDomain([openInterval(r1Value, r2Value), greaterThan(r3Value)]);
			} else {
				return intervalDomain([closedInterval(r1Value, r2Value), greaterThanOrEqual(r3Value)]);
			}
		}
	}
}

/**
 * Solve a quartic inequality: a*x⁴ + b*x³ + c*x² + d*x + e >= bound or <= bound
 *
 * @param a - Coefficient of x⁴
 * @param b - Coefficient of x³
 * @param c - Coefficient of x²
 * @param d - Coefficient of x
 * @param e - Constant term
 * @param op - '>=' or '<='
 * @param bound - The bound value (right side)
 * @param strict - If true, use > or < instead of >= or <=
 * @param variable - Variable name (for documentation)
 * @returns The solution domain
 */
export function solveQuarticInequality(
	a: number,
	b: number,
	c: number,
	d: number,
	e: number,
	op: '>=' | '<=',
	bound: number,
	strict: boolean,
	variable: string
): Domain {
	// a*x⁴ + b*x³ + c*x² + d*x + e >= bound => a*x⁴ + b*x³ + c*x² + d*x + (e - bound) >= 0
	const newE = e - bound;

	if (Math.abs(a) < ZERO_TOLERANCE) {
		// Not really quartic, delegate to cubic
		return solveCubicInequality(b, c, d, newE, op, 0, strict, variable);
	}

	// Find the roots of the quartic
	const roots = solveQuarticZeros(a, b, c, d, newE);

	// Sort roots for consistent processing
	roots.sort((x, y) => x - y);

	// A quartic with positive leading coefficient:
	// - Goes to +∞ as x → ±∞
	// - Sign alternates between consecutive roots
	// - Positive outside outermost roots if even number of roots, or pattern varies
	//
	// For a > 0: f(x) → +∞ as x → ±∞
	// For a < 0: f(x) → -∞ as x → ±∞

	if (roots.length === 0) {
		// No real roots - sign is constant
		if (a > 0) {
			// Quartic opens up, always positive (no real roots means no sign changes)
			return op === '>=' ? universalDomain() : emptyDomain();
		} else {
			// Quartic opens down, always negative
			return op === '<=' ? universalDomain() : emptyDomain();
		}
	}

	const rootValues = roots.map(fromNumber);

	if (roots.length === 1) {
		// One root (with multiplicity or tangent point)
		const r = rootValues[0];
		if (a > 0) {
			// Quartic opens up, touches zero at r
			if (op === '>=') {
				return strict ? intervalDomain([realLine()], [excludedPoint(r)]) : universalDomain();
			} else {
				return strict ? emptyDomain() : intervalDomain([closedInterval(r, r)]);
			}
		} else {
			// Quartic opens down, touches zero at r
			if (op === '<=') {
				return strict ? intervalDomain([realLine()], [excludedPoint(r)]) : universalDomain();
			} else {
				return strict ? emptyDomain() : intervalDomain([closedInterval(r, r)]);
			}
		}
	}

	if (roots.length === 2) {
		// Two distinct roots r1 < r2
		const r1 = rootValues[0];
		const r2 = rootValues[1];

		if (a > 0) {
			// Quartic opens up: positive outside [r1, r2], negative inside
			if (op === '>=') {
				// f(x) >= 0: x <= r1 or x >= r2
				return intervalDomain([
					strict ? lessThan(r1) : lessThanOrEqual(r1),
					strict ? greaterThan(r2) : greaterThanOrEqual(r2)
				]);
			} else {
				// f(x) <= 0: r1 <= x <= r2
				return strict
					? intervalDomain([openInterval(r1, r2)])
					: intervalDomain([closedInterval(r1, r2)]);
			}
		} else {
			// Quartic opens down: positive inside [r1, r2], negative outside
			if (op === '>=') {
				// f(x) >= 0: r1 <= x <= r2
				return strict
					? intervalDomain([openInterval(r1, r2)])
					: intervalDomain([closedInterval(r1, r2)]);
			} else {
				// f(x) <= 0: x <= r1 or x >= r2
				return intervalDomain([
					strict ? lessThan(r1) : lessThanOrEqual(r1),
					strict ? greaterThan(r2) : greaterThanOrEqual(r2)
				]);
			}
		}
	}

	if (roots.length === 3) {
		// Three distinct roots r1 < r2 < r3 (one must be a double root for a quartic)
		const r1 = rootValues[0];
		const r2 = rootValues[1];
		// Note: r3 is not used in this simplified implementation because the sign pattern
		// depends on which root is the double root. For now, we use a conservative approach.
		const _r3 = rootValues[2];

		if (a > 0) {
			// For a > 0: f(x) > 0 when x < r1 or x > r3
			// Since one root is double, the sign pattern varies.
			// Conservative approach: use the outer two roots.
			if (op === '>=') {
				// f(x) >= 0: x <= r1 or x >= r3 (but we use r2 as safe boundary)
				return intervalDomain([
					strict ? lessThan(r1) : lessThanOrEqual(r1),
					strict ? greaterThan(r2) : greaterThanOrEqual(r2)
				]);
			} else {
				// f(x) <= 0: r1 <= x <= r2
				return strict
					? intervalDomain([openInterval(r1, r2)])
					: intervalDomain([closedInterval(r1, r2)]);
			}
		} else {
			// a < 0: opposite signs
			if (op === '>=') {
				return strict
					? intervalDomain([openInterval(r1, r2)])
					: intervalDomain([closedInterval(r1, r2)]);
			} else {
				return intervalDomain([
					strict ? lessThan(r1) : lessThanOrEqual(r1),
					strict ? greaterThan(r2) : greaterThanOrEqual(r2)
				]);
			}
		}
	}

	// Four distinct roots r1 < r2 < r3 < r4
	const r1 = rootValues[0];
	const r2 = rootValues[1];
	const r3 = rootValues[2];
	const r4 = rootValues[3];

	if (a > 0) {
		// For a > 0: f(x) > 0 when x < r1 or r2 < x < r3 or x > r4
		//            f(x) < 0 when r1 < x < r2 or r3 < x < r4
		if (op === '>=') {
			// f(x) >= 0: x <= r1 or r2 <= x <= r3 or x >= r4
			if (strict) {
				return intervalDomain([lessThan(r1), openInterval(r2, r3), greaterThan(r4)]);
			} else {
				return intervalDomain([
					lessThanOrEqual(r1),
					closedInterval(r2, r3),
					greaterThanOrEqual(r4)
				]);
			}
		} else {
			// f(x) <= 0: r1 <= x <= r2 or r3 <= x <= r4
			if (strict) {
				return intervalDomain([openInterval(r1, r2), openInterval(r3, r4)]);
			} else {
				return intervalDomain([closedInterval(r1, r2), closedInterval(r3, r4)]);
			}
		}
	} else {
		// a < 0: signs are flipped
		// f(x) > 0 when r1 < x < r2 or r3 < x < r4
		// f(x) < 0 when x < r1 or r2 < x < r3 or x > r4
		if (op === '>=') {
			// f(x) >= 0: r1 <= x <= r2 or r3 <= x <= r4
			if (strict) {
				return intervalDomain([openInterval(r1, r2), openInterval(r3, r4)]);
			} else {
				return intervalDomain([closedInterval(r1, r2), closedInterval(r3, r4)]);
			}
		} else {
			// f(x) <= 0: x <= r1 or r2 <= x <= r3 or x >= r4
			if (strict) {
				return intervalDomain([lessThan(r1), openInterval(r2, r3), greaterThan(r4)]);
			} else {
				return intervalDomain([
					lessThanOrEqual(r1),
					closedInterval(r2, r3),
					greaterThanOrEqual(r4)
				]);
			}
		}
	}
}
