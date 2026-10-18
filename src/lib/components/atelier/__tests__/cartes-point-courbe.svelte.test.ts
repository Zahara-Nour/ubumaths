/**
 * Lot 4b de la refonte de l'atelier : les cartes d'un POINT et d'une COURBE
 * (`docs/wip/atelier-refonte-interface-phase0.md`, lot 4, validé par David le
 * 2026-10-18, précisé avec la session de la géométrie).
 *
 * La grammaire de la carte de fonction (lot 3) : une ligne `● nom = [champ]`
 * (`d : [équation]` pour une courbe par équation), rangée à Entrée ou à la
 * sortie du champ ; la nature en étiquette discrète ; ce que vaut une
 * CONSTRUCTION en gris dessous ; le point de couleur ouvre couleur et taille
 * (point) ou couleur et trait (courbe) ; un menu Affichage / Actions.
 *
 * Asserte le RENDU.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isCurve, isPoint } from '$lib/atelier/types';
import { cardOf, menuItemOf, openCardMenu } from './harness/function-card';

// =============================================================================
// Décor
// =============================================================================

/** A(0 ; 1), B(1 ; 3), puis les objets demandés. */
function figureWith(objects: [kind: 'point' | 'curve', name: string, definition: string][] = []) {
	const atelier = new Atelier();
	atelier.create({ kind: 'point', name: 'A', definition: '(0 ; 1)' }, 'text');
	atelier.create({ kind: 'point', name: 'B', definition: '(1 ; 3)' }, 'text');
	for (const [kind, name, definition] of objects) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(done.message);
	}
	return atelier;
}

function fieldOf(card: HTMLElement): MathfieldElement {
	const field = card.querySelector('math-field');
	if (!field) throw new Error('pas de champ');
	return field as MathfieldElement;
}

/** Le signe visible entre le nom et le champ. */
function signOf(card: HTMLElement): string {
	return card.querySelector('.egal')?.textContent?.trim() ?? '';
}

/** Ce que la carte dit de la valeur d'une construction, en clair. */
function valueText(card: HTMLElement): string {
	return card.querySelector('.valeur .sr-only')?.textContent?.trim() ?? '';
}

/** Les libellés des éléments d'un menu ouvert. */
function labelsOf(menu: HTMLElement): string[] {
	return [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].map((el) =>
		(el.querySelector('.item > span')?.textContent ?? el.textContent ?? '').trim()
	);
}

/** Ouvrir la fenêtre du point de couleur ; rend la fenêtre. */
async function openStyle(card: HTMLElement, label: string): Promise<HTMLElement> {
	const button = card.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
	if (!button) throw new Error(`pas de bouton « ${label} »`);
	await userEvent.click(button);
	return vi.waitFor(() => {
		const dialog = document.querySelector<HTMLElement>('[data-popover-content], [role="dialog"]');
		expect(dialog).toBeTruthy();
		return dialog!;
	});
}

// =============================================================================
// Le point
// =============================================================================

describe('la carte d’un point', () => {
	it('A = [(0 ; 1)] sur une ligne : champ éditable, nature, ni ligne grise ni œil', async () => {
		const atelier = figureWith();
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'A');
		expect(signOf(card)).toBe('=');
		expect(fieldOf(card).getAttribute('aria-label')).toBe('Définition de A');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('point');
		// Un point par coordonnées : pas de valeur en gris, il la montre déjà
		expect(card.querySelector('.valeur')).toBeNull();
		// G0 : un point ne va pas dans Graphe
		expect(card.querySelector('button[aria-label^="Tracer"]')).toBeNull();
		expect(card.querySelector('button[aria-label="Options de A"]')).toBeTruthy();
	});

	it('la définition se range à Entrée, jamais à la frappe', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const field = fieldOf(cardOf(container, 'A'));

		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		field.executeCommand('selectAll');
		await userEvent.keyboard('(1;5)');
		// Plus que les 0,3 s de l'ancien rangement à la frappe : rien n'a bougé
		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(atelier.get('A')?.definition).toBe('(1 ; 2)');

		await userEvent.keyboard('{Enter}');
		// Mesuré : MathLive écrit `\left(1;5\right)` pour `(1;5)` tapé
		await vi.waitFor(() => expect(atelier.get('A')?.definition).toBe('\\left(1;5\\right)'));
	});

	it('I = [milieu(A, B)] : ses coordonnées exactes en gris, et ce qu’il suit', async () => {
		const atelier = figureWith([['point', 'I', 'milieu(A, B)']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'I');
		expect(signOf(card)).toBe('=');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('point');
		expect(valueText(card)).toBe('I(1/2 ; 2)');
		// Un objet qui dépend d'un autre porte l'icône de lien (lot 3)
		const link = card.querySelector<HTMLButtonElement>('button.lien');
		expect(link?.getAttribute('aria-label')).toMatch(/A.*B/);
	});

	it('une construction en attente le dit, avec sa raison, sans valeur', async () => {
		const atelier = figureWith([['point', 'I', 'milieu(A, Z)']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'I');
		expect(card.querySelector('.etat')?.textContent?.trim()).toBe('en attente');
		expect(card.querySelector('.valeur')).toBeNull();
		expect(card.querySelector('.message')?.textContent ?? '').not.toBe('');
	});

	it('menu : Affichage « Étiquette » (cochée), Actions Renommer et Supprimer', async () => {
		const atelier = figureWith();
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'A');

		expect(labelsOf(menu)).toEqual(['Étiquette', 'Renommer', 'Supprimer']);
		expect(menuItemOf(menu, 'Étiquette').getAttribute('aria-checked')).toBe('true');
	});

	it('décocher « Étiquette » masque le nom du point dans la figure', async () => {
		const atelier = figureWith();
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'A');
		menuItemOf(menu, 'Étiquette').click();

		await vi.waitFor(() => {
			const a = atelier.get('A');
			expect(a && isPoint(a) && a.display?.showLabel).toBe(false);
		});
	});

	it('le point de couleur ouvre couleur et taille, rangées dans l’atelier', async () => {
		const atelier = figureWith();
		const { container } = await render(WithAtelier, { atelier });

		const dialog = await openStyle(cardOf(container, 'A'), 'Couleur et taille de A');
		const colors = dialog.querySelector('[role="radiogroup"][aria-label="Couleur du point"]');
		const sizes = dialog.querySelector('[role="radiogroup"][aria-label="Taille du point"]');
		expect(colors).toBeTruthy();
		expect(sizes).toBeTruthy();

		(sizes!.querySelector('button[aria-label="Grande"]') as HTMLButtonElement).click();
		await vi.waitFor(() => {
			const a = atelier.get('A');
			expect(a && isPoint(a) && a.display?.size).toBe('large');
		});
		(colors!.querySelectorAll('button[role="radio"]')[2] as HTMLButtonElement).click();
		await vi.waitFor(() => {
			const a = atelier.get('A');
			expect(a && isPoint(a) && a.display?.color).toBe('curve-3');
		});
		// La taille choisie est cochée
		expect(dialog.querySelector('button[aria-label="Grande"]')?.getAttribute('aria-checked')).toBe(
			'true'
		);
	});
});

// =============================================================================
// La courbe
// =============================================================================

describe('la carte d’une courbe', () => {
	it('d : [y = 3x − 2] : « : » d’une équation, nature « droite », pas de ligne grise', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'd', definition: 'y = 3x - 2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'd');
		expect(signOf(card)).toBe(':');
		expect(fieldOf(card).getAttribute('aria-label')).toBe('Définition de d');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('droite');
		expect(card.querySelector('.valeur')).toBeNull();
	});

	it('d = [(AB)] : « = » d’une construction, nature et équation réduite en gris', async () => {
		const atelier = figureWith([['curve', 'd', '(AB)']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'd');
		expect(signOf(card)).toBe('=');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('droite');
		expect(valueText(card)).toBe('y = 2x + 1');
	});

	it('s = [[AB]] : nature « segment », sa longueur', async () => {
		const atelier = figureWith([['curve', 's', '[AB]']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 's');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('segment');
		expect(valueText(card)).toBe('longueur √5');
	});

	it('C6 : une courbe vide le constate, sans badge d’erreur', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'C', definition: 'x^2 + y^2 = -1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'C');
		expect(card.textContent).toContain('Aucun point ne vérifie cette équation.');
		expect(card.querySelector('.etat')).toBeNull();
	});

	it('menu : pas d’Affichage, Actions Renommer et Supprimer', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'd', definition: 'y = x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'd');

		expect(labelsOf(menu)).toEqual(['Renommer', 'Supprimer']);
	});

	it('le point de couleur ouvre couleur, épaisseur et style du trait', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'd', definition: 'y = x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const dialog = await openStyle(cardOf(container, 'd'), 'Couleur et trait de d');
		expect(dialog.querySelector('[aria-label="Couleur de la courbe"]')).toBeTruthy();
		expect(dialog.querySelector('[aria-label="Épaisseur du trait"]')).toBeTruthy();
		(
			dialog.querySelector(
				'[aria-label="Style du trait"] button[aria-label="Tirets"]'
			) as HTMLButtonElement
		).click();

		await vi.waitFor(() => {
			const d = atelier.get('d');
			expect(d && isCurve(d) && d.display?.lineStyle).toBe('dashed');
		});
	});
});
