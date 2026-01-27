/**
 * Unit tests for Form Verification
 *
 * Tests the verifyForm, matchesForm, and extractBindings functions
 * for checking student answers against expected mathematical forms.
 */

import { describe, it, expect } from 'vitest';
import { verifyForm, matchesForm, extractBindings } from '../verify';

// =============================================================================
// verifyForm Tests
// =============================================================================

describe('verifyForm', () => {
	describe('linear form: _a * x + _b', () => {
		const pattern = '_a * x + _b';

		it('matches 2x + 3', () => {
			const result = verifyForm('2x + 3', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.a).toBe('2');
				expect(result.bindings.b).toBe('3');
			}
		});

		it('matches 5x + 0', () => {
			const result = verifyForm('5x + 0', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.a).toBe('5');
				expect(result.bindings.b).toBe('0');
			}
		});

		it('does not match x^2 + 1', () => {
			const result = verifyForm('x^2 + 1', pattern);

			expect(result.matches).toBe(false);
		});

		it('does not match 2x - 3 (subtraction)', () => {
			const result = verifyForm('2x - 3', pattern);

			expect(result.matches).toBe(false);
		});
	});

	describe('product of sums: (_a + _b) * (_c + _d)', () => {
		const pattern = '(_a + _b) * (_c + _d)';

		it('matches (x+1)(x+2)', () => {
			const result = verifyForm('(x+1)(x+2)', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.a).toBe('x');
				expect(result.bindings.b).toBe('1');
				expect(result.bindings.c).toBe('x');
				expect(result.bindings.d).toBe('2');
			}
		});

		it('matches (a+b)(c+d)', () => {
			const result = verifyForm('(a+b)(c+d)', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.a).toBe('a');
				expect(result.bindings.b).toBe('b');
				expect(result.bindings.c).toBe('c');
				expect(result.bindings.d).toBe('d');
			}
		});

		it('does not match x^2 + 3x + 2', () => {
			const result = verifyForm('x^2 + 3x + 2', pattern);

			expect(result.matches).toBe(false);
		});
	});

	describe('fraction: _num / _den', () => {
		const pattern = '_num / _den';

		it('matches (x+1)/2', () => {
			const result = verifyForm('\\frac{x+1}{2}', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.num).toBe('x + 1');
				expect(result.bindings.den).toBe('2');
			}
		});

		it('matches 1/x', () => {
			const result = verifyForm('\\frac{1}{x}', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.num).toBe('1');
				expect(result.bindings.den).toBe('x');
			}
		});
	});

	describe('power with integer exponent: _base ^ _n:integer', () => {
		const pattern = '_base ^ _n:integer';

		it('matches x^2', () => {
			const result = verifyForm('x^2', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.base).toBe('x');
				expect(result.bindings.n).toBe('2');
			}
		});

		it('matches (a+b)^3', () => {
			const result = verifyForm('(a+b)^3', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.n).toBe('3');
			}
		});

		it('does not match x^{1.5} (non-integer)', () => {
			const result = verifyForm('x^{1.5}', pattern);

			expect(result.matches).toBe(false);
		});

		it('does not match x^y (variable exponent)', () => {
			const result = verifyForm('x^y', pattern);

			expect(result.matches).toBe(false);
		});
	});

	describe('number constraint: _n:number', () => {
		const pattern = '_n:number';

		it('matches 42', () => {
			const result = verifyForm('42', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.n).toBe('42');
			}
		});

		it('matches 3.14', () => {
			const result = verifyForm('3.14', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.n).toBe('3.14');
			}
		});

		it('does not match x (variable)', () => {
			const result = verifyForm('x', pattern);

			expect(result.matches).toBe(false);
		});

		it('does not match x + 1 (expression)', () => {
			const result = verifyForm('x + 1', pattern);

			expect(result.matches).toBe(false);
		});
	});

	describe('variable constraint: _v:variable', () => {
		const pattern = '_v:variable';

		it('matches x', () => {
			const result = verifyForm('x', pattern);

			expect(result.matches).toBe(true);
			if (result.matches) {
				expect(result.bindings.v).toBe('x');
			}
		});

		it('does not match 42 (number)', () => {
			const result = verifyForm('42', pattern);

			expect(result.matches).toBe(false);
		});
	});

	describe('positive constraint: _n:positive', () => {
		const pattern = '_n:positive';

		it('matches 5', () => {
			const result = verifyForm('5', pattern);

			expect(result.matches).toBe(true);
		});

		it('does not match -5', () => {
			const result = verifyForm('-5', pattern);

			expect(result.matches).toBe(false);
		});

		it('does not match 0', () => {
			const result = verifyForm('0', pattern);

			expect(result.matches).toBe(false);
		});
	});

	describe('wildcard without constraint: _x', () => {
		const pattern = '_x';

		it('matches any number', () => {
			expect(verifyForm('42', pattern).matches).toBe(true);
		});

		it('matches any variable', () => {
			expect(verifyForm('x', pattern).matches).toBe(true);
		});

		it('matches any expression', () => {
			expect(verifyForm('x + 1', pattern).matches).toBe(true);
		});
	});

	describe('error handling', () => {
		it('returns error for invalid pattern', () => {
			const result = verifyForm('x', '_x +');

			expect(result.matches).toBe(false);
			if (!result.matches) {
				expect(result.error).toContain('Invalid pattern');
			}
		});

		it('returns no error for valid but non-matching', () => {
			const result = verifyForm('x', '_n:number');

			expect(result.matches).toBe(false);
			if (!result.matches) {
				expect(result.error).toBeUndefined();
			}
		});
	});

	describe('rawBindings', () => {
		it('provides MathNode bindings', () => {
			const result = verifyForm('2x + 3', '_a * x + _b');

			expect(result.matches).toBe(true);
			if (result.matches) {
				const a = result.rawBindings.get('a');
				expect(a).toBeDefined();
				if (a && 'type' in a) {
					expect(a.type).toBe('number');
					expect((a as { value: string }).value).toBe('2');
				}
			}
		});
	});
});

// =============================================================================
// matchesForm Tests
// =============================================================================

describe('matchesForm', () => {
	it('returns true for matching form', () => {
		expect(matchesForm('2x + 3', '_a * x + _b')).toBe(true);
	});

	it('returns false for non-matching form', () => {
		expect(matchesForm('x^2', '_a * x + _b')).toBe(false);
	});

	it('returns false for invalid pattern', () => {
		expect(matchesForm('x', '_x +')).toBe(false);
	});
});

// =============================================================================
// extractBindings Tests
// =============================================================================

describe('extractBindings', () => {
	it('returns bindings for matching form', () => {
		const bindings = extractBindings('2x + 3', '_a * x + _b');

		expect(bindings).not.toBeNull();
		expect(bindings?.a).toBe('2');
		expect(bindings?.b).toBe('3');
	});

	it('returns null for non-matching form', () => {
		const bindings = extractBindings('x^2', '_a * x + _b');

		expect(bindings).toBeNull();
	});

	it('returns null for invalid pattern', () => {
		const bindings = extractBindings('x', '_x +');

		expect(bindings).toBeNull();
	});
});

// =============================================================================
// Real-world Exercise Patterns
// =============================================================================

describe('real-world exercise patterns', () => {
	it('quadratic form: _a * x^2 + _b * x + _c', () => {
		const pattern = '_a * x^2 + _b * x + _c';
		const result = verifyForm('2x^2 + 3x + 1', pattern);

		expect(result.matches).toBe(true);
		if (result.matches) {
			expect(result.bindings.a).toBe('2');
			expect(result.bindings.b).toBe('3');
			expect(result.bindings.c).toBe('1');
		}
	});

	it('simple power: _x ^ 2', () => {
		const result = verifyForm('x^2', '_x ^ 2');

		expect(result.matches).toBe(true);
		if (result.matches) {
			expect(result.bindings.x).toBe('x');
		}
	});

	it('sine function: sin(_x)', () => {
		const result = verifyForm('\\sin(x)', 'sin(_x)');

		expect(result.matches).toBe(true);
		if (result.matches) {
			expect(result.bindings.x).toBe('x');
		}
	});

	it('negation: -_x', () => {
		const result = verifyForm('-5', '-_x');

		expect(result.matches).toBe(true);
		if (result.matches) {
			expect(result.bindings.x).toBe('5');
		}
	});
});
