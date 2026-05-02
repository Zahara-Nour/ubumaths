/**
 * Piecewise expression parser for the geometry-core DSL.
 *
 * Parses the body of a `{ ... }` piecewise block on the right-hand side of a
 * `courbe()` equation into a `PiecewiseNode` (mathAST). Two equivalent forms
 * are accepted, mappable to the same AST:
 *
 * 1. **Condition form** (`si`):
 *    `{ -x si x < 0, x^2 si x >= 0 }`
 *
 * 2. **Interval form** (`sur`):
 *    `{ -x sur ]-infini ; 0[, x^2 sur [0 ; +infini[ }`
 *
 * Mixing `si` and `sur` within the same piecewise is rejected for clarity.
 *
 * Optional default branch: a final piece without `si`/`sur` is treated as an
 * `otherwise` fallback (Desmos convention).
 *
 * The interval form is desugared into condition AST: `sur [a ; b]` becomes
 * `a <= x AND x <= b`, etc. This keeps mathAST schema-agnostic and the
 * compile pipeline simple.
 */

import type { MathNode } from '$lib/mathAST/types';
import type { PiecewisePiece } from '$lib/mathAST/types';
import { parseCustom, piecewise, logicalAnd, relation, getVariables } from '$lib/mathAST';
import type { SymbolTable } from './symbol-table';
import { DslRuntimeError } from './errors';

// =============================================================================
// Public API
// =============================================================================

export interface ParsePiecewiseResult {
	/** The parsed PiecewiseNode (the function body). */
	readonly node: MathNode;
	/** Slider/scalar element ids referenced anywhere inside (for reactivity). */
	readonly dependencies: readonly string[];
}

/**
 * Detect whether the right-hand side of `y = ...` is a piecewise block.
 *
 * Recognizes a leading `{` (after trimming) and a balanced trailing `}`.
 * Used by `createCurveFromEquation` to choose the piecewise branch before
 * the affine/conic/implicit detection cascade.
 */
export function isPiecewiseRhs(rhs: string): boolean {
	const trimmed = rhs.trim();
	if (!trimmed.startsWith('{')) return false;
	let depth = 0;
	for (let i = 0; i < trimmed.length; i++) {
		const c = trimmed[i];
		if (c === '{') depth++;
		else if (c === '}') {
			depth--;
			if (depth === 0) return i === trimmed.length - 1;
		}
	}
	return false;
}

/**
 * Parse a piecewise body into a `PiecewiseNode`.
 *
 * @param body - The full `{ ... }` string (with the braces).
 * @param symbols - Symbol table for slider/scalar resolution (optional).
 * @param line - DSL line number for error reporting.
 *
 * @throws `DslRuntimeError` on malformed input.
 */
export function parsePiecewise(
	body: string,
	symbols: SymbolTable | undefined,
	line: number
): ParsePiecewiseResult {
	const trimmed = body.trim();
	if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
		throw new DslRuntimeError(`Bloc piecewise mal formé: "${body}"`, line);
	}
	const inner = trimmed.slice(1, -1).trim();
	if (!inner) {
		throw new DslRuntimeError(`Bloc piecewise vide`, line);
	}

	const segments = splitPieces(inner, line);
	if (segments.length === 0) {
		throw new DslRuntimeError(`Aucun morceau dans le piecewise`, line);
	}

	const pieces: PiecewisePiece[] = [];
	let otherwise: MathNode | undefined;
	let usedKeyword: 'si' | 'sur' | null = null;

	for (let idx = 0; idx < segments.length; idx++) {
		const seg = segments[idx];
		const split = splitOnPieceKeyword(seg);

		if (split.keyword === null) {
			// Default branch: only allowed as the LAST segment.
			if (idx !== segments.length - 1) {
				throw new DslRuntimeError(
					`Le morceau par défaut (sans "si"/"sur") doit être le dernier: "${seg.trim()}"`,
					line
				);
			}
			otherwise = parseExpression(seg.trim(), line);
			continue;
		}

		// First-keyword wins — enforce homogeneity.
		if (usedKeyword === null) usedKeyword = split.keyword;
		else if (usedKeyword !== split.keyword) {
			throw new DslRuntimeError(
				`Mélange de "si" et "sur" dans le même piecewise non autorisé`,
				line
			);
		}

		const valueNode = parseExpression(split.value, line);
		const conditionNode =
			split.keyword === 'si'
				? parseExpression(split.condOrInterval, line)
				: parseIntervalAsCondition(split.condOrInterval, line);

		pieces.push({ condition: conditionNode, value: valueNode });
	}

	if (pieces.length === 0 && otherwise === undefined) {
		throw new DslRuntimeError(`Piecewise vide après analyse`, line);
	}

	const node = piecewise(pieces, otherwise);

	// Collect all slider/scalar dependencies from the resulting AST.
	const deps = collectDependencies(node, symbols);

	return { node, dependencies: deps };
}

// =============================================================================
// Internal: split top-level pieces on commas (depth-aware)
// =============================================================================

function splitPieces(inner: string, line: number): string[] {
	// We CANNOT depth-track `[`/`]` because in French interval notation those
	// brackets are symmetric: `]a ; b[` opens with `]` and closes with `[`.
	// Tracking them as ordinary parens would corrupt depth counts. Therefore
	// we restrict the bound separator inside piecewise interval forms to `;`
	// (enforced in parseIntervalAsCondition); the comma is reserved as the
	// top-level piece separator only.
	const out: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < inner.length; i++) {
		const c = inner[i];
		if (c === '(' || c === '{') depth++;
		else if (c === ')' || c === '}') {
			depth--;
			if (depth < 0) {
				throw new DslRuntimeError(`Parenthèses déséquilibrées dans le piecewise`, line);
			}
		} else if (c === ',' && depth === 0) {
			const seg = inner.slice(start, i).trim();
			if (seg) out.push(seg);
			start = i + 1;
		}
	}
	const last = inner.slice(start).trim();
	if (last) out.push(last);
	return out;
}

// =============================================================================
// Internal: split a piece on its `si` or `sur` keyword
// =============================================================================

interface PieceSplit {
	readonly value: string;
	readonly keyword: 'si' | 'sur' | null;
	readonly condOrInterval: string;
}

function splitOnPieceKeyword(seg: string): PieceSplit {
	let depth = 0;
	let lastSplit: { at: number; kw: 'si' | 'sur' } | null = null;
	for (let i = 0; i < seg.length; i++) {
		const c = seg[i];
		if (c === '(' || c === '{' || c === '[') depth++;
		else if (c === ')' || c === '}' || c === ']') depth = Math.max(0, depth - 1);
		if (depth !== 0) continue;
		if (c !== ' ') continue;

		if (seg.slice(i, i + 4) === ' si ' && i + 4 < seg.length) {
			lastSplit = { at: i, kw: 'si' };
		} else if (seg.slice(i, i + 5) === ' sur ' && i + 5 < seg.length) {
			lastSplit = { at: i, kw: 'sur' };
		}
	}

	if (!lastSplit) {
		return { value: seg.trim(), keyword: null, condOrInterval: '' };
	}

	const kwLen = lastSplit.kw === 'si' ? 4 : 5;
	return {
		value: seg.slice(0, lastSplit.at).trim(),
		keyword: lastSplit.kw,
		condOrInterval: seg.slice(lastSplit.at + kwLen).trim()
	};
}

// =============================================================================
// Internal: parse an expression / value / condition via mathAST
// =============================================================================

function parseExpression(s: string, line: number): MathNode {
	const trimmed = s.trim();
	// Reject nested piecewise with a clear message rather than letting parseCustom
	// fail on the unfamiliar `{` token.
	if (trimmed.startsWith('{')) {
		throw new DslRuntimeError(`Piecewise imbriqué non supporté: "${s}"`, line);
	}
	try {
		return parseCustom(trimmed);
	} catch (e) {
		throw new DslRuntimeError(
			`Expression piecewise invalide "${s}": ${e instanceof Error ? e.message : ''}`,
			line
		);
	}
}

// =============================================================================
// Internal: desugar `sur ]a ; b]` to AST condition `a < x AND x <= b`
// =============================================================================

function parseIntervalAsCondition(suffix: string, line: number): MathNode {
	const trimmed = suffix.trim();
	if (trimmed.length < 4) {
		throw new DslRuntimeError(`Intervalle non reconnu: "${suffix}"`, line);
	}
	const lb = trimmed[0];
	const ub = trimmed[trimmed.length - 1];
	if ((lb !== '[' && lb !== ']') || (ub !== '[' && ub !== ']')) {
		throw new DslRuntimeError(`Intervalle non reconnu: "${suffix}"`, line);
	}
	const innerStr = trimmed.slice(1, -1);
	// Inside a piecewise block, the bound separator MUST be `;` — comma is
	// reserved for separating pieces at the outer level. (Outside piecewise,
	// `courbe("y = x sur [a, b]")` still tolerates comma — see Phase B.)
	if (!innerStr.includes(';') && innerStr.includes(',')) {
		throw new DslRuntimeError(
			`Dans un piecewise, utilisez ";" comme séparateur d'intervalle: "${suffix}"`,
			line
		);
	}
	const parts = innerStr.split(';');
	if (parts.length !== 2) {
		throw new DslRuntimeError(`Intervalle non reconnu: "${suffix}"`, line);
	}
	const lowerStr = parts[0].trim();
	const upperStr = parts[1].trim();
	if (!lowerStr || !upperStr) {
		throw new DslRuntimeError(`Intervalle non reconnu: "${suffix}"`, line);
	}

	const x = parseExpression('x', line);
	const lowerOp = lb === '[' ? '<=' : '<';
	const upperOp = ub === ']' ? '<=' : '<';

	const lowerCondition = parseBoundCondition(lowerStr, lowerOp, x, true, line);
	const upperCondition = parseBoundCondition(upperStr, upperOp, x, false, line);

	if (lowerCondition === null && upperCondition === null) {
		// Both bounds infinite — no constraint.
		throw new DslRuntimeError(`Intervalle non borné dans piecewise: "${suffix}"`, line);
	}
	if (lowerCondition === null) return upperCondition!;
	if (upperCondition === null) return lowerCondition;
	return logicalAnd(lowerCondition, upperCondition);
}

/**
 * Build a condition node for one side of an interval bound.
 * Returns null when the bound is `±∞` (no constraint on that side).
 */
function parseBoundCondition(
	boundStr: string,
	op: string,
	x: MathNode,
	isLower: boolean,
	line: number
): MathNode | null {
	const t = boundStr.trim();
	if (t === '+infini' || t === 'infini' || t === '+∞') {
		// `x < +∞` is always true → no constraint
		return null;
	}
	if (t === '-infini' || t === '-∞') {
		// `-∞ < x` is always true → no constraint
		return null;
	}
	const boundNode = parseExpression(t, line);
	// Lower bound: bound op x   (e.g., a <= x)
	// Upper bound: x op bound   (e.g., x <= b)
	if (isLower) {
		// op is '<=' or '<'  → bound op x means a <= x or a < x
		return relation(op as '<' | '<=', boundNode, x);
	}
	return relation(op as '<' | '<=', x, boundNode);
}

// =============================================================================
// Internal: collect slider dependencies from the AST
// =============================================================================

function collectDependencies(node: MathNode, symbols: SymbolTable | undefined): readonly string[] {
	if (!symbols) return [];
	const deps = new Set<string>();
	for (const v of getVariables(node)) {
		const entry = symbols.get(v);
		if (entry?.type === 'scalar' && entry.figureId) {
			deps.add(entry.figureId);
		}
	}
	return Array.from(deps);
}
