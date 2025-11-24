/**
 * Syntax Adapter - Convert between Questions and Shared Library syntaxes
 * =======================================================================
 *
 * CRITICAL: Bridges the syntax gap between:
 * - Questions/Database: Single-brace syntax {@:var}, {#:1-10}, {eval:expr}
 * - Shared Library: Double-brace Markdown syntax {{var}}, {{random:1-10}}, {{eval:expr}}
 *
 * This adapter is necessary because:
 * 1. Database stores templates with single-brace syntax (historical)
 * 2. Shared parameterization library expects double-brace syntax (Markdown standard)
 * 3. Without conversion, templates pass through unresolved
 *
 * @module questions/generator/syntax-adapter
 */

/**
 * Convert Questions syntax to Markdown syntax
 *
 * Transforms:
 * - {@:varName} → {{varName}}
 * - {#:random-spec} → {{random:random-spec}}
 * - {eval:expression} → {{eval:expression}}
 *
 * Handles nested cases like {#:1-{@:max}} → {{random:1-{{max}}}}
 *
 * @param text - Text with Questions syntax
 * @returns Text with Markdown syntax for shared library
 *
 * @example Simple conversions
 * ```typescript
 * convertToMarkdownSyntax('{@:a}')           // → '{{a}}'
 * convertToMarkdownSyntax('{#:1-10}')        // → '{{random:1-10}}'
 * convertToMarkdownSyntax('{eval:a+b}')      // → '{{eval:a+b}}'
 * ```
 *
 * @example Nested variable references
 * ```typescript
 * convertToMarkdownSyntax('{#:1-{@:max}}')   // → '{{random:1-{{max}}}}'
 * convertToMarkdownSyntax('{#:1-10!{@:a}}')  // → '{{random:1-10!{{a}}}}'
 * ```
 *
 * @example Complex expressions
 * ```typescript
 * convertToMarkdownSyntax('{eval:({@:a}+{@:b})/{@:c}}')
 * // → '{{eval:({{a}}+{{b}})/{{c}}}}'
 * ```
 */
export function convertToMarkdownSyntax(text: string): string {
	if (!text) return text;

	let result = text;

	// Step 1: Convert variable references {@:var} → {{var}}
	// Must happen first to handle nested cases
	result = result.replace(/\{@:(\w+)\}/g, '{{$1}}');

	// Step 2: Convert random expressions {#:spec} → {{random:spec}}
	// Use a more robust approach for nested braces (after variables are converted)
	let randomStart = result.indexOf('{#:');
	while (randomStart !== -1) {
		let braceCount = 1;
		let i = randomStart + 3; // Skip past '{#:'

		// Find the matching closing brace
		while (i < result.length && braceCount > 0) {
			if (result[i] === '{') {
				braceCount++;
			} else if (result[i] === '}') {
				braceCount--;
			}
			i++;
		}

		if (braceCount === 0) {
			// Extract the random spec content (between {#: and })
			const randomSpec = result.substring(randomStart + 3, i - 1);
			// Replace the entire {#:...} with {{random:...}}
			result =
				result.substring(0, randomStart) + '{{random:' + randomSpec + '}}' + result.substring(i);
			// Look for next random starting after this replacement
			randomStart = result.indexOf('{#:', randomStart + randomSpec.length + 11);
		} else {
			// Unmatched braces, skip this one
			randomStart = result.indexOf('{#:', randomStart + 1);
		}
	}

	// Step 3: Convert eval expressions {eval:...} → {{eval:...}}
	// Use a more robust approach for nested braces
	let evalStart = result.indexOf('{eval:');
	while (evalStart !== -1) {
		let braceCount = 1;
		let i = evalStart + 6; // Skip past '{eval:'

		// Find the matching closing brace
		while (i < result.length && braceCount > 0) {
			if (result[i] === '{') {
				braceCount++;
			} else if (result[i] === '}') {
				braceCount--;
			}
			i++;
		}

		if (braceCount === 0) {
			// Extract the eval content (between {eval: and })
			const evalContent = result.substring(evalStart + 6, i - 1);
			// Replace the entire {eval:...} with {{eval:...}}
			result =
				result.substring(0, evalStart) + '{{eval:' + evalContent + '}}' + result.substring(i);
			// Look for next eval starting after this replacement
			evalStart = result.indexOf('{eval:', evalStart + evalContent.length + 9);
		} else {
			// Unmatched braces, skip this one
			evalStart = result.indexOf('{eval:', evalStart + 1);
		}
	}

	return result;
}

/**
 * Convert Markdown syntax back to Questions syntax
 *
 * Inverse of convertToMarkdownSyntax. Used for:
 * - Displaying in UI with original syntax
 * - Storing back to database
 * - Maintaining consistency with existing templates
 *
 * Transforms:
 * - {{varName}} → {@:varName}
 * - {{random:spec}} → {#:spec}
 * - {{1-10}} → {#:1-10} (shorthand random)
 * - {{eval:expression}} → {eval:expression}
 *
 * @param text - Text with Markdown syntax
 * @returns Text with Questions syntax for database storage
 *
 * @example Reverse conversions
 * ```typescript
 * convertToQuestionsSyntax('{{a}}')                    // → '{@:a}'
 * convertToQuestionsSyntax('{{random:1-10}}')          // → '{#:1-10}'
 * convertToQuestionsSyntax('{{1-10}}')                 // → '{#:1-10}'
 * convertToQuestionsSyntax('{{eval:a+b}}')            // → '{eval:a+b}'
 * ```
 */
export function convertToQuestionsSyntax(text: string): string {
	if (!text) return text;

	let result = text;

	// Step 1: Convert eval expressions {{eval:expr}} → {eval:expr}
	// Use a more robust approach for nested braces
	let evalStart = result.indexOf('{{eval:');
	while (evalStart !== -1) {
		let braceCount = 2; // Start with 2 for the opening {{
		let i = evalStart + 7; // Skip past '{{eval:'

		// Find the matching closing braces
		while (i < result.length && braceCount > 0) {
			if (result[i] === '{') {
				braceCount++;
			} else if (result[i] === '}') {
				braceCount--;
			}
			i++;
		}

		if (braceCount === 0) {
			// Extract the eval content (between {{eval: and }})
			const evalContent = result.substring(evalStart + 7, i - 2); // -2 for the closing }}
			// Replace the entire {{eval:...}} with {eval:...}
			result = result.substring(0, evalStart) + '{eval:' + evalContent + '}' + result.substring(i);
			// Look for next eval starting after this replacement
			evalStart = result.indexOf('{{eval:', evalStart + evalContent.length + 7);
		} else {
			// Unmatched braces, skip this one
			evalStart = result.indexOf('{{eval:', evalStart + 1);
		}
	}

	// Step 2: Convert explicit random {{random:spec}} → {#:spec}
	// Use robust approach for nested braces
	let randomStart = result.indexOf('{{random:');
	while (randomStart !== -1) {
		let braceCount = 2; // Start with 2 for the opening {{
		let i = randomStart + 9; // Skip past '{{random:'

		// Find the matching closing braces
		while (i < result.length && braceCount > 0) {
			if (result[i] === '{') {
				braceCount++;
			} else if (result[i] === '}') {
				braceCount--;
			}
			i++;
		}

		if (braceCount === 0) {
			// Extract the random spec content
			const randomSpec = result.substring(randomStart + 9, i - 2); // -2 for the closing }}
			// Replace the entire {{random:...}} with {#:...}
			result = result.substring(0, randomStart) + '{#:' + randomSpec + '}' + result.substring(i);
			// Look for next random starting after this replacement
			randomStart = result.indexOf('{{random:', randomStart + randomSpec.length + 4);
		} else {
			// Unmatched braces, skip this one
			randomStart = result.indexOf('{{random:', randomStart + 1);
		}
	}

	// Step 3: Convert shorthand random {{spec}} → {#:spec}
	// Only if it looks like a random spec (contains -, digits, !, decimals)
	result = result.replace(/\{\{([\d.-]+(?:![\d.-]+)*)\}\}/g, '{#:$1}');

	// Step 4: Convert variable references {{var}} → {@:var}
	// Last to avoid interfering with other patterns
	result = result.replace(/\{\{(\w+)\}\}/g, '{@:$1}');

	return result;
}

/**
 * Detect syntax type in text
 *
 * Useful for:
 * - Migration tools
 * - Validation
 * - Auto-detection in imports
 *
 * @param text - Text to analyze
 * @returns Detected syntax type
 */
export function detectSyntax(text: string): 'questions' | 'markdown' | 'mixed' | 'none' {
	// Questions syntax: {@:var}, {#:spec}, or {eval:...} (single brace)
	const hasQuestionsSyntax = /\{[@#]:/.test(text) || /(?<!\{){eval:/.test(text);
	// Markdown syntax: {{...}} (double brace)
	const hasMarkdownSyntax = /\{\{/.test(text);

	if (hasQuestionsSyntax && hasMarkdownSyntax) return 'mixed';
	if (hasQuestionsSyntax) return 'questions';
	if (hasMarkdownSyntax) return 'markdown';
	return 'none';
}

/**
 * Normalize text to Markdown syntax
 *
 * Safely converts any syntax to Markdown format.
 * Handles mixed syntax by converting Questions syntax first.
 *
 * @param text - Text with any syntax
 * @returns Text with Markdown syntax
 */
export function normalizeToMarkdown(text: string): string {
	const syntax = detectSyntax(text);

	switch (syntax) {
		case 'questions':
		case 'mixed':
			return convertToMarkdownSyntax(text);
		case 'markdown':
			return text;
		default:
			return text;
	}
}
