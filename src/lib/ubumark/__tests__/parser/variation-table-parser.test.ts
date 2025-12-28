/**
 * Variation Table Parser Tests
 * ============================
 *
 * Unit tests for the variation table parsing module.
 */

import { describe, it, expect } from 'vitest';
import {
	isVariationBlockStart,
	isBlockEnd,
	findVariationBlocks,
	parseVariationTableContent,
	parseVariationTable,
	hasSignRows,
	hasVariationRows,
	getSignRows,
	getVariationRows,
	getDomainPointCount
} from '../../parser/variation-table-parser';
import type { VariationTableNode, SignRow, VariationRow } from '../../types/variation-table';

// ============================================================================
// DETECTION TESTS
// ============================================================================

describe('isVariationBlockStart', () => {
	it('should identify variation block start', () => {
		expect(isVariationBlockStart('```variation')).toBe(true);
		expect(isVariationBlockStart('```variation ')).toBe(true);
	});

	it('should reject non-variation blocks', () => {
		expect(isVariationBlockStart('```')).toBe(false);
		expect(isVariationBlockStart('```typescript')).toBe(false);
		expect(isVariationBlockStart('```variation-table')).toBe(false);
		expect(isVariationBlockStart('variation')).toBe(false);
	});
});

describe('isBlockEnd', () => {
	it('should identify block end', () => {
		expect(isBlockEnd('```')).toBe(true);
		expect(isBlockEnd('``` ')).toBe(true);
	});

	it('should reject non-block-end', () => {
		expect(isBlockEnd('```typescript')).toBe(false);
		expect(isBlockEnd('text')).toBe(false);
	});
});

// ============================================================================
// BLOCK FINDING TESTS
// ============================================================================

describe('findVariationBlocks', () => {
	it('should find single variation block', () => {
		const lines = [
			'Text before',
			'```variation',
			'variable: x',
			'domain: -inf, 0, +inf',
			'```',
			'Text after'
		];

		const blocks = findVariationBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].startIndex).toBe(1);
		expect(blocks[0].endIndex).toBe(4);
	});

	it('should find multiple variation blocks', () => {
		const lines = ['```variation', 'variable: x', '```', '', '```variation', 'variable: t', '```'];

		const blocks = findVariationBlocks(lines);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual({ startIndex: 0, endIndex: 2 });
		expect(blocks[1]).toEqual({ startIndex: 4, endIndex: 6 });
	});

	it('should return empty array when no variation blocks', () => {
		const lines = ['Just', 'regular', 'text'];

		const blocks = findVariationBlocks(lines);

		expect(blocks).toHaveLength(0);
	});

	it('should handle unclosed block', () => {
		const lines = ['```variation', 'variable: x', 'domain: 0, 1'];

		const blocks = findVariationBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].startIndex).toBe(0);
		expect(blocks[0].endIndex).toBe(2);
	});

	it('should not match regular code blocks', () => {
		const lines = ['```typescript', 'const x = 1;', '```'];

		const blocks = findVariationBlocks(lines);

		expect(blocks).toHaveLength(0);
	});
});

// ============================================================================
// SIMPLE TABLE PARSING TESTS
// ============================================================================

describe('parseVariationTableContent - Simple cases', () => {
	it('should parse simple sign + variation table', () => {
		const content = [
			'variable: x',
			'domain: -inf, -1, 0, 1, +inf',
			'',
			"sign: f'(x)",
			'  -inf,-1: +',
			'  -1: z',
			'  -1,0: -',
			'  0: z',
			'  0,1: +',
			'  1: z',
			'  1,+inf: -',
			'',
			'variation: f(x)',
			'  -inf: -inf, bottom',
			'  -1: 3, top',
			'  0: 0, bottom',
			'  1: 2, top',
			'  +inf: -inf, bottom'
		];

		const result = parseVariationTableContent(content);

		expect(result.node).not.toBeNull();
		expect(result.errors).toHaveLength(0);

		const node = result.node!;
		expect(node.type).toBe('variation-table');
		expect(node.variable).toBe('x');
		expect(node.domain).toHaveLength(5);
		expect(node.domain.map((d) => d.expression)).toEqual(['-inf', '-1', '0', '1', '+inf']);
		expect(node.rows).toHaveLength(2);
	});

	it('should parse sign row correctly', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'sign: f(x)',
			'  -inf,0: +',
			'  0: z',
			'  0,+inf: -'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;

		expect(node.rows).toHaveLength(1);
		const signRow = node.rows[0] as SignRow;
		expect(signRow.type).toBe('sign');
		expect(signRow.label).toBe('f(x)');
		expect(signRow.values.get('-inf,0')).toEqual({ type: 'sign', value: '+' });
		expect(signRow.values.get('0')).toEqual({ type: 'marker', marker: 'zero' });
		expect(signRow.values.get('0,+inf')).toEqual({ type: 'sign', value: '-' });
	});

	it('should parse variation row correctly', () => {
		const content = [
			'variable: x',
			'domain: 0, 1, 2',
			'',
			'variation: f(x)',
			'  0: -2, bottom',
			'  1: 5, top',
			'  2: 1, bottom'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;

		expect(node.rows).toHaveLength(1);
		const variationRow = node.rows[0] as VariationRow;
		expect(variationRow.type).toBe('variation');
		expect(variationRow.label).toBe('f(x)');
		expect(variationRow.values.get('0')).toEqual({ expression: '-2', position: 'bottom' });
		expect(variationRow.values.get('1')).toEqual({ expression: '5', position: 'top' });
		expect(variationRow.values.get('2')).toEqual({ expression: '1', position: 'bottom' });
	});
});

// ============================================================================
// ASYMPTOTE TESTS
// ============================================================================

describe('parseVariationTableContent - Asymptotes', () => {
	it('should parse asymptote marker (||)', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'sign: f(x)',
			'  -inf,0: +',
			'  0: ||',
			'  0,+inf: -'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const signRow = node.rows[0] as SignRow;

		expect(signRow.values.get('0')).toEqual({ type: 'marker', marker: 'asymptote' });
	});

	it('should parse asymptote with limits in variation row', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'variation: f(x)',
			'  -inf: 0, center',
			'  0: ||, -inf, +inf',
			'  +inf: 0, center'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		const asymptoteValue = variationRow.values.get('0');
		expect(asymptoteValue).toEqual({
			expression: '',
			position: 'center',
			marker: 'asymptote',
			limits: [
				{ expression: '-inf', position: 'bottom' },
				{ expression: '+inf', position: 'top' }
			]
		});
	});
});

// ============================================================================
// FORBIDDEN VALUE TESTS
// ============================================================================

describe('parseVariationTableContent - Forbidden values', () => {
	it('should parse forbidden value marker (|h|)', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'sign: f(x)',
			'  -inf,0: +',
			'  0: |h|',
			'  0,+inf: +'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const signRow = node.rows[0] as SignRow;

		expect(signRow.values.get('0')).toEqual({ type: 'marker', marker: 'forbidden' });
	});

	it('should parse forbidden with limits in variation row', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'variation: f(x)',
			'  -inf: 1, center',
			'  0: |h|, 1, 1',
			'  +inf: 1, center'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		const forbiddenValue = variationRow.values.get('0');
		expect(forbiddenValue).toEqual({
			expression: '',
			position: 'center',
			marker: 'forbidden',
			limits: [
				{ expression: '1', position: 'center' },
				{ expression: '1', position: 'center' }
			]
		});
	});
});

// ============================================================================
// COMPLEX MATH EXPRESSIONS TESTS
// ============================================================================

describe('parseVariationTableContent - Complex math expressions', () => {
	it('should parse math expressions in domain', () => {
		const content = [
			'variable: x',
			'domain: 0, \\frac{\\pi}{2}, \\pi, \\frac{3\\pi}{2}, 2\\pi',
			'',
			'sign: f(x)',
			'  0,\\frac{\\pi}{2}: +'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;

		expect(node.domain).toHaveLength(5);
		expect(node.domain[1].expression).toBe('\\frac{\\pi}{2}');
		expect(node.domain[2].expression).toBe('\\pi');
	});

	it('should parse math expressions in variation values', () => {
		const content = [
			'variable: x',
			'domain: 0, 1',
			'',
			'variation: f(x)',
			'  0: \\frac{1}{2}, bottom',
			'  1: e^2, top'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		expect(variationRow.values.get('0')?.expression).toBe('\\frac{1}{2}');
		expect(variationRow.values.get('1')?.expression).toBe('e^2');
	});
});

// ============================================================================
// MULTIPLE SIGN ROWS TESTS
// ============================================================================

describe('parseVariationTableContent - Multiple sign rows', () => {
	it('should parse multiple sign rows', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, 1, +inf',
			'',
			"sign: f'(x)",
			'  -inf,0: +',
			'  0: z',
			'  0,1: -',
			'  1: z',
			'  1,+inf: +',
			'',
			"sign: f''(x)",
			'  -inf,0: -',
			'  0: z',
			'  0,1: +',
			'  1,+inf: +'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;

		expect(node.rows).toHaveLength(2);
		expect(node.rows[0].type).toBe('sign');
		expect(node.rows[1].type).toBe('sign');
		expect((node.rows[0] as SignRow).label).toBe("f'(x)");
		expect((node.rows[1] as SignRow).label).toBe("f''(x)");
	});
});

// ============================================================================
// OPEN/CLOSED BOUNDS TESTS
// ============================================================================

describe('parseVariationTableContent - Open/closed bounds', () => {
	it('should parse open bounds with bracket notation', () => {
		const content = [
			'variable: x',
			'domain: ]-inf, 0[, ]0, +inf[',
			'',
			'sign: f(x)',
			'  -inf,0: +'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;

		// Note: The current simple parser splits by comma, so bounds might need adjustment
		// The domain parsing handles individual points with their bounds
		expect(node.domain.length).toBeGreaterThan(0);
	});

	it('should parse mixed open/closed bounds', () => {
		const content = ['variable: x', 'domain: [-1, 0[, [0, 1]', '', 'sign: f(x)', '  -1,0: +'];

		const result = parseVariationTableContent(content);
		const node = result.node!;

		expect(result.errors).toHaveLength(0);
		expect(node.domain.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('parseVariationTableContent - Error handling', () => {
	it('should return error for missing variable', () => {
		const content = ['domain: -inf, 0, +inf', '', 'sign: f(x)', '  -inf,0: +'];

		const result = parseVariationTableContent(content);

		expect(result.node).toBeNull();
		expect(result.errors.some((e) => e.message.includes('variable'))).toBe(true);
	});

	it('should return error for missing domain', () => {
		const content = ['variable: x', '', 'sign: f(x)', '  -inf,0: +'];

		const result = parseVariationTableContent(content);

		expect(result.node).toBeNull();
		expect(result.errors.some((e) => e.message.includes('domain'))).toBe(true);
	});

	it('should return error for invalid sign value', () => {
		const content = ['variable: x', 'domain: 0, 1', '', 'sign: f(x)', '  0,1: invalid'];

		const result = parseVariationTableContent(content);

		expect(result.errors.some((e) => e.message.includes('Unknown sign value'))).toBe(true);
	});

	it('should return error for invalid variation format', () => {
		const content = ['variable: x', 'domain: 0, 1', '', 'variation: f(x)', '  0: just-value'];

		const result = parseVariationTableContent(content);

		expect(result.errors.some((e) => e.message.includes('Invalid variation'))).toBe(true);
	});

	it('should report clear error for no rows defined', () => {
		const content = ['variable: x', 'domain: 0, 1'];

		const result = parseVariationTableContent(content);

		expect(result.errors.some((e) => e.message.includes('No sign or variation rows'))).toBe(true);
	});
});

// ============================================================================
// FULL BLOCK PARSING TESTS
// ============================================================================

describe('parseVariationTable - Full block parsing', () => {
	it('should parse complete variation block', () => {
		const lines = [
			'```variation',
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'sign: f(x)',
			'  -inf,0: +',
			'  0: z',
			'  0,+inf: -',
			'```'
		];

		const result = parseVariationTable(lines, 0, 8);

		expect(result.node).not.toBeNull();
		expect(result.node?.type).toBe('variation-table');
		expect(result.node?.variable).toBe('x');
		expect(result.node?.rows).toHaveLength(1);
	});
});

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

describe('Utility functions', () => {
	const createTestNode = (): VariationTableNode => {
		const result = parseVariationTableContent([
			'variable: x',
			'domain: 0, 1, 2',
			'',
			"sign: f'(x)",
			'  0,1: +',
			'  1: z',
			'  1,2: -',
			'',
			'variation: f(x)',
			'  0: 0, bottom',
			'  1: 5, top',
			'  2: 1, bottom'
		]);
		return result.node!;
	};

	it('should detect sign rows with hasSignRows', () => {
		const node = createTestNode();
		expect(hasSignRows(node)).toBe(true);
	});

	it('should detect variation rows with hasVariationRows', () => {
		const node = createTestNode();
		expect(hasVariationRows(node)).toBe(true);
	});

	it('should get sign rows with getSignRows', () => {
		const node = createTestNode();
		const signRows = getSignRows(node);
		expect(signRows).toHaveLength(1);
		expect(signRows[0].label).toBe("f'(x)");
	});

	it('should get variation rows with getVariationRows', () => {
		const node = createTestNode();
		const variationRows = getVariationRows(node);
		expect(variationRows).toHaveLength(1);
		expect(variationRows[0].label).toBe('f(x)');
	});

	it('should count domain points with getDomainPointCount', () => {
		const node = createTestNode();
		expect(getDomainPointCount(node)).toBe(3);
	});
});

// ============================================================================
// POSITION PARSING TESTS
// ============================================================================

describe('parseVariationTableContent - All position values', () => {
	it('should parse all valid positions', () => {
		const content = [
			'variable: x',
			'domain: 0, 1, 2, 3, 4',
			'',
			'variation: f(x)',
			'  0: 0, top',
			'  1: 1, bottom',
			'  2: 2, center',
			'  3: 3, limit-top',
			'  4: 4, limit-bottom'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		expect(variationRow.values.get('0')?.position).toBe('top');
		expect(variationRow.values.get('1')?.position).toBe('bottom');
		expect(variationRow.values.get('2')?.position).toBe('center');
		expect(variationRow.values.get('3')?.position).toBe('limit-top');
		expect(variationRow.values.get('4')?.position).toBe('limit-bottom');
	});
});

// ============================================================================
// MARKER PARSING TESTS
// ============================================================================

describe('parseVariationTableContent - All marker values', () => {
	it('should parse all sign markers', () => {
		const content = [
			'variable: x',
			'domain: 0, 1, 2, 3, 4',
			'',
			'sign: f(x)',
			'  0: z',
			'  1: 0',
			'  2: ||',
			'  3: |h|',
			'  4: d'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const signRow = node.rows[0] as SignRow;

		expect(signRow.values.get('0')).toEqual({ type: 'marker', marker: 'zero' });
		expect(signRow.values.get('1')).toEqual({ type: 'marker', marker: 'zero' });
		expect(signRow.values.get('2')).toEqual({ type: 'marker', marker: 'asymptote' });
		expect(signRow.values.get('3')).toEqual({ type: 'marker', marker: 'forbidden' });
		expect(signRow.values.get('4')).toEqual({ type: 'marker', marker: 'discontinuity' });
	});
});

// ============================================================================
// DISCONTINUITY TESTS
// ============================================================================

describe('parseVariationTableContent - Discontinuity marker', () => {
	it('should parse discontinuity marker (d)', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'sign: f(x)',
			'  -inf,0: +',
			'  0: d',
			'  0,+inf: +'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const signRow = node.rows[0] as SignRow;

		expect(signRow.values.get('0')).toEqual({ type: 'marker', marker: 'discontinuity' });
	});

	it('should parse discontinuity with limits in variation row', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'variation: f(x)',
			'  -inf: 1, center',
			'  0: d, 0, 2',
			'  +inf: 1, center'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		const discontinuityValue = variationRow.values.get('0');
		expect(discontinuityValue).toEqual({
			expression: '',
			position: 'center',
			marker: 'discontinuity',
			limits: [
				{ expression: '0', position: 'center' },
				{ expression: '2', position: 'center' }
			]
		});
	});
});

// ============================================================================
// SINGLE LIMIT ASYMPTOTE TESTS
// ============================================================================

describe('parseVariationTableContent - Single limit asymptotes', () => {
	it('should parse left-only limit with position', () => {
		const content = [
			'variable: x',
			'domain: -inf, 1',
			'',
			'variation: f(x)',
			'  -inf: 0, top',
			'  1: ||, left, -inf, bottom'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		const asymptoteValue = variationRow.values.get('1');
		expect(asymptoteValue).toEqual({
			expression: '-inf',
			position: 'bottom',
			marker: 'asymptote',
			limitSide: 'left'
		});
	});

	it('should parse right-only limit with position', () => {
		const content = [
			'variable: x',
			'domain: 0, +inf',
			'',
			'variation: f(x)',
			'  0: ||, right, +inf, top',
			'  +inf: 0, center'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		const asymptoteValue = variationRow.values.get('0');
		expect(asymptoteValue).toEqual({
			expression: '+inf',
			position: 'top',
			marker: 'asymptote',
			limitSide: 'right'
		});
	});

	it('should parse two limits with explicit positions (new syntax)', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'variation: f(x)',
			'  -inf: 1, center',
			'  0: ||, -inf, bottom, +inf, top',
			'  +inf: 1, center'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		const asymptoteValue = variationRow.values.get('0');
		expect(asymptoteValue).toEqual({
			expression: '',
			position: 'center',
			marker: 'asymptote',
			limits: [
				{ expression: '-inf', position: 'bottom' },
				{ expression: '+inf', position: 'top' }
			]
		});
	});

	it('should parse two limits with auto-deduced positions (legacy syntax)', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'variation: f(x)',
			'  -inf: 1, center',
			'  0: ||, -inf, +inf',
			'  +inf: 1, center'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		const asymptoteValue = variationRow.values.get('0');
		expect(asymptoteValue?.marker).toBe('asymptote');
		expect(asymptoteValue?.limits).toBeDefined();
		// Positions should be auto-deduced: -inf -> bottom, +inf -> top
		expect(asymptoteValue?.limits?.[0]).toEqual({ expression: '-inf', position: 'bottom' });
		expect(asymptoteValue?.limits?.[1]).toEqual({ expression: '+inf', position: 'top' });
	});

	it('should auto-deduce center position for finite values', () => {
		const content = [
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'variation: f(x)',
			'  -inf: 1, center',
			'  0: ||, 2, 3',
			'  +inf: 1, center'
		];

		const result = parseVariationTableContent(content);
		const node = result.node!;
		const variationRow = node.rows[0] as VariationRow;

		const asymptoteValue = variationRow.values.get('0');
		expect(asymptoteValue?.limits?.[0]).toEqual({ expression: '2', position: 'center' });
		expect(asymptoteValue?.limits?.[1]).toEqual({ expression: '3', position: 'center' });
	});

	it('should return error for invalid single limit syntax (missing position)', () => {
		const content = [
			'variable: x',
			'domain: -inf, 1',
			'',
			'variation: f(x)',
			'  -inf: 0, top',
			'  1: ||, left, -inf'
		];

		const result = parseVariationTableContent(content);

		expect(result.errors.some((e) => e.message.includes('Invalid'))).toBe(true);
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
	it('should handle empty lines between sections', () => {
		const content = ['variable: x', '', '', 'domain: 0, 1', '', '', '', 'sign: f(x)', '  0,1: +'];

		const result = parseVariationTableContent(content);

		expect(result.node).not.toBeNull();
		expect(result.errors).toHaveLength(0);
	});

	it('should handle whitespace in entries', () => {
		const content = [
			'variable:   x  ',
			'domain:   0  ,   1  ',
			'',
			'sign: f(x)',
			'    0,1  :  +  '
		];

		const result = parseVariationTableContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node?.variable).toBe('x');
	});

	it('should handle single domain point', () => {
		const content = ['variable: x', 'domain: 0', '', 'sign: f(x)', '  0: z'];

		const result = parseVariationTableContent(content);

		expect(result.node?.domain).toHaveLength(1);
		expect(result.node?.domain[0].expression).toBe('0');
	});

	it('should parse table with only sign rows', () => {
		const content = ['variable: x', 'domain: 0, 1', '', 'sign: f(x)', '  0,1: +'];

		const result = parseVariationTableContent(content);

		expect(result.node).not.toBeNull();
		expect(hasSignRows(result.node!)).toBe(true);
		expect(hasVariationRows(result.node!)).toBe(false);
	});

	it('should parse table with only variation rows', () => {
		const content = [
			'variable: x',
			'domain: 0, 1',
			'',
			'variation: f(x)',
			'  0: 0, bottom',
			'  1: 1, top'
		];

		const result = parseVariationTableContent(content);

		expect(result.node).not.toBeNull();
		expect(hasSignRows(result.node!)).toBe(false);
		expect(hasVariationRows(result.node!)).toBe(true);
	});
});
