/**
 * `chapterIdOf` — une ligne de modèle lue comme une ligne de chapitre se voit
 * ===========================================================================
 *
 * ADR 0029 : une ligne de contenu appartient à un chapitre OU à un modèle
 * (`chapter_id` vide). Les convertisseurs de chapitre ne doivent jamais
 * fabriquer un chapitre « null » en silence.
 */

import { describe, it, expect } from 'vitest';
import { chapterIdOf } from '../chapters';

describe('chapterIdOf', () => {
	it('rend le chapitre d’une ligne de chapitre', () => {
		expect(chapterIdOf({ id: 'l1', chapter_id: 'c1' })).toBe('c1');
	});

	it('refuse une ligne de modèle, en la nommant', () => {
		expect(() => chapterIdOf({ id: 'l2', chapter_id: null })).toThrow(/l2.*modèle/);
	});
});
