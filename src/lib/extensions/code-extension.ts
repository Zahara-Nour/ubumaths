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
 * Uses a ProseMirror plugin with handleTextInput for reliable
 * backtick detection (InputRule has issues with this pattern).
 *
 * @module extensions/code-extension
 */

import { textblockTypeInputRule } from '@tiptap/core';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Regex for code block with triple backticks: ```language
 * Captures optional language identifier
 */
const CODE_BLOCK_INPUT_REGEX = /^```([a-z]*)?[\s\n]$/;

/**
 * Plugin key for the inline code input handler
 */
const inlineCodePluginKey = new PluginKey('inlineCodeInput');

/**
 * Custom Code extension with backtick input handling
 *
 * Uses a ProseMirror plugin to detect when the user completes
 * a `...` pattern by typing the closing backtick.
 */
export const CustomCode = Code.extend({
	// Disable parent's input rules - we handle it ourselves
	addInputRules() {
		return [];
	},

	addProseMirrorPlugins() {
		const type = this.type;

		return [
			new Plugin({
				key: inlineCodePluginKey,
				props: {
					/**
					 * Intercept text input to detect inline code pattern
					 * This fires BEFORE the character is inserted
					 */
					handleTextInput(view, from, _to, text) {
						// Only process when typing a backtick
						if (text !== '`') return false;

						const { state } = view;

						// Get text before cursor directly from document
						const searchStart = Math.max(0, from - 200);
						const textBefore = state.doc.textBetween(searchStart, from, null, '\ufffc');

						// Check if there's an opening backtick with content
						// Pattern: ` followed by non-backtick content, at the end
						const match = /`([^`]+)$/.exec(textBefore);
						if (!match) return false;

						const content = match[1];
						if (!content || content.trim() === '') return false;

						// Calculate positions
						// match.index is where ` starts in textBefore
						// The actual document position is searchStart + match.index
						const patternStart = searchStart + match.index;

						// Create transaction
						const tr = state.tr;

						// Delete the `content pattern (from opening backtick to cursor)
						tr.delete(patternStart, from);

						// Insert the content with code mark at the deletion point
						const codeMark = type.create();
						const contentWithMark = state.schema.text(content, [codeMark]);
						tr.insert(patternStart, contentWithMark);

						// Remove stored mark so next typing isn't in code
						tr.removeStoredMark(type);

						view.dispatch(tr);
						return true; // Prevent default handling (don't insert the backtick)
					}
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
