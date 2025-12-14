/**
 * TipTap Extension for Hashtag Support
 * =====================================
 *
 * Custom TipTap node extension that creates visual chips for hashtags.
 * Hashtags are used for categorizing content (e.g., #mathematiques, #facile).
 *
 * Syntax: #tagname (must start with lowercase letter)
 *
 * Features:
 * - Automatic #tag syntax detection via input rule
 * - Visual blue chip styling
 * - Inline atomic node (non-editable)
 * - Keyboard navigation support
 *
 * @see https://tiptap.dev/docs/editor/extensions/custom-extensions
 */

import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';

// ============================================================================
// KEYBOARD NAVIGATION PLUGIN
// ============================================================================

/**
 * Hashtag Keyboard Navigation Plugin
 * Handles arrow key navigation to select hashtag nodes.
 */
const hashtagKeyboardNavKey = new PluginKey('hashtagKeyboardNav');

const hashtagKeyboardNavPlugin = new Plugin({
	key: hashtagKeyboardNavKey,
	props: {
		handleKeyDown: (view, event) => {
			// Only handle arrow keys
			if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
				return false;
			}

			const { state } = view;
			const { selection } = state;

			// Only handle text selections (not node selections)
			if (selection instanceof NodeSelection) {
				return false;
			}

			const { $from } = selection;
			const pos = $from.pos;

			if (event.key === 'ArrowRight') {
				// Check if there's a hashtag node immediately after cursor
				const nodeAfter = $from.nodeAfter;
				if (nodeAfter && nodeAfter.type.name === 'hashtag') {
					event.preventDefault();
					const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos));
					view.dispatch(tr);
					return true;
				}
			} else if (event.key === 'ArrowLeft') {
				// Check if there's a hashtag node immediately before cursor
				const nodeBefore = $from.nodeBefore;
				if (nodeBefore && nodeBefore.type.name === 'hashtag') {
					event.preventDefault();
					const nodeStartPos = pos - nodeBefore.nodeSize;
					const tr = state.tr.setSelection(NodeSelection.create(state.doc, nodeStartPos));
					view.dispatch(tr);
					return true;
				}
			}

			return false;
		}
	}
});

// ============================================================================
// HASHTAG EXTENSION
// ============================================================================

/**
 * Hashtag Extension
 * =================
 *
 * Creates inline hashtag chips for content categorization.
 * Syntax: #tagname
 *
 * Node Configuration:
 * - group: 'inline' - Can appear within paragraphs
 * - inline: true - Flows with text
 * - atom: true - Treated as single unit
 *
 * Attributes:
 * - tag: string - The tag name (without #)
 */
export const Hashtag = Node.create({
	name: 'hashtag',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			tag: {
				default: '',
				parseHTML: (element) => {
					return element.getAttribute('data-hashtag') || '';
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-hashtag]',
				getAttrs: (node) => {
					if (typeof node === 'string') return false;
					const tag = node.getAttribute('data-hashtag');
					return { tag: tag || '' };
				}
			}
		];
	},

	renderHTML({ node }) {
		const tag = node.attrs.tag as string;
		return [
			'span',
			mergeAttributes({
				'data-hashtag': tag,
				class: 'hashtag-chip'
			}),
			`#${tag}`
		];
	},

	addNodeView() {
		return ({ node }) => {
			const dom = document.createElement('span');
			dom.classList.add('hashtag-chip');
			dom.contentEditable = 'false';

			const tag = node.attrs.tag as string;
			dom.textContent = `#${tag}`;

			// ARIA attributes for accessibility
			dom.setAttribute('role', 'status');
			dom.setAttribute('aria-label', `Hashtag ${tag}`);

			return { dom };
		};
	},

	// @ts-expect-error - TipTap command typing requires exact match with RawCommands
	addCommands() {
		return {
			insertHashtag:
				(tag: string) =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { tag }
					});
				}
		};
	},

	addInputRules() {
		return [
			// Match #tagname followed by space or end of input
			// Only lowercase first letter to avoid hex colors
			new InputRule({
				find: /#([a-z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00e7\u0153\u00e6][a-zA-Z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00e7\u0153\u00e60-9_-]*)\s$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const tag = match[1];
					if (tag) {
						// Replace the hashtag text with the node, keeping the trailing space
						tr.replaceWith(range.from, range.to - 1, this.type.create({ tag }));
						// Add space after the node
						tr.insertText(' ');
					}
				}
			})
		];
	},

	addProseMirrorPlugins() {
		return [hashtagKeyboardNavPlugin];
	}
});
