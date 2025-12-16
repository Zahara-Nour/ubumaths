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
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import { parseCustomSafe, toLatex, parseLatexSafe, toCustom } from '$lib/mathAST';

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		mathInline: {
			/**
			 * Insert an inline math field
			 */
			insertMathInline: (
				latex?: string,
				syntax?: string,
				originalExpression?: string
			) => ReturnType;
		};
		mathBlock: {
			/**
			 * Insert a block math field
			 */
			insertMathBlock: (latex?: string, syntax?: string, originalExpression?: string) => ReturnType;
		};
	}
}

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
 * Convert LaTeX to custom syntax if possible.
 * Falls back to LaTeX if parsing fails.
 *
 * @param latex - LaTeX string from MathLive
 * @returns Object with expression and syntax
 */
function latexToCustomSyntax(latex: string): { expression: string; syntax: 'latex' | 'custom' } {
	const parseResult = parseLatexSafe(latex);
	if (parseResult.ast !== null) {
		try {
			const customExpr = toCustom(parseResult.ast);
			return { expression: customExpr, syntax: 'custom' };
		} catch {
			// toCustom failed, fall back to latex
			return { expression: latex, syntax: 'latex' };
		}
	}
	// Parsing failed, keep as latex
	return { expression: latex, syntax: 'latex' };
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
	 * - latex: The LaTeX formula string (transpiled or raw)
	 * - syntax: Which syntax was used ('latex' for $...$ or 'custom' for ~...~)
	 * - originalExpression: The raw expression before transpilation (for round-trip)
	 */
	addAttributes() {
		return {
			latex: {
				default: ''
			},
			syntax: {
				default: 'latex' // Default for backward compatibility
			},
			originalExpression: {
				default: '' // Default for backward compatibility
			}
		};
	},

	/**
	 * HTML parsing rules
	 * Recognizes <span data-math-inline> tags when loading from HTML
	 * Extracts data-math-syntax and data-math-original attributes
	 */
	parseHTML() {
		return [
			{
				tag: 'span[data-math-inline]',
				getAttrs: (node) => {
					const element = node as HTMLElement;
					return {
						syntax: element.getAttribute('data-math-syntax') || 'latex',
						originalExpression: element.getAttribute('data-math-original') || ''
					};
				}
			}
		];
	},

	/**
	 * HTML rendering rules
	 * Converts node to <span data-math-inline> when serializing to HTML
	 * Includes data-math-syntax and data-math-original for round-trip support
	 */
	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(
				{
					'data-math-inline': '',
					'data-math-syntax': node.attrs.syntax,
					'data-math-original': node.attrs.originalExpression
				},
				HTMLAttributes
			)
		];
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
			(dom as unknown as HTMLElement & { mathfield: MathFieldElement }).mathfield = mathfield;

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
					// IMPORTANT: Use a transaction that targets THIS specific node by position
					// Do NOT use updateAttributes() as it operates on the current selection,
					// which may be a different math node, causing state corruption
					const { tr } = editor.state;
					const nodeAtPos = editor.state.doc.nodeAt(pos);

					if (nodeAtPos && nodeAtPos.type.name === 'mathInline') {
						// When user edits via math-field, MathLive returns LaTeX.
						// If original syntax was 'custom', convert back to custom syntax if possible.
						const originalSyntax = nodeAtPos.attrs.syntax as string;
						let newExpression: string;
						let newSyntax: 'latex' | 'custom';

						if (originalSyntax === 'custom') {
							// Try to convert to custom syntax
							const converted = latexToCustomSyntax(target.value);
							newExpression = converted.expression;
							newSyntax = converted.syntax;
						} else {
							// Keep as latex
							newExpression = target.value;
							newSyntax = 'latex';
						}

						tr.setNodeMarkup(pos, undefined, {
							...nodeAtPos.attrs,
							latex: target.value,
							originalExpression: newSyntax === 'custom' ? newExpression : '',
							syntax: newSyntax
						});
						editor.view.dispatch(tr);
					}
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

				// Check if the position is valid for text selection
				const { doc, tr } = editor.state;
				const clampedPos = Math.min(targetPos, doc.content.size);
				const $pos = doc.resolve(clampedPos);

				// Only set text selection if position is inside inline content
				if ($pos.parent.inlineContent) {
					editor.chain().focus().setTextSelection(clampedPos).run();
				} else {
					// Fallback: find nearest valid selection using Selection.near
					const bias = detail.direction === 'forward' ? 1 : -1;
					const nearSelection = Selection.near($pos, bias);
					editor.view.dispatch(tr.setSelection(nearSelection).scrollIntoView());
					editor.view.focus();
				}
			});

			dom.appendChild(mathfield);

			return {
				dom,
				/**
				 * Handle node updates without recreating the DOM.
				 * This preserves focus when the user is typing in the mathfield.
				 */
				update: (updatedNode: typeof node) => {
					// Only handle updates for the same node type
					if (updatedNode.type.name !== 'mathInline') return false;

					// Only update mathfield if the value actually differs
					// (avoid updating when we're the source of the change)
					if (updatedNode.attrs.latex !== mathfield.value) {
						mathfield.value = updatedNode.attrs.latex as string;
					}

					return true; // View can be reused
				},
				/**
				 * Tell ProseMirror to ignore events from within the math-field.
				 * This prevents the editor from stealing focus when clicking
				 * on complex formulas like fractions.
				 */
				stopEvent: (event: Event) => {
					// Check if the event target is within the mathfield
					const target = event.target;
					if (target instanceof HTMLElement || target instanceof Element) {
						// Check if target is the mathfield or inside it
						if (target === mathfield || mathfield.contains(target)) {
							return true; // Stop ProseMirror from handling this event
						}
					}
					return false;
				}
			};
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
	 *   editor.commands.insertMathInline('x^2', 'custom', 'x^2') // With syntax
	 */
	addCommands() {
		return {
			insertMathInline:
				(latex = '', syntax = 'latex', originalExpression = '') =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { latex, syntax, originalExpression }
					});
				}
		};
	},

	/**
	 * Input Rules (Automatic Pattern Detection)
	 * =========================================
	 *
	 * Detects $formula$ and ~formula~ patterns and converts to math nodes.
	 * The formula content is parsed using mathAST custom syntax and
	 * transpiled to LaTeX before creating the math field.
	 *
	 * Regex for $...$: /\$([^$]+)\$$/
	 * - \$ - Opening dollar sign
	 * - ([^$]+) - Capture group: one or more non-$ characters (the formula)
	 * - \$ - Closing dollar sign
	 * - $ - End of input (ensures we match at cursor position)
	 *
	 * Regex for ~...~: /~([^~]+)~$/
	 * - ~ - Opening tilde
	 * - ([^~]+) - Capture group: one or more non-~ characters (the formula)
	 * - ~ - Closing tilde
	 * - $ - End of input (ensures we match at cursor position)
	 *
	 * Examples:
	 *   User types: "$x^2$" → LaTeX syntax, may transpile
	 *   User types: "~x^2~" → Custom syntax, transpiled to LaTeX
	 *   User types: "$2/3$" → LaTeX syntax, transpiles to "\frac{2}{3}"
	 *   User types: "~2/3~" → Custom syntax, transpiles to "\frac{2}{3}"
	 *
	 * @see https://tiptap.dev/docs/editor/extensions/functionality#input-rules
	 * @see src/lib/mathAST for custom syntax documentation
	 */
	addInputRules() {
		return [
			// LaTeX syntax: $...$
			new InputRule({
				find: /\$([^$]+)\$$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const input = match[1]?.trim();
					if (input) {
						// Try to parse as mathAST custom syntax and convert to LaTeX
						// If parsing fails (ast is null), use raw input as fallback (assumes LaTeX)
						const parseResult = parseCustomSafe(input);
						const latex = parseResult.ast ? toLatex(parseResult.ast) : input;
						tr.replaceWith(
							range.from,
							range.to,
							this.type.create({
								latex,
								syntax: 'latex',
								originalExpression: input
							})
						);
					}
				}
			}),
			// Custom syntax: ~...~
			new InputRule({
				find: /~([^~]+)~$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const input = match[1]?.trim();
					if (input) {
						// Try to parse as mathAST custom syntax and convert to LaTeX
						// If parsing fails, use raw input as fallback
						const parseResult = parseCustomSafe(input);
						const latex = parseResult.ast ? toLatex(parseResult.ast) : input;
						tr.replaceWith(
							range.from,
							range.to,
							this.type.create({
								latex,
								syntax: 'custom',
								originalExpression: input
							})
						);
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
	 * - latex: The LaTeX formula string (transpiled or raw)
	 * - syntax: Which syntax was used ('latex' for manual or 'custom' for ~~...~~)
	 * - originalExpression: The raw expression before transpilation (for round-trip)
	 */
	addAttributes() {
		return {
			latex: {
				default: ''
			},
			syntax: {
				default: 'latex' // Default for backward compatibility
			},
			originalExpression: {
				default: '' // Default for backward compatibility
			}
		};
	},

	/**
	 * HTML parsing rules
	 * Extracts data-math-syntax and data-math-original attributes
	 */
	parseHTML() {
		return [
			{
				tag: 'div[data-math-block]',
				getAttrs: (node) => {
					const element = node as HTMLElement;
					return {
						syntax: element.getAttribute('data-math-syntax') || 'latex',
						originalExpression: element.getAttribute('data-math-original') || ''
					};
				}
			}
		];
	},

	/**
	 * HTML rendering rules
	 * Includes data-math-syntax and data-math-original for round-trip support
	 */
	renderHTML({ node, HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(
				{
					'data-math-block': '',
					'data-math-syntax': node.attrs.syntax,
					'data-math-original': node.attrs.originalExpression
				},
				HTMLAttributes
			)
		];
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
			// Create outer wrapper for centering
			const dom = document.createElement('div');
			dom.classList.add('math-block-wrapper');

			// Create inner wrapper that shrinks to content
			const innerWrapper = document.createElement('div');
			innerWrapper.classList.add('math-block-inner');

			// Create MathLive field
			const mathfield = document.createElement('math-field') as MathFieldElement;

			// Set initial value
			mathfield.value = node.attrs.latex as string;

			// Store mathfield reference on DOM for keyboard navigation plugin
			(dom as unknown as HTMLElement & { mathfield: MathFieldElement }).mathfield = mathfield;

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
					// IMPORTANT: Use a transaction that targets THIS specific node by position
					// Do NOT use updateAttributes() as it operates on the current selection,
					// which may be a different math node, causing state corruption
					const { tr } = editor.state;
					const nodeAtPos = editor.state.doc.nodeAt(pos);

					if (nodeAtPos && nodeAtPos.type.name === 'mathBlock') {
						// Strip displaystyle prefix before storing
						const cleanLatex = fromDisplayStyle(target.value);

						// When user edits via math-field, MathLive returns LaTeX.
						// If original syntax was 'custom', convert back to custom syntax if possible.
						const originalSyntax = nodeAtPos.attrs.syntax as string;
						let newExpression: string;
						let newSyntax: 'latex' | 'custom';

						if (originalSyntax === 'custom') {
							// Try to convert to custom syntax
							const converted = latexToCustomSyntax(cleanLatex);
							newExpression = converted.expression;
							newSyntax = converted.syntax;
						} else {
							// Keep as latex
							newExpression = cleanLatex;
							newSyntax = 'latex';
						}

						tr.setNodeMarkup(pos, undefined, {
							...nodeAtPos.attrs,
							latex: cleanLatex,
							originalExpression: newSyntax === 'custom' ? newExpression : '',
							syntax: newSyntax
						});
						editor.view.dispatch(tr);
					}
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

				// Check if the position is valid for text selection
				const { doc, tr } = editor.state;
				const clampedPos = Math.min(targetPos, doc.content.size);
				const $pos = doc.resolve(clampedPos);

				// Only set text selection if position is inside inline content
				if ($pos.parent.inlineContent) {
					editor.chain().focus().setTextSelection(clampedPos).run();
				} else {
					// Fallback: find nearest valid selection using Selection.near
					// bias: 1 for forward/down, -1 for backward/up
					const bias = detail.direction === 'forward' || detail.direction === 'downward' ? 1 : -1;
					const nearSelection = Selection.near($pos, bias);
					editor.view.dispatch(tr.setSelection(nearSelection).scrollIntoView());
					editor.view.focus();
				}
			});

			innerWrapper.appendChild(mathfield);
			dom.appendChild(innerWrapper);

			return {
				dom,
				/**
				 * Handle node updates without recreating the DOM.
				 * This preserves focus when the user is typing in the mathfield.
				 */
				update: (updatedNode: typeof node) => {
					// Only handle updates for the same node type
					if (updatedNode.type.name !== 'mathBlock') return false;

					// Only update mathfield if the value actually differs
					// Compare stored latex (without displaystyle) with mathfield value (with displaystyle)
					const displayValue = toDisplayStyle(updatedNode.attrs.latex as string);
					if (displayValue !== mathfield.value) {
						mathfield.value = displayValue;
					}

					return true; // View can be reused
				},
				/**
				 * Tell ProseMirror to ignore events from within the math-field.
				 * This prevents the editor from stealing focus when clicking
				 * on complex formulas like fractions.
				 */
				stopEvent: (event: Event) => {
					// Check if the event target is within the mathfield
					const target = event.target;
					if (target instanceof HTMLElement || target instanceof Element) {
						// Check if target is the mathfield or inside it
						if (target === mathfield || mathfield.contains(target)) {
							return true; // Stop ProseMirror from handling this event
						}
					}
					return false;
				}
			};
		};
	},

	/**
	 * Custom Commands
	 * ===============
	 *
	 * Adds editor.commands.insertMathBlock() command.
	 *
	 * Usage:
	 *   editor.commands.insertMathBlock('\\int_0^\\infty e^{-x^2} dx')
	 *   editor.commands.insertMathBlock('\\sqrt{16}', 'custom', 'sqrt(16)') // With syntax
	 */
	addCommands() {
		return {
			insertMathBlock:
				(latex = '', syntax = 'latex', originalExpression = '') =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { latex, syntax, originalExpression }
					});
				}
		};
	},

	/**
	 * Input Rules for Block Math (~~...~~)
	 * ====================================
	 *
	 * Detects ~~formula~~ pattern and converts to block math node.
	 * The formula content is parsed using mathAST custom syntax and
	 * transpiled to LaTeX before creating the math field.
	 *
	 * Regex: /~~([^~]+)~~$/
	 * - ~~ - Opening double tilde
	 * - ([^~]+) - Capture group: one or more non-~ characters (the formula)
	 * - ~~ - Closing double tilde
	 * - $ - End of input (ensures we match at cursor position)
	 *
	 * Examples:
	 *   User types: "~~x^2~~" → Custom syntax block math
	 *   User types: "~~sqrt(16)~~" → Transpiles to "\sqrt{16}"
	 */
	addInputRules() {
		return [
			// Custom syntax block: ~~...~~
			new InputRule({
				find: /~~([^~]+)~~$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const input = match[1]?.trim();
					if (input) {
						// Try to parse as mathAST custom syntax and convert to LaTeX
						// If parsing fails, use raw input as fallback
						const parseResult = parseCustomSafe(input);
						const latex = parseResult.ast ? toLatex(parseResult.ast) : input;
						tr.replaceWith(
							range.from,
							range.to,
							this.type.create({
								latex,
								syntax: 'custom',
								originalExpression: input
							})
						);
					}
				}
			})
		];
	}
});
