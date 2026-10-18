/**
 * La carte d'une fonction — lot 3 de `docs/wip/atelier-refonte-interface-phase0.md`.
 *
 * Décisions de David (2026-10-18) : une seule ligne `● f(x) = [champ]`, le membre
 * de droite éditable et pris en compte à Entrée ou à la sortie du champ ; le
 * point de couleur ouvre couleur et trait ; plus de vue développée, un menu
 * « Affichage » / « Actions » à la place ; « Image » prépare `f(` dans la
 * console ; une carte dérivée se signale par une icône de lien.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isFunction, type CurveDisplay } from '$lib/atelier/types';

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

/** Le premier clic de la session est parfois perdu par MathLive (mesuré). */
async function typeInto(field: MathfieldElement, keys: string) {
	await userEvent.click(field);
	await vi.waitFor(() => expect(document.activeElement).toBe(field));
	await userEvent.keyboard(keys);
}

/** Les réglages de courbe de `f`, ou `undefined` (jamais tracée). */
function displayOf(atelier: Atelier): CurveDisplay | undefined {
	const f = atelier.get('f');
	return f && isFunction(f) ? f.display : undefined;
}

function menuButton(card: HTMLElement, name: string): HTMLButtonElement {
	const button = card.querySelector<HTMLButtonElement>(`button[aria-label="Options de ${name}"]`);
	if (!button) throw new Error('pas de bouton de menu');
	return button;
}

/** Les éléments du menu ouvert (rendu hors de la carte, dans le document). */
async function openMenu(card: HTMLElement, name: string): Promise<HTMLElement> {
	await userEvent.click(menuButton(card, name));
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

// =============================================================================
// Une seule ligne
// =============================================================================

describe('carte de fonction — une ligne', () => {
	it('montre f(x) = et le champ sans rien ouvrir, sans libellé « fonction »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '3x+5' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'f');
		expect(fieldOf(card).value.replace(/\s+/g, '')).toBe('3x+5');
		expect(card.textContent?.replace(/\s+/g, '')).toContain('f(x)=');
		expect(card.querySelector('.type')).toBeNull();
		expect(card.textContent).not.toMatch(/fonction/i);
		// Plus de second « f(x) = » : le préfixe n'apparaît qu'une fois
		expect(card.textContent?.replace(/\s+/g, '').match(/\(x\)=/g)?.length).toBe(1);
		expect(menuButton(card, 'f')).toBeTruthy();
		expect(card.querySelector('button[aria-label="Tracer f"]')).toBeTruthy();
	});

	it('n’affiche plus de boutons d’action sur la carte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'f').querySelector('.action')).toBeNull();
	});
});

// =============================================================================
// L'édition : Entrée, sortie du champ, Échap, saisie invalide
// =============================================================================

describe('carte de fonction — l’édition', () => {
	it('ne change rien pendant la frappe, et range la définition à Entrée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const field = fieldOf(cardFor(container, 'f'));

		await typeInto(field, '+1');
		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(atelier.get('f')?.definition).toBe('x');

		await userEvent.keyboard('{Enter}');
		await vi.waitFor(() => expect(atelier.get('f')?.definition).toBe('x+1'));
	});

	it('range la définition en sortant du champ', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const field = fieldOf(cardFor(container, 'f'));

		await typeInto(field, '+2');
		field.blur();

		await vi.waitFor(() => expect(atelier.get('f')?.definition).toBe('x+2'));
	});

	it('Échap rétablit l’ancienne définition dans le champ', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const field = fieldOf(cardFor(container, 'f'));

		await typeInto(field, '+7');
		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(field.value).not.toContain('7'));
		field.blur();
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(atelier.get('f')?.definition).toBe('x');
	});

	it('une saisie invalide garde l’ancienne définition et montre l’erreur', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const card = cardFor(container, 'f');
		const field = fieldOf(card);

		await typeInto(field, '+*');
		await userEvent.keyboard('{Enter}');

		await vi.waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('true'));
		expect(atelier.get('f')?.definition).toBe('x');
		const alert = card.querySelector('[role="alert"]');
		expect(alert?.textContent?.trim()).not.toBe('');
		// Le message est relié au champ
		expect(field.getAttribute('aria-describedby')).toBe(alert?.id);
	});
});

// =============================================================================
// Le point de couleur
// =============================================================================

describe('carte de fonction — couleur et trait', () => {
	it('le point ouvre couleur, épaisseur et style ; choisir une couleur la range', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.setPlotted('f', true);
		const { container } = await render(WithAtelier, { atelier });

		const dot = cardFor(container, 'f').querySelector<HTMLButtonElement>(
			'button[aria-label="Couleur et trait de f"]'
		);
		expect(dot).toBeTruthy();
		await userEvent.click(dot!);

		const colors = await vi.waitFor(() => {
			const group = document.querySelector(
				'[role="radiogroup"][aria-label="Couleur de la courbe"]'
			);
			expect(group).toBeTruthy();
			return group!;
		});
		expect(
			document.querySelector('[role="radiogroup"][aria-label="Épaisseur du trait"]')
		).toBeTruthy();
		expect(document.querySelector('[role="radiogroup"][aria-label="Style du trait"]')).toBeTruthy();

		const before = displayOf(atelier)?.color;
		const other = [...colors.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
			(b) => b.getAttribute('aria-checked') !== 'true'
		)!;
		other.click();
		await vi.waitFor(() => expect(displayOf(atelier)?.color).not.toBe(before));
	});
});

// =============================================================================
// Le menu : Affichage et Actions
// =============================================================================

describe('carte de fonction — le menu', () => {
	it('a un groupe Affichage et un groupe Actions', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.setPlotted('f', true);
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		const headings = [...menu.querySelectorAll('[data-slot="dropdown-menu-group-heading"]')].map(
			(h) => h.textContent?.trim()
		);
		expect(headings).toEqual(['Affichage', 'Actions']);
		expect(menuItem(menu, 'Tangente')).toBeTruthy();
		expect(menuItem(menu, 'Aire sous la courbe')).toBeTruthy();
		expect(menuItem(menu, 'Dériver')).toBeTruthy();
	});

	it('« Aire sous la courbe » coche l’aire et montre sa valeur sous la carte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.setPlotted('f', true);
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		menuItem(menu, 'Aire sous la courbe').click();

		await vi.waitFor(() => expect(displayOf(atelier)?.integral).toBeTruthy());
		await vi.waitFor(() => expect(cardFor(container, 'f').textContent).toMatch(/aire =/));
	});

	it('« Dériver » depuis le menu fait apparaître la carte f′', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		menuItem(menu, 'Dériver').click();

		await vi.waitFor(() => expect(cardFor(container, 'f′')).toBeTruthy());
	});

	// Décision de David (2026-10-18) : `f(2)` s'écrit dans la console
	it('le menu ne propose plus « Image d’un nombre »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		const menu = await openMenu(cardFor(container, 'f'), 'f');

		expect(() => menuItem(menu, 'Image d’un nombre')).toThrow();
		expect(menuItem(menu, 'Dériver')).toBeTruthy();
	});

	it('« Tabuler » ouvre une petite fenêtre « de / à / pas »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		const menu = await openMenu(cardFor(container, 'f'), 'f');
		menuItem(menu, 'Tabuler').click();

		await vi.waitFor(() => {
			const dialog = document.querySelector('[role="dialog"]');
			expect(dialog?.textContent).toMatch(/Tabuler f/);
			expect(dialog?.querySelector('input[aria-label="Début du tableau de f"]')).toBeTruthy();
		});
	});
});

// =============================================================================
// Les cartes qui suivent une autre fonction
// =============================================================================

describe('carte dérivée', () => {
	it('n’a pas de champ, montre une icône de lien qui dit ce qu’elle suit', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.createDerivative('f');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'f′');
		expect(card.querySelector('math-field')).toBeNull();
		const link = card.querySelector<HTMLButtonElement>('button.lien');
		expect(link).toBeTruthy();
		expect(link!.getAttribute('aria-label')).toMatch(/dérivée de f/);
		expect(card.querySelector('.nom')?.getAttribute('title')).toMatch(/dérivée de f — elle suit f/);

		link!.click();
		await vi.waitFor(() => expect(card.textContent).toMatch(/dérivée de f — elle suit f/));
	});
});
