/**
 * TipTap Extension for Mention Support
 * =====================================
 *
 * Custom TipTap node extension that creates visual chips for user mentions.
 * Mentions are used to reference users (e.g., @alice, @professeur).
 *
 * Syntax: @username (must start with letter)
 *
 * Features:
 * - Automatic @username syntax detection via input rule
 * - Visual amber/yellow chip styling
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
 * Mention Keyboard Navigation Plugin
 * Handles arrow key navigation to select mention nodes.
 */
const mentionKeyboardNavKey = new PluginKey('mentionKeyboardNav');

const mentionKeyboardNavPlugin = new Plugin({
	key: mentionKeyboardNavKey,
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
				// Check if there's a mention node immediately after cursor
				const nodeAfter = $from.nodeAfter;
				if (nodeAfter && nodeAfter.type.name === 'mention') {
					event.preventDefault();
					const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos));
					view.dispatch(tr);
					return true;
				}
			} else if (event.key === 'ArrowLeft') {
				// Check if there's a mention node immediately before cursor
				const nodeBefore = $from.nodeBefore;
				if (nodeBefore && nodeBefore.type.name === 'mention') {
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
// MENTION EXTENSION
// ============================================================================

/**
 * Mention Extension
 * =================
 *
 * Creates inline mention chips for user references.
 * Syntax: @username
 *
 * Node Configuration:
 * - group: 'inline' - Can appear within paragraphs
 * - inline: true - Flows with text
 * - atom: true - Treated as single unit
 *
 * Attributes:
 * - username: string - The username (without @)
 */
export const Mention = Node.create({
	name: 'mention',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			username: {
				default: '',
				parseHTML: (element) => {
					return element.getAttribute('data-mention') || '';
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-mention]',
				getAttrs: (node) => {
					if (typeof node === 'string') return false;
					const username = node.getAttribute('data-mention');
					return { username: username || '' };
				}
			}
		];
	},

	renderHTML({ node }) {
		const username = node.attrs.username as string;
		return [
			'span',
			mergeAttributes({
				'data-mention': username,
				class: 'mention-chip'
			}),
			`@${username}`
		];
	},

	addNodeView() {
		return ({ node }) => {
			const dom = document.createElement('span');
			dom.classList.add('mention-chip');
			dom.contentEditable = 'false';

			const username = node.attrs.username as string;
			dom.textContent = `@${username}`;

			// ARIA attributes for accessibility
			dom.setAttribute('role', 'status');
			dom.setAttribute('aria-label', `Mention de ${username}`);

			return { dom };
		};
	},

	// @ts-expect-error - TipTap command typing requires exact match with RawCommands
	addCommands() {
		return {
			insertMention:
				(username: string) =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { username }
					});
				}
		};
	},

	addInputRules() {
		return [
			// Match @username followed by space or end of input
			// Must start with letter (not digit)
			new InputRule({
				find: /@([a-zA-Z][a-zA-Z0-9_.-]*)\s$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const username = match[1];
					if (username) {
						// Replace the mention text with the node, keeping the trailing space
						tr.replaceWith(range.from, range.to - 1, this.type.create({ username }));
						// Add space after the node
						tr.insertText(' ');
					}
				}
			})
		];
	},

	addProseMirrorPlugins() {
		return [mentionKeyboardNavPlugin];
	}
});
