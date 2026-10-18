/**
 * Le champ de définition d'une carte laisse lire toute la définition.
 *
 * Constat de la session de la géométrie (Chromium, 1 280 px, panneau « Mes
 * objets » à sa largeur par défaut), après le lot 4b : dans la carte d'une
 * construction, la pastille, le nom, le lien, `=`, la nature et ⋮ prenaient la
 * ligne, et le champ ne montrait que « cer » pour `cercle(O ; 3)`. La nature
 * passe sous la ligne ; le champ prend toute la largeur restante.
 *
 * Asserte le RENDU : la largeur visible du champ contre celle de son contenu.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { INPUT_MODE_KEY } from '$lib/atelier/input-mode';
import { CALC_HISTORY_STORAGE_KEY } from '$lib/atelier/history-storage';

// =============================================================================
// Décor
// =============================================================================

const ATELIER_KEY = 'chiphre-atelier';

function forget() {
	for (const key of [INPUT_MODE_KEY, CALC_HISTORY_STORAGE_KEY, ATELIER_KEY]) {
		localStorage.removeItem(key);
	}
}

afterEach(() => {
	cleanup();
	forget();
});

/** Une figure construite, une fonction et une suite longues, une valeur, une liste. */
function busyAtelier(): Atelier {
	const atelier = new Atelier();
	const objects: [
		kind: 'point' | 'curve' | 'function' | 'value' | 'sequence' | 'list',
		name: string,
		definition: string
	][] = [
		['point', 'O', '(0 ; 0)'],
		['point', 'A', '(0 ; 1)'],
		['point', 'B', '(2 ; 3)'],
		['curve', 'c', 'cercle(O ; 3)'],
		['curve', 'd', '(AB)'],
		['point', 'I', 'intersection(d ; c ; 2)'],
		['function', 'f', 'x^3-2x^2+5x-7'],
		['value', 'k', '12.5'],
		['sequence', 'u', '3n^2-2n+1'],
		['list', 'L', '{3 ; 5 ; 8 ; 13 ; 21 ; 34 ; 55}']
	];
	for (const [kind, name, definition] of objects) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} : ${done.message}`);
	}
	return atelier;
}

async function mount(width: number) {
	forget();
	await page.viewport(width, 900);
	const view = await render(AtelierContainer, { atelier: busyAtelier(), ephemeral: true });
	await vi.waitFor(() => expect(view.container.querySelectorAll('article.objet').length).toBe(10));
	return view.container;
}

/** La carte d'un objet, par le nom qu'elle affiche. */
function cardOf(container: HTMLElement, name: string): HTMLElement {
	for (const card of container.querySelectorAll<HTMLElement>('article.objet')) {
		if (card.querySelector('.nom')?.textContent?.trim() === name) return card;
	}
	throw new Error(`pas de carte ${name}`);
}

/** Le contenu du champ MathLive : sa largeur utile et sa largeur visible. */
function fieldWidths(card: HTMLElement): { content: number; visible: number } {
	const field = card.querySelector<MathfieldElement>('math-field');
	if (!field) throw new Error('pas de champ');
	const content = field.shadowRoot?.querySelector<HTMLElement>('[part="content"]');
	if (!content) throw new Error('pas de contenu MathLive');
	return { content: content.scrollWidth, visible: content.clientWidth };
}

// =============================================================================
// Tests
// =============================================================================

describe.each([1280, 390])('panneau « Mes objets » à %i px', (width) => {
	it.each(['c', 'd', 'I', 'f', 'u'])('la définition de %s se lit en entier', async (name) => {
		const container = await mount(width);
		const card = cardOf(container, name);
		// MathLive compose le champ après le montage : attendre sa définition
		// rendue, puis mesurer UNE fois (une attente qui réessaie passerait sur
		// un instant où rien n'est encore composé)
		await vi.waitFor(() => expect(fieldWidths(card).content).toBeGreaterThan(30));
		await new Promise((resolve) => requestAnimationFrame(resolve));
		const { content, visible } = fieldWidths(card);
		expect(content).toBeLessThanOrEqual(visible);
	});

	it('la nature d’une construction est sous la ligne, pas dans la ligne', async () => {
		const container = await mount(width);
		const card = cardOf(container, 'c');
		expect(card.querySelector('.ligne .type')).toBeNull();
		expect(card.querySelector('.dessous .type')?.textContent?.trim()).toBe('cercle');
	});

	it('aucune carte ne déborde de sa largeur', async () => {
		const container = await mount(width);
		for (const card of container.querySelectorAll<HTMLElement>('article.objet')) {
			const line = card.querySelector<HTMLElement>('.ligne') ?? card;
			expect(line.scrollWidth, card.textContent ?? '').toBeLessThanOrEqual(line.clientWidth + 1);
		}
	});
});
