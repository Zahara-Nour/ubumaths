/**
 * Choice Shuffler
 * ===============
 *
 * Shuffles multiple choice options using Fisher-Yates algorithm
 * while preserving original indices for answer validation.
 *
 * @module questions/generator/choice-shuffler
 */

import type { ResolvedMarkdown } from '$lib/ubumark';
import { randomInt, type RandomSource } from '$lib/utils/random';

/**
 * Shuffled choice with original index
 */
export interface ShuffledChoice {
	content: ResolvedMarkdown; // Resolved markdown content for the choice
	originalIndex: number; // Original position before shuffling
}

/**
 * Shuffle choices using Fisher-Yates algorithm
 *
 * @param choices - Array of choices with resolved markdown content and isCorrect flags
 * @param random - Source de hasard de l'instance : le mélange la poursuit, il ne dépend donc
 *   pas que de la graine et du nombre de choix (Math.random par défaut)
 * @returns Array of shuffled choices with original indices
 *
 * @example
 * ```typescript
 * const choices = [
 *   { content: resolvedMarkdown('$$x = 5$$'), isCorrect: true },
 *   { content: resolvedMarkdown('$$x = 3$$'), isCorrect: false },
 *   { content: resolvedMarkdown('$$x = 7$$'), isCorrect: false }
 * ];
 *
 * const shuffled = shuffleChoices(choices);
 * // Returns:
 * // [
 * //   { content: '$$x = 3$$' as ResolvedMarkdown, originalIndex: 1 },
 * //   { content: '$$x = 5$$' as ResolvedMarkdown, originalIndex: 0 },
 * //   { content: '$$x = 7$$' as ResolvedMarkdown, originalIndex: 2 }
 * // ]
 * ```
 */
export function shuffleChoices(
	choices: { content: ResolvedMarkdown; isCorrect: boolean }[],
	random: RandomSource = Math.random
): ShuffledChoice[] {
	// Create array with original indices
	const indexed = choices.map((choice, index) => ({
		content: choice.content,
		originalIndex: index
	}));

	// Fisher-Yates shuffle
	for (let i = indexed.length - 1; i > 0; i--) {
		const j = randomInt(0, i, random);
		[indexed[i], indexed[j]] = [indexed[j], indexed[i]];
	}

	return indexed;
}
