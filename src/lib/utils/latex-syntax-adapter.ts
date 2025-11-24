/**
 * LaTeX Syntax Adapter
 *
 * Converts legacy MathDisplay syntax to standard markdown math syntax.
 *
 * Legacy MathDisplay uses `$$...$$` for ALL math (both inline and block).
 * Standard markdown uses `$...$` for inline and `$$...$$` for block math.
 *
 * Conversion rules:
 * - Single-line `$$content$$` → `$content$` (inline math)
 * - Multi-line `$$\ncontent\n$$` → `$$\ncontent\n$$` (block math, unchanged)
 * - `$$` at start of line followed by newline = block math (unchanged)
 */

/**
 * Converts legacy LaTeX syntax (MathDisplay format) to standard markdown math syntax.
 *
 * @param text - The input text containing legacy `$$...$$` syntax
 * @returns The converted text with proper `$...$` (inline) and `$$...$$` (block) syntax
 *
 * @example
 * // Inline math conversion
 * convertLegacyLatexToMarkdown('The formula $$x^2$$ is quadratic')
 * // Returns: 'The formula $x^2$ is quadratic'
 *
 * @example
 * // Block math stays unchanged
 * convertLegacyLatexToMarkdown('$$\nx^2 + y^2 = z^2\n$$')
 * // Returns: '$$\nx^2 + y^2 = z^2\n$$'
 */
export function convertLegacyLatexToMarkdown(text: string): string {
	if (!text) {
		return text;
	}

	// Track positions to avoid re-processing converted content
	let result = '';
	let i = 0;

	while (i < text.length) {
		// Look for $$ delimiter
		if (text[i] === '$' && text[i + 1] === '$') {
			const startIndex = i;
			i += 2; // Move past opening $$

			// Check if this is a block math (newline immediately after opening $$)
			const isBlockStart = text[i] === '\n';

			// Find the closing $$
			let closingIndex = -1;
			let j = i;

			while (j < text.length - 1) {
				if (text[j] === '$' && text[j + 1] === '$') {
					closingIndex = j;
					break;
				}
				j++;
			}

			// No closing $$ found, append rest of string and break
			if (closingIndex === -1) {
				result += text.slice(startIndex);
				break;
			}

			const content = text.slice(i, closingIndex);

			// Determine if this is block or inline math
			// Block math: contains newline OR starts with newline after $$
			const containsNewline = content.includes('\n');
			const isBlockMath = isBlockStart || containsNewline;

			if (isBlockMath) {
				// Keep as block math ($$...$$)
				result += '$$' + content + '$$';
			} else {
				// Convert to inline math ($...$)
				result += '$' + content + '$';
			}

			i = closingIndex + 2; // Move past closing $$
		} else {
			result += text[i];
			i++;
		}
	}

	return result;
}

/**
 * Checks if the given text contains legacy MathDisplay syntax that needs conversion.
 *
 * @param text - The text to check
 * @returns True if the text contains single-line `$$...$$` patterns that should be inline math
 *
 * @example
 * hasLegacyLatexSyntax('The formula $$x^2$$ is here') // true
 * hasLegacyLatexSyntax('The formula $x^2$ is here')   // false (already standard)
 */
export function hasLegacyLatexSyntax(text: string): boolean {
	if (!text) {
		return false;
	}

	// Pattern: $$ followed by content without newlines, followed by $$
	// This indicates inline math written in legacy format
	// Uses non-greedy +? and allows any char except newline (including single $)
	const inlineDoublePattern = /\$\$[^\n]+?\$\$/;
	return inlineDoublePattern.test(text);
}
