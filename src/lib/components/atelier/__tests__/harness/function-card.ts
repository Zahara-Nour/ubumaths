/**
 * Harnais : agir sur la carte d'un objet (lots 3 et 4a de la refonte de l'atelier).
 *
 * La carte n'a plus de vue développée : ses actions et ses réglages d'affichage
 * sont dans un menu (« Options de f »), rendu hors de la carte, dans le document.
 * Les actions à deux listes sont dans le sous-menu « Avec une autre liste ».
 */

import { expect, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

/** La carte d'un objet, par le nom affiché. */
export function cardOf(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

/** Ouvrir le menu d'une carte ; rend le menu ouvert. */
export async function openCardMenu(container: HTMLElement, name: string): Promise<HTMLElement> {
	const button = cardOf(container, name).querySelector<HTMLButtonElement>(
		`button[aria-label="Options de ${name}"]`
	);
	if (!button) throw new Error(`pas de menu sur la carte ${name}`);
	// Au clavier : `userEvent.click` vise le bouton par son nom, et « Options de f »
	// est aussi le début de « Options de f′ » (deux éléments, refusé)
	button.focus();
	await userEvent.keyboard('{Enter}');
	return vi.waitFor(() => {
		const menu = document.querySelector<HTMLElement>('[role="menu"]');
		expect(menu).toBeTruthy();
		return menu!;
	});
}

/** Un élément du menu ouvert, par le début de son libellé. */
export function menuItemOf(menu: HTMLElement, label: string): HTMLElement {
	const item = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].find((el) =>
		(el.querySelector('.item > span')?.textContent ?? el.textContent)?.trim().startsWith(label)
	);
	if (!item) throw new Error(`pas d'élément « ${label} » dans le menu`);
	return item;
}

/** Le nom des lots 3 : la carte d'une fonction a le même menu que les autres. */
export const openFunctionMenu = openCardMenu;

/**
 * Choisir une action d'une carte, par son menu — dans le sous-menu « Avec une
 * autre liste » quand elle n'est pas au premier niveau.
 */
export async function chooseObjectAction(
	container: HTMLElement,
	name: string,
	label: string
): Promise<void> {
	const menu = await openCardMenu(container, name);
	let item: HTMLElement;
	try {
		item = menuItemOf(menu, label);
	} catch {
		const trigger = menuItemOf(menu, 'Avec une autre liste');
		trigger.focus();
		await userEvent.keyboard('{ArrowRight}');
		const sub = await vi.waitFor(() => {
			const menus = document.querySelectorAll<HTMLElement>('[role="menu"]');
			expect(menus.length).toBe(2);
			return menus[1];
		});
		item = menuItemOf(sub, label);
	}
	item.click();
	await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull());
}

/** Choisir une action d'une carte de fonction, par son menu. */
export const chooseCardAction = chooseObjectAction;
