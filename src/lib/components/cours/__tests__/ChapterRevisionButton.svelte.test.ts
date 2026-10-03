/**
 * Bouton « Réviser ce chapitre » (questions de cours, étape 3)
 * ===========================================================
 *
 * N1 : paquet non vide avec des questions à revoir → lien vers la séance, avec
 * le nombre. L3 : rien de dû ni de nouveau → « Rien à revoir aujourd'hui », pas
 * de séance vide. L4 : paquet vide (ou illisible) → rien du tout.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChapterRevisionButton from '../ChapterRevisionButton.svelte';

const CHAPTER = '0b0b0b0b-0000-4000-8000-000000000001';
const texte = (container: HTMLElement) => container.textContent!.replace(/\s+/g, ' ').trim();

describe('ChapterRevisionButton', () => {
	it('N1 : lien vers la séance du chapitre, avec le nombre à revoir', async () => {
		const { container } = await render(ChapterRevisionButton, {
			chapterId: CHAPTER,
			deck: { deckSize: 12, toReview: 7 }
		});
		const lien = container.querySelector('a');
		expect(lien?.getAttribute('href')).toBe(`/dashboard/revisions/chapitres/${CHAPTER}`);
		expect(texte(container)).toBe('Réviser ce chapitre (7 à revoir)');
	});

	it('L3 : rien à revoir → message, pas de lien', async () => {
		const { container } = await render(ChapterRevisionButton, {
			chapterId: CHAPTER,
			deck: { deckSize: 12, toReview: 0 }
		});
		expect(container.querySelector('a')).toBeNull();
		expect(texte(container)).toBe("Rien à revoir aujourd'hui");
	});

	it('L4 : paquet vide ou illisible → rien', async () => {
		for (const deck of [{ deckSize: 0, toReview: 0 }, null]) {
			const { container } = await render(ChapterRevisionButton, { chapterId: CHAPTER, deck });
			expect(texte(container)).toBe('');
		}
	});
});
