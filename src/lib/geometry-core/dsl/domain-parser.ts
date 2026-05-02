/**
 * Domain restriction parser for the geometry-core DSL.
 *
 * Parses the optional `sur ...` or `avec ...` suffix on a `courbe()` equation
 * into a `GeoFunctionDomain`. Two equivalent forms are accepted:
 *
 * - `... sur ]a ; b]` (interval notation, semicolon preferred)
 * - `... avec a < x <= b` (compound inequality)
 * - `... avec x > a` (single-sided, lower bound only)
 * - `... avec x <= b` (single-sided, upper bound only)
 *
 * Bounds resolve to `ScalarParam`:
 * - Numeric literals → `{ kind: 'numeric', value }`
 * - Slider/scalar names → `{ scalarRef: id }` (collected as dependencies)
 * - `+infini`/`-infini`/`+∞`/`-∞` → `{ infinity }`
 * - Symbolic expressions (e.g. `-3`, `2*a`, `sqrt(2)`) → `{ kind: 'exact', node }`
 */

import type { GeoFunctionDomain } from '../types/elements';
import type { ScalarParam } from '../types/geo-value';
import type { SymbolTable } from './symbol-table';
import type { EndpointType } from '$lib/math/intervals/types';
import { parseCustom, getVariables } from '$lib/mathAST';
import { DslRuntimeError } from './errors';

// =============================================================================
// Types
// =============================================================================

export interface ParseDomainResult {
	readonly domain: GeoFunctionDomain;
	readonly dependencies: readonly string[];
}

export interface SplitDomainResult {
	readonly core: string;
	readonly keyword: 'sur' | 'avec' | null;
	readonly suffix: string | null;
}

// =============================================================================
// Splitter — separates the equation core from the domain suffix
// =============================================================================

/**
 * Split an equation string on a top-level ` sur ` or ` avec ` keyword.
 *
 * Returns the pre-keyword portion as `core` and the post-keyword portion as
 * `suffix`. If neither keyword appears at the top level (i.e., outside any
 * parentheses or braces), returns `{ core: eq, keyword: null, suffix: null }`.
 *
 * Tracks `()` and `{}` depth to avoid splitting inside function calls or
 * piecewise blocks. Bracket characters `[` and `]` are NOT depth-tracked,
 * so `sur ]a;b]` is parsed correctly as a top-level interval suffix.
 *
 * Picks the LAST top-level occurrence (handles nested-but-not-bracketed cases
 * like an expression containing the substring `sur` somewhere benign).
 */
export function splitDomainSuffix(eq: string): SplitDomainResult {
	let depth = 0;
	let lastSplit: { at: number; kw: 'sur' | 'avec' } | null = null;

	for (let i = 0; i < eq.length; i++) {
		const c = eq[i];
		if (c === '(' || c === '{') depth++;
		else if (c === ')' || c === '}') depth = Math.max(0, depth - 1);
		if (depth !== 0) continue;
		if (c !== ' ') continue;

		if (eq.slice(i, i + 5) === ' sur ' && i + 5 < eq.length) {
			lastSplit = { at: i, kw: 'sur' };
		} else if (eq.slice(i, i + 6) === ' avec ' && i + 6 < eq.length) {
			lastSplit = { at: i, kw: 'avec' };
		}
	}

	if (!lastSplit) return { core: eq, keyword: null, suffix: null };

	const kwLen = lastSplit.kw === 'sur' ? 5 : 6;
	return {
		core: eq.slice(0, lastSplit.at).trim(),
		keyword: lastSplit.kw,
		suffix: eq.slice(lastSplit.at + kwLen).trim()
	};
}

// =============================================================================
// Suffix parser — produces a GeoFunctionDomain
// =============================================================================

/**
 * Parse a domain suffix into a `GeoFunctionDomain`.
 *
 * Throws `DslRuntimeError` on malformed input.
 */
export function parseDomainSuffix(
	suffix: string,
	keyword: 'sur' | 'avec',
	symbols: SymbolTable | undefined,
	line: number
): ParseDomainResult {
	if (keyword === 'sur') {
		return parseIntervalSuffix(suffix, symbols, line);
	}
	return parseConditionSuffix(suffix, symbols, line);
}

// =============================================================================
// Interval form: `]a ; b[`, `[a ; b]`, etc.
// =============================================================================

function parseIntervalSuffix(
	suffix: string,
	symbols: SymbolTable | undefined,
	line: number
): ParseDomainResult {
	const trimmed = suffix.trim();

	if (trimmed.length < 4) {
		throw new DslRuntimeError(`Domaine non reconnu: "${suffix}"`, line);
	}

	const lb = trimmed[0];
	const ub = trimmed[trimmed.length - 1];
	if ((lb !== '[' && lb !== ']') || (ub !== '[' && ub !== ']')) {
		throw new DslRuntimeError(`Domaine non reconnu: "${suffix}"`, line);
	}

	const inner = trimmed.slice(1, -1);
	// Prefer ';' if present (handles French decimal commas).
	const sep = inner.includes(';') ? ';' : ',';
	const parts = inner.split(sep);
	if (parts.length !== 2) {
		throw new DslRuntimeError(`Domaine non reconnu: "${suffix}"`, line);
	}

	const lowerStr = parts[0].trim();
	const upperStr = parts[1].trim();
	if (!lowerStr || !upperStr) {
		throw new DslRuntimeError(`Domaine non reconnu: "${suffix}"`, line);
	}

	const lowerType: EndpointType = lb === '[' ? 'closed' : 'open';
	const upperType: EndpointType = ub === ']' ? 'closed' : 'open';

	const deps: string[] = [];
	const lower = parseBound(lowerStr, symbols, deps, line);
	const upper = parseBound(upperStr, symbols, deps, line);

	validateBoundOrder(lower, upper, suffix, line);

	return {
		domain: { lower, upper, lowerType, upperType },
		dependencies: deduplicate(deps)
	};
}

// =============================================================================
// Condition form: `a < x <= b`, `x > a`, `a < x`, etc.
// =============================================================================

const COMPOUND_RE = /^(.+?)\s*(<=?|>=?)\s*x\s*(<=?|>=?)\s*(.+)$/;
const SINGLE_X_FIRST_RE = /^x\s*(<=?|>=?)\s*(.+)$/;
const SINGLE_X_LAST_RE = /^(.+?)\s*(<=?|>=?)\s*x$/;

function parseConditionSuffix(
	suffix: string,
	symbols: SymbolTable | undefined,
	line: number
): ParseDomainResult {
	const trimmed = suffix.trim();

	// Compound: a < x <= b (or any combination of < and <=)
	const m1 = trimmed.match(COMPOUND_RE);
	if (m1) {
		const [, lowerStr, lowerOp, upperOp, upperStr] = m1;
		// Both ops must be `<` or `<=` (i.e., bounds increasing left-to-right).
		// Reject mixed direction `a > x < b` or similar.
		if (lowerOp[0] !== '<' || upperOp[0] !== '<') {
			throw new DslRuntimeError(
				`Encadrement attendu de la forme "a < x < b" ou similaire: "${suffix}"`,
				line
			);
		}
		const lowerType: EndpointType = lowerOp.includes('=') ? 'closed' : 'open';
		const upperType: EndpointType = upperOp.includes('=') ? 'closed' : 'open';
		const deps: string[] = [];
		const lower = parseBound(lowerStr.trim(), symbols, deps, line);
		const upper = parseBound(upperStr.trim(), symbols, deps, line);
		validateBoundOrder(lower, upper, suffix, line);
		return { domain: { lower, upper, lowerType, upperType }, dependencies: deduplicate(deps) };
	}

	// Single, x first: x > a, x <= b, ...
	const m2 = trimmed.match(SINGLE_X_FIRST_RE);
	if (m2) {
		const [, op, valStr] = m2;
		const deps: string[] = [];
		const val = parseBound(valStr.trim(), symbols, deps, line);
		if (op === '>' || op === '>=') {
			return {
				domain: {
					lower: val,
					upper: { infinity: '+' },
					lowerType: op === '>' ? 'open' : 'closed',
					upperType: 'open'
				},
				dependencies: deduplicate(deps)
			};
		}
		// op is < or <=
		return {
			domain: {
				lower: { infinity: '-' },
				upper: val,
				lowerType: 'open',
				upperType: op === '<' ? 'open' : 'closed'
			},
			dependencies: deduplicate(deps)
		};
	}

	// Single, x last: a < x, b >= x, ...
	const m3 = trimmed.match(SINGLE_X_LAST_RE);
	if (m3) {
		const [, valStr, op] = m3;
		const deps: string[] = [];
		const val = parseBound(valStr.trim(), symbols, deps, line);
		if (op === '<' || op === '<=') {
			// a < x → x > a
			return {
				domain: {
					lower: val,
					upper: { infinity: '+' },
					lowerType: op === '<' ? 'open' : 'closed',
					upperType: 'open'
				},
				dependencies: deduplicate(deps)
			};
		}
		// op is > or >= → b > x → x < b
		return {
			domain: {
				lower: { infinity: '-' },
				upper: val,
				lowerType: 'open',
				upperType: op === '>' ? 'open' : 'closed'
			},
			dependencies: deduplicate(deps)
		};
	}

	throw new DslRuntimeError(`Condition non reconnue: "${suffix}"`, line);
}

// =============================================================================
// Bound parser
// =============================================================================

function parseBound(
	s: string,
	symbols: SymbolTable | undefined,
	deps: string[],
	line: number
): ScalarParam {
	const trimmed = s.trim();

	// Infinity tokens. Bare `infini` (no sign) is treated as `+∞` for backwards
	// compatibility, but `+infini`/`-infini` are the documented forms.
	if (trimmed === '+infini' || trimmed === 'infini' || trimmed === '+∞') {
		return { infinity: '+' };
	}
	if (trimmed === '-infini' || trimmed === '-∞') {
		return { infinity: '-' };
	}

	// Plain numeric literal (allow leading minus, decimal)
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
		const v = Number(trimmed);
		if (Number.isFinite(v)) {
			return { kind: 'numeric', value: v };
		}
	}

	// Symbol lookup
	if (/^[a-zA-Z_]\w*$/.test(trimmed) && symbols) {
		const entry = symbols.get(trimmed);
		if (entry) {
			if (entry.type === 'scalar' && entry.figureId) {
				deps.push(entry.figureId);
				return { scalarRef: entry.figureId };
			}
			if (entry.type === 'nombre') {
				const v = entry.value ?? 0;
				return { kind: 'numeric', value: v };
			}
		}
	}

	// Symbolic expression (e.g. `-3`, `2*a`, `sqrt(2)`).
	// Collect any variables that resolve to slider/scalar elements as
	// dependencies, so the figure re-renders when those sliders move (even
	// though the resulting bound is a static MathNode that doesn't carry the
	// reactive value at evaluation time — this is a Phase B simplification).
	try {
		const node = parseCustom(trimmed);
		if (symbols) {
			for (const v of getVariables(node)) {
				const entry = symbols.get(v);
				if (entry?.type === 'scalar' && entry.figureId) {
					deps.push(entry.figureId);
				}
			}
		}
		return { kind: 'exact', node };
	} catch {
		throw new DslRuntimeError(`Borne non reconnue: "${s}"`, line);
	}
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Check that lower < upper for purely-numeric bounds.
 * If either bound is symbolic / a slider / infinity, we skip the check
 * (sliders can move and produce empty intervals at runtime — that's a
 * rendering concern, not a static error).
 */
function validateBoundOrder(
	lower: ScalarParam,
	upper: ScalarParam,
	suffix: string,
	line: number
): void {
	const ln = staticNumericValue(lower);
	const un = staticNumericValue(upper);
	if (ln !== null && un !== null && ln > un) {
		throw new DslRuntimeError(
			`Domaine invalide: borne basse (${ln}) > borne haute (${un}) dans "${suffix}"`,
			line
		);
	}
}

function staticNumericValue(p: ScalarParam): number | null {
	if ('infinity' in p) return p.infinity === '+' ? Infinity : -Infinity;
	if ('scalarRef' in p) return null; // dynamic
	if (p.kind === 'numeric') return p.value;
	return null; // exact symbolic — could be evaluated but we keep it simple
}

function deduplicate(arr: readonly string[]): string[] {
	return Array.from(new Set(arr));
}
