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
  expression: string;  // Expression to evaluate
  raw: string;         // Full match including {eval: and }
  start: number;       // Start index in original string
  end: number;         // End index
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
 * //   { expression: '3+4', raw: '{eval:3+4}', start: 8, end: 19 },
 * //   { expression: '{@:a}^2', raw: '{eval:{@:a}^2}', start: 23, end: 38 }
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
        const raw = text.substring(i, j);
        const expression = text.substring(i + 6, j - 1);

        exprs.push({
          expression,
          raw,
          start: i,
          end: j
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
