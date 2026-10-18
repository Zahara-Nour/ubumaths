/**
 * Les cartes des objets de la figure (géométrie v2, lot 1, PR 1) : une carte
 * « d : y = 3x − 2 », « A = (1 ; 2) » (phase 0 `docs/wip/atelier-geometrie-phase0.md`,
 * C1 et P1), et la création par « + Point », « + Courbe ».
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

/** Ce que la tête de la carte donne à lire : nom, signe, définition (lecture d'écran). */
function headerText(card: HTMLElement): string {
	const name = card.querySelector('.nom')?.textContent?.trim() ?? '';
	const sign = card.querySelector('.signe')?.textContent?.trim() ?? '';
	const spoken = card.querySelector('.definition .sr-only')?.textContent?.trim() ?? '';
	return `${name} ${sign} ${spoken}`;
}

// =============================================================================
// Tests
// =============================================================================

describe('la carte d’un objet de la figure', () => {
	it('C1 : la courbe se lit « d : y = … », en écriture mathématique, type « courbe »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'd', definition: 'y = 3x - 2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'd');

		expect(card.querySelector('.signe')?.textContent?.trim()).toBe(':');
		expect(card.querySelector('.definition .ML__latex')).toBeTruthy();
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('courbe');
		// La lecture d'écran (MathLive) : « d : 'Y' equals 3 'X' minus 2 »
		expect(headerText(card)).toMatch(/^d : 'Y' equals/);
	});

	it('P1 : le point se lit « A = (1 ; 2) », type « point », sans œil de tracé', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'A');

		expect(card.querySelector('.signe')?.textContent?.trim()).toBe('=');
		expect(card.querySelector('.definition .ML__latex')).toBeTruthy();
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('point');
		// Un point ne va pas dans Graphe (G0) : pas de bouton « Tracer »
		expect(card.querySelector('.oeil')).toBeNull();
	});

	it('« + Point » et « + Courbe » créent les cartes A et d, à compléter', async () => {
		const atelier = new Atelier();
		const { container } = await render(WithAtelier, { atelier });
		const button = (label: string) =>
			[...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

		await userEvent.click(button('+ Point'));
		await userEvent.click(button('+ Courbe'));

		expect(atelier.get('A')?.kind).toBe('point');
		expect(atelier.get('d')?.kind).toBe('curve');
		expect(atelier.get('d')?.status).toBe('incomplete');
	});

	it('la carte d’une courbe se modifie : préfixe « d : », la frappe met à jour', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'd' });
		const { container } = await render(WithAtelier, { atelier });
		(cardFor(container, 'd').querySelector('.entete') as HTMLButtonElement).click();
		await vi.waitFor(() =>
			expect(cardFor(container, 'd').querySelector('math-field')).toBeTruthy()
		);
		const card = cardFor(container, 'd');
		const field = card.querySelector('math-field') as MathfieldElement;

		expect(card.querySelector('.prefixe')?.textContent?.replace(/\s+/g, '')).toBe('d:');
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		await userEvent.keyboard('y=2x');

		await vi.waitFor(() => expect(atelier.get('d')?.status).toBe('ok'));
		expect(atelier.get('d')?.kind).toBe('curve');
	});
});
