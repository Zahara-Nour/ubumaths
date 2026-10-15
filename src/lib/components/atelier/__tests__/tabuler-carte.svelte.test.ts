/**
 * « Tabuler » depuis la carte d'une fonction (tableur intégré, lot 3, PR 2).
 *
 * Phase 0 `docs/wip/atelier-tableur-lot3-phase0.md` §1 : un petit formulaire
 * « de / à / pas » dans la carte, pré-rempli (Q-L3-3) ; valider écrit le
 * tableau dans la grille et passe sur Données, colonnes sélectionnées
 * (Q-L3-1) ; un refus se dit sous le formulaire, rien n'est écrit.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

function currentView(container: HTMLElement): string {
	return container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim() ?? '';
}

function field(card: HTMLElement, label: string): HTMLInputElement {
	const input = card.querySelector(`form.tabuler input[aria-label^="${label}"]`);
	if (!input) throw new Error(`pas de champ ${label}`);
	return input as HTMLInputElement;
}

/** `f` dans un atelier ouvert sur Calcul, sa carte ouverte, « Tabuler » cliqué. */
async function openForm(atelier = withF()) {
	const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
	(cardFor(container, 'f').querySelector('.entete') as HTMLButtonElement).click();
	const button = await vi.waitFor(() => {
		const found = [...cardFor(container, 'f').querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Tabuler'
		) as HTMLButtonElement | undefined;
		expect(found).toBeTruthy();
		return found!;
	});
	await userEvent.click(button);
	const card = cardFor(container, 'f');
	await vi.waitFor(() => expect(card.querySelector('form.tabuler')).toBeTruthy());
	return { atelier, container, card };
}

function withF(extra: { interval?: string } = {}) {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x', ...extra }, 'text');
	return atelier;
}

describe('Tabuler depuis la carte', () => {
	it('le formulaire est pré-rempli : de −5 à 5, pas 1 (Q-L3-3)', async () => {
		const { card } = await openForm();

		expect(field(card, 'Début').value).toBe('-5');
		expect(field(card, 'Fin').value).toBe('5');
		expect(field(card, 'Pas').value).toBe('1');
	});

	it('une fonction sur un intervalle fermé : ses bornes', async () => {
		const { card } = await openForm(withF({ interval: '[0;3]' }));

		expect(field(card, 'Début').value).toBe('0');
		expect(field(card, 'Fin').value).toBe('3');
	});

	it('valider écrit le tableau, passe sur Données, colonnes sélectionnées (Q-L3-1)', async () => {
		const { atelier, container, card } = await openForm();

		await userEvent.fill(field(card, 'Début'), '-2');
		await userEvent.fill(field(card, 'Fin'), '3');
		await userEvent.fill(field(card, 'Pas'), '0,5');
		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);

		await vi.waitFor(() => expect(currentView(container)).toBe('Données'));
		expect(atelier.cell(0, 2)).toBe('=A1+0,5');
		expect(atelier.cell(1, 11)).toBe('=f(A11)');
		expect(cardFor(container, 'f').querySelector('.tabuler-resultat')?.textContent).toContain(
			'Tableau de f écrit dans la grille, colonnes A et B (11 lignes).'
		);
		const cellAt = (name: string) =>
			container.querySelector(`td[role="gridcell"][data-cell="${name}"]`);
		await vi.waitFor(() => expect(cellAt('A1')?.getAttribute('aria-selected')).toBe('true'));
		expect(cellAt('B11')?.getAttribute('aria-selected')).toBe('true');
		expect(cellAt('A2')?.textContent).toContain('-1,5');
	});

	it('Entrée dans un champ valide aussi (clavier)', async () => {
		const { atelier, card } = await openForm();

		field(card, 'Pas').focus();
		await userEvent.keyboard('{Enter}');

		await vi.waitFor(() => expect(atelier.cell(0, 1)).toBe('-5'));
	});

	it('un refus se dit dans la carte : rien n’est écrit, on reste dans Calcul', async () => {
		const { atelier, container, card } = await openForm();

		await userEvent.fill(field(card, 'Pas'), '0');
		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);

		await vi.waitFor(() =>
			expect(card.querySelector('.tabuler-resultat')?.textContent).toContain(
				'Le pas doit être positif.'
			)
		);
		expect(atelier.cell(0, 1)).toBe('');
		expect(currentView(container)).toBe('Calcul');
	});

	it('Tabuler n’écrit aucune ligne dans Calcul', async () => {
		const { container, card } = await openForm();

		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);

		await vi.waitFor(() => expect(currentView(container)).toBe('Données'));
		const calcul = [...container.querySelectorAll('.onglet')].find((t) =>
			t.textContent?.trim().startsWith('Calcul')
		);
		expect(calcul?.textContent?.trim()).toBe('Calcul');
	});
});
