/**
 * TipTap Extensions for Template Syntax Support
 * ==============================================
 *
 * Custom TipTap node extensions that create visual chips for template syntax
 * within rich text content. These allow users to see and edit template
 * placeholders in a user-friendly way.
 *
 * Extensions:
 * - TemplateVariable: {{varName}} - Variable references (blue chips)
 * - TemplateRandom: {{1..10}} - Random number specs (green chips)
 * - TemplateEval: {{eval:expr}} - Expression evaluation (purple chips)
 *
 * Features:
 * - Automatic syntax detection via InputRules
 * - Visual chip rendering with Tailwind CSS
 * - Click-to-edit popover (simple text input)
 * - Keyboard navigation support
 * - Read-only mode for display
 *
 * @see https://tiptap.dev/docs/editor/extensions/custom-extensions
 */

import { Node as TipTapNode, mergeAttributes, InputRule } from '@tiptap/core';
import type { NodeViewRendererProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a variable name
 *
 * Valid variable names:
 * - Start with letter or underscore
 * - Contain only letters, digits, and underscores
 * - Not empty
 *
 * @param name - The variable name to validate
 * @returns true if valid, false otherwise
 */
export function validateVariableName(name: string): boolean {
	if (!name || name.length === 0) return false;
	// Must start with letter or underscore, followed by letters, digits, or underscores
	return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Validates a random specification
 *
 * Valid specs:
 * - Integer range: 1..10, -5..5
 * - Decimal digits: 2.3
 * - Decimal range: 0.5..9.99:0.01
 * - Discrete list: a|b|c
 * - With exclusions: 1..10!5, 1..20!5,7..9
 * - Relative integer: 2..9;+-
 * - With random: prefix: random:1..10
 *
 * @param spec - The random specification to validate
 * @returns true if valid, false otherwise
 */
export function validateRandomSpec(spec: string): boolean {
	if (!spec || spec.length === 0) return false;

	// Remove optional "random:" prefix
	const cleanSpec = spec.startsWith('random:') ? spec.slice(7) : spec;

	if (cleanSpec.length === 0) return false;

	// Discrete list: a|b|c
	if (cleanSpec.includes('|')) {
		const items = cleanSpec.split('|');
		return items.length >= 2 && items.every((item) => item.length > 0);
	}

	// Remove exclusions for validation
	const [mainSpec] = cleanSpec.split('!');
	if (!mainSpec) return false;

	// Remove relative modifier for validation
	const [rangeSpec] = mainSpec.split(';');
	if (!rangeSpec) return false;

	// Decimal digits format: 2.3 (single dot with digits on both sides, no range)
	if (/^\d+\.\d+$/.test(rangeSpec) && !rangeSpec.includes('..')) {
		return true;
	}

	// Integer or decimal range: 1..10, -5..5, 0.5..9.99, 0.5..9.99:0.01
	const rangeWithStepPattern = /^-?\d+(?:\.\d+)?\.{2}-?\d+(?:\.\d+)?(?::\d+(?:\.\d+)?)?$/;
	if (rangeWithStepPattern.test(rangeSpec)) {
		return true;
	}

	return false;
}

/**
 * Validates an eval expression
 *
 * Valid expressions:
 * - Non-empty mathematical expressions
 * - May contain variable references: {{a}}
 * - May have modifiers: expr|d, expr|+, expr|d,+
 *
 * @param expression - The expression to validate
 * @returns true if valid, false otherwise
 */
export function validateEvalExpression(expression: string): boolean {
	if (!expression || expression.length === 0) return false;

	// Extract expression part (before modifiers)
	const [exprPart] = expression.split('|');
	if (!exprPart || exprPart.trim().length === 0) return false;

	return true;
}

// ============================================================================
// KEYBOARD NAVIGATION PLUGIN
// ============================================================================

/**
 * Template Keyboard Navigation Plugin
 * ====================================
 * Must be defined at module level (both key AND plugin instance)
 * to avoid "duplicate keyed plugin" errors with multiple editors.
 */
const templateKeyboardNavKey = new PluginKey('templateKeyboardNav');
const templateNodeTypes = ['templateVariable', 'templateRandom', 'templateEval'];

const templateKeyboardNavPlugin = new Plugin({
	key: templateKeyboardNavKey,
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
				// Check if there's a template node immediately after cursor
				const nodeAfter = $from.nodeAfter;
				if (nodeAfter && templateNodeTypes.includes(nodeAfter.type.name)) {
					// Select the node
					event.preventDefault();
					const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos));
					view.dispatch(tr);
					return true;
				}
			} else if (event.key === 'ArrowLeft') {
				// Check if there's a template node immediately before cursor
				const nodeBefore = $from.nodeBefore;
				if (nodeBefore && templateNodeTypes.includes(nodeBefore.type.name)) {
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
 * Type labels for ARIA accessibility (French)
 */
type ChipType = 'variable' | 'random' | 'eval';

function getTypeLabel(type: ChipType): string {
	switch (type) {
		case 'variable':
			return 'Variable';
		case 'random':
			return 'Valeur aleatoire';
		case 'eval':
			return 'Expression';
	}
}

/**
 * Creates chip element with CSS classes and ARIA attributes
 *
 * Uses CSS classes from app.css:
 * - .template-chip (base styles)
 * - .template-chip-variable / .template-chip-random / .template-chip-eval
 *
 * ARIA attributes:
 * - role="button" for interactive chips
 * - aria-label with type and content description
 * - tabindex="0" for keyboard navigation (editable only)
 * - aria-disabled="true" for read-only mode
 */
function createChipElement(
	type: ChipType,
	content: string,
	editor: { isEditable: boolean }
): HTMLSpanElement {
	const chip = document.createElement('span');

	// CSS classes (styles defined in app.css)
	chip.classList.add('template-chip', `template-chip-${type}`);

	// Content
	chip.textContent = content;
	chip.contentEditable = 'false';

	// ARIA attributes for accessibility
	chip.setAttribute('role', 'button');
	chip.setAttribute('aria-label', `${getTypeLabel(type)}: ${content}`);

	if (editor.isEditable) {
		chip.tabIndex = 0;
	} else {
		chip.setAttribute('aria-disabled', 'true');
	}

	return chip;
}

/**
 * Creates a simple edit popover using CSS classes from app.css
 */
function createEditPopover(
	currentValue: string,
	validate: (value: string) => boolean,
	onSave: (newValue: string) => void,
	onClose: () => void
): HTMLDivElement {
	const popover = document.createElement('div');
	popover.classList.add('template-edit-popover');

	const input = document.createElement('input');
	input.type = 'text';
	input.value = currentValue;
	input.setAttribute('aria-label', 'Modifier la valeur');

	const saveBtn = document.createElement('button');
	saveBtn.textContent = 'OK';
	saveBtn.setAttribute('aria-label', 'Enregistrer');

	const errorMsg = document.createElement('span');
	errorMsg.classList.add('error-message');
	errorMsg.textContent = 'Syntaxe invalide';
	errorMsg.style.display = 'none';

	const handleSave = () => {
		const newValue = input.value.trim();
		if (validate(newValue)) {
			onSave(newValue);
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

	popover.appendChild(input);
	popover.appendChild(saveBtn);
	popover.appendChild(errorMsg);

	// Focus input after popover is added to DOM
	setTimeout(() => input.focus(), 0);

	return popover;
}

// ============================================================================
// TEMPLATE VARIABLE EXTENSION
// ============================================================================

/**
 * TemplateVariable Extension
 * ==========================
 *
 * Creates inline variable reference chips.
 * Syntax: {{varName}}
 *
 * Node Configuration:
 * - group: 'inline' - Can appear within paragraphs
 * - inline: true - Flows with text
 * - atom: true - Treated as single unit
 *
 * Attributes:
 * - name: string - The variable name
 */
export const TemplateVariable = TipTapNode.create({
	name: 'templateVariable',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			name: {
				default: ''
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-template-variable]',
				getAttrs: (node) => {
					if (typeof node === 'string') return false;
					return { name: node.getAttribute('data-template-variable') };
				}
			}
		];
	},

	renderHTML({ node }) {
		return [
			'span',
			mergeAttributes({
				'data-template-variable': node.attrs.name
			}),
			`{{${node.attrs.name}}}`
		];
	},

	addNodeView() {
		return ({ node, editor, getPos }: NodeViewRendererProps) => {
			const dom = document.createElement('span');
			dom.classList.add('template-variable-wrapper');
			dom.style.cssText = 'display: inline; position: relative;';

			const chip = createChipElement('variable', `{{${node.attrs.name}}}`, editor);
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

					popover = createEditPopover(
						node.attrs.name as string,
						validateVariableName,
						(newValue) => {
							const pos = getPos();
							if (typeof pos === 'number') {
								editor
									.chain()
									.focus()
									.command(({ tr }) => {
										tr.setNodeMarkup(pos, undefined, { name: newValue });
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

	// @ts-expect-error - TipTap command typing requires exact match with RawCommands
	addCommands() {
		return {
			insertTemplateVariable:
				(name = '') =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { name }
					});
				}
		};
	},

	addInputRules() {
		return [
			new InputRule({
				// Match {{varName}} but NOT {{random:...}}, {{eval:...}}, {{blank:...}}, {{1..10}}, {{a|b}}
				find: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const name = match[1]?.trim();
					if (name && validateVariableName(name)) {
						tr.replaceWith(range.from, range.to, this.type.create({ name }));
					}
				}
			})
		];
	},

	addProseMirrorPlugins() {
		return [templateKeyboardNavPlugin];
	}
});

// ============================================================================
// TEMPLATE RANDOM EXTENSION
// ============================================================================

/**
 * TemplateRandom Extension
 * ========================
 *
 * Creates inline random specification chips.
 * Syntax: {{1..10}}, {{random:1..10}}, {{a|b|c}}, {{2.3}}
 *
 * Attributes:
 * - spec: string - The random specification
 */
export const TemplateRandom = TipTapNode.create({
	name: 'templateRandom',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			spec: {
				default: ''
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-template-random]',
				getAttrs: (node) => {
					if (typeof node === 'string') return false;
					return { spec: node.getAttribute('data-template-random') };
				}
			}
		];
	},

	renderHTML({ node }) {
		const spec = node.attrs.spec as string;
		const displaySpec = spec.startsWith('random:') ? spec : spec;
		return [
			'span',
			mergeAttributes({
				'data-template-random': spec
			}),
			`{{${displaySpec}}}`
		];
	},

	addNodeView() {
		return ({ node, editor, getPos }: NodeViewRendererProps) => {
			const dom = document.createElement('span');
			dom.classList.add('template-random-wrapper');
			dom.style.cssText = 'display: inline; position: relative;';

			const spec = node.attrs.spec as string;
			const chip = createChipElement('random', `{{${spec}}}`, editor);
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

					popover = createEditPopover(
						spec,
						validateRandomSpec,
						(newValue) => {
							const pos = getPos();
							if (typeof pos === 'number') {
								editor
									.chain()
									.focus()
									.command(({ tr }) => {
										tr.setNodeMarkup(pos, undefined, { spec: newValue });
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

	// @ts-expect-error - TipTap command typing requires exact match with RawCommands
	addCommands() {
		return {
			insertTemplateRandom:
				(spec = '') =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { spec }
					});
				}
		};
	},

	addInputRules() {
		return [
			// Match {{random:...}}
			new InputRule({
				find: /\{\{(random:[^}]+)\}\}$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const spec = match[1]?.trim();
					if (spec && validateRandomSpec(spec)) {
						tr.replaceWith(range.from, range.to, this.type.create({ spec }));
					}
				}
			}),
			// Match {{1..10}}, {{2.3}}, {{a|b|c}} - short form
			new InputRule({
				find: /\{\{([^{}]+)\}\}$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const content = match[1]?.trim();
					if (!content) return;

					// Skip if it looks like a variable name (letters/underscores only)
					if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(content)) return;

					// Skip if it's an eval expression
					if (content.startsWith('eval:')) return;

					// Skip if it's a blank
					if (content.startsWith('blank:')) return;

					// Validate as random spec
					if (validateRandomSpec(content)) {
						tr.replaceWith(range.from, range.to, this.type.create({ spec: content }));
					}
				}
			})
		];
	}
});

// ============================================================================
// TEMPLATE EVAL EXTENSION
// ============================================================================

/**
 * TemplateEval Extension
 * ======================
 *
 * Creates inline expression evaluation chips.
 * Syntax: {{eval:a+b}}, {{eval:x*y|d}}
 *
 * Attributes:
 * - expression: string - The expression (may include modifiers)
 */
export const TemplateEval = TipTapNode.create({
	name: 'templateEval',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			expression: {
				default: ''
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-template-eval]',
				getAttrs: (node) => {
					if (typeof node === 'string') return false;
					return { expression: node.getAttribute('data-template-eval') };
				}
			}
		];
	},

	renderHTML({ node }) {
		return [
			'span',
			mergeAttributes({
				'data-template-eval': node.attrs.expression
			}),
			`{{eval:${node.attrs.expression}}}`
		];
	},

	addNodeView() {
		return ({ node, editor, getPos }: NodeViewRendererProps) => {
			const dom = document.createElement('span');
			dom.classList.add('template-eval-wrapper');
			dom.style.cssText = 'display: inline; position: relative;';

			const expression = node.attrs.expression as string;
			const chip = createChipElement('eval', `{{eval:${expression}}}`, editor);
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

					popover = createEditPopover(
						expression,
						validateEvalExpression,
						(newValue) => {
							const pos = getPos();
							if (typeof pos === 'number') {
								editor
									.chain()
									.focus()
									.command(({ tr }) => {
										tr.setNodeMarkup(pos, undefined, { expression: newValue });
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

	// @ts-expect-error - TipTap command typing requires exact match with RawCommands
	addCommands() {
		return {
			insertTemplateEval:
				(expression = '') =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: { expression }
					});
				}
		};
	},

	addInputRules() {
		return [
			new InputRule({
				find: /\{\{eval:([^}]+)\}\}$/,
				handler: ({ state, range, match }) => {
					const { tr } = state;
					const expression = match[1]?.trim();
					if (expression && validateEvalExpression(expression)) {
						tr.replaceWith(range.from, range.to, this.type.create({ expression }));
					}
				}
			})
		];
	}
});
