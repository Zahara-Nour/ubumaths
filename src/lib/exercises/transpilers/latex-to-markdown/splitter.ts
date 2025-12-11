/**
 * LaTeX Statement/Solution Splitter
 * Separates statement and solution from a LaTeX document using various detection methods
 */

// ===========================
// Types
// ===========================

/**
 * Method used to detect and split statement from solution
 */
export type SplitMethod = 'solution-env' | 'section' | 'comment' | 'none';

/**
 * Result of splitting a LaTeX document into statement and solution
 */
export interface SplitResult {
	/** The statement (problem) part of the document */
	statement: string;
	/** The solution part, or null if no solution was found */
	solution: string | null;
	/** The method used to detect the split */
	splitMethod: SplitMethod;
	/** Line offset where the statement starts (0-based) */
	statementLineOffset: number;
	/** Line offset where the solution starts (0-based), or null if no solution */
	solutionLineOffset: number | null;
}

/**
 * Options for the splitter
 */
export interface SplitOptions {
	/** Custom solution environment name (default: 'solution') */
	solutionEnvName?: string;
	/** Custom section titles to detect (default: ['Solution', 'Correction', 'Réponse']) */
	solutionSectionTitles?: string[];
}

// ===========================
// Constants
// ===========================

/** Default solution environment names (French and English) */
const DEFAULT_SOLUTION_ENVS = ['solution', 'Correction', 'correction', 'reponse', 'Reponse'];

/** Default solution section titles (French and English) */
const DEFAULT_SOLUTION_TITLES = ['Solution', 'Correction', 'Réponse'];

/** Comment markers that indicate start of solution */
const SOLUTION_COMMENT_PATTERNS = [
	/^%+\s*-*\s*solution\s*-*\s*$/i,
	/^%+\s*-*\s*correction\s*-*\s*$/i,
	/^%+\s*-*\s*réponse\s*-*\s*$/i
];

// ===========================
// Main Functions
// ===========================

/**
 * Split a LaTeX document into statement and solution parts.
 *
 * Detection priority (in order):
 * 1. Solution environment: \begin{solution}...\end{solution}
 * 2. Section heading: \section{Solution} or \section*{Solution}
 * 3. Comment marker: % --- SOLUTION --- or similar
 * 4. No split: returns full content as statement
 *
 * @param latex - The LaTeX source text
 * @param options - Optional configuration for detection
 * @returns The split result with statement, solution, and method used
 */
export function splitStatementAndSolution(latex: string, options?: SplitOptions): SplitResult {
	// Extract only document content (ignore preamble)
	const { content: documentContent, lineOffset } = extractDocumentContent(latex);

	// Merge options with defaults
	const envNames = options?.solutionEnvName ? [options.solutionEnvName] : DEFAULT_SOLUTION_ENVS;
	const sectionTitles = options?.solutionSectionTitles ?? DEFAULT_SOLUTION_TITLES;

	// Try each detection method in priority order
	// Try all solution environment names
	for (const envName of envNames) {
		const envResult = tryEnvironmentSplit(documentContent, envName, lineOffset);
		if (envResult) {
			return envResult;
		}
	}

	const sectionResult = trySectionSplit(documentContent, sectionTitles, lineOffset);
	if (sectionResult) {
		return sectionResult;
	}

	const commentResult = tryCommentSplit(documentContent, lineOffset);
	if (commentResult) {
		return commentResult;
	}

	// No split detected
	// Count leading newlines that will be removed by trim()
	const leadingNewlines = countLeadingNewlines(documentContent);
	return {
		statement: documentContent.trim(),
		solution: null,
		splitMethod: 'none',
		statementLineOffset: lineOffset + leadingNewlines,
		solutionLineOffset: null
	};
}

/**
 * Detect which split method would be used without actually splitting.
 *
 * @param latex - The LaTeX source text
 * @param options - Optional configuration for detection
 * @returns The split method that would be used
 */
export function detectSplitMethod(latex: string, options?: SplitOptions): SplitMethod {
	const { content: documentContent } = extractDocumentContent(latex);
	const envNames = options?.solutionEnvName ? [options.solutionEnvName] : DEFAULT_SOLUTION_ENVS;
	const sectionTitles = options?.solutionSectionTitles ?? DEFAULT_SOLUTION_TITLES;

	// Try all solution environment names
	for (const envName of envNames) {
		if (hasSolutionEnvironment(documentContent, envName)) {
			return 'solution-env';
		}
	}

	if (hasSolutionSection(documentContent, sectionTitles)) {
		return 'section';
	}

	if (hasSolutionComment(documentContent)) {
		return 'comment';
	}

	return 'none';
}

// ===========================
// Helper Functions
// ===========================

/**
 * Extract the content inside \begin{document}...\end{document}.
 * If no document environment is found, returns the full input.
 *
 * @param latex - The full LaTeX source
 * @returns Object with document body content and the line offset where it starts
 */
function extractDocumentContent(latex: string): { content: string; lineOffset: number } {
	// Case-insensitive search for document environment
	const beginPattern = /\\begin\s*\{document\}/i;
	const endPattern = /\\end\s*\{document\}/i;

	const beginMatch = latex.match(beginPattern);
	if (!beginMatch || beginMatch.index === undefined) {
		return { content: latex, lineOffset: 0 };
	}

	const startIndex = beginMatch.index + beginMatch[0].length;
	const lineOffset = countNewlinesUpTo(latex, startIndex);

	// Find the end of document
	const remaining = latex.substring(startIndex);
	const endMatch = remaining.match(endPattern);

	if (!endMatch || endMatch.index === undefined) {
		// No \end{document}, return everything after \begin{document}
		return { content: latex.substring(startIndex), lineOffset };
	}

	return { content: remaining.substring(0, endMatch.index), lineOffset };
}

/**
 * Try to split using a solution environment.
 *
 * @param content - Document content to search
 * @param envName - Name of the solution environment
 * @param baseOffset - Line offset to add to all line numbers
 * @returns Split result or null if not found
 */
function tryEnvironmentSplit(
	content: string,
	envName: string,
	baseOffset: number
): SplitResult | null {
	// Build case-insensitive pattern for the environment
	const beginPattern = new RegExp(`\\\\begin\\s*\\{${escapeRegex(envName)}\\}`, 'i');
	const beginMatch = content.match(beginPattern);

	if (!beginMatch || beginMatch.index === undefined) {
		return null;
	}

	const envStartIndex = beginMatch.index;
	const contentStartIndex = envStartIndex + beginMatch[0].length;

	// Find matching \end{envName}, handling nesting of same-named environments
	const endPattern = new RegExp(`\\\\end\\s*\\{${escapeRegex(envName)}\\}`, 'gi');
	const nestedBeginPattern = new RegExp(`\\\\begin\\s*\\{${escapeRegex(envName)}\\}`, 'gi');

	let depth = 1;
	let searchIndex = contentStartIndex;
	let envEndIndex = -1;

	while (depth > 0 && searchIndex < content.length) {
		// Reset regex lastIndex
		nestedBeginPattern.lastIndex = searchIndex;
		endPattern.lastIndex = searchIndex;

		const nextBegin = nestedBeginPattern.exec(content);
		const nextEnd = endPattern.exec(content);

		if (!nextEnd) {
			// No closing found, malformed LaTeX
			return null;
		}

		const beginPos = nextBegin?.index ?? Infinity;
		const endPos = nextEnd.index;

		if (beginPos < endPos) {
			// Found nested begin first
			depth++;
			searchIndex = beginPos + nextBegin![0].length;
		} else {
			// Found end
			depth--;
			if (depth === 0) {
				envEndIndex = endPos;
			} else {
				searchIndex = endPos + nextEnd[0].length;
			}
		}
	}

	if (envEndIndex === -1) {
		// Unmatched environment
		return null;
	}

	const rawStatement = content.substring(0, envStartIndex);
	const rawSolution = content.substring(contentStartIndex, envEndIndex);
	const statement = rawStatement.trim();
	const solution = rawSolution.trim();

	// Count leading newlines that will be removed by trim()
	const statementLeadingNewlines = countLeadingNewlines(rawStatement);
	const solutionLeadingNewlines = countLeadingNewlines(rawSolution);

	// Handle case where solution is at the very beginning (statement would be empty)
	if (statement === '' && solution !== '') {
		return {
			statement: solution,
			solution: null,
			splitMethod: 'none',
			statementLineOffset:
				baseOffset + countNewlinesUpTo(content, contentStartIndex) + solutionLeadingNewlines,
			solutionLineOffset: null
		};
	}

	return {
		statement,
		solution: solution || null,
		splitMethod: 'solution-env',
		statementLineOffset: baseOffset + statementLeadingNewlines,
		solutionLineOffset: solution
			? baseOffset + countNewlinesUpTo(content, contentStartIndex) + solutionLeadingNewlines
			: null
	};
}

/**
 * Try to split using a section heading.
 *
 * @param content - Document content to search
 * @param titles - Section titles to detect
 * @param baseOffset - Line offset to add to all line numbers
 * @returns Split result or null if not found
 */
function trySectionSplit(
	content: string,
	titles: string[],
	baseOffset: number
): SplitResult | null {
	// Build pattern that matches \section{Title}, \section*{Title}, \section[short]{Title}
	const titlesPattern = titles.map(escapeRegex).join('|');
	const sectionPattern = new RegExp(
		`\\\\section\\*?(?:\\s*\\[[^\\]]*\\])?\\s*\\{(${titlesPattern})\\}`,
		'i'
	);

	const match = content.match(sectionPattern);

	if (!match || match.index === undefined) {
		return null;
	}

	const sectionIndex = match.index;
	const rawStatement = content.substring(0, sectionIndex);
	const solutionStartIndex = sectionIndex + match[0].length;
	const rawSolution = content.substring(solutionStartIndex);
	const statement = rawStatement.trim();
	const solution = rawSolution.trim();

	// Count leading newlines that will be removed by trim()
	const statementLeadingNewlines = countLeadingNewlines(rawStatement);
	const solutionLeadingNewlines = countLeadingNewlines(rawSolution);

	// Handle case where solution section is at the very beginning
	if (statement === '' && solution !== '') {
		return {
			statement: solution,
			solution: null,
			splitMethod: 'none',
			statementLineOffset:
				baseOffset + countNewlinesUpTo(content, solutionStartIndex) + solutionLeadingNewlines,
			solutionLineOffset: null
		};
	}

	return {
		statement,
		solution: solution || null,
		splitMethod: 'section',
		statementLineOffset: baseOffset + statementLeadingNewlines,
		solutionLineOffset: solution
			? baseOffset + countNewlinesUpTo(content, solutionStartIndex) + solutionLeadingNewlines
			: null
	};
}

/**
 * Try to split using a comment marker.
 *
 * @param content - Document content to search
 * @param baseOffset - Line offset to add to all line numbers
 * @returns Split result or null if not found
 */
function tryCommentSplit(content: string, baseOffset: number): SplitResult | null {
	// Split into lines to find the comment marker
	const lines = content.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		for (const pattern of SOLUTION_COMMENT_PATTERNS) {
			if (pattern.test(line)) {
				// Found a solution comment marker
				const rawStatement = lines.slice(0, i).join('\n');
				const rawSolution = lines.slice(i + 1).join('\n');
				const statement = rawStatement.trim();
				const solution = rawSolution.trim();

				// Count leading newlines that will be removed by trim()
				const statementLeadingNewlines = countLeadingNewlines(rawStatement);
				const solutionLeadingNewlines = countLeadingNewlines(rawSolution);

				// Handle case where comment is at the very beginning
				if (statement === '' && solution !== '') {
					return {
						statement: solution,
						solution: null,
						splitMethod: 'none',
						statementLineOffset: baseOffset + i + 1 + solutionLeadingNewlines,
						solutionLineOffset: null
					};
				}

				return {
					statement,
					solution: solution || null,
					splitMethod: 'comment',
					statementLineOffset: baseOffset + statementLeadingNewlines,
					solutionLineOffset: solution ? baseOffset + i + 1 + solutionLeadingNewlines : null
				};
			}
		}
	}

	return null;
}

/**
 * Check if the content contains a solution environment.
 *
 * @param content - Document content to search
 * @param envName - Name of the solution environment
 * @returns True if a solution environment is found
 */
function hasSolutionEnvironment(content: string, envName: string): boolean {
	const pattern = new RegExp(`\\\\begin\\s*\\{${escapeRegex(envName)}\\}`, 'i');
	return pattern.test(content);
}

/**
 * Check if the content contains a solution section.
 *
 * @param content - Document content to search
 * @param titles - Section titles to detect
 * @returns True if a solution section is found
 */
function hasSolutionSection(content: string, titles: string[]): boolean {
	const titlesPattern = titles.map(escapeRegex).join('|');
	const pattern = new RegExp(
		`\\\\section\\*?(?:\\s*\\[[^\\]]*\\])?\\s*\\{(${titlesPattern})\\}`,
		'i'
	);
	return pattern.test(content);
}

/**
 * Check if the content contains a solution comment marker.
 *
 * @param content - Document content to search
 * @returns True if a solution comment is found
 */
function hasSolutionComment(content: string): boolean {
	const lines = content.split('\n');
	return lines.some((line) => {
		const trimmed = line.trim();
		return SOLUTION_COMMENT_PATTERNS.some((pattern) => pattern.test(trimmed));
	});
}

/**
 * Escape special regex characters in a string.
 *
 * @param str - String to escape
 * @returns Regex-safe string
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Count the number of newlines in a string up to a given position.
 *
 * @param text - The text to search
 * @param position - The position to count up to
 * @returns The number of newlines (which equals the 0-based line number)
 */
function countNewlinesUpTo(text: string, position: number): number {
	let count = 0;
	for (let i = 0; i < position && i < text.length; i++) {
		if (text[i] === '\n') {
			count++;
		}
	}
	return count;
}

/**
 * Count the number of leading newlines in a string (before any non-whitespace content).
 * This is used to adjust line offsets when trimming content.
 *
 * @param text - The text to search
 * @returns The number of newlines at the start of the string
 */
function countLeadingNewlines(text: string): number {
	let count = 0;
	for (const char of text) {
		if (char === '\n') {
			count++;
		} else if (char !== ' ' && char !== '\t' && char !== '\r') {
			break;
		}
	}
	return count;
}
