/**
 * Variation Table Extension for TipTap
 * =====================================
 *
 * Custom TipTap node for variation tables (sign/variation tables).
 * Displays rendered tables in the editor with edit capabilities.
 *
 * Features:
 * - Stores markdown content as attribute
 * - Renders as visual table using VariationTableNodeView
 * - Two edit modes: overlay (mouse) and inline (keyboard)
 * - Input rule: ```variation triggers node creation
 *
 * @module extensions/variation-table-extension
 */

import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import VariationTableNodeView from './VariationTableNodeView.svelte';

/**
 * Default template for new variation tables
 */
export const VARIATION_TABLE_TEMPLATE = `variable: x
domain: -inf, 0, +inf

sign: f'(x)
  -inf,0: +
  0: z
  0,+inf: -

variation: f(x)
  -inf: -inf, bottom
  0: 1, top
  +inf: -inf, bottom`;

/**
 * Regex for variation block input: ```variation + space or Enter
 * Triggers node creation when user types ```variation followed by space or newline
 * Note: [\s\n]$ requires whitespace at end (like code-extension.ts pattern)
 */
const VARIATION_BLOCK_INPUT_REGEX = /^```variation[\s\n]$/;

/**
 * Custom Variation Table extension
 *
 * Creates a block-level node that displays variation tables.
 * Content is stored as markdown and parsed for rendering.
 */
export const VariationTableExtension = Node.create({
	name: 'variationTable',

	group: 'block',

	atom: true, // Non-editable as text, uses NodeView

	draggable: true,

	addAttributes() {
		return {
			/**
			 * The markdown content of the variation table (without ```variation wrapper)
			 */
			content: {
				default: VARIATION_TABLE_TEMPLATE,
				parseHTML: (element: HTMLElement) => {
					return element.getAttribute('data-content') || VARIATION_TABLE_TEMPLATE;
				},
				renderHTML: (attributes) => {
					return { 'data-content': attributes.content };
				}
			},
			/**
			 * Whether the table has a parse error (for visual feedback)
			 */
			hasError: {
				default: false,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-has-error') === 'true',
				renderHTML: (attributes) => {
					if (!attributes.hasError) return {};
					return { 'data-has-error': 'true' };
				}
			},
			/**
			 * Error message if parsing failed
			 */
			errorMessage: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-error-message'),
				renderHTML: (attributes) => {
					if (!attributes.errorMessage) return {};
					return { 'data-error-message': attributes.errorMessage };
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				// Parse from our rendered output
				tag: 'div[data-type="variation-table"]'
			},
			{
				// Also parse from code blocks with variation language
				tag: 'pre',
				getAttrs: (element) => {
					const el = element as HTMLElement;
					const code = el.querySelector('code');
					if (code?.classList.contains('language-variation')) {
						return { content: code.textContent || VARIATION_TABLE_TEMPLATE };
					}
					return false;
				}
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		// Render as a wrapper div with data attributes
		// The actual table rendering is handled by NodeView
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'variation-table',
				class: 'variation-table-wrapper'
			}),
			// Fallback content for non-JS environments
			['pre', { class: 'variation-table-fallback' }, ['code', {}, HTMLAttributes['data-content']]]
		];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(VariationTableNodeView);
	},

	addInputRules() {
		return [
			new InputRule({
				find: VARIATION_BLOCK_INPUT_REGEX,
				handler: ({ state, range }) => {
					const $start = state.doc.resolve(range.from);

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

					// Create the variationTable node
					const variationNode = this.type.create({ content: VARIATION_TABLE_TEMPLATE });

					if (!isInList) {
						// Standard behavior: delete pattern and insert node
						const { tr } = state;
						tr.delete(range.from, range.to);
						tr.insert(range.from, variationNode);
					} else {
						// Inside a list: insert variationTable after the current paragraph
						const tr = state.tr;

						// Get the paragraph node we're in
						const paragraphDepth = $start.depth;
						const paragraphNode = $start.node(paragraphDepth);
						const paragraphStart = $start.start(paragraphDepth);
						const paragraphEnd = paragraphStart + paragraphNode.nodeSize - 2;

						// Delete the ```variation pattern first
						tr.delete(range.from, range.to);

						// Calculate position after deletion
						const deletedLength = range.to - range.from;

						// Check if the paragraph is now empty
						const textBeforePattern = state.doc.textBetween(paragraphStart, range.from);
						const textAfterPattern = state.doc.textBetween(range.to, paragraphEnd + 2);
						const isEmptyAfterDeletion =
							textBeforePattern.trim() === '' && textAfterPattern.trim() === '';

						if (isEmptyAfterDeletion) {
							// Find which child index the paragraph is in listItem
							const listItemNode = $start.node(listItemDepth);
							const listItemStart = $start.start(listItemDepth);

							let paragraphPosInListItem = -1;
							let offset = 0;
							for (let i = 0; i < listItemNode.childCount; i++) {
								const child = listItemNode.child(i);
								if (listItemStart + offset === paragraphStart - 1) {
									paragraphPosInListItem = i;
									break;
								}
								offset += child.nodeSize;
							}

							if (paragraphPosInListItem === 0) {
								// First paragraph - insert after, keep empty paragraph
								const insertPos = paragraphStart + paragraphNode.nodeSize - deletedLength - 1;
								tr.insert(insertPos, variationNode);
							} else {
								// Not first - replace the paragraph
								const replaceFrom = paragraphStart - 1;
								const replaceTo = paragraphStart + paragraphNode.nodeSize - 1 - deletedLength;
								tr.replaceWith(replaceFrom, replaceTo, variationNode);
							}
						} else {
							// Paragraph has other content - insert after
							const insertPos = paragraphStart + paragraphNode.nodeSize - deletedLength - 1;
							tr.insert(insertPos, variationNode);
						}
					}

					// The NodeView will automatically enter edit mode for new nodes
				}
			})
		];
	},

	addCommands() {
		return {
			/**
			 * Insert a new variation table at the current position
			 */
			insertVariationTable:
				(content?: string) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: {
							content: content || VARIATION_TABLE_TEMPLATE
						}
					});
				},

			/**
			 * Update the content of a variation table
			 */
			updateVariationTableContent:
				(content: string, hasError = false, errorMessage: string | null = null) =>
				({ commands }) => {
					return commands.updateAttributes(this.name, {
						content,
						hasError,
						errorMessage
					});
				}
		};
	},

	addKeyboardShortcuts() {
		return {
			// Backspace at the start of an empty paragraph after a variation table
			// should select the variation table
			Backspace: ({ editor }) => {
				const { selection } = editor.state;
				const { $from } = selection;

				// Check if we're at the start of a paragraph
				if ($from.parentOffset !== 0) return false;

				// Check if there's a variationTable before us
				const posBefore = $from.before();
				if (posBefore <= 0) return false;

				const nodeBefore = editor.state.doc.nodeAt(posBefore - 1);
				if (nodeBefore?.type.name === 'variationTable') {
					// Select the variation table
					editor.commands.setNodeSelection(posBefore - 1);
					return true;
				}

				return false;
			}
		};
	}
});

// Extend TipTap's Commands interface
declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		variationTable: {
			insertVariationTable: (content?: string) => ReturnType;
			updateVariationTableContent: (
				content: string,
				hasError?: boolean,
				errorMessage?: string | null
			) => ReturnType;
		};
	}
}

export default VariationTableExtension;
