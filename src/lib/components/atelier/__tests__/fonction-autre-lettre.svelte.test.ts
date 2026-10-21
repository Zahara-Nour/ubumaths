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

/** Le champ d'une carte de fonction : toujours là (lot 3 de la refonte). */
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
	it('la ligne de la carte annonce la variable t', async () => {
		const { container } = await render(WithAtelier, { atelier: atelierWithT() });

		expect(
			cardFor(container, 'f').querySelector('.variable')?.textContent?.replace(/\s+/g, '')
		).toBe('(t)=');
	});

	it('le champ est précédé de f(t) = et montre t', async () => {
		const { container } = await render(WithAtelier, { atelier: atelierWithT() });

		const card = await open(container, 'f');

		expect(card.querySelector('.ligne')?.textContent?.replace(/\s+/g, '')).toContain('f(t)=');
		expect(fieldOf(card).value).toContain('t^2');
		expect(fieldOf(card).value).not.toContain('x');
	});

	it('ce qu’on tape en t est rangé en x', async () => {
		const atelier = atelierWithT('');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeInto(fieldOf(card), 't^2{ArrowRight}+3t{Enter}');

		await vi.waitFor(() => expect(atelier.get('f')?.definition).toBe('x^2+3x'));
		expect(atelier.get('f')?.definition).not.toContain('t');
		expect(atelier.get('f')?.status).toBe('ok');
	});

	it('x tapé dans une fonction de t est refusé, avec un message', async () => {
		const atelier = atelierWithT('');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		// Lot 3 de la refonte : rien n'est rangé avant Entrée
		await typeInto(fieldOf(card), 't+x{Enter}');

		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('[role="alert"]')?.textContent).toContain('f(t)')
		);
		// Le x n'est jamais rangé : la définition reste celle d'avant le refus
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
			expect(now.querySelector('.ligne')?.textContent?.replace(/\s+/g, '')).toContain('f(s)=');
			expect(fieldOf(now).value).toContain('s^2');
		});
		expect(fieldOf(card).value).not.toContain('t');
	});

	it('x_1 n’est pas montré t_1 dans le champ', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'x_1', definition: '4' }, 'text');
		atelier.create({ kind: 'function', name: 'f', definition: 'x_1+x', letter: 't' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const value = fieldOf(cardFor(container, 'f')).value;
		expect(value).toContain('x_1');
		expect(value).not.toContain('t_1');
	});
});
