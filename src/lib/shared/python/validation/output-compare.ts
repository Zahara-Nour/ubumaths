/**
 * Pure JS engine for the `output` validation strategy.
 *
 * Compares an `actual` program output against an `expected` reference using one
 * of three intents:
 *
 *   - `exact`   — byte-for-byte identical.
 *   - `text`    — text comparison with controlled whitespace/case normalisation.
 *   - `numeric` — token-by-token numeric comparison with abs+rel tolerance,
 *                  supporting `flat`, `lines`, and `grid` shapes.
 *
 * On failure, returns a French `diff` message detailed enough that the student
 * can correct without seeing the raw `expected`/`actual` side by side.
 *
 * No Pyodide dependency: callable from anywhere (worker, main thread, tests).
 */

import type { OutputComparison, TextComparison, NumericComparison } from '$lib/shared/python';

export interface CompareResult {
	passed: boolean;
	diff?: string;
}

export function compareOutputs(
	expected: string,
	actual: string,
	cmp: OutputComparison
): CompareResult {
	switch (cmp.kind) {
		case 'exact':
			return compareExact(expected, actual);
		case 'text':
			return compareText(expected, actual, cmp);
		case 'numeric':
			return compareNumeric(expected, actual, cmp);
		case 'custom':
			// Custom comparators run a teacher-defined Python `compare()`; the worker
			// routes `kind: 'custom'` to compareWithCustomScript() BEFORE reaching here
			// (see pyodide.worker.ts). This branch is unreachable in practice and exists
			// only for switch exhaustiveness.
			return { passed: false, diff: 'Custom comparison runs in the Pyodide worker.' };
	}
}

// ---------------------------------------------------------------------------
// Exact
// ---------------------------------------------------------------------------

function compareExact(expected: string, actual: string): CompareResult {
	if (expected === actual) return { passed: true };
	return { passed: false, diff: 'Sortie différente de la sortie attendue.' };
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function compareText(expected: string, actual: string, cmp: TextComparison): CompareResult {
	const trimNL = cmp.trim_trailing_newline ?? true;
	const ci = cmp.case_insensitive ?? false;

	const e = normaliseText(expected, cmp.whitespace, trimNL, ci);
	const a = normaliseText(actual, cmp.whitespace, trimNL, ci);

	if (cmp.whitespace === 'lines') {
		if (e.lines!.length !== a.lines!.length) {
			return {
				passed: false,
				diff: `Nombre de lignes différent : attendu ${e.lines!.length}, obtenu ${a.lines!.length}.`
			};
		}
		for (let i = 0; i < e.lines!.length; i++) {
			if (e.lines![i] !== a.lines![i]) {
				return {
					passed: false,
					diff: `Ligne ${i + 1} différente : attendu ${quote(e.lines![i])}, obtenu ${quote(a.lines![i])}.`
				};
			}
		}
		return { passed: true };
	}

	if (e.text === a.text) return { passed: true };
	return {
		passed: false,
		diff: `Texte différent (mode ${cmp.whitespace}${ci ? ', casse ignorée' : ''}).`
	};
}

interface NormalisedText {
	text: string;
	lines?: string[];
}

function normaliseText(
	input: string,
	mode: 'strict' | 'collapsed' | 'lines',
	trimTrailingNewline: boolean,
	caseInsensitive: boolean
): NormalisedText {
	let s = input;
	if (trimTrailingNewline) s = s.replace(/\n$/, '');
	if (caseInsensitive) s = s.toLowerCase();

	switch (mode) {
		case 'strict':
			return { text: s };
		case 'collapsed':
			return { text: s.replace(/\s+/g, ' ').trim() };
		case 'lines': {
			const lines = s
				.split('\n')
				.map((l) => l.trim())
				.filter((l) => l.length > 0);
			return { text: lines.join('\n'), lines };
		}
	}
}

// ---------------------------------------------------------------------------
// Numeric
// ---------------------------------------------------------------------------

function compareNumeric(expected: string, actual: string, cmp: NumericComparison): CompareResult {
	switch (cmp.shape) {
		case 'flat':
			return compareNumericFlat(expected, actual, cmp);
		case 'lines':
			return compareNumericLines(expected, actual, cmp);
		case 'grid':
			return compareNumericGrid(expected, actual, cmp);
	}
}

function compareNumericFlat(
	expected: string,
	actual: string,
	cmp: NumericComparison
): CompareResult {
	let eTokens = tokenizeFlat(expected);
	let aTokens = tokenizeFlat(actual);

	if (cmp.non_numeric === 'ignore') {
		eTokens = eTokens.filter((t) => isNumericToken(t, !!cmp.accept_comma_decimal));
		aTokens = aTokens.filter((t) => isNumericToken(t, !!cmp.accept_comma_decimal));
	}

	return compareTokenLists(eTokens, aTokens, cmp, 'Token');
}

function compareNumericLines(
	expected: string,
	actual: string,
	cmp: NumericComparison
): CompareResult {
	const eLines = tokenizeLines(expected);
	const aLines = tokenizeLines(actual);

	if (eLines.length !== aLines.length) {
		return {
			passed: false,
			diff: `Nombre de lignes différent : attendu ${eLines.length}, obtenu ${aLines.length}.`
		};
	}

	for (let i = 0; i < eLines.length; i++) {
		const r = compareTokenPair(eLines[i], aLines[i], cmp, `Ligne ${i + 1}`);
		if (!r.passed) return r;
	}
	return { passed: true };
}

function compareNumericGrid(
	expected: string,
	actual: string,
	cmp: NumericComparison
): CompareResult {
	const eGrid = tokenizeGrid(expected);
	const aGrid = tokenizeGrid(actual);

	if (eGrid.length === 0 || aGrid.length === 0) {
		return {
			passed: false,
			diff: 'Grille vide.'
		};
	}

	const eRows = eGrid.length;
	const aRows = aGrid.length;
	const eCols = eGrid[0].length;
	const aCols = aGrid[0].length;

	if (eRows !== aRows || eCols !== aCols) {
		return {
			passed: false,
			diff: `Grille incompatible : attendu ${eRows}x${eCols}, obtenu ${aRows}x${aCols}.`
		};
	}

	for (let i = 1; i < eGrid.length; i++) {
		if (eGrid[i].length !== eCols) {
			return {
				passed: false,
				diff: `Grille attendue non rectangulaire à la ligne ${i + 1}.`
			};
		}
	}
	for (let i = 1; i < aGrid.length; i++) {
		if (aGrid[i].length !== aCols) {
			return {
				passed: false,
				diff: `Grille obtenue non rectangulaire à la ligne ${i + 1}.`
			};
		}
	}

	for (let r = 0; r < eRows; r++) {
		for (let c = 0; c < eCols; c++) {
			const tokenResult = compareSingleToken(
				eGrid[r][c],
				aGrid[r][c],
				cmp,
				`Ligne ${r + 1}, colonne ${c + 1}`
			);
			if (!tokenResult.passed) return tokenResult;
		}
	}
	return { passed: true };
}

// ---------------------------------------------------------------------------
// Token comparison
// ---------------------------------------------------------------------------

function compareTokenLists(
	expected: string[],
	actual: string[],
	cmp: NumericComparison,
	label: string
): CompareResult {
	if (expected.length !== actual.length) {
		return {
			passed: false,
			diff: `Nombre de tokens différent : attendu ${expected.length}, obtenu ${actual.length}.`
		};
	}
	for (let i = 0; i < expected.length; i++) {
		const r = compareSingleToken(expected[i], actual[i], cmp, `${label} ${i + 1}`);
		if (!r.passed) return r;
	}
	return { passed: true };
}

function compareTokenPair(
	expected: string[],
	actual: string[],
	cmp: NumericComparison,
	context: string
): CompareResult {
	if (expected.length !== actual.length) {
		return {
			passed: false,
			diff: `${context} : nombre de tokens différent (attendu ${expected.length}, obtenu ${actual.length}).`
		};
	}
	for (let i = 0; i < expected.length; i++) {
		const r = compareSingleToken(expected[i], actual[i], cmp, `${context}, token ${i + 1}`);
		if (!r.passed) return r;
	}
	return { passed: true };
}

function compareSingleToken(
	expected: string,
	actual: string,
	cmp: NumericComparison,
	label: string
): CompareResult {
	const acceptComma = !!cmp.accept_comma_decimal;
	const eIsNum = isNumericToken(expected, acceptComma);
	const aIsNum = isNumericToken(actual, acceptComma);

	if (eIsNum && aIsNum) {
		const e = parseFloatLoose(expected, acceptComma);
		const a = parseFloatLoose(actual, acceptComma);
		if (numericEqual(e, a, cmp.eps_abs, cmp.eps_rel)) return { passed: true };

		const gap = Math.abs(e - a);
		const tol = Math.max(cmp.eps_abs, cmp.eps_rel * Math.abs(e));
		return {
			passed: false,
			diff: `${label} : attendu ${expected}, obtenu ${actual} — écart ${formatNumber(gap)} > tolérance ${formatNumber(tol)}.`
		};
	}

	// Non-numeric on at least one side — compare as strings
	if (expected === actual) return { passed: true };
	return {
		passed: false,
		diff: `${label} : attendu ${quote(expected)}, obtenu ${quote(actual)} (texte non numérique).`
	};
}

// ---------------------------------------------------------------------------
// Tokenisation
// ---------------------------------------------------------------------------

function tokenizeFlat(text: string): string[] {
	return text.split(/\s+/).filter((t) => t.length > 0);
}

function tokenizeLines(text: string): string[][] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => line.split(/\s+/).filter((t) => t.length > 0));
}

function tokenizeGrid(text: string): string[][] {
	return tokenizeLines(text);
}

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

const NUMERIC_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const NUMERIC_RE_COMMA = /^[+-]?(?:\d+[.,]?\d*|[.,]\d+)(?:[eE][+-]?\d+)?$/;
const SPECIAL_RE = /^[+-]?(?:inf|infinity|nan)$/i;

function isNumericToken(token: string, acceptComma: boolean): boolean {
	if (SPECIAL_RE.test(token)) return true;
	const re = acceptComma ? NUMERIC_RE_COMMA : NUMERIC_RE;
	return re.test(token);
}

function parseFloatLoose(token: string, acceptComma: boolean): number {
	if (SPECIAL_RE.test(token)) {
		const lower = token.toLowerCase();
		if (lower.includes('nan')) return Number.NaN;
		if (lower.startsWith('-')) return Number.NEGATIVE_INFINITY;
		return Number.POSITIVE_INFINITY;
	}
	const normalised = acceptComma ? token.replace(',', '.') : token;
	return parseFloat(normalised);
}

function numericEqual(e: number, a: number, eps_abs: number, eps_rel: number): boolean {
	if (Number.isNaN(e) && Number.isNaN(a)) return true;
	if (Number.isNaN(e) || Number.isNaN(a)) return false;
	if (e === Number.POSITIVE_INFINITY && a === Number.POSITIVE_INFINITY) return true;
	if (e === Number.NEGATIVE_INFINITY && a === Number.NEGATIVE_INFINITY) return true;
	if (!Number.isFinite(e) || !Number.isFinite(a)) return false;
	const diff = Math.abs(e - a);
	const tolerance = Math.max(eps_abs, eps_rel * Math.abs(e));
	return diff <= tolerance;
}

function formatNumber(n: number): string {
	if (n === 0) return '0';
	const abs = Math.abs(n);
	if (abs < 1e-3 || abs >= 1e6) return n.toExponential(3);
	return n.toPrecision(4).replace(/\.?0+$/, '');
}

function quote(s: string): string {
	if (s.length > 50) s = s.slice(0, 47) + '...';
	return `'${s.replace(/'/g, "\\'")}'`;
}
