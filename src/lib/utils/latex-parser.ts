/**
 * LaTeX Parser Utility
 * ====================
 *
 * Parses plain text containing LaTeX expressions wrapped in $$ delimiters
 * and converts them into a structured format for rendering with MathLive.
 *
 * Use Case:
 * ---------
 * This parser is specifically designed for the Père Ubu chatbot, where the AI
 * returns plain text responses with embedded LaTeX math expressions. The parser
 * enables real-time rendering of math during typing animations.
 *
 * Features:
 * ---------
 * - Detects $$...$$ patterns in text (LaTeX math delimiters)
 * - Splits text into alternating text and math segments
 * - Preserves original text structure (whitespace, line breaks)
 * - Handles multiple math expressions in one string
 * - Fast regex-based parsing (< 1ms for typical messages)
 * - Works with partial text during typing animations
 *
 * Example:
 * --------
 *   Input:  "La formule $$x^2 + y^2$$ est égale à $$r^2$$"
 *   Output: [
 *     { type: 'text', content: 'La formule ' },
 *     { type: 'math', latex: 'x^2 + y^2' },
 *     { type: 'text', content: ' est égale à ' },
 *     { type: 'math', latex: 'r^2' }
 *   ]
 *
 * Integration:
 * ------------
 * Used by: src/lib/components/MathDisplay.svelte
 * Called on: Every text update during typing animation
 *
 * @see MathDisplay.svelte - Component that renders the parsed segments
 */

/**
 * Text Segment Type
 * =================
 * Represents a regular text portion of the message.
 * Content is plain string with no special formatting.
 */
export interface TextSegment {
	type: 'text';
	content: string;
}

/**
 * Math Segment Type
 * =================
 * Represents a LaTeX mathematical expression.
 * The latex field contains the raw LaTeX code without $$ delimiters.
 * This will be rendered as a MathLive field.
 */
export interface MathSegment {
	type: 'math';
	latex: string;
}

/**
 * Content Segment Union Type
 * ==========================
 * A segment can be either text or math.
 * The type discriminator allows TypeScript to narrow the type correctly.
 */
export type ContentSegment = TextSegment | MathSegment;

/**
 * Parse text with LaTeX expressions into segments
 * ================================================
 *
 * This is the main parsing function. It scans text for $$...$$ patterns
 * and splits the input into alternating text and math segments.
 *
 * Algorithm:
 * ----------
 * 1. Use regex to find all $$...$$ matches
 * 2. For each match, extract text before it and the LaTeX inside
 * 3. Create text segments for plain text portions
 * 4. Create math segments for LaTeX expressions
 * 5. Add any remaining text after the last match
 *
 * Edge Cases:
 * -----------
 * - Empty string → returns empty array
 * - No math expressions → returns single text segment
 * - Consecutive math expressions → handled correctly
 * - Incomplete expressions (partial $$) during typing → treated as text
 *
 * Performance:
 * ------------
 * - Regex.exec() with global flag for efficient iteration
 * - Single pass through the text (O(n) complexity)
 * - Minimal memory allocations
 *
 * @param text - Plain text with $$...$$ LaTeX expressions
 * @returns Array of text and math segments in order of appearance
 *
 * @example
 * parseLatex("Calcul: $$x^2$$")
 * // Returns: [
 * //   { type: 'text', content: 'Calcul: ' },
 * //   { type: 'math', latex: 'x^2' }
 * // ]
 */
export function parseLatex(text: string): ContentSegment[] {
	// Handle empty input
	if (!text) return [];

	const segments: ContentSegment[] = [];

	// Regex to match $$...$$ patterns
	// Pattern: \$\$ captures opening $$
	//          ([^$]+) captures one or more non-$ characters (the LaTeX)
	//          \$\$ captures closing $$
	// The 'g' flag enables global matching (find all occurrences)
	const mathRegex = /\$\$([^$]+)\$\$/g;

	let lastIndex = 0; // Track position of last processed character
	let match: RegExpExecArray | null;

	// Iterate through all matches
	// exec() returns null when no more matches are found
	while ((match = mathRegex.exec(text)) !== null) {
		const matchStart = match.index; // Start position of $$
		const matchEnd = mathRegex.lastIndex; // End position after closing $$

		// Add text segment before this math expression (if any)
		if (matchStart > lastIndex) {
			const textContent = text.slice(lastIndex, matchStart);
			if (textContent) {
				segments.push({
					type: 'text',
					content: textContent
				});
			}
		}

		// Add math segment
		// match[1] is the first capture group (the LaTeX code between $$)
		const latex = match[1].trim(); // Remove leading/trailing whitespace
		if (latex) {
			segments.push({
				type: 'math',
				latex
			});
		}

		// Update lastIndex to continue from end of this match
		lastIndex = matchEnd;
	}

	// Add remaining text after last math expression (if any)
	if (lastIndex < text.length) {
		const textContent = text.slice(lastIndex);
		if (textContent) {
			segments.push({
				type: 'text',
				content: textContent
			});
		}
	}

	// If no math expressions found, return single text segment
	// This handles the case where regex found no matches
	if (segments.length === 0) {
		return [{ type: 'text', content: text }];
	}

	return segments;
}

/**
 * Check if text contains any LaTeX expressions
 * ==============================================
 *
 * Utility function to quickly determine if text has math expressions
 * without parsing the entire string into segments.
 *
 * Use Cases:
 * ----------
 * - Conditionally render with MathDisplay or plain text
 * - Skip parsing overhead if no math is present
 * - Early optimization in rendering pipeline
 *
 * Performance:
 * ------------
 * - Uses RegExp.test() which is faster than exec() or match()
 * - Returns immediately on first match
 * - O(n) worst case, but typically faster than full parsing
 *
 * @param text - Text to check for LaTeX expressions
 * @returns true if text contains at least one $$...$$ pattern, false otherwise
 *
 * @example
 * hasLatex("Plain text") // false
 * hasLatex("Formula: $$x^2$$") // true
 */
export function hasLatex(text: string): boolean {
	// Same pattern as parseLatex, but using test() instead of exec()
	return /\$\$[^$]+\$\$/.test(text);
}
