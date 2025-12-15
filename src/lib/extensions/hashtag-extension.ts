/**
 * TipTap Extension for Hashtag Support
 * =====================================
 *
 * Custom TipTap node extension that creates visual chips for hashtags.
 * Hashtags are used for categorizing content (e.g., #mathematiques, #facile).
 *
 * Features:
 * - Automatic #tag syntax detection via input rule
 * - Autocomplete popup with predefined hashtags
 * - Visual blue chip styling
 * - Inline atomic node (non-editable)
 * - Keyboard navigation support
 *
 * @see https://tiptap.dev/docs/editor/extensions/custom-extensions
 */

import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import { filterHashtags } from '$lib/stores/hashtags.svelte';
import { createSuggestionRenderer, type SuggestionItem } from '$lib/extensions/suggestion-renderer';

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
// SUGGESTION CONFIGURATION
// ============================================================================

/**
 * Convert hashtag strings to SuggestionItem format
 */
function hashtagsToItems(tags: string[]): SuggestionItem[] {
	return tags.map((tag) => ({
		id: tag,
		label: tag
	}));
}

// ============================================================================
// HASHTAG EXTENSION
// ============================================================================

export interface HashtagOptions {
	/** HTML attributes to add to the hashtag element */
	HTMLAttributes: Record<string, unknown>;
	/** Maximum number of suggestions to show */
	maxSuggestions: number;
}

/**
 * Hashtag Extension
 * =================
 *
 * Creates inline hashtag chips for content categorization.
 * Typing # followed by text shows an autocomplete popup.
 *
 * Node Configuration:
 * - group: 'inline' - Can appear within paragraphs
 * - inline: true - Flows with text
 * - atom: true - Treated as single unit
 *
 * Attributes:
 * - tag: string - The tag name (without #)
 */
export const Hashtag = Node.create<HashtagOptions>({
	name: 'hashtag',
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

	renderHTML({ node, HTMLAttributes }) {
		const tag = node.attrs.tag as string;
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
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

	addProseMirrorPlugins() {
		return [
			hashtagKeyboardNavPlugin,
			Suggestion({
				editor: this.editor,
				char: '#',
				pluginKey: new PluginKey('hashtagSuggestion'),
				allowSpaces: false,
				// Note: hyphen '-' must be first to avoid invalid regex range in character class
				allowedPrefixes: ['-', ' ', '\n', '\t', '(', '[', '{', '"', "'", '—', '–'],
				startOfLine: true,

				// Filter items based on query
				items: ({ query }) => {
					const filtered = filterHashtags(query);
					return hashtagsToItems(filtered.slice(0, this.options.maxSuggestions));
				},

				// Command to insert hashtag when selected
				command: ({ editor, range, props }) => {
					const item = props as SuggestionItem;
					editor
						.chain()
						.focus()
						.deleteRange(range)
						.insertContent({
							type: this.name,
							attrs: { tag: item.id }
						})
						.run();
				},

				// Render suggestion popup
				render: () =>
					createSuggestionRenderer({
						type: 'hashtag',
						prefix: '#',
						noResultsText: 'Aucun hashtag trouvé'
					})
			})
		];
	}
});
