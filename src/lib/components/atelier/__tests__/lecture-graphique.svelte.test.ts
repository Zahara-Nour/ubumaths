/**
 * Lecture graphique de l'image, de la carte au graphe : l'option du menu
 * « Affichage », un calcul `f(2)` dans la console, le point glissant (lot 3 bis
 * de `docs/wip/atelier-refonte-interface-phase0.md`, choix de David du
 * 2026-10-18).
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isFunction } from '$lib/atelier/types';

const FIELD = 'input[aria-label="Calcul, définition ou commande"]';

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

async function openMenu(card: HTMLElement, name: string): Promise<HTMLElement> {
	const button = card.querySelector<HTMLButtonElement>(`button[aria-label="Options de ${name}"]`);
	await userEvent.click(button!);
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

async function submit(container: HTMLElement, text: string) {
	await userEvent.click(container.querySelector(FIELD)!);
	await userEvent.keyboard(`${text}{Enter}`);
}

/** `f(x) = x²` tracée, lecture allumée ou non. */
function atelierWith(showReading: boolean): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
	atelier.setPlotted('f', true);
	if (showReading) atelier.setDisplay('f', { showReading: true });
	return atelier;
}

function consoleReading(container: HTMLElement): Element | null {
	return container.querySelector('g.image-readings [data-source="console"]');
}

describe('lecture graphique — l’option de la carte', () => {
	it('« Lecture graphique » se coche dans Affichage et pose le point glissant', async () => {
		const atelier = atelierWith(false);
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		const item = menuItem(menu, 'Lecture graphique');
		expect(item.getAttribute('aria-checked')).toBe('false');
		item.click();

		await vi.waitFor(() => {
			const f = atelier.get('f');
			expect(f && isFunction(f) && f.display?.showReading).toBe(true);
		});
		await vi.waitFor(() =>
			expect(
				container.querySelector('[role="slider"][aria-label="Lecture graphique de f"]')
			).not.toBeNull()
		);
	});

	it('courbe non tracée : l’option est annoncée indisponible, avec sa raison', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		expect(menuItem(menu, 'Lecture graphique').getAttribute('aria-disabled')).toBe('true');
	});
});

describe('lecture graphique — les calculs de la console', () => {
	it('f(2) tapé dans la console se lit en pointillés sur le graphe', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: atelierWith(true),
			ephemeral: true
		});

		await submit(container, 'f(2)');

		await vi.waitFor(() => expect(consoleReading(container)).not.toBeNull());
		const reading = consoleReading(container)!;
		expect(reading.querySelector('line.lecture-verticale')).not.toBeNull();
		expect(reading.textContent).toContain('4');
	});

	it('option éteinte : f(2) ne dessine rien', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: atelierWith(false),
			ephemeral: true
		});

		await submit(container, 'f(2)');
		await vi.waitFor(() =>
			expect(container.querySelector('.historique')?.textContent).toContain('4')
		);

		expect(consoleReading(container)).toBeNull();
		expect(container.querySelector('[role="slider"]')).toBeNull();
	});

	it('décocher l’option efface les lectures et le point glissant', async () => {
		const atelier = atelierWith(true);
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await submit(container, 'f(2)');
		await vi.waitFor(() => expect(consoleReading(container)).not.toBeNull());

		atelier.setDisplay('f', { showReading: false });

		await vi.waitFor(() => expect(consoleReading(container)).toBeNull());
		expect(container.querySelector('[role="slider"]')).toBeNull();
	});
});
