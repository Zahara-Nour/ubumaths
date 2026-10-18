/**
 * La réciproque dans l'atelier, à l'écran — lot 3 de
 * `docs/wip/atelier-reciproque-phase0.md`.
 *
 * R1 : le bouton « Réciproque » de la carte crée la carte `f⁻¹` et écrit la
 * ligne dans Calcul SANS changer de vue (G7). Un refus cite ses formules
 * (`$…$`) : elles sont composées en mathématiques, jamais montrées en LaTeX.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { chooseCardAction } from './harness/function-card';

// =============================================================================
// Décor
// =============================================================================

function cardFor(container: HTMLElement, name: string): HTMLElement | undefined {
	return [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	) as HTMLElement | undefined;
}

function tab(container: HTMLElement, label: string): HTMLButtonElement {
	const found = [...container.querySelectorAll('.onglet')].find((t) =>
		t.textContent?.trim().startsWith(label)
	);
	if (!found) throw new Error(`pas d'onglet ${label}`);
	return found as HTMLButtonElement;
}

function currentView(container: HTMLElement): string {
	return container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim() ?? '';
}

/** `f` dans un atelier ouvert sur la vue Graphe, puis « Réciproque » dans le menu de sa carte. */
async function clickReciprocal(definition: string) {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
	tab(container, 'Graphe').click();
	await vi.waitFor(() => expect(currentView(container)).toBe('Graphe'));
	// Lot 3 de la refonte : les actions d'une fonction sont dans le menu de sa carte
	await chooseCardAction(container, 'f', 'Réciproque');
	return { atelier, container };
}

// =============================================================================
// Tests
// =============================================================================

describe('le bouton « Réciproque »', () => {
	it('crée la carte f⁻¹, sur son ensemble, sans quitter le Graphe', async () => {
		const { atelier, container } = await clickReciprocal('sqrt(x+2)');

		await vi.waitFor(() => expect(cardFor(container, 'f⁻¹')).toBeTruthy());
		expect(atelier.get('f^-1')?.status).toBe('ok');
		expect(currentView(container)).toBe('Graphe');
		// La carte dit sa formule en mathématiques, et son ensemble (Q5)
		const card = cardFor(container, 'f⁻¹')!;
		expect(card.querySelector('.formule .ML__latex, .formule [aria-hidden]')).toBeTruthy();
		expect(card.querySelector('.intervalle')?.textContent).toBe('sur [0 ; +∞[');
	});

	it('refus (x² sur ℝ) : pas de carte, les formules composées dans la console', async () => {
		const { atelier, container } = await clickReciprocal('x^2');
		// La ligne attend dans la console (G7) : on l'ouvre
		(container.querySelector('button[aria-label="Console"]') as HTMLButtonElement).click();

		await vi.waitFor(() => expect(container.querySelector('.historique li.refus')).toBeTruthy());
		expect(atelier.get('f^-1')).toBeUndefined();
		expect(cardFor(container, 'f⁻¹')).toBeUndefined();

		const line = container.querySelector('.historique li.refus .texte')!;
		// Deux formules, composées par MathLive ; aucun LaTeX brut à l'écran
		expect(line.querySelectorAll('.formule')).toHaveLength(2);
		const visible = [...line.childNodes]
			.map((node) =>
				node instanceof HTMLElement && node.classList.contains('formule') ? '' : node.textContent
			)
			.join('');
		expect(visible).not.toContain('$');
		expect(visible).not.toContain('\\sqrt');
		expect(visible).toContain("n'est pas bijective sur ℝ");
		// Lu par un lecteur d'écran
		expect(line.querySelector('.formule .sr-only')?.textContent).not.toBe('');
	});
});
