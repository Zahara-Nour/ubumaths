/**
 * Tests for the spreadsheet evaluator
 *
 * @module spreadsheet/__tests__/evaluator.test
 */

import { describe, it, expect } from 'vitest';
import {
	evaluateFormula,
	extractCellRefs,
	extractRangeRefs,
	isValidFormula,
	getFormulaDependencies
} from '../parser/evaluator';
import { parse } from '../parser/parser';
import type { ComputedValue } from '../types';
import type { CellValueGetter } from '../parser/evaluator';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a simple cell value getter from a map
 */
function makeCellGetter(cells: Record<string, ComputedValue>): CellValueGetter {
	return (ref: string) => cells[ref] ?? { type: 'empty' };
}

/**
 * Parse and evaluate a formula with the given cells
 */
function evalFormula(formula: string, cells: Record<string, ComputedValue> = {}): ComputedValue {
	return evaluateFormula(formula, makeCellGetter(cells));
}

/**
 * Assert that a result is a number with a specific value
 */
function expectNumber(result: ComputedValue, expected: number): void {
	expect(result.type).toBe('number');
	if (result.type === 'number') {
		expect(result.value).toBeCloseTo(expected, 10);
	}
}

/**
 * Assert that a result is an error with a specific code
 */
function expectError(result: ComputedValue, expectedCode: string): void {
	expect(result.type).toBe('error');
	if (result.type === 'error') {
		expect(result.code).toBe(expectedCode);
	}
}

// =============================================================================
// Literal Tests
// =============================================================================

describe('evaluator - literals', () => {
	it('evaluates number literals', () => {
		expectNumber(evalFormula('=42'), 42);
		expectNumber(evalFormula('=3.14'), 3.14);
		expectNumber(evalFormula('=0'), 0);
		expectNumber(evalFormula('=0.5'), 0.5);
	});

	it('evaluates string literals', () => {
		const result = evalFormula('="Hello"');
		expect(result.type).toBe('string');
		if (result.type === 'string') {
			expect(result.value).toBe('Hello');
		}
	});

	it('evaluates boolean literals', () => {
		let result = evalFormula('=TRUE');
		expect(result.type).toBe('boolean');
		if (result.type === 'boolean') {
			expect(result.value).toBe(true);
		}

		result = evalFormula('=FALSE');
		expect(result.type).toBe('boolean');
		if (result.type === 'boolean') {
			expect(result.value).toBe(false);
		}
	});

	it('evaluates French boolean literals', () => {
		let result = evalFormula('=VRAI');
		expect(result.type).toBe('boolean');
		if (result.type === 'boolean') {
			expect(result.value).toBe(true);
		}

		result = evalFormula('=FAUX');
		expect(result.type).toBe('boolean');
		if (result.type === 'boolean') {
			expect(result.value).toBe(false);
		}
	});
});

// =============================================================================
// Arithmetic Tests
// =============================================================================

describe('evaluator - arithmetic', () => {
	it('adds numbers', () => {
		expectNumber(evalFormula('=1+2'), 3);
		expectNumber(evalFormula('=10+20+30'), 60);
		expectNumber(evalFormula('=1.5+2.5'), 4);
	});

	it('subtracts numbers', () => {
		expectNumber(evalFormula('=10-3'), 7);
		expectNumber(evalFormula('=100-50-25'), 25);
		expectNumber(evalFormula('=5-10'), -5);
	});

	it('multiplies numbers', () => {
		expectNumber(evalFormula('=3*4'), 12);
		expectNumber(evalFormula('=2*3*4'), 24);
		expectNumber(evalFormula('=2.5*4'), 10);
	});

	it('divides numbers', () => {
		expectNumber(evalFormula('=10/2'), 5);
		expectNumber(evalFormula('=100/4'), 25);
		expectNumber(evalFormula('=7/2'), 3.5);
	});

	it('handles division by zero', () => {
		expectError(evalFormula('=10/0'), '#DIV/0!');
		expectError(evalFormula('=1/(2-2)'), '#DIV/0!');
	});

	it('handles exponentiation', () => {
		expectNumber(evalFormula('=2^3'), 8);
		expectNumber(evalFormula('=3^2'), 9);
		expectNumber(evalFormula('=4^0.5'), 2);
		expectNumber(evalFormula('=2^-1'), 0.5);
	});

	it('handles exponentiation errors', () => {
		expectError(evalFormula('=0^-1'), '#DIV/0!');
		expectError(evalFormula('=(-2)^0.5'), '#NUM!');
	});

	it('handles unary minus', () => {
		expectNumber(evalFormula('=-5'), -5);
		expectNumber(evalFormula('=--5'), 5);
		expectNumber(evalFormula('=-(3+2)'), -5);
	});

	it('handles unary plus', () => {
		expectNumber(evalFormula('=+5'), 5);
		expectNumber(evalFormula('=+(3+2)'), 5);
	});

	it('respects operator precedence', () => {
		expectNumber(evalFormula('=2+3*4'), 14);
		expectNumber(evalFormula('=2*3+4'), 10);
		expectNumber(evalFormula('=(2+3)*4'), 20);
		expectNumber(evalFormula('=2^3*2'), 16);
		expectNumber(evalFormula('=2*2^3'), 16);
	});

	it('handles right-associative exponentiation', () => {
		expectNumber(evalFormula('=2^3^2'), 512); // 2^(3^2) = 2^9 = 512
	});
});

// =============================================================================
// Comparison Tests
// =============================================================================

describe('evaluator - comparisons', () => {
	it('compares numbers with =', () => {
		let result = evalFormula('=5=5');
		expect(result).toEqual({ type: 'boolean', value: true });

		result = evalFormula('=5=6');
		expect(result).toEqual({ type: 'boolean', value: false });
	});

	it('compares numbers with <>', () => {
		let result = evalFormula('=5<>6');
		expect(result).toEqual({ type: 'boolean', value: true });

		result = evalFormula('=5<>5');
		expect(result).toEqual({ type: 'boolean', value: false });
	});

	it('compares numbers with <', () => {
		expect(evalFormula('=3<5')).toEqual({ type: 'boolean', value: true });
		expect(evalFormula('=5<3')).toEqual({ type: 'boolean', value: false });
		expect(evalFormula('=5<5')).toEqual({ type: 'boolean', value: false });
	});

	it('compares numbers with >', () => {
		expect(evalFormula('=5>3')).toEqual({ type: 'boolean', value: true });
		expect(evalFormula('=3>5')).toEqual({ type: 'boolean', value: false });
		expect(evalFormula('=5>5')).toEqual({ type: 'boolean', value: false });
	});

	it('compares numbers with <=', () => {
		expect(evalFormula('=3<=5')).toEqual({ type: 'boolean', value: true });
		expect(evalFormula('=5<=5')).toEqual({ type: 'boolean', value: true });
		expect(evalFormula('=6<=5')).toEqual({ type: 'boolean', value: false });
	});

	it('compares numbers with >=', () => {
		expect(evalFormula('=5>=3')).toEqual({ type: 'boolean', value: true });
		expect(evalFormula('=5>=5')).toEqual({ type: 'boolean', value: true });
		expect(evalFormula('=3>=5')).toEqual({ type: 'boolean', value: false });
	});

	it('compares strings (case-insensitive)', () => {
		expect(evalFormula('="abc"="ABC"')).toEqual({ type: 'boolean', value: true });
		expect(evalFormula('="abc"="def"')).toEqual({ type: 'boolean', value: false });
		expect(evalFormula('="abc"<"def"')).toEqual({ type: 'boolean', value: true });
	});
});

// =============================================================================
// Cell Reference Tests
// =============================================================================

describe('evaluator - cell references', () => {
	it('resolves cell values', () => {
		const cells = {
			A1: { type: 'number' as const, value: 10 },
			B1: { type: 'number' as const, value: 20 }
		};

		expectNumber(evalFormula('=A1', cells), 10);
		expectNumber(evalFormula('=B1', cells), 20);
		expectNumber(evalFormula('=A1+B1', cells), 30);
	});

	it('handles missing cells as empty', () => {
		const result = evalFormula('=A1');
		expect(result.type).toBe('empty');
	});

	it('treats empty cells as 0 in arithmetic', () => {
		expectNumber(evalFormula('=A1+5'), 5);
		expectNumber(evalFormula('=5-A1'), 5);
	});

	it('handles string cell values', () => {
		const cells = {
			A1: { type: 'string' as const, value: 'Hello' }
		};

		const result = evalFormula('=A1', cells);
		expect(result).toEqual({ type: 'string', value: 'Hello' });
	});

	it('propagates cell errors', () => {
		const cells = {
			A1: { type: 'error' as const, code: '#DIV/0!' as const, message: 'Division by zero' }
		};

		expectError(evalFormula('=A1+5', cells), '#DIV/0!');
	});
});

// =============================================================================
// Function Tests
// =============================================================================

describe('evaluator - functions', () => {
	it('evaluates SUM', () => {
		expectNumber(evalFormula('=SUM(1,2,3)'), 6);
		expectNumber(evalFormula('=SUM(10)'), 10);
		expectNumber(evalFormula('=SUM()'), 0);
	});

	it('evaluates SUM with cell references', () => {
		const cells = {
			A1: { type: 'number' as const, value: 10 },
			A2: { type: 'number' as const, value: 20 },
			A3: { type: 'number' as const, value: 30 }
		};

		expectNumber(evalFormula('=SUM(A1,A2,A3)', cells), 60);
	});

	it('evaluates SUM with range', () => {
		const cells = {
			A1: { type: 'number' as const, value: 1 },
			A2: { type: 'number' as const, value: 2 },
			A3: { type: 'number' as const, value: 3 }
		};

		expectNumber(evalFormula('=SUM(A1:A3)', cells), 6);
	});

	it('evaluates AVERAGE', () => {
		expectNumber(evalFormula('=AVERAGE(1,2,3)'), 2);
		expectNumber(evalFormula('=AVERAGE(10,20)'), 15);
	});

	it('evaluates IF', () => {
		expect(evalFormula('=IF(TRUE,1,2)')).toEqual({ type: 'number', value: 1 });
		expect(evalFormula('=IF(FALSE,1,2)')).toEqual({ type: 'number', value: 2 });
		expect(evalFormula('=IF(5>3,"yes","no")')).toEqual({ type: 'string', value: 'yes' });
	});

	it('evaluates nested functions', () => {
		expectNumber(evalFormula('=SUM(1,SUM(2,3),4)'), 10);
		expectNumber(evalFormula('=IF(SUM(1,2)>2,10,20)'), 10);
	});

	it('evaluates French function names', () => {
		expectNumber(evalFormula('=SOMME(1,2,3)'), 6);
		expectNumber(evalFormula('=MOYENNE(1,2,3)'), 2);
		expect(evalFormula('=SI(VRAI,1,2)')).toEqual({ type: 'number', value: 1 });
	});
});

// =============================================================================
// Error Propagation Tests
// =============================================================================

describe('evaluator - error propagation', () => {
	it('propagates errors through operations', () => {
		const cells = {
			A1: { type: 'error' as const, code: '#VALUE!' as const, message: 'Test error' }
		};

		expectError(evalFormula('=A1+5', cells), '#VALUE!');
		expectError(evalFormula('=5*A1', cells), '#VALUE!');
		expectError(evalFormula('=-A1', cells), '#VALUE!');
	});

	it('propagates errors through functions', () => {
		const cells = {
			A1: { type: 'error' as const, code: '#REF!' as const, message: 'Test error' }
		};

		expectError(evalFormula('=SUM(A1,5)', cells), '#REF!');
	});

	it('handles IFERROR', () => {
		expectNumber(evalFormula('=IFERROR(10/0,999)'), 999);
		expectNumber(evalFormula('=IFERROR(10/2,999)'), 5);

		const cells = {
			A1: { type: 'error' as const, code: '#VALUE!' as const, message: 'Test error' }
		};
		expectNumber(evalFormula('=IFERROR(A1,0)', cells), 0);
	});

	it('returns #VALUE! for type errors in arithmetic', () => {
		const cells = {
			A1: { type: 'string' as const, value: 'text' }
		};

		expectError(evalFormula('=A1+5', cells), '#VALUE!');
	});
});

// =============================================================================
// Dependency Extraction Tests
// =============================================================================

describe('evaluator - dependency extraction', () => {
	it('extracts cell references', () => {
		const parseResult = parse('=A1+B2*C3');
		expect(parseResult.success).toBe(true);
		if (parseResult.success) {
			const refs = extractCellRefs(parseResult.ast);
			expect(refs.sort()).toEqual(['A1', 'B2', 'C3']);
		}
	});

	it('extracts cell references from nested expressions', () => {
		const parseResult = parse('=IF(A1>B1,C1,D1)');
		expect(parseResult.success).toBe(true);
		if (parseResult.success) {
			const refs = extractCellRefs(parseResult.ast);
			expect(refs.sort()).toEqual(['A1', 'B1', 'C1', 'D1']);
		}
	});

	it('extracts cell references from ranges', () => {
		const parseResult = parse('=SUM(A1:A3)');
		expect(parseResult.success).toBe(true);
		if (parseResult.success) {
			const refs = extractCellRefs(parseResult.ast);
			expect(refs.sort()).toEqual(['A1', 'A2', 'A3']);
		}
	});

	it('extracts range references', () => {
		const parseResult = parse('=SUM(A1:A10)+AVERAGE(B1:B5)');
		expect(parseResult.success).toBe(true);
		if (parseResult.success) {
			const ranges = extractRangeRefs(parseResult.ast);
			expect(ranges).toHaveLength(2);
			expect(ranges[0]).toEqual({ start: 'A1', end: 'A10' });
			expect(ranges[1]).toEqual({ start: 'B1', end: 'B5' });
		}
	});

	it('returns empty array for literals', () => {
		const parseResult = parse('=42');
		expect(parseResult.success).toBe(true);
		if (parseResult.success) {
			const refs = extractCellRefs(parseResult.ast);
			expect(refs).toEqual([]);
		}
	});
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('evaluator - utility functions', () => {
	it('isValidFormula returns true for valid formulas', () => {
		expect(isValidFormula('=A1+B1')).toBe(true);
		expect(isValidFormula('=SUM(A1:A10)')).toBe(true);
		expect(isValidFormula('=IF(A1>0,1,0)')).toBe(true);
	});

	it('isValidFormula returns false for invalid formulas', () => {
		expect(isValidFormula('=A1+')).toBe(false);
		expect(isValidFormula('=SUM(')).toBe(false);
		expect(isValidFormula('=UNKNOWN()')).toBe(false);
	});

	it('getFormulaDependencies returns cell references', () => {
		expect(getFormulaDependencies('=A1+B1').sort()).toEqual(['A1', 'B1']);
		expect(getFormulaDependencies('=SUM(A1:A3)').sort()).toEqual(['A1', 'A2', 'A3']);
	});

	it('getFormulaDependencies returns empty array for invalid formula', () => {
		expect(getFormulaDependencies('=A1+')).toEqual([]);
	});
});

// =============================================================================
// Complex Formula Tests
// =============================================================================

describe('evaluator - complex formulas', () => {
	it('evaluates complex nested formula', () => {
		const cells = {
			A1: { type: 'number' as const, value: 10 },
			A2: { type: 'number' as const, value: 20 },
			A3: { type: 'number' as const, value: 30 },
			B1: { type: 'number' as const, value: 5 }
		};

		// (SUM(A1:A3) + B1) * 2 = (60 + 5) * 2 = 130
		expectNumber(evalFormula('=(SUM(A1:A3)+B1)*2', cells), 130);
	});

	it('evaluates conditional sum', () => {
		const cells = {
			A1: { type: 'number' as const, value: 100 },
			B1: { type: 'boolean' as const, value: true }
		};

		// IF(B1, A1*1.1, A1*0.9) = 110
		expectNumber(evalFormula('=IF(B1,A1*1.1,A1*0.9)', cells), 110);
	});

	it('evaluates multiple ranges', () => {
		const cells = {
			A1: { type: 'number' as const, value: 1 },
			A2: { type: 'number' as const, value: 2 },
			B1: { type: 'number' as const, value: 3 },
			B2: { type: 'number' as const, value: 4 }
		};

		// SUM(A1:A2) + SUM(B1:B2) = 3 + 7 = 10
		expectNumber(evalFormula('=SUM(A1:A2)+SUM(B1:B2)', cells), 10);
	});
});
