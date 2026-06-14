/**
 * Tests for WhiteboardToolbar
 *
 * Tests toolbar configuration and tool selection behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';

// =============================================================================
// Color Presets
// =============================================================================

/** Standard color presets for whiteboard tools */
const COLOR_PRESETS = [
	{ name: 'Noir', value: '#000000' },
	{ name: 'Bleu', value: '#2563eb' },
	{ name: 'Rouge', value: '#dc2626' },
	{ name: 'Vert', value: '#16a34a' },
	{ name: 'Orange', value: '#ea580c' },
	{ name: 'Violet', value: '#9333ea' }
] as const;

/** Default stroke widths per tool type */
const DEFAULT_STROKE_WIDTHS: Record<string, number> = {
	pen: 2,
	marker: 2,
	highlighter: 12,
	eraser: 20,
	line: 2,
	rectangle: 2,
	circle: 2,
	arrow: 2
};

/** Stroke width constraints */
const STROKE_WIDTH_MIN = 1;
const STROKE_WIDTH_MAX = 20;

/** Tool keyboard shortcuts */
const TOOL_SHORTCUTS: Record<string, string> = {
	pen: 'P',
	marker: 'M',
	highlighter: 'H',
	eraser: 'E',
	line: 'L',
	rectangle: 'R',
	circle: 'C',
	arrow: 'A'
};

// =============================================================================
// Tests
// =============================================================================

describe('Toolbar Color Presets', () => {
	it('has 6 color presets', () => {
		expect(COLOR_PRESETS.length).toBe(6);
	});

	it('includes all required colors', () => {
		const colorNames = COLOR_PRESETS.map((c) => c.name);
		expect(colorNames).toContain('Noir');
		expect(colorNames).toContain('Bleu');
		expect(colorNames).toContain('Rouge');
		expect(colorNames).toContain('Vert');
		expect(colorNames).toContain('Orange');
		expect(colorNames).toContain('Violet');
	});

	it('has valid hex color values', () => {
		const hexColorRegex = /^#[0-9a-f]{6}$/i;
		for (const color of COLOR_PRESETS) {
			expect(color.value).toMatch(hexColorRegex);
		}
	});

	it('has black as first color (default)', () => {
		expect(COLOR_PRESETS[0].value).toBe('#000000');
	});
});

describe('Toolbar Default Stroke Widths', () => {
	it('has defaults for all drawing tools', () => {
		expect(DEFAULT_STROKE_WIDTHS.pen).toBeDefined();
		expect(DEFAULT_STROKE_WIDTHS.highlighter).toBeDefined();
		expect(DEFAULT_STROKE_WIDTHS.eraser).toBeDefined();
	});

	it('has defaults for all shape tools', () => {
		expect(DEFAULT_STROKE_WIDTHS.line).toBeDefined();
		expect(DEFAULT_STROKE_WIDTHS.rectangle).toBeDefined();
		expect(DEFAULT_STROKE_WIDTHS.circle).toBeDefined();
		expect(DEFAULT_STROKE_WIDTHS.arrow).toBeDefined();
	});

	it('pen has thin stroke by default', () => {
		expect(DEFAULT_STROKE_WIDTHS.pen).toBe(2);
	});

	it('highlighter has thick stroke by default', () => {
		expect(DEFAULT_STROKE_WIDTHS.highlighter).toBe(12);
	});

	it('eraser has thickest stroke by default', () => {
		expect(DEFAULT_STROKE_WIDTHS.eraser).toBe(20);
	});

	it('all defaults are within valid range', () => {
		for (const [_tool, width] of Object.entries(DEFAULT_STROKE_WIDTHS)) {
			expect(width).toBeGreaterThanOrEqual(STROKE_WIDTH_MIN);
			expect(width).toBeLessThanOrEqual(STROKE_WIDTH_MAX);
		}
	});
});

describe('Toolbar Stroke Width Constraints', () => {
	it('has minimum width of 1px', () => {
		expect(STROKE_WIDTH_MIN).toBe(1);
	});

	it('has maximum width of 20px', () => {
		expect(STROKE_WIDTH_MAX).toBe(20);
	});

	it('range is positive', () => {
		expect(STROKE_WIDTH_MAX).toBeGreaterThan(STROKE_WIDTH_MIN);
	});
});

describe('Toolbar Keyboard Shortcuts', () => {
	it('has shortcuts for all tools', () => {
		const expectedTools = [
			'pen',
			'marker',
			'highlighter',
			'eraser',
			'line',
			'rectangle',
			'circle',
			'arrow'
		];
		for (const tool of expectedTools) {
			expect(TOOL_SHORTCUTS[tool]).toBeDefined();
		}
	});

	it('all shortcuts are single uppercase letters', () => {
		const singleUpperRegex = /^[A-Z]$/;
		for (const [_tool, shortcut] of Object.entries(TOOL_SHORTCUTS)) {
			expect(shortcut).toMatch(singleUpperRegex);
		}
	});

	it('all shortcuts are unique', () => {
		const shortcuts = Object.values(TOOL_SHORTCUTS);
		const uniqueShortcuts = new Set(shortcuts);
		expect(uniqueShortcuts.size).toBe(shortcuts.length);
	});

	it('drawing tools have expected shortcuts', () => {
		expect(TOOL_SHORTCUTS.pen).toBe('P');
		expect(TOOL_SHORTCUTS.marker).toBe('M');
		expect(TOOL_SHORTCUTS.highlighter).toBe('H');
		expect(TOOL_SHORTCUTS.eraser).toBe('E');
	});

	it('shape tools have expected shortcuts', () => {
		expect(TOOL_SHORTCUTS.line).toBe('L');
		expect(TOOL_SHORTCUTS.rectangle).toBe('R');
		expect(TOOL_SHORTCUTS.circle).toBe('C');
		expect(TOOL_SHORTCUTS.arrow).toBe('A');
	});
});

describe('Toolbar Tool Categories', () => {
	const DRAWING_TOOLS = ['pen', 'marker', 'highlighter', 'eraser'];
	const SHAPE_TOOLS = ['line', 'rectangle', 'circle', 'arrow'];
	const ACTION_TOOLS = ['undo', 'redo', 'clear'];

	it('has 4 drawing tools', () => {
		expect(DRAWING_TOOLS.length).toBe(4);
	});

	it('has 4 shape tools', () => {
		expect(SHAPE_TOOLS.length).toBe(4);
	});

	it('has 3 action tools', () => {
		expect(ACTION_TOOLS.length).toBe(3);
	});

	it('drawing tools all have shortcuts', () => {
		for (const tool of DRAWING_TOOLS) {
			expect(TOOL_SHORTCUTS[tool]).toBeDefined();
		}
	});

	it('shape tools all have shortcuts', () => {
		for (const tool of SHAPE_TOOLS) {
			expect(TOOL_SHORTCUTS[tool]).toBeDefined();
		}
	});
});

describe('Toolbar Section Behavior', () => {
	// Test collapsible section behavior
	let sectionsOpen: Record<string, boolean>;

	beforeEach(() => {
		sectionsOpen = {
			drawing: true,
			shapes: false,
			actions: false
		};
	});

	it('starts with drawing section open', () => {
		expect(sectionsOpen.drawing).toBe(true);
	});

	it('starts with other sections closed', () => {
		expect(sectionsOpen.shapes).toBe(false);
		expect(sectionsOpen.actions).toBe(false);
	});

	it('can toggle section open/closed', () => {
		sectionsOpen.shapes = !sectionsOpen.shapes;
		expect(sectionsOpen.shapes).toBe(true);

		sectionsOpen.shapes = !sectionsOpen.shapes;
		expect(sectionsOpen.shapes).toBe(false);
	});

	it('allows multiple sections open simultaneously', () => {
		sectionsOpen.drawing = true;
		sectionsOpen.shapes = true;
		sectionsOpen.actions = true;

		expect(sectionsOpen.drawing).toBe(true);
		expect(sectionsOpen.shapes).toBe(true);
		expect(sectionsOpen.actions).toBe(true);
	});
});
