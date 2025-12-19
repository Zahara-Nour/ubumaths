/**
 * Code Extensions with Input Rules for TipTap
 * ============================================
 *
 * Extends the default Code (inline) and CodeBlock extensions with
 * automatic Markdown-style input rules:
 *
 * - Inline code: `text` -> applies code mark
 * - Code block: ```language + Enter -> creates code block
 *
 * Uses custom InputRule handlers (like math-extension) for precise control
 * over the replacement behavior.
 *
 * @module extensions/code-extension
 */

import { InputRule, textblockTypeInputRule } from '@tiptap/core';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';

/**
 * Regex for inline code with backticks: `code`
 * Simple pattern: backtick, content (no backticks), backtick at end
 * Works at start of paragraph or after any text
 */
const INLINE_CODE_INPUT_REGEX = /`([^`]+)`$/;

/**
 * Regex for code block with triple backticks: ```language
 * Captures optional language identifier
 */
const CODE_BLOCK_INPUT_REGEX = /^```([a-z]*)?[\s\n]$/;

/**
 * Custom Code extension with backtick input rule
 *
 * Typing `code` automatically converts to inline code.
 * Uses a custom InputRule handler for precise control.
 */
export const CustomCode = Code.extend({
	addInputRules() {
		const type = this.type;

		return [
			new InputRule({
				find: INLINE_CODE_INPUT_REGEX,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const content = match[1]; // Content between backticks

					if (!content) return;

					// Delete the entire `content` pattern (including backticks)
					tr.delete(range.from, range.to);

					// Insert the content with code mark applied
					tr.insertText(content, range.from);
					tr.addMark(range.from, range.from + content.length, type.create());

					// Remove the stored mark so subsequent typing isn't in code
					tr.removeStoredMark(type);
				}
			})
		];
	}
});

/**
 * Custom CodeBlock extension with triple backtick input rule
 *
 * Typing ``` (and optionally a language) then Enter creates a code block
 */
export const CustomCodeBlock = CodeBlock.extend({
	addInputRules() {
		return [
			textblockTypeInputRule({
				find: CODE_BLOCK_INPUT_REGEX,
				type: this.type,
				getAttributes: (match) => ({
					language: match[1] || null
				})
			})
		];
	}
});

export default { CustomCode, CustomCodeBlock };
