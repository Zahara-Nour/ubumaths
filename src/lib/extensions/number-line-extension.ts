/**
 * Number Line Extension for TipTap
 * ==================================
 *
 * Custom TipTap node for number lines (droites graduées).
 * Displays rendered number lines in the editor with edit capabilities.
 *
 * Features:
 * - Stores markdown content as attribute
 * - Renders as visual SVG number line using NumberLineNodeView
 * - Two edit modes: overlay (mouse) and inline (keyboard)
 * - Input rule: ```line triggers node creation
 *
 * @module extensions/number-line-extension
 */

import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import NumberLineNodeView from './NumberLineNodeView.svelte';

/**
 * Default template for new number lines
 */
export const NUMBER_LINE_TEMPLATE = `start: 0
end: 10
step: 1
major: 1
arrows: true`;

/**
 * Regex for number line block input: ```line + space or Enter
 */
const NUMBER_LINE_INPUT_REGEX = /```line[\s\n]$/;

/**
 * Custom Number Line extension
 */
export const NumberLineExtension = Node.create({
	name: 'numberLine',

	group: 'block',

	atom: true,

	draggable: true,

	addAttributes() {
		return {
			content: {
				default: NUMBER_LINE_TEMPLATE,
				parseHTML: (element: HTMLElement) => {
					return element.getAttribute('data-content') || NUMBER_LINE_TEMPLATE;
				},
				renderHTML: (attributes) => {
					return { 'data-content': attributes.content };
				}
			},
			hasError: {
				default: false,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-has-error') === 'true',
				renderHTML: (attributes) => {
					if (!attributes.hasError) return {};
					return { 'data-has-error': 'true' };
				}
			},
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
				tag: 'div[data-type="number-line"]'
			},
			{
				tag: 'pre',
				getAttrs: (element) => {
					const el = element as HTMLElement;
					const code = el.querySelector('code');
					if (code?.classList.contains('language-line')) {
						return { content: code.textContent || NUMBER_LINE_TEMPLATE };
					}
					return false;
				}
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'number-line',
				class: 'number-line-wrapper'
			}),
			['pre', { class: 'number-line-fallback' }, ['code', {}, HTMLAttributes['data-content']]]
		];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(NumberLineNodeView);
	},

	addInputRules() {
		return [
			new InputRule({
				find: NUMBER_LINE_INPUT_REGEX,
				handler: ({ state, range }) => {
					const $start = state.doc.resolve(range.from);

					let isInList = false;
					let listItemDepth = -1;
					for (let depth = $start.depth; depth > 0; depth--) {
						if ($start.node(depth).type.name === 'listItem') {
							isInList = true;
							listItemDepth = depth;
							break;
						}
					}

					const numberLineNode = this.type.create({ content: NUMBER_LINE_TEMPLATE });

					if (!isInList) {
						const { tr } = state;
						tr.delete(range.from, range.to);
						tr.insert(range.from, numberLineNode);
					} else {
						const tr = state.tr;
						const paragraphDepth = $start.depth;
						const paragraphNode = $start.node(paragraphDepth);
						const paragraphStart = $start.start(paragraphDepth);
						const paragraphEnd = paragraphStart + paragraphNode.nodeSize - 2;

						tr.delete(range.from, range.to);
						const deletedLength = range.to - range.from;

						const textBeforePattern = state.doc.textBetween(paragraphStart, range.from);
						const textAfterPattern = state.doc.textBetween(range.to, paragraphEnd + 2);
						const isEmptyAfterDeletion =
							textBeforePattern.trim() === '' && textAfterPattern.trim() === '';

						if (isEmptyAfterDeletion) {
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
								const insertPos = paragraphStart + paragraphNode.nodeSize - deletedLength - 1;
								tr.insert(insertPos, numberLineNode);
							} else {
								const replaceFrom = paragraphStart - 1;
								const replaceTo = paragraphStart + paragraphNode.nodeSize - 1 - deletedLength;
								tr.replaceWith(replaceFrom, replaceTo, numberLineNode);
							}
						} else {
							const insertPos = paragraphStart + paragraphNode.nodeSize - deletedLength - 1;
							tr.insert(insertPos, numberLineNode);
						}
					}
				}
			})
		];
	},

	addCommands() {
		return {
			insertNumberLine:
				(content?: string) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: {
							content: content || NUMBER_LINE_TEMPLATE
						}
					});
				},

			updateNumberLineContent:
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
			Backspace: ({ editor }) => {
				const { selection } = editor.state;
				const { $from } = selection;

				if ($from.parentOffset !== 0) return false;

				const posBefore = $from.before();
				if (posBefore <= 0) return false;

				const nodeBefore = editor.state.doc.nodeAt(posBefore - 1);
				if (nodeBefore?.type.name === 'numberLine') {
					editor.commands.setNodeSelection(posBefore - 1);
					return true;
				}

				return false;
			}
		};
	}
});

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		numberLine: {
			insertNumberLine: (content?: string) => ReturnType;
			updateNumberLineContent: (
				content: string,
				hasError?: boolean,
				errorMessage?: string | null
			) => ReturnType;
		};
	}
}

export default NumberLineExtension;
