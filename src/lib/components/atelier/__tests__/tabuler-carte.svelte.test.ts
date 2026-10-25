/**
 * « Tabuler » depuis la carte d'une fonction (tableur intégré, lot 3, PR 2).
 *
 * Phase 0 `docs/archive/wip/atelier-tableur-lot3-phase0.md` §1 : un petit formulaire
 * « de / à / pas » dans la carte, pré-rempli (Q-L3-3) ; valider écrit le
 * tableau dans la grille et passe sur Données, colonnes sélectionnées
 * (Q-L3-1) ; un refus se dit sous le formulaire, rien n'est écrit.
 *
 * Lot 3 de la refonte de l'atelier : le formulaire s'ouvre dans une petite
 * fenêtre, depuis le menu de la carte (« Options de f » → « Tabuler »).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { chooseCardAction } from './harness/function-card';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

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

function field(dialog: HTMLElement, label: string): HTMLInputElement {
	const input = dialog.querySelector(`form.tabuler input[aria-label^="${label}"]`);
	if (!input) throw new Error(`pas de champ ${label}`);
	return input as HTMLInputElement;
}

/** La fenêtre de Tabuler ouverte, ou `null`. */
function tabulateDialog(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[role="dialog"]:has(form.tabuler)');
}

/** `f` dans un atelier, « Tabuler » choisi dans le menu de sa carte. */
async function openForm(atelier = withF()) {
	const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
	await chooseCardAction(container, 'f', 'Tabuler');
	const card = await vi.waitFor(() => {
		const dialog = tabulateDialog();
		expect(dialog).toBeTruthy();
		return dialog!;
	});
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

	it('un refus se dit dans la carte : rien n’est écrit, on reste sur la vue de départ', async () => {
		const { atelier, container, card } = await openForm();

		await userEvent.fill(field(card, 'Pas'), '0');
		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);

		// Le refus se dit dans la fenêtre, qui reste ouverte
		await vi.waitFor(() =>
			expect(card.querySelector('.refus')?.textContent).toContain('Le pas doit être positif.')
		);
		expect(tabulateDialog()).toBeTruthy();
		expect(atelier.cell(0, 1)).toBe('');
		expect(currentView(container)).toBe('Graphe');
	});

	it('Tabuler n’écrit aucune ligne dans la console', async () => {
		const { container, card } = await openForm();

		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);

		await vi.waitFor(() => expect(currentView(container)).toBe('Données'));
		expect(container.querySelectorAll('.historique li')).toHaveLength(0);
	});

	// Revue de la PR 2
	function tab(container: HTMLElement, label: string): HTMLButtonElement {
		return [...container.querySelectorAll('.onglet')].find((t) =>
			t.textContent?.trim().startsWith(label)
		) as HTMLButtonElement;
	}

	it('la zone du tableau n’est sélectionnée qu’une fois : pas au retour sur Données', async () => {
		const { container, card } = await openForm();
		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);
		await vi.waitFor(() => expect(currentView(container)).toBe('Données'));

		await userEvent.click(tab(container, 'Graphe'));
		await userEvent.click(tab(container, 'Données'));

		await vi.waitFor(() => expect(currentView(container)).toBe('Données'));
		const b5 = container.querySelector('td[role="gridcell"][data-cell="B5"]');
		expect(b5?.getAttribute('aria-selected')).toBe('false');
	});

	it('après un succès : formulaire refermé, focus dans la grille ; Entrée ne retabule pas', async () => {
		const { atelier, container, card } = await openForm();
		field(card, 'Pas').focus();
		await userEvent.keyboard('{Enter}');
		await vi.waitFor(() => expect(currentView(container)).toBe('Données'));

		await vi.waitFor(() =>
			expect((document.activeElement as HTMLElement | null)?.dataset.cell).toBe('A1')
		);
		expect(tabulateDialog()).toBeNull();
		expect(cardFor(container, 'f').querySelector('.tabuler-resultat')?.textContent).toContain(
			'colonnes A et B'
		);
		await userEvent.keyboard('{Enter}');
		expect(atelier.cell(2, 1)).toBe('');
	});

	it('refermer puis rouvrir la fenêtre : le refus s’efface, les champs repartent pré-remplis', async () => {
		const { container, card } = await openForm();
		await userEvent.fill(field(card, 'Début'), 'zz');
		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);
		await vi.waitFor(() => expect(card.querySelector('.refus')?.textContent).not.toBe(''));

		await userEvent.keyboard('{Escape}');
		await vi.waitFor(() => expect(tabulateDialog()).toBeNull());
		await chooseCardAction(container, 'f', 'Tabuler');

		const dialog = await vi.waitFor(() => {
			const found = tabulateDialog();
			expect(found).toBeTruthy();
			return found!;
		});
		expect(field(dialog, 'Début').value).toBe('-5');
		expect(dialog.querySelector('.refus')?.textContent).toBe('');
		expect(cardFor(container, 'f').querySelector('.tabuler-resultat')?.textContent).toBe('');
	});

	it('la phrase du résultat disparaît quand la grille a changé (Ctrl+Z)', async () => {
		const { atelier, container, card } = await openForm();
		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);
		await vi.waitFor(() => expect(atelier.cell(0, 1)).toBe('-5'));

		atelier.undo();

		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('.tabuler-resultat')?.textContent).toBe('')
		);
	});

	it('le résultat n’est annoncé qu’une fois (une seule région vivante)', async () => {
		const { container, card } = await openForm();
		await userEvent.click(card.querySelector('form.tabuler button[type="submit"]')!);
		await vi.waitFor(() => expect(currentView(container)).toBe('Données'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		const live = [...container.querySelectorAll('[role="status"], [aria-live]')].filter((el) =>
			el.textContent?.includes('colonnes A et B')
		);
		expect(live.length).toBe(1);
	});
});
