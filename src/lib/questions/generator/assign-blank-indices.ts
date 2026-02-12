/**
 * Assign Blank Indices
 * =====================
 *
 * Processes a resolved statement to assign sequential 0-based indices
 * to all blanks (math ?, text [_], and expression answerFormats).
 *
 * Pipeline position: after resolveMarkdownContent(), before parseMarkdown().
 *
 * Three types of blanks:
 * - `?` in math zones ($...$, $$...$$) → \placeholder[N]{}
 * - `[_]` in text (outside math) → {{blank:N}}
 * - `<<expr:NAME>>` in math → reserves indices for ? in answerFormats[NAME]
 *
 * @module questions/generator/assign-blank-indices
 */

/**
 * Result of assigning blank indices to a statement
 */
export interface AssignBlankIndicesResult {
	/** Statement with ? replaced by \placeholder[N]{} and [_] replaced by {{blank:N}} */
	statement: string;
	/** Modified answerFormats with ? replaced by \placeholder[N]{} (undefined if input was undefined) */
	answerFormats?: Record<string, string>;
	/** Total number of blanks assigned */
	totalBlanks: number;
}

/**
 * Regex to match expression markers in math zones: <<expr:NAME>>
 * NAME starts with "expression" followed by alphanumeric characters.
 */
const EXPR_MARKER_REGEX = /^<<expr:(expression[a-zA-Z0-9]*)>>/;

/**
 * Assign sequential 0-based indices to all blanks in a statement.
 *
 * Processes left-to-right with a global counter:
 * 1. For each math zone encountered (in order):
 *    - If it contains <<expr:NAME>>, reserve indices for ? in answerFormats[NAME]
 *    - Otherwise, replace each ? with \placeholder[N]{}
 * 2. For each [_] in text (outside math), replace with {{blank:N}}
 *
 * @param statement - Resolved statement string (variables already replaced)
 * @param answerFormats - Optional map of expression names to answer format strings
 * @returns Modified statement, modified answerFormats, and total blank count
 */
export function assignBlankIndices(
	statement: string,
	answerFormats?: Record<string, string>
): AssignBlankIndicesResult {
	let counter = 0;
	const modifiedAnswerFormats = answerFormats ? { ...answerFormats } : undefined;

	// Split statement into math zones and text zones, preserving order.
	// We need to process left-to-right, handling math zones and text zones differently.
	const segments = splitIntoSegments(statement);

	const resultParts: string[] = [];

	for (const segment of segments) {
		if (segment.type === 'math') {
			// Check for expression marker
			const exprMatch = segment.content.match(EXPR_MARKER_REGEX);

			if (exprMatch && modifiedAnswerFormats && exprMatch[1] in modifiedAnswerFormats) {
				// Expression with answerFormat: reserve indices for ? in answerFormat only.
				// The statement content is NOT modified (no ? replacement).
				const exprName = exprMatch[1];
				const answerFormat = modifiedAnswerFormats[exprName];
				let modifiedFormat = '';
				for (const char of answerFormat) {
					if (char === '?') {
						modifiedFormat += `\\placeholder[${counter}]{}`;
						counter++;
					} else {
						modifiedFormat += char;
					}
				}
				modifiedAnswerFormats[exprName] = modifiedFormat;
				// Preserve statement content as-is (marker stays for the parser)
				resultParts.push(`${segment.openDelim}${segment.content}${segment.closeDelim}`);
			} else {
				// No expression marker — replace ? in math content
				let newContent = '';
				for (const char of segment.content) {
					if (char === '?') {
						newContent += `\\placeholder[${counter}]{}`;
						counter++;
					} else {
						newContent += char;
					}
				}
				resultParts.push(`${segment.openDelim}${newContent}${segment.closeDelim}`);
			}
		} else {
			// Text zone — replace [_] with {{blank:N}}
			let newText = '';
			let i = 0;
			const text = segment.content;
			while (i < text.length) {
				if (text[i] === '[' && text[i + 1] === '_' && text[i + 2] === ']') {
					newText += `{{blank:${counter}}}`;
					counter++;
					i += 3;
				} else {
					newText += text[i];
					i++;
				}
			}
			resultParts.push(newText);
		}
	}

	return {
		statement: resultParts.join(''),
		...(modifiedAnswerFormats !== undefined && { answerFormats: modifiedAnswerFormats }),
		totalBlanks: counter
	};
}

/**
 * A segment of the statement — either a math zone or a text zone
 */
interface Segment {
	type: 'math' | 'text';
	content: string;
	/** Opening delimiter for math zones ($ or $$) */
	openDelim?: string;
	/** Closing delimiter for math zones ($ or $$) */
	closeDelim?: string;
}

/**
 * Split a statement string into alternating text and math segments.
 *
 * Handles:
 * - Block math: $$...$$ (matched first, greedy-safe)
 * - Inline math: $...$ (no newlines inside)
 * - Escaped dollars: \$ (treated as literal text)
 *
 * @param statement - The statement to split
 * @returns Array of segments in order of appearance
 */
function splitIntoSegments(statement: string): Segment[] {
	const segments: Segment[] = [];
	let pos = 0;

	while (pos < statement.length) {
		// Check for escaped dollar
		if (statement[pos] === '\\' && statement[pos + 1] === '$') {
			// Escaped dollar — add as text
			appendText(segments, '\\$');
			pos += 2;
			continue;
		}

		// Check for block math $$...$$
		if (statement[pos] === '$' && statement[pos + 1] === '$') {
			const start = pos + 2;
			const end = statement.indexOf('$$', start);
			if (end !== -1) {
				const content = statement.slice(start, end);
				segments.push({
					type: 'math',
					content,
					openDelim: '$$',
					closeDelim: '$$'
				});
				pos = end + 2;
				continue;
			}
		}

		// Check for inline math $...$
		if (statement[pos] === '$') {
			const start = pos + 1;
			// Find closing $ (not preceded by \, not followed by $, no newlines)
			let end = -1;
			for (let j = start; j < statement.length; j++) {
				if (statement[j] === '\n') break;
				if (statement[j] === '$' && statement[j - 1] !== '\\') {
					end = j;
					break;
				}
			}
			if (end !== -1) {
				const content = statement.slice(start, end);
				segments.push({
					type: 'math',
					content,
					openDelim: '$',
					closeDelim: '$'
				});
				pos = end + 1;
				continue;
			}
		}

		// Regular text character
		appendText(segments, statement[pos]);
		pos++;
	}

	return segments;
}

/**
 * Append a character or string to the last text segment, or create a new one
 */
function appendText(segments: Segment[], char: string): void {
	const last = segments[segments.length - 1];
	if (last && last.type === 'text') {
		last.content += char;
	} else {
		segments.push({ type: 'text', content: char });
	}
}
