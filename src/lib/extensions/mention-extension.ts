/**
 * TipTap Extension for Mention Support
 * =====================================
 *
 * Custom TipTap node extension that creates visual chips for user mentions.
 * Mentions are used to reference users (e.g., @alice, @professeur).
 *
 * Features:
 * - Automatic @username syntax detection via input rule
 * - Autocomplete popup with user search
 * - Visual amber/yellow chip styling
 * - Inline atomic node (non-editable)
 * - Keyboard navigation support
 *
 * @see https://tiptap.dev/docs/editor/extensions/custom-extensions
 */

import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import { searchUsers, type MentionUser } from '$lib/stores/mentions.svelte';
import { createSuggestionRenderer, type SuggestionItem } from '$lib/extensions/suggestion-renderer';

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
// SUGGESTION CONFIGURATION
// ============================================================================

/**
 * Convert MentionUser objects to SuggestionItem format
 */
function usersToItems(users: MentionUser[]): SuggestionItem[] {
	return users.map((user) => ({
		id: user.username,
		label: user.username,
		description: user.displayName
	}));
}

// ============================================================================
// MENTION EXTENSION
// ============================================================================

export interface MentionOptions {
	/** HTML attributes to add to the mention element */
	HTMLAttributes: Record<string, unknown>;
	/** Maximum number of suggestions to show */
	maxSuggestions: number;
}

/**
 * Mention Extension
 * =================
 *
 * Creates inline mention chips for user references.
 * Typing @ followed by text shows an autocomplete popup.
 *
 * Node Configuration:
 * - group: 'inline' - Can appear within paragraphs
 * - inline: true - Flows with text
 * - atom: true - Treated as single unit
 *
 * Attributes:
 * - username: string - The username (without @)
 */
export const Mention = Node.create<MentionOptions>({
	name: 'mention',
	group: 'inline',
	inline: true,
	atom: true,

	addOptions() {
		return {
			HTMLAttributes: {},
			maxSuggestions: 8
		};
	},

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

	renderHTML({ node, HTMLAttributes }) {
		const username = node.attrs.username as string;
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
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

	addProseMirrorPlugins() {
		return [
			mentionKeyboardNavPlugin,
			Suggestion({
				editor: this.editor,
				char: '@',
				pluginKey: new PluginKey('mentionSuggestion'),
				allowSpaces: false,
				allowedPrefixes: [' ', '\n', '\t', '(', '[', '{', '"', "'", '—', '–', '-'],
				startOfLine: true,

				// Filter items based on query (async)
				items: async ({ query }) => {
					const users = await searchUsers(query);
					return usersToItems(users.slice(0, this.options.maxSuggestions));
				},

				// Command to insert mention when selected
				command: ({ editor, range, props }) => {
					const item = props as SuggestionItem;
					editor
						.chain()
						.focus()
						.deleteRange(range)
						.insertContent({
							type: this.name,
							attrs: { username: item.id }
						})
						.run();
				},

				// Render suggestion popup
				render: () =>
					createSuggestionRenderer({
						type: 'mention',
						prefix: '@',
						noResultsText: 'Aucun utilisateur trouvé'
					})
			})
		];
	}
});
