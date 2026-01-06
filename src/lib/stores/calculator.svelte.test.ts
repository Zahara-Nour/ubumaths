/**
 * Calculator Store Tests
 * ======================
 *
 * Unit tests for the calculator store's core functionality:
 * 1. execute() - Expression and command execution
 * 2. navigateHistory() - History navigation (up/down arrows)
 * 3. clearHistory() - History clearing
 * 4. Zod validation - Input validation
 * 5. Derived state - hasHistory, historyCount, lastResult
 *
 * Test Strategy:
 * - Mock the WebReplEngine to isolate store logic
 * - Test public API methods directly
 * - Clear store state between tests using clearHistory()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// =============================================================================
// MOCKS - Using vi.hoisted for variables that need to be accessible in vi.mock
// =============================================================================

// Hoist mock functions so they're available in vi.mock factory
const { mockExecuteFn, mockGetCommandsFn } = vi.hoisted(() => ({
	mockExecuteFn: vi.fn(),
	mockGetCommandsFn: vi.fn()
}));

// Mock browser environment
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

// Mock WebReplEngine using hoisted mock functions
vi.mock('$lib/mathAST/cli/web', () => ({
	WebReplEngine: class {
		execute = mockExecuteFn;
		getCommands = mockGetCommandsFn;
	}
}));

// Setup default mock behavior
function setupDefaultMocks() {
	mockExecuteFn.mockReturnValue({
		success: true,
		output: '5',
		latex: '5',
		outputHtml: '<span>5</span>'
	});

	mockGetCommandsFn.mockReturnValue([
		{ name: 'diff', description: 'Differentiate', aliases: ['d'] },
		{ name: 'simplify', description: 'Simplify', aliases: ['s'] }
	]);
}

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] || null)
	};
})();

// Set up localStorage mock globally
Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true
});

// =============================================================================
// IMPORT AFTER MOCKS
// =============================================================================

import { calculatorStore, type CalculatorInput } from './calculator.svelte';

// =============================================================================
// TESTS
// =============================================================================

describe('Calculator Store', () => {
	beforeEach(() => {
		// Clear mock call history
		vi.clearAllMocks();
		localStorageMock.clear();

		// Reset store state by clearing history
		calculatorStore.clearHistory();

		// Reset mock default responses
		setupDefaultMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// =========================================================================
	// 1. execute() Tests
	// =========================================================================

	describe('execute()', () => {
		it('should execute a simple expression', async () => {
			const input: CalculatorInput = {
				type: 'expression',
				expression: '2+3'
			};

			await calculatorStore.execute(input);

			expect(mockExecuteFn).toHaveBeenCalledWith('2+3');
			expect(calculatorStore.history).toHaveLength(1);
			expect(calculatorStore.history[0].input).toBe('2+3');
			expect(calculatorStore.history[0].isError).toBe(false);
		});

		it('should execute a command with argument', async () => {
			const input: CalculatorInput = {
				type: 'command',
				command: 'diff',
				expression: 'x^2'
			};

			await calculatorStore.execute(input);

			expect(mockExecuteFn).toHaveBeenCalledWith('.diff x^2');
			expect(calculatorStore.history).toHaveLength(1);
			expect(calculatorStore.history[0].input).toBe('.diff x^2');
		});

		it('should not execute empty expression', async () => {
			const input: CalculatorInput = {
				type: 'expression',
				expression: '   '
			};

			await calculatorStore.execute(input);

			expect(mockExecuteFn).not.toHaveBeenCalled();
			expect(calculatorStore.history).toHaveLength(0);
		});

		it('should handle execution errors', async () => {
			mockExecuteFn.mockReturnValueOnce({
				success: false,
				output: 'Syntax error',
				error: { message: 'Unexpected character' }
			});

			const input: CalculatorInput = {
				type: 'expression',
				expression: '2++3'
			};

			await calculatorStore.execute(input);

			expect(calculatorStore.history).toHaveLength(1);
			expect(calculatorStore.history[0].isError).toBe(true);
			expect(calculatorStore.history[0].errorMessage).toBe('Unexpected character');
		});

		it('should add entries to history in reverse order (newest first)', async () => {
			mockExecuteFn
				.mockReturnValueOnce({
					success: true,
					output: '5',
					latex: '5'
				})
				.mockReturnValueOnce({
					success: true,
					output: '10',
					latex: '10'
				});

			await calculatorStore.execute({ type: 'expression', expression: '2+3' });
			await calculatorStore.execute({ type: 'expression', expression: '5+5' });

			expect(calculatorStore.history).toHaveLength(2);
			expect(calculatorStore.history[0].input).toBe('5+5'); // Newest first
			expect(calculatorStore.history[1].input).toBe('2+3');
		});

		it('should reset history navigation after execute', async () => {
			// Add some history
			await calculatorStore.execute({ type: 'expression', expression: '2+3' });
			await calculatorStore.execute({ type: 'expression', expression: '5+5' });

			// Navigate up in history
			calculatorStore.navigateHistory('up', '');
			expect(calculatorStore.historyIndex).toBe(0);

			// Execute new expression
			await calculatorStore.execute({ type: 'expression', expression: '10+10' });

			// History navigation should be reset
			expect(calculatorStore.historyIndex).toBe(-1);
		});

		it('should preserve outputHtml from engine', async () => {
			mockExecuteFn.mockReturnValueOnce({
				success: true,
				output: '5',
				latex: '5',
				outputHtml: '<span class="result">5</span>'
			});

			await calculatorStore.execute({ type: 'expression', expression: '2+3' });

			expect(calculatorStore.history[0].outputHtml).toBe('<span class="result">5</span>');
		});

		it('should set isLoading to false after execution', async () => {
			await calculatorStore.execute({ type: 'expression', expression: '2+3' });
			expect(calculatorStore.isLoading).toBe(false);
		});
	});

	// =========================================================================
	// 2. Zod Validation Tests
	// =========================================================================

	describe('Zod validation', () => {
		it('should reject expressions longer than 1000 characters', async () => {
			const longExpression = 'x'.repeat(1001);
			const input: CalculatorInput = {
				type: 'expression',
				expression: longExpression
			};

			await calculatorStore.execute(input);

			// Should add an error entry without calling the engine
			expect(mockExecuteFn).not.toHaveBeenCalled();
			expect(calculatorStore.history).toHaveLength(1);
			expect(calculatorStore.history[0].isError).toBe(true);
		});

		it('should accept expressions up to 1000 characters', async () => {
			const maxExpression = 'x'.repeat(1000);
			const input: CalculatorInput = {
				type: 'expression',
				expression: maxExpression
			};

			await calculatorStore.execute(input);

			// Should call the engine
			expect(mockExecuteFn).toHaveBeenCalled();
		});

		it('should reject commands longer than 50 characters', async () => {
			const longCommand = 'a'.repeat(51);
			const input: CalculatorInput = {
				type: 'command',
				command: longCommand,
				expression: 'x^2'
			};

			await calculatorStore.execute(input);

			// Should add an error entry without calling the engine
			expect(mockExecuteFn).not.toHaveBeenCalled();
			expect(calculatorStore.history).toHaveLength(1);
			expect(calculatorStore.history[0].isError).toBe(true);
		});

		it('should validate input type enum', async () => {
			// TypeScript would catch this, but test runtime validation
			const input = {
				type: 'invalid_type' as 'expression',
				expression: '2+3'
			};

			await calculatorStore.execute(input);

			// Should add an error entry
			expect(mockExecuteFn).not.toHaveBeenCalled();
			expect(calculatorStore.history).toHaveLength(1);
			expect(calculatorStore.history[0].isError).toBe(true);
		});
	});

	// =========================================================================
	// 3. navigateHistory() Tests
	// =========================================================================

	describe('navigateHistory()', () => {
		it('should return null for empty history', () => {
			const result = calculatorStore.navigateHistory('up', 'current');

			expect(result).toBeNull();
		});

		it('should navigate up through history', async () => {
			// Add history entries
			await calculatorStore.execute({ type: 'expression', expression: 'first' });
			await calculatorStore.execute({ type: 'expression', expression: 'second' });
			await calculatorStore.execute({ type: 'expression', expression: 'third' });

			// Navigate up (newest to oldest)
			const first = calculatorStore.navigateHistory('up', 'current');
			expect(first).toBe('third');
			expect(calculatorStore.historyIndex).toBe(0);

			const second = calculatorStore.navigateHistory('up');
			expect(second).toBe('second');
			expect(calculatorStore.historyIndex).toBe(1);

			const third = calculatorStore.navigateHistory('up');
			expect(third).toBe('first');
			expect(calculatorStore.historyIndex).toBe(2);
		});

		it('should return null when at oldest entry and pressing up', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'only' });

			// Navigate to oldest
			calculatorStore.navigateHistory('up', '');
			expect(calculatorStore.historyIndex).toBe(0);

			// Try to go further up
			const result = calculatorStore.navigateHistory('up');
			expect(result).toBeNull();
			expect(calculatorStore.historyIndex).toBe(0); // Unchanged
		});

		it('should navigate down and restore saved input', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'history-entry' });

			// Navigate up with current input
			calculatorStore.navigateHistory('up', 'my-current-input');
			expect(calculatorStore.historyIndex).toBe(0);

			// Navigate back down
			const result = calculatorStore.navigateHistory('down');
			expect(result).toBe('my-current-input');
			expect(calculatorStore.historyIndex).toBe(-1);
		});

		it('should return null when at newest and pressing down', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'entry' });

			// Already at newest (historyIndex = -1)
			const result = calculatorStore.navigateHistory('down');
			expect(result).toBeNull();
		});

		it('should save current input on first up press', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'entry1' });
			await calculatorStore.execute({ type: 'expression', expression: 'entry2' });

			// Start with current input
			calculatorStore.navigateHistory('up', 'unsaved-work');

			// Navigate through history
			calculatorStore.navigateHistory('up');

			// Come back down to newest
			calculatorStore.navigateHistory('down');
			const restored = calculatorStore.navigateHistory('down');

			expect(restored).toBe('unsaved-work');
		});
	});

	// =========================================================================
	// 4. clearHistory() Tests
	// =========================================================================

	describe('clearHistory()', () => {
		it('should clear all history entries', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'entry1' });
			await calculatorStore.execute({ type: 'expression', expression: 'entry2' });

			expect(calculatorStore.history).toHaveLength(2);

			calculatorStore.clearHistory();

			expect(calculatorStore.history).toHaveLength(0);
		});

		it('should reset history navigation state', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'entry' });

			calculatorStore.navigateHistory('up', 'current');
			expect(calculatorStore.historyIndex).toBe(0);

			calculatorStore.clearHistory();

			expect(calculatorStore.historyIndex).toBe(-1);
		});

		it('should persist cleared state to localStorage', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'entry' });

			// Clear the mock to track new calls
			localStorageMock.setItem.mockClear();

			calculatorStore.clearHistory();

			// localStorage should be updated with empty array
			expect(localStorageMock.setItem).toHaveBeenCalledWith('ubumaths-calc-history', '[]');
		});
	});

	// =========================================================================
	// 5. Derived State Tests
	// =========================================================================

	describe('derived state', () => {
		describe('hasHistory', () => {
			it('should be false when history is empty', () => {
				expect(calculatorStore.hasHistory).toBe(false);
			});

			it('should be true when history has entries', async () => {
				await calculatorStore.execute({ type: 'expression', expression: '2+3' });

				expect(calculatorStore.hasHistory).toBe(true);
			});
		});

		describe('historyCount', () => {
			it('should be 0 when history is empty', () => {
				expect(calculatorStore.historyCount).toBe(0);
			});

			it('should reflect the number of history entries', async () => {
				await calculatorStore.execute({ type: 'expression', expression: '1' });
				expect(calculatorStore.historyCount).toBe(1);

				await calculatorStore.execute({ type: 'expression', expression: '2' });
				expect(calculatorStore.historyCount).toBe(2);

				calculatorStore.clearHistory();
				expect(calculatorStore.historyCount).toBe(0);
			});
		});

		describe('lastResult', () => {
			it('should be undefined when history is empty', () => {
				expect(calculatorStore.lastResult).toBeUndefined();
			});

			it('should return the most recent entry', async () => {
				mockExecuteFn
					.mockReturnValueOnce({ success: true, output: '5', latex: '5' })
					.mockReturnValueOnce({ success: true, output: '10', latex: '10' });

				await calculatorStore.execute({ type: 'expression', expression: 'first' });
				await calculatorStore.execute({ type: 'expression', expression: 'second' });

				expect(calculatorStore.lastResult?.input).toBe('second');
			});
		});
	});

	// =========================================================================
	// 6. resetNavigation() Tests
	// =========================================================================

	describe('resetNavigation()', () => {
		it('should reset historyIndex to -1', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'entry' });

			calculatorStore.navigateHistory('up', '');
			expect(calculatorStore.historyIndex).toBe(0);

			calculatorStore.resetNavigation();
			expect(calculatorStore.historyIndex).toBe(-1);
		});
	});

	// =========================================================================
	// 7. getCommands() Tests
	// =========================================================================

	describe('getCommands()', () => {
		it('should return commands from the engine', () => {
			const commands = calculatorStore.getCommands();

			expect(commands).toHaveLength(2);
			expect(commands[0].name).toBe('diff');
			expect(commands[0].description).toBe('Differentiate');
			expect(commands[0].aliases).toEqual(['d']);
		});
	});

	// =========================================================================
	// 8. localStorage Persistence Tests
	// =========================================================================

	describe('localStorage persistence', () => {
		it('should save history to localStorage after execute', async () => {
			// Clear previous calls
			localStorageMock.setItem.mockClear();

			await calculatorStore.execute({ type: 'expression', expression: '2+3' });

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				'ubumaths-calc-history',
				expect.any(String)
			);

			// Parse the saved data
			const lastCall =
				localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
			const savedData = JSON.parse(lastCall[1]);
			expect(savedData).toHaveLength(1);
			expect(savedData[0].input).toBe('2+3');
		});

		it('should limit history to 100 entries', async () => {
			// Add 105 entries
			for (let i = 0; i < 105; i++) {
				await calculatorStore.execute({ type: 'expression', expression: `entry${i}` });
			}

			expect(calculatorStore.history).toHaveLength(100);
			// Most recent should be entry104
			expect(calculatorStore.history[0].input).toBe('entry104');
		});
	});

	// =========================================================================
	// 9. Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('should handle expressions with whitespace', async () => {
			const input: CalculatorInput = {
				type: 'expression',
				expression: '  2 + 3  '
			};

			await calculatorStore.execute(input);

			// Should trim and execute
			expect(mockExecuteFn).toHaveBeenCalledWith('2 + 3');
		});

		it('should handle command without expression', async () => {
			const input: CalculatorInput = {
				type: 'command',
				command: 'help',
				expression: ''
			};

			await calculatorStore.execute(input);

			expect(mockExecuteFn).toHaveBeenCalledWith('.help ');
		});

		it('should generate unique IDs for each history entry', async () => {
			await calculatorStore.execute({ type: 'expression', expression: 'a' });
			await calculatorStore.execute({ type: 'expression', expression: 'b' });
			await calculatorStore.execute({ type: 'expression', expression: 'c' });

			const ids = calculatorStore.history.map((h) => h.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(3);
		});

		it('should set timestamp on each entry', async () => {
			const before = Date.now();
			await calculatorStore.execute({ type: 'expression', expression: 'test' });
			const after = Date.now();

			expect(calculatorStore.history[0].timestamp).toBeGreaterThanOrEqual(before);
			expect(calculatorStore.history[0].timestamp).toBeLessThanOrEqual(after);
		});
	});
});
