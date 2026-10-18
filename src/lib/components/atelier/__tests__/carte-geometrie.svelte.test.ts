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
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '$lib/atelier/calcul';

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

/**
 * Les « : » ou « = » VISIBLES seuls dans la tête de la carte (une ligne à eux) :
 * revue de la PR 2, la carte se lit comme celle d'une fonction — le nom, puis
 * l'équation ou les coordonnées. La lecture d'écran garde le signe.
 */
function isolatedSigns(card: HTMLElement): string[] {
	return (
		[...card.querySelectorAll('.entete *')]
			// Le « = » d'une équation composée par MathLive n'est pas un signe isolé
			.filter((el) => el.children.length === 0 && el.closest('.ML__latex') === null)
			.map((el) => ({ text: el.textContent?.trim() ?? '', box: el.getBoundingClientRect() }))
			.filter(({ text, box }) => (text === ':' || text === '=') && box.width > 1 && box.height > 1)
			.map(({ text }) => text)
	);
}

// =============================================================================
// Tests
// =============================================================================

describe('la carte d’un objet de la figure', () => {
	it('C1 : la courbe se lit « d : y = … », en écriture mathématique, nature « droite »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'd', definition: 'y = 3x - 2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'd');

		expect(isolatedSigns(card)).toEqual([]);
		expect(card.querySelector('.definition .ML__latex')).toBeTruthy();
		// PR 2 : la nature remplace le type « courbe » (C1)
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('droite');
		// La lecture d'écran (MathLive) : « d : 'Y' equals 3 'X' minus 2 »
		expect(headerText(card)).toMatch(/^d : 'Y' equals/);
	});

	it('C2 : C : x² + y² = 1 a la nature « cercle »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'C', definition: 'x^2 + y^2 = 1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'C').querySelector('.type')?.textContent?.trim()).toBe('cercle');
	});

	it('C6 : la carte d’une courbe vide constate « Aucun point ne vérifie cette équation. »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'C', definition: 'x^2 + y^2 = -1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'C');
		// Constaté, pas refusé : la courbe reste acceptée, sans badge d'erreur
		expect(card.textContent).toContain('Aucun point ne vérifie cette équation.');
		expect(card.querySelector('.etat')).toBeNull();
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('courbe');
	});

	it('P1 : le point se lit « A = (1 ; 2) », type « point », sans œil de tracé', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'A');

		expect(isolatedSigns(card)).toEqual([]);
		// La lecture d'écran garde « A = (1 ; 2) »
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
		// En édition, « d : » et le champ sont sur la même ligne
		const prefix = card.querySelector('.prefixe')!.getBoundingClientRect();
		const box = field.getBoundingClientRect();
		expect(prefix.bottom > box.top && prefix.top < box.bottom).toBe(true);
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		await userEvent.keyboard('y=2x');

		await vi.waitFor(() => expect(atelier.get('d')?.status).toBe('ok'));
		expect(atelier.get('d')?.kind).toBe('curve');
	});

	it('P1 : le rendu du point se lit (1 ; 2)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'A');

		// Mesuré (MathLive 0.111) : « Open paren. 1 semi-colon 2 Close paren. »
		expect(card.querySelector('.definition .sr-only')?.textContent?.trim()).toBe(
			'Open paren. 1 semi-colon 2 Close paren.'
		);
	});

	it('P3 : la carte d’un point se tape, (1;2) puis (1,5;2) → A(3/2 ; 2)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A' });
		const { container } = await render(WithAtelier, { atelier });
		(cardFor(container, 'A').querySelector('.entete') as HTMLButtonElement).click();
		await vi.waitFor(() =>
			expect(cardFor(container, 'A').querySelector('math-field')).toBeTruthy()
		);
		const field = cardFor(container, 'A').querySelector('math-field') as MathfieldElement;
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));

		await userEvent.keyboard('(1;2)');
		await vi.waitFor(() => expect(atelier.get('A')?.status).toBe('ok'));
		// Mesuré : MathLive écrit `\left(1;2\right)` pour `(1;2)` tapé
		expect(atelier.get('A')?.definition).toBe('\\left(1;2\\right)');

		await userEvent.keyboard('{Backspace}'.repeat(12));
		await userEvent.keyboard('(1,5;2)');
		// Mesuré : la virgule arrive nue, `\left(1,5;2\right)`
		await vi.waitFor(() => expect(atelier.get('A')?.definition).toBe('\\left(1,5;2\\right)'));
		expect(atelier.get('A')?.status).toBe('ok');
		const s = { atelier, engine: new WebReplEngine(), seed: () => 1 };
		const line = runInput(s, 'A');
		expect(line.kind === 'calcul' && line.output).toBe('A(3/2 ; 2)');
	});
});
