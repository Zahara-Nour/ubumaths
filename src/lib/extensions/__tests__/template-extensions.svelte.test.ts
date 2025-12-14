/**
 * Template Extensions Test Suite
 * ==============================
 *
 * Tests for TipTap template extensions:
 * - TemplateVariable: {{varName}}
 * - TemplateRandom: {{1..10}}, {{random:...}}
 * - TemplateEval: {{eval:expr}}
 *
 * These extensions create visual chips for template syntax in the rich text editor.
 */

import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
	TemplateVariable,
	TemplateRandom,
	TemplateEval,
	validateVariableName,
	validateRandomSpec,
	validateEvalExpression
} from '../template-extensions';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Creates a test editor with template extensions
 */
function createTestEditor(content = ''): Editor {
	return new Editor({
		extensions: [StarterKit, TemplateVariable, TemplateRandom, TemplateEval],
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
// TEMPLATE VARIABLE TESTS
// ============================================================================

describe('TemplateVariable Extension', () => {
	describe('Validation', () => {
		it('should accept valid variable names', () => {
			expect(validateVariableName('a')).toBe(true);
			expect(validateVariableName('myVar')).toBe(true);
			expect(validateVariableName('my_var')).toBe(true);
			expect(validateVariableName('_private')).toBe(true);
			expect(validateVariableName('var123')).toBe(true);
			expect(validateVariableName('A_B_C')).toBe(true);
		});

		it('should reject invalid variable names', () => {
			expect(validateVariableName('')).toBe(false);
			expect(validateVariableName('123')).toBe(false);
			expect(validateVariableName('1var')).toBe(false);
			expect(validateVariableName('my-var')).toBe(false);
			expect(validateVariableName('my.var')).toBe(false);
			expect(validateVariableName('my var')).toBe(false);
			expect(validateVariableName('var!')).toBe(false);
		});
	});

	// Note: InputRules are triggered by keyboard input, not insertContent.
	// These rules are tested manually and work correctly in the browser.
	// The pattern matching and validation logic is tested via the validation tests above.

	describe('HTML Serialization', () => {
		it('should serialize to data-template-variable span', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateVariable('myVar');

			const html = getHTML(editor);
			expect(html).toContain('data-template-variable');
			expect(html).toContain('myVar');
			editor.destroy();
		});

		it('should parse data-template-variable span back to node', () => {
			const html = '<p><span data-template-variable="testVar">{{testVar}}</span></p>';
			const editor = createTestEditor(html);

			const json = getJSON(editor) as {
				content: Array<{ content: Array<{ type: string; attrs?: { name: string } }> }>;
			};
			const paragraph = json.content?.[0];
			const variableNode = paragraph?.content?.find(
				(node: { type: string }) => node.type === 'templateVariable'
			);

			expect(variableNode).toBeDefined();
			expect(variableNode?.attrs?.name).toBe('testVar');
			editor.destroy();
		});
	});

	describe('Commands', () => {
		it('should insert variable via insertTemplateVariable command', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateVariable('newVar');

			const json = getJSON(editor) as {
				content: Array<{ content: Array<{ type: string; attrs?: { name: string } }> }>;
			};
			const paragraph = json.content?.[0];
			const variableNode = paragraph?.content?.find(
				(node: { type: string }) => node.type === 'templateVariable'
			);

			expect(variableNode).toBeDefined();
			expect(variableNode?.attrs?.name).toBe('newVar');
			editor.destroy();
		});
	});
});

// ============================================================================
// TEMPLATE RANDOM TESTS
// ============================================================================

describe('TemplateRandom Extension', () => {
	describe('Validation', () => {
		it('should accept valid integer range specs', () => {
			expect(validateRandomSpec('1..10')).toBe(true);
			expect(validateRandomSpec('0..100')).toBe(true);
			expect(validateRandomSpec('-5..5')).toBe(true);
			expect(validateRandomSpec('random:1..10')).toBe(true);
		});

		it('should accept valid decimal specs', () => {
			expect(validateRandomSpec('2.3')).toBe(true);
			expect(validateRandomSpec('1.2')).toBe(true);
			expect(validateRandomSpec('random:2.3')).toBe(true);
		});

		it('should accept valid discrete list specs', () => {
			expect(validateRandomSpec('a|b|c')).toBe(true);
			expect(validateRandomSpec('rouge|vert|bleu')).toBe(true);
			expect(validateRandomSpec('random:oui|non')).toBe(true);
		});

		it('should accept specs with exclusions', () => {
			expect(validateRandomSpec('1..10!5')).toBe(true);
			expect(validateRandomSpec('1..20!5,7..9')).toBe(true);
			expect(validateRandomSpec('random:1..10!0')).toBe(true);
		});

		it('should accept relative integer specs', () => {
			expect(validateRandomSpec('2..9;+-')).toBe(true);
			expect(validateRandomSpec('1..5;+-')).toBe(true);
		});

		it('should reject invalid specs', () => {
			expect(validateRandomSpec('')).toBe(false);
			expect(validateRandomSpec('abc')).toBe(false);
			expect(validateRandomSpec('1..')).toBe(false);
			expect(validateRandomSpec('..10')).toBe(false);
		});
	});

	// Note: InputRules are triggered by keyboard input, not insertContent.
	// These rules are tested manually and work correctly in the browser.
	// The pattern matching and validation logic is tested via the validation tests above.

	describe('HTML Serialization', () => {
		it('should serialize to data-template-random span', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateRandom('1..10');

			const html = getHTML(editor);
			expect(html).toContain('data-template-random');
			expect(html).toContain('1..10');
			editor.destroy();
		});

		it('should parse data-template-random span back to node', () => {
			const html = '<p><span data-template-random="1..20">{{1..20}}</span></p>';
			const editor = createTestEditor(html);

			const json = getJSON(editor) as {
				content: Array<{ content: Array<{ type: string; attrs?: { spec: string } }> }>;
			};
			const paragraph = json.content?.[0];
			const randomNode = paragraph?.content?.find(
				(node: { type: string }) => node.type === 'templateRandom'
			);

			expect(randomNode).toBeDefined();
			expect(randomNode?.attrs?.spec).toBe('1..20');
			editor.destroy();
		});
	});

	describe('Commands', () => {
		it('should insert random via insertTemplateRandom command', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateRandom('5..15');

			const json = getJSON(editor) as {
				content: Array<{ content: Array<{ type: string; attrs?: { spec: string } }> }>;
			};
			const paragraph = json.content?.[0];
			const randomNode = paragraph?.content?.find(
				(node: { type: string }) => node.type === 'templateRandom'
			);

			expect(randomNode).toBeDefined();
			expect(randomNode?.attrs?.spec).toBe('5..15');
			editor.destroy();
		});
	});
});

// ============================================================================
// TEMPLATE EVAL TESTS
// ============================================================================

describe('TemplateEval Extension', () => {
	describe('Validation', () => {
		it('should accept valid eval expressions', () => {
			expect(validateEvalExpression('a+b')).toBe(true);
			expect(validateEvalExpression('x*y')).toBe(true);
			expect(validateEvalExpression('a+b+c')).toBe(true);
			expect(validateEvalExpression('2*x+1')).toBe(true);
		});

		it('should accept expressions with modifiers', () => {
			expect(validateEvalExpression('a+b|d')).toBe(true);
			expect(validateEvalExpression('x*y|+')).toBe(true);
			expect(validateEvalExpression('a/b|d,+')).toBe(true);
			expect(validateEvalExpression('x|()')).toBe(true);
		});

		it('should accept expressions with variable references', () => {
			expect(validateEvalExpression('{{a}}+{{b}}')).toBe(true);
			expect(validateEvalExpression('{{x}}*2')).toBe(true);
		});

		it('should reject empty expressions', () => {
			expect(validateEvalExpression('')).toBe(false);
		});
	});

	// Note: InputRules are triggered by keyboard input, not insertContent.
	// These rules are tested manually and work correctly in the browser.
	// The pattern matching and validation logic is tested via the validation tests above.

	describe('HTML Serialization', () => {
		it('should serialize to data-template-eval span', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateEval('a+b');

			const html = getHTML(editor);
			expect(html).toContain('data-template-eval');
			expect(html).toContain('a+b');
			editor.destroy();
		});

		it('should parse data-template-eval span back to node', () => {
			const html = '<p><span data-template-eval="x*y">{{eval:x*y}}</span></p>';
			const editor = createTestEditor(html);

			const json = getJSON(editor) as {
				content: Array<{ content: Array<{ type: string; attrs?: { expression: string } }> }>;
			};
			const paragraph = json.content?.[0];
			const evalNode = paragraph?.content?.find(
				(node: { type: string }) => node.type === 'templateEval'
			);

			expect(evalNode).toBeDefined();
			expect(evalNode?.attrs?.expression).toBe('x*y');
			editor.destroy();
		});
	});

	describe('Commands', () => {
		it('should insert eval via insertTemplateEval command', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateEval('a*b+c');

			const json = getJSON(editor) as {
				content: Array<{ content: Array<{ type: string; attrs?: { expression: string } }> }>;
			};
			const paragraph = json.content?.[0];
			const evalNode = paragraph?.content?.find(
				(node: { type: string }) => node.type === 'templateEval'
			);

			expect(evalNode).toBeDefined();
			expect(evalNode?.attrs?.expression).toBe('a*b+c');
			editor.destroy();
		});
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Template Extensions Integration', () => {
	it('should handle mixed content with multiple template types', () => {
		const editor = createTestEditor('<p></p>');

		// Insert variable, random, and eval
		editor.commands.insertTemplateVariable('x');
		insertText(editor, ' + ');
		editor.commands.insertTemplateRandom('1..10');
		insertText(editor, ' = ');
		editor.commands.insertTemplateEval('x+y');

		const json = getJSON(editor) as { content: Array<{ content: Array<{ type: string }> }> };
		const paragraph = json.content?.[0];
		const content = paragraph?.content || [];

		const types = content.map((node: { type: string }) => node.type);
		expect(types).toContain('templateVariable');
		expect(types).toContain('templateRandom');
		expect(types).toContain('templateEval');

		editor.destroy();
	});

	it('should preserve template nodes through HTML roundtrip', () => {
		const originalHtml = `<p>
			<span data-template-variable="a">{{a}}</span> +
			<span data-template-random="1..10">{{1..10}}</span> =
			<span data-template-eval="a+b">{{eval:a+b}}</span>
		</p>`;

		const editor = createTestEditor(originalHtml);
		const json = getJSON(editor) as { content: Array<{ content: Array<{ type: string }> }> };
		const paragraph = json.content?.[0];
		const content = paragraph?.content || [];

		const types = content
			.filter((node: { type: string }) => node.type.startsWith('template'))
			.map((node: { type: string }) => node.type);

		expect(types).toContain('templateVariable');
		expect(types).toContain('templateRandom');
		expect(types).toContain('templateEval');

		editor.destroy();
	});
});

// ============================================================================
// ADDITIONAL EDGE CASE TESTS
// ============================================================================

describe('TemplateRandom Edge Cases', () => {
	describe('Decimal range with step', () => {
		it('should accept decimal range with step specification', () => {
			expect(validateRandomSpec('0.5..9.99:0.01')).toBe(true);
			expect(validateRandomSpec('0..1:0.1')).toBe(true);
			expect(validateRandomSpec('1.5..5.5:0.5')).toBe(true);
		});

		it('should serialize decimal range with step', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateRandom('0.5..9.99:0.01');

			const html = getHTML(editor);
			expect(html).toContain('data-template-random');
			expect(html).toContain('0.5..9.99:0.01');
			editor.destroy();
		});
	});

	describe('Complex exclusions', () => {
		it('should accept complex exclusion patterns', () => {
			// Single exclusion
			expect(validateRandomSpec('1..20!5')).toBe(true);
			// Range exclusion (comma-separated)
			expect(validateRandomSpec('1..20!5,7..9')).toBe(true);
			// Multiple single exclusions
			expect(validateRandomSpec('1..100!0,50,100')).toBe(true);
		});

		it('should serialize specs with exclusions', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateRandom('1..20!5,7..9');

			const html = getHTML(editor);
			expect(html).toContain('data-template-random');
			expect(html).toContain('1..20!5,7..9');
			editor.destroy();
		});

		it('should parse HTML with exclusion back to node', () => {
			const html = '<p><span data-template-random="1..20!5,7..9">{{1..20!5,7..9}}</span></p>';
			const editor = createTestEditor(html);

			const json = getJSON(editor) as {
				content: Array<{ content: Array<{ type: string; attrs?: { spec: string } }> }>;
			};
			const paragraph = json.content?.[0];
			const randomNode = paragraph?.content?.find(
				(node: { type: string }) => node.type === 'templateRandom'
			);

			expect(randomNode).toBeDefined();
			expect(randomNode?.attrs?.spec).toBe('1..20!5,7..9');
			editor.destroy();
		});
	});
});

describe('TemplateEval Edge Cases', () => {
	describe('Nested variable references', () => {
		it('should accept expressions with nested variable references', () => {
			expect(validateEvalExpression('{{a}}+{{b}}')).toBe(true);
			expect(validateEvalExpression('{{x}}*{{y}}/{{z}}')).toBe(true);
			expect(validateEvalExpression('2*{{var1}}+{{var2}}')).toBe(true);
		});

		it('should serialize expressions with variable references', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateEval('{{a}}+{{b}}');

			const html = getHTML(editor);
			expect(html).toContain('data-template-eval');
			expect(html).toContain('{{a}}+{{b}}');
			editor.destroy();
		});

		it('should parse HTML with variable references back to node', () => {
			const html = '<p><span data-template-eval="{{x}}*{{y}}">{{eval:{{x}}*{{y}}}}</span></p>';
			const editor = createTestEditor(html);

			const json = getJSON(editor) as {
				content: Array<{ content: Array<{ type: string; attrs?: { expression: string } }> }>;
			};
			const paragraph = json.content?.[0];
			const evalNode = paragraph?.content?.find(
				(node: { type: string }) => node.type === 'templateEval'
			);

			expect(evalNode).toBeDefined();
			expect(evalNode?.attrs?.expression).toBe('{{x}}*{{y}}');
			editor.destroy();
		});
	});

	describe('Complex modifiers', () => {
		it('should accept expressions with multiple modifiers', () => {
			expect(validateEvalExpression('a+b|d,+')).toBe(true);
			expect(validateEvalExpression('x/y|d,()')).toBe(true);
			expect(validateEvalExpression('result|+,()')).toBe(true);
		});

		it('should serialize expressions with complex modifiers', () => {
			const editor = createTestEditor('<p></p>');
			editor.commands.insertTemplateEval('a+b|d,+');

			const html = getHTML(editor);
			expect(html).toContain('data-template-eval');
			expect(html).toContain('a+b|d,+');
			editor.destroy();
		});
	});
});
