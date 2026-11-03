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

	it('écrit une graduation décimale avec une virgule en français, un point en anglais', () => {
		const node = createNode([
			'start: 1.4',
			'end: 1.55',
			'step: 0.01',
			'major: 10',
			'labels: 1.4, 1.5'
		]);

		const fr = generateNumberLineTypst(node);
		expect(fr).toContain('[$1","4$]');
		expect(fr).toContain('[$1","5$]');
		expect(fr).not.toContain('1.4');

		const en = generateNumberLineTypst(node, { language: 'en' });
		expect(en).toContain('[$1.4$]');
	});

	it("groupe les chiffres d'une graduation entière de 5 chiffres, comme à l'écran", () => {
		const node = createNode(['start: 0', 'end: 20000', 'step: 10000', 'labels: 0, 10000, 20000']);
		expect(generateNumberLineTypst(node)).toContain('[$10 thin 000$]');
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
		// Palette commune, variante claire (lot 3 des couleurs)
		expect(typst).toContain('fill: rgb("#dc2626")');
		expect(typst).toContain('fill: rgb("#2563eb")');
	});

	it('should use default color for points without explicit color', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1', 'points: X=5']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('X');
		expect(typst).toContain('text(fill: rgb("#dc2626"))[X]');
	});

	// ========================================================================
	// SEGMENTS
	// ========================================================================

	/** Lignes des crochets (un crochet = une ligne brisée de 4 points, `// crochet`) */
	function brackets(typst: string): string[] {
		return typst.split('\n').filter((l) => l.includes('// crochet'));
	}

	it('segment fermé [2, 5] : deux crochets à la couleur du segment, aucun disque', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1', 'segments: [2, 5] blue']);
		const typst = generateNumberLineTypst(node);

		expect(typst).toContain('// Segments');
		expect(brackets(typst)).toHaveLength(2);
		expect(brackets(typst).every((l) => l.includes('rgb("#2563eb")'))).toBe(true);
		expect(typst).not.toContain('circle(');
	});

	it('crochet de gauche : becs vers la droite si fermé, vers la gauche si ouvert', () => {
		// lineWidth 12 sur [0, 10] : x = 2 → 2.4 ; becs de 0.08
		const at = (seg: string) =>
			brackets(
				generateNumberLineTypst(createNode(['start: 0', 'end: 10', 'step: 1', `segments: ${seg}`]))
			)[0];
		expect(at('[2, 5]')).toMatch(/^\s*line\(\(2\.48, /);
		expect(at(']2, 5]')).toMatch(/^\s*line\(\(2\.32, /);
	});

	it('demi-droite [2, +inf[ : un seul crochet, trait jusqu’au bout de la flèche', () => {
		const node = createNode([
			'start: 0',
			'end: 10',
			'step: 1',
			'arrows: true',
			'segments: [2, +inf['
		]);
		const typst = generateNumberLineTypst(node);

		expect(brackets(typst)).toHaveLength(1);
		// lineWidth 12 + flèche 0.3
		expect(typst).toMatch(/line\(\(2\.4, -0\.9\), \(12\.3, -0\.9\)/);
	});

	it(']-inf, +inf[ : toute la droite, sans crochet', () => {
		const node = createNode(['start: 0', 'end: 10', 'step: 1', 'segments: ]-inf, +inf[']);
		const typst = generateNumberLineTypst(node);

		expect(brackets(typst)).toHaveLength(0);
		expect(typst).toMatch(/line\(\(0, -0\.9\), \(12, -0\.9\)/);
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
