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
import { parseVariationTableContent } from '../../parser/variation-table-parser';
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

		expect(typst).toContain('#import "@preview/vartable:0.2.1": tabvar');
	});

	it('should generate tabvar function call', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		expect(typst).toContain('tabvar(');
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

	it('should include labels as tuple with content blocks', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		// Labels use content blocks [...] with embedded math
		// Single-element tuples need trailing comma in Typst: (element,)
		expect(typst).toContain('label: (([$f\'(x)$], "s"),)');
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
	it('should generate sign row with interval-based format', () => {
		const node = createBasicNode();
		const typst = generateVariationTableTypst(node);

		// n-1 elements for n domain points
		// First interval: $+$, second interval: ("0", $-$)
		expect(typst).toContain('($+$, ("0", $-$))');
	});

	it('should combine zero marker with following sign', () => {
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

		// Zero marker combined with sign: ("0", $-$)
		expect(typst).toContain('($+$, ("0", $-$))');
	});

	it('should combine asymptote marker with following sign', () => {
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

		// Asymptote marker combined with sign: ("||", $+$)
		expect(typst).toContain('($+$, ("||", $+$))');
	});

	it('should combine forbidden marker with following sign', () => {
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

		// Forbidden marker combined with sign: ("||", $+$)
		expect(typst).toContain('($+$, ("||", $+$))');
	});

	it('should combine discontinuity marker with following sign', () => {
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

		// Discontinuity marker combined with sign: ("||", $-$)
		expect(typst).toContain('($+$, ("||", $-$))');
	});

	it('should include asymptote marker at first domain point in sign row', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: "f'(x)",
					values: new Map([
						['0', { type: 'marker', marker: 'asymptote' }],
						['0,1', { type: 'sign', value: '-' }],
						['1', { type: 'marker', marker: 'zero' }],
						['1,+inf', { type: 'sign', value: '+' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// First interval element should have "||" marker combined with sign
		// vartable draws "||" at left border when first element starts with "||"
		expect(typst).toContain('("||", $-$)');
		// Second interval with zero marker
		expect(typst).toContain('("0", $+$)');
	});

	// vartable 0.2.1 ne dessine en borne que "||" : un "0" final fait planter la
	// compilation (division par zéro), un "0" initial est ignoré. Le zéro en borne
	// reste à l'écran ; au PDF, la borne n'a pas de marque (sujet B de l'évaluation
	// « Fonctions » 2de, 2026-11-05).
	it("n'envoie pas à vartable de « 0 » sur une borne du domaine", () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-7' }, { expression: '-2' }, { expression: '2' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-7', { type: 'marker', marker: 'zero' }],
						['-7,-2', { type: 'sign', value: '-' }],
						['-2', { type: 'marker', marker: 'zero' }],
						['-2,2', { type: 'sign', value: '+' }],
						['2', { type: 'marker', marker: 'zero' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// n − 1 éléments, le zéro intérieur gardé, aucun "0" aux bornes
		expect(typst).toContain('($-$, ("0", $+$)),');
	});

	it('garde la double barre sur une borne de droite', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '1' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,1', { type: 'sign', value: '+' }],
						['1', { type: 'marker', marker: 'asymptote' }]
					])
				}
			]
		};

		expect(generateVariationTableTypst(node)).toContain('($+$, "||"),');
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

		// Empty intervals as ""
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

		// Point format: n elements for n domain points
		// Each element: (position, $value$)
		expect(typst).toContain('(bottom, $-infinity$)'); // -inf point
		expect(typst).toContain('(top, $3$)'); // 0 point (position: 'top' in test data)
		// Last point also (bottom, $-infinity$) - same as first
	});

	it('should use center position for values', () => {
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

		// Center is a valid position in vartable
		expect(typst).toContain('(center, $0$)');
		expect(typst).toContain('(center, $1$)');
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

		// Center values with position, asymptote as "||"
		expect(typst).toContain('(center, $0$)');
		expect(typst).toContain('"||"');
	});

	it('should handle asymptotes with explicit limits', () => {
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

		// Center values with position
		expect(typst).toContain('(center, $0$)');
		// Asymptote with explicit limits: (leftPos, rightPos, "||", leftValue, rightValue)
		expect(typst).toContain('(bottom, top, "||", $-infinity$, $+infinity$)');
	});

	it('should map limit-top to top position', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '5', position: 'limit-top' }],
						['1', { expression: '0', position: 'bottom' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// Point format: each point gets (position, $value$)
		expect(typst).toContain('(top, $5$)'); // limit-top maps to top
		expect(typst).toContain('(bottom, $0$)');
	});

	it('should map limit-bottom to bottom position', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '2', position: 'limit-bottom' }],
						['1', { expression: '5', position: 'top' }]
					])
				}
			]
		};

		const typst = generateVariationTableTypst(node);

		// Point format: each point gets (position, $value$)
		expect(typst).toContain('(bottom, $2$)'); // limit-bottom maps to bottom
		expect(typst).toContain('(top, $5$)'); // top maps to top
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
	it('should generate labels with content blocks', () => {
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

		// Labels use content blocks [...] with embedded math
		expect(typst).toContain('label: (([$f\'(x)$], "s"), ([$f(x)$], "v"))');
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

		// df → dif f, dt → dif t (differential notation)
		expect(typst).toContain('frac(dif f, dif t)');
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
		expect(typst).toContain('#import "@preview/vartable:0.2.1": tabvar');
		expect(typst).toContain('tabvar(');

		// Verify variable
		expect(typst).toContain('variable: $x$');

		// Verify domain
		expect(typst).toContain('domain: ($-infinity$, $-1$, $0$, $1$, $+infinity$)');

		// Verify labels with content blocks
		expect(typst).toContain('label: (([$f\'(x)$], "s"), ([$f(x)$], "v"))');

		// Verify sign row - interval-based format with markers combined
		// Domain: 5 points -> 4 intervals
		// Markers at -1, 0, 1 combined with their following signs
		expect(typst).toContain('($+$, ("0", $-$), ("0", $+$), ("0", $-$))');

		// Verify variation row (point format)
		// 5 points for 5 domain points: each point gets (position, $value$)
		expect(typst).toContain('(bottom, $-infinity$)'); // -inf
		expect(typst).toContain('(top, $3$)'); // -1 (position: 'top' in test data)
		expect(typst).toContain('(bottom, $0$)'); // 0
		expect(typst).toContain('(top, $2$)'); // 1 (position: 'top' in test data)
		// +inf also has (bottom, $-infinity$) - same as first point
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

		// Interval-based format with markers combined
		expect(typst).toContain('($-$, ("0", $+$))');
		expect(typst).toContain('($+$, ("0", $-$))');
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
			domain: [{ expression: '0' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '\\sqrt{3}', position: 'center' }],
						['1', { expression: '0', position: 'center' }]
					])
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
			domain: [{ expression: '0' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '\\text{max}', position: 'top' }],
						['1', { expression: '0', position: 'bottom' }]
					])
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

		// Point format: first point is normal, second is left asymptote
		expect(typst).toContain('(top, $0$)'); // -inf point (position: 'top' in test data)
		// Left asymptote: (position, "||", $value$)
		expect(typst).toContain('(bottom, "||", $-infinity$)');
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

		// Point format: first point is right asymptote, second is normal
		// Right asymptote: (position, "||", $value$) - same format as left, direction from position in domain
		expect(typst).toContain('(top, "||", $+infinity$)');
		// Center value with position
		expect(typst).toContain('(center, $0$)');
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

		// Center values with position
		expect(typst).toContain('(center, $1$)');
		// Asymptote with explicit limits: (leftPos, rightPos, "||", leftValue, rightValue)
		expect(typst).toContain('(bottom, top, "||", $-infinity$, $+infinity$)');
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
		expect(fullDoc).toContain('tabvar(');
	});
});

// ============================================================================
// RENDU PDF : zéro sur le trait et hauteur réelle du tableau
// ============================================================================

describe('generateVariationTableTypst - Rendu PDF', () => {
	it('marque une racine par "0" (trait + 0 affiché par vartable), pas par "z"', () => {
		// Dans vartable 0.2.1, seul le marqueur "0" dessine le « 0 » sur le trait ;
		// "z" tombe dans le cas par défaut : un trait nu, sans 0.
		const typst = generateVariationTableTypst(createBasicNode());

		expect(typst).toContain('($+$, ("0", $-$))');
		expect(typst).not.toContain('"z"');
	});

	it('pose le « 0 » sur fond blanc pour que le trait ne le barre pas', () => {
		// vartable centre `$ 0 $` (équation bloc) sur le trait sans fond : sans cette règle,
		// le trait traverse le chiffre et le 0 ressemble à « ø ».
		const typst = generateVariationTableTypst(createBasicNode());

		expect(typst).toContain(
			'#show math.equation.where(block: true): it => if it.body == [0] { box(fill: white, inset: (y: 2pt), it) } else { it }'
		);
	});

	it("réduit le tableau avec reflow pour que sa hauteur suive l'échelle", () => {
		// Sans reflow, scale() garde la hauteur d'origine → grand blanc sous le tableau
		const typst = generateVariationTableTypst(createBasicNode());

		expect(typst).toMatch(/scale\(x: k, y: k, origin: top \+ left, reflow: true, table\)/);
	});

	it('réduit un tableau large juste assez pour tenir dans la colonne (55 % au plus)', () => {
		// Échelle fixe à 55 % : un tableau à 5 abscisses et double barre débordait de la
		// colonne d'une fiche en deux colonnes, sa partie droite coupée (2026-09-24).
		const typst = generateVariationTableTypst(createBasicNode());

		expect(typst).toContain('#layout(size => {');
		expect(typst).toContain('let natural = measure(table).width');
		expect(typst).toContain('let k = calc.min(0.55, size.width / natural) * 100%');
	});
});

// ============================================================================
// Cases cachées (`?`) : option hiddenCells
// ============================================================================

describe('cellules cachées', () => {
	function hiddenNode(): VariationTableNode {
		const node = createBasicNode();
		node.domain[1] = { expression: '0', hidden: true };
		node.cases = [
			{ index: 0, row: 'domain', key: '0', kind: 'valeur', answer: '0' },
			{ index: 1, row: 0, key: '-inf,0', kind: 'signe', answer: '+' },
			{ index: 2, row: 0, key: '0', kind: 'marque', answer: 'z' }
		];
		return node;
	}

	it('sans ? : sortie identique, quelle que soit l’option', () => {
		const base = generateVariationTableTypst(createBasicNode());
		expect(generateVariationTableTypst(createBasicNode(), { hiddenCells: 'filled' })).toBe(base);
		expect(generateVariationTableTypst(createBasicNode(), { hiddenCells: 'blank' })).toBe(base);
	});

	it('filled dessine les valeurs comme un tableau sans ?', () => {
		const typst = generateVariationTableTypst(hiddenNode(), { hiddenCells: 'filled' });
		const nu = createBasicNode();
		expect(typst).toBe(generateVariationTableTypst(nu));
	});

	it('blank est le défaut et vide les cellules cachées en gardant la structure', () => {
		const blank = generateVariationTableTypst(hiddenNode());
		expect(blank).toBe(generateVariationTableTypst(hiddenNode(), { hiddenCells: 'blank' }));
		expect(blank).not.toContain('"0"');
		expect(blank).not.toContain('$0$');
		// la ligne de signes garde ses deux intervalles ; le 2e (non caché) reste dessiné
		expect(blank).toContain('$-$');
		expect(blank).not.toContain('$+$');
		expect(blank).toContain('box(');
	});
});

describe('ligne variation: à compléter (variations-a-completer)', () => {
	/** Cubique : ↗ jusqu'à 4 en -2, ↘ jusqu'à -4 en 2, ↗ */
	function cubique(...hidden: string[]): string {
		return [
			'variable: x',
			'domain: -inf, -2, 2, +inf',
			'',
			'variation: f(x)',
			'  -inf: -inf, bottom',
			hidden.includes('valeur') ? '  -2: ?4, top' : '  -2: 4, top',
			'  2: -4, bottom',
			'  +inf: +inf, top',
			...(hidden.includes('fleche') ? ['  -2,2: ?flèche'] : [])
		].join('\n');
	}
	const nodeOf = (text: string) => {
		const { node } = parseVariationTableContent(text.split('\n'));
		if (!node) throw new Error('tableau illisible');
		return node;
	};

	it('valeur cachée : case vide à sa hauteur, rien de la réponse', () => {
		const typst = generateVariationTableTypst(nodeOf(cubique('valeur')));
		expect(typst).toContain('(top, box(');
		expect(typst).not.toContain('$4$');
	});

	it('valeur cachée, corrigé (filled) : le tableau sans ?', () => {
		const typst = generateVariationTableTypst(nodeOf(cubique('valeur')), {
			hiddenCells: 'filled'
		});
		expect(typst).toBe(generateVariationTableTypst(nodeOf(cubique())));
	});

	it('flèche cachée : les deux valeurs qui l’encadrent au milieu', () => {
		const typst = generateVariationTableTypst(nodeOf(cubique('fleche')));
		expect(typst).toContain('(center, $4$)');
		expect(typst).toContain('(center, $-4$)');
		expect(typst).toContain('(bottom, $-infinity$)');
		expect(typst).not.toContain('(top, $4$)');
	});

	it('flèche cachée : aucune flèche dessinée à l’énoncé (vartable n’en omet pas une seule)', () => {
		const typst = generateVariationTableTypst(nodeOf(cubique('fleche')));
		expect(typst).toContain('arrow-style: (stroke: none)');
		expect(typst).toContain('arrow-mark: (end: none)');
	});

	it('flèches gardées : corrigé, et énoncé sans flèche cachée', () => {
		const filled = generateVariationTableTypst(nodeOf(cubique('fleche')), {
			hiddenCells: 'filled'
		});
		expect(filled).not.toContain('arrow-style');
		expect(generateVariationTableTypst(nodeOf(cubique('valeur')))).not.toContain('arrow-style');
	});

	it('borne implicite à côté d’une flèche cachée : colonne non vide (vartable planterait)', () => {
		const typst = generateVariationTableTypst(
			nodeOf(
				'variable: x\ndomain: -inf, 1, +inf\n\nvariation: f(x)\n  1: -3, bottom\n  1,+inf: ?flèche'
			)
		);
		expect(typst).not.toMatch(/\(\)\s*\)/);
		expect(typst).toContain('(center, $-3$)');
		expect(typst).toContain('(top, $$)');
	});
});
