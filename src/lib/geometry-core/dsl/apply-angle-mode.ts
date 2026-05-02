/**
 * `applyAngleMode(node, mode)` — wrap trig/inverse-trig calls in a MathNode
 * tree so that downstream evaluation respects the active angle mode.
 *
 * - mode 'rad': returns the node unchanged (mathAST native).
 * - mode 'deg':
 *   - For each forward-trig call (sin/cos/tan/cot/sec/csc), replace its
 *     argument `arg` with `arg * \pi / 180`.
 *   - For each inverse-trig call (arcsin/arccos/arctan/asin/acos/atan/atan2),
 *     wrap the call itself with `* 180 / \pi`.
 *
 * Phase 5 of dsl-mathast-routing plan.
 */

import type { MathNode, FunctionNode } from '$lib/mathAST/types';
import { isFunction } from '$lib/mathAST/guards';
import { multiply, divide, number as mathNumber, piConstant, func } from '$lib/mathAST/factory';

export type AngleMode = 'deg' | 'rad';

const TRIG_FORWARD = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc']);
const TRIG_INVERSE = new Set([
	'arcsin',
	'arccos',
	'arctan',
	'arccot',
	'arcsec',
	'arccsc',
	'asin',
	'acos',
	'atan',
	'atan2'
]);

export function applyAngleMode(node: MathNode, mode: AngleMode): MathNode {
	if (mode === 'rad') return node;
	return walkDeg(node);
}

/** Recursively walk the tree, transforming trig/inverse-trig calls. */
function walkDeg(node: MathNode): MathNode {
	// Recurse into children first (post-order), then transform if needed.
	const transformed = mapChildren(node, walkDeg);

	if (isFunction(transformed)) {
		if (TRIG_FORWARD.has(transformed.name)) {
			// Wrap each argument: arg → arg * \pi / 180
			const wrappedArgs = transformed.args.map((a) => degToRad(a));
			return rebuildFunction(transformed, wrappedArgs);
		}
		if (TRIG_INVERSE.has(transformed.name)) {
			// Wrap the result: f(arg) → f(arg) * 180 / \pi
			return radToDeg(transformed);
		}
	}

	return transformed;
}

/** Build `arg * \pi / 180`. */
function degToRad(arg: MathNode): MathNode {
	return divide(multiply(arg, piConstant()), mathNumber('180'));
}

/** Build `node * 180 / \pi`. */
function radToDeg(node: MathNode): MathNode {
	return divide(multiply(node, mathNumber('180')), piConstant());
}

/** Reconstruct a FunctionNode with new args, preserving its other fields. */
function rebuildFunction(orig: FunctionNode, newArgs: readonly MathNode[]): FunctionNode {
	return func(orig.name, newArgs, {
		...(orig.power !== undefined && { power: orig.power }),
		...(orig.base !== undefined && { base: orig.base }),
		...(orig.derivativeOrder !== undefined && { derivativeOrder: orig.derivativeOrder }),
		...(orig.isInverse !== undefined && { isInverse: orig.isInverse }),
		...(orig.metadata !== undefined && { metadata: orig.metadata }),
		...(orig.nameMetadata !== undefined && { nameMetadata: orig.nameMetadata }),
		...(orig.delimiterMetadata !== undefined && { delimiterMetadata: orig.delimiterMetadata }),
		...(orig.leftDelimiterMetadata !== undefined && {
			leftDelimiterMetadata: orig.leftDelimiterMetadata
		}),
		...(orig.rightDelimiterMetadata !== undefined && {
			rightDelimiterMetadata: orig.rightDelimiterMetadata
		})
	});
}

/**
 * Apply `f` to every direct child MathNode of `node` and return a new node
 * with the transformed children. Falls back to `node` itself when there are
 * no recognized children (leaves).
 */
function mapChildren(node: MathNode, f: (n: MathNode) => MathNode): MathNode {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
		case 'implicit_multiplication':
			return { ...node, left: f(node.left), right: f(node.right) };
		case 'division':
		case 'fraction':
			return { ...node, numerator: f(node.numerator), denominator: f(node.denominator) };
		case 'opposite':
		case 'positive':
			return { ...node, operand: f(node.operand) };
		case 'function':
			return { ...node, args: node.args.map(f) };
		case 'superscript':
			return { ...node, base: f(node.base), superscript: f(node.superscript) };
		case 'subscript':
			return { ...node, base: f(node.base), subscript: f(node.subscript) };
		case 'sqrt':
			return {
				...node,
				radicand: f(node.radicand),
				...(node.index && { index: f(node.index) })
			};
		case 'absolute':
			return { ...node, operand: f(node.operand) };
		case 'delimiter':
			return { ...node, content: f(node.content) };
		case 'relation':
			return { ...node, left: f(node.left), right: f(node.right) };
		case 'sum':
		case 'product': {
			return {
				...node,
				body: f(node.body),
				...(node.lower && { lower: f(node.lower) }),
				...(node.upper && { upper: f(node.upper) })
			};
		}
		case 'integral': {
			return {
				...node,
				body: f(node.body),
				...(node.lower && { lower: f(node.lower) }),
				...(node.upper && { upper: f(node.upper) }),
				...(node.differential && { differential: f(node.differential) })
			};
		}
		default:
			// Leaves (number, variable, greek, mathConstant, symbol, hole, …) and
			// any node type not enumerated above: return as-is.
			return node;
	}
}
