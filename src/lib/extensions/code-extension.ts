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
 * @module extensions/code-extension
 */

import { markInputRule, textblockTypeInputRule } from '@tiptap/core';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';

/**
 * Regex for inline code with backticks: `code`
 * Captures content between backticks
 */
const INLINE_CODE_INPUT_REGEX = /(?:^|[^`])(`([^`]+)`)$/;

/**
 * Regex for code block with triple backticks: ```language
 * Captures optional language identifier
 */
const CODE_BLOCK_INPUT_REGEX = /^```([a-z]*)?[\s\n]$/;

/**
 * Custom Code extension with backtick input rule
 *
 * Typing `code` automatically converts to inline code
 */
export const CustomCode = Code.extend({
	addInputRules() {
		return [
			markInputRule({
				find: INLINE_CODE_INPUT_REGEX,
				type: this.type
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
