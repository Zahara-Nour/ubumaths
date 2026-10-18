/**
 * Géométrie, lot 2, PR 2 : les mesures À L'ÉCRAN — la ligne de console (la
 * formule RENDUE, sans antislash perdu) et la carte d'une mesure nommée (sa
 * valeur, sans curseur).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

/** Le rectangle ABCD (4 × 3) et E(1 ; 2). */
function rectangle(): Atelier {
	const atelier = new Atelier();
	for (const [name, definition] of [
		['A', '(0 ; 0)'],
		['B', '(4 ; 0)'],
		['C', '(4 ; 3)'],
		['D', '(0 ; 3)'],
		['E', '(1 ; 2)']
	]) {
		atelier.create({ kind: 'point', name, definition }, 'text');
	}
	return atelier;
}

async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

/** Le texte lu de la dernière réponse de la console. */
async function answerOf(line: string): Promise<string> {
	const view = await render(AtelierContainer, { atelier: rectangle(), ephemeral: true });
	const field = view.container.querySelector('input[type="text"]') as HTMLInputElement;
	const form = view.container.querySelector('form') as HTMLFormElement;
	field.value = line;
	field.dispatchEvent(new Event('input', { bubbles: true }));
	await settle();
	form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
	await settle();
	const history = view.container.querySelector('.historique');
	await vi.waitFor(() => expect(history?.querySelector('.math')).toBeTruthy());
	return history?.textContent ?? '';
}

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

// =============================================================================
// Tests
// =============================================================================

describe('L4 : la console répond une mesure en écriture mathématique', () => {
	it('`AE` : √5 composé, sans commande LaTeX lue en lettres', async () => {
		const text = await answerOf('AE');
		expect(text).toContain('√');
		expect(text).not.toMatch(/sqrt|ight|ext/);
	});

	it('`aire(A, B, C, D)` : 12', async () => {
		const text = await answerOf('aire(A, B, C, D)');
		expect(text).toContain('12');
		expect(text).not.toMatch(/ight|ext|left/);
	});

	it('un angle non remarquable : ≈ 36,8699', async () => {
		const text = await answerOf('angle(B, A, C)');
		expect(text).toContain('≈');
		expect(text).toContain('36,8699');
	});
});

describe('L4 : la carte d’une mesure nommée', () => {
	it('S = aire(A, B, C) : sa valeur, et pas de curseur', async () => {
		const atelier = rectangle();
		atelier.create({ kind: 'value', name: 'S', definition: 'aire(A, B, C)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'S');
		expect(card.querySelector('.mesure .sr-only')?.textContent?.trim()).toBe('6');
		expect(card.querySelector('input[type="range"]')).toBeNull();
	});
});
