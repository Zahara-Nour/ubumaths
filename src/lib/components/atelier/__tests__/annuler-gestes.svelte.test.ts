/**
 * Annuler / Rétablir, lot 5 PR 2 : à l'écran, un geste continu est UNE étape.
 *
 * Décision de David : « tout un glissé de curseur = une étape ». Revue de #1517,
 * mesuré : glisser la tangente sur 150 crans faisait 100 étapes, et une
 * suppression faite avant devenait irrécupérable.
 *
 * - souris / doigt : le geste se ferme au relâchement ;
 * - clavier : à chaque relâchement de touche (une flèche tenue = un geste) ;
 * - champ tapé à chaque frappe (bornes, réglages du curseur) : quand on le quitte.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isFunction } from '$lib/atelier/types';
import { cardOf, menuItemOf, openCardMenu } from './harness/function-card';

// =============================================================================
// Décor
// =============================================================================

/** Glisser un curseur bits-ui à la souris, de gauche à droite, en `moves` crans. */
async function drag(root: HTMLElement, moves: number) {
	const rect = root.getBoundingClientRect();
	const y = rect.top + rect.height / 2;
	const at = (fraction: number) => rect.left + rect.width * fraction;
	const down = new PointerEvent('pointerdown', {
		bubbles: true,
		clientX: at(0.1),
		clientY: y,
		pointerId: 1,
		button: 0
	});
	root.querySelector('[data-slot="slider-track"]')!.dispatchEvent(down);
	for (let i = 1; i <= moves; i++) {
		document.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				clientX: at(0.1 + (0.8 * i) / moves),
				clientY: y,
				pointerId: 1
			})
		);
	}
	document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function sliderOf(scope: ParentNode, label?: string): HTMLElement {
	const roots = [...scope.querySelectorAll<HTMLElement>('[data-slot="slider"]')];
	const root = label
		? roots.find(
				(r) => r.querySelector(`[aria-label="${label}"]`) || r.getAttribute('aria-label') === label
			)
		: roots[0];
	if (!root) throw new Error(`pas de curseur ${label ?? ''}`);
	return root;
}

function typeInto(field: HTMLInputElement, values: string[]) {
	for (const value of values) {
		field.value = value;
		field.dispatchEvent(new Event('input', { bubbles: true }));
	}
	field.dispatchEvent(new Event('change', { bubbles: true }));
}

/** `a`, paramètre de f : son curseur est sous sa ligne. */
async function openValue() {
	const atelier = new Atelier();
	atelier.create({ kind: 'value', name: 'a', definition: '1' }, 'text');
	atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
	const { container } = await render(WithAtelier, { atelier });
	await vi.waitFor(() =>
		expect(cardOf(container, 'a').querySelector('[role="slider"]')).toBeTruthy()
	);
	return { atelier, container };
}

// =============================================================================
// Tests
// =============================================================================

describe('le curseur d’une valeur', () => {
	it('un glissé à la souris de 40 crans : UNE étape, Annuler rend la valeur', async () => {
		const { atelier, container } = await openValue();
		const built = atelier.history.steps;

		await drag(sliderOf(cardOf(container, 'a')), 40);

		await vi.waitFor(() => expect(atelier.get('a')?.definition).not.toBe('1'));
		expect(atelier.history.steps).toBe(built + 1);
		expect(atelier.history.undo).toBe('curseur de a');
		atelier.undo();
		expect(atelier.get('a')?.definition).toBe('1');
	});

	it('au clavier : trois appuis = trois étapes, une flèche tenue = une étape', async () => {
		const { atelier, container } = await openValue();
		const built = atelier.history.steps;
		const thumb = cardOf(container, 'a').querySelector('[role="slider"]') as HTMLElement;
		thumb.focus();

		await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
		await vi.waitFor(() => expect(atelier.history.steps).toBe(built + 3));

		await userEvent.keyboard('{ArrowRight>6}{/ArrowRight}');
		await vi.waitFor(() => expect(atelier.get('a')?.definition).toBe('1,9'));
		expect(atelier.history.steps).toBe(built + 4);
	});

	it('les réglages du curseur tapés au clavier : UNE étape par champ quitté', async () => {
		const { atelier, container } = await openValue();
		const built = atelier.history.steps;
		const menu = await openCardMenu(container, 'a');
		menuItemOf(menu, 'Bornes et pas du curseur').click();
		const field = await vi.waitFor(() => {
			const found = document.querySelector<HTMLInputElement>(
				'input[aria-label="à, maximum du curseur de a"]'
			);
			expect(found).toBeTruthy();
			return found!;
		});

		typeInto(field, ['2', '20', '200']);

		await vi.waitFor(() => {
			const a = atelier.get('a');
			expect(a?.kind === 'value' ? a.slider?.max : undefined).toBe(200);
		});
		expect(atelier.history.steps).toBe(built + 1);
	});
});

describe('la tangente et l’aire d’une fonction', () => {
	async function openPlotted() {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.setPlotted('f', true);
		atelier.setDisplay('f', { tangentAt: 0, integral: { from: 0, to: 1 } });
		atelier.create({ kind: 'value', name: 'k', definition: '3' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await vi.waitFor(() =>
			expect(container.querySelector('[aria-label="Abscisse du point de tangence"]')).toBeTruthy()
		);
		return { atelier, container };
	}

	function tangentOf(atelier: Atelier): number | null | undefined {
		const f = atelier.get('f');
		return f && isFunction(f) ? f.display?.tangentAt : undefined;
	}

	it('supprimer k, glisser la tangente de 150 crans : 2 étapes, Annuler ×2 rend k', async () => {
		const { atelier, container } = await openPlotted();
		const built = atelier.history.steps;
		atelier.removeWithDependents('k');

		await drag(sliderOf(container, 'Abscisse du point de tangence'), 150);

		await vi.waitFor(() => expect(tangentOf(atelier)).not.toBe(0));
		expect(atelier.history.steps).toBe(built + 2);
		atelier.undo();
		expect(tangentOf(atelier)).toBe(0);
		atelier.undo();
		expect(atelier.get('k')?.definition).toBe('3');
	});

	it('une borne de l’aire tapée chiffre à chiffre : UNE étape quand on quitte le champ', async () => {
		const { atelier, container } = await openPlotted();
		const built = atelier.history.steps;
		const field = container.querySelector(
			'input[aria-label="à, borne supérieure de l’aire"]'
		) as HTMLInputElement;

		typeInto(field, ['2', '25', '250']);

		await vi.waitFor(() => {
			const f = atelier.get('f');
			expect(f && isFunction(f) ? f.display?.integral?.to : undefined).toBe(250);
		});
		expect(atelier.history.steps).toBe(built + 1);
	});
});

describe('la console garde la trace d’Annuler (lot 5, PR 2)', () => {
	const FIELD = 'input[aria-label="Calcul, définition ou commande"]';

	async function openConsole() {
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const field = await vi.waitFor(() => {
			const found = container.querySelector<HTMLInputElement>(FIELD);
			expect(found).toBeTruthy();
			return found!;
		});
		return { atelier, container, field };
	}

	function press(init: KeyboardEventInit, target: EventTarget = document.body) {
		target.dispatchEvent(
			new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
		);
	}

	it('Ctrl+Z barre la ligne de l’étape et écrit une ligne « Annuler »', async () => {
		const { atelier, container, field } = await openConsole();
		await userEvent.click(field);
		await userEvent.keyboard('a = 2{Enter}');
		await vi.waitFor(() => expect(atelier.get('a')?.definition).toBe('2'));
		field.blur();

		press({ key: 'z', ctrlKey: true });

		await vi.waitFor(() => expect(atelier.get('a')).toBeUndefined());
		const lines = [...container.querySelectorAll('.historique li')];
		expect(lines[0].classList.contains('annulee')).toBe(true);
		expect(lines[0].textContent).toContain('Annulée');
		expect(lines.at(-1)?.textContent).toContain('Annulé');
		expect(lines.at(-1)?.classList.contains('annulee')).toBe(false);
	});

	it('Ctrl+Z dans un menu ouvert n’annule rien', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '1' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const menu = await openCardMenu(container, 'a');

		press({ key: 'z', ctrlKey: true }, menu);

		expect(atelier.get('a')?.definition).toBe('1');
		expect(atelier.history.steps).toBe(1);
	});

	it('une modification hors étape se lit tout de suite sur le bouton Annuler', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '1' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		atelier.update('a', '5', 'text');

		await vi.waitFor(() => {
			const undo = [...container.querySelectorAll('[role="toolbar"] button')].find((b) =>
				b.getAttribute('aria-label')?.startsWith('Annuler')
			);
			expect(undo?.getAttribute('aria-label')).toBe('Annuler : modifier l’atelier');
		});
	});
});
