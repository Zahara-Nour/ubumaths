/**
 * Blank Resolver
 * ==============
 *
 * Extracts and numbers all blanks from a resolved statement.
 * Handles both text blanks ([_], {{blank:N}}) and math blanks (? in $...$).
 *
 * The numbering is global and positional: all blanks are numbered 0, 1, 2, ...
 * in order of appearance, regardless of type.
 *
 * Math blanks (?) are replaced with \placeholder[N]{} for MathLive rendering.
 * Text blanks ([_] and {{blank:N}}) are left in the string for the parser/renderer.
 *
 * @module questions/generator/blank-resolver
 */

/** Blank definition extracted from a resolved statement */
export interface BlankDefinition {
	/** 0-based positional index (global across all blanks) */
	position: number;
	/** Blank type: 'math' (? in $...$) or 'text' ([_] or {{blank:N}}) */
	type: 'math' | 'text';
	/** Expected answer (filled later from solution/blanks data) */
	expectedAnswer: string;
	/** Optional word pool for text blanks */
	pool?: string[];
}

/** Result of blank resolution */
export interface BlankResolutionResult {
	/** Statement with ? replaced by \placeholder[N]{} in math zones */
	resolvedStatement: string;
	/** Extracted blanks in positional order */
	blanks: BlankDefinition[];
}

/**
 * Resolve blanks in a statement string.
 *
 * Scans the statement left-to-right for:
 * - `{{blank:N}}` → text blank (keeps original, records position)
 * - `[_]` → text blank (keeps original, records position)
 * - `?` inside `$...$` or `$$...$$` → math blank (replaced with `\placeholder[N]{}`)
 *
 * @param statement - Resolved statement (after variable resolution, before LaTeX conversion)
 * @returns Statement with math placeholders and blank definitions
 */
export function resolveBlanks(statement: string): BlankResolutionResult {
	const blanks: BlankDefinition[] = [];
	let globalIndex = 0;

	// Collect all blank occurrences with their position in the string
	const occurrences: Array<{
		start: number;
		end: number;
		type: 'math' | 'text';
		kind: 'explicit_blank' | 'text_blank' | 'math_question';
	}> = [];

	// Find {{blank:N}} occurrences
	const explicitBlankRegex = /\{\{blank:\d+\}\}/g;
	let match: RegExpExecArray | null;
	while ((match = explicitBlankRegex.exec(statement)) !== null) {
		occurrences.push({
			start: match.index,
			end: match.index + match[0].length,
			type: 'text',
			kind: 'explicit_blank'
		});
	}

	// Find [_] occurrences (outside backtick code spans)
	const textBlankRegex = /\[_\]/g;
	while ((match = textBlankRegex.exec(statement)) !== null) {
		if (!isInsideCodeSpan(statement, match.index)) {
			occurrences.push({
				start: match.index,
				end: match.index + match[0].length,
				type: 'text',
				kind: 'text_blank'
			});
		}
	}

	// Find ? inside math zones ($...$ and $$...$$)
	const mathZones = findMathZones(statement);
	for (const zone of mathZones) {
		const content = statement.substring(zone.contentStart, zone.contentEnd);
		let qPos = content.indexOf('?');
		while (qPos !== -1) {
			const absolutePos = zone.contentStart + qPos;
			occurrences.push({
				start: absolutePos,
				end: absolutePos + 1,
				type: 'math',
				kind: 'math_question'
			});
			qPos = content.indexOf('?', qPos + 1);
		}
	}

	// Sort occurrences by position (left-to-right)
	occurrences.sort((a, b) => a.start - b.start);

	// Build result: replace math ? with \placeholder[N]{}, keep text blanks
	let result = '';
	let lastEnd = 0;

	for (const occ of occurrences) {
		// Add text between last occurrence and this one
		result += statement.substring(lastEnd, occ.start);

		if (occ.kind === 'math_question') {
			// Replace ? with \placeholder[N]{}
			result += `\\placeholder[${globalIndex}]{}`;
		} else {
			// Keep text blank as-is
			result += statement.substring(occ.start, occ.end);
		}

		blanks.push({
			position: globalIndex,
			type: occ.type,
			expectedAnswer: '' // filled later
		});

		globalIndex++;
		lastEnd = occ.end;
	}

	// Add remaining text
	result += statement.substring(lastEnd);

	return {
		resolvedStatement: result,
		blanks
	};
}

/**
 * Build the answerFormat expression for Result/Rewrite mode.
 *
 * When an expression* variable has no ?, the display becomes:
 * `$$expression_latex = answerFormat_latex$$`
 *
 * The ? in answerFormat are replaced with \placeholder[N]{}.
 *
 * @param expressionLatex - The resolved expression in LaTeX
 * @param answerFormat - The answer format pattern (e.g., "10^?", "?", "?*10^?")
 * @param startIndex - Starting index for placeholder numbering
 * @returns Object with display LaTeX and blank definitions
 */
export function buildAnswerFormatExpression(
	expressionLatex: string,
	answerFormat: string,
	startIndex: number = 0
): { displayLatex: string; blanks: BlankDefinition[] } {
	const blanks: BlankDefinition[] = [];
	let index = startIndex;

	// Replace ? in answerFormat with \placeholder[N]{}
	const answerFormatLatex = answerFormat.replace(/\?/g, () => {
		blanks.push({
			position: index,
			type: 'math',
			expectedAnswer: '' // filled later
		});
		return `\\placeholder[${index++}]{}`;
	});

	return {
		displayLatex: `${expressionLatex} = ${answerFormatLatex}`,
		blanks
	};
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

interface MathZone {
	/** Start of the full zone including delimiters */
	start: number;
	/** End of the full zone including delimiters */
	end: number;
	/** Start of the content (after opening delimiter) */
	contentStart: number;
	/** End of the content (before closing delimiter) */
	contentEnd: number;
	/** Whether this is a block math ($$) or inline ($) */
	isBlock: boolean;
}

/**
 * Find all math zones ($...$ and $$...$$) in the text.
 * Block math ($$) is processed first to avoid conflicts.
 */
function findMathZones(text: string): MathZone[] {
	const zones: MathZone[] = [];
	const used = new Set<number>(); // positions already in a zone

	// Find block math $$...$$ first
	const blockRegex = /\$\$([\s\S]+?)\$\$/g;
	let match: RegExpExecArray | null;
	while ((match = blockRegex.exec(text)) !== null) {
		zones.push({
			start: match.index,
			end: match.index + match[0].length,
			contentStart: match.index + 2,
			contentEnd: match.index + 2 + match[1].length,
			isBlock: true
		});
		for (let i = match.index; i < match.index + match[0].length; i++) {
			used.add(i);
		}
	}

	// Find inline math $...$
	const inlineRegex = /\$([^$\n]+)\$/g;
	while ((match = inlineRegex.exec(text)) !== null) {
		// Skip if this position is already inside a block math zone
		if (used.has(match.index)) continue;

		zones.push({
			start: match.index,
			end: match.index + match[0].length,
			contentStart: match.index + 1,
			contentEnd: match.index + 1 + match[1].length,
			isBlock: false
		});
	}

	return zones.sort((a, b) => a.start - b.start);
}

/**
 * Check if a position in text falls inside a backtick code span.
 */
function isInsideCodeSpan(text: string, pos: number): boolean {
	const codeSpanRegex = /`[^`]*`/g;
	let match: RegExpExecArray | null;
	while ((match = codeSpanRegex.exec(text)) !== null) {
		if (pos > match.index && pos < match.index + match[0].length) {
			return true;
		}
	}
	return false;
}
