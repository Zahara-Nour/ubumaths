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
					handleTextInput(view, from, to, text) {
						// Only process when typing a backtick
						if (text !== '`') return false;

						const { state } = view;
						const $from = state.doc.resolve(from);

						// Get text before cursor in current text node
						const textBefore = $from.parent.textBetween(
							Math.max(0, $from.parentOffset - 200),
							$from.parentOffset,
							null,
							'\ufffc'
						);

						// Check if there's an opening backtick with content
						// Pattern: ` followed by non-backtick content, at the end
						const match = /`([^`]+)$/.exec(textBefore);
						if (!match) return false;

						const content = match[1];
						if (!content || content.trim() === '') return false;

						// Calculate the start position of the pattern
						// match.index is the position in textBefore where ` starts
						const patternStartInNode = $from.parentOffset - textBefore.length + match.index;
						const patternStartInDoc = $from.start() + patternStartInNode;

						// Create transaction:
						// 1. Delete from opening backtick to cursor (where closing backtick would go)
						// 2. Insert content with code mark
						const tr = state.tr;

						// Delete the `content pattern (the closing backtick hasn't been inserted yet)
						tr.delete(patternStartInDoc, from);

						// Insert the content with code mark
						const codeMark = type.create();
						const contentWithMark = state.schema.text(content, [codeMark]);
						tr.insert(patternStartInDoc, contentWithMark);

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
