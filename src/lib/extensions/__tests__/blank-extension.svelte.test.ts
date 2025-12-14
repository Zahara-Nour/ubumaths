/**
 * Blank Extension Test Suite
 * ==========================
 *
 * Tests for the BlankField TipTap extension:
 * - Syntax: {{blank:N}} where N is a positive integer
 * - Creates visual chips for answer blanks in exercises
 *
 * The blank number N corresponds to the answer field index,
 * allowing multiple blanks in a single exercise.
 */

import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { BlankField, validateBlankNumber } from '../blank-extension';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Creates a test editor with blank extension
 */
function createTestEditor(content = ''): Editor {
	return new Editor({
		extensions: [StarterKit, BlankField],
		content
	});
}

/**
 * Inserts text content into the editor
 */
function insertText(editor: Editor, text: string): void {
	editor.chain().focus().insertContent(text).run();
}

/**
 * Gets the HTML output from the editor
 */
function getHTML(editor: Editor): string {
	return editor.getHTML();
}

/**
 * Gets the JSON output from the editor
 */
function getJSON(editor: Editor): unknown {
	return editor.getJSON();
}

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('BlankField Validation', () => {
	describe('validateBlankNumber', () => {
		it('should accept positive integers', () => {
			expect(validateBlankNumber('1')).toBe(true);
			expect(validateBlankNumber('2')).toBe(true);
			expect(validateBlankNumber('10')).toBe(true);
			expect(validateBlankNumber('99')).toBe(true);
		});

		it('should reject zero', () => {
			expect(validateBlankNumber('0')).toBe(false);
		});

		it('should reject negative numbers', () => {
			expect(validateBlankNumber('-1')).toBe(false);
			expect(validateBlankNumber('-10')).toBe(false);
		});

		it('should reject non-integer values', () => {
			expect(validateBlankNumber('1.5')).toBe(false);
			expect(validateBlankNumber('2.0')).toBe(false);
		});

		it('should reject non-numeric values', () => {
			expect(validateBlankNumber('')).toBe(false);
			expect(validateBlankNumber('abc')).toBe(false);
			expect(validateBlankNumber('1a')).toBe(false);
			expect(validateBlankNumber('a1')).toBe(false);
		});

		it('should reject whitespace', () => {
			expect(validateBlankNumber(' 1')).toBe(false);
			expect(validateBlankNumber('1 ')).toBe(false);
			expect(validateBlankNumber(' ')).toBe(false);
		});
	});
});

// Note: InputRules are triggered by keyboard input, not insertContent.
// These rules are tested manually and work correctly in the browser.
// The pattern matching and validation logic is tested via the validation tests above.
// Tests for invalid inputs ({{blank:0}}, {{blank:abc}}, {{blank:-1}}) are not needed
// since insertContent doesn't trigger InputRules.

// ============================================================================
// HTML SERIALIZATION TESTS
// ============================================================================

describe('BlankField HTML Serialization', () => {
	it('should serialize to data-template-blank span', () => {
		const editor = createTestEditor('<p></p>');
		editor.commands.insertBlankField(1);

		const html = getHTML(editor);
		expect(html).toContain('data-template-blank');
		expect(html).toContain('1');
		editor.destroy();
	});

	it('should include blank number in serialized HTML', () => {
		const editor = createTestEditor('<p></p>');
		editor.commands.insertBlankField(3);

		const html = getHTML(editor);
		expect(html).toContain('data-template-blank="3"');
		editor.destroy();
	});

	it('should parse data-template-blank span back to node', () => {
		const html = '<p><span data-template-blank="2">{{blank:2}}</span></p>';
		const editor = createTestEditor(html);

		const json = getJSON(editor) as {
			content: Array<{ content: Array<{ type: string; attrs?: { number: number } }> }>;
		};
		const paragraph = json.content?.[0];
		const blankNode = paragraph?.content?.find(
			(node: { type: string }) => node.type === 'blankField'
		);

		expect(blankNode).toBeDefined();
		expect(blankNode?.attrs?.number).toBe(2);
		editor.destroy();
	});

	it('should preserve number through HTML roundtrip', () => {
		const editor = createTestEditor('<p></p>');
		editor.commands.insertBlankField(7);

		const html = getHTML(editor);
		editor.destroy();

		const editor2 = createTestEditor(html);
		const json = getJSON(editor2) as {
			content: Array<{ content: Array<{ type: string; attrs?: { number: number } }> }>;
		};
		const paragraph = json.content?.[0];
		const blankNode = paragraph?.content?.find(
			(node: { type: string }) => node.type === 'blankField'
		);

		expect(blankNode?.attrs?.number).toBe(7);
		editor2.destroy();
	});
});

// ============================================================================
// COMMAND TESTS
// ============================================================================

describe('BlankField Commands', () => {
	it('should insert blank via insertBlankField command', () => {
		const editor = createTestEditor('<p></p>');
		editor.commands.insertBlankField(1);

		const json = getJSON(editor) as {
			content: Array<{ content: Array<{ type: string; attrs?: { number: number } }> }>;
		};
		const paragraph = json.content?.[0];
		const blankNode = paragraph?.content?.find(
			(node: { type: string }) => node.type === 'blankField'
		);

		expect(blankNode).toBeDefined();
		expect(blankNode?.attrs?.number).toBe(1);
		editor.destroy();
	});

	it('should insert multiple blanks with different numbers', () => {
		const editor = createTestEditor('<p></p>');
		editor.commands.insertBlankField(1);
		insertText(editor, ' + ');
		editor.commands.insertBlankField(2);
		insertText(editor, ' = ');
		editor.commands.insertBlankField(3);

		const json = getJSON(editor) as {
			content: Array<{ content: Array<{ type: string; attrs?: { number: number } }> }>;
		};
		const paragraph = json.content?.[0];
		const blankNodes =
			paragraph?.content?.filter((node: { type: string }) => node.type === 'blankField') || [];

		expect(blankNodes.length).toBe(3);
		expect(blankNodes[0]?.attrs?.number).toBe(1);
		expect(blankNodes[1]?.attrs?.number).toBe(2);
		expect(blankNodes[2]?.attrs?.number).toBe(3);
		editor.destroy();
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('BlankField Integration', () => {
	it('should work alongside text content', () => {
		const editor = createTestEditor('<p>Calculate: </p>');
		editor.commands.insertBlankField(1);
		insertText(editor, ' + ');
		editor.commands.insertBlankField(2);

		const html = getHTML(editor);
		expect(html).toContain('Calculate:');
		expect(html).toContain('data-template-blank="1"');
		expect(html).toContain('data-template-blank="2"');
		editor.destroy();
	});

	it('should handle large blank numbers', () => {
		const editor = createTestEditor('<p></p>');
		editor.commands.insertBlankField(99);

		const json = getJSON(editor) as {
			content: Array<{ content: Array<{ type: string; attrs?: { number: number } }> }>;
		};
		const paragraph = json.content?.[0];
		const blankNode = paragraph?.content?.find(
			(node: { type: string }) => node.type === 'blankField'
		);

		expect(blankNode?.attrs?.number).toBe(99);
		editor.destroy();
	});
});
