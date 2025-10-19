/**
 * Variable Reference Parser
 * =========================
 *
 * Extracts variable references ({@:varName}) from template strings.
 *
 * @module questions/parser/variable-parser
 */

/**
 * Variable reference
 */
export interface VariableRef {
  name: string;       // Variable name
  fullMatch: string;  // Full match including {@: and }
  start: number;      // Start index in original string
  end: number;        // End index
}

/**
 * Extract all variable references from a string
 *
 * @param text - Template string
 * @returns Array of variable references
 *
 * @example
 * ```typescript
 * const refs = extractVariableReferences('Calculate {@:a} + {@:b}');
 * // Returns: [
 * //   { name: 'a', fullMatch: '{@:a}', start: 10, end: 15 },
 * //   { name: 'b', fullMatch: '{@:b}', start: 18, end: 23 }
 * // ]
 * ```
 */
export function extractVariableReferences(text: string): VariableRef[] {
  const refs: VariableRef[] = [];
  const regex = /\{@:(\w+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    refs.push({
      name: match[1],
      fullMatch: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return refs;
}

/**
 * Check if a string contains variable references
 *
 * @param text - Template string
 * @returns True if contains {@:...} references
 */
export function hasVariableReferences(text: string): boolean {
  return /\{@:\w+\}/.test(text);
}

/**
 * Get unique variable names from a string
 *
 * @param text - Template string
 * @returns Array of unique variable names
 *
 * @example
 * ```typescript
 * getVariableNames('Calculate {@:a} + {@:a} - {@:b}');
 * // Returns: ['a', 'b']
 * ```
 */
export function getVariableNames(text: string): string[] {
  const refs = extractVariableReferences(text);
  const uniqueNames = new Set(refs.map((ref) => ref.name));
  return Array.from(uniqueNames);
}
