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
