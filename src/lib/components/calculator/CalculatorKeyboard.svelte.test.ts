/**
 * CalculatorKeyboard Component Tests
 * ===================================
 *
 * Tests for the virtual keyboard component:
 * 1. Basic rendering of all keyboard sections
 * 2. Props handling (visible, callbacks)
 * 3. Button click handlers
 * 4. Extended functions panel toggle
 * 5. Accessibility attributes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import CalculatorKeyboard from './CalculatorKeyboard.svelte';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Default props for rendering the component
 */
function getDefaultProps() {
	return {
		onInput: vi.fn(),
		onSubmit: vi.fn(),
		onBackspace: vi.fn(),
		onClear: vi.fn(),
		onAllClear: vi.fn(),
		visible: true
	};
}

// =============================================================================
// TESTS
// =============================================================================

describe('CalculatorKeyboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// =========================================================================
	// 1. Basic Rendering Tests
	// =========================================================================

	describe('basic rendering', () => {
		it('should render when visible is true', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// Check for digit buttons
			await expect.element(page.getByRole('button', { name: '0' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: '1' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: '9' })).toBeVisible();
		});

		it('should not render when visible is false', async () => {
			const props = { ...getDefaultProps(), visible: false };
			render(CalculatorKeyboard, { props });

			// Container should have no buttons
			const buttons = page.getByRole('button');
			await expect.element(buttons.first()).not.toBeInTheDocument();
		});

		it('should render scientific function keys', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			await expect.element(page.getByRole('button', { name: 'sin' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'cos' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'tan' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'log' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'ln' })).toBeVisible();
		});

		it('should render operator keys', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			await expect.element(page.getByRole('button', { name: '+' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: '-' })).toBeVisible();
		});

		it('should render special keys', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			await expect.element(page.getByRole('button', { name: '=' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'C', exact: true })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'AC' })).toBeVisible();
		});

		it('should render all digit keys 0-9', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			for (let i = 0; i <= 9; i++) {
				await expect.element(page.getByRole('button', { name: String(i) })).toBeVisible();
			}
		});
	});

	// =========================================================================
	// 2. Input Callback Tests
	// =========================================================================

	describe('input callbacks', () => {
		it('should call onInput with digit value when digit clicked', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			const button7 = page.getByRole('button', { name: '7' });
			await button7.click();

			expect(props.onInput).toHaveBeenCalledWith('7');
		});

		it('should call onInput with LaTeX value for sin', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			const sinButton = page.getByRole('button', { name: 'sin' });
			await sinButton.click();

			expect(props.onInput).toHaveBeenCalledWith('\\sin(');
		});

		it('should call onInput with pi symbol', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// pi button shows Greek letter
			const piButton = page.getByRole('button', { name: '\u03C0' });
			await piButton.click();

			expect(props.onInput).toHaveBeenCalledWith('\\pi');
		});

		it('should call onInput with sqrt LaTeX', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// sqrt button shows symbol
			const sqrtButton = page.getByRole('button', { name: '\u221A' });
			await sqrtButton.click();

			expect(props.onInput).toHaveBeenCalledWith('\\sqrt{');
		});

		it('should call onInput with division operator', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			const divButton = page.getByRole('button', { name: '\u00F7' });
			await divButton.click();

			expect(props.onInput).toHaveBeenCalledWith('\\div');
		});

		it('should call onInput with multiplication operator', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			const multButton = page.getByRole('button', { name: '\u00D7' });
			await multButton.click();

			expect(props.onInput).toHaveBeenCalledWith('\\times');
		});
	});

	// =========================================================================
	// 3. Action Callback Tests
	// =========================================================================

	describe('action callbacks', () => {
		it('should call onSubmit when = clicked', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			const submitButton = page.getByRole('button', { name: '=' });
			await submitButton.click();

			expect(props.onSubmit).toHaveBeenCalled();
		});

		it('should call onBackspace when backspace arrow clicked', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// Backspace button shows left arrow
			const backspaceButton = page.getByRole('button', { name: '\u2190' });
			await backspaceButton.click();

			expect(props.onBackspace).toHaveBeenCalled();
		});

		it('should call onClear when C clicked', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			const clearButton = page.getByRole('button', { name: 'C', exact: true });
			await clearButton.click();

			expect(props.onClear).toHaveBeenCalled();
		});

		it('should call onAllClear when AC clicked', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			const allClearButton = page.getByRole('button', { name: 'AC' });
			await allClearButton.click();

			expect(props.onAllClear).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// 4. Extended Functions Panel Tests
	// =========================================================================

	describe('extended functions panel', () => {
		it('should show Plus button initially', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// Button should show "Plus..." when panel is closed
			await expect.element(page.getByText(/Plus/)).toBeVisible();
		});

		it('should not show extended functions by default', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// arcsin should not be visible initially
			await expect.element(page.getByRole('button', { name: 'arcsin' })).not.toBeInTheDocument();
		});

		it('should show extended functions when toggle clicked', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// Click the toggle button
			const toggleButton = page.getByText(/Plus/);
			await toggleButton.click();

			// Now arcsin should be visible
			await expect.element(page.getByRole('button', { name: 'arcsin' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'arccos' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'arctan' })).toBeVisible();
		});

		it('should show Moins button when panel is expanded', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// Click to expand
			const toggleButton = page.getByText(/Plus/);
			await toggleButton.click();

			// Should now show "Moins"
			await expect.element(page.getByText(/Moins/)).toBeVisible();
		});

		it('should hide extended functions when Moins clicked', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// Open the panel
			const toggleButton = page.getByText(/Plus/);
			await toggleButton.click();

			// Close the panel
			const closeButton = page.getByText(/Moins/);
			await closeButton.click();

			// Extended functions should be hidden again
			await expect.element(page.getByRole('button', { name: 'arcsin' })).not.toBeInTheDocument();
		});

		it('should call onInput for extended function keys', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// Open extended panel
			const toggleButton = page.getByText(/Plus/);
			await toggleButton.click();

			// Click arcsin
			const arcsinButton = page.getByRole('button', { name: 'arcsin' });
			await arcsinButton.click();

			expect(props.onInput).toHaveBeenCalledWith('\\arcsin(');
		});

		it('should include parentheses in extended functions', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			// Open extended panel
			const toggleButton = page.getByText(/Plus/);
			await toggleButton.click();

			// Check for parentheses buttons
			await expect.element(page.getByRole('button', { name: '(' })).toBeVisible();
			await expect.element(page.getByRole('button', { name: ')' })).toBeVisible();
		});
	});

	// =========================================================================
	// 5. Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('should handle rapid button clicks', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			const button1 = page.getByRole('button', { name: '1' });

			// Rapid clicks
			await button1.click();
			await button1.click();
			await button1.click();

			expect(props.onInput).toHaveBeenCalledTimes(3);
		});

		it('should handle multiple different button clicks', async () => {
			const props = getDefaultProps();
			render(CalculatorKeyboard, { props });

			await page.getByRole('button', { name: '1' }).click();
			await page.getByRole('button', { name: '+' }).click();
			await page.getByRole('button', { name: '2' }).click();
			await page.getByRole('button', { name: '=' }).click();

			expect(props.onInput).toHaveBeenCalledWith('1');
			expect(props.onInput).toHaveBeenCalledWith('+');
			expect(props.onInput).toHaveBeenCalledWith('2');
			expect(props.onSubmit).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// 6. Props Defaults Tests
	// =========================================================================

	describe('props defaults', () => {
		it('should default visible to true', async () => {
			// Pass all required props except visible
			const props = {
				onInput: vi.fn(),
				onSubmit: vi.fn(),
				onBackspace: vi.fn(),
				onClear: vi.fn(),
				onAllClear: vi.fn()
			};

			render(CalculatorKeyboard, { props });

			// Component should be visible (has buttons)
			await expect.element(page.getByRole('button', { name: '0' })).toBeVisible();
		});
	});
});
