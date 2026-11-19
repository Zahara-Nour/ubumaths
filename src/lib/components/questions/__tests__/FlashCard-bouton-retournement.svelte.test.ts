import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import type { QuestionInstance } from '#lib/questions/types.ts';
import { resolvedMarkdown } from '#lib/ubumark/index.ts';

/**
 * Relecture des cartes de cours (David, 2026-11-11, carte A1 de `cours-suites`) :
 * au verso, le bouton de retournement recouvrait la fin du texte. La place sous
 * la dernière ligne n'était réservée que pour une carte à hauteur imposée.
 */
describe('FlashCard — le bouton de retournement ne recouvre pas le texte', () => {
	function carteDeCours(): QuestionInstance {
		const verso = Array.from({ length: 6 }, (_, i) => `Ligne ${i + 1} de la correction.`).join(
			'\n\n'
		);
		return {
			templateId: 'test',
			statement: resolvedMarkdown('Énoncer la définition.'),
			correction: { steps: [resolvedMarkdown(verso)] },
			options: { courseCard: true },
			grades: ['1spe'],
			level: 1,
			generatedAt: new Date().toISOString()
		} as unknown as QuestionInstance;
	}

	function chevauche(a: DOMRect, b: DOMRect): boolean {
		return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
	}

	it('au verso, sans hauteur imposée, la dernière ligne reste visible', async () => {
		const { container } = await render(FlashCard, {
			instance: carteDeCours(),
			startFlipped: true
		});

		const selecteur = '[aria-label="Retour à la question"]';
		await expect.poll(() => container.querySelector(selecteur)).not.toBeNull();
		await new Promise((r) => setTimeout(r, 300));
		const bouton = container.querySelector<HTMLElement>(selecteur) as HTMLElement;

		const lignes = [...container.querySelectorAll('p')].filter((p) =>
			p.textContent?.includes('de la correction.')
		);
		expect(lignes.length).toBeGreaterThan(0);
		const derniere = lignes[lignes.length - 1].getBoundingClientRect();
		// Pire cas : le texte occupe toute la largeur de la carte
		const carte = (bouton.parentElement as HTMLElement).getBoundingClientRect();
		const ligneLarge = new DOMRect(carte.left, derniere.top, carte.width, derniere.height);
		expect(chevauche(ligneLarge, bouton.getBoundingClientRect())).toBe(false);
	});
});
