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
import type { NodeViewRendererProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';

/**
 * MathField type with MathLive methods
 */
interface MathFieldElement extends HTMLElement {
	value: string;
	readOnly: boolean;
	focus(): void;
	executeCommand(command: string): void;
}

/**
 * Move-out event detail from MathLive
 */
interface MoveOutDetail {
	direction: 'forward' | 'backward' | 'upward' | 'downward';
}

/**
 * Math Keyboard Navigation Plugin
 * ================================
 * Must be defined at module level (both key AND plugin instance)
 * to avoid "duplicate keyed plugin" errors with multiple editors.
 */
const mathKeyboardNavKey = new PluginKey('mathKeyboardNav');
const mathNodeTypes = ['mathInline', 'mathBlock'];

const mathKeyboardNavPlugin = new Plugin({
	key: mathKeyboardNavKey,
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
				// Check if there's a math node immediately after cursor
				const nodeAfter = $from.nodeAfter;
				if (nodeAfter && mathNodeTypes.includes(nodeAfter.type.name)) {
					// Find the DOM element for this node
					const domNode = view.nodeDOM(pos) as
						| (HTMLElement & { mathfield?: MathFieldElement })
						| null;
					if (domNode?.mathfield) {
						event.preventDefault();
						domNode.mathfield.focus();
						domNode.mathfield.executeCommand('moveToMathfieldStart');
						return true;
					}
				}
			} else if (event.key === 'ArrowLeft') {
				// Check if there's a math node immediately before cursor
				const nodeBefore = $from.nodeBefore;
				if (nodeBefore && mathNodeTypes.includes(nodeBefore.type.name)) {
					// Find the DOM element for the node before cursor
					// The node starts at pos - nodeBefore.nodeSize
					const nodeStartPos = pos - nodeBefore.nodeSize;
					const domNode = view.nodeDOM(nodeStartPos) as
						| (HTMLElement & { mathfield?: MathFieldElement })
						| null;
					if (domNode?.mathfield) {
						event.preventDefault();
						domNode.mathfield.focus();
						domNode.mathfield.executeCommand('moveToMathfieldEnd');
						return true;
					}
				}
			}

			return false;
		}
	}
});

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
	 * @param props - NodeViewRendererProps containing node, editor, and getPos
	 */
	addNodeView() {
		return ({ node, editor, getPos }: NodeViewRendererProps) => {
			// Create wrapper element
			const dom = document.createElement('span');
			dom.classList.add('math-inline-wrapper');

			// Create MathLive field (custom web component)
			const mathfield = document.createElement('math-field') as MathFieldElement;

			// Set initial LaTeX value
			mathfield.value = node.attrs.latex as string;

			// Style as inline element (CSS handles styling via .math-inline-wrapper)
			mathfield.style.display = 'inline-block';

			// Store mathfield reference on DOM for keyboard navigation plugin
			(dom as HTMLElement & { mathfield: MathFieldElement }).mathfield = mathfield;

			// If editor is read-only (display mode), make math field read-only too
			if (!editor.isEditable) {
				mathfield.readOnly = true;
				mathfield.setAttribute('readonly', ''); // For CSS targeting
			}

			// Listen for formula changes and update node attributes
			mathfield.addEventListener('input', (e) => {
				const target = e.target as MathFieldElement;
				const pos = getPos();

				// Only update if we have a valid position
				if (typeof pos === 'number') {
					editor.commands.updateAttributes('mathInline', {
						latex: target.value
					});
				}
			});

			/**
			 * Handle move-out event from MathLive
			 * When user navigates out of mathfield with arrow keys,
			 * return focus to TipTap editor at the appropriate position
			 */
			mathfield.addEventListener('move-out', (e: Event) => {
				const detail = (e as CustomEvent<MoveOutDetail>).detail;
				const pos = getPos();

				if (typeof pos !== 'number') return;

				e.preventDefault();

				// Calculate target position based on direction
				// pos is the position of the node, node size is 1 for atoms
				const targetPos =
					detail.direction === 'forward'
						? pos + 1 // After the math node
						: pos; // Before the math node

				// Set cursor position and focus editor
				editor.chain().focus().setTextSelection(targetPos).run();
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
	// TipTap's command typing is complex - using type assertion for custom commands
	// @ts-expect-error - TipTap command typing requires exact match with RawCommands
	addCommands() {
		return {
			insertMathInline:
				(latex = '') =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
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
	 * Detects $formula$ pattern and converts to math node.
	 *
	 * Regex: /\$([^$]+)\$$/
	 * - \$ - Opening dollar sign
	 * - ([^$]+) - Capture group: one or more non-$ characters (the formula)
	 * - \$ - Closing dollar sign
	 * - $ - End of input (ensures we match at cursor position)
	 *
	 * Example:
	 *   User types: "La formule $x^2$ est..." → Converts to math field
	 *
	 * @see https://tiptap.dev/docs/editor/extensions/functionality#input-rules
	 */
	addInputRules() {
		return [
			new InputRule({
				find: /\$([^$]+)\$$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const latex = match[1];
					if (latex) {
						tr.replaceWith(range.from, range.to, this.type.create({ latex: latex.trim() }));
					}
				}
			})
		];
	},

	/**
	 * ProseMirror Plugin for Keyboard Navigation
	 * ==========================================
	 *
	 * Returns the module-level plugin instance to avoid
	 * "duplicate keyed plugin" errors with multiple editors.
	 */
	addProseMirrorPlugins() {
		return [mathKeyboardNavPlugin];
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
		return ({ node, editor, getPos }: NodeViewRendererProps) => {
			// Create block wrapper
			const dom = document.createElement('div');
			dom.classList.add('math-block-wrapper');

			// Create MathLive field
			const mathfield = document.createElement('math-field') as MathFieldElement;

			// Set initial value
			mathfield.value = node.attrs.latex as string;

			// Style as block element (CSS handles styling via .math-block-wrapper)
			mathfield.style.display = 'block';

			// Store mathfield reference on DOM for keyboard navigation plugin
			(dom as HTMLElement & { mathfield: MathFieldElement }).mathfield = mathfield;

			// Read-only mode for display
			if (!editor.isEditable) {
				mathfield.readOnly = true;
				mathfield.setAttribute('readonly', ''); // For CSS targeting
			}

			// Sync changes back to node
			mathfield.addEventListener('input', (e) => {
				const target = e.target as MathFieldElement;
				const pos = getPos();

				if (typeof pos === 'number') {
					editor.commands.updateAttributes('mathBlock', {
						latex: target.value
					});
				}
			});

			/**
			 * Handle move-out event from MathLive
			 * When user navigates out of mathfield with arrow keys,
			 * return focus to TipTap editor at the appropriate position
			 */
			mathfield.addEventListener('move-out', (e: Event) => {
				const detail = (e as CustomEvent<MoveOutDetail>).detail;
				const pos = getPos();

				if (typeof pos !== 'number') return;

				e.preventDefault();

				// Calculate target position based on direction
				// For block nodes, forward goes after, backward goes before
				const targetPos =
					detail.direction === 'forward' || detail.direction === 'downward'
						? pos + 1 // After the math node
						: pos; // Before the math node

				// Set cursor position and focus editor
				editor.chain().focus().setTextSelection(targetPos).run();
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
	// TipTap's command typing is complex - using type assertion for custom commands
	// @ts-expect-error - TipTap command typing requires exact match with RawCommands
	addCommands() {
		return {
			insertMathBlock:
				(latex = '') =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { latex }
					});
				}
		};
	}
});
