/**
 * Evaluation Expression Parser
 * ============================
 *
 * Extracts {eval:expression} blocks from template strings.
 *
 * @module questions/parser/eval-parser
 */

/**
 * Evaluation expression
 */
export interface EvalExpr {
	expression: string; // Expression to evaluate
	fullMatch: string; // Full match including {eval: and }
	startIndex: number; // Start index in original string
	endIndex: number; // End index
}

/**
 * Extract all evaluation expressions from a string
 *
 * @param text - Template string
 * @returns Array of evaluation expressions
 *
 * @example
 * ```typescript
 * const exprs = extractEvalExpressions('Answer: {eval:3+4} or {eval:{@:a}^2}');
 * // Returns: [
 * //   { expression: '3+4', fullMatch: '{eval:3+4}', startIndex: 8, endIndex: 19 },
 * //   { expression: '{@:a}^2', fullMatch: '{eval:{@:a}^2}', startIndex: 23, endIndex: 38 }
 * // ]
 * ```
 */
export function extractEvalExpressions(text: string): EvalExpr[] {
	const exprs: EvalExpr[] = [];
	let i = 0;

	while (i < text.length) {
		// Look for {eval:
		if (text.substring(i, i + 6) === '{eval:') {
			// Find matching closing brace
			let braceCount = 1;
			let j = i + 6;

			while (j < text.length && braceCount > 0) {
				if (text[j] === '{') braceCount++;
				if (text[j] === '}') braceCount--;
				j++;
			}

			if (braceCount === 0) {
				const fullMatch = text.substring(i, j);
				const expression = text.substring(i + 6, j - 1);

				exprs.push({
					expression,
					fullMatch,
					startIndex: i,
					endIndex: j
				});

				i = j;
				continue;
			}
		}

		i++;
	}

	return exprs;
}

/**
 * Check if a string contains evaluation expressions
 *
 * @param text - Template string
 * @returns True if contains {eval:...} expressions
 */
export function hasEvalExpressions(text: string): boolean {
	return text.includes('{eval:');
}
