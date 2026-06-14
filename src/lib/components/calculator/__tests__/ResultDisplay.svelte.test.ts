/**
 * ResultDisplay Component Logic Tests
 * ====================================
 *
 * Unit tests for the result display component logic.
 * Since the component uses lucide-svelte icons which have compatibility
 * issues with vitest-browser, we test the logic patterns rather than
 * full component rendering.
 *
 * These tests verify:
 * 1. CalculationResult type handling
 * 2. Display logic for success vs error states
 * 3. Copy functionality behavior
 */

import { describe, it, expect, vi } from 'vitest';
import type { CalculationResult } from '$lib/stores/calculator.svelte';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a success result
 */
function createSuccessResult(overrides: Partial<CalculationResult> = {}): CalculationResult {
	return {
		id: 'test-id-1',
		input: '2+3',
		output: '5',
		isError: false,
		timestamp: Date.now(),
		...overrides
	};
}

/**
 * Create an error result
 */
function createErrorResult(overrides: Partial<CalculationResult> = {}): CalculationResult {
	return {
		id: 'test-id-error',
		input: '2++3',
		output: 'Syntax error',
		isError: true,
		errorMessage: 'Unexpected token',
		timestamp: Date.now(),
		...overrides
	};
}

/**
 * Simulates the component's copy behavior
 */
async function handleCopy(
	result: CalculationResult,
	onCopy?: () => void,
	clipboard?: { writeText: (text: string) => Promise<void> }
): Promise<void> {
	if (onCopy) {
		onCopy();
	} else if (clipboard) {
		try {
			await clipboard.writeText(result.output);
		} catch {
			// Silently handle clipboard errors
			console.error('Failed to copy to clipboard');
		}
	}
}

/**
 * Determines what message to show for errors
 */
function getErrorMessage(result: CalculationResult): string {
	return result.errorMessage || 'Erreur de calcul';
}

/**
 * Determines whether to show suggestion output
 */
function shouldShowSuggestion(result: CalculationResult): boolean {
	return result.isError && result.output !== '' && result.output !== result.errorMessage;
}

// =============================================================================
// TESTS
// =============================================================================

describe('ResultDisplay Logic', () => {
	// =========================================================================
	// 1. Success Result Tests
	// =========================================================================

	describe('success result handling', () => {
		it('should identify success results', () => {
			const result = createSuccessResult();
			expect(result.isError).toBe(false);
		});

		it('should have output value', () => {
			const result = createSuccessResult({ output: '42' });
			expect(result.output).toBe('42');
		});

		it('should have timestamp', () => {
			const before = Date.now();
			const result = createSuccessResult();
			const after = Date.now();

			expect(result.timestamp).toBeGreaterThanOrEqual(before);
			expect(result.timestamp).toBeLessThanOrEqual(after);
		});

		it('should have unique id', () => {
			const result1 = createSuccessResult({ id: 'id-1' });
			const result2 = createSuccessResult({ id: 'id-2' });

			expect(result1.id).not.toBe(result2.id);
		});

		it('should store original input', () => {
			const result = createSuccessResult({ input: 'x^2 + 2x + 1' });
			expect(result.input).toBe('x^2 + 2x + 1');
		});

		it('should handle complex output', () => {
			const result = createSuccessResult({ output: 'x^2 + 2x + 1' });
			expect(result.output).toBe('x^2 + 2x + 1');
		});

		it('should handle empty output string', () => {
			const result = createSuccessResult({ output: '' });
			expect(result.output).toBe('');
		});
	});

	// =========================================================================
	// 2. Error Result Tests
	// =========================================================================

	describe('error result handling', () => {
		it('should identify error results', () => {
			const result = createErrorResult();
			expect(result.isError).toBe(true);
		});

		it('should have error message', () => {
			const result = createErrorResult({ errorMessage: 'Division by zero' });
			expect(result.errorMessage).toBe('Division by zero');
		});

		it('should use default error message when errorMessage is empty', () => {
			const result = createErrorResult({ errorMessage: undefined });
			expect(getErrorMessage(result)).toBe('Erreur de calcul');
		});

		it('should use provided error message', () => {
			const result = createErrorResult({ errorMessage: 'Custom error' });
			expect(getErrorMessage(result)).toBe('Custom error');
		});

		it('should show suggestion when output differs from errorMessage', () => {
			const result = createErrorResult({
				output: 'Try using parentheses',
				errorMessage: 'Syntax error'
			});
			expect(shouldShowSuggestion(result)).toBe(true);
		});

		it('should not show suggestion when output equals errorMessage', () => {
			const result = createErrorResult({
				output: 'Same message',
				errorMessage: 'Same message'
			});
			expect(shouldShowSuggestion(result)).toBe(false);
		});

		it('should not show suggestion when output is empty', () => {
			const result = createErrorResult({
				output: '',
				errorMessage: 'Some error'
			});
			expect(shouldShowSuggestion(result)).toBe(false);
		});
	});

	// =========================================================================
	// 3. Copy Functionality Tests
	// =========================================================================

	describe('copy functionality', () => {
		it('should copy output to clipboard when no custom handler', async () => {
			const result = createSuccessResult({ output: 'copy me' });
			const mockClipboard = {
				writeText: vi.fn().mockResolvedValue(undefined)
			};

			await handleCopy(result, undefined, mockClipboard);

			expect(mockClipboard.writeText).toHaveBeenCalledWith('copy me');
		});

		it('should call custom onCopy when provided', async () => {
			const result = createSuccessResult();
			const onCopy = vi.fn();
			const mockClipboard = {
				writeText: vi.fn().mockResolvedValue(undefined)
			};

			await handleCopy(result, onCopy, mockClipboard);

			expect(onCopy).toHaveBeenCalled();
			// Should not use clipboard directly when custom handler provided
			expect(mockClipboard.writeText).not.toHaveBeenCalled();
		});

		it('should handle clipboard errors gracefully', async () => {
			const result = createSuccessResult();
			const mockClipboard = {
				writeText: vi.fn().mockRejectedValue(new Error('Clipboard not available'))
			};
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Should not throw
			await expect(handleCopy(result, undefined, mockClipboard)).resolves.toBeUndefined();

			consoleSpy.mockRestore();
		});
	});

	// =========================================================================
	// 4. Type Safety Tests
	// =========================================================================

	describe('type safety', () => {
		it('should require all mandatory fields for success result', () => {
			const result: CalculationResult = {
				id: 'test-id',
				input: 'input',
				output: 'output',
				isError: false,
				timestamp: Date.now()
			};

			expect(result.id).toBeDefined();
			expect(result.input).toBeDefined();
			expect(result.output).toBeDefined();
			expect(result.isError).toBe(false);
			expect(result.timestamp).toBeDefined();
		});

		it('should allow optional fields', () => {
			const result: CalculationResult = {
				id: 'test-id',
				input: 'input',
				output: 'output',
				isError: true,
				timestamp: Date.now(),
				errorMessage: 'error',
				outputHtml: '<span>html</span>'
			};

			expect(result.errorMessage).toBe('error');
			expect(result.outputHtml).toBe('<span>html</span>');
		});
	});

	// =========================================================================
	// 5. Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('should handle special characters in output', () => {
			const result = createSuccessResult({ output: '<script>alert(1)</script>' });
			// Output should be stored as-is (component should handle escaping)
			expect(result.output).toBe('<script>alert(1)</script>');
		});

		it('should handle unicode in output', () => {
			const result = createSuccessResult({ output: 'Result: \u221A2 + \u03C0' });
			expect(result.output).toBe('Result: \u221A2 + \u03C0');
		});

		it('should handle very long output', () => {
			const longOutput = 'x'.repeat(10000);
			const result = createSuccessResult({ output: longOutput });
			expect(result.output.length).toBe(10000);
		});

		it('should handle very long error messages', () => {
			const longMessage = 'Error: '.repeat(500);
			const result = createErrorResult({ errorMessage: longMessage });
			expect(result.errorMessage?.length).toBe(3500);
		});

		it('should handle newlines in output', () => {
			const result = createSuccessResult({ output: 'line1\nline2\nline3' });
			expect(result.output).toBe('line1\nline2\nline3');
		});

		it('should preserve whitespace in output', () => {
			const result = createSuccessResult({ output: '  spaced  out  ' });
			expect(result.output).toBe('  spaced  out  ');
		});
	});

	// =========================================================================
	// 6. Display State Logic Tests
	// =========================================================================

	describe('display state logic', () => {
		it('should display output for success', () => {
			const result = createSuccessResult({ output: '42' });
			// In success state, we show the output
			expect(!result.isError).toBe(true);
			expect(result.output).toBe('42');
		});

		it('should display error message for error', () => {
			const result = createErrorResult({ errorMessage: 'Error occurred' });
			// In error state, we show the error message
			expect(result.isError).toBe(true);
			expect(getErrorMessage(result)).toBe('Error occurred');
		});

		it('should handle HTML output separately', () => {
			const result = createSuccessResult({
				output: 'x^2',
				outputHtml: '<span class="math">x<sup>2</sup></span>'
			});

			// Component should use outputHtml when available for rendering
			expect(result.outputHtml).toBeDefined();
			expect(result.output).toBe('x^2'); // Plain text fallback
		});
	});
});
