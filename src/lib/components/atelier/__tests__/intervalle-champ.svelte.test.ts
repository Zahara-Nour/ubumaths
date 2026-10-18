/**
 * La carte d'une fonction définie sur un intervalle, au VRAI clavier de MathLive.
 *
 * Phase 0 `docs/wip/atelier-intervalle-phase0.md`, lot 1. Mesuré ici dans
 * Chromium (2026-10-13) : MathLive écrit « sur » en trois lettres collées à ce
 * qui précède (`x+1sur…`), et, `smartFence` actif, `[0;+∞[` devient
 * `\left\lbrack0;+\infty\left\lbrack\right\rbrack\right\rbrack` — illisible.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { intervalLabelOf } from '$lib/atelier/interval';

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

/** Le champ d'une carte : celle d'une fonction l'a d'emblée (lot 3 de la refonte). */
async function open(container: HTMLElement, name: string): Promise<HTMLElement> {
	const card = cardFor(container, name);
	if (card.querySelector('math-field')) return card;
	(card.querySelector('.entete') as HTMLButtonElement).click();
	await vi.waitFor(() => expect(cardFor(container, name).querySelector('math-field')).toBeTruthy());
	return cardFor(container, name);
}

function fieldOf(card: HTMLElement): MathfieldElement {
	return card.querySelector('math-field') as MathfieldElement;
}

/** Frappes réelles, curseur en fin de champ. `[[` est un crochet pour `userEvent`. */
async function typeAtEnd(field: MathfieldElement, keys: string) {
	await userEvent.click(field);
	await vi.waitFor(() => expect(document.activeElement).toBe(field));
	field.executeCommand('moveToMathfieldEnd');
	await userEvent.keyboard(keys);
}

function withF(definition: string, interval?: string): Atelier {
	const atelier = new Atelier();
	atelier.create(
		{ kind: 'function', name: 'f', definition, ...(interval && { interval }) },
		'keyboard'
	);
	return atelier;
}

// =============================================================================
// Tests
// =============================================================================

describe('MathLive : ce que produit « sur »', () => {
	it('trois lettres collées, sans espace — et smartFence rend l’intervalle illisible', async () => {
		const { MathfieldElement } = await import('mathlive');
		const mf = new MathfieldElement();
		document.body.appendChild(mf);
		await userEvent.click(mf);
		await vi.waitFor(() => expect(document.activeElement).toBe(mf));
		await userEvent.keyboard('x+1 sur [[0;+oo[[');

		expect(mf.getValue('latex')).toBe(
			'x+1sur\\left\\lbrack0;+\\infty\\left\\lbrack\\right\\rbrack\\right\\rbrack'
		);
		mf.remove();
	});
});

describe('carte : f(x) = x² sur [0 ; +∞[', () => {
	it('taper « sur [0;+∞[ » après la définition range l’intervalle', async () => {
		const atelier = withF('x^2');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeAtEnd(fieldOf(card), ' sur [[0;+oo[[{Enter}');

		await vi.waitFor(() => expect(intervalLabelOf(atelier.get('f')!)).toBe('[0 ; +∞['));
		expect(atelier.get('f')?.definition).toBe('x^2');
		// smartFence coupé : le crochet ouvrant final reste un crochet
		expect(fieldOf(card).value).toContain('[0;+\\infty[');
		expect(fieldOf(card).value).not.toContain('\\left');
	});

	// Lot 3 de la refonte : une seule ligne — l'ensemble est dans le champ, pas répété à côté
	it('la carte ne répète pas « sur [0 ; +∞[ » à côté du champ', async () => {
		const atelier = withF('x^2', '[0;+\\infty[');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'f').querySelector('.intervalle')).toBeNull();
		expect(fieldOf(cardFor(container, 'f')).value).toContain('\\text{ sur }');
	});

	it('le champ montre la définition puis « sur » et l’ensemble', async () => {
		const atelier = withF('x^2', '[0;+\\infty[');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		expect(fieldOf(card).value).toBe('x^2\\text{ sur }[0;+\\infty[');
	});

	it('effacer « sur … » retire l’intervalle (I6)', async () => {
		const atelier = withF('x^2', '[0;1]');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		const field = fieldOf(card);
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		field.executeCommand('selectAll');
		await userEvent.keyboard('x^2{Enter}');

		await vi.waitFor(() => expect(intervalLabelOf(atelier.get('f')!)).toBeNull());
		expect(atelier.get('f')?.definition).toBe('x^2');
		expect(cardFor(container, 'f').querySelector('.intervalle')).toBeNull();
	});

	it('I3 : un ensemble hors du domaine est refusé, avec un message', async () => {
		const atelier = withF('\\ln x');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeAtEnd(fieldOf(card), ' sur [[-1;2]{Enter}');

		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('[role="alert"]')?.textContent).toContain(
				'pas en −1'
			)
		);
		expect(intervalLabelOf(atelier.get('f')!)).toBeNull();
	});

	// Seconde revue : smartFence suit la règle du découpage, pas un simple « contient sur »
	it('« surface » ne coupe pas smartFence : les parenthèses se referment', async () => {
		const atelier = withF('');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeAtEnd(fieldOf(card), 'surface+(x+1');

		expect(fieldOf(card).value).toContain('\\left(');
	});

	it('taper puis effacer « sur » : (x+1)/(x-1) se lit normalement', async () => {
		const atelier = withF('');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeAtEnd(fieldOf(card), 'sur{Backspace}{Backspace}{Backspace}(x+1)/(x-1){Enter}');

		expect(fieldOf(card).value).toContain('\\left(');
		await vi.waitFor(() => expect(atelier.get('f')?.status).toBe('ok'));
		expect(intervalLabelOf(atelier.get('f')!)).toBeNull();
	});

	it('une valeur ne se définit pas sur un intervalle', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'keyboard');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'a');

		await typeAtEnd(fieldOf(card), ' sur [[0;1]');

		await vi.waitFor(() =>
			expect(cardFor(container, 'a').querySelector('[role="alert"]')?.textContent).toBe(
				'Seule une fonction se définit sur un intervalle.'
			)
		);
		expect(atelier.get('a')?.definition).toBe('2');
	});
});
