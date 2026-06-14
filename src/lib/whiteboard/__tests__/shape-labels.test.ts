/**
 * Tests for Shape Label functionality
 *
 * Tests label parsing, store methods, and integration
 */

import { describe, it, expect } from 'vitest';
import { parseLabelToInline, hasLabelContent } from '../utils/label-parser';
import type { ShapeElement } from '../types/document';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a shape element for testing
 */
function createShapeElement(
	shapeType: ShapeElement['shapeType'] = 'rectangle',
	labelMarkdown?: string
): ShapeElement {
	const base: ShapeElement = {
		id: crypto.randomUUID(),
		type: 'shape',
		shapeType,
		start: { x: 100, y: 100 },
		end: { x: 200, y: 150 },
		color: '#000000',
		strokeWidth: 2,
		opacity: 1
	};

	if (labelMarkdown !== undefined) {
		return { ...base, labelMarkdown };
	}
	return base;
}

// =============================================================================
// Label Parser Tests
// =============================================================================

describe('parseLabelToInline', () => {
	it('should return empty array for empty string', () => {
		expect(parseLabelToInline('')).toEqual([]);
		expect(parseLabelToInline('   ')).toEqual([]);
	});

	it('should parse plain text', () => {
		const result = parseLabelToInline('A');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ type: 'text', content: 'A' });
	});

	it('should parse bold text', () => {
		const result = parseLabelToInline('**bold**');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ type: 'text', content: 'bold', bold: true });
	});

	it('should parse italic text', () => {
		const result = parseLabelToInline('*italic*');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ type: 'text', content: 'italic', italic: true });
	});

	it('should parse inline math', () => {
		const result = parseLabelToInline('$x^2$');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ type: 'math-inline', syntax: 'latex' });
	});

	it('should parse mixed content', () => {
		const result = parseLabelToInline('Point **A**');
		expect(result.length).toBeGreaterThanOrEqual(2);
		// First node is text "Point "
		expect(result[0]).toMatchObject({ type: 'text' });
		// Second node is bold "A"
		const boldNode = result.find((n) => n.type === 'text' && 'bold' in n && n.bold);
		expect(boldNode).toBeDefined();
	});

	it('should parse Greek letters in math', () => {
		const result = parseLabelToInline('$\\alpha$');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ type: 'math-inline' });
	});

	it('should parse fractions in math', () => {
		const result = parseLabelToInline('$\\frac{a}{b}$');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ type: 'math-inline' });
	});

	it('should handle malformed markdown gracefully', () => {
		// Should not throw, should return something reasonable
		const result = parseLabelToInline('**unclosed bold');
		expect(Array.isArray(result)).toBe(true);
	});
});

describe('hasLabelContent', () => {
	it('should return false for undefined', () => {
		expect(hasLabelContent(undefined)).toBe(false);
	});

	it('should return false for empty string', () => {
		expect(hasLabelContent('')).toBe(false);
	});

	it('should return false for whitespace only', () => {
		expect(hasLabelContent('   ')).toBe(false);
		expect(hasLabelContent('\n\t')).toBe(false);
	});

	it('should return true for content', () => {
		expect(hasLabelContent('A')).toBe(true);
		expect(hasLabelContent('$x$')).toBe(true);
		expect(hasLabelContent('  A  ')).toBe(true);
	});
});

// =============================================================================
// Shape Element with Label Tests
// =============================================================================

describe('ShapeElement with label', () => {
	it('should create shape without label', () => {
		const shape = createShapeElement('rectangle');
		expect(shape.labelMarkdown).toBeUndefined();
	});

	it('should create shape with label', () => {
		const shape = createShapeElement('rectangle', 'A');
		expect(shape.labelMarkdown).toBe('A');
	});

	it('should create shape with math label', () => {
		const shape = createShapeElement('circle', '$\\pi r^2$');
		expect(shape.labelMarkdown).toBe('$\\pi r^2$');
	});

	it('should preserve label through spread', () => {
		const original = createShapeElement('rectangle', 'Test');
		const updated = { ...original, color: '#ff0000' };
		expect(updated.labelMarkdown).toBe('Test');
	});
});

// =============================================================================
// Label Update Logic Tests
// =============================================================================

describe('Label update logic', () => {
	it('should add label to shape without one', () => {
		const shape = createShapeElement('rectangle');
		const updated = { ...shape, labelMarkdown: 'New Label' };
		expect(updated.labelMarkdown).toBe('New Label');
	});

	it('should update existing label', () => {
		const shape = createShapeElement('rectangle', 'Old');
		const updated = { ...shape, labelMarkdown: 'New' };
		expect(updated.labelMarkdown).toBe('New');
	});

	it('should remove label by setting to undefined', () => {
		const shape = createShapeElement('rectangle', 'Label');

		const { labelMarkdown: _, ...rest } = shape;
		expect(rest).not.toHaveProperty('labelMarkdown');
	});
});

// =============================================================================
// Integration with Bounds Calculation
// =============================================================================

describe('Label positioning', () => {
	it('should calculate center from start/end points', () => {
		const shape = createShapeElement('rectangle', 'Center');
		const centerX = (shape.start.x + shape.end.x) / 2;
		const centerY = (shape.start.y + shape.end.y) / 2;
		expect(centerX).toBe(150);
		expect(centerY).toBe(125);
	});

	it('should handle negative dimensions (end < start)', () => {
		const shape: ShapeElement = {
			...createShapeElement('rectangle'),
			start: { x: 200, y: 200 },
			end: { x: 100, y: 100 }
		};
		const minX = Math.min(shape.start.x, shape.end.x);
		const maxX = Math.max(shape.start.x, shape.end.x);
		const centerX = (minX + maxX) / 2;
		expect(centerX).toBe(150);
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge cases', () => {
	it('should handle empty label string', () => {
		const shape = createShapeElement('rectangle', '');
		expect(hasLabelContent(shape.labelMarkdown)).toBe(false);
	});

	it('should handle very long labels', () => {
		const longLabel = 'A'.repeat(1000);
		const shape = createShapeElement('rectangle', longLabel);
		expect(shape.labelMarkdown).toBe(longLabel);
	});

	it('should handle special characters in labels', () => {
		const result = parseLabelToInline('<script>alert("xss")</script>');
		// Should be parsed as text, not executed
		expect(result.length).toBeGreaterThan(0);
	});

	it('should handle unicode in labels', () => {
		const result = parseLabelToInline('α β γ');
		expect(result.length).toBeGreaterThan(0);
	});

	it('should handle newlines in labels', () => {
		const result = parseLabelToInline('Line1\nLine2');
		// Should handle gracefully (possibly as single paragraph)
		expect(Array.isArray(result)).toBe(true);
	});
});
