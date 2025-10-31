/**
 * Choice Shuffler
 * ===============
 *
 * Shuffles multiple choice options using Fisher-Yates algorithm
 * while preserving original indices for answer validation.
 *
 * @module questions/generator/choice-shuffler
 */

import type { ContentField } from '../types';
import { randomInt } from '$lib/utils/random';

/**
 * Shuffled choice with original index
 */
export interface ShuffledChoice {
	content: ContentField;
	originalIndex: number;
}

/**
 * Shuffle choices using Fisher-Yates algorithm
 *
 * @param choices - Array of choices with content and isCorrect flags
 * @param seed - Optional seed for reproducible shuffling
 * @returns Array of shuffled choices with original indices
 *
 * @example
 * ```typescript
 * const choices = [
 *   { content: { type: 'text', content: 'A' }, isCorrect: true },
 *   { content: { type: 'text', content: 'B' }, isCorrect: false },
 *   { content: { type: 'text', content: 'C' }, isCorrect: false }
 * ];
 *
 * const shuffled = shuffleChoices(choices);
 * // Returns:
 * // [
 * //   { content: { type: 'text', content: 'B' }, originalIndex: 1 },
 * //   { content: { type: 'text', content: 'A' }, originalIndex: 0 },
 * //   { content: { type: 'text', content: 'C' }, originalIndex: 2 }
 * // ]
 * ```
 */
export function shuffleChoices(
	choices: { content: ContentField; isCorrect: boolean }[],
	seed?: number
): ShuffledChoice[] {
	// Create array with original indices
	const indexed = choices.map((choice, index) => ({
		content: choice.content,
		originalIndex: index
	}));

	// Fisher-Yates shuffle
	for (let i = indexed.length - 1; i > 0; i--) {
		const j = randomInt(0, i, seed ? seed + i : undefined);
		[indexed[i], indexed[j]] = [indexed[j], indexed[i]];
	}

	return indexed;
}
