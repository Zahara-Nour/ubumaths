/**
 * Barre d'annotation du Deck : elle disparaît en quittant la diapositive annotable,
 * et le clavier doit continuer à piloter le diaporama.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { flushSync, tick } from 'svelte';
import AnnotationDeckHarness from './AnnotationDeckHarness.svelte';
import type { DeckContext } from '../types.js';

async function open() {
	let deck: DeckContext | undefined;
	const result = await render(AnnotationDeckHarness, {
		onprobe: (context: DeckContext) => {
			deck = context;
		}
	});
	flushSync();
	await tick();
	if (!deck) throw new Error('DeckContext non reçu');
	return { ...result, deck };
}

describe('barre d’annotation', () => {
	it('quitter la diapositive annotable depuis la barre : le clavier pilote toujours le diaporama', async () => {
		const { deck, container } = await open();
		const toggle = container.querySelector<HTMLButtonElement>(
			'button[title="Activer annotations"]'
		);
		expect(toggle).not.toBeNull();

		// Le professeur active puis désactive l'annotation : le focus reste sur le bouton
		await userEvent.click(toggle!);
		const untoggle = container.querySelector<HTMLButtonElement>(
			'button[title="Désactiver annotations"]'
		);
		await userEvent.click(untoggle!);

		// → quitte la diapositive annotable : la barre (et son bouton focalisé) disparaît
		await userEvent.keyboard('{ArrowRight}');
		flushSync();
		await tick();
		expect(deck.getIndices().h).toBe(1);
		expect(container.querySelector('button[title="Activer annotations"]')).toBeNull();
		expect(document.activeElement).toBe(container.querySelector('.deck-wrapper'));

		// Le → suivant doit encore avancer
		await userEvent.keyboard('{ArrowRight}');
		flushSync();
		await tick();
		expect(deck.getIndices().h).toBe(2);
	});

	it('la barre disparaît sans avoir eu le focus : un champ hors du diaporama le garde', async () => {
		const { deck, container } = await open();
		expect(container.querySelector('button[title="Activer annotations"]')).not.toBeNull();
		const field = container.querySelector<HTMLInputElement>('[data-testid="champ-hors-deck"]')!;
		field.focus();

		deck.next();
		flushSync();
		await tick();
		await Promise.resolve();

		expect(deck.getIndices().h).toBe(1);
		expect(container.querySelector('button[title="Activer annotations"]')).toBeNull();
		expect(document.activeElement).toBe(field);
	});
});
