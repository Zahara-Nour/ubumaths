/**
 * Supprimer depuis une carte : confirmation quand l'objet a des dépendants,
 * puis « Annuler » — lot B de `docs/wip/atelier-suppression-export-phase0.md`.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

function cardFor(container: HTMLElement, name: string): HTMLElement | undefined {
	return [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	) as HTMLElement | undefined;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Ouvrir la carte de `name` et cliquer « Supprimer ». */
async function clickRemove(container: HTMLElement, name: string) {
	cardFor(container, name)?.querySelector('button')?.click();
	await tick();
	const boutons = [...container.querySelectorAll('.action')] as HTMLButtonElement[];
	boutons.find((b) => b.textContent?.trim() === 'Supprimer')?.click();
	await tick();
}

/** Le dialogue est rendu dans un portail, hors du conteneur. */
const dialog = () => document.querySelector('[role="alertdialog"], [role="dialog"]');

function dialogButton(label: string): HTMLButtonElement | undefined {
	return [...(dialog()?.querySelectorAll('button') ?? [])].find(
		(b) => b.textContent?.trim() === label
	) as HTMLButtonElement | undefined;
}

// =============================================================================
// Comportements
// =============================================================================

describe('supprimer depuis une carte', () => {
	it('sans dépendant, supprime tout de suite (N1)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		await clickRemove(container, 'f');

		expect(atelier.names).toEqual([]);
		expect(dialog()).toBeNull();
	});

	it('la suppression se lit dans l’historique de Calcul (G7)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		await clickRemove(container, 'f');

		expect(container.querySelector('.historique')?.textContent).toContain('Supprimé : f.');
	});

	it('avec dépendants, demande en les nommant (N2)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.create({ kind: 'function', name: 'g', definition: 'f(x)+1' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		await clickRemove(container, 'f');

		expect(dialog()?.textContent).toContain('Supprimer f supprime aussi g.');
		expect(atelier.names).toEqual(['f', 'g']);
	});

	it('« Tout supprimer » emporte l’objet et ses dépendants (N3)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.create({ kind: 'function', name: 'g', definition: 'f(x)+1' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await clickRemove(container, 'f');

		dialogButton('Tout supprimer')?.click();
		await tick();

		expect(atelier.names).toEqual([]);
	});

	it('renoncer ne supprime rien (E1)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.create({ kind: 'function', name: 'g', definition: 'f(x)+1' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await clickRemove(container, 'f');

		dialogButton('Annuler')?.click();
		await tick();

		expect(atelier.names).toEqual(['f', 'g']);
	});
});

// =============================================================================
// Clavier et focus (audit d'accessibilité)
// =============================================================================

function ctrlZ(target: EventTarget = document.body) {
	target.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
}

describe('supprimer au clavier', () => {
	it('le focus va au panneau quand la carte disparaît (WCAG 2.4.3)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		await clickRemove(container, 'f');
		await tick();

		expect(document.activeElement?.id).toBe('atelier-mes-objets');
	});

	it('Ctrl+Z annule la dernière suppression', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await clickRemove(container, 'f');

		ctrlZ();
		await tick();

		expect(atelier.names).toEqual(['f']);
	});

	it('Ctrl+Z dans un champ ne touche pas à la suppression', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await clickRemove(container, 'f');
		const champ = document.createElement('input');
		container.appendChild(champ);

		ctrlZ(champ);
		await tick();

		expect(atelier.names).toEqual([]);
	});
});
