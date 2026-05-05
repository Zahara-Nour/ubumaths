/**
 * Answer Format Parser
 *
 * Parses `answerFormats` strings (e.g. `'10^?'`, `'? \\times 10^?'`,
 * `'\\sqrt{?}'`) used by `QuestionVariation.answerFormats` to describe the
 * shape of the expected answer with `?` placeholders.
 *
 * Used by:
 * - **Phase 2** (`target-extractor.ts`) — high-level pattern classification
 *   (scientific / fraction / power / unknown) to derive `TargetForm` heuristics.
 * - **Phase 7** (the pipeline) — full template parse + matching + fragment
 *   extraction at the placeholder path.
 *
 * Phase 2a (this commit) implements ONLY classification — the matching /
 * fragment-extraction layer is added in Phase 7.
 *
 * @module mathAST/pedagogical-arithmetic/answer-format-parser
 */

// =============================================================================
// Format Classification
// =============================================================================

/**
 * High-level classification of an `answerFormat` string. Used by the target
 * extractor to derive `TargetForm` when `requiredForm` alone is ambiguous.
 *
 * - `'scientific'` — matches templates like `'10^?'` or `'? \\times 10^?'`
 *   or unicode `'? × 10^?'`. Suggests `TargetForm = 'scientific'`.
 * - `'fraction'` — matches templates like `'?/?'` or `'\\dfrac{?}{?}'`.
 * - `'power'` — matches templates like `'?^?'` (not 10^?).
 * - `'radical'` — matches templates like `'\\sqrt{?}'` or `'?\\sqrt{?}'`.
 * - `'plain'` — single `?` with no surrounding template structure.
 * - `'unknown'` — any other form (no automatic interpretation).
 */
export type AnswerFormatKind =
	| 'scientific'
	| 'fraction'
	| 'power'
	| 'radical'
	| 'plain'
	| 'unknown';

// =============================================================================
// Pattern Detection
// =============================================================================

/**
 * Strip LaTeX whitespace markers and normalize the input for pattern matching.
 *
 * Replaces `\,`, `\;`, `\:`, `\!`, `\ ` with empty strings, and collapses
 * runs of spaces. Preserves `?`, `\\` LaTeX commands, and structural braces.
 */
function normalize(format: string): string {
	return format
		.replace(/\\[,;:!]/g, '')
		.replace(/\\\s/g, '')
		.replace(/\s+/g, '')
		.trim();
}

/**
 * Detect whether a format describes scientific notation.
 *
 * Recognized templates :
 *   - `'10^?'`              — pure power-of-ten
 *   - `'?×10^?'`            — coefficient × 10^exponent (unicode ×)
 *   - `'?\times10^?'`       — LaTeX form
 *   - `'?\cdot10^?'`        — alternate LaTeX
 *   - `'?\\times{}10^{?}'`  — full braces
 *
 * Heuristic: contains `10^` (or `10^{`) AND has at least one `?` placeholder.
 */
export function isScientificFormat(format: string): boolean {
	const normalized = normalize(format);
	if (!normalized.includes('?')) return false;
	// Match `10^X` where X is a placeholder or { ... }
	return /10\^(\?|\{)/.test(normalized);
}

/**
 * Detect whether a format describes a fraction.
 *
 * Recognized templates :
 *   - `'?/?'`             — inline slash
 *   - `'\dfrac{?}{?}'`    — LaTeX dfrac
 *   - `'\frac{?}{?}'`     — LaTeX frac
 *   - `'\tfrac{?}{?}'`    — LaTeX tfrac
 */
export function isFractionFormat(format: string): boolean {
	const normalized = normalize(format);
	if (!normalized.includes('?')) return false;
	if (/\\d?frac\{/.test(normalized) || /\\tfrac\{/.test(normalized)) return true;
	// Inline ?/? : exactly two placeholders separated by a single slash, no
	// other content. Strict to avoid matching unrelated structures like '?+?/?'.
	return /^\?\/\?$/.test(normalized);
}

/**
 * Detect whether a format describes a generic power (other than 10^?).
 *
 * Recognized templates :
 *   - `'?^?'`         — base and exponent both placeholders
 *   - `'?^{?}'`       — LaTeX form with braces
 *   - `'2^?'`         — fixed base, placeholder exponent (NOT 10)
 */
export function isPowerFormat(format: string): boolean {
	if (isScientificFormat(format)) return false;
	const normalized = normalize(format);
	if (!normalized.includes('?')) return false;
	return /\^(\?|\{)/.test(normalized);
}

/**
 * Detect whether a format describes a radical (\sqrt).
 *
 * Recognized templates :
 *   - `'\sqrt{?}'`         — square root
 *   - `'?\sqrt{?}'`        — coefficient times square root
 *   - `'\sqrt[?]{?}'`      — nth root (rare in pedagogical context)
 */
export function isRadicalFormat(format: string): boolean {
	const normalized = normalize(format);
	if (!normalized.includes('?')) return false;
	return /\\sqrt(\[|\{)/.test(normalized);
}

/**
 * Detect whether a format is a single `?` (plain placeholder).
 */
export function isPlainFormat(format: string): boolean {
	const normalized = normalize(format);
	return normalized === '?';
}

/**
 * Classify an `answerFormat` string into one of `AnswerFormatKind`.
 *
 * Order of precedence: `scientific > radical > fraction > power > plain > unknown`.
 * The order matters because `'?\\times10^?'` is structurally a power — but
 * scientifically it should classify as `'scientific'`.
 */
export function classifyAnswerFormat(format: string): AnswerFormatKind {
	if (isScientificFormat(format)) return 'scientific';
	if (isRadicalFormat(format)) return 'radical';
	if (isFractionFormat(format)) return 'fraction';
	if (isPowerFormat(format)) return 'power';
	if (isPlainFormat(format)) return 'plain';
	return 'unknown';
}

/**
 * Count `?` placeholders in a format string. Useful for sanity checks.
 */
export function countPlaceholders(format: string): number {
	const matches = format.match(/\?/g);
	return matches ? matches.length : 0;
}

// =============================================================================
// Phase 7 — Fragment extraction
// =============================================================================

import type { MathNode } from '../types';
import { isFunction, isMultiplication, isNumber, isOpposite, isSuperscript } from '../guards';
import { toLatex } from '../latex-generator';

/**
 * A path within an `answerFormat` AST locating the `?` placeholder. Each
 * step is an English label rather than an integer index, to keep the path
 * readable in test snapshots and UI tooltips.
 */
export type PlaceholderPath = readonly string[];

/**
 * Result of running `extractAnswerFragment`. The `latex` field is what the
 * student is supposed to type in the blank, and `placeholderPath` records
 * the structural location of that fragment within the matched expression.
 */
export interface AnswerFragment {
	readonly latex: string;
	readonly placeholderPath: PlaceholderPath;
}

/**
 * Try to extract the `?` fragment from `node` according to the format.
 *
 * Supported templates (Phase 7) :
 *   - `'?'`              → fragment = full node, path = `[]`
 *   - `'10^?'`           → match `superscript(10, exp)`, fragment = `exp`,
 *                          path = `['superscript']`
 *   - `'? × 10^?'` (LaTeX `? \times 10^?`) → match `multiply(a, 10^n)`,
 *                          fragment = `a` (the FIRST `?`),
 *                          path = `['left']`
 *   - `'\sqrt{?}'`       → match `sqrt(arg)`, fragment = `arg`,
 *                          path = `['arg']`
 *
 * Returns `null` when the node doesn't match the format. The caller can
 * decide to skip the fragment-extraction step in that case.
 */
export function extractAnswerFragment(node: MathNode, format: string): AnswerFragment | null {
	const kind = classifyAnswerFormat(format);

	switch (kind) {
		case 'plain':
			return { latex: toLatex(node), placeholderPath: [] };

		case 'scientific': {
			const placeholders = countPlaceholders(format);
			if (placeholders === 1) {
				// '10^?' — exponent only
				return extractScientificExponentOnly(node);
			}
			// '? × 10^?' — mantissa + exponent ; convention : we return the
			// MANTISSA as the primary fragment (the most common student input).
			return extractScientificMantissa(node);
		}

		case 'radical':
			return extractRadicand(node);

		case 'fraction':
			// Phase 7 returns the full reduced fraction LaTeX for fraction
			// templates ; the per-placeholder split is left to a future
			// extension when the orchestrator demands two distinct blanks.
			return { latex: toLatex(node), placeholderPath: [] };

		case 'power': {
			// '?^?' or '2^?' — return the exponent (the fragment of interest)
			return extractPowerExponent(node);
		}

		case 'unknown':
		default:
			return null;
	}
}

/** Match `superscript(10, exp)` and return `exp`. */
function extractScientificExponentOnly(node: MathNode): AnswerFragment | null {
	if (!isSuperscript(node)) return null;
	if (!isNumber(node.base) || node.base.value !== '10') return null;
	return { latex: toLatex(node.superscript), placeholderPath: ['superscript'] };
}

/** Match `multiply(mantissa, superscript(10, _))` and return the mantissa. */
function extractScientificMantissa(node: MathNode): AnswerFragment | null {
	if (!isMultiplication(node)) return null;
	const right = node.right;
	if (!isSuperscript(right)) return null;
	if (!isNumber(right.base) || right.base.value !== '10') return null;
	// Mantissa is on the left. Strip a leading `opposite()` if present.
	const left = isOpposite(node.left) ? node.left.operand : node.left;
	return { latex: toLatex(left), placeholderPath: ['left'] };
}

/** Match `sqrt(arg)` and return the `arg`. */
function extractRadicand(node: MathNode): AnswerFragment | null {
	if (!isFunction(node) || node.name !== 'sqrt' || node.args.length !== 1) return null;
	return { latex: toLatex(node.args[0]), placeholderPath: ['arg'] };
}

/** Match `superscript(_, exp)` and return the exponent. */
function extractPowerExponent(node: MathNode): AnswerFragment | null {
	if (!isSuperscript(node)) return null;
	return { latex: toLatex(node.superscript), placeholderPath: ['superscript'] };
}
