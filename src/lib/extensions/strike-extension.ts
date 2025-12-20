/**
 * Strike Extension with ==text== Input Rule for TipTap
 * =====================================================
 *
 * Extends the default Strike extension with automatic Markdown-style input rule:
 * - ==text== -> applies strikethrough mark
 *
 * Uses a ProseMirror plugin with handleTextInput for reliable detection
 * (similar to code-extension.ts pattern).
 *
 * @module extensions/strike-extension
 */

import Strike from '@tiptap/extension-strike';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

/**
 * Plugin key for the strikethrough input handler
 */
const strikePluginKey = new PluginKey('strikeInput');

/**
 * Custom Strike extension with ==text== input handling
 *
 * Uses a ProseMirror plugin to detect when the user completes
 * a ==...== pattern by typing the closing ==
 */
export const CustomStrike = Strike.extend({
	// Disable parent's input rules - we handle it ourselves
	addInputRules() {
		return [];
	},

	addProseMirrorPlugins() {
		const type = this.type;

		return [
			new Plugin({
				key: strikePluginKey,
				props: {
					/**
					 * Intercept text input to detect strikethrough pattern ==text==
					 * This fires BEFORE the character is inserted
					 */
					handleTextInput(view, from, _to, text) {
						// Only process when typing an equals sign
						if (text !== '=') return false;

						const { state } = view;
						const $from = state.doc.resolve(from);
						const parent = $from.parent;
						const parentStart = $from.start(); // Document position where parent content starts
						const cursorOffset = $from.parentOffset; // Cursor position within parent

						// Get parent's text content
						const parentText = parent.textContent;

						// We need == before this = to close the pattern
						// Check if the character before cursor is =
						if (cursorOffset < 1 || parentText[cursorOffset - 1] !== '=') {
							return false;
						}

						// Search backwards for opening == pattern
						// We're looking for == that is NOT preceded by another =
						let openDoubleEqualOffset = -1;

						for (let i = cursorOffset - 2; i >= 1; i--) {
							// Check for == pattern at position i-1 and i
							if (parentText[i] === '=' && parentText[i - 1] === '=') {
								// Make sure this isn't preceded by another = (to avoid ===)
								if (i > 1 && parentText[i - 2] === '=') {
									continue; // Skip ===
								}
								openDoubleEqualOffset = i - 1;
								break;
							}
						}

						// No opening == found
						if (openDoubleEqualOffset === -1) return false;

						// Get content between == delimiters
						// Opening == is at positions openDoubleEqualOffset and openDoubleEqualOffset+1
						// Content starts at openDoubleEqualOffset+2
						// Content ends at cursorOffset-1 (before the = we just checked)
						const contentStart = openDoubleEqualOffset + 2;
						const contentEnd = cursorOffset - 1; // Exclude the = before cursor

						const content = parentText.slice(contentStart, contentEnd);

						// Validate content
						if (!content || content.trim() === '') {
							return false;
						}

						// Make sure the content doesn't contain == (which would be ambiguous)
						if (content.includes('==')) {
							return false;
						}

						// Calculate document positions
						const patternStartInDoc = parentStart + openDoubleEqualOffset;
						const patternEndInDoc = from; // Cursor position (before the = we're typing)

						// Create transaction
						const tr = state.tr;

						// Delete the ==content= pattern (from opening == to cursor)
						tr.delete(patternStartInDoc, patternEndInDoc);

						// Insert the content with strike mark
						const strikeMark = type.create();
						const contentWithMark = state.schema.text(content, [strikeMark]);
						tr.insert(patternStartInDoc, contentWithMark);

						// Insert a space WITHOUT any marks (explicitly no marks)
						const spacePos = patternStartInDoc + content.length;
						const spaceNode = state.schema.text(' ', []); // Empty marks array
						tr.insert(spacePos, spaceNode);

						// Position cursor after the space
						const cursorPos = spacePos + 1;
						tr.setSelection(TextSelection.create(tr.doc, cursorPos));

						// Remove stored mark so next typing isn't in strikethrough
						tr.removeStoredMark(type);

						view.dispatch(tr);
						return true; // Prevent default handling (don't insert the =)
					}
				}
			})
		];
	}
});

export default CustomStrike;
