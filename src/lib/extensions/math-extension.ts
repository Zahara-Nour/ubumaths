/**
 * TipTap Extensions for Mathematical Formula Support
 * ===================================================
 *
 * Custom TipTap node extensions that integrate MathLive for interactive
 * mathematical formula editing within rich text content.
 *
 * Features:
 * - Inline math formulas (within text flow)
 * - Block math formulas (centered, larger)
 * - Automatic $$...$$ LaTeX detection
 * - Interactive MathLive fields
 * - Read-only mode for display
 *
 * @see https://tiptap.dev/docs/editor/extensions/custom-extensions
 * @see https://cortexjs.io/mathlive/
 */

import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';

/**
 * MathInline Extension
 * ====================
 *
 * Creates inline mathematical formulas that flow within text.
 * Example: "La formule x² + y² s'insère dans le texte."
 *
 * Node Configuration:
 * - group: 'inline' - Can appear within paragraphs
 * - inline: true - Flows with text (not a block)
 * - atom: true - Treated as single unit (can't edit inside as text)
 *
 * Attributes:
 * - latex: string - The LaTeX formula (e.g., "x^2 + y^2")
 *
 * Usage:
 *   editor.commands.insertMathInline('\\frac{a}{b}')
 *
 * Automatic Detection:
 *   Type: $$x^2$$ → Automatically converts to math field
 */
export const MathInline = Node.create({
	name: 'mathInline',
	group: 'inline',
	inline: true,
	atom: true,

	/**
	 * Define node attributes
	 * The 'latex' attribute stores the LaTeX formula string
	 */
	addAttributes() {
		return {
			latex: {
				default: ''
			}
		};
	},

	/**
	 * HTML parsing rules
	 * Recognizes <span data-math-inline> tags when loading from HTML
	 */
	parseHTML() {
		return [{ tag: 'span[data-math-inline]' }];
	},

	/**
	 * HTML rendering rules
	 * Converts node to <span data-math-inline> when serializing to HTML
	 */
	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes({ 'data-math-inline': '' }, HTMLAttributes)];
	},

	/**
	 * Custom Node View (DOM representation)
	 * =====================================
	 *
	 * Creates a MathLive <math-field> element for interactive formula editing.
	 *
	 * Process:
	 * 1. Create wrapper span with class 'math-inline-wrapper'
	 * 2. Create <math-field> custom element (from MathLive)
	 * 3. Set initial LaTeX value from node attributes
	 * 4. Configure as read-only if editor is not editable
	 * 5. Listen for input events to sync formula changes back to node
	 *
	 * @param node - The ProseMirror node containing our math data
	 * @param editor - The TipTap editor instance
	 * @param getPos - Function to get current position in document
	 */
	addNodeView() {
		return ({ node, editor, getPos }: { node: PMNode; editor: Editor; getPos: () => number }) => {
			// Create wrapper element
			const dom = document.createElement('span');
			dom.classList.add('math-inline-wrapper');

			// Create MathLive field (custom web component)
			const mathfield = document.createElement('math-field') as HTMLElement & {
				value: string;
				readOnly: boolean;
			};

			// Set initial LaTeX value
			mathfield.value = node.attrs.latex;

			// Style as inline element
			mathfield.style.display = 'inline-block';
			mathfield.style.fontSize = 'inherit';

			// If editor is read-only (display mode), make math field read-only too
			if (!editor.isEditable) {
				mathfield.readOnly = true;
			}

			// Listen for formula changes and update node attributes
			mathfield.addEventListener('input', (e) => {
				const target = e.target as HTMLElement & { value: string };
				const pos = getPos();

				// Only update if we have a valid position
				if (typeof pos === 'number') {
					editor.commands.updateAttributes('mathInline', {
						latex: target.value
					});
				}
			});

			dom.appendChild(mathfield);
			return { dom };
		};
	},

	/**
	 * Custom Commands
	 * ===============
	 *
	 * Adds editor.commands.insertMathInline() command for programmatic insertion.
	 *
	 * Usage:
	 *   editor.commands.insertMathInline('x^2 + y^2')
	 */
	addCommands() {
		return {
			insertMathInline:
				(latex = '') =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: { latex }
					});
				}
		};
	},

	/**
	 * Input Rules (Automatic Pattern Detection)
	 * =========================================
	 *
	 * Automatically detects $$...$$ patterns and converts them to math nodes.
	 *
	 * Regex: /\$\$([^\$]+)\$\$$/
	 * - \$\$ - Opening delimiter (escaped $)
	 * - ([^\$]+) - Capture group: one or more non-$ characters (the formula)
	 * - \$\$ - Closing delimiter
	 * - $ - End of input (ensures we match at cursor position)
	 *
	 * Example:
	 *   User types: "La formule $$x^2+y^2$$ est..."
	 *   When the second $$ is typed, text is replaced with math field
	 *
	 * @see https://tiptap.dev/docs/editor/extensions/functionality#input-rules
	 */
	addInputRules() {
		return [
			new InputRule({
				// Pattern to detect: $$formula$$
				find: /\$\$([^$]+)\$\$$/,

				// Handler called when pattern is matched
				handler: ({ state, range, match }) => {
					const { tr } = state; // Transaction (ProseMirror's way of modifying document)
					const start = range.from; // Start position of match
					const end = range.to; // End position of match
					const latex = match[1]; // Captured formula (between $$)

					if (latex) {
						// Replace matched text with math node
						tr.replaceWith(
							start,
							end,
							this.type.create({
								latex: latex.trim() // Remove leading/trailing whitespace
							})
						);
					}
				}
			})
		];
	}
});

/**
 * MathBlock Extension
 * ===================
 *
 * Creates block-level mathematical formulas that appear centered and larger.
 * Example: A standalone equation on its own line.
 *
 * Node Configuration:
 * - group: 'block' - Takes up full width, can't be inline
 * - atom: true - Treated as single unit
 *
 * Attributes:
 * - latex: string - The LaTeX formula
 *
 * Usage:
 *   editor.commands.insertMathBlock('\\int_0^\\infty e^{-x^2} dx')
 *
 * Note: No automatic detection for block math (use button/command)
 */
export const MathBlock = Node.create({
	name: 'mathBlock',
	group: 'block',
	atom: true,

	/**
	 * Define node attributes
	 */
	addAttributes() {
		return {
			latex: {
				default: ''
			}
		};
	},

	/**
	 * HTML parsing rules
	 */
	parseHTML() {
		return [{ tag: 'div[data-math-block]' }];
	},

	/**
	 * HTML rendering rules
	 */
	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes({ 'data-math-block': '' }, HTMLAttributes)];
	},

	/**
	 * Custom Node View for Block Math
	 * ================================
	 *
	 * Similar to inline math, but:
	 * - Uses <div> wrapper (block element)
	 * - Larger font size (1.2em)
	 * - Centered text alignment
	 * - More padding
	 */
	addNodeView() {
		return ({ node, editor, getPos }: { node: PMNode; editor: Editor; getPos: () => number }) => {
			// Create block wrapper
			const dom = document.createElement('div');
			dom.classList.add('math-block-wrapper');

			// Create MathLive field
			const mathfield = document.createElement('math-field') as HTMLElement & {
				value: string;
				readOnly: boolean;
			};

			// Set initial value
			mathfield.value = node.attrs.latex;

			// Style as block element (centered, larger)
			mathfield.style.display = 'block';
			mathfield.style.fontSize = '1.2em';
			mathfield.style.textAlign = 'center';
			mathfield.style.padding = '1rem';

			// Read-only mode for display
			if (!editor.isEditable) {
				mathfield.readOnly = true;
			}

			// Sync changes back to node
			mathfield.addEventListener('input', (e) => {
				const target = e.target as HTMLElement & { value: string };
				const pos = getPos();

				if (typeof pos === 'number') {
					editor.commands.updateAttributes('mathBlock', {
						latex: target.value
					});
				}
			});

			dom.appendChild(mathfield);
			return { dom };
		};
	},

	/**
	 * Custom Commands
	 * ===============
	 *
	 * Adds editor.commands.insertMathBlock() command.
	 */
	addCommands() {
		return {
			insertMathBlock:
				(latex = '') =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: { latex }
					});
				}
		};
	}
});
