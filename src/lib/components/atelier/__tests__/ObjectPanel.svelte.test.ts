/**
 * Le panneau d'objets — §3 vu depuis l'écran.
 *
 * Ces tests cliquent pour de vrai : c'est le seul moyen de vérifier que la
 * progressivité se voit, et pas seulement qu'elle se calcule.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import WithAtelier from './harness/WithAtelier.svelte';
import { menuItemOf, openFunctionMenu } from './harness/function-card';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

/** Les libellés des boutons d'action visibles. */
function actionLabels(container: HTMLElement): string[] {
	return [...container.querySelectorAll('.action')].map((b) => b.textContent?.trim() ?? '');
}

function cardFor(container: HTMLElement, name: string): HTMLElement | undefined {
	return [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	) as HTMLElement | undefined;
}

describe('panneau d’objets', () => {
	it('annonce un atelier vide plutôt que de ne rien montrer', async () => {
		const { container } = await render(WithAtelier, { atelier: new Atelier() });
		expect(container.textContent).toContain('Rien encore');
	});

	it('montre les objets avec leur nom et leur définition', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.create({ kind: 'value', name: 'k', definition: '3' });
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'f')).toBeTruthy();
		// Une fonction montre sa définition dans son champ (lot 3 de la refonte)…
		expect(cardFor(container, 'f')?.querySelector('math-field')).toBeTruthy();
		// …les autres objets, en écriture mathématique (`/grapheur` §1 C1)
		expect(cardFor(container, 'k')?.querySelector('.definition .ML__latex')).toBeTruthy();
	});

	// §3 N1 — la progressivité doit SE VOIR, pas seulement se calculer
	it('n’affiche aucune action de fonction dans un atelier de nombres', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'k', definition: '3' });
		const { container } = await render(WithAtelier, { atelier });

		cardFor(container, 'k')?.querySelector('button')?.click();
		expect(actionLabels(container)).not.toContain('Dériver');
		expect(actionLabels(container)).not.toContain('Tracer');
	});

	// §3 N2 — les actions arrivent avec l'objet (dans son menu, lot 3 de la refonte)
	it('affiche les actions d’une fonction dans le menu de sa carte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openFunctionMenu(container, 'f');

		expect(menuItemOf(menu, 'Tracer')).toBeTruthy();
		expect(menuItemOf(menu, 'Dériver')).toBeTruthy();
	});

	// §3 L2 — visible ET désactivée, avec la raison lisible au survol
	it('désactive les actions d’un objet en attente, en disant ce qui manque', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openFunctionMenu(container, 'f');
		const tracer = menuItemOf(menu, 'Tracer');

		// Indisponible, mais pas `disabled` : l'élément reste atteignable au
		// clavier, donc sa raison peut être lue.
		expect(tracer.hasAttribute('data-indisponible')).toBe(true);
		expect(tracer.hasAttribute('data-disabled')).toBe(false);

		// Et la raison est ÉCRITE dans l'élément, pas seulement en infobulle
		expect(tracer.querySelector('.raison')?.textContent).toContain('a');
	});

	it('laisse toujours renommer et supprimer, même en erreur', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^^2' });
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openFunctionMenu(container, 'f');
		expect(menuItemOf(menu, 'Supprimer').hasAttribute('data-indisponible')).toBe(false);
	});

	// §2.1 N3 — « + Fonction » crée un objet nommé, vide, et le sélectionne
	it('crée un objet nommé automatiquement au clic', async () => {
		const atelier = new Atelier();
		const { container } = await render(WithAtelier, { atelier });

		const bouton = [...container.querySelectorAll('.creer button')].find(
			(b) => b.textContent?.trim() === '+ Fonction'
		) as HTMLButtonElement;
		bouton.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(atelier.names).toEqual(['f']);
		expect(atelier.get('f')?.status).toBe('incomplete');
		expect(cardFor(container, 'f')).toBeTruthy();
	});

	it('affiche le message d’un objet qui ne peut rien produire', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const { container } = await render(WithAtelier, { atelier });

		expect(container.textContent).toContain('En attente');
	});
});

// =============================================================================
// Q46 (2026-10-02) : une partenaire à la fois, choisie sur la carte
// =============================================================================

describe('actions avec une autre liste', () => {
	async function settle() {
		await new Promise((r) => setTimeout(r, 0));
		await new Promise((r) => setTimeout(r, 0));
	}

	async function cardOf(lists: string[]) {
		const atelier = new Atelier();
		for (const name of lists) atelier.create({ kind: 'list', name, definition: '1 ; 2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await settle();
		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === lists[0]
		) as HTMLElement;
		(carte.querySelector('button') as HTMLButtonElement).click();
		await settle();
		return { container, carte, atelier };
	}

	const labels = (carte: HTMLElement) =>
		[...carte.querySelectorAll('.action')].map((b) => b.textContent?.trim());

	it('une seule partenaire : son nom est écrit, pas de menu', async () => {
		const { carte } = await cardOf(['L', 'M']);

		expect(carte.textContent).toContain('Avec la liste M');
		expect(carte.querySelector('[aria-haspopup="listbox"]')).toBeNull();
		expect(labels(carte)).toContain('Nuage avec M');
	});

	it('plusieurs partenaires : un menu, au plus 11 boutons (Q78, Q119), et le choix change les actions', async () => {
		const { carte, atelier } = await cardOf(['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']);
		const trigger = carte.querySelector('[aria-haspopup="listbox"]') as HTMLButtonElement;

		// Audit a11y : le bouton annonce la liste CHOISIE, pas seulement « Liste partenaire »
		expect(trigger.getAttribute('aria-label')).toBe('Avec la liste M');
		const group = carte.querySelector('[role="group"]');
		expect(group?.getAttribute('aria-label')).toBe('Avec la liste M');
		expect(labels(carte).length).toBeLessThanOrEqual(11);
		// Q78, Q119 : les 10ᵉ et 11ᵉ boutons sont bien rendus sur la carte
		expect(labels(carte)).toContain('Simuler avec probabilités M');
		expect(labels(carte)).toContain('Comparer avec M');
		expect(labels(carte)).toContain('Nuage avec M');

		// Un vrai clic : bits-ui réagit aux événements de pointeur, pas à `.click()`
		await userEvent.click(trigger);
		await settle();
		const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
			o.textContent?.trim().startsWith('N')
		) as HTMLElement;
		await userEvent.click(option);
		await settle();

		expect(labels(carte)).toContain('Nuage avec N');
		expect(labels(carte)).not.toContain('Nuage avec M');
		expect(trigger.getAttribute('aria-label')).toBe('Avec la liste N');

		// Le geste part bien avec N, pas seulement le libellé (revue)
		const nuage = [...carte.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Nuage avec N'
		) as HTMLButtonElement;
		nuage.click();
		await settle();
		const list = atelier.get('L');
		expect(list?.kind).toBe('list');
		if (list?.kind !== 'list') throw new Error('L doit être une liste');
		expect(list.plottedWith).toBe('N');
	});

	// Q48 : retenue par son nom dans la carte, la partenaire choisie revenait en
	// silence à celle par défaut après un renommage
	it('la partenaire choisie suit son renommage', async () => {
		const { carte, atelier } = await cardOf(['L', 'M', 'N']);
		const trigger = carte.querySelector('[aria-haspopup="listbox"]') as HTMLButtonElement;
		await userEvent.click(trigger);
		await settle();
		const option = [...document.querySelectorAll('[role="option"]')].find((o) =>
			o.textContent?.trim().startsWith('N')
		) as HTMLElement;
		await userEvent.click(option);
		await settle();

		atelier.rename('N', 'Z');
		await settle();

		expect(trigger.getAttribute('aria-label')).toBe('Avec la liste Z');
		expect(labels(carte)).toContain('Nuage avec Z');
	});
});
