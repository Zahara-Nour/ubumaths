/**
 * Number Line Typst Generator Tests
 * ==================================
 *
 * Unit tests for generating Typst/CeTZ output from NumberLineNode AST.
 */

import { describe, it, expect } from 'vitest';
import { generateNumberLineTypst } from '../../generators/number-line-typst';
import type { NumberLineNode } from '../../types/number-line';
import { parseNumberLineContent } from '../../parser/number-line-parser';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create a NumberLineNode from config lines (same format as ```line blocks).
 */
function createNode(configLines: string[]): NumberLineNode {
	const result = parseNumberLineContent(configLines);
	if (!result.node) throw new Error(`Parse error: ${result.errors[0]?.message}`);
	return result.node;
}

// ============================================================================
// BASIC OUTPUT
// ============================================================================

describe('generateNumberLineTypst', () => {
	it('should generate valid CeTZ import and canvas', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('#import "@preview/cetz:0.3.0"');
		expect(typst).toContain('#cetz.canvas({');
		expect(typst).toContain('})');
	});

	it('should draw the main horizontal line', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('line(');
		expect(typst).toMatch(/line\(\([\d.-]+, 0\), \([\d.-]+, 0\)/);
	});

	// ========================================================================
	// ARROWS
	// ========================================================================

	it('should not draw arrows by default', () => {
		const node = createNode(['start: 0', 'end: 5', 'step: 1']);
		const typst = generateNumberLineTypst(node);
		expect(typst).not.toContain('mark:');
	});

	it('should draw arrows when arrows=true', () => {
		const node = createNode(['start: 0', 'end: 5', 'step: 1', 'arrows: true']);
		const typst = generateNumberLineTypst(node);
		expect(typst).toContain('mark:');
		expect(typst).toContain('">"');
	});

	// ========================================================================
	// GRADUATIONS
	// ========================================================================

	it('should generate minor and major ticks', () => {
		const node = createNode(['start: 0', 'end: 4', 'step: 1', 'major: 2']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('// Graduations');
	});

	it('should generate labels for major graduations by default', () => {
		const node = createNode(['start: 0', 'end: 3', 'step: 1']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('$0$');
		expect(typst).toContain('$1$');
		expect(typst).toContain('$2$');
		expect(typst).toContain('$3$');
	});

	it('should use explicit labels when provided', () => {
		const node = createNode(['start: 0', 'end: 2', 'step: 1', 'labels: 0, 1, 2']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('$0$');
		expect(typst).toContain('$1$');
		expect(typst).toContain('$2$');
	});

	it('should show "?" for hidden labels', () => {
		const node = createNode(['start: 0', 'end: 3', 'step: 1', 'hidden: 2']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('$0$');
		expect(typst).toContain('$1$');
		expect(typst).toContain('$?$');
		expect(typst).toContain('$3$');
	});

	it('should generate fraction labels with Typst syntax', () => {
		const node = createNode(['start: 0', 'end: 1', 'step: 1/2', 'labels: 0, 1/2, 1']);
		const typst = generateNumberLineTypst(node);

		// Should contain Typst fraction syntax (frac(1, 2) or 1/2)
		expect(typst).toMatch(/\$.*1.*2.*\$/);
	});

	// ========================================================================
	// POINTS
	// ========================================================================

	it('should render named points', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1', 'points: A=3 red, B=7 blue']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('// Points');
		expect(typst).toContain('A');
		expect(typst).toContain('B');
		expect(typst).toContain('red');
		expect(typst).toContain('blue');
	});

	it('should use default color for points without explicit color', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1', 'points: X=5']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('X');
		expect(typst).toContain('red');
	});

	// ========================================================================
	// SEGMENTS
	// ========================================================================

	it('should render closed segments with filled endpoints', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1', 'segments: [2, 5] blue']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('// Segments');
		expect(typst).toContain('blue');
		expect(typst).toMatch(/fill: blue/);
	});

	it('should render open segments with empty endpoints', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1', 'segments: ]1, 4[']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toMatch(/fill: white/);
	});

	it('should render half-open segments', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1', 'segments: [1, 4[ green']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('fill: green');
		expect(typst).toContain('fill: white');
	});

	// ========================================================================
	// LOG SCALE
	// ========================================================================

	it('should handle logarithmic scale', () => {
		const node = createNode([
			'start: 1',
			'end: 100',
			'step: 1',
			'scale: log',
			'major: 10',
			'labels: 1, 10, 100'
		]);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('#cetz.canvas({');
		expect(typst).toContain('$1$');
		expect(typst).toContain('$100$');
	});

	// ========================================================================
	// ERROR HANDLING
	// ========================================================================

	it('should handle error gracefully', () => {
		const badNode = {
			type: 'number-line' as const,
			config: {
				start: { expression: '0', ast: null as never },
				end: { expression: '10', ast: null as never },
				step: { expression: '1', ast: null as never },
				major: 1,
				labels: [],
				hidden: [],
				arrows: false,
				scale: 'linear' as const
			},
			points: [],
			segments: []
		};

		const typst = generateNumberLineTypst(badNode);
		expect(typst).toContain('// Error:');
	});

	// ========================================================================
	// COMBINED FEATURES
	// ========================================================================

	it('should combine all features: arrows, points, segments, hidden labels', () => {
		const node = createNode([
			'start: -2',
			'end: 5',
			'step: 1',
			'arrows: true',
			'hidden: 3',
			'points: A=1 red',
			'segments: [0, 4[ blue'
		]);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('#import "@preview/cetz:0.3.0"');
		expect(typst).toContain('mark:');
		expect(typst).toContain('// Graduations');
		expect(typst).toContain('$?$');
		expect(typst).toContain('// Points');
		expect(typst).toContain('A');
		expect(typst).toContain('// Segments');
	});
});
