/**
 * Le curseur d'une valeur, dans sa carte — lot 4 du passage de `/grapheur`
 * par l'atelier (phase 0 `docs/archive/wip/atelier-grapheur-phase0.md` §4).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isValue } from '$lib/atelier/types';

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

async function openValue(definition: string, extra?: (a: Atelier) => void) {
	const atelier = new Atelier();
	atelier.create({ kind: 'value', name: 'b', definition: '1' }, 'text');
	atelier.create({ kind: 'value', name: 'a', definition }, 'text');
	atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
	extra?.(atelier);
	const { container } = await render(WithAtelier, { atelier });
	(cardFor(container, 'a').querySelector('.entete') as HTMLButtonElement).click();
	await vi.waitFor(() => expect(cardFor(container, 'a').querySelector('math-field')).toBeTruthy());
	return { atelier, container, card: () => cardFor(container, 'a') };
}

function input(card: HTMLElement, label: string): HTMLInputElement {
	const found = card.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement | null;
	if (!found) throw new Error(`pas de champ « ${label} »`);
	return found;
}

function setInput(field: HTMLInputElement, value: string) {
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('le curseur dans la carte', () => {
	// K1
	it('montre le curseur avec sa valeur, ses bornes et son pas', async () => {
		const { card } = await openValue('2');

		const thumb = card().querySelector('[role="slider"]');
		expect(thumb).toBeTruthy();
		await vi.waitFor(() => expect(thumb?.getAttribute('aria-valuetext')).toBe('a = 2'));
		expect(input(card(), 'de, minimum du curseur de a').value).toBe('-10');
		expect(input(card(), 'à, maximum du curseur de a').value).toBe('10');
		expect(input(card(), 'pas du curseur de a').value).toBe('0.1');
	});

	// K2 : une flèche avance d'un pas, et la fonction suit
	it('une flèche au clavier avance d’un pas', async () => {
		const { atelier, card } = await openValue('2');
		const thumb = card().querySelector('[role="slider"]') as HTMLElement;

		thumb.focus();
		await userEvent.keyboard('{ArrowRight}');

		await vi.waitFor(() => expect(atelier.get('a')?.definition).toBe('2,1'));
	});

	it('régler les bornes passe par l’atelier', async () => {
		const { atelier, card } = await openValue('2');

		setInput(input(card(), 'à, maximum du curseur de a'), '5');

		await vi.waitFor(() => {
			const a = atelier.get('a');
			expect(a && isValue(a) && a.slider?.max).toBe(5);
		});
	});

	// E1
	it('dit qu’un réglage est refusé, puis remet la valeur retenue', async () => {
		const { card } = await openValue('2');
		const min = input(card(), 'de, minimum du curseur de a');

		setInput(min, '50');

		await vi.waitFor(() =>
			expect(card().querySelector('.refus')?.textContent).toContain('minimum')
		);
		expect(min.getAttribute('aria-invalid')).toBe('true');
		min.dispatchEvent(new Event('change', { bubbles: true }));
		await vi.waitFor(() => expect(min.value).toBe('-10'));
	});

	// Une valeur calculée n'a pas de curseur à bouger : on le dit
	it('pas de curseur sur une valeur calculée, et on dit pourquoi', async () => {
		const { card } = await openValue('b+1');

		expect(card().querySelector('[role="slider"]')).toBeNull();
		expect(card().querySelector('.sans-curseur')?.textContent).toContain('calculée');
	});

	// D4
	it('pas de curseur sur une grandeur, et on dit pourquoi', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '12[km]' }, 'url');
		const { container } = await render(WithAtelier, { atelier });
		(cardFor(container, 'a').querySelector('.entete') as HTMLButtonElement).click();

		await vi.waitFor(() =>
			expect(cardFor(container, 'a').querySelector('.sans-curseur')?.textContent).toContain('km')
		);
		expect(cardFor(container, 'a').querySelector('[role="slider"]')).toBeNull();
	});
});

describe('revue a11y du lot 4', () => {
	// Bloquant : l'aria-label posé sur <Slider> n'arrivait pas au pouce
	it('le pouce porte son nom', async () => {
		const { card } = await openValue('2');

		await vi.waitFor(() =>
			expect(card().querySelector('[role="slider"]')?.getAttribute('aria-label')).toBe(
				'Curseur de a'
			)
		);
	});

	// WCAG 2.5.3 : le nom commence par le mot visible
	it('les champs commencent par le mot qu’on voit', async () => {
		const { card } = await openValue('2');

		expect(input(card(), 'de, minimum du curseur de a')).toBeTruthy();
		expect(input(card(), 'à, maximum du curseur de a')).toBeTruthy();
		expect(input(card(), 'pas du curseur de a')).toBeTruthy();
	});

	// Le refus reste lisible après avoir quitté le champ, et il est relié au champ
	it('le refus reste affiché et relié au champ fautif', async () => {
		const { card } = await openValue('2');
		const min = input(card(), 'de, minimum du curseur de a');

		setInput(min, '50');
		await vi.waitFor(() =>
			expect(card().querySelector('.refus')?.textContent).toContain('minimum')
		);
		const id = card().querySelector('.refus')?.id;
		expect(id).toBeTruthy();
		expect(min.getAttribute('aria-describedby')).toBe(id);

		min.dispatchEvent(new Event('change', { bubbles: true }));
		await vi.waitFor(() => expect(min.value).toBe('-10'));
		expect(card().querySelector('.refus')?.textContent).toContain('minimum');
	});

	// A1 vu depuis la carte : une fraction n'est pas « calculée »
	it('une fraction tapée garde son curseur, sans message faux', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '\\frac{1}{2}' }, 'keyboard');
		const { container } = await render(WithAtelier, { atelier });
		(cardFor(container, 'a').querySelector('.entete') as HTMLButtonElement).click();

		await vi.waitFor(() =>
			expect(cardFor(container, 'a').querySelector('[role="slider"]')).toBeTruthy()
		);
		expect(cardFor(container, 'a').querySelector('.sans-curseur')).toBeNull();
	});
});
