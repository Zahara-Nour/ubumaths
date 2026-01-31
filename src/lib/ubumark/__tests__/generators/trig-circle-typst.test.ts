/**
 * Trig Circle Typst Generator Tests
 * ==================================
 *
 * Unit tests for the trigonometric circle Typst generation.
 * Tests cover CeTZ output, table generation, and various configurations.
 */

import { describe, it, expect } from 'vitest';
import { generateTrigCircleTypst } from '../../generators/trig-circle-typst';
import type { TrigCircleNode, TrigCircleConfig } from '../../types/trig-circle';
import { DEFAULT_TRIG_CIRCLE_CONFIG, getPresetAngles } from '../../types/trig-circle';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a minimal TrigCircleNode for testing
 */
function createTrigNode(
	config: Partial<TrigCircleConfig> = {},
	angles: { expression: string; radians: number; latex?: string }[] = []
): TrigCircleNode {
	const fullConfig: TrigCircleConfig = {
		...DEFAULT_TRIG_CIRCLE_CONFIG,
		...config
	};

	return {
		type: 'trig-circle',
		config: fullConfig,
		angles: angles.length > 0 ? angles : getPresetAngles(fullConfig.preset)
	};
}

// ============================================================================
// BASIC OUTPUT TESTS
// ============================================================================

describe('generateTrigCircleTypst', () => {
	it('should generate valid CeTZ import', () => {
		const node = createTrigNode();
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('#import "@preview/cetz:0.3.0"');
		expect(typst).toContain('#cetz.canvas({');
	});

	it('should include axes by default', () => {
		const node = createTrigNode({ showAxes: true });
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('// Axes');
		expect(typst).toContain('line(');
		expect(typst).toContain('mark: (end: ">")');
	});

	it('should include unit circle', () => {
		const node = createTrigNode();
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('// Unit circle');
		expect(typst).toContain('circle((0, 0), radius:');
	});

	it('should generate angle points', () => {
		const node = createTrigNode({ preset: 'quarters' });
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('// Angle points');
		// Should have multiple circles for the angle points
		expect((typst.match(/fill:/g) || []).length).toBeGreaterThan(1);
	});

	it('should generate labels when enabled', () => {
		const node = createTrigNode({ showLabels: true, preset: 'quarters' });
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('// Angle labels');
		expect(typst).toContain('content(');
	});

	it('should not generate labels when disabled', () => {
		const node = createTrigNode({ showLabels: false });
		const typst = generateTrigCircleTypst(node);

		expect(typst).not.toContain('// Angle labels');
	});
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('configuration options', () => {
	it('should generate projections when enabled', () => {
		const node = createTrigNode({
			showProjections: true,
			preset: 'quarters'
		});
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('// Projection lines');
		expect(typst).toContain('stroke: (dash: "dashed"');
	});

	it('should not generate projections when disabled', () => {
		const node = createTrigNode({ showProjections: false });
		const typst = generateTrigCircleTypst(node);

		expect(typst).not.toContain('// Projection lines');
	});

	it('should generate grid when enabled', () => {
		const node = createTrigNode({ showGrid: true });
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('// Grid');
	});

	it('should not generate grid when disabled', () => {
		const node = createTrigNode({ showGrid: false });
		const typst = generateTrigCircleTypst(node);

		expect(typst).not.toContain('// Grid');
	});

	it('should generate axis values when enabled', () => {
		const node = createTrigNode({ showAxisValues: true });
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('// Axis values');
		expect(typst).toContain('[$1$]');
		expect(typst).toContain('[$-1$]');
	});

	it('should apply custom color', () => {
		const node = createTrigNode({ color: 'red', preset: 'quarters' });
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('red');
	});
});

// ============================================================================
// DISPLAY MODE TESTS
// ============================================================================

describe('display modes', () => {
	it('should generate table for circle+table mode', () => {
		const node = createTrigNode({
			display: 'circle+table',
			preset: 'quarters'
		});
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('#table(');
		expect(typst).toContain('columns: 3');
		expect(typst).toContain('[$theta$]');
		expect(typst).toContain('[$cos theta$]');
		expect(typst).toContain('[$sin theta$]');
	});

	it('should generate table for table mode', () => {
		const node = createTrigNode({
			display: 'table',
			preset: 'quarters'
		});
		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('#table(');
	});

	it('should not generate table for circle mode', () => {
		const node = createTrigNode({ display: 'circle' });
		const typst = generateTrigCircleTypst(node);

		expect(typst).not.toContain('#table(');
	});
});

// ============================================================================
// ARC MODE TESTS
// ============================================================================

describe('arc mode', () => {
	it('should generate arcs for solution', () => {
		const node = createTrigNode({ mode: 'arc', color: 'blue' });
		node.solution = {
			type: 'inequation',
			angles: [],
			arcs: [
				{
					startAngle: -Math.PI / 3,
					endAngle: Math.PI / 3,
					includeStart: false,
					includeEnd: false
				}
			],
			noSolution: false,
			allReals: false
		};

		const typst = generateTrigCircleTypst(node);

		expect(typst).toContain('// Solution arcs');
		expect(typst).toContain('arc(');
		expect(typst).toContain('thickness: 4pt');
	});

	it('should differentiate open and closed endpoints', () => {
		const node = createTrigNode({ mode: 'arc', color: 'blue' });
		node.solution = {
			type: 'inequation',
			angles: [],
			arcs: [
				{
					startAngle: 0,
					endAngle: Math.PI / 2,
					includeStart: true, // closed
					includeEnd: false // open
				}
			],
			noSolution: false,
			allReals: false
		};

		const typst = generateTrigCircleTypst(node);

		// Should have both filled and white circles for endpoints
		expect(typst).toContain('fill: blue'); // closed endpoint
		expect(typst).toContain('fill: white'); // open endpoint
	});
});

// ============================================================================
// PRESET TESTS
// ============================================================================

describe('presets', () => {
	it('should handle quarters preset', () => {
		const node = createTrigNode({ preset: 'quarters' });
		const typst = generateTrigCircleTypst(node);

		// Should have 4 angle points (0, π/2, π, 3π/2)
		expect(node.angles).toHaveLength(4);
		expect(typst).toContain('// Angle points');
	});

	it('should handle sixths preset', () => {
		const node = createTrigNode({ preset: 'sixths' });

		// Should have 12 angles
		expect(node.angles).toHaveLength(12);
	});

	it('should handle thirds preset', () => {
		const node = createTrigNode({ preset: 'thirds' });

		// Should have 6 angles
		expect(node.angles).toHaveLength(6);
	});

	it('should handle all preset', () => {
		const node = createTrigNode({ preset: 'all' });

		// Should have 16 angles
		expect(node.angles).toHaveLength(16);
	});

	it('should handle custom preset with angles', () => {
		const node = createTrigNode({ preset: 'custom' }, [
			{ expression: 'π/5', radians: Math.PI / 5, latex: '\\frac{\\pi}{5}' }
		]);

		expect(node.angles).toHaveLength(1);
		const typst = generateTrigCircleTypst(node);
		expect(typst).toContain('frac(pi, 5)');
	});
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('error handling', () => {
	it('should handle empty angles array', () => {
		const node = createTrigNode({ preset: 'custom' }, []);
		const typst = generateTrigCircleTypst(node);

		// Should still generate valid CeTZ code
		expect(typst).toContain('#cetz.canvas({');
		expect(typst).not.toContain('Error');
	});

	it('should handle node without solution', () => {
		const node = createTrigNode({ mode: 'arc' });
		// No solution property set
		const typst = generateTrigCircleTypst(node);

		// Should not crash
		expect(typst).toContain('#cetz.canvas({');
	});
});

// ============================================================================
// VALUE TABLE TESTS
// ============================================================================

describe('value table', () => {
	it('should include remarkable values for known angles', () => {
		const node = createTrigNode({
			display: 'circle+table',
			preset: 'quarters'
		});
		const typst = generateTrigCircleTypst(node);

		// For π/2, cos = 0, sin = 1
		expect(typst).toContain('[$0$]');
		expect(typst).toContain('[$1$]');
	});

	it('should format fraction values correctly', () => {
		const node = createTrigNode({
			display: 'circle+table',
			preset: 'sixths'
		});
		const typst = generateTrigCircleTypst(node);

		// Should have fraction representations like √3/2
		expect(typst).toContain('frac');
	});
});
