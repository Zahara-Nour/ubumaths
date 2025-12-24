/**
 * Custom ListItem Extension for TipTap
 * =====================================
 *
 * Extends the default ListItem with additional keyboard shortcuts:
 *
 * - Mod+Enter: Create a new paragraph within the same list item
 *   (instead of creating a new list item)
 *
 * This allows users to have multiple paragraphs in a single list item,
 * which is useful for complex list content.
 *
 * @module extensions/list-item-extension
 */

import ListItem from '@tiptap/extension-list-item';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Custom ListItem extension with Mod+Enter support
 *
 * Adds a keyboard shortcut to insert a new paragraph within the same
 * list item, enabling multi-paragraph list items.
 */
export const CustomListItem = ListItem.extend({
	addKeyboardShortcuts() {
		return {
			...this.parent?.(),

			// Mod+Enter: Split paragraph at cursor position within same list item
			'Mod-Enter': ({ editor }) => {
				const { state } = editor;
				const { selection } = state;
				const { $from, from } = selection;

				// Check if we're inside a listItem
				let listItemDepth = -1;
				for (let depth = $from.depth; depth > 0; depth--) {
					if ($from.node(depth).type.name === 'listItem') {
						listItemDepth = depth;
						break;
					}
				}

				// Not in a list item - let default behavior handle it
				if (listItemDepth === -1) {
					return false;
				}

				// Get the paragraph schema type
				const paragraphType = state.schema.nodes.paragraph;
				if (!paragraphType) {
					return false;
				}

				// Get current block info
				const currentBlockDepth = $from.depth;
				const currentBlockEnd = $from.end(currentBlockDepth);

				// Get content after cursor (to move to new paragraph)
				const contentAfterCursor = state.doc.slice(from, currentBlockEnd);

				const tr = state.tr;

				// Delete content after cursor from current paragraph
				if (from < currentBlockEnd) {
					tr.delete(from, currentBlockEnd);
				}

				// Calculate position after deletion for inserting new paragraph
				const insertPos = from + 1; // +1 to be after the current paragraph's closing tag

				// Create new paragraph with the content that was after cursor
				const newParagraph = paragraphType.create(null, contentAfterCursor.content);

				// Insert the new paragraph
				tr.insert(insertPos, newParagraph);

				// Move cursor to the beginning of the new paragraph
				const newCursorPos = insertPos + 1; // +1 to be inside the new paragraph
				tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

				editor.view.dispatch(tr);
				return true;
			}
		};
	}
});

export default CustomListItem;
