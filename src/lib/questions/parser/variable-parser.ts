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
	name: string; // Variable name
	fullMatch: string; // Full match including {@: and }
	startIndex: number; // Start index in original string
	endIndex: number; // End index
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
 * //   { name: 'a', fullMatch: '{@:a}', startIndex: 10, endIndex: 16 },
 * //   { name: 'b', fullMatch: '{@:b}', startIndex: 19, endIndex: 25 }
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
			startIndex: match.index,
			endIndex: match.index + match[0].length
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
 * Get all variable names from a string (including duplicates)
 *
 * @param text - Template string
 * @returns Array of variable names (may include duplicates)
 *
 * @example
 * ```typescript
 * getVariableNames('Calculate {@:a} + {@:a} - {@:b}');
 * // Returns: ['a', 'a', 'b']
 * ```
 */
export function getVariableNames(text: string): string[] {
	const refs = extractVariableReferences(text);
	return refs.map((ref) => ref.name);
}
