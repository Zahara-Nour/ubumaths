/**
 * Tests for the pure JS output comparison engine.
 *
 * Each `it()` is numbered to a behavior in the V2 spec
 * (see ~/.claude/plans/shimmying-cooking-hamster.md, Phase 0).
 */

import { describe, expect, it } from 'vitest';
import { compareOutputs } from './output-compare';
import type { ExactComparison, TextComparison, NumericComparison } from '$lib/shared/python';

const exact: ExactComparison = { kind: 'exact' };

describe('compareOutputs — exact', () => {
	it('B1 — passes when outputs are byte-identical', () => {
		const r = compareOutputs('hello\n', 'hello\n', exact);
		expect(r.passed).toBe(true);
		expect(r.diff).toBeUndefined();
	});

	it('B2 — fails on a single-character difference, with diff message', () => {
		const r = compareOutputs('hello\n', 'hello', exact);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/différente|différent/i);
	});

	it('B2 — fails on case difference', () => {
		const r = compareOutputs('Hello', 'hello', exact);
		expect(r.passed).toBe(false);
	});

	it('B2 — fails on whitespace difference', () => {
		const r = compareOutputs('a b', 'a  b', exact);
		expect(r.passed).toBe(false);
	});
});

describe('compareOutputs — text / strict', () => {
	const cmp: TextComparison = { kind: 'text', whitespace: 'strict' };

	it('B3 — passes on identical text', () => {
		expect(compareOutputs('a\nb', 'a\nb', cmp).passed).toBe(true);
	});

	it('B3 — fails when whitespace differs', () => {
		expect(compareOutputs('a\nb', 'a b', cmp).passed).toBe(false);
	});

	it('B7 — trailing newline tolerated by default (added on student side)', () => {
		expect(compareOutputs('a', 'a\n', cmp).passed).toBe(true);
	});

	it('B7 — trailing newline tolerated by default (missing on student side)', () => {
		expect(compareOutputs('a\n', 'a', cmp).passed).toBe(true);
	});

	it('B7 — trailing newline NOT tolerated when option disabled', () => {
		const c2: TextComparison = { kind: 'text', whitespace: 'strict', trim_trailing_newline: false };
		expect(compareOutputs('a', 'a\n', c2).passed).toBe(false);
	});
});

describe('compareOutputs — text / collapsed', () => {
	const cmp: TextComparison = { kind: 'text', whitespace: 'collapsed' };

	it('B4 — multiple spaces collapse to one', () => {
		expect(compareOutputs('a    b', 'a b', cmp).passed).toBe(true);
	});

	it('B4 — newline equivalent to space when collapsed', () => {
		expect(compareOutputs('a\nb', 'a b', cmp).passed).toBe(true);
	});

	it('B4 — leading/trailing whitespace ignored', () => {
		expect(compareOutputs('  hello  ', 'hello', cmp).passed).toBe(true);
	});

	it('B4 — content difference still fails', () => {
		expect(compareOutputs('a   b', 'a c', cmp).passed).toBe(false);
	});
});

describe('compareOutputs — text / lines', () => {
	const cmp: TextComparison = { kind: 'text', whitespace: 'lines' };

	it('B5 — passes when each line matches after trim', () => {
		expect(compareOutputs('a\n  b ', 'a\nb', cmp).passed).toBe(true);
	});

	it('B5 — fails when number of non-empty lines differs', () => {
		const r = compareOutputs('a\nb\nc', 'a\nb', cmp);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/lignes/i);
	});

	it('B5 — empty trailing lines ignored (trim_trailing_newline default)', () => {
		expect(compareOutputs('a\nb', 'a\nb\n', cmp).passed).toBe(true);
	});
});

describe('compareOutputs — text / case_insensitive', () => {
	it('B6 — same text different case → passes', () => {
		const cmp: TextComparison = { kind: 'text', whitespace: 'strict', case_insensitive: true };
		expect(compareOutputs('Bonjour', 'bonjour', cmp).passed).toBe(true);
	});

	it('B6 — case sensitivity respected when option false (default)', () => {
		const cmp: TextComparison = { kind: 'text', whitespace: 'strict' };
		expect(compareOutputs('Bonjour', 'bonjour', cmp).passed).toBe(false);
	});
});

describe('compareOutputs — numeric / flat', () => {
	const tight: NumericComparison = {
		kind: 'numeric',
		shape: 'flat',
		eps_abs: 1e-9,
		eps_rel: 1e-9
	};
	const loose: NumericComparison = {
		kind: 'numeric',
		shape: 'flat',
		eps_abs: 1e-3,
		eps_rel: 1e-3
	};

	it('B9 — exact numeric match passes', () => {
		expect(compareOutputs('1.41', '1.41', tight).passed).toBe(true);
	});

	it('B12 — within absolute tolerance passes', () => {
		expect(compareOutputs('1.41', '1.4105', loose).passed).toBe(true);
	});

	it('B12 — outside tolerance fails with informative diff', () => {
		const r = compareOutputs('1.41', '1.42', tight);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/1\.41/);
		expect(r.diff).toMatch(/1\.42/);
		expect(r.diff).toMatch(/écart|tolérance/i);
	});

	it('B9 — multiple tokens, all match', () => {
		expect(compareOutputs('1 2 3', '1 2 3', tight).passed).toBe(true);
	});

	it('B9 — different number of tokens fails with diff', () => {
		const r = compareOutputs('1 2 3', '1 2', tight);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/tokens|nombres/i);
	});

	it('B9 — newline/space equivalence', () => {
		expect(compareOutputs('1 2 3', '1\n2\n3', tight).passed).toBe(true);
	});

	it('B12 — relative tolerance kicks in for large numbers', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-9,
			eps_rel: 1e-3
		};
		// |1e9 - 1.0001e9| = 1e5 ; relative = 1e-4 < 1e-3
		expect(compareOutputs('1e9', '1.0001e9', cmp).passed).toBe(true);
	});

	it('B18 — -0 equals 0', () => {
		expect(compareOutputs('0', '-0', tight).passed).toBe(true);
	});

	it('B16 — NaN equals NaN', () => {
		expect(compareOutputs('nan', 'nan', tight).passed).toBe(true);
	});

	it('B17 — Infinity equals Infinity', () => {
		expect(compareOutputs('inf', 'inf', tight).passed).toBe(true);
	});

	it('B17 — -Infinity equals -Infinity', () => {
		expect(compareOutputs('-inf', '-inf', tight).passed).toBe(true);
	});

	it('B17 — Infinity vs -Infinity differ', () => {
		expect(compareOutputs('inf', '-inf', tight).passed).toBe(false);
	});
});

describe('compareOutputs — numeric / non_numeric', () => {
	it('B13 — match: text tokens must match strictly', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-6,
			eps_rel: 1e-6,
			non_numeric: 'match'
		};
		expect(compareOutputs('x = 1.41', 'x = 1.41', cmp).passed).toBe(true);
		expect(compareOutputs('x = 1.41', 'y = 1.41', cmp).passed).toBe(false);
	});

	it('B14 — ignore: text tokens are filtered out, only numbers compared', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-6,
			eps_rel: 1e-6,
			non_numeric: 'ignore'
		};
		expect(compareOutputs('x = 1.41 et y = 2.83', 'foo 1.41 bar 2.83 baz', cmp).passed).toBe(true);
	});

	it('B14 — ignore: number order still matters', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-6,
			eps_rel: 1e-6,
			non_numeric: 'ignore'
		};
		expect(compareOutputs('1 2', '2 1', cmp).passed).toBe(false);
	});
});

describe('compareOutputs — numeric / accept_comma_decimal', () => {
	it('B15 — comma decimal parsed when option enabled', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-6,
			eps_rel: 1e-6,
			accept_comma_decimal: true
		};
		expect(compareOutputs('1.41', '1,41', cmp).passed).toBe(true);
	});

	it('B15 — comma not parsed when option disabled (default)', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-6,
			eps_rel: 1e-6
		};
		// "1,41" is a non-numeric token in default 'match' mode → fails because actual is "1.41"
		expect(compareOutputs('1,41', '1.41', cmp).passed).toBe(false);
	});
});

describe('compareOutputs — numeric / lines', () => {
	const cmp: NumericComparison = {
		kind: 'numeric',
		shape: 'lines',
		eps_abs: 1e-6,
		eps_rel: 1e-6
	};

	it('B10 — passes when each line matches numerically', () => {
		expect(compareOutputs('1\n2\n3', '1\n2\n3', cmp).passed).toBe(true);
	});

	it('B10 — within tolerance per line', () => {
		expect(compareOutputs('1.0\n2.0', '1.0000001\n2.0000001', cmp).passed).toBe(true);
	});

	it('B10 — different number of lines fails', () => {
		const r = compareOutputs('1\n2\n3', '1\n2', cmp);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/lignes/i);
	});

	it('B10 — token mismatch on a specific line', () => {
		const r = compareOutputs('1\n2\n3', '1\n5\n3', cmp);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/ligne 2/i);
	});
});

describe('compareOutputs — numeric / grid', () => {
	const cmp: NumericComparison = {
		kind: 'numeric',
		shape: 'grid',
		eps_abs: 1e-6,
		eps_rel: 1e-6
	};

	it('B11 — rectangular grid passes', () => {
		expect(compareOutputs('1 2 3\n4 5 6', '1 2 3\n4 5 6', cmp).passed).toBe(true);
	});

	it('B11 — within tolerance per cell', () => {
		expect(compareOutputs('1.0 2.0\n3.0 4.0', '1.0000001 2.0\n3.0 4.0', cmp).passed).toBe(true);
	});

	it('B20 — different dimensions fail with explicit diff', () => {
		const r = compareOutputs('1 2 3\n4 5 6', '1 2\n3 4', cmp);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/2x3|2x2|3x|incompatible|grille/i);
	});

	it('B11 — non-rectangular actual fails', () => {
		const r = compareOutputs('1 2 3\n4 5 6', '1 2 3\n4 5', cmp);
		expect(r.passed).toBe(false);
	});

	it('B11 — cell mismatch reports row and column', () => {
		const r = compareOutputs('1 2\n3 4', '1 2\n3 9', cmp);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/ligne 2/i);
	});
});

describe('compareOutputs — diff verbosity', () => {
	it('B19 — numeric diff includes expected, actual, gap, tolerance', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-3,
			eps_rel: 1e-3
		};
		const r = compareOutputs('1.41', '1.5', cmp);
		expect(r.passed).toBe(false);
		// Should contain both numbers, the gap (~0.09), and a tolerance hint
		expect(r.diff).toMatch(/1\.41/);
		expect(r.diff).toMatch(/1\.5/);
		expect(r.diff).toMatch(/écart/i);
		expect(r.diff).toMatch(/tolérance/i);
	});

	it('B8 — text diff mentions the mode that failed', () => {
		const cmp: TextComparison = {
			kind: 'text',
			whitespace: 'strict',
			case_insensitive: false
		};
		const r = compareOutputs('Bonjour', 'bonjour', cmp);
		expect(r.passed).toBe(false);
		expect(r.diff).toBeDefined();
	});
});

describe('compareOutputs — Python-realistic outputs', () => {
	it('handles repr of float with many decimals (within loose tolerance)', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-2,
			eps_rel: 1e-2
		};
		// |1.41 - 1.4142135...| ≈ 0.0042 < 0.01 → accepted
		expect(compareOutputs('1.41', '1.4142135623730951', cmp).passed).toBe(true);
	});

	it('rejects same case with tighter tolerance', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-3,
			eps_rel: 1e-3
		};
		// |1.41 - 1.4142135...| ≈ 0.0042 > 0.001 → rejected
		expect(compareOutputs('1.41', '1.4142135623730951', cmp).passed).toBe(false);
	});

	it('handles common Python print formatting (newlines)', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-9,
			eps_rel: 1e-9
		};
		// Python's print() adds a trailing \n
		expect(compareOutputs('42', '42\n', cmp).passed).toBe(true);
	});

	it('handles two values printed with default sep', () => {
		const cmp: NumericComparison = {
			kind: 'numeric',
			shape: 'flat',
			eps_abs: 1e-9,
			eps_rel: 1e-9
		};
		// Python: print(0.5403, 0.8415) → "0.5403 0.8415\n"
		expect(compareOutputs('0.5403 0.8415', '0.5403 0.8415\n', cmp).passed).toBe(true);
	});
});
