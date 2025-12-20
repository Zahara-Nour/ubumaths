/**
 * List Converters for LaTeX to Markdown
 * Handles itemize, enumerate, and description environments
 * including nested lists with proper indentation.
 */

import type { EnvironmentToken, ConversionContext, ListItem, ListType } from '../types';
import { tokenize } from '../tokenizer';

// ===========================
// Constants
// ===========================

/** Spaces per indentation level */
const INDENT_SIZE = 2;

// ===========================
// Content Processing Helper
// ===========================

/**
 * Process item content text through the tokenizer and converter.
 * This ensures LaTeX commands inside list items (like \, \%) are properly converted.
 *
 * @param text - Raw text content from a list item
 * @param context - The conversion context with processChildren function
 * @param startLine - Starting line number for proper error reporting (default: 1)
 * @returns Processed text with LaTeX commands converted
 */
function processItemText(text: string, context: ConversionContext, startLine: number = 1): string {
	if (!text.trim() || !context.processChildren) {
		return text;
	}

	// Tokenize the content to process any LaTeX commands, passing the starting line
	const tokens = tokenize(text, startLine);

	// Convert the tokens using the context's processChildren
	return context.processChildren(tokens);
}

/** List environment names */
const LIST_ENVIRONMENTS: ListType[] = ['itemize', 'enumerate', 'description'];

// ===========================
// Utility Functions
// ===========================

/**
 * Get indentation string based on nesting level.
 * Level 0 = no indent, Level 1 = 2 spaces, etc.
 */
export function getIndent(level: number): string {
	return ' '.repeat(level * INDENT_SIZE);
}

/**
 * Check if an environment name is a list environment.
 */
export function isListEnvironment(name: string): boolean {
	return LIST_ENVIRONMENTS.includes(name as ListType);
}

/**
 * Find all nested environment ranges in content.
 * Returns array of [startIndex, endIndex] for each nested environment.
 */
function findNestedEnvironments(content: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	const envRegex = /\\begin\{(itemize|enumerate|description)\}/g;

	let match: RegExpExecArray | null;
	while ((match = envRegex.exec(content)) !== null) {
		const startIdx = match.index;
		const envName = match[1];

		// Find the matching \end{envName}
		let depth = 1;
		let searchIdx = startIdx + match[0].length;
		const beginRegex = new RegExp(`\\\\begin\\{${envName}\\}`, 'g');
		const endRegex = new RegExp(`\\\\end\\{${envName}\\}`, 'g');

		while (depth > 0 && searchIdx < content.length) {
			// Find next begin or end
			beginRegex.lastIndex = searchIdx;
			endRegex.lastIndex = searchIdx;

			const nextBegin = beginRegex.exec(content);
			const nextEnd = endRegex.exec(content);

			if (!nextEnd) {
				// Malformed, no matching end
				break;
			}

			if (nextBegin && nextBegin.index < nextEnd.index) {
				// Found another begin first
				depth++;
				searchIdx = nextBegin.index + nextBegin[0].length;
			} else {
				// Found end
				depth--;
				searchIdx = nextEnd.index + nextEnd[0].length;
				if (depth === 0) {
					ranges.push([startIdx, searchIdx]);
				}
			}
		}
	}

	return ranges;
}

/**
 * Check if a position is inside any nested environment.
 */
function isInsideNestedEnv(pos: number, ranges: Array<[number, number]>): boolean {
	return ranges.some(([start, end]) => pos > start && pos < end);
}

/**
 * Count newlines in a string up to a given position.
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
 * Parse list items from environment content.
 * Handles \item commands and extracts content for each item.
 * Correctly ignores \item commands inside nested environments.
 *
 * @param content - Raw content between \begin and \end tags
 * @returns Array of parsed list items
 */
export function parseListItems(content: string): ListItem[] {
	const items: ListItem[] = [];

	// Find all nested environments first so we can skip \item inside them
	const nestedRanges = findNestedEnvironments(content);

	// Find all \item commands not inside nested environments
	const itemRegex = /\\item(?:\s*\[([^\]]*)\])?\s*/g;
	const itemPositions: Array<{
		label?: string;
		startIndex: number;
		commandEnd: number;
		lineOffset: number;
	}> = [];

	let match: RegExpExecArray | null;
	while ((match = itemRegex.exec(content)) !== null) {
		// Skip if inside nested environment
		if (isInsideNestedEnv(match.index, nestedRanges)) {
			continue;
		}

		// Calculate line offset: count newlines from start of content to the \item command
		const lineOffset = countNewlinesUpTo(content, match.index + match[0].length);

		itemPositions.push({
			label: match[1],
			startIndex: match.index,
			commandEnd: match.index + match[0].length,
			lineOffset
		});
	}

	// Extract content for each item
	for (let i = 0; i < itemPositions.length; i++) {
		const current = itemPositions[i];
		const nextStart =
			i < itemPositions.length - 1 ? itemPositions[i + 1].startIndex : content.length;

		const itemContent = content.slice(current.commandEnd, nextStart).trim();

		items.push({
			content: itemContent,
			label: current.label,
			lineOffset: current.lineOffset
		});
	}

	return items;
}

/**
 * Split item content into text parts and nested lists.
 * Returns the text before the first nested list, the nested list itself, and text after.
 */
function splitItemContent(content: string): {
	textBefore: string;
	nestedList: string | null;
	nestedListLineOffset: number;
	textAfter: string;
} {
	// Find first nested list environment
	const envRegex = /\\begin\{(itemize|enumerate|description)\}/;
	const beginMatch = content.match(envRegex);

	if (!beginMatch) {
		return { textBefore: content, nestedList: null, nestedListLineOffset: 0, textAfter: '' };
	}

	const envName = beginMatch[1];
	const startIdx = beginMatch.index!;
	// Calculate line offset: count newlines from start of content to start of nested list
	const nestedListLineOffset = countNewlinesUpTo(content, startIdx);

	// Find the matching \end{envName}
	let depth = 1;
	let searchIdx = startIdx + beginMatch[0].length;
	const beginRegex = new RegExp(`\\\\begin\\{${envName}\\}`, 'g');
	const endRegex = new RegExp(`\\\\end\\{${envName}\\}`, 'g');
	let endIdx = content.length;

	while (depth > 0 && searchIdx < content.length) {
		beginRegex.lastIndex = searchIdx;
		endRegex.lastIndex = searchIdx;

		const nextBegin = beginRegex.exec(content);
		const nextEnd = endRegex.exec(content);

		if (!nextEnd) {
			break;
		}

		if (nextBegin && nextBegin.index < nextEnd.index) {
			depth++;
			searchIdx = nextBegin.index + nextBegin[0].length;
		} else {
			depth--;
			searchIdx = nextEnd.index + nextEnd[0].length;
			if (depth === 0) {
				endIdx = searchIdx;
			}
		}
	}

	return {
		textBefore: content.slice(0, startIdx).trim(),
		nestedList: content.slice(startIdx, endIdx),
		nestedListLineOffset,
		textAfter: content.slice(endIdx).trim()
	};
}

/**
 * Convert a nested list found in item content.
 *
 * @param nestedListStr - The nested list LaTeX string
 * @param parentLevel - Nesting level of the parent list
 * @param context - Conversion context
 * @param startLine - The line number where this nested list starts (1-indexed)
 */
function convertNestedList(
	nestedListStr: string,
	parentLevel: number,
	context: ConversionContext,
	startLine: number
): string {
	// Parse the nested list string to extract environment name and content
	const match = nestedListStr.match(
		/\\begin\{(itemize|enumerate|description)\}([\s\S]*)\\end\{\1\}$/
	);

	if (!match) {
		return '';
	}

	const envName = match[1] as ListType;
	const envContent = match[2];

	const nestedToken: EnvironmentToken = {
		type: 'environment',
		name: envName,
		content: envContent,
		raw: nestedListStr,
		start: 0,
		end: nestedListStr.length,
		line: startLine,
		column: 1,
		depth: parentLevel + 1
	};

	const nestedContext: ConversionContext = {
		...context,
		indentLevel: parentLevel + 1,
		listStack: [...context.listStack, envName],
		inListItem: true
	};

	switch (envName) {
		case 'itemize':
			return convertItemize(nestedToken, nestedContext);
		case 'enumerate':
			return convertEnumerate(nestedToken, nestedContext);
		case 'description':
			return convertDescription(nestedToken, nestedContext);
		default:
			return '';
	}
}

// ===========================
// Main Converters
// ===========================

/**
 * Calculate the line number where the environment content starts.
 * Counts newlines in the opening tag (\begin{...}) to determine offset.
 */
function getContentStartLine(token: EnvironmentToken): number {
	// Find where content starts in the raw string
	const contentStart = token.raw.indexOf(token.content);
	if (contentStart === -1) {
		return token.line;
	}

	// Count newlines in the prefix (before content)
	const prefix = token.raw.substring(0, contentStart);
	const newlinesInPrefix = countNewlinesUpTo(prefix, prefix.length);

	return token.line + newlinesInPrefix;
}

/**
 * Convert itemize environment to Markdown unordered list.
 *
 * @example
 * \begin{itemize}
 *   \item First item
 *   \item Second item
 * \end{itemize}
 * ->
 * - First item
 * - Second item
 */
export function convertItemize(token: EnvironmentToken, context: ConversionContext): string {
	const items = parseListItems(token.content);
	const level = token.depth ?? context.indentLevel;
	const indent = getIndent(level);
	const contentStartLine = getContentStartLine(token);

	if (items.length === 0) {
		return '';
	}

	const lines: string[] = [];

	for (const item of items) {
		const { textBefore, nestedList, nestedListLineOffset, textAfter } = splitItemContent(
			item.content
		);
		// Calculate the line number for this item's content
		const itemStartLine = contentStartLine + (item.lineOffset ?? 0);

		// Process the text content (before nested list) as a single unit
		// to preserve multi-line math blocks like \[...\]
		if (textBefore) {
			const processedText = processItemText(textBefore.trim(), context, itemStartLine);
			// Split the result into lines for proper markdown formatting
			const resultLines = processedText.split('\n');
			for (let i = 0; i < resultLines.length; i++) {
				if (i === 0) {
					lines.push(`${indent}- ${resultLines[i]}`);
				} else {
					lines.push(`${indent}  ${resultLines[i]}`);
				}
			}
		} else {
			// Empty text before nested list - still output the bullet
			if (nestedList) {
				lines.push(`${indent}-`);
			}
		}

		// Handle nested list
		if (nestedList) {
			// Calculate the line where the nested list starts
			const nestedListStartLine = itemStartLine + nestedListLineOffset;
			const nestedResult = convertNestedList(nestedList, level, context, nestedListStartLine);
			if (nestedResult) {
				lines.push(nestedResult);
			}
		}

		// Handle text after nested list as a single unit
		if (textAfter) {
			const processedAfter = processItemText(textAfter.trim(), context, itemStartLine);
			const afterLines = processedAfter.split('\n');
			for (const afterLine of afterLines) {
				lines.push(`${indent}  ${afterLine}`);
			}
		}
	}

	return lines.join('\n');
}

/**
 * Convert enumerate environment to Markdown ordered list.
 *
 * @example
 * \begin{enumerate}
 *   \item First
 *   \item Second
 * \end{enumerate}
 * ->
 * 1. First
 * 2. Second
 */
export function convertEnumerate(token: EnvironmentToken, context: ConversionContext): string {
	const items = parseListItems(token.content);
	const level = token.depth ?? context.indentLevel;
	const indent = getIndent(level);
	const contentStartLine = getContentStartLine(token);

	if (items.length === 0) {
		return '';
	}

	const lines: string[] = [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const number = i + 1;
		const { textBefore, nestedList, nestedListLineOffset, textAfter } = splitItemContent(
			item.content
		);
		// Calculate the line number for this item's content
		const itemStartLine = contentStartLine + (item.lineOffset ?? 0);

		// Process the text content (before nested list) as a single unit
		// to preserve multi-line math blocks like \[...\]
		if (textBefore) {
			const processedText = processItemText(textBefore.trim(), context, itemStartLine);
			// Split the result into lines for proper markdown formatting
			const resultLines = processedText.split('\n');
			for (let j = 0; j < resultLines.length; j++) {
				if (j === 0) {
					lines.push(`${indent}${number}. ${resultLines[j]}`);
				} else {
					lines.push(`${indent}   ${resultLines[j]}`);
				}
			}
		} else {
			// Empty text before nested list
			if (nestedList) {
				lines.push(`${indent}${number}.`);
			}
		}

		// Handle nested list
		if (nestedList) {
			// Calculate the line where the nested list starts
			const nestedListStartLine = itemStartLine + nestedListLineOffset;
			const nestedResult = convertNestedList(nestedList, level, context, nestedListStartLine);
			if (nestedResult) {
				lines.push(nestedResult);
			}
		}

		// Handle text after nested list as a single unit
		if (textAfter) {
			const processedAfter = processItemText(textAfter.trim(), context, itemStartLine);
			const afterLines = processedAfter.split('\n');
			for (const afterLine of afterLines) {
				lines.push(`${indent}   ${afterLine}`);
			}
		}
	}

	return lines.join('\n');
}

/**
 * Convert description environment to Markdown.
 * Uses bold for terms and colon separator.
 *
 * @example
 * \begin{description}
 *   \item[Term] Definition
 *   \item[Another] Another definition
 * \end{description}
 * ->
 * **Term**: Definition
 * **Another**: Another definition
 */
export function convertDescription(token: EnvironmentToken, context: ConversionContext): string {
	const items = parseListItems(token.content);
	const level = token.depth ?? context.indentLevel;
	const indent = getIndent(level);
	const contentStartLine = getContentStartLine(token);

	if (items.length === 0) {
		return '';
	}

	const lines: string[] = [];

	for (const item of items) {
		const { textBefore, nestedList, nestedListLineOffset, textAfter } = splitItemContent(
			item.content
		);
		// Calculate the line number for this item's content
		const itemStartLine = contentStartLine + (item.lineOffset ?? 0);

		// Format term and definition
		const term = item.label ?? '';
		const rawDefinition = textBefore.trim();
		const definition = rawDefinition ? processItemText(rawDefinition, context, itemStartLine) : '';

		// Build the first line
		if (term) {
			if (definition) {
				lines.push(`${indent}**${term}**: ${definition}`);
			} else {
				lines.push(`${indent}**${term}**:`);
			}
		} else if (definition) {
			lines.push(`${indent}${definition}`);
		}

		// Handle nested list
		if (nestedList) {
			// Calculate the line where the nested list starts
			const nestedListStartLine = itemStartLine + nestedListLineOffset;
			const nestedResult = convertNestedList(nestedList, level, context, nestedListStartLine);
			if (nestedResult) {
				lines.push(nestedResult);
			}
		}

		// Handle text after nested list as a single unit
		if (textAfter) {
			const processedAfter = processItemText(textAfter.trim(), context, itemStartLine);
			const afterLines = processedAfter.split('\n');
			for (const afterLine of afterLines) {
				lines.push(`${indent}  ${afterLine}`);
			}
		}
	}

	return lines.join('\n');
}

// ===========================
// Environment Converter Registry
// ===========================

/**
 * Registry of list environment converters.
 */
export const listEnvironmentConverters = {
	itemize: convertItemize,
	enumerate: convertEnumerate,
	description: convertDescription
};

/**
 * Get the converter for a list environment.
 */
export function getListConverter(name: string): typeof convertItemize | undefined {
	return listEnvironmentConverters[name as keyof typeof listEnvironmentConverters];
}
