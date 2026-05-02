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
	// Fast path: walking + spreading the entire AST is wasted work when no
	// trig call is present. A single read-only scan beats an unconditional
	// allocating tree-copy for the common case (`r = 2*a + 3`, `r = sqrt(x)`).
	if (!hasTrigCall(node)) return node;
	return walkDeg(node);
}

/** True iff the tree contains any forward- or inverse-trig FunctionNode. */
function hasTrigCall(node: MathNode): boolean {
	if (isFunction(node)) {
		if (TRIG_FORWARD.has(node.name) || TRIG_INVERSE.has(node.name)) return true;
		for (const a of node.args) if (hasTrigCall(a)) return true;
		return false;
	}
	for (const child of childrenOf(node)) {
		if (hasTrigCall(child)) return true;
	}
	return false;
}

/** Yield every direct child MathNode of `node`. Mirrors `mapChildren` shape. */
function childrenOf(node: MathNode): readonly MathNode[] {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return [node.left, node.right];
		case 'division':
			return [node.numerator, node.denominator];
		case 'opposite':
		case 'positive':
			return [node.operand];
		case 'function':
			return node.args;
		case 'superscript':
			return [node.base, node.superscript];
		case 'subscript':
			return [node.base, node.subscript];
		case 'delimiter':
			return [node.content];
		case 'relation':
			return [node.left, node.right];
		default:
			return EMPTY_CHILDREN;
	}
}

const EMPTY_CHILDREN: readonly MathNode[] = [];

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
			return { ...node, left: f(node.left), right: f(node.right) };
		case 'division':
			return { ...node, numerator: f(node.numerator), denominator: f(node.denominator) };
		case 'opposite':
		case 'positive':
			return { ...node, operand: f(node.operand) };
		case 'function':
			// `sqrt`, `abs`, `sin`, etc. all live here as FunctionNode with .name.
			return { ...node, args: node.args.map(f) };
		case 'superscript':
			return { ...node, base: f(node.base), superscript: f(node.superscript) };
		case 'subscript':
			return { ...node, base: f(node.base), subscript: f(node.subscript) };
		case 'delimiter':
			return { ...node, content: f(node.content) };
		case 'relation':
			return { ...node, left: f(node.left), right: f(node.right) };
		default:
			// Leaves (number, variable, greek, constant, symbol, hole, infinity,
			// signed-zero, boolean) and node types not produced by `parseCustom`
			// in the DSL context (matrix, complex, unit, limit, logical*,
			// composition): return as-is. If a future DSL adds those, extend.
			return node;
	}
}
