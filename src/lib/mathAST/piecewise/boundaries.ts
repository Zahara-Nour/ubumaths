/**
 * Boundary analysis for `PiecewiseNode`.
 *
 * Extracts the x-positions where the active branch of a piecewise function
 * changes, along with the bracket type (open/closed) at each x. Used by the
 * geometry-core renderer to:
 *
 * 1. Insert path discontinuities at the EXACT transition x (instead of guessing
 *    via a y-jump heuristic), so the SVG path splits precisely.
 * 2. Emit endpoint markers (filled/hollow circles) at each rupture according
 *    to whether the bracket on each side is closed (`≤`/`≥`) or open (`<`/`>`).
 *
 * Limitations (Phase F V1):
 * - Only handles **purely numeric** boundary values; symbolic boundaries
 *   (e.g., `x < pi`, `x < a` where `a` is a slider) are skipped.
 * - Conditions must be `RelationNode`, `LogicalNode` (and-of-comparisons), or
 *   relation chains (`a < x < b`). More complex conditions are skipped silently.
 * - The variable is assumed to be `'x'`. Other names are not analyzed.
 */

import type { MathNode, PiecewiseNode, RelationType } from '../types';
import { isPiecewise, isRelation, isLogical, isVariable, isNumber, isOpposite } from '../guards';
import { flattenRelationChain } from '../flatten';

// =============================================================================
// Types
// =============================================================================

/**
 * One boundary between two piecewise branches: at `x`, the active branch
 * switches. Each side records whether the branch matching that side INCLUDES
 * the x value (closed → `≤`/`≥`) or excludes it (open → `<`/`>`).
 *
 * Examples for `{ -1 si x < 0, 1 si x >= 0 }`:
 *   { x: 0, leftClosed: false, rightClosed: true }
 *
 * For `{ x si 0 < x <= 1 }`:
 *   - boundary at x=0: leftClosed=false (no left branch — x<0 is undefined), rightClosed=false (0 < x excludes 0)
 *   - boundary at x=1: leftClosed=true (x <= 1 includes 1), rightClosed=false (no right branch)
 */
export interface PiecewiseBoundary {
	readonly x: number;
	/** Whether the branch valid for x slightly less than `this.x` includes x exactly. */
	readonly leftClosed: boolean;
	/** Whether the branch valid for x slightly greater than `this.x` includes x exactly. */
	readonly rightClosed: boolean;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Extract sorted, deduplicated boundaries from a piecewise expression.
 *
 * Returns an empty array if the node is not a piecewise or no numeric
 * boundaries can be extracted.
 */
export function extractPiecewiseBoundaries(node: MathNode): PiecewiseBoundary[] {
	if (!isPiecewise(node)) return [];
	return extractBoundariesFromPiecewise(node);
}

// =============================================================================
// Internal: extract per-piece boundaries, then merge across pieces
// =============================================================================

/**
 * For each piece in the piecewise, collect every numeric `x = bound` where
 * the condition transitions from true to false (or vice-versa).
 */
function extractBoundariesFromPiecewise(node: PiecewiseNode): PiecewiseBoundary[] {
	// Map from x value (rounded to avoid float jitter) to merged boundary info.
	const map = new Map<string, { x: number; leftClosed: boolean; rightClosed: boolean }>();

	for (const piece of node.pieces) {
		const branchBounds = extractBranchBounds(piece.condition);
		for (const b of branchBounds) {
			// `b.side === 'lower'` means: the branch is valid for x ≥ b.x (or x > b.x)
			//   ⇒ at x = b.x, the LEFT side (slightly below b.x) is OUTSIDE this branch
			//      and the RIGHT side IS inside this branch.
			//   ⇒ `rightClosed` of this boundary is `b.inclusive` (closed if `≥`).
			// `b.side === 'upper'` means: the branch is valid for x ≤ b.x (or x < b.x)
			//   ⇒ `leftClosed` of this boundary is `b.inclusive` (closed if `≤`).
			const key = formatKey(b.x);
			const existing = map.get(key) ?? { x: b.x, leftClosed: false, rightClosed: false };
			if (b.side === 'lower') {
				existing.rightClosed = existing.rightClosed || b.inclusive;
			} else {
				existing.leftClosed = existing.leftClosed || b.inclusive;
			}
			map.set(key, existing);
		}
	}

	return Array.from(map.values()).sort((a, b) => a.x - b.x);
}

function formatKey(x: number): string {
	// Round to 12 significant digits to merge boundaries that differ only by
	// floating-point noise.
	return x.toPrecision(12);
}

// =============================================================================
// Internal: extract bounds from one branch's condition
// =============================================================================

interface BranchBound {
	readonly x: number;
	/** 'lower': branch is valid for x ≥/> bound. 'upper': branch is valid for x ≤/< bound. */
	readonly side: 'lower' | 'upper';
	/** Whether x = bound is included in the branch (closed) or excluded (open). */
	readonly inclusive: boolean;
}

/**
 * Walk a condition AST and extract every `(x, side, inclusive)` triplet.
 *
 * Handles:
 *   - `RelationNode` with x on one side and a numeric literal on the other
 *   - `LogicalNode` with operator `'and'` (recurses into both sides)
 *   - Relation chains `a < x < b` (flattened, then each pair extracted)
 *
 * Silently skips conditions it can't analyze (returning fewer bounds means the
 * downstream code falls back to the heuristic jump detector for those rupture
 * points).
 */
function extractBranchBounds(condition: MathNode): BranchBound[] {
	if (isRelation(condition)) {
		// Relation chains have nested RelationNode left/right: flatten first.
		const chain = flattenRelationChain(condition);
		if (chain.operands.length > 2) {
			// Chain like a < x < b: extract bound for each consecutive (operand, operator, next operand) pair
			return extractBoundsFromChain(chain.operands, chain.relations);
		}
		const bound = extractBoundFromComparison(condition.left, condition.relation, condition.right);
		return bound ? [bound] : [];
	}

	if (isLogical(condition) && condition.operator === 'and') {
		return [...extractBranchBounds(condition.left), ...extractBranchBounds(condition.right)];
	}

	// LogicalNode 'or', LogicalNotNode, BooleanNode, etc. — not analyzed.
	return [];
}

function extractBoundsFromChain(
	operands: readonly MathNode[],
	relations: readonly RelationType[]
): BranchBound[] {
	const out: BranchBound[] = [];
	for (let i = 0; i < relations.length; i++) {
		const bound = extractBoundFromComparison(operands[i], relations[i], operands[i + 1]);
		if (bound) out.push(bound);
	}
	return out;
}

/**
 * From a single comparison `lhs op rhs`, extract the bound on x.
 *
 * Recognized patterns:
 *   - `x op constant`  → side depends on op (>, >= : lower; <, <= : upper)
 *   - `constant op x`  → side flipped accordingly
 *
 * Returns null if neither side is the variable `x`, or the other side is not
 * a recognizable numeric literal.
 */
function extractBoundFromComparison(
	lhs: MathNode,
	op: RelationType,
	rhs: MathNode
): BranchBound | null {
	const lhsIsX = isXVariable(lhs);
	const rhsIsX = isXVariable(rhs);

	if (lhsIsX && !rhsIsX) {
		const val = extractNumericValue(rhs);
		if (val === null) return null;
		return resolveBound(op, val, /*xOnLeft=*/ true);
	}
	if (rhsIsX && !lhsIsX) {
		const val = extractNumericValue(lhs);
		if (val === null) return null;
		return resolveBound(op, val, /*xOnLeft=*/ false);
	}
	return null;
}

function isXVariable(node: MathNode): boolean {
	return isVariable(node) && node.name === 'x';
}

/**
 * Extract a finite numeric value from a node. Handles plain numbers and
 * `OppositeNode(NumberNode)` (e.g., `-3`).
 */
function extractNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		const v = parseFloat(node.value);
		return Number.isFinite(v) ? v : null;
	}
	if (isOpposite(node) && isNumber(node.operand)) {
		const v = parseFloat(node.operand.value);
		return Number.isFinite(v) ? -v : null;
	}
	return null;
}

/**
 * Map (op, bound, side) to a BranchBound.
 *
 * `xOnLeft` = true means `x op bound` (e.g., `x < 3`, `x >= 0`).
 * `xOnLeft` = false means `bound op x` (e.g., `0 < x`, `5 >= x`).
 */
function resolveBound(op: RelationType, val: number, xOnLeft: boolean): BranchBound | null {
	// Normalize: when x is on the right, flip the op.
	const normalized = xOnLeft ? op : flipOp(op);
	switch (normalized) {
		case '>':
			return { x: val, side: 'lower', inclusive: false };
		case '>=':
			return { x: val, side: 'lower', inclusive: true };
		case '<':
			return { x: val, side: 'upper', inclusive: false };
		case '<=':
			return { x: val, side: 'upper', inclusive: true };
		case '=':
			// `x = val` defines a point branch; treat as both sides excluding val
			// (the branch is only valid AT val, so neither slightly-left nor
			// slightly-right side includes it).
			return null;
		default:
			return null;
	}
}

function flipOp(op: RelationType): RelationType {
	switch (op) {
		case '<':
			return '>';
		case '<=':
			return '>=';
		case '>':
			return '<';
		case '>=':
			return '<=';
		default:
			return op;
	}
}
