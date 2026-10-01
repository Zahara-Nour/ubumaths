/**
 * Le panneau d'objets — §3 vu depuis l'écran.
 *
 * Ces tests cliquent pour de vrai : c'est le seul moyen de vérifier que la
 * progressivité se voit, et pas seulement qu'elle se calcule.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from '@vitest/browser/context';
import WithAtelier from './harness/WithAtelier.svelte';
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
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'f')).toBeTruthy();
		expect(container.textContent).toContain('x^2');
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

	// §3 N2 — les actions arrivent avec l'objet
	it('affiche les actions d’une fonction quand on la sélectionne', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(WithAtelier, { atelier });

		cardFor(container, 'f')?.querySelector('button')?.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(actionLabels(container)).toContain('Tracer');
		expect(actionLabels(container)).toContain('Dériver');
	});

	// §3 L2 — visible ET désactivée, avec la raison lisible au survol
	it('désactive les actions d’un objet en attente, en disant ce qui manque', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const { container } = await render(WithAtelier, { atelier });

		cardFor(container, 'f')?.querySelector('button')?.click();
		await new Promise((r) => setTimeout(r, 0));

		const tracer = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Tracer'
		) as HTMLButtonElement | undefined;

		// `aria-disabled` et non `disabled` : le bouton reste atteignable au
		// clavier, donc sa raison peut être lue.
		expect(tracer?.getAttribute('aria-disabled')).toBe('true');

		// Et la raison est ÉCRITE, pas seulement en infobulle : une infobulle ne
		// se lit ni au clavier, ni au doigt, ni au lecteur d'écran.
		const raison = container.querySelector(`#${tracer?.getAttribute('aria-describedby')}`);
		expect(raison?.textContent).toContain('a');
	});

	it('laisse toujours renommer et supprimer, même en erreur', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^^2' });
		const { container } = await render(WithAtelier, { atelier });

		cardFor(container, 'f')?.querySelector('button')?.click();
		await new Promise((r) => setTimeout(r, 0));

		const boutons = [...container.querySelectorAll('.action')] as HTMLButtonElement[];
		const supprimer = boutons.find((b) => b.textContent?.trim() === 'Supprimer');
		expect(supprimer?.getAttribute('aria-disabled')).toBe('false');
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
		return { container, carte };
	}

	const labels = (carte: HTMLElement) =>
		[...carte.querySelectorAll('.action')].map((b) => b.textContent?.trim());

	it('une seule partenaire : son nom est écrit, pas de menu', async () => {
		const { carte } = await cardOf(['L', 'M']);

		expect(carte.textContent).toContain('Avec la liste M');
		expect(carte.querySelector('[aria-haspopup="listbox"]')).toBeNull();
		expect(labels(carte)).toContain('Nuage avec M');
	});

	it('plusieurs partenaires : un menu, au plus 9 boutons, et le choix change les actions', async () => {
		const { carte } = await cardOf(['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']);
		const trigger = carte.querySelector('[aria-haspopup="listbox"]') as HTMLButtonElement;

		// Audit a11y : le bouton annonce la liste CHOISIE, pas seulement « Liste partenaire »
		expect(trigger.getAttribute('aria-label')).toBe('Avec la liste M');
		const group = carte.querySelector('[role="group"]');
		expect(group?.getAttribute('aria-label')).toBe('Avec la liste M');
		expect(labels(carte).length).toBeLessThanOrEqual(9);
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
	});
});
