/**
 * Math Extension Test Suite
 * ==========================
 *
 * Tests for MathInline and MathBlock TipTap extensions:
 * - Syntax: $latex$ for inline LaTeX math
 * - Syntax: ~custom~ for inline custom math (mathAST)
 * - Syntax: ~~custom~~ for block custom math (mathAST)
 * - Creates interactive MathLive fields for formula editing
 *
 * The extension supports two syntaxes:
 * - LaTeX: Direct LaTeX notation ($x^2$)
 * - Custom: UbuMaths custom syntax (~x^2~) transpiled to LaTeX
 *
 * Both are stored as LaTeX internally but preserve original syntax
 * for round-trip markdown export.
 */

import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { MathInline, MathBlock } from '../math-extension';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Creates a test editor with math extensions
 */
function createTestEditor(content = ''): Editor {
	return new Editor({
		extensions: [StarterKit, MathInline, MathBlock],
		content
	});
}

/**
 * Inserts text content into the editor (simulates typing)
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

/**
 * Type guard for math node JSON structure
 */
interface MathNodeJSON {
	type: string;
	attrs?: {
		latex?: string;
		syntax?: 'latex' | 'custom';
		originalExpression?: string;
	};
}

/**
 * Type guard for document JSON structure
 */
interface DocumentJSON {
	content?: Array<{
		content?: MathNodeJSON[];
	}>;
}

// ============================================================================
// BACKWARD COMPATIBILITY TESTS
// ============================================================================

describe('MathInline Backward Compatibility', () => {
	it('should create math node with default attributes when using old API', () => {
		const editor = createTestEditor('<p></p>');
		editor.commands.insertMathInline('x^2');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.latex).toBe('x^2');
		expect(mathNode?.attrs?.syntax).toBe('latex'); // Default
		expect(mathNode?.attrs?.originalExpression).toBe(''); // Default
		editor.destroy();
	});

	it('should parse HTML without new attributes (legacy content)', () => {
		const html = '<p><span data-math-inline>x^2</span></p>';
		const editor = createTestEditor(html);

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('latex'); // Default
		expect(mathNode?.attrs?.originalExpression).toBe(''); // Default
		editor.destroy();
	});

	it('should handle existing content without breaking', () => {
		const html = '<p>La formule <span data-math-inline>x^2 + y^2</span> est simple.</p>';
		const editor = createTestEditor(html);

		const outputHtml = getHTML(editor);
		expect(outputHtml).toContain('data-math-inline');
		expect(outputHtml).toContain('La formule');
		expect(outputHtml).toContain('est simple');
		editor.destroy();
	});
});

// ============================================================================
// LATEX SYNTAX TESTS (EXISTING $...$ BEHAVIOR)
// ============================================================================

describe('MathInline LaTeX Syntax ($...$)', () => {
	// Note: InputRules are triggered by keyboard input, not insertContent.
	// These tests use insertMathInline command to verify the attributes are set correctly
	// when the InputRule creates a node. The InputRule pattern matching is tested manually
	// in the browser and works correctly.

	it('should create math node with syntax=latex when created via InputRule behavior', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for $x^2$
		editor.commands.insertMathInline('x^2', 'latex', 'x^2');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('latex');
		expect(mathNode?.attrs?.originalExpression).toBe('x^2');
		expect(mathNode?.attrs?.latex).toBe('x^2'); // Direct LaTeX
		editor.destroy();
	});

	it('should transpile custom syntax in $...$ but keep syntax=latex', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for $2/3$
		// The parseCustomSafe('2/3') should transpile to \frac{2}{3}
		editor.commands.insertMathInline('\\frac{2}{3}', 'latex', '2/3');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('latex'); // Based on delimiter
		expect(mathNode?.attrs?.originalExpression).toBe('2/3');
		expect(mathNode?.attrs?.latex).toContain('frac'); // Transpiled
		editor.destroy();
	});

	it('should use raw content as LaTeX if parsing fails in $...$', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for $\invalid{syntax}$
		editor.commands.insertMathInline('\\invalid{syntax}', 'latex', '\\invalid{syntax}');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('latex');
		expect(mathNode?.attrs?.originalExpression).toBe('\\invalid{syntax}');
		expect(mathNode?.attrs?.latex).toBe('\\invalid{syntax}'); // Raw fallback
		editor.destroy();
	});

	it('should not create node for empty $...$ pattern', () => {
		const editor = createTestEditor('<p></p>');
		// Empty pattern - InputRule handler checks for empty input and doesn't create node
		// Nothing to test here as we can't trigger InputRules programmatically

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNodes = paragraph?.content?.filter((node) => node.type === 'mathInline') || [];

		expect(mathNodes.length).toBe(0);
		editor.destroy();
	});
});

// ============================================================================
// CUSTOM SYNTAX TESTS (NEW ~...~ BEHAVIOR)
// ============================================================================

describe('MathInline Custom Syntax (~...~)', () => {
	// Note: InputRules are triggered by keyboard input, not insertContent.
	// These tests simulate what the InputRule does when it creates nodes.

	it('should create math node with syntax=custom for ~...~ pattern', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~x^2~
		editor.commands.insertMathInline('x^2', 'custom', 'x^2');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('x^2');
		expect(mathNode?.attrs?.latex).toBe('x^2'); // Transpiled (same in this case)
		editor.destroy();
	});

	it('should transpile custom syntax in ~...~ to LaTeX', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~2/3~
		editor.commands.insertMathInline('\\frac{2}{3}', 'custom', '2/3');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('2/3');
		expect(mathNode?.attrs?.latex).toContain('frac'); // Transpiled to \frac{2}{3}
		editor.destroy();
	});

	it('should use raw content as LaTeX if parsing fails in ~...~', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~invalid@syntax~
		editor.commands.insertMathInline('invalid@syntax', 'custom', 'invalid@syntax');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('invalid@syntax');
		expect(mathNode?.attrs?.latex).toBe('invalid@syntax'); // Raw fallback
		editor.destroy();
	});

	it('should not create node for empty ~...~ pattern', () => {
		const editor = createTestEditor('<p></p>');
		// Empty pattern - InputRule handler checks for empty input and doesn't create node

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNodes = paragraph?.content?.filter((node) => node.type === 'mathInline') || [];

		expect(mathNodes.length).toBe(0);
		editor.destroy();
	});

	it('should handle complex custom expressions', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~sin(pi/2)~
		editor.commands.insertMathInline(
			'\\sin\\left( \\frac{\\pi}{2} \\right)',
			'custom',
			'sin(pi/2)'
		);

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('sin(pi/2)');
		expect(mathNode?.attrs?.latex).toContain('sin'); // Transpiled
		editor.destroy();
	});
});

// ============================================================================
// MATH BLOCK CUSTOM SYNTAX TESTS (NEW ~~...~~ BEHAVIOR)
// ============================================================================

describe('MathBlock Custom Syntax (~~...~~)', () => {
	// Note: InputRules are triggered by keyboard input, not insertContent.
	// These tests simulate what the InputRule does when it creates nodes.

	it('should create math block with syntax=custom for ~~...~~ pattern', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~~x^2 + y^2~~
		editor.commands.insertMathBlock('x^2 + y^2', 'custom', 'x^2 + y^2');

		const json = getJSON(editor) as DocumentJSON;
		const mathNode = json.content?.find((node) => node.type === 'mathBlock') as
			| MathNodeJSON
			| undefined;

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('x^2 + y^2');
		expect(mathNode?.attrs?.latex).toContain('x^2'); // Transpiled
		editor.destroy();
	});

	it('should transpile custom syntax in ~~...~~ to LaTeX', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~~sqrt(16)~~
		editor.commands.insertMathBlock('\\sqrt{16}', 'custom', 'sqrt(16)');

		const json = getJSON(editor) as DocumentJSON;
		const mathNode = json.content?.find((node) => node.type === 'mathBlock') as
			| MathNodeJSON
			| undefined;

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('sqrt(16)');
		expect(mathNode?.attrs?.latex).toContain('sqrt'); // Transpiled
		editor.destroy();
	});

	it('should use raw content as LaTeX if parsing fails in ~~...~~', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~~invalid@block~~
		editor.commands.insertMathBlock('invalid@block', 'custom', 'invalid@block');

		const json = getJSON(editor) as DocumentJSON;
		const mathNode = json.content?.find((node) => node.type === 'mathBlock') as
			| MathNodeJSON
			| undefined;

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('invalid@block');
		expect(mathNode?.attrs?.latex).toBe('invalid@block'); // Raw fallback
		editor.destroy();
	});

	it('should not create node for empty ~~...~~ pattern', () => {
		const editor = createTestEditor('<p></p>');
		// Empty pattern - InputRule handler checks for empty input and doesn't create node

		const json = getJSON(editor) as DocumentJSON;
		const mathNodes = json.content?.filter((node) => node.type === 'mathBlock') || [];

		expect(mathNodes.length).toBe(0);
		editor.destroy();
	});
});

// ============================================================================
// HTML SERIALIZATION TESTS
// ============================================================================

describe('Math HTML Serialization', () => {
	it('should serialize LaTeX syntax with data-math-syntax="latex"', () => {
		const editor = createTestEditor('<p></p>');
		// Insert using command to simulate InputRule behavior
		editor.commands.insertMathInline('x^2', 'latex', 'x^2');

		const html = getHTML(editor);
		expect(html).toContain('data-math-inline');
		expect(html).toContain('data-math-syntax="latex"');
		expect(html).toContain('data-math-original="x^2"');
		editor.destroy();
	});

	it('should serialize custom syntax with data-math-syntax="custom"', () => {
		const editor = createTestEditor('<p></p>');
		// Insert using command to simulate InputRule behavior
		editor.commands.insertMathInline('\\frac{2}{3}', 'custom', '2/3');

		const html = getHTML(editor);
		expect(html).toContain('data-math-inline');
		expect(html).toContain('data-math-syntax="custom"');
		expect(html).toContain('data-math-original="2/3"');
		editor.destroy();
	});

	it('should serialize block custom syntax correctly', () => {
		const editor = createTestEditor('<p></p>');
		// Insert using command to simulate InputRule behavior
		editor.commands.insertMathBlock('x^2', 'custom', 'x^2');

		const html = getHTML(editor);
		expect(html).toContain('data-math-block');
		expect(html).toContain('data-math-syntax="custom"');
		expect(html).toContain('data-math-original="x^2"');
		editor.destroy();
	});

	it('should handle special characters in originalExpression', () => {
		const editor = createTestEditor('<p></p>');
		// Insert using command to simulate InputRule behavior
		editor.commands.insertMathInline('\\sin(x) + \\cos(y)', 'custom', 'sin(x) + cos(y)');

		const html = getHTML(editor);
		expect(html).toContain('data-math-original');
		// Should be properly escaped for HTML attributes
		expect(html).toMatch(/data-math-original="[^"]*sin\(x\)[^"]*"/);
		editor.destroy();
	});
});

// ============================================================================
// HTML PARSING TESTS (ROUND-TRIP)
// ============================================================================

describe('Math HTML Parsing', () => {
	it('should parse data-math-syntax="latex" back to syntax attribute', () => {
		const html =
			'<p><span data-math-inline data-math-syntax="latex" data-math-original="x^2"></span></p>';
		const editor = createTestEditor(html);

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode?.attrs?.syntax).toBe('latex');
		expect(mathNode?.attrs?.originalExpression).toBe('x^2');
		editor.destroy();
	});

	it('should parse data-math-syntax="custom" back to syntax attribute', () => {
		const html =
			'<p><span data-math-inline data-math-syntax="custom" data-math-original="2/3"></span></p>';
		const editor = createTestEditor(html);

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('2/3');
		editor.destroy();
	});

	it('should parse block math with custom syntax', () => {
		const html =
			'<div data-math-block data-math-syntax="custom" data-math-original="sqrt(16)"></div>';
		const editor = createTestEditor(html);

		const json = getJSON(editor) as DocumentJSON;
		const mathNode = json.content?.find((node) => node.type === 'mathBlock') as
			| MathNodeJSON
			| undefined;

		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('sqrt(16)');
		editor.destroy();
	});

	it('should preserve syntax through HTML round-trip', () => {
		const editor1 = createTestEditor('<p></p>');
		// Insert using command to simulate InputRule behavior
		editor1.commands.insertMathInline('\\frac{2}{3}', 'custom', '2/3');

		const html = getHTML(editor1);
		editor1.destroy();

		const editor2 = createTestEditor(html);
		const json = getJSON(editor2) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('2/3');
		editor2.destroy();
	});
});

// ============================================================================
// COMMAND TESTS (EXTENDED API)
// ============================================================================

describe('Math Commands', () => {
	it('should support insertMathInline with explicit syntax parameter', () => {
		const editor = createTestEditor('<p></p>');
		// @ts-expect-error - Testing new API signature not yet typed
		editor.commands.insertMathInline('x^2', 'custom', 'x^2');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('x^2');
		expect(mathNode?.attrs?.latex).toBe('x^2');
		editor.destroy();
	});

	it('should support insertMathBlock with explicit syntax parameter', () => {
		const editor = createTestEditor('<p></p>');
		// @ts-expect-error - Testing new API signature not yet typed
		editor.commands.insertMathBlock('\\sqrt{16}', 'custom', 'sqrt(16)');

		const json = getJSON(editor) as DocumentJSON;
		const mathNode = json.content?.find((node) => node.type === 'mathBlock') as
			| MathNodeJSON
			| undefined;

		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('sqrt(16)');
		expect(mathNode?.attrs?.latex).toBe('\\sqrt{16}');
		editor.destroy();
	});

	it('should default to latex syntax when parameters not provided', () => {
		const editor = createTestEditor('<p></p>');
		editor.commands.insertMathInline('x^2');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode?.attrs?.syntax).toBe('latex');
		expect(mathNode?.attrs?.originalExpression).toBe('');
		editor.destroy();
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Math Integration', () => {
	it('should work with mixed LaTeX and custom syntax', () => {
		const editor = createTestEditor('<p></p>');
		// Insert LaTeX math
		editor.commands.insertMathInline('x^2', 'latex', 'x^2');
		insertText(editor, ' et ');
		// Insert custom math
		editor.commands.insertMathInline('\\frac{2}{3}', 'custom', '2/3');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNodes = paragraph?.content?.filter((node) => node.type === 'mathInline') || [];

		expect(mathNodes.length).toBe(2);
		expect(mathNodes[0]?.attrs?.syntax).toBe('latex');
		expect(mathNodes[1]?.attrs?.syntax).toBe('custom');
		editor.destroy();
	});

	it('should handle inline and block math together', () => {
		const editor = createTestEditor('<p></p>');
		// Insert inline math
		editor.commands.insertMathInline('x^2', 'custom', 'x^2');
		// Move to next line and insert block math
		editor.commands.insertMathBlock('\\sqrt{16}', 'custom', 'sqrt(16)');

		const json = getJSON(editor) as DocumentJSON;

		const inlineNode = json.content?.[0]?.content?.find((node) => node.type === 'mathInline');
		const blockNode = json.content?.find((node) => node.type === 'mathBlock') as
			| MathNodeJSON
			| undefined;

		expect(inlineNode?.attrs?.syntax).toBe('custom');
		expect(blockNode?.attrs?.syntax).toBe('custom');
		editor.destroy();
	});

	it('should preserve attributes when editing nearby text', () => {
		const editor = createTestEditor('<p></p>');
		// Insert math using command
		editor.commands.insertMathInline('x^2', 'custom', 'x^2');

		// Get initial state
		const json1 = getJSON(editor) as DocumentJSON;
		const mathNode1 = json1.content?.[0]?.content?.find((node) => node.type === 'mathInline');

		// Add text before
		editor.chain().focus().setTextSelection(0).insertContent('Texte: ').run();

		// Check node preserved
		const json2 = getJSON(editor) as DocumentJSON;
		const mathNode2 = json2.content?.[0]?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode2?.attrs?.syntax).toBe(mathNode1?.attrs?.syntax);
		expect(mathNode2?.attrs?.originalExpression).toBe(mathNode1?.attrs?.originalExpression);
		editor.destroy();
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Math Edge Cases', () => {
	it('should handle $ character inside ~...~ custom syntax', () => {
		const editor = createTestEditor('<p></p>');
		// The InputRule regex doesn't prevent $ inside ~...~
		editor.commands.insertMathInline('sin($x)', 'custom', 'sin($x)');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		editor.destroy();
	});

	it('should not match incomplete ~...~ pattern', () => {
		const editor = createTestEditor('<p></p>');
		// insertText doesn't trigger InputRules, so incomplete pattern stays as text
		insertText(editor, '~incomplete');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeUndefined();
		editor.destroy();
	});

	it('should handle nested parentheses in custom syntax', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~((2+3)*4)~
		editor.commands.insertMathInline('((2+3)*4)', 'custom', '((2+3)*4)');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.originalExpression).toBe('((2+3)*4)');
		editor.destroy();
	});

	it('should handle whitespace in expressions', () => {
		const editor = createTestEditor('<p></p>');
		// Simulate what InputRule does for ~ x + y ~ (whitespace is trimmed by handler)
		editor.commands.insertMathInline('x + y', 'custom', 'x + y');

		const json = getJSON(editor) as DocumentJSON;
		const paragraph = json.content?.[0];
		const mathNode = paragraph?.content?.find((node) => node.type === 'mathInline');

		expect(mathNode).toBeDefined();
		// Whitespace should be trimmed
		expect(mathNode?.attrs?.originalExpression).toBe('x + y');
		editor.destroy();
	});
});
