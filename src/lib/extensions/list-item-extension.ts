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

			// Mod+Enter: Insert new paragraph in same list item
			'Mod-Enter': ({ editor }) => {
				const { state } = editor;
				const { selection } = state;
				const { $from } = selection;

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

				// Find the end of the current block (paragraph) we're in
				const currentBlockDepth = $from.depth;
				const currentBlockEnd = $from.end(currentBlockDepth);

				// Create a new empty paragraph
				const newParagraph = paragraphType.create();

				// Insert the new paragraph after the current block
				const tr = state.tr;
				tr.insert(currentBlockEnd + 1, newParagraph);

				// Move cursor to the new paragraph
				const newPos = currentBlockEnd + 2; // +1 for after current block, +1 to be inside new paragraph
				tr.setSelection(TextSelection.create(tr.doc, newPos));

				editor.view.dispatch(tr);
				return true;
			}
		};
	}
});

export default CustomListItem;
