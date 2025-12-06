/**
 * Text Object Renderer
 *
 * Renders text objects at specified positions.
 * Supports plain text and mathematical notation via MathLive.
 *
 * @module constructions/objects/text
 */

import type { TextDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import { createSvgElement, applyTextStyle, type TextStyle } from '../core/renderer';
import { DEFAULT_FONT_SIZE, DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from '../constants';

// =============================================================================
// Constants
// =============================================================================

/** Default text element dimensions for foreignObject */
const DEFAULT_FOREIGN_WIDTH = 200;
const DEFAULT_FOREIGN_HEIGHT = 50;

// =============================================================================
// Text Renderer
// =============================================================================

/**
 * Renderer for text objects
 *
 * Creates SVG text or foreignObject elements for displaying text.
 * Supports:
 * - Plain text using SVG text elements
 * - Mathematical notation using foreignObject with MathLive rendering
 *
 * Text positioning can be controlled with anchor and baseline properties.
 *
 * @example
 * ```typescript
 * // Plain text
 * const textDef: TextDef = {
 *   kind: 'text',
 *   id: 'label1',
 *   content: 'Point A',
 *   x: 100,
 *   y: 200,
 *   fontSize: 16,
 *   anchor: 'middle'
 * };
 *
 * // Math notation (rendered with MathLive)
 * const mathDef: TextDef = {
 *   kind: 'text',
 *   id: 'formula',
 *   content: '$x^2 + y^2 = r^2$',  // $ delimiters trigger math mode
 *   x: 200,
 *   y: 300
 * };
 * ```
 */
export const textRenderer: ObjectRenderer<TextDef> = {
	kind: 'text',

	createSvgElement(def: TextDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get position from computed geometry
		const pos = geometry.position;
		if (!pos) {
			throw new Error(`Text ${def.id} has no computed position`);
		}

		const svgPos = transformer.mathToSvg(pos.x, pos.y);
		const effectiveStyle = getEffectiveStyle(def, state);

		// Check if content contains math notation ($ delimiters)
		const isMath = def.content.includes('$');

		// Create appropriate element
		const element = isMath
			? createMathElement(def, svgPos.x, svgPos.y, effectiveStyle)
			: createTextElement(def, svgPos.x, svgPos.y, effectiveStyle);

		element.setAttribute('data-id', def.id);
		element.setAttribute('data-kind', 'text');
		element.classList.add('construction-text');

		// Store position for updates
		element.setAttribute('data-x', String(svgPos.x));
		element.setAttribute('data-y', String(svgPos.y));

		// Apply initial state
		applyStateToElement(element, state);

		return element;
	},

	updateSvgElement(element: SVGElement, def: TextDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get updated position
		const pos = geometry.position;
		if (!pos) {
			return;
		}

		const svgPos = transformer.mathToSvg(pos.x, pos.y);

		// Check element type and update accordingly
		if (element.tagName === 'text') {
			updateTextElement(element as SVGTextElement, def, svgPos.x, svgPos.y);
		} else if (element.tagName === 'g') {
			// Group containing foreignObject
			updateMathElement(element, def, svgPos.x, svgPos.y);
		}

		// Update stored position
		element.setAttribute('data-x', String(svgPos.x));
		element.setAttribute('data-y', String(svgPos.y));

		// Apply state (visibility, opacity)
		applyStateToElement(element, state);
	}
};

// =============================================================================
// Plain Text Helpers
// =============================================================================

/**
 * Create an SVG text element
 *
 * @param def - Text definition
 * @param x - X position (SVG space)
 * @param y - Y position (SVG space)
 * @param style - Style properties
 * @returns SVG text element
 */
function createTextElement(
	def: TextDef,
	x: number,
	y: number,
	style: { color?: string }
): SVGTextElement {
	const text = createSvgElement('text');
	text.setAttribute('x', String(x));
	text.setAttribute('y', String(y));
	text.textContent = def.content;

	// Apply text style
	const textStyle: TextStyle = {
		fontSize: def.fontSize ?? DEFAULT_FONT_SIZE,
		fontFamily: DEFAULT_FONT_FAMILY,
		color: style.color ?? DEFAULT_COLORS.text,
		anchor: def.anchor ?? 'start',
		baseline: mapBaseline(def.baseline)
	};

	applyTextStyle(text, textStyle);

	return text;
}

/**
 * Update an SVG text element
 *
 * @param element - SVG text element
 * @param def - Text definition
 * @param x - New X position
 * @param y - New Y position
 */
function updateTextElement(element: SVGTextElement, def: TextDef, x: number, y: number): void {
	element.setAttribute('x', String(x));
	element.setAttribute('y', String(y));

	// Update content if changed
	if (element.textContent !== def.content) {
		element.textContent = def.content;
	}
}

// =============================================================================
// Math Text Helpers (MathLive)
// =============================================================================

/**
 * Create an SVG foreignObject for math content
 *
 * Uses a group containing a foreignObject with an HTML div that
 * can be rendered by MathLive.
 *
 * @param def - Text definition
 * @param x - X position (SVG space)
 * @param y - Y position (SVG space)
 * @param style - Style properties
 * @returns SVG group element containing foreignObject
 */
function createMathElement(
	def: TextDef,
	x: number,
	y: number,
	style: { color?: string }
): SVGGElement {
	const group = createSvgElement('g');
	group.classList.add('math-text');

	// Create foreignObject for HTML content
	const foreign = createSvgElement('foreignObject');
	foreign.setAttribute('x', String(x));
	foreign.setAttribute('y', String(y - (def.fontSize ?? DEFAULT_FONT_SIZE)));
	foreign.setAttribute('width', String(DEFAULT_FOREIGN_WIDTH));
	foreign.setAttribute('height', String(DEFAULT_FOREIGN_HEIGHT));

	// Create HTML container
	const div = document.createElement('div');
	div.style.fontFamily = DEFAULT_FONT_FAMILY;
	div.style.fontSize = `${def.fontSize ?? DEFAULT_FONT_SIZE}px`;
	div.style.color = style.color ?? DEFAULT_COLORS.text;
	div.style.whiteSpace = 'nowrap';

	// Set content - MathLive will render this if available
	// Content with $ delimiters will be processed by MathLive
	div.textContent = def.content;
	div.setAttribute('data-math', 'true');

	// Apply anchor alignment
	if (def.anchor === 'middle') {
		div.style.textAlign = 'center';
	} else if (def.anchor === 'end') {
		div.style.textAlign = 'right';
	}

	foreign.appendChild(div);
	group.appendChild(foreign);

	return group;
}

/**
 * Update a math text element
 *
 * @param element - SVG group containing foreignObject
 * @param def - Text definition
 * @param x - New X position
 * @param y - New Y position
 */
function updateMathElement(element: SVGElement, def: TextDef, x: number, y: number): void {
	const foreign = element.querySelector('foreignObject');
	if (foreign) {
		foreign.setAttribute('x', String(x));
		foreign.setAttribute('y', String(y - (def.fontSize ?? DEFAULT_FONT_SIZE)));

		// Update content
		const div = foreign.querySelector('div');
		if (div && div.textContent !== def.content) {
			div.textContent = def.content;
		}
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Map TextDef baseline to SVG dominant-baseline value
 *
 * @param baseline - TextDef baseline value
 * @returns SVG dominant-baseline value
 */
function mapBaseline(baseline?: 'top' | 'middle' | 'bottom'): TextStyle['baseline'] {
	switch (baseline) {
		case 'top':
			return 'hanging';
		case 'middle':
			return 'middle';
		case 'bottom':
			return 'alphabetic';
		default:
			return 'auto';
	}
}

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(textRenderer);
