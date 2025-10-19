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
    const j = seededRandomInt(0, i, seed ? seed + i : undefined);
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  return indexed;
}

/**
 * Seeded random integer between min and max (inclusive)
 */
function seededRandomInt(min: number, max: number, seed?: number): number {
  const random = seed !== undefined ? seededRandom(seed) : Math.random();
  return Math.floor(random * (max - min + 1)) + min;
}

/**
 * Seeded pseudo-random number generator
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
