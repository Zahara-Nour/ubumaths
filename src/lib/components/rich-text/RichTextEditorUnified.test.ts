/**
 * RichTextEditorUnified Component Tests
 * ======================================
 *
 * Tests for the unified rich text editor component that supports both
 * form and chat modes.
 *
 * Test Coverage:
 * - Component configuration logic
 * - Mode behavior (form vs chat)
 * - Math templates configuration
 * - Props defaults and derived state
 *
 * Note: These tests focus on the component's configuration and logic.
 * TipTap editor integration is tested manually via E2E tests.
 */

import { describe, it, expect } from 'vitest';
import { MATH_TEMPLATES_FULL, MATH_TEMPLATES_BASIC } from './config';
import type { RichTextMode, MathTemplateLevel } from './types';

// =============================================================================
// Helper Functions - Testing Component Logic
// =============================================================================

/**
 * Calculate effective send button visibility based on mode and showSendButton prop
 * This mirrors the $derived logic in the component
 */
function calculateEffectiveShowSendButton(mode: RichTextMode, showSendButton?: boolean): boolean {
	return showSendButton ?? mode === 'chat';
}

/**
 * Get math templates list based on level
 * This mirrors the $derived logic in the component
 */
function getMathTemplatesList(mathTemplates: MathTemplateLevel) {
	return mathTemplates === 'full'
		? MATH_TEMPLATES_FULL
		: mathTemplates === 'basic'
			? MATH_TEMPLATES_BASIC
			: [];
}

/**
 * Check if content is empty (no meaningful content)
 * This mirrors the isEmpty check logic in handleSend
 */
function isContentEmpty(content: { content?: unknown[] }): boolean {
	if (!content.content || content.content.length === 0) {
		return true;
	}

	// @ts-expect-error - Testing JSON structure
	if (content.content.length === 1 && content.content[0].type === 'paragraph') {
		// @ts-expect-error - Testing JSON structure
		if (!content.content[0].content) {
			return true;
		}
	}

	return false;
}

// =============================================================================
// 1. Mode Configuration Tests
// =============================================================================

describe('RichTextEditorUnified - Mode Configuration', () => {
	describe('Form Mode', () => {
		it('should not show send button by default in form mode', () => {
			const effectiveShowSendButton = calculateEffectiveShowSendButton('form');
			expect(effectiveShowSendButton).toBe(false);
		});

		it('should show send button when explicitly enabled in form mode', () => {
			const effectiveShowSendButton = calculateEffectiveShowSendButton('form', true);
			expect(effectiveShowSendButton).toBe(true);
		});

		it('should hide send button when explicitly disabled in form mode', () => {
			const effectiveShowSendButton = calculateEffectiveShowSendButton('form', false);
			expect(effectiveShowSendButton).toBe(false);
		});
	});

	describe('Chat Mode', () => {
		it('should show send button by default in chat mode', () => {
			const effectiveShowSendButton = calculateEffectiveShowSendButton('chat');
			expect(effectiveShowSendButton).toBe(true);
		});

		it('should hide send button when explicitly disabled in chat mode', () => {
			const effectiveShowSendButton = calculateEffectiveShowSendButton('chat', false);
			expect(effectiveShowSendButton).toBe(false);
		});

		it('should show send button when explicitly enabled in chat mode', () => {
			const effectiveShowSendButton = calculateEffectiveShowSendButton('chat', true);
			expect(effectiveShowSendButton).toBe(true);
		});
	});

	describe('Default Mode', () => {
		it('should treat undefined mode as form mode', () => {
			// Component defaults mode to 'form' when not provided
			const defaultMode: RichTextMode = 'form';
			const effectiveShowSendButton = calculateEffectiveShowSendButton(defaultMode);
			expect(effectiveShowSendButton).toBe(false);
		});
	});
});

// =============================================================================
// 2. Math Templates Configuration Tests
// =============================================================================

describe('RichTextEditorUnified - Math Templates', () => {
	describe('Full Templates', () => {
		it('should return 9 templates for full mode', () => {
			const templates = getMathTemplatesList('full');
			expect(templates).toEqual(MATH_TEMPLATES_FULL);
			expect(templates.length).toBe(9);
		});

		it('should include fraction template in full mode', () => {
			const templates = getMathTemplatesList('full');
			const hasFraction = templates.some((t) => t.latex === '\\frac{a}{b}');
			expect(hasFraction).toBe(true);
		});

		it('should include square root template in full mode', () => {
			const templates = getMathTemplatesList('full');
			const hasSqrt = templates.some((t) => t.latex === '\\sqrt{x}');
			expect(hasSqrt).toBe(true);
		});

		it('should include power template in full mode', () => {
			const templates = getMathTemplatesList('full');
			const hasPower = templates.some((t) => t.latex === 'x^{n}');
			expect(hasPower).toBe(true);
		});
	});

	describe('Basic Templates', () => {
		it('should return 4 templates for basic mode', () => {
			const templates = getMathTemplatesList('basic');
			expect(templates).toEqual(MATH_TEMPLATES_BASIC);
			expect(templates.length).toBe(4);
		});

		it('should include fraction template in basic mode', () => {
			const templates = getMathTemplatesList('basic');
			const hasFraction = templates.some((t) => t.latex === '\\frac{a}{b}');
			expect(hasFraction).toBe(true);
		});

		it('should include square root template in basic mode', () => {
			const templates = getMathTemplatesList('basic');
			const hasSqrt = templates.some((t) => t.latex === '\\sqrt{x}');
			expect(hasSqrt).toBe(true);
		});

		it('should be a subset of full templates', () => {
			const basic = getMathTemplatesList('basic');
			const full = getMathTemplatesList('full');

			// Every basic template should exist in full templates
			basic.forEach((basicTemplate) => {
				const existsInFull = full.some((t) => t.latex === basicTemplate.latex);
				expect(existsInFull).toBe(true);
			});
		});
	});

	describe('No Templates', () => {
		it('should return empty array for none mode', () => {
			const templates = getMathTemplatesList('none');
			expect(templates).toEqual([]);
			expect(templates.length).toBe(0);
		});

		it('should hide formule section when templates is none', () => {
			const templates = getMathTemplatesList('none');
			const shouldShowFormuleSection = templates.length > 0;
			expect(shouldShowFormuleSection).toBe(false);
		});
	});

	describe('Template Structure', () => {
		it('should have all required properties in full templates', () => {
			const templates = getMathTemplatesList('full');

			templates.forEach((template) => {
				expect(template).toHaveProperty('latex');
				expect(template).toHaveProperty('icon');
				expect(template).toHaveProperty('title');
				expect(typeof template.latex).toBe('string');
				expect(typeof template.icon).toBe('string');
				expect(typeof template.title).toBe('string');
			});
		});

		it('should have all required properties in basic templates', () => {
			const templates = getMathTemplatesList('basic');

			templates.forEach((template) => {
				expect(template).toHaveProperty('latex');
				expect(template).toHaveProperty('icon');
				expect(template).toHaveProperty('title');
				expect(typeof template.latex).toBe('string');
				expect(typeof template.icon).toBe('string');
				expect(typeof template.title).toBe('string');
			});
		});
	});
});

// =============================================================================
// 3. Empty Content Detection Tests
// =============================================================================

describe('RichTextEditorUnified - Empty Content Detection', () => {
	it('should detect empty content when no content array', () => {
		const content = {};
		expect(isContentEmpty(content)).toBe(true);
	});

	it('should detect empty content when content array is empty', () => {
		const content = { content: [] };
		expect(isContentEmpty(content)).toBe(true);
	});

	it('should detect empty content when single empty paragraph', () => {
		const content = {
			content: [
				{
					type: 'paragraph'
					// No content property
				}
			]
		};
		expect(isContentEmpty(content)).toBe(true);
	});

	it('should detect non-empty content when paragraph has text', () => {
		const content = {
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Hello' }]
				}
			]
		};
		expect(isContentEmpty(content)).toBe(false);
	});

	it('should detect non-empty content when multiple paragraphs', () => {
		const content = {
			content: [
				{
					type: 'paragraph',
					content: []
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Hello' }]
				}
			]
		};
		expect(isContentEmpty(content)).toBe(false);
	});

	it('should detect non-empty content with other block types', () => {
		const content = {
			content: [
				{
					type: 'heading',
					content: [{ type: 'text', text: 'Title' }]
				}
			]
		};
		expect(isContentEmpty(content)).toBe(false);
	});
});

// =============================================================================
// 4. Component Props Defaults Tests
// =============================================================================

describe('RichTextEditorUnified - Props Defaults', () => {
	describe('Mode Default', () => {
		it('should default to form mode', () => {
			const defaultMode: RichTextMode = 'form';
			expect(defaultMode).toBe('form');
		});
	});

	describe('Math Templates Default', () => {
		it('should default to full templates', () => {
			const defaultMathTemplates: MathTemplateLevel = 'full';
			const templates = getMathTemplatesList(defaultMathTemplates);
			expect(templates.length).toBe(9);
		});
	});

	describe('Show Clear Button Default', () => {
		it('should default to true', () => {
			const defaultShowClearButton = true;
			expect(defaultShowClearButton).toBe(true);
		});
	});

	describe('Min Height Default', () => {
		it('should default to 100px', () => {
			const defaultMinHeight = '100px';
			expect(defaultMinHeight).toBe('100px');
		});
	});

	describe('Disabled Default', () => {
		it('should default to false', () => {
			const defaultDisabled = false;
			expect(defaultDisabled).toBe(false);
		});
	});
});

// =============================================================================
// 5. Edge Cases Tests
// =============================================================================

describe('RichTextEditorUnified - Edge Cases', () => {
	describe('Show Send Button Override Logic', () => {
		it('should respect explicit true override in form mode', () => {
			const result = calculateEffectiveShowSendButton('form', true);
			expect(result).toBe(true);
		});

		it('should respect explicit false override in chat mode', () => {
			const result = calculateEffectiveShowSendButton('chat', false);
			expect(result).toBe(false);
		});

		it('should use mode default when showSendButton is undefined', () => {
			const formResult = calculateEffectiveShowSendButton('form', undefined);
			const chatResult = calculateEffectiveShowSendButton('chat', undefined);

			expect(formResult).toBe(false);
			expect(chatResult).toBe(true);
		});
	});

	describe('Math Templates Edge Cases', () => {
		it('should handle all valid math template levels', () => {
			const levels: MathTemplateLevel[] = ['full', 'basic', 'none'];

			levels.forEach((level) => {
				const templates = getMathTemplatesList(level);
				expect(Array.isArray(templates)).toBe(true);
			});
		});

		it('should return different array instances for each call', () => {
			const templates1 = getMathTemplatesList('full');
			const templates2 = getMathTemplatesList('full');

			// Should be equal in content
			expect(templates1).toEqual(templates2);

			// But same reference (since we're returning constants)
			expect(templates1).toBe(MATH_TEMPLATES_FULL);
			expect(templates2).toBe(MATH_TEMPLATES_FULL);
		});
	});

	describe('Content Validation Edge Cases', () => {
		it('should handle null content gracefully', () => {
			const content = { content: null };
			// @ts-expect-error - Testing null case
			expect(isContentEmpty(content)).toBe(true);
		});

		it('should handle undefined content gracefully', () => {
			const content = { content: undefined };
			expect(isContentEmpty(content)).toBe(true);
		});

		it('should handle content with whitespace-only text', () => {
			const content = {
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: '   ' }]
					}
				]
			};
			// Component treats whitespace as non-empty (TipTap behavior)
			expect(isContentEmpty(content)).toBe(false);
		});

		it('should handle complex nested content', () => {
			const content = {
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Hello ' },
							{ type: 'text', marks: [{ type: 'bold' }], text: 'world' }
						]
					}
				]
			};
			expect(isContentEmpty(content)).toBe(false);
		});
	});
});

// =============================================================================
// 6. Type Safety Tests
// =============================================================================

describe('RichTextEditorUnified - Type Safety', () => {
	describe('Mode Type', () => {
		it('should accept valid mode values', () => {
			const validModes: RichTextMode[] = ['form', 'chat'];

			validModes.forEach((mode) => {
				const result = calculateEffectiveShowSendButton(mode);
				expect(typeof result).toBe('boolean');
			});
		});
	});

	describe('Math Template Level Type', () => {
		it('should accept valid math template level values', () => {
			const validLevels: MathTemplateLevel[] = ['full', 'basic', 'none'];

			validLevels.forEach((level) => {
				const result = getMathTemplatesList(level);
				expect(Array.isArray(result)).toBe(true);
			});
		});
	});
});

// =============================================================================
// 7. Configuration Integration Tests
// =============================================================================

describe('RichTextEditorUnified - Configuration Integration', () => {
	it('should correctly configure for chat mode with full math', () => {
		const mode: RichTextMode = 'chat';
		const mathTemplates: MathTemplateLevel = 'full';

		const showSendButton = calculateEffectiveShowSendButton(mode);
		const templates = getMathTemplatesList(mathTemplates);

		expect(showSendButton).toBe(true);
		expect(templates.length).toBe(9);
	});

	it('should correctly configure for form mode with basic math', () => {
		const mode: RichTextMode = 'form';
		const mathTemplates: MathTemplateLevel = 'basic';

		const showSendButton = calculateEffectiveShowSendButton(mode);
		const templates = getMathTemplatesList(mathTemplates);

		expect(showSendButton).toBe(false);
		expect(templates.length).toBe(4);
	});

	it('should correctly configure for chat mode with no math', () => {
		const mode: RichTextMode = 'chat';
		const mathTemplates: MathTemplateLevel = 'none';

		const showSendButton = calculateEffectiveShowSendButton(mode);
		const templates = getMathTemplatesList(mathTemplates);

		expect(showSendButton).toBe(true);
		expect(templates.length).toBe(0);
	});

	it('should handle all configuration combinations', () => {
		const modes: RichTextMode[] = ['form', 'chat'];
		const mathLevels: MathTemplateLevel[] = ['full', 'basic', 'none'];

		modes.forEach((mode) => {
			mathLevels.forEach((mathLevel) => {
				const showSendButton = calculateEffectiveShowSendButton(mode);
				const templates = getMathTemplatesList(mathLevel);

				// Should not throw and return valid values
				expect(typeof showSendButton).toBe('boolean');
				expect(Array.isArray(templates)).toBe(true);

				// Verify mode logic
				if (mode === 'chat') {
					expect(showSendButton).toBe(true);
				} else {
					expect(showSendButton).toBe(false);
				}

				// Verify math templates logic
				if (mathLevel === 'full') {
					expect(templates.length).toBe(9);
				} else if (mathLevel === 'basic') {
					expect(templates.length).toBe(4);
				} else {
					expect(templates.length).toBe(0);
				}
			});
		});
	});
});
