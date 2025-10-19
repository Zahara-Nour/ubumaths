/**
 * Tokenizer for Question Template Expressions
 * ============================================
 *
 * Extracts special tokens from template strings:
 * - {@:varName} - Variable references
 * - {#:...} - Random number expressions
 * - {eval:...} - Mathematical evaluations
 * - $$...$$ - LaTeX expressions
 *
 * @module questions/parser/tokenizer
 */

/**
 * Token types
 */
export type TokenType = 'variable' | 'random' | 'eval' | 'latex' | 'text';

/**
 * Token interface
 */
export interface Token {
  type: TokenType;
  value: string;      // Full token including delimiters
  content: string;    // Content without delimiters
  start: number;      // Start index in original string
  end: number;        // End index in original string
}

/**
 * Extract all tokens from a template expression
 *
 * @param text - Template string with special syntax
 * @returns Array of tokens in order of appearance
 *
 * @example
 * ```typescript
 * const tokens = tokenize('Calculate $${@:a} + {#:1-10}$$');
 * // Returns:
 * // [
 * //   { type: 'latex', value: '$${@:a} + {#:1-10}$$', content: '{@:a} + {#:1-10}', ... },
 * //   { type: 'variable', value: '{@:a}', content: 'a', ... },
 * //   { type: 'random', value: '{#:1-10}', content: '1-10', ... }
 * // ]
 * ```
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < text.length) {
    // Check for LaTeX: $$...$$
    if (text.substring(i, i + 2) === '$$') {
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) {
        const fullValue = text.substring(i, end + 2);
        const content = text.substring(i + 2, end);
        tokens.push({
          type: 'latex',
          value: fullValue,
          content,
          start: i,
          end: end + 2
        });
        i = end + 2;
        continue;
      }
    }

    // Check for special expressions: {@:...}, {#:...}, {eval:...}
    if (text[i] === '{') {
      const { token, endIndex } = extractBracedToken(text, i);
      if (token) {
        tokens.push(token);
        i = endIndex;
        continue;
      }
    }

    // Regular text - skip
    i++;
  }

  return tokens;
}

/**
 * Extract a braced token starting at position
 *
 * Handles nested braces correctly for complex expressions like:
 * {#:{@:min}-{@:max}}
 */
function extractBracedToken(text: string, start: number): { token: Token | null; endIndex: number } {
  let braceCount = 1;
  let i = start + 1;

  // Find matching closing brace
  while (i < text.length && braceCount > 0) {
    if (text[i] === '{') braceCount++;
    if (text[i] === '}') braceCount--;
    i++;
  }

  if (braceCount !== 0) {
    // Unmatched braces
    return { token: null, endIndex: start + 1 };
  }

  const fullValue = text.substring(start, i);
  const innerContent = text.substring(start + 1, i - 1);

  // Determine token type
  let type: TokenType = 'text';
  let content = innerContent;

  if (innerContent.startsWith('@:')) {
    type = 'variable';
    content = innerContent.substring(2);
  } else if (innerContent.startsWith('#:')) {
    type = 'random';
    content = innerContent.substring(2);
  } else if (innerContent.startsWith('eval:')) {
    type = 'eval';
    content = innerContent.substring(5);
  } else {
    // Not a special token
    return { token: null, endIndex: start + 1 };
  }

  return {
    token: {
      type,
      value: fullValue,
      content,
      start,
      end: i
    },
    endIndex: i
  };
}

/**
 * Find all tokens of a specific type
 *
 * @param text - Template string
 * @param type - Token type to find
 * @returns Array of matching tokens
 *
 * @example
 * ```typescript
 * const vars = findTokensByType('{@:a} + {@:b}', 'variable');
 * // Returns tokens for 'a' and 'b'
 * ```
 */
export function findTokensByType(text: string, type: TokenType): Token[] {
  const allTokens = tokenize(text);
  return allTokens.filter((token) => token.type === type);
}
