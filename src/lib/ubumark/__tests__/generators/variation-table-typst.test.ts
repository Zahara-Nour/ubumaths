/**
 * Variation Table Typst Generator Tests
 * ======================================
 *
 * Comprehensive tests for the variation table Typst generator.
 *
 * @module ubumark/__tests__/generators/variation-table-typst.test
 */

import { describe, it, expect } from 'vitest';
import { generateVariationTableTypst } from '../../generators/variation-table-typst';
import type { VariationTableNode, SignRow, DomainPoint } from '../../types/variation-table';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a basic variation table node for testing
 */
function createBasicNode(): VariationTableNode {
	const domain: DomainPoint[] = [
		{ expression: '-inf' },
		{ expression: '0' },
		{ expression: '+inf' }
	];

	const signRow: SignRow = {
		type: 'sign',
		label: "f'(x)",
		values: new Map([
			['-inf,0', { type: 'sign', value: '+' }],
			['0', { type: 'marker', marker: 'zero' }],
			['0,+inf', { type: 'sign', value: '-' }]
		])
	};

	return {
		type: 'variation-table',
		variable: 'x',
		domain,
		rows: [signRow]
	};
}

// ============================================================================
// BASIC STRUCTURE TESTS
// ============================================================================

describe('generateVariationTableTypst - Basic Structure', () => {
	it('should generate vartable import statement', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('#import "@preview/vartable:0.2.3": tabvar');
	});

	it('should generate tabvar function call', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('#tabvar(');
		expect(typst).toContain('variable:');
		expect(typst).toContain('domain:');
		expect(typst).toContain('label:');
		expect(typst).toContain('contents:');
	});

	it('should include variable in math mode', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('variable: $x$');
	});

	it('should include domain as tuple', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('domain: ($-infinity$, $0$, $+infinity$)');
	});

	it('should include labels as tuple', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('label: (($f\'(x)$, "s"))');
	});
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('generateVariationTableTypst - Error Handling', () => {
	it('should return error comment for table with no rows', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: []
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('// Error:');
		expect(typst).toContain('no rows');
	});

	it('should return error comment for table with no domain', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map()
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('// Error:');
		expect(typst).toContain('no domain');
	});
});

// ============================================================================
// SIGN ROW TESTS
// ============================================================================

describe('generateVariationTableTypst - Sign Rows', () => {
	it('should generate simple sign row with +/- values', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('($+$');
		expect(typst).toContain('"z"');
		expect(typst).toContain('$-$');
	});

	it('should convert zero marker to "z"', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '+' }],
						['0', { type: 'marker', marker: 'zero' }],
						['0,+inf', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('"z"');
	});

	it('should convert asymptote marker to "||"', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '+' }],
						['0', { type: 'marker', marker: 'asymptote' }],
						['0,+inf', { type: 'sign', value: '+' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('"||"');
	});

	it('should convert forbidden marker to "||"', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '2' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,2', { type: 'sign', value: '+' }],
						['2', { type: 'marker', marker: 'forbidden' }],
						['2,+inf', { type: 'sign', value: '+' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('"||"');
	});

	it('should convert discontinuity marker to "||"', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '1' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,1', { type: 'sign', value: '+' }],
						['1', { type: 'marker', marker: 'discontinuity' }],
						['1,+inf', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('"||"');
	});

	it('should handle empty intervals with empty strings', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [
				{ expression: '-inf' },
				{ expression: '0' },
				{ expression: '1' },
				{ expression: '+inf' }
			],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '+' }],
						['0', { type: 'marker', marker: 'zero' }]
						// 0,1 and 1,+inf are empty
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('""');
	});
});

// ============================================================================
// VARIATION ROW TESTS
// ============================================================================

describe('generateVariationTableTypst - Variation Rows', () => {
	it('should generate variation row with positioned values', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '-inf', position: 'bottom' }],
						['0', { expression: '3', position: 'top' }],
						['+inf', { expression: '-inf', position: 'bottom' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('(bottom, $-infinity$)');
		expect(typst).toContain('(top, $3$)');
	});

	it('should use middle position as default (no position wrapper)', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '0', position: 'center' }],
						['1', { expression: '1', position: 'center' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// Center position should not have wrapper
		expect(typst).toContain('$0$');
		expect(typst).toContain('$1$');
		expect(typst).not.toContain('(center,');
	});

	it('should format infinity values correctly', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '-inf', position: 'bottom' }],
						['+inf', { expression: '+inf', position: 'top' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('$-infinity$');
		expect(typst).toContain('$+infinity$');
	});

	it('should handle asymptotes as "||"', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '0', position: 'center' }],
						['0', { expression: '', position: 'center', marker: 'asymptote' }],
						['+inf', { expression: '0', position: 'center' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('"||"');
	});

	it('should handle asymptotes with limits (use "||" and let vartable infer)', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '0', position: 'center' }],
						[
							'0',
							{
								expression: '',
								position: 'center',
								marker: 'asymptote',
								limits: [
									{ expression: '-inf', position: 'bottom' },
									{ expression: '+inf', position: 'top' }
								]
							}
						],
						['+inf', { expression: '0', position: 'center' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// vartable infers limits from surrounding values, so just use ||
		expect(typst).toContain('"||"');
	});

	it('should map limit-top to top', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([['0', { expression: '5', position: 'limit-top' }]])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('(top, $5$)');
	});

	it('should map limit-bottom to bottom', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([['0', { expression: '2', position: 'limit-bottom' }]])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('(bottom, $2$)');
	});
});

// ============================================================================
// DOMAIN TESTS
// ============================================================================

describe('generateVariationTableTypst - Domain', () => {
	it('should format infinity correctly', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([['-inf,+inf', { type: 'sign', value: '+' }]])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('$-infinity$');
		expect(typst).toContain('$+infinity$');
	});

	it('should convert LaTeX expressions to Typst', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '\\frac{\\pi}{2}' }, { expression: '\\pi' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['0,\\frac{\\pi}{2}', { type: 'sign', value: '+' }],
						['\\frac{\\pi}{2},\\pi', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// LaTeX \frac{a}{b} should convert to frac(a, b)
		expect(typst).toContain('frac(pi, 2)');
		expect(typst).toContain('$pi$');
	});
});

// ============================================================================
// LABELS TESTS
// ============================================================================

describe('generateVariationTableTypst - Labels', () => {
	it('should generate labels with correct conversions', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'sign',
					label: "f'(x)",
					values: new Map()
				},
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map()
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('label: (($f\'(x)$, "s"), ($f(x)$, "v"))');
	});

	it('should convert LaTeX in labels to Typst', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 't',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'sign',
					label: '\\frac{df}{dt}',
					values: new Map()
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('frac(df, dt)');
	});
});

// ============================================================================
// COMPLEX TABLES
// ============================================================================

describe('generateVariationTableTypst - Complex Tables', () => {
	it('should generate complete table with sign and variation rows', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [
				{ expression: '-inf' },
				{ expression: '-1' },
				{ expression: '0' },
				{ expression: '1' },
				{ expression: '+inf' }
			],
			rows: [
				{
					type: 'sign',
					label: "f'(x)",
					values: new Map([
						['-inf,-1', { type: 'sign', value: '+' }],
						['-1', { type: 'marker', marker: 'zero' }],
						['-1,0', { type: 'sign', value: '-' }],
						['0', { type: 'marker', marker: 'zero' }],
						['0,1', { type: 'sign', value: '+' }],
						['1', { type: 'marker', marker: 'zero' }],
						['1,+inf', { type: 'sign', value: '-' }]
					])
				},
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '-inf', position: 'bottom' }],
						['-1', { expression: '3', position: 'top' }],
						['0', { expression: '0', position: 'bottom' }],
						['1', { expression: '2', position: 'top' }],
						['+inf', { expression: '-inf', position: 'bottom' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// Verify structure
		expect(typst).toContain('#import "@preview/vartable:0.2.3": tabvar');
		expect(typst).toContain('#tabvar(');

		// Verify variable
		expect(typst).toContain('variable: $x$');

		// Verify domain
		expect(typst).toContain('domain: ($-infinity$, $-1$, $0$, $1$, $+infinity$)');

		// Verify labels
		expect(typst).toContain('label: (($f\'(x)$, "s"), ($f(x)$, "v"))');

		// Verify sign row
		expect(typst).toContain('($+$, "z", $-$, "z", $+$, "z", $-$)');

		// Verify variation row
		expect(typst).toContain('(bottom, $-infinity$)');
		expect(typst).toContain('(top, $3$)');
		expect(typst).toContain('(bottom, $0$)');
		expect(typst).toContain('(top, $2$)');
	});

	it('should handle multiple sign rows', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '-' }],
						['0', { type: 'marker', marker: 'zero' }],
						['0,+inf', { type: 'sign', value: '+' }]
					])
				},
				{
					type: 'sign',
					label: 'g(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '+' }],
						['0', { type: 'marker', marker: 'zero' }],
						['0,+inf', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('($-$, "z", $+$)');
		expect(typst).toContain('($+$, "z", $-$)');
	});

	it('should convert complex math expressions', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '\\frac{\\pi}{2}' }, { expression: '\\pi' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '0', position: 'bottom' }],
						['\\frac{\\pi}{2}', { expression: '\\sqrt{2}', position: 'top' }],
						['\\pi', { expression: '0', position: 'bottom' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('frac(pi, 2)');
		expect(typst).toContain('sqrt(2)');
	});
});

// ============================================================================
// LATEX TO TYPST CONVERSION TESTS
// ============================================================================

describe('generateVariationTableTypst - LaTeX to Typst Conversion', () => {
	it('should convert \\frac to frac()', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '\\frac{1}{2}' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map()
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('frac(1, 2)');
	});

	it('should convert \\sqrt to sqrt()', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([['0', { expression: '\\sqrt{3}', position: 'center' }]])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('sqrt(3)');
	});

	it('should remove \\text{} wrappers', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([['0', { expression: '\\text{max}', position: 'top' }]])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// \text{max} should become "max"
		expect(typst).toContain('"max"');
	});
});

// ============================================================================
// SINGLE LIMIT ASYMPTOTE TESTS
// ============================================================================

describe('generateVariationTableTypst - Single Limit Asymptotes', () => {
	it('should generate left-only limit asymptote', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '0', position: 'top' }],
						[
							'1',
							{
								expression: '-inf',
								position: 'bottom',
								marker: 'asymptote',
								limitSide: 'left'
							}
						]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// Should contain the limit value with position and asymptote marker
		expect(typst).toContain('(bottom, $-infinity$)');
		expect(typst).toContain('"||"');
	});

	it('should generate right-only limit asymptote', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						[
							'0',
							{
								expression: '+inf',
								position: 'top',
								marker: 'asymptote',
								limitSide: 'right'
							}
						],
						['+inf', { expression: '0', position: 'center' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// Should contain the asymptote marker then the limit value
		expect(typst).toContain('"||"');
		expect(typst).toContain('(top, $+infinity$)');
	});

	it('should generate two limits with explicit positions', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '1', position: 'center' }],
						[
							'0',
							{
								expression: '',
								position: 'center',
								marker: 'asymptote',
								limits: [
									{ expression: '-inf', position: 'bottom' },
									{ expression: '+inf', position: 'top' }
								]
							}
						],
						['+inf', { expression: '1', position: 'center' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// Should contain both limits with their positions
		expect(typst).toContain('(bottom, $-infinity$)');
		expect(typst).toContain('"||"');
		expect(typst).toContain('(top, $+infinity$)');
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('generateVariationTableTypst - Integration', () => {
	it('should work with default export options', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		expect(typst).toBeTruthy();
		expect(typst).toContain('tabvar');
	});

	it('should be compilable Typst code', () => {
		const node = createBasicNode();
		const tableTypst = generateVariationTableTypst(node);

		const fullDoc = `#set page(paper: "a4")
#set text(font: "New Computer Modern", size: 11pt)

${tableTypst}`;

		expect(fullDoc).toContain('#set page');
		expect(fullDoc).toContain('#import "@preview/vartable');
		expect(fullDoc).toContain('#tabvar(');
	});
});
