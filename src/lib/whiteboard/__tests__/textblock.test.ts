/**
 * Tests for TextBlock functionality
 *
 * Tests text block state management, constraints, and serialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TextBlockElement, Point } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** Default dimensions for new text blocks */
const DEFAULT_TEXT_BLOCK_WIDTH = 300;
const DEFAULT_TEXT_BLOCK_HEIGHT = 100;

/** Minimum dimensions for text blocks */
const MIN_TEXT_BLOCK_WIDTH = 150;
const MIN_TEXT_BLOCK_HEIGHT = 50;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new text block element at the given position
 */
function createTextBlockElement(
	position: Point,
	width: number = DEFAULT_TEXT_BLOCK_WIDTH,
	height: number = DEFAULT_TEXT_BLOCK_HEIGHT,
	markdownContent: string = ''
): TextBlockElement {
	return {
		id: crypto.randomUUID(),
		type: 'textblock',
		position,
		width: Math.max(width, MIN_TEXT_BLOCK_WIDTH),
		height: Math.max(height, MIN_TEXT_BLOCK_HEIGHT),
		markdownContent
	};
}

/**
 * Check if a point is inside a text block bounds
 */
function isPointInTextBlock(point: Point, block: TextBlockElement): boolean {
	return (
		point.x >= block.position.x &&
		point.x <= block.position.x + block.width &&
		point.y >= block.position.y &&
		point.y <= block.position.y + block.height
	);
}

/**
 * Resize a text block with minimum constraints
 */
function resizeTextBlock(
	block: TextBlockElement,
	newWidth: number,
	newHeight: number
): TextBlockElement {
	return {
		...block,
		width: Math.max(newWidth, MIN_TEXT_BLOCK_WIDTH),
		height: Math.max(newHeight, MIN_TEXT_BLOCK_HEIGHT)
	};
}

/**
 * Move a text block to a new position
 */
function moveTextBlock(block: TextBlockElement, newPosition: Point): TextBlockElement {
	return {
		...block,
		position: newPosition
	};
}

/**
 * Update text block content
 */
function updateTextBlockContent(
	block: TextBlockElement,
	markdownContent: string
): TextBlockElement {
	return {
		...block,
		markdownContent
	};
}

// =============================================================================
// Tests
// =============================================================================

describe('TextBlockElement Type', () => {
	it('has correct type discriminator', () => {
		const block = createTextBlockElement({ x: 100, y: 100 });
		expect(block.type).toBe('textblock');
	});

	it('has a valid UUID id', () => {
		const block = createTextBlockElement({ x: 100, y: 100 });
		expect(block.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
	});

	it('has position, width, height, and markdownContent', () => {
		const block = createTextBlockElement({ x: 50, y: 75 }, 400, 200, '# Hello');
		expect(block.position).toEqual({ x: 50, y: 75 });
		expect(block.width).toBe(400);
		expect(block.height).toBe(200);
		expect(block.markdownContent).toBe('# Hello');
	});
});

describe('TextBlock Creation', () => {
	it('creates a text block with default dimensions', () => {
		const block = createTextBlockElement({ x: 100, y: 200 });
		expect(block.width).toBe(DEFAULT_TEXT_BLOCK_WIDTH);
		expect(block.height).toBe(DEFAULT_TEXT_BLOCK_HEIGHT);
	});

	it('creates a text block with custom dimensions', () => {
		const block = createTextBlockElement({ x: 100, y: 200 }, 500, 300);
		expect(block.width).toBe(500);
		expect(block.height).toBe(300);
	});

	it('creates a text block with empty content by default', () => {
		const block = createTextBlockElement({ x: 100, y: 200 });
		expect(block.markdownContent).toBe('');
	});

	it('creates a text block with initial content', () => {
		const block = createTextBlockElement({ x: 100, y: 200 }, 300, 100, '**Bold text**');
		expect(block.markdownContent).toBe('**Bold text**');
	});

	it('enforces minimum width', () => {
		const block = createTextBlockElement({ x: 100, y: 200 }, 50, 100);
		expect(block.width).toBe(MIN_TEXT_BLOCK_WIDTH);
	});

	it('enforces minimum height', () => {
		const block = createTextBlockElement({ x: 100, y: 200 }, 300, 20);
		expect(block.height).toBe(MIN_TEXT_BLOCK_HEIGHT);
	});
});

describe('TextBlock Position', () => {
	it('can be positioned at any point', () => {
		const block = createTextBlockElement({ x: 500, y: 600 });
		expect(block.position.x).toBe(500);
		expect(block.position.y).toBe(600);
	});

	it('allows negative positions (for off-canvas)', () => {
		const block = createTextBlockElement({ x: -50, y: -30 });
		expect(block.position.x).toBe(-50);
		expect(block.position.y).toBe(-30);
	});

	it('can be moved to a new position', () => {
		const block = createTextBlockElement({ x: 100, y: 100 });
		const moved = moveTextBlock(block, { x: 200, y: 300 });
		expect(moved.position).toEqual({ x: 200, y: 300 });
	});

	it('preserves other properties when moved', () => {
		const block = createTextBlockElement({ x: 100, y: 100 }, 400, 200, 'Test content');
		const moved = moveTextBlock(block, { x: 200, y: 300 });
		expect(moved.id).toBe(block.id);
		expect(moved.width).toBe(400);
		expect(moved.height).toBe(200);
		expect(moved.markdownContent).toBe('Test content');
	});
});

describe('TextBlock Resize', () => {
	let block: TextBlockElement;

	beforeEach(() => {
		block = createTextBlockElement({ x: 100, y: 100 }, 300, 150);
	});

	it('can be resized to larger dimensions', () => {
		const resized = resizeTextBlock(block, 500, 400);
		expect(resized.width).toBe(500);
		expect(resized.height).toBe(400);
	});

	it('enforces minimum width on resize', () => {
		const resized = resizeTextBlock(block, 50, 200);
		expect(resized.width).toBe(MIN_TEXT_BLOCK_WIDTH);
	});

	it('enforces minimum height on resize', () => {
		const resized = resizeTextBlock(block, 300, 10);
		expect(resized.height).toBe(MIN_TEXT_BLOCK_HEIGHT);
	});

	it('preserves position when resized', () => {
		const resized = resizeTextBlock(block, 500, 400);
		expect(resized.position).toEqual({ x: 100, y: 100 });
	});

	it('preserves content when resized', () => {
		const withContent = { ...block, markdownContent: 'Some content' };
		const resized = resizeTextBlock(withContent, 500, 400);
		expect(resized.markdownContent).toBe('Some content');
	});
});

describe('TextBlock Content', () => {
	it('can store plain text', () => {
		const block = createTextBlockElement({ x: 0, y: 0 }, 300, 100, 'Plain text content');
		expect(block.markdownContent).toBe('Plain text content');
	});

	it('can store markdown formatting', () => {
		const markdown = '# Heading\n\n**Bold** and *italic*';
		const block = createTextBlockElement({ x: 0, y: 0 }, 300, 100, markdown);
		expect(block.markdownContent).toBe(markdown);
	});

	it('can store LaTeX formulas', () => {
		const latex = 'The formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$';
		const block = createTextBlockElement({ x: 0, y: 0 }, 300, 100, latex);
		expect(block.markdownContent).toBe(latex);
	});

	it('can update content', () => {
		const block = createTextBlockElement({ x: 0, y: 0 }, 300, 100, 'Initial');
		const updated = updateTextBlockContent(block, 'Updated content');
		expect(updated.markdownContent).toBe('Updated content');
	});

	it('preserves dimensions when content updated', () => {
		const block = createTextBlockElement({ x: 100, y: 200 }, 400, 300, 'Initial');
		const updated = updateTextBlockContent(block, 'New content');
		expect(updated.width).toBe(400);
		expect(updated.height).toBe(300);
		expect(updated.position).toEqual({ x: 100, y: 200 });
	});
});

describe('TextBlock Hit Testing', () => {
	let block: TextBlockElement;

	beforeEach(() => {
		// Block at (100, 100) with size 300x200
		block = createTextBlockElement({ x: 100, y: 100 }, 300, 200);
	});

	it('detects point inside block', () => {
		expect(isPointInTextBlock({ x: 200, y: 200 }, block)).toBe(true);
	});

	it('detects point on top-left corner', () => {
		expect(isPointInTextBlock({ x: 100, y: 100 }, block)).toBe(true);
	});

	it('detects point on bottom-right corner', () => {
		expect(isPointInTextBlock({ x: 400, y: 300 }, block)).toBe(true);
	});

	it('rejects point above block', () => {
		expect(isPointInTextBlock({ x: 200, y: 50 }, block)).toBe(false);
	});

	it('rejects point below block', () => {
		expect(isPointInTextBlock({ x: 200, y: 350 }, block)).toBe(false);
	});

	it('rejects point left of block', () => {
		expect(isPointInTextBlock({ x: 50, y: 200 }, block)).toBe(false);
	});

	it('rejects point right of block', () => {
		expect(isPointInTextBlock({ x: 450, y: 200 }, block)).toBe(false);
	});
});

describe('TextBlock Serialization', () => {
	it('can serialize to JSON', () => {
		const block = createTextBlockElement({ x: 100, y: 200 }, 300, 150, '# Title\n\nContent');
		const json = JSON.stringify(block);
		const parsed = JSON.parse(json);

		expect(parsed.type).toBe('textblock');
		expect(parsed.position).toEqual({ x: 100, y: 200 });
		expect(parsed.width).toBe(300);
		expect(parsed.height).toBe(150);
		expect(parsed.markdownContent).toBe('# Title\n\nContent');
	});

	it('preserves special characters in content', () => {
		const content = 'Formula: $\\alpha + \\beta = \\gamma$\n\n```js\nconst x = 1;\n```';
		const block = createTextBlockElement({ x: 0, y: 0 }, 300, 100, content);
		const json = JSON.stringify(block);
		const parsed = JSON.parse(json);

		expect(parsed.markdownContent).toBe(content);
	});

	it('serializes empty content correctly', () => {
		const block = createTextBlockElement({ x: 0, y: 0 });
		const json = JSON.stringify(block);
		const parsed = JSON.parse(json);

		expect(parsed.markdownContent).toBe('');
	});
});

describe('TextBlock Edit State Management', () => {
	// These tests verify the expected behavior patterns for edit state
	// The actual edit state is managed by the component, not stored in the element

	interface TextBlockEditState {
		blockId: string | null;
		isEditing: boolean;
	}

	function createEditState(): TextBlockEditState {
		return { blockId: null, isEditing: false };
	}

	function startEditing(state: TextBlockEditState, blockId: string): TextBlockEditState {
		return { blockId, isEditing: true };
	}

	function stopEditing(_state: TextBlockEditState): TextBlockEditState {
		return { blockId: null, isEditing: false };
	}

	it('starts with no block being edited', () => {
		const state = createEditState();
		expect(state.isEditing).toBe(false);
		expect(state.blockId).toBeNull();
	});

	it('can enter edit mode for a block', () => {
		let state = createEditState();
		state = startEditing(state, 'block-123');
		expect(state.isEditing).toBe(true);
		expect(state.blockId).toBe('block-123');
	});

	it('can exit edit mode', () => {
		let state = createEditState();
		state = startEditing(state, 'block-123');
		state = stopEditing(state);
		expect(state.isEditing).toBe(false);
		expect(state.blockId).toBeNull();
	});

	it('switching to another block updates the editing block', () => {
		let state = createEditState();
		state = startEditing(state, 'block-1');
		state = startEditing(state, 'block-2');
		expect(state.blockId).toBe('block-2');
	});
});

describe('TextBlock Tool Behavior', () => {
	// Tests for tool-related behavior patterns

	it('text tool creates block at click position', () => {
		const clickPosition: Point = { x: 250, y: 350 };
		const block = createTextBlockElement(clickPosition);
		expect(block.position).toEqual(clickPosition);
	});

	it('newly created blocks have default dimensions', () => {
		const block = createTextBlockElement({ x: 100, y: 100 });
		expect(block.width).toBe(DEFAULT_TEXT_BLOCK_WIDTH);
		expect(block.height).toBe(DEFAULT_TEXT_BLOCK_HEIGHT);
	});

	it('minimum dimensions are enforced consistently', () => {
		// Test various undersized inputs
		const tests = [
			{ w: 0, h: 0 },
			{ w: 100, h: 25 },
			{ w: 50, h: 100 },
			{ w: -10, h: -10 }
		];

		for (const { w, h } of tests) {
			const block = createTextBlockElement({ x: 0, y: 0 }, w, h);
			expect(block.width).toBeGreaterThanOrEqual(MIN_TEXT_BLOCK_WIDTH);
			expect(block.height).toBeGreaterThanOrEqual(MIN_TEXT_BLOCK_HEIGHT);
		}
	});
});

describe('TextBlock Multiple Blocks', () => {
	it('can create multiple independent blocks', () => {
		const block1 = createTextBlockElement({ x: 100, y: 100 }, 300, 150, 'Block 1');
		const block2 = createTextBlockElement({ x: 500, y: 100 }, 300, 150, 'Block 2');

		expect(block1.id).not.toBe(block2.id);
		expect(block1.markdownContent).toBe('Block 1');
		expect(block2.markdownContent).toBe('Block 2');
	});

	it('blocks can overlap', () => {
		const block1 = createTextBlockElement({ x: 100, y: 100 }, 300, 200);
		const block2 = createTextBlockElement({ x: 200, y: 150 }, 300, 200);

		// Point in overlap region
		const overlapPoint: Point = { x: 250, y: 200 };
		expect(isPointInTextBlock(overlapPoint, block1)).toBe(true);
		expect(isPointInTextBlock(overlapPoint, block2)).toBe(true);
	});
});
