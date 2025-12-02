/**
 * Color Stack - Tests
 *
 * Tests for the color context management system used during parsing.
 *
 * @module mathAST/parser/__tests__/color-stack.test
 */

import { describe, it, expect } from 'vitest';
import { ColorStack, isValidColor, normalizeColor, STANDARD_COLORS } from '../color-stack';

// =============================================================================
// ColorStack Class Tests
// =============================================================================

describe('ColorStack', () => {
	describe('Basic operations', () => {
		it('should start empty', () => {
			const stack = new ColorStack();
			expect(stack.isEmpty()).toBe(true);
			expect(stack.depth()).toBe(0);
			expect(stack.current()).toBeUndefined();
		});

		it('should push and track colors', () => {
			const stack = new ColorStack();
			stack.push('red');
			expect(stack.isEmpty()).toBe(false);
			expect(stack.depth()).toBe(1);
			expect(stack.current()).toBe('red');
		});

		it('should pop colors in LIFO order', () => {
			const stack = new ColorStack();
			stack.push('red');
			stack.push('blue');
			stack.push('green');

			expect(stack.pop()).toBe('green');
			expect(stack.pop()).toBe('blue');
			expect(stack.pop()).toBe('red');
			expect(stack.pop()).toBeUndefined();
		});

		it('should track depth correctly', () => {
			const stack = new ColorStack();
			expect(stack.depth()).toBe(0);

			stack.push('red');
			expect(stack.depth()).toBe(1);

			stack.push('blue');
			expect(stack.depth()).toBe(2);

			stack.pop();
			expect(stack.depth()).toBe(1);

			stack.pop();
			expect(stack.depth()).toBe(0);
		});
	});

	describe('current()', () => {
		it('should return undefined when empty', () => {
			const stack = new ColorStack();
			expect(stack.current()).toBeUndefined();
		});

		it('should return top color without removing it', () => {
			const stack = new ColorStack();
			stack.push('red');
			expect(stack.current()).toBe('red');
			expect(stack.current()).toBe('red'); // Still red
			expect(stack.depth()).toBe(1); // Unchanged
		});

		it('should update when stack changes', () => {
			const stack = new ColorStack();
			stack.push('red');
			expect(stack.current()).toBe('red');

			stack.push('blue');
			expect(stack.current()).toBe('blue');

			stack.pop();
			expect(stack.current()).toBe('red');
		});
	});

	describe('isEmpty()', () => {
		it('should return true for empty stack', () => {
			const stack = new ColorStack();
			expect(stack.isEmpty()).toBe(true);
		});

		it('should return false after push', () => {
			const stack = new ColorStack();
			stack.push('red');
			expect(stack.isEmpty()).toBe(false);
		});

		it('should return true after all pops', () => {
			const stack = new ColorStack();
			stack.push('red');
			stack.pop();
			expect(stack.isEmpty()).toBe(true);
		});
	});

	describe('clear()', () => {
		it('should remove all colors', () => {
			const stack = new ColorStack();
			stack.push('red');
			stack.push('blue');
			stack.push('green');

			stack.clear();

			expect(stack.isEmpty()).toBe(true);
			expect(stack.depth()).toBe(0);
			expect(stack.current()).toBeUndefined();
		});

		it('should work on empty stack', () => {
			const stack = new ColorStack();
			stack.clear();
			expect(stack.isEmpty()).toBe(true);
		});
	});

	describe('snapshot() and restore()', () => {
		it('should create a copy of the stack', () => {
			const stack = new ColorStack();
			stack.push('red');
			stack.push('blue');

			const snapshot = stack.snapshot();
			expect(snapshot).toEqual(['red', 'blue']);

			// Modifying snapshot shouldn't affect stack
			snapshot.push('green');
			expect(stack.depth()).toBe(2);
		});

		it('should restore to a previous state', () => {
			const stack = new ColorStack();
			stack.push('red');
			stack.push('blue');

			const snapshot = stack.snapshot();

			stack.push('green');
			stack.push('yellow');
			expect(stack.depth()).toBe(4);

			stack.restore(snapshot);
			expect(stack.depth()).toBe(2);
			expect(stack.current()).toBe('blue');
		});

		it('should restore to empty state', () => {
			const stack = new ColorStack();
			const snapshot = stack.snapshot();

			stack.push('red');
			stack.push('blue');

			stack.restore(snapshot);
			expect(stack.isEmpty()).toBe(true);
		});
	});

	describe('Nested color scenario', () => {
		it('should handle nested textcolor parsing', () => {
			const stack = new ColorStack();

			// \textcolor{red}{a + \textcolor{blue}{b} + c}

			// Enter red block
			stack.push('red');
			expect(stack.current()).toBe('red');

			// Parse 'a' with red
			// ...

			// Enter blue block
			stack.push('blue');
			expect(stack.current()).toBe('blue');

			// Parse 'b' with blue
			// ...

			// Exit blue block
			stack.pop();
			expect(stack.current()).toBe('red');

			// Parse 'c' with red
			// ...

			// Exit red block
			stack.pop();
			expect(stack.current()).toBeUndefined();
		});

		it('should handle deeply nested colors', () => {
			const stack = new ColorStack();

			stack.push('red');
			stack.push('green');
			stack.push('blue');
			stack.push('yellow');
			stack.push('purple');

			expect(stack.depth()).toBe(5);
			expect(stack.current()).toBe('purple');

			stack.pop();
			expect(stack.current()).toBe('yellow');

			stack.pop();
			expect(stack.current()).toBe('blue');
		});
	});
});

// =============================================================================
// Color Validation Tests
// =============================================================================

describe('isValidColor()', () => {
	describe('Standard color names', () => {
		it.each([
			'black',
			'white',
			'red',
			'green',
			'blue',
			'yellow',
			'cyan',
			'magenta',
			'orange',
			'pink',
			'purple',
			'brown',
			'gray',
			'grey'
		])('should accept %s', (color) => {
			expect(isValidColor(color)).toBe(true);
		});

		it('should be case-insensitive', () => {
			expect(isValidColor('Red')).toBe(true);
			expect(isValidColor('RED')).toBe(true);
			expect(isValidColor('rEd')).toBe(true);
		});

		it.each(['violet', 'lime', 'olive', 'teal', 'darkgray', 'lightgray'])(
			'should accept xcolor package color %s',
			(color) => {
				expect(isValidColor(color)).toBe(true);
			}
		);
	});

	describe('Hex colors', () => {
		it('should accept 6-digit hex colors', () => {
			expect(isValidColor('#ff0000')).toBe(true);
			expect(isValidColor('#00ff00')).toBe(true);
			expect(isValidColor('#0000ff')).toBe(true);
			expect(isValidColor('#FF0000')).toBe(true);
			expect(isValidColor('#123abc')).toBe(true);
		});

		it('should accept 3-digit hex colors', () => {
			expect(isValidColor('#f00')).toBe(true);
			expect(isValidColor('#0f0')).toBe(true);
			expect(isValidColor('#00f')).toBe(true);
			expect(isValidColor('#F00')).toBe(true);
		});

		it('should reject invalid hex colors', () => {
			expect(isValidColor('#gggggg')).toBe(false);
			expect(isValidColor('#12345')).toBe(false); // 5 digits
			expect(isValidColor('#1234567')).toBe(false); // 7 digits
			expect(isValidColor('#')).toBe(false);
			expect(isValidColor('ff0000')).toBe(false); // Missing #
		});
	});

	describe('Invalid colors', () => {
		it('should reject unknown color names', () => {
			expect(isValidColor('invalid')).toBe(false);
			expect(isValidColor('notacolor')).toBe(false);
			expect(isValidColor('xyz')).toBe(false);
		});

		it('should reject empty string', () => {
			expect(isValidColor('')).toBe(false);
		});

		it('should reject numbers', () => {
			expect(isValidColor('123')).toBe(false);
		});
	});
});

// =============================================================================
// Color Normalization Tests
// =============================================================================

describe('normalizeColor()', () => {
	it('should lowercase color names', () => {
		expect(normalizeColor('Red')).toBe('red');
		expect(normalizeColor('BLUE')).toBe('blue');
		expect(normalizeColor('GrEeN')).toBe('green');
	});

	it('should lowercase hex colors', () => {
		expect(normalizeColor('#FF0000')).toBe('#ff0000');
		expect(normalizeColor('#ABC')).toBe('#abc');
	});

	it('should not change already lowercase', () => {
		expect(normalizeColor('red')).toBe('red');
		expect(normalizeColor('#ff0000')).toBe('#ff0000');
	});
});

// =============================================================================
// STANDARD_COLORS Set Tests
// =============================================================================

describe('STANDARD_COLORS', () => {
	it('should contain basic colors', () => {
		expect(STANDARD_COLORS.has('black')).toBe(true);
		expect(STANDARD_COLORS.has('white')).toBe(true);
		expect(STANDARD_COLORS.has('red')).toBe(true);
		expect(STANDARD_COLORS.has('green')).toBe(true);
		expect(STANDARD_COLORS.has('blue')).toBe(true);
	});

	it('should be readonly (TypeScript enforced)', () => {
		// TypeScript ensures this at compile time via ReadonlySet type
		// At runtime, Set operations would succeed but the type prevents calling them
		// We verify the set has expected size and is a Set instance
		expect(STANDARD_COLORS).toBeInstanceOf(Set);
		expect(STANDARD_COLORS.size).toBeGreaterThan(10);
	});

	it('should not contain unknown colors', () => {
		expect(STANDARD_COLORS.has('notacolor')).toBe(false);
		expect(STANDARD_COLORS.has('')).toBe(false);
	});
});
