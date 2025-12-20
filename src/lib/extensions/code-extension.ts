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

import { InputRule } from '@tiptap/core';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

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
						const $from = state.doc.resolve(from);
						const parent = $from.parent;
						const parentStart = $from.start(); // Document position where parent content starts
						const cursorOffset = $from.parentOffset; // Cursor position within parent

						// Search backwards in parent's text for opening backtick
						const parentText = parent.textContent;
						let openBacktickOffset = -1;

						for (let i = cursorOffset - 1; i >= 0; i--) {
							const char = parentText[i];
							if (char === '`') {
								openBacktickOffset = i;
								break;
							}
						}

						// No opening backtick found
						if (openBacktickOffset === -1) return false;

						// Get content between backticks
						const content = parentText.slice(openBacktickOffset + 1, cursorOffset);

						// Validate content
						if (!content || content.trim() === '' || content.includes('`')) {
							return false;
						}

						// Calculate document positions
						const patternStartInDoc = parentStart + openBacktickOffset;
						const patternEndInDoc = from; // Cursor position

						// Create transaction
						const tr = state.tr;

						// Delete the `content pattern (from opening backtick to cursor)
						tr.delete(patternStartInDoc, patternEndInDoc);

						// Insert the content with code mark
						const codeMark = type.create();
						const contentWithMark = state.schema.text(content, [codeMark]);
						tr.insert(patternStartInDoc, contentWithMark);

						// Insert a space WITHOUT any marks (explicitly no marks)
						const spacePos = patternStartInDoc + content.length;
						const spaceNode = state.schema.text(' ', []); // Empty marks array
						tr.insert(spacePos, spaceNode);

						// Position cursor after the space
						const cursorPos = spacePos + 1;
						tr.setSelection(TextSelection.create(tr.doc, cursorPos));

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
 * Displays language label in the top-right corner
 */
export const CustomCodeBlock = CodeBlock.extend({
	addAttributes() {
		return {
			language: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-language'),
				renderHTML: (attributes) => {
					if (!attributes.language) return {};
					return { 'data-language': attributes.language };
				}
			}
		};
	},

	renderHTML({ node, HTMLAttributes }) {
		const language = node.attrs.language as string | null;

		return [
			'div',
			{ class: 'code-block-wrapper', 'data-language': language || undefined },
			['pre', HTMLAttributes, ['code', { class: language ? `language-${language}` : undefined }, 0]]
		];
	},

	addInputRules() {
		return [
			new InputRule({
				find: CODE_BLOCK_INPUT_REGEX,
				handler: ({ state, range, match }) => {
					const $start = state.doc.resolve(range.from);
					const language = match[1] || null;

					// Check if we're inside a listItem by traversing ancestors
					let isInList = false;
					let listItemDepth = -1;
					for (let depth = $start.depth; depth > 0; depth--) {
						if ($start.node(depth).type.name === 'listItem') {
							isInList = true;
							listItemDepth = depth;
							break;
						}
					}

					if (!isInList) {
						// Standard behavior: replace the block with codeBlock
						// Check if parent can accept codeBlock
						const $from = state.doc.resolve(range.from);
						if (!$from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), this.type)) {
							return null;
						}
						state.tr
							.delete(range.from, range.to)
							.setBlockType(range.from, range.from, this.type, { language });
					} else {
						// Inside a list: insert codeBlock after the current paragraph
						const tr = state.tr;

						// Get the paragraph node we're in
						const paragraphDepth = $start.depth;
						const paragraphNode = $start.node(paragraphDepth);
						const paragraphStart = $start.start(paragraphDepth);
						const paragraphEnd = paragraphStart + paragraphNode.nodeSize - 2; // -2 for open/close tokens

						// Delete the ``` pattern first
						tr.delete(range.from, range.to);

						// Calculate position after deletion
						const deletedLength = range.to - range.from;

						// Check if the paragraph is now empty (only had the ``` pattern)
						const textBeforePattern = state.doc.textBetween(paragraphStart, range.from);
						const textAfterPattern = state.doc.textBetween(range.to, paragraphEnd + 2);
						const isEmptyAfterDeletion =
							textBeforePattern.trim() === '' && textAfterPattern.trim() === '';

						// Create the codeBlock node
						const codeBlockNode = this.type.create({ language });

						if (isEmptyAfterDeletion) {
							// Replace the empty paragraph with the codeBlock
							// Find paragraph position relative to listItem
							const listItemNode = $start.node(listItemDepth);
							const listItemStart = $start.start(listItemDepth);

							// Find which child index the paragraph is
							let paragraphPosInListItem = -1;
							let offset = 0;
							for (let i = 0; i < listItemNode.childCount; i++) {
								const child = listItemNode.child(i);
								if (listItemStart + offset === paragraphStart - 1) {
									// -1 because start() gives content start
									paragraphPosInListItem = i;
									break;
								}
								offset += child.nodeSize;
							}

							if (paragraphPosInListItem === 0) {
								// First paragraph in listItem - can't replace it (schema requires paragraph first)
								// Insert codeBlock after and keep empty paragraph
								// Position after paragraph = paragraphStart + nodeSize - 1, adjusted for deletion
								const insertPos = paragraphStart + paragraphNode.nodeSize - deletedLength - 1;
								tr.insert(insertPos, codeBlockNode);
							} else {
								// Not the first element - we can replace the paragraph
								const replaceFrom = paragraphStart - 1; // Include opening tag
								const replaceTo = paragraphStart + paragraphNode.nodeSize - 1 - deletedLength;
								tr.replaceWith(replaceFrom, replaceTo, codeBlockNode);
							}
						} else {
							// Paragraph has other content - insert codeBlock after it
							// Position after paragraph = paragraphStart + nodeSize - 1, adjusted for deletion
							const insertPos = paragraphStart + paragraphNode.nodeSize - deletedLength - 1;
							tr.insert(insertPos, codeBlockNode);
						}

						// Set selection inside the new codeBlock
						const newDoc = tr.doc;
						// Find the codeBlock we just inserted
						let codeBlockPos = -1;
						newDoc.descendants((node, pos) => {
							if (
								node.type.name === 'codeBlock' &&
								node.attrs.language === language &&
								codeBlockPos === -1
							) {
								// Simple heuristic - find a codeBlock with matching language near our edit
								codeBlockPos = pos;
								return false;
							}
							return true;
						});

						if (codeBlockPos !== -1) {
							tr.setSelection(TextSelection.create(tr.doc, codeBlockPos + 1));
						}
					}
				}
			})
		];
	}
});

export default { CustomCode, CustomCodeBlock };
