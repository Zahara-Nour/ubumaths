/**
 * La carte d'une fonction définie avec une autre lettre que x : `f(t) = t^2`.
 *
 * Décision de David (2026-10-06) : la carte montre la lettre de l'élève, la
 * définition rangée reste en x (`$lib/atelier/letter.ts`).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

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

async function open(container: HTMLElement, name: string): Promise<HTMLElement> {
	const card = cardFor(container, name);
	(card.querySelector('.entete') as HTMLButtonElement).click();
	await vi.waitFor(() => expect(cardFor(container, name).querySelector('math-field')).toBeTruthy());
	return cardFor(container, name);
}

function fieldOf(card: HTMLElement): MathfieldElement {
	return card.querySelector('math-field') as MathfieldElement;
}

/** f(t) = t^2, rangée comme Calcul la range : en x, lettre t. */
function atelierWithT(definition = 'x^2'): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition, letter: 't' }, 'text');
	return atelier;
}

/** Le premier clic de la session est parfois perdu par MathLive (mesuré). */
async function typeInto(field: MathfieldElement, keys: string) {
	await userEvent.click(field);
	await vi.waitFor(() => expect(document.activeElement).toBe(field));
	await userEvent.keyboard(keys);
}

// =============================================================================
// Tests
// =============================================================================

describe('carte de f(t) = t²', () => {
	it('l’en-tête montre la formule en t', async () => {
		const { container } = await render(WithAtelier, { atelier: atelierWithT() });

		const spoken = cardFor(container, 'f').querySelector('.definition .sr-only')?.textContent;
		// Lu par MathLive : « 'T' squared »
		expect(spoken).toMatch(/\bt\b/i);
		expect(spoken).not.toMatch(/\bx\b/i);
	});

	it('le champ est précédé de f(t) = et montre t', async () => {
		const { container } = await render(WithAtelier, { atelier: atelierWithT() });

		const card = await open(container, 'f');

		expect(card.querySelector('.prefixe')?.textContent?.replace(/\s+/g, '')).toBe('f(t)=');
		expect(fieldOf(card).value).toContain('t^2');
		expect(fieldOf(card).value).not.toContain('x');
	});

	it('ce qu’on tape en t est rangé en x', async () => {
		const atelier = atelierWithT('');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeInto(fieldOf(card), 't^2{ArrowRight}+3t');

		await vi.waitFor(() => expect(atelier.get('f')?.definition).toBe('x^2+3x'));
		expect(atelier.get('f')?.definition).not.toContain('t');
		expect(atelier.get('f')?.status).toBe('ok');
	});

	it('x tapé dans une fonction de t est refusé, avec un message', async () => {
		const atelier = atelierWithT('');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeInto(fieldOf(card), 't+x');

		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('[role="alert"]')?.textContent).toContain('f(t)')
		);
		expect(atelier.get('f')?.definition).toBe('');
	});

	// Revue de #905 : Calcul `f(s) = s^2` après `f(t) = t^2` ne change pas la
	// définition rangée (x^2), seulement la lettre — le champ restait en t
	it('la lettre change ailleurs, la définition non : le champ suit', async () => {
		const atelier = atelierWithT();
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		atelier.update('f', 'x^2', 'text', 's');

		await vi.waitFor(() => {
			const now = cardFor(container, 'f');
			expect(now.querySelector('.prefixe')?.textContent?.replace(/\s+/g, '')).toBe('f(s)=');
			expect(fieldOf(now).value).toContain('s^2');
		});
		expect(fieldOf(card).value).not.toContain('t');
	});

	it('x_1 n’est pas montré t_1 dans l’en-tête', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'x_1', definition: '4' }, 'text');
		atelier.create({ kind: 'function', name: 'f', definition: 'x_1+x', letter: 't' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const spoken = cardFor(container, 'f').querySelector('.definition .sr-only')?.textContent;
		expect(spoken).toMatch(/'X' sub 1/i);
	});
});
