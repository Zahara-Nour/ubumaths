/**
 * Profanity Filter
 * =================
 *
 * Server-side profanity detection and filtering for chat messages.
 * Uses the bad-words library with custom French profanity list.
 */

import { Filter } from 'bad-words';

// Initialize filter
const filter = new Filter();

// Add common French profanity
// Note: This is a basic list. For production, consider using a more comprehensive French profanity database
const frenchProfanity = [
	'merde',
	'putain',
	'connard',
	'connasse',
	'salope',
	'salaud',
	'enculé',
	'enculer',
	'bordel',
	'chier',
	'con',
	'conne',
	'pute',
	'pd',
	'tapette',
	'fils de pute',
	'ta gueule',
	'ferme ta gueule',
	'nique',
	'niquer',
	'foutre',
	'foutu',
	'bâtard',
	'cul',
	'bite',
	'couilles'
];

filter.addWords(...frenchProfanity);

export interface ProfanityCheckResult {
	isProfane: boolean;
	cleanedText: string;
	matchedWords: string[];
}

/**
 * Check if text contains profanity
 *
 * @param text - Text to check
 * @returns Profanity check result
 */
export function checkProfanity(text: string): ProfanityCheckResult {
	if (!text || text.trim() === '') {
		return {
			isProfane: false,
			cleanedText: text,
			matchedWords: []
		};
	}

	const isProfane = filter.isProfane(text);
	const cleanedText = filter.clean(text);

	// Extract matched words by comparing original and cleaned text
	const matchedWords: string[] = [];
	if (isProfane) {
		// Split text into words and check each one
		const words = text.toLowerCase().split(/\s+/);
		words.forEach((word) => {
			if (filter.isProfane(word)) {
				matchedWords.push(word);
			}
		});
	}

	return {
		isProfane,
		cleanedText,
		matchedWords: [...new Set(matchedWords)] // Remove duplicates
	};
}

/**
 * Clean text by replacing profanity with asterisks
 *
 * @param text - Text to clean
 * @returns Cleaned text
 */
export function cleanProfanity(text: string): string {
	return filter.clean(text);
}

/**
 * Add custom words to the profanity filter
 *
 * @param words - Array of words to add
 */
export function addCustomProfanity(words: string[]): void {
	filter.addWords(...words);
}

/**
 * Remove words from the profanity filter (whitelist)
 *
 * @param words - Array of words to remove
 */
export function removeFromProfanity(words: string[]): void {
	filter.removeWords(...words);
}

/**
 * Extract plain text from TipTap JSON content for profanity checking
 *
 * @param content - TipTap JSON content
 * @returns Plain text string
 */
export function extractTextFromTipTap(content: unknown): string {
	if (!content || typeof content !== 'object') {
		return '';
	}

	let text = '';

	function traverse(node: Record<string, unknown>): void {
		if (!node) return;

		// If node is a text node, append its text
		if (node.type === 'text' && node.text) {
			text += node.text + ' ';
		}

		// Recursively traverse child nodes
		if (node.content && Array.isArray(node.content)) {
			node.content.forEach(traverse);
		}
	}

	traverse(content as Record<string, unknown>);

	return text.trim();
}

/**
 * Check profanity in TipTap JSON content
 *
 * @param content - TipTap JSON content
 * @returns Profanity check result
 */
export function checkTipTapProfanity(content: unknown): ProfanityCheckResult {
	const plainText = extractTextFromTipTap(content);
	return checkProfanity(plainText);
}
