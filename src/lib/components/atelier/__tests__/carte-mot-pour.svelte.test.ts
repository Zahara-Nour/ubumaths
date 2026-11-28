/**
 * La carte d'une fonction : « pour », « sur » (et « ou », « et » après « pour »)
 * deviennent des MOTS à l'espace qui les suit, au VRAI clavier de MathLive.
 *
 * Chantier `carte-pour-mot` (demande de David, 2026-11-28) : la console le
 * faisait déjà (`NaturalField`), la carte collait les lettres (`xpourx>2` en
 * italique, comme un produit) jusqu'à la validation.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { intervalLabelOf } from '#lib/atelier/interval.ts';
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

/** Frappes réelles, champ vidé d'abord. `[[` est un crochet pour `userEvent`. */
async function retype(field: MathfieldElement, keys: string) {
	await userEvent.click(field);
	await vi.waitFor(() => expect(document.activeElement).toBe(field));
	field.executeCommand('selectAll');
	await userEvent.keyboard(keys);
}

async function cardOfF(name = 'f'): Promise<{ atelier: Atelier; field: MathfieldElement }> {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name, definition: 'x' }, 'keyboard');
	const { container } = await render(WithAtelier, { atelier });
	return { atelier, field: fieldOf(cardFor(container, name)) };
}

// =============================================================================
// Cas normal
// =============================================================================

describe('le mot devient un mot dès l’espace', () => {
	it('« x pour x>2 » : « pour » en mot AVANT la validation, puis ]2 ; +∞[', async () => {
		const { atelier, field } = await cardOfF();
		await retype(field, 'x pour x>2');

		expect(field.value).toBe('x\\text{ pour }x>2');
		await userEvent.keyboard('{Enter}');
		await vi.waitFor(() => expect(intervalLabelOf(atelier.get('f')!)).toBe(']2 ; +∞['));
		expect(atelier.get('f')?.definition).toBe('x');
	});

	it('« x^2 sur [0;1] » : « sur » en mot, l’ensemble lu', async () => {
		const { atelier, field } = await cardOfF();
		await retype(field, 'x^2 sur [[0;1]{Enter}');

		expect(field.value).toBe('x^2\\text{ sur }[0;1]');
		await vi.waitFor(() => expect(intervalLabelOf(atelier.get('f')!)).toBe('[0 ; 1]'));
	});

	it('« ou » après « pour » : x<0 ou x>1', async () => {
		const { atelier, field } = await cardOfF();
		await retype(field, '1/x pour x<0 ou x>1');

		expect(field.value).toContain('\\text{ pour }');
		expect(field.value).toContain('\\text{ ou }');
		await userEvent.keyboard('{Enter}');
		await vi.waitFor(() => expect(intervalLabelOf(atelier.get('f')!)).toBe(']−∞ ; 0[ ∪ ]1 ; +∞['));
	});
});

// =============================================================================
// Cas limites : rien ne change
// =============================================================================

describe('ce qui reste des lettres', () => {
	it('« et » sans « pour » devant reste e·t', async () => {
		const { field } = await cardOfF();
		await retype(field, 'e t');

		expect(field.value).not.toContain('\\text');
	});

	it('« surface » n’est pas « sur »', async () => {
		const { field } = await cardOfF();
		await retype(field, 'surface ');

		expect(field.value).not.toContain('\\text');
	});
});

// =============================================================================
// Les espaces se voient, comme dans la console (David, 2026-11-28)
// =============================================================================

describe('l’espace tapée se voit, la définition rangée n’en garde rien', () => {
	it('« x + 1 » : espaces fines dans le champ, x+1 rangé', async () => {
		const { atelier, field } = await cardOfF();
		await retype(field, 'x + 1');

		expect(field.value).toBe('x\\,+\\,1');
		await userEvent.keyboard('{Enter}');
		await vi.waitFor(() => expect(atelier.get('f')?.definition.replace(/\s/g, '')).toBe('x+1'));
		expect(atelier.get('f')?.definition).not.toContain('\\,');
		expect(atelier.get('f')?.status).toBe('ok');
	});

	it('« 2 x » et « cos x » se lisent', async () => {
		const { atelier, field } = await cardOfF();
		await retype(field, '2 x{Enter}');
		await vi.waitFor(() => expect(atelier.get('f')?.definition.replace(/\s/g, '')).toBe('2x'));

		await retype(field, 'cos x{Enter}');
		await vi.waitFor(() => expect(atelier.get('f')?.definition).toContain('\\cos'));
		expect(atelier.get('f')?.status).toBe('ok');
		expect(atelier.get('f')?.definition).not.toContain('\\,');
	});

	it('« x pour x > 3 » tapé avec ses espaces : un seul blanc avant « pour », ]3 ; +∞[', async () => {
		const { atelier, field } = await cardOfF();
		await retype(field, 'x pour x > 3');

		expect(field.value).toBe('x\\text{ pour }x\\,>\\,3');
		await userEvent.keyboard('{Enter}');
		await vi.waitFor(() => expect(intervalLabelOf(atelier.get('f')!)).toBe(']3 ; +∞['));
		expect(atelier.get('f')?.definition).toBe('x');
	});
});
