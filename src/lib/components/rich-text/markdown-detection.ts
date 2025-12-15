/**
 * Markdown Detection Utility
 * ==========================
 *
 * Detects whether a text string contains Markdown syntax patterns.
 * Used by the paste handler to determine if pasted content should
 * be converted from Markdown to rich text.
 *
 * @module rich-text/markdown-detection
 */

/**
 * Markdown syntax patterns to detect
 *
 * Each pattern has:
 * - regex: The pattern to match
 * - minMatches: Minimum matches required (default 1)
 * - weight: How confident we are this indicates Markdown (1-3)
 */
const MARKDOWN_PATTERNS = [
	// Headings: # Title, ## Title, etc.
	{ regex: /^#{1,6}\s+.+$/m, weight: 3 },

	// Bold: **text** or __text__ - strong indicators of Markdown
	{ regex: /\*\*[^*]+\*\*/, weight: 3 },
	{ regex: /__[^_]+__/, weight: 3 },

	// Italic: *text* - clear Markdown pattern
	{ regex: /(?<!\*)\*[^*\n]+\*(?!\*)/, weight: 3 },

	// Code inline: `code`
	{ regex: /`[^`\n]+`/, weight: 3 },

	// Code block: ```...```
	{ regex: /```[\s\S]*?```/, weight: 3 },

	// Unordered list: - item or * item (at start of line)
	{ regex: /^[-*]\s+.+$/m, weight: 3 },

	// Ordered list: 1. item (at start of line)
	{ regex: /^\d+\.\s+.+$/m, weight: 3 },

	// Blockquote: > text
	{ regex: /^>\s+.+$/m, weight: 3 },

	// Horizontal rule: --- or ***
	{ regex: /^[-*]{3,}$/m, weight: 2 },

	// Links: [text](url)
	{ regex: /\[.+?\]\(.+?\)/, weight: 3 },

	// Images: ![alt](url)
	{ regex: /!\[.*?\]\(.+?\)/, weight: 3 },

	// Math inline (LaTeX): $...$
	{ regex: /\$[^$\n]+\$/, weight: 3 },

	// Math inline (custom): ~...~ (Ubumaths specific)
	{ regex: /~[^~\n]+~/, weight: 3 },

	// Math block: $$...$$ or ~~...~~
	{ regex: /\$\$[\s\S]+?\$\$/, weight: 3 },
	{ regex: /~~[\s\S]+?~~/, weight: 3 },

	// Template variables: {{var}}
	{ regex: /\{\{[^}]+\}\}/, weight: 3 },

	// Hashtags: #tag (but not at start of line which could be heading)
	{ regex: /(?<=\s)#[a-zA-Z][a-zA-Z0-9_-]*/, weight: 2 },

	// Mentions: @username
	{ regex: /@[a-zA-Z][a-zA-Z0-9_.]*/, weight: 2 },

	// Tables: | cell | cell |
	{ regex: /^\|.+\|$/m, weight: 3 }
] as const;

/**
 * Score threshold for considering text as Markdown
 * Lower values = more aggressive detection
 * Higher values = more conservative (requires more patterns)
 */
const MARKDOWN_THRESHOLD = 3;

/**
 * Check if text looks like HTML content
 *
 * If the content appears to be HTML (from a rich text copy), we should
 * let TipTap handle it natively rather than treating it as Markdown.
 */
export function isHtmlContent(text: string): boolean {
	// Check for common HTML tags
	const htmlPatterns = [
		/<[a-z][a-z0-9]*[^>]*>/i, // Opening tags
		/<\/[a-z][a-z0-9]*>/i, // Closing tags
		/<!DOCTYPE/i, // DOCTYPE declaration
		/<html/i, // HTML tag
		/<body/i, // Body tag
		/<div/i, // Common div
		/<span/i, // Common span
		/<p>/i, // Paragraph tag
		/<br\s*\/?>/i // Line break
	];

	return htmlPatterns.some((pattern) => pattern.test(text));
}

/**
 * Calculate a "Markdown likelihood" score for the given text
 *
 * Returns a score based on how many Markdown patterns are detected
 * and their weights. Higher scores indicate more likely Markdown.
 */
export function calculateMarkdownScore(text: string): number {
	let score = 0;

	for (const pattern of MARKDOWN_PATTERNS) {
		if (pattern.regex.test(text)) {
			score += pattern.weight;
		}
	}

	return score;
}

/**
 * Detect if text appears to contain Markdown syntax
 *
 * This function checks for common Markdown patterns and returns true
 * if the text likely contains intentional Markdown formatting.
 *
 * @param text - The text to analyze
 * @returns true if the text appears to contain Markdown syntax
 *
 * @example
 * containsMarkdownSyntax('Hello **world**') // true
 * containsMarkdownSyntax('Hello world') // false
 * containsMarkdownSyntax('# Title\n\nParagraph') // true
 */
export function containsMarkdownSyntax(text: string): boolean {
	// Early exit for empty or very short text
	if (!text || text.length < 2) {
		return false;
	}

	// If it looks like HTML, don't treat as Markdown
	if (isHtmlContent(text)) {
		return false;
	}

	// Calculate the Markdown score
	const score = calculateMarkdownScore(text);

	return score >= MARKDOWN_THRESHOLD;
}

/**
 * Get detailed information about Markdown patterns found in text
 *
 * Useful for debugging and understanding what triggered detection.
 *
 * @param text - The text to analyze
 * @returns Array of pattern descriptions that were found
 */
export function getDetectedPatterns(text: string): string[] {
	const detected: string[] = [];

	const patternNames = [
		'heading',
		'bold (**)',
		'bold (__)',
		'italic (*)',
		'code inline',
		'code block',
		'unordered list',
		'ordered list',
		'blockquote',
		'horizontal rule',
		'link',
		'image',
		'math inline ($)',
		'math inline (~)',
		'math block ($$)',
		'math block (~~)',
		'template',
		'hashtag',
		'mention',
		'table'
	];

	MARKDOWN_PATTERNS.forEach((pattern, index) => {
		if (pattern.regex.test(text)) {
			detected.push(patternNames[index]);
		}
	});

	return detected;
}
