/**
 * Géométrie, lot 2, PR 2 : les mesures À L'ÉCRAN — la ligne de console (la
 * formule RENDUE, sans antislash perdu) et la carte d'une mesure nommée (sa
 * valeur, sans curseur).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

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

describe('réglage « Angles » : degrés ou radians', () => {
	it('degrés par défaut ; Radians recalcule la mesure nommée', async () => {
		const atelier = rectangle();
		atelier.create({ kind: 'value', name: 'T', definition: 'angle(B, A, C)' }, 'text');
		const view = await render(AtelierContainer, { atelier, ephemeral: true });
		(view.container.querySelector('button[aria-label="Réglages"]') as HTMLElement).click();
		await settle();
		const radians = await vi.waitFor(() => {
			const found = [...document.querySelectorAll('label')].find(
				(l) => l.textContent?.trim() === 'Radians'
			);
			if (!found) throw new Error('pas de choix Radians');
			return found;
		});
		const degrees = [...document.querySelectorAll('label')].find(
			(l) => l.textContent?.trim() === 'Degrés'
		);
		expect(degrees).toBeTruthy();
		expect(atelier.angleUnit).toBe('deg');
		radians.click();
		await settle();
		expect(atelier.angleUnit).toBe('rad');
		const card = cardFor(view.container, 'T');
		expect(card.querySelector('.mesure .sr-only')?.textContent?.trim()).toBe('≈ 0,6435 rad');
		// Le choix est retenu dans ce navigateur : on le remet, pour les tests qui suivent
		expect(localStorage.getItem('chiphre-atelier-angles')).toBe('rad');
		degrees?.click();
		await settle();
		expect(localStorage.getItem('chiphre-atelier-angles')).toBe('deg');
	});
});

describe('revue : la carte d’une mesure nommée, à l’écran', () => {
	it('la ligne de la valeur est alignée sous le nom, pas collée au bord', async () => {
		const atelier = rectangle();
		atelier.create({ kind: 'value', name: 'S', definition: 'aire(A, B, C)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const card = cardFor(container, 'S');
		// Le texte de la ligne (son contenu, padding compris) : pas la boîte du paragraphe
		const line = card.querySelector('.mesure [aria-hidden="true"]') as HTMLElement;
		const name = card.querySelector('.nom') as HTMLElement;
		expect(line.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			name.getBoundingClientRect().left
		);
	});

	it('le champ montre \\operatorname{aire} ; une modification relit la mesure', async () => {
		const atelier = rectangle();
		atelier.create({ kind: 'value', name: 'S', definition: 'aire(A, B, C)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const field = cardFor(container, 'S').querySelector('math-field') as MathfieldElement;
		expect(field.value).toContain('\\operatorname{aire}');
		// Le focus direct : `userEvent.click(field)` passe par un sélecteur que vitest
		// génère (`article >> has-text="S = 6" >> math-field`), qui ne se retrouve pas
		// ici — la mise en page, elle, est saine (vérifié par la revue)
		field.focus();
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		await userEvent.keyboard('{End}+1{Enter}');
		await vi.waitFor(() => expect(atelier.get('S')?.definition).toContain('+1'));
		expect(atelier.get('S')?.status).toBe('ok');
		await vi.waitFor(() =>
			expect(cardFor(container, 'S').querySelector('.mesure .sr-only')?.textContent?.trim()).toBe(
				'7'
			)
		);
	});
});
