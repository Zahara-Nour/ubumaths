/**
 * La carte d'une fonction — suivi de la revue de #1488.
 *
 * - un élément de menu indisponible s'annonce indisponible (`aria-disabled`),
 *   avec sa raison, et reste atteignable au clavier ;
 * - tangente et aire d'une courbe non tracée : même traitement ;
 * - le point de couleur : après « Tracer f », le focus va à la couleur, et
 *   chaque groupe de choix n'a qu'un arrêt de tabulation (flèches) ;
 * - le champ : Échap ne fait pas passer MathLive en saisie LaTeX, et ce que
 *   montre le champ au démontage est rangé, même si la valeur liée a du retard.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isFunction } from '$lib/atelier/types';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

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

function fieldOf(card: HTMLElement): MathfieldElement {
	const field = card.querySelector('math-field');
	if (!field) throw new Error('pas de champ');
	return field as MathfieldElement;
}

async function openMenu(card: HTMLElement, name: string): Promise<HTMLElement> {
	const button = card.querySelector<HTMLButtonElement>(`button[aria-label="Options de ${name}"]`)!;
	await userEvent.click(button);
	return vi.waitFor(() => {
		const menu = document.querySelector<HTMLElement>('[role="menu"]');
		expect(menu).toBeTruthy();
		return menu!;
	});
}

function menuItem(menu: HTMLElement, label: string): HTMLElement {
	const item = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].find((el) =>
		el.textContent?.trim().startsWith(label)
	);
	if (!item) throw new Error(`pas d'élément « ${label} »`);
	return item;
}

/** Le texte que désigne `aria-describedby`. */
function descriptionOf(element: HTMLElement): string {
	const ids = element.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
	return ids
		.map((id) => document.getElementById(id)?.textContent ?? '')
		.join(' ')
		.trim();
}

// =============================================================================
// Le menu
// =============================================================================

describe('carte de fonction — éléments indisponibles du menu', () => {
	it('« Renommer » s’annonce indisponible, avec sa raison, sans être sauté', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		const rename = menuItem(menu, 'Renommer');
		expect(rename.getAttribute('aria-disabled')).toBe('true');
		// Pas `data-disabled` : bits-ui le sauterait au clavier
		expect(rename.hasAttribute('data-disabled')).toBe(false);
		expect(descriptionOf(rename)).toMatch(/prochain lot/);

		// Un élément disponible ne s'annonce pas indisponible
		expect(menuItem(menu, 'Dériver').getAttribute('aria-disabled')).not.toBe('true');
	});

	it('courbe non tracée : tangente et aire sont indisponibles, avec leur raison', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		for (const label of ['Tangente', 'Aire sous la courbe']) {
			const item = menuItem(menu, label);
			expect(item.getAttribute('aria-disabled')).toBe('true');
			expect(item.hasAttribute('data-disabled')).toBe(false);
			expect(descriptionOf(item)).toMatch(/Trace d’abord la courbe/);
		}
	});

	it('choisir un élément indisponible ne fait rien', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		menuItem(menu, 'Tangente').click();
		await new Promise((resolve) => setTimeout(resolve, 100));
		const f = atelier.get('f');
		expect(f && isFunction(f) ? f.display?.tangentAt : undefined).toBeUndefined();
	});
});

// =============================================================================
// Le point de couleur
// =============================================================================

describe('carte de fonction — point de couleur au clavier', () => {
	it('après « Tracer f », le focus va à la couleur, pas sur la page', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const dot = cardFor(container, 'f').querySelector<HTMLButtonElement>(
			'button[aria-label="Couleur et trait de f"]'
		)!;
		await userEvent.click(dot);
		const plot = await vi.waitFor(() => {
			const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
				(b) => b.textContent?.trim() === 'Tracer f'
			);
			expect(button).toBeTruthy();
			return button!;
		});
		plot.focus();
		await userEvent.keyboard('{Enter}');

		await vi.waitFor(() => {
			const active = document.activeElement as HTMLElement | null;
			expect(active?.getAttribute('role')).toBe('radio');
			expect(active?.closest('[aria-label="Couleur de la courbe"]')).toBeTruthy();
		});
	});

	it('un seul arrêt de tabulation par groupe ; la flèche choisit la couleur voisine', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.setPlotted('f', true);
		const { container } = await render(WithAtelier, { atelier });

		await userEvent.click(
			cardFor(container, 'f').querySelector<HTMLButtonElement>(
				'button[aria-label="Couleur et trait de f"]'
			)!
		);
		const colors = await vi.waitFor(() => {
			const group = document.querySelector<HTMLElement>(
				'[role="radiogroup"][aria-label="Couleur de la courbe"]'
			);
			expect(group).toBeTruthy();
			return group!;
		});
		for (const label of ['Couleur de la courbe', 'Épaisseur du trait', 'Style du trait']) {
			const group = document.querySelector(`[role="radiogroup"][aria-label="${label}"]`)!;
			const stops = [...group.querySelectorAll<HTMLElement>('[role="radio"]')].filter(
				(radio) => radio.tabIndex === 0
			);
			expect(stops).toHaveLength(1);
			// L'arrêt est le choix coché
			expect(stops[0].getAttribute('aria-checked')).toBe('true');
		}

		const f = atelier.get('f');
		const before = f && isFunction(f) ? f.display?.color : undefined;
		const checked = colors.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')!;
		checked.focus();
		await userEvent.keyboard('{ArrowRight}');

		await vi.waitFor(() => {
			const now = atelier.get('f');
			expect(now && isFunction(now) ? now.display?.color : undefined).not.toBe(before);
		});
		expect(document.activeElement).not.toBe(checked);
		expect((document.activeElement as HTMLElement).getAttribute('role')).toBe('radio');
	});
});

// =============================================================================
// Le champ
// =============================================================================

describe('carte de fonction — le champ', () => {
	it('Échap sans frappe en cours ne fait pas passer MathLive en saisie LaTeX', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const field = fieldOf(cardFor(container, 'f'));

		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		await userEvent.keyboard('{Escape}');
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(field.mode).not.toBe('latex');
	});

	it('au démontage, range ce que le champ montre, même si la valeur liée a du retard', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');
		const { container, unmount } = await render(WithAtelier, { atelier });
		const field = fieldOf(cardFor(container, 'f'));

		// Écrire sans événement `input` : la valeur liée et `dirty` n'ont pas suivi,
		// comme après une frappe rapide (mesuré au vrai clavier)
		field.value = 'x+9';
		await unmount();

		await vi.waitFor(() => expect(atelier.get('f')?.definition).toBe('x+9'));
	});
});
