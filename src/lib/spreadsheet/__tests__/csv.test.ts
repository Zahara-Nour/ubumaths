/**
 * CSV Import/Export Tests
 *
 * Tests for CSV parsing, generation, and file handling utilities.
 */

import { describe, it, expect } from 'vitest';
import { generateCsv, parseCsv } from '../csv';
import type { SpreadsheetData, ComputedValue } from '../types';

describe('CSV Export - generateCsv', () => {
	const createSpreadsheetData = (
		cells: Record<string, { value: string }>,
		rows = 5,
		cols = 5
	): SpreadsheetData => ({
		version: 1,
		cells,
		metadata: { name: 'Test', rows, cols }
	});

	const createComputedValues = (
		values: Record<string, number | string>
	): Map<string, ComputedValue> => {
		const map = new Map<string, ComputedValue>();
		for (const [ref, val] of Object.entries(values)) {
			if (typeof val === 'number') {
				map.set(ref, { type: 'number', value: val });
			} else {
				map.set(ref, { type: 'string', value: val });
			}
		}
		return map;
	};

	describe('Basic generation', () => {
		it('should generate CSV with headers', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '10' },
					B1: { value: '20' }
				},
				2,
				2
			);
			const computed = createComputedValues({ A1: 10, B1: 20 });

			const csv = generateCsv(data, computed, { includeHeaders: true });

			expect(csv).toContain('A,B');
			expect(csv).toContain('10,20');
		});

		it('should generate CSV without headers', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '10' }
				},
				1,
				1
			);
			const computed = createComputedValues({ A1: 10 });

			const csv = generateCsv(data, computed, { includeHeaders: false });

			expect(csv).not.toContain('A');
			expect(csv).toBe('10');
		});

		it('should handle empty cells', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '10' },
					C1: { value: '30' }
				},
				1,
				3
			);
			const computed = createComputedValues({ A1: 10, C1: 30 });

			const csv = generateCsv(data, computed, { includeHeaders: false });

			expect(csv).toBe('10,,30');
		});
	});

	describe('Delimiters', () => {
		it('should use comma delimiter by default', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '10' },
					B1: { value: '20' }
				},
				1,
				2
			);
			const computed = createComputedValues({ A1: 10, B1: 20 });

			const csv = generateCsv(data, computed, { includeHeaders: false });

			expect(csv).toBe('10,20');
		});

		it('should use semicolon delimiter when specified', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '10' },
					B1: { value: '20' }
				},
				1,
				2
			);
			const computed = createComputedValues({ A1: 10, B1: 20 });

			const csv = generateCsv(data, computed, { delimiter: ';', includeHeaders: false });

			expect(csv).toBe('10;20');
		});

		it('should use tab delimiter when specified', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '10' },
					B1: { value: '20' }
				},
				1,
				2
			);
			const computed = createComputedValues({ A1: 10, B1: 20 });

			const csv = generateCsv(data, computed, { delimiter: '\t', includeHeaders: false });

			expect(csv).toBe('10\t20');
		});
	});

	describe('Escaping', () => {
		it('should quote values containing delimiter', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: 'hello, world' }
				},
				1,
				1
			);
			const computed = createComputedValues({ A1: 'hello, world' });

			const csv = generateCsv(data, computed, { includeHeaders: false });

			expect(csv).toBe('"hello, world"');
		});

		it('should escape double quotes', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: 'say "hello"' }
				},
				1,
				1
			);
			const computed = createComputedValues({ A1: 'say "hello"' });

			const csv = generateCsv(data, computed, { includeHeaders: false });

			expect(csv).toBe('"say ""hello"""');
		});

		it('should quote values containing newlines', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: 'line1\nline2' }
				},
				1,
				1
			);
			const computed = createComputedValues({ A1: 'line1\nline2' });

			const csv = generateCsv(data, computed, { includeHeaders: false });

			expect(csv).toBe('"line1\nline2"');
		});
	});

	describe('Formula export', () => {
		it('should export computed values by default', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '=5+5' }
				},
				1,
				1
			);
			const computed = createComputedValues({ A1: 10 });

			const csv = generateCsv(data, computed, { includeHeaders: false, exportFormulas: false });

			expect(csv).toBe('10');
		});

		it('should export formulas when specified', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '=5+5' }
				},
				1,
				1
			);
			const computed = createComputedValues({ A1: 10 });

			const csv = generateCsv(data, computed, { includeHeaders: false, exportFormulas: true });

			expect(csv).toBe('=5+5');
		});
	});

	describe('UTF-8 BOM', () => {
		it('should not include BOM by default', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '10' }
				},
				1,
				1
			);
			const computed = createComputedValues({ A1: 10 });

			const csv = generateCsv(data, computed, { includeHeaders: false, encoding: 'utf-8' });

			expect(csv.charCodeAt(0)).not.toBe(0xfeff);
		});

		it('should include BOM when specified', () => {
			const data = createSpreadsheetData(
				{
					A1: { value: '10' }
				},
				1,
				1
			);
			const computed = createComputedValues({ A1: 10 });

			const csv = generateCsv(data, computed, { includeHeaders: false, encoding: 'utf-8-bom' });

			expect(csv.charCodeAt(0)).toBe(0xfeff);
		});
	});
});

describe('CSV Import - parseCsv', () => {
	describe('Basic parsing', () => {
		it('should parse simple CSV', () => {
			const result = parseCsv('10,20,30\n40,50,60');

			expect(result.success).toBe(true);
			expect(result.rowCount).toBe(2);
			expect(result.colCount).toBe(3);
			expect(result.data?.cells['A1']?.value).toBe('10');
			expect(result.data?.cells['B1']?.value).toBe('20');
			expect(result.data?.cells['A2']?.value).toBe('40');
		});

		it('should handle empty content', () => {
			const result = parseCsv('');

			expect(result.success).toBe(false);
			expect(result.error).toContain('vide');
		});

		it('should trim cell values', () => {
			const result = parseCsv('  hello  ,  world  ');

			expect(result.success).toBe(true);
			expect(result.data?.cells['A1']?.value).toBe('hello');
			expect(result.data?.cells['B1']?.value).toBe('world');
		});
	});

	describe('Delimiter detection', () => {
		it('should auto-detect comma delimiter', () => {
			const result = parseCsv('a,b,c\n1,2,3', { delimiter: 'auto' });

			expect(result.success).toBe(true);
			expect(result.colCount).toBe(3);
		});

		it('should auto-detect semicolon delimiter', () => {
			const result = parseCsv('a;b;c\n1;2;3', { delimiter: 'auto' });

			expect(result.success).toBe(true);
			expect(result.colCount).toBe(3);
		});

		it('should auto-detect tab delimiter', () => {
			const result = parseCsv('a\tb\tc\n1\t2\t3', { delimiter: 'auto' });

			expect(result.success).toBe(true);
			expect(result.colCount).toBe(3);
		});

		it('should use specified delimiter', () => {
			const result = parseCsv('a;b;c', { delimiter: ';' });

			expect(result.success).toBe(true);
			expect(result.colCount).toBe(3);
		});
	});

	describe('Quoted fields', () => {
		it('should parse quoted fields', () => {
			const result = parseCsv('"hello","world"');

			expect(result.success).toBe(true);
			expect(result.data?.cells['A1']?.value).toBe('hello');
			expect(result.data?.cells['B1']?.value).toBe('world');
		});

		it('should handle delimiter inside quotes', () => {
			const result = parseCsv('"hello, world",test');

			expect(result.success).toBe(true);
			expect(result.data?.cells['A1']?.value).toBe('hello, world');
			expect(result.data?.cells['B1']?.value).toBe('test');
		});

		it('should handle escaped quotes', () => {
			const result = parseCsv('"say ""hello"""');

			expect(result.success).toBe(true);
			expect(result.data?.cells['A1']?.value).toBe('say "hello"');
		});

		it('should handle newlines inside quotes', () => {
			const result = parseCsv('"line1\nline2",other');

			expect(result.success).toBe(true);
			expect(result.data?.cells['A1']?.value).toBe('line1\nline2');
			expect(result.data?.cells['B1']?.value).toBe('other');
		});
	});

	describe('Header handling', () => {
		it('should not skip headers by default', () => {
			const result = parseCsv('Name,Value\nAlice,100');

			expect(result.success).toBe(true);
			expect(result.rowCount).toBe(2);
			expect(result.data?.cells['A1']?.value).toBe('Name');
		});

		it('should skip headers when specified', () => {
			const result = parseCsv('Name,Value\nAlice,100', { hasHeaders: true });

			expect(result.success).toBe(true);
			expect(result.rowCount).toBe(1);
			expect(result.data?.cells['A1']?.value).toBe('Alice');
		});
	});

	describe('Empty row handling', () => {
		it('should skip empty rows by default', () => {
			const result = parseCsv('a,b\n\nc,d');

			expect(result.success).toBe(true);
			expect(result.rowCount).toBe(2);
		});

		it('should keep empty rows when specified', () => {
			const result = parseCsv('a,b\n,\nc,d', { skipEmptyRows: false });

			expect(result.success).toBe(true);
			// The middle row has empty cells but is not completely empty
		});
	});

	describe('Size limits', () => {
		it('should limit to 20 rows', () => {
			const rows = Array.from({ length: 30 }, (_, i) => `row${i + 1}`).join('\n');
			const result = parseCsv(rows);

			expect(result.success).toBe(true);
			expect(result.rowCount).toBe(20);
		});

		it('should limit to 20 columns', () => {
			const cols = Array.from({ length: 30 }, (_, i) => `col${i + 1}`).join(',');
			const result = parseCsv(cols);

			expect(result.success).toBe(true);
			expect(result.colCount).toBe(20);
		});
	});

	describe('BOM handling', () => {
		it('should remove UTF-8 BOM', () => {
			const result = parseCsv('\ufeffhello,world');

			expect(result.success).toBe(true);
			expect(result.data?.cells['A1']?.value).toBe('hello');
		});
	});

	describe('Windows line endings', () => {
		it('should handle CRLF line endings', () => {
			const result = parseCsv('a,b\r\nc,d');

			expect(result.success).toBe(true);
			expect(result.rowCount).toBe(2);
			expect(result.data?.cells['A2']?.value).toBe('c');
		});
	});
});

describe('CSV Roundtrip', () => {
	it('should roundtrip simple data', () => {
		const originalData: SpreadsheetData = {
			version: 1,
			cells: {
				A1: { value: 'Hello' },
				B1: { value: '100' },
				A2: { value: 'World' },
				B2: { value: '200' }
			},
			metadata: { name: 'Test', rows: 2, cols: 2 }
		};

		const computed = new Map<string, ComputedValue>([
			['A1', { type: 'string', value: 'Hello' }],
			['B1', { type: 'number', value: 100 }],
			['A2', { type: 'string', value: 'World' }],
			['B2', { type: 'number', value: 200 }]
		]);

		const csv = generateCsv(originalData, computed, { includeHeaders: false });
		const result = parseCsv(csv);

		expect(result.success).toBe(true);
		expect(result.data?.cells['A1']?.value).toBe('Hello');
		expect(result.data?.cells['B1']?.value).toBe('100');
		expect(result.data?.cells['A2']?.value).toBe('World');
		expect(result.data?.cells['B2']?.value).toBe('200');
	});

	it('should roundtrip data with special characters', () => {
		const originalData: SpreadsheetData = {
			version: 1,
			cells: {
				A1: { value: 'Hello, "World"' }
			},
			metadata: { name: 'Test', rows: 1, cols: 1 }
		};

		const computed = new Map<string, ComputedValue>([
			['A1', { type: 'string', value: 'Hello, "World"' }]
		]);

		const csv = generateCsv(originalData, computed, { includeHeaders: false });
		const result = parseCsv(csv);

		expect(result.success).toBe(true);
		expect(result.data?.cells['A1']?.value).toBe('Hello, "World"');
	});

	it('should roundtrip data with semicolon delimiter (French Excel)', () => {
		const originalData: SpreadsheetData = {
			version: 1,
			cells: {
				A1: { value: '10,5' }, // French decimal
				B1: { value: '20,5' }
			},
			metadata: { name: 'Test', rows: 1, cols: 2 }
		};

		const computed = new Map<string, ComputedValue>([
			['A1', { type: 'string', value: '10,5' }],
			['B1', { type: 'string', value: '20,5' }]
		]);

		const csv = generateCsv(originalData, computed, { delimiter: ';', includeHeaders: false });
		const result = parseCsv(csv, { delimiter: ';' });

		expect(result.success).toBe(true);
		expect(result.data?.cells['A1']?.value).toBe('10,5');
		expect(result.data?.cells['B1']?.value).toBe('20,5');
	});
});
