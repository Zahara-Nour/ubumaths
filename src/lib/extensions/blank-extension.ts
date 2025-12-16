/**
 * TipTap Extension for Blank Field Support
 * =========================================
 *
 * Custom TipTap node extension that creates visual chips for answer blanks
 * in exercises. These blanks correspond to input fields where students
 * enter their answers.
 *
 * Syntax: {{blank:N}} where N is a positive integer (1, 2, 3, ...)
 *
 * Features:
 * - Automatic {{blank:N}} syntax detection
 * - Visual orange chip with "Champ N" label
 * - Click-to-edit popover (simple number input)
 * - Keyboard navigation support
 * - Read-only mode for display
 * - Full ARIA accessibility
 *
 * @see https://tiptap.dev/docs/editor/extensions/custom-extensions
 */

import { Node as TipTapNode, mergeAttributes, InputRule } from '@tiptap/core';
import type { NodeViewRendererProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		blankField: {
			/**
			 * Insert a blank field with the given number
			 */
			insertBlankField: (number?: number) => ReturnType;
		};
	}
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates a blank number
 *
 * Valid blank numbers:
 * - Positive integers (1, 2, 3, ...)
 * - No zero
 * - No negative numbers
 * - No decimals
 *
 * @param value - The value to validate (string representation of number)
 * @returns true if valid, false otherwise
 */
export function validateBlankNumber(value: string): boolean {
	if (!value || value.length === 0) return false;

	// Must be digits only
	if (!/^\d+$/.test(value)) return false;

	// Parse as integer
	const num = parseInt(value, 10);

	// Must be positive (>= 1)
	return num >= 1;
}

// ============================================================================
// KEYBOARD NAVIGATION PLUGIN
// ============================================================================

/**
 * Blank Field Keyboard Navigation Plugin
 * =======================================
 * Separate plugin for BlankField to avoid conflicts with template extensions.
 * Handles arrow key navigation to select blank field nodes.
 */
const blankFieldKeyboardNavKey = new PluginKey('blankFieldKeyboardNav');

const blankFieldKeyboardNavPlugin = new Plugin({
	key: blankFieldKeyboardNavKey,
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
				// Check if there's a blankField node immediately after cursor
				const nodeAfter = $from.nodeAfter;
				if (nodeAfter && nodeAfter.type.name === 'blankField') {
					event.preventDefault();
					const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos));
					view.dispatch(tr);
					return true;
				}
			} else if (event.key === 'ArrowLeft') {
				// Check if there's a blankField node immediately before cursor
				const nodeBefore = $from.nodeBefore;
				if (nodeBefore && nodeBefore.type.name === 'blankField') {
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
// CHIP CREATION HELPERS
// ============================================================================

/**
 * Creates chip element for blank field with CSS classes and ARIA attributes
 *
 * Uses CSS classes from app.css:
 * - .template-chip (base styles)
 * - .template-chip-blank (orange color)
 *
 * ARIA attributes:
 * - role="button" for interactive chips
 * - aria-label with descriptive text
 * - tabindex="0" for keyboard navigation (editable only)
 * - aria-disabled="true" for read-only mode
 */
function createBlankChip(number: number, isEditable: boolean): HTMLSpanElement {
	const chip = document.createElement('span');

	// CSS classes (styles defined in app.css)
	chip.classList.add('template-chip', 'template-chip-blank');

	// Content
	chip.textContent = `Champ ${number}`;
	chip.contentEditable = 'false';

	// ARIA attributes for accessibility
	chip.setAttribute('role', 'button');
	chip.setAttribute('aria-label', `Champ de reponse ${number}`);

	if (isEditable) {
		chip.tabIndex = 0;
	} else {
		chip.setAttribute('aria-disabled', 'true');
	}

	return chip;
}

/**
 * Creates edit popover for blank field using CSS classes from app.css
 */
function createBlankEditPopover(
	currentNumber: number,
	onSave: (newNumber: number) => void,
	onClose: () => void
): HTMLDivElement {
	const popover = document.createElement('div');
	popover.classList.add('template-edit-popover');

	const label = document.createElement('span');
	label.textContent = 'Champ';
	label.classList.add('label');

	const input = document.createElement('input');
	input.type = 'number';
	input.min = '1';
	input.value = String(currentNumber);
	input.setAttribute('aria-label', 'Numero du champ');

	const saveBtn = document.createElement('button');
	saveBtn.textContent = 'OK';
	saveBtn.classList.add('blank-save');
	saveBtn.setAttribute('aria-label', 'Enregistrer');

	const errorMsg = document.createElement('span');
	errorMsg.classList.add('error-message');
	errorMsg.textContent = 'Nombre invalide';
	errorMsg.style.display = 'none';

	const handleSave = () => {
		const value = input.value.trim();
		if (validateBlankNumber(value)) {
			onSave(parseInt(value, 10));
			onClose();
		} else {
			errorMsg.style.display = 'inline';
			input.classList.add('error');
		}
	};

	input.addEventListener('input', () => {
		errorMsg.style.display = 'none';
		input.classList.remove('error');
	});

	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSave();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	});

	saveBtn.addEventListener('click', handleSave);

	popover.appendChild(label);
	popover.appendChild(input);
	popover.appendChild(saveBtn);
	popover.appendChild(errorMsg);

	// Focus input after popover is added to DOM
	setTimeout(() => {
		input.focus();
		input.select();
	}, 0);

	return popover;
}

// ============================================================================
// BLANK FIELD EXTENSION
// ============================================================================

/**
 * BlankField Extension
 * ====================
 *
 * Creates inline blank field chips for answer inputs.
 * Syntax: {{blank:N}}
 *
 * Node Configuration:
 * - group: 'inline' - Can appear within paragraphs
 * - inline: true - Flows with text
 * - atom: true - Treated as single unit
 *
 * Attributes:
 * - number: number - The blank field number (1, 2, 3, ...)
 */
export const BlankField = TipTapNode.create({
	name: 'blankField',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			number: {
				default: 1,
				parseHTML: (element) => {
					const value = element.getAttribute('data-template-blank');
					return value ? parseInt(value, 10) : 1;
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-template-blank]',
				getAttrs: (node) => {
					if (typeof node === 'string') return false;
					const value = node.getAttribute('data-template-blank');
					return { number: value ? parseInt(value, 10) : 1 };
				}
			}
		];
	},

	renderHTML({ node }) {
		const number = node.attrs.number as number;
		return [
			'span',
			mergeAttributes({
				'data-template-blank': String(number)
			}),
			`{{blank:${number}}}`
		];
	},

	addNodeView() {
		return ({ node, editor, getPos }: NodeViewRendererProps) => {
			const dom = document.createElement('span');
			dom.classList.add('blank-field-wrapper');
			dom.style.cssText = 'display: inline; position: relative;';

			const number = node.attrs.number as number;
			const chip = createBlankChip(number, editor.isEditable);
			let popover: HTMLDivElement | null = null;

			const closePopover = () => {
				if (popover) {
					popover.remove();
					popover = null;
				}
			};

			if (editor.isEditable) {
				chip.addEventListener('click', (e) => {
					e.stopPropagation();
					closePopover();

					popover = createBlankEditPopover(
						number,
						(newNumber) => {
							const pos = getPos();
							if (typeof pos === 'number') {
								editor
									.chain()
									.focus()
									.command(({ tr }) => {
										tr.setNodeMarkup(pos, undefined, { number: newNumber });
										return true;
									})
									.run();
							}
						},
						closePopover
					);

					dom.appendChild(popover);
				});
			}

			// Close popover when clicking outside
			const handleClickOutside = (e: MouseEvent) => {
				if (popover && !popover.contains(e.target as Node)) {
					closePopover();
				}
			};
			document.addEventListener('click', handleClickOutside);

			dom.appendChild(chip);

			return {
				dom,
				destroy: () => {
					document.removeEventListener('click', handleClickOutside);
					closePopover();
				}
			};
		};
	},

	addCommands() {
		return {
			insertBlankField:
				(number = 1) =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { number }
					});
				}
		};
	},

	addInputRules() {
		return [
			new InputRule({
				find: /\{\{blank:(\d+)\}\}$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const numberStr = match[1]?.trim();
					if (numberStr && validateBlankNumber(numberStr)) {
						const number = parseInt(numberStr, 10);
						tr.replaceWith(range.from, range.to, this.type.create({ number }));
					}
				}
			})
		];
	},

	addProseMirrorPlugins() {
		return [blankFieldKeyboardNavPlugin];
	}
});
