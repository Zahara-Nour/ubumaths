/**
 * Tests for boolean evaluation
 * Covers: relation evaluation, logical operators, boolean literals
 */

import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import {
	boolean,
	logicalAnd,
	logicalOr,
	logicalNot,
	number,
	variable,
	equals,
	lessThan,
	greaterThan,
	lessThanOrEqual,
	greaterThanOrEqual,
	notEquals,
	sqrt
} from '../../factory';

// =============================================================================
// Boolean Literal Evaluation
// =============================================================================

describe('Boolean literal evaluation', () => {
	it('true evaluates to true', () => {
		const result = evaluate(boolean(true));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
			expect(result.node.type).toBe('boolean');
			expect(result.exact).toBe(true);
		}
	});

	it('false evaluates to false', () => {
		const result = evaluate(boolean(false));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(false);
		}
	});
});

// =============================================================================
// Relation Evaluation
// =============================================================================

describe('Relation evaluation', () => {
	it('3 < 5 evaluates to true', () => {
		const result = evaluate(lessThan(number('3'), number('5')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('5 < 3 evaluates to false', () => {
		const result = evaluate(lessThan(number('5'), number('3')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(false);
		}
	});

	it('2 = 2 evaluates to true', () => {
		const result = evaluate(equals(number('2'), number('2')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('2 = 3 evaluates to false', () => {
		const result = evaluate(equals(number('2'), number('3')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(false);
		}
	});

	it('2 != 3 evaluates to true', () => {
		const result = evaluate(notEquals(number('2'), number('3')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('5 > 3 evaluates to true', () => {
		const result = evaluate(greaterThan(number('5'), number('3')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('3 <= 5 evaluates to true', () => {
		const result = evaluate(lessThanOrEqual(number('3'), number('5')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('5 <= 5 evaluates to true', () => {
		const result = evaluate(lessThanOrEqual(number('5'), number('5')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('5 >= 3 evaluates to true', () => {
		const result = evaluate(greaterThanOrEqual(number('5'), number('3')));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('sqrt(2) = sqrt(2) evaluates to true (exact via normalization)', () => {
		const result = evaluate(equals(sqrt(number('2')), sqrt(number('2'))));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('x < 5 (with variable) is unevaluable', () => {
		const result = evaluate(lessThan(variable('x'), number('5')));
		expect(result.status).toBe('unevaluable');
	});
});

// =============================================================================
// Logical Evaluation
// =============================================================================

describe('Logical evaluation', () => {
	it('true && true evaluates to true', () => {
		const result = evaluate(logicalAnd(boolean(true), boolean(true)));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('true && false evaluates to false', () => {
		const result = evaluate(logicalAnd(boolean(true), boolean(false)));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(false);
		}
	});

	it('true || false evaluates to true', () => {
		const result = evaluate(logicalOr(boolean(true), boolean(false)));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('false || false evaluates to false', () => {
		const result = evaluate(logicalOr(boolean(false), boolean(false)));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(false);
		}
	});

	it('!true evaluates to false', () => {
		const result = evaluate(logicalNot(boolean(true)));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(false);
		}
	});

	it('!false evaluates to true', () => {
		const result = evaluate(logicalNot(boolean(false)));
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('(3 < 5) && (2 = 2) evaluates to true', () => {
		const node = logicalAnd(lessThan(number('3'), number('5')), equals(number('2'), number('2')));
		const result = evaluate(node);
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(true);
		}
	});

	it('!(3 < 5) evaluates to false', () => {
		const node = logicalNot(lessThan(number('3'), number('5')));
		const result = evaluate(node);
		expect(result.status).toBe('value');
		if (result.status === 'value') {
			expect(result.value).toBe(false);
		}
	});
});
