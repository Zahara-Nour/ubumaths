/**
 * Color Stack - Color Context Management
 *
 * Manages the color context during parsing of LaTeX expressions.
 * When parsing nested \textcolor commands, we need to track which
 * color is currently active so that parsed nodes can inherit the
 * appropriate metadata.
 *
 * Example:
 * \textcolor{red}{a + \textcolor{blue}{b} + c}
 *
 * During parsing:
 * - 'a' is parsed with color 'red'
 * - 'b' is parsed with color 'blue' (pushed on stack)
 * - After 'b', we pop and return to 'red'
 * - 'c' is parsed with color 'red'
 *
 * @module mathAST/parser/color-stack
 */

// =============================================================================
// ColorStack Class
// =============================================================================

/**
 * A stack-based color context manager for nested color commands.
 *
 * This class provides a simple stack interface for managing color context
 * during LaTeX parsing. Colors are pushed when entering a \textcolor block
 * and popped when exiting.
 *
 * @example
 * const stack = new ColorStack();
 *
 * stack.push('red');
 * console.log(stack.current()); // 'red'
 *
 * stack.push('blue');
 * console.log(stack.current()); // 'blue'
 *
 * stack.pop();
 * console.log(stack.current()); // 'red'
 *
 * stack.pop();
 * console.log(stack.current()); // undefined
 */
export class ColorStack {
	private readonly stack: string[] = [];

	/**
	 * Pushes a new color onto the stack.
	 *
	 * @param color - The color to push (CSS color name or hex value)
	 */
	push(color: string): void {
		this.stack.push(color);
	}

	/**
	 * Pops the top color from the stack and returns it.
	 *
	 * @returns The popped color, or undefined if the stack is empty
	 */
	pop(): string | undefined {
		return this.stack.pop();
	}

	/**
	 * Returns the current (top) color without removing it.
	 *
	 * @returns The current color, or undefined if the stack is empty
	 */
	current(): string | undefined {
		if (this.stack.length === 0) {
			return undefined;
		}
		return this.stack[this.stack.length - 1];
	}

	/**
	 * Checks if the stack is empty.
	 *
	 * @returns true if no colors are on the stack
	 */
	isEmpty(): boolean {
		return this.stack.length === 0;
	}

	/**
	 * Returns the number of colors on the stack.
	 *
	 * @returns The depth of the color stack
	 */
	depth(): number {
		return this.stack.length;
	}

	/**
	 * Clears all colors from the stack.
	 */
	clear(): void {
		this.stack.length = 0;
	}

	/**
	 * Creates a snapshot of the current stack state.
	 * Useful for error recovery or backtracking.
	 *
	 * @returns A copy of the current stack
	 */
	snapshot(): string[] {
		return [...this.stack];
	}

	/**
	 * Restores the stack to a previous snapshot.
	 *
	 * @param state - A snapshot created by snapshot()
	 */
	restore(state: readonly string[]): void {
		this.stack.length = 0;
		this.stack.push(...state);
	}
}

// =============================================================================
// Color Validation
// =============================================================================

/**
 * Standard CSS color names that are commonly used in LaTeX.
 */
export const STANDARD_COLORS: ReadonlySet<string> = new Set([
	// Basic colors
	'black',
	'white',
	'red',
	'green',
	'blue',
	'yellow',
	'cyan',
	'magenta',
	// Extended colors
	'orange',
	'pink',
	'purple',
	'brown',
	'gray',
	'grey',
	// xcolor package colors
	'violet',
	'lime',
	'olive',
	'teal',
	'darkgray',
	'darkgrey',
	'lightgray',
	'lightgrey'
]);

/**
 * Validates a color string.
 *
 * Accepts:
 * - Standard color names (red, blue, etc.)
 * - 3-digit hex colors (#RGB)
 * - 6-digit hex colors (#RRGGBB)
 *
 * @param color - The color string to validate
 * @returns true if the color is valid
 *
 * @example
 * isValidColor('red')      // true
 * isValidColor('#ff0000')  // true
 * isValidColor('#f00')     // true
 * isValidColor('invalid')  // false
 * isValidColor('#gggggg')  // false
 */
export function isValidColor(color: string): boolean {
	// Check standard color names (case-insensitive)
	if (STANDARD_COLORS.has(color.toLowerCase())) {
		return true;
	}

	// Check hex color format
	if (color.startsWith('#')) {
		const hex = color.slice(1);

		// 3-digit hex (#RGB)
		if (hex.length === 3) {
			return /^[0-9a-fA-F]{3}$/.test(hex);
		}

		// 6-digit hex (#RRGGBB)
		if (hex.length === 6) {
			return /^[0-9a-fA-F]{6}$/.test(hex);
		}
	}

	return false;
}

/**
 * Normalizes a color string to lowercase.
 * For hex colors, converts to lowercase.
 * For named colors, converts to lowercase.
 *
 * @param color - The color string to normalize
 * @returns The normalized color string
 *
 * @example
 * normalizeColor('Red')      // 'red'
 * normalizeColor('#FF0000')  // '#ff0000'
 */
export function normalizeColor(color: string): string {
	return color.toLowerCase();
}
